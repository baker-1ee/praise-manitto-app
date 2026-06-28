import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { assignManito } from '@/lib/manito';

// ─── 타입 ────────────────────────────────────────────────────────────────────

export type SprintStatus = 'ACTIVE' | 'REVEALED' | 'CLOSED';

export interface Sprint {
  id: string;
  teamId: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: SprintStatus;
  createdBy: string;
  createdAt: Timestamp | null;
}

export interface ManitoPair {
  id: string;
  manitoId: string;
  targetId: string;
}

// ─── 날짜 포맷 유틸 ──────────────────────────────────────────────────────────

export function formatSprintDate(ts: Timestamp): string {
  const d = ts.toDate();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// ─── 스프린트 CRUD ────────────────────────────────────────────────────────────

/** 스프린트 생성 + 마니또 쌍 배정 (배치 쓰기) */
export async function createSprint(params: {
  teamId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  memberIds: string[];
  createdBy: string;
}): Promise<string> {
  const { teamId, name, startDate, endDate, memberIds, createdBy } = params;

  // 이미 활성 스프린트가 있는지 확인
  const activeSnap = await getDocs(
    query(collection(db, 'sprints'), where('teamId', '==', teamId), where('status', '==', 'ACTIVE')),
  );
  if (!activeSnap.empty) throw new Error('이미 진행 중인 스프린트가 있습니다.');
  const pairs = assignManito(memberIds);
  const batch = writeBatch(db);

  const sprintRef = doc(collection(db, 'sprints'));
  batch.set(sprintRef, {
    teamId,
    name,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    status: 'ACTIVE',
    createdBy,
    createdAt: serverTimestamp(),
  });

  for (const pair of pairs) {
    const pairRef = doc(collection(db, 'sprints', sprintRef.id, 'pairs'));
    batch.set(pairRef, { manitoId: pair.manitoId, targetId: pair.targetId });
  }

  await batch.commit();
  return sprintRef.id;
}

/** 팀의 활성 스프린트 실시간 구독
 *  단일 필드 where + 클라이언트 필터 → 복합 인덱스 불필요 */
export function subscribeToActiveSprint(
  teamId: string,
  callback: (sprint: Sprint | null) => void,
): () => void {
  const q = query(collection(db, 'sprints'), where('teamId', '==', teamId));
  return onSnapshot(q, (snap) => {
    const sprints = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Sprint, 'id'>) }));
    const active = sprints.find((s) => s.status === 'ACTIVE')
      ?? sprints
          .filter((s) => s.status === 'REVEALED')
          .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))[0]
      ?? null;
    callback(active);
  });
}

/** 팀 스프린트 목록 실시간 구독 (최신순) */
export function subscribeToTeamSprints(
  teamId: string,
  callback: (sprints: Sprint[]) => void,
): () => void {
  const q = query(collection(db, 'sprints'), where('teamId', '==', teamId));
  return onSnapshot(q, (snap) => {
    const sprints = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Sprint, 'id'>) }))
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    callback(sprints);
  });
}

/** 팀 스프린트 목록 (최신순) — 클라이언트 정렬 */
export async function getTeamSprints(teamId: string): Promise<Sprint[]> {
  const snap = await getDocs(
    query(collection(db, 'sprints'), where('teamId', '==', teamId)),
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Sprint, 'id'>) }))
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
}

/** 직전 공개 스프린트 조회 — 클라이언트 필터/정렬 */
export async function getLastRevealedSprint(teamId: string): Promise<Sprint | null> {
  const snap = await getDocs(
    query(collection(db, 'sprints'), where('teamId', '==', teamId)),
  );
  const revealed = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Sprint, 'id'>) }))
    .filter((s) => s.status === 'REVEALED' || s.status === 'CLOSED')
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  return revealed[0] ?? null;
}

// ─── 공개 (Reveal) ────────────────────────────────────────────────────────────

export interface RevealCheckResult {
  canReveal: boolean;
  unpraised: string[]; // 칭찬 미작성 멤버 userId 목록
}

/** 공개 가능 여부 확인 — 단일 쿼리로 스프린트 칭찬 전체 조회 후 클라이언트 판별 */
export async function checkRevealEligibility(sprintId: string): Promise<RevealCheckResult> {
  const [pairsSnap, praisesSnap] = await Promise.all([
    getDocs(collection(db, 'sprints', sprintId, 'pairs')),
    getDocs(query(collection(db, 'praises'), where('sprintId', '==', sprintId))),
  ]);

  const pairs = pairsSnap.docs.map((d) => d.data() as { manitoId: string; targetId: string });
  const praisedSet = new Set(praisesSnap.docs.map((d) => d.data().fromUserId as string));

  const unpraised = pairs.filter((p) => !praisedSet.has(p.manitoId)).map((p) => p.manitoId);
  return { canReveal: unpraised.length === 0, unpraised };
}

/** 스프린트 공개 (status → REVEALED) */
export async function revealSprint(sprintId: string): Promise<void> {
  await updateDoc(doc(db, 'sprints', sprintId), { status: 'REVEALED' });
}

/** 공개된 스프린트 전체 데이터 조회 (결과 화면용) */
export interface RevealPair {
  manitoId: string;
  targetId: string;
  manitoName: string;
  targetName: string;
  praises: Array<{ content: string; categories: string[]; createdAt: Timestamp | null }>;
}

export interface RevealData {
  sprint: Sprint;
  pairs: RevealPair[];
  totalPraises: number;
}

export async function getRevealData(sprintId: string): Promise<RevealData | null> {
  // 스프린트 조회
  const sprintSnap = await getDocs(
    query(collection(db, 'sprints'), where('__name__', '==', sprintId)),
  );
  // 직접 doc 조회
  const { getDoc } = await import('firebase/firestore');
  const sprintDoc = await getDoc(doc(db, 'sprints', sprintId));
  if (!sprintDoc.exists()) return null;
  const sprint = { id: sprintDoc.id, ...(sprintDoc.data() as Omit<Sprint, 'id'>) };

  if (sprint.status !== 'REVEALED' && sprint.status !== 'CLOSED') return null;

  // pairs 조회
  const pairsSnap = await getDocs(collection(db, 'sprints', sprintId, 'pairs'));
  const rawPairs = pairsSnap.docs.map((d) => d.data() as { manitoId: string; targetId: string });

  // 모든 userId 수집 → 일괄 유저 조회
  const allUids = [...new Set(rawPairs.flatMap((p) => [p.manitoId, p.targetId]))];
  const { getUserProfile } = await import('@/lib/users');
  const profileMap = new Map<string, string>();
  await Promise.all(
    allUids.map(async (uid) => {
      const p = await getUserProfile(uid);
      profileMap.set(uid, p?.name ?? '알 수 없음');
    }),
  );

  // 칭찬 조회
  // 단일 필드 쿼리 + 클라이언트 정렬
  const praisesSnap = await getDocs(
    query(collection(db, 'praises'), where('sprintId', '==', sprintId)),
  );
  const allPraises = praisesSnap.docs
    .map((d) => ({
      fromUserId: d.data().fromUserId as string,
      content: d.data().content as string,
      categories: d.data().categories as string[],
      createdAt: d.data().createdAt as Timestamp | null,
    }))
    .sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)); // asc

  const pairs: RevealPair[] = rawPairs.map((p) => ({
    manitoId: p.manitoId,
    targetId: p.targetId,
    manitoName: profileMap.get(p.manitoId) ?? '알 수 없음',
    targetName: profileMap.get(p.targetId) ?? '알 수 없음',
    praises: allPraises
      .filter((pr) => pr.fromUserId === p.manitoId)
      .map(({ content, categories, createdAt }) => ({ content, categories, createdAt })),
  }));

  return { sprint, pairs, totalPraises: allPraises.length };
}

/** 내 마니또 배정 조회 (내가 칭찬해야 할 대상) */
export async function getMyPair(
  sprintId: string,
  userId: string,
): Promise<ManitoPair | null> {
  const snap = await getDocs(
    query(
      collection(db, 'sprints', sprintId, 'pairs'),
      where('manitoId', '==', userId),
    ),
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<ManitoPair, 'id'>) };
}
