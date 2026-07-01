import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  startAfter,
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
  const activeQ = query(
    collection(db, 'sprints'),
    where('teamId', '==', teamId),
    where('status', '==', 'ACTIVE'),
    limit(1),
  );

  const unsub = onSnapshot(activeQ, (snap) => {
    if (!snap.empty) {
      const d = snap.docs[0];
      callback({ id: d.id, ...(d.data() as Omit<Sprint, 'id'>) });
    } else {
      // ACTIVE 없으면 가장 최근 REVEALED 단건 조회 (변화 없으므로 구독 불필요)
      getDocs(
        query(
          collection(db, 'sprints'),
          where('teamId', '==', teamId),
          where('status', '==', 'REVEALED'),
          orderBy('createdAt', 'desc'),
          limit(1),
        ),
      ).then((rSnap) => {
        if (rSnap.empty) {
          callback(null);
        } else {
          const d = rSnap.docs[0];
          callback({ id: d.id, ...(d.data() as Omit<Sprint, 'id'>) });
        }
      });
    }
  });

  return unsub;
}

/** 팀 스프린트 목록 실시간 구독 (최신순) — 서버 정렬 */
export function subscribeToTeamSprints(
  teamId: string,
  callback: (sprints: Sprint[]) => void,
): () => void {
  const q = query(
    collection(db, 'sprints'),
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Sprint, 'id'>) })));
  });
}

/** 팀 스프린트 목록 (최신순) — 서버 정렬 */
export async function getTeamSprints(teamId: string): Promise<Sprint[]> {
  const snap = await getDocs(
    query(
      collection(db, 'sprints'),
      where('teamId', '==', teamId),
      orderBy('createdAt', 'desc'),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Sprint, 'id'>) }));
}

const PAST_PAGE_SIZE = 5;

/** 지난 스프린트 페이징 조회 (최신순, 10개씩)
 *  복합 인덱스 필요: teamId ASC + createdAt DESC */
export async function getPastSprintsPaged(
  teamId: string,
  cursor?: QueryDocumentSnapshot,
): Promise<{ sprints: Sprint[]; lastDoc: QueryDocumentSnapshot | null; hasMore: boolean }> {
  const constraints = [
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc'),
    limit(PAST_PAGE_SIZE + 1),
    ...(cursor ? [startAfter(cursor)] : []),
  ];
  const snap = await getDocs(query(collection(db, 'sprints'), ...constraints));
  const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Sprint, 'id'>) }));
  // ACTIVE 제외 (subscribeToActiveSprint에서 별도 관리)
  const past = all.filter((s) => s.status !== 'ACTIVE');
  const hasMore = snap.docs.length > PAST_PAGE_SIZE;
  const lastDoc = hasMore ? snap.docs[snap.docs.length - 2] : (snap.docs[snap.docs.length - 1] ?? null);
  return { sprints: past.slice(0, PAST_PAGE_SIZE), lastDoc, hasMore };
}

/** 직전 공개 스프린트 조회 — 서버 필터/정렬, limit 1 */
export async function getLastRevealedSprint(teamId: string): Promise<Sprint | null> {
  const snap = await getDocs(
    query(
      collection(db, 'sprints'),
      where('teamId', '==', teamId),
      where('status', 'in', ['REVEALED', 'CLOSED']),
      orderBy('createdAt', 'desc'),
      limit(1),
    ),
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Sprint, 'id'>) };
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

/** 진행 중 스프린트 삭제 — pairs·praises·nudgeLogs·스프린트 문서 삭제 */
export async function deleteSprint(sprintId: string): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');

  const pairsSnap = await getDocs(collection(db, 'sprints', sprintId, 'pairs'));
  await Promise.all(pairsSnap.docs.map((d) => deleteDoc(d.ref)));

  const praisesSnap = await getDocs(
    query(collection(db, 'praises'), where('sprintId', '==', sprintId)),
  );
  await Promise.all(praisesSnap.docs.map((d) => deleteDoc(d.ref)));

  const nudgeSnap = await getDocs(
    query(collection(db, 'nudgeLogs'), where('sprintId', '==', sprintId)),
  );
  await Promise.all(nudgeSnap.docs.map((d) => deleteDoc(d.ref)));

  await deleteDoc(doc(db, 'sprints', sprintId));
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

// 공개된 스프린트 결과는 불변이므로 앱 세션 동안 메모리에 캐싱
const revealCache = new Map<string, RevealData>();

export async function getRevealData(sprintId: string): Promise<RevealData | null> {
  // 캐시 히트 시 즉시 반환
  const cached = revealCache.get(sprintId);
  if (cached) return cached;

  // 스프린트 조회 (getDoc 단일 호출로 통합)
  const sprintDoc = await getDoc(doc(db, 'sprints', sprintId));
  if (!sprintDoc.exists()) return null;
  const sprint = { id: sprintDoc.id, ...(sprintDoc.data() as Omit<Sprint, 'id'>) };

  if (sprint.status !== 'REVEALED' && sprint.status !== 'CLOSED') return null;

  // pairs + 칭찬 병렬 조회
  const [pairsSnap, praisesSnap] = await Promise.all([
    getDocs(collection(db, 'sprints', sprintId, 'pairs')),
    getDocs(query(collection(db, 'praises'), where('sprintId', '==', sprintId))),
  ]);

  const rawPairs = pairsSnap.docs.map((d) => d.data() as { manitoId: string; targetId: string });

  // 중복 제거된 uid 목록을 in 쿼리로 한 번에 조회 (최대 30개씩 청크)
  const allUids = [...new Set(rawPairs.flatMap((p) => [p.manitoId, p.targetId]))];
  const profileMap = new Map<string, string>();
  const chunkSize = 30;
  for (let i = 0; i < allUids.length; i += chunkSize) {
    const chunk = allUids.slice(i, i + chunkSize);
    const usersSnap = await getDocs(
      query(collection(db, 'users'), where('__name__', 'in', chunk)),
    );
    usersSnap.docs.forEach((d) => {
      profileMap.set(d.id, (d.data().name as string) ?? '알 수 없음');
    });
  }

  const allPraises = praisesSnap.docs
    .map((d) => ({
      fromUserId: d.data().fromUserId as string,
      content: d.data().content as string,
      categories: d.data().categories as string[],
      createdAt: d.data().createdAt as Timestamp | null,
    }))
    .sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));

  const pairs: RevealPair[] = rawPairs.map((p) => ({
    manitoId: p.manitoId,
    targetId: p.targetId,
    manitoName: profileMap.get(p.manitoId) ?? '알 수 없음',
    targetName: profileMap.get(p.targetId) ?? '알 수 없음',
    praises: allPraises
      .filter((pr) => pr.fromUserId === p.manitoId)
      .map(({ content, categories, createdAt }) => ({ content, categories, createdAt })),
  }));

  const result: RevealData = { sprint, pairs, totalPraises: allPraises.length };

  // 공개/종료 스프린트는 불변 → 캐싱
  revealCache.set(sprintId, result);

  return result;
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

/** 스프린트 참여 멤버 프로필 조회 (pairs 서브컬렉션 기반, 개인 칭찬 수 미포함) */
export async function getSprintParticipants(
  sprintId: string,
): Promise<{ userId: string; name: string; bio?: string }[]> {
  const pairsSnap = await getDocs(collection(db, 'sprints', sprintId, 'pairs'));
  const userIds = [...new Set(pairsSnap.docs.map((d) => d.data().manitoId as string))];
  const profiles = await Promise.all(
    userIds.map(async (userId) => {
      const snap = await getDoc(doc(db, 'users', userId));
      if (!snap.exists()) return null;
      const { name, bio } = snap.data() as { name: string; bio?: string };
      return { userId, name, bio };
    }),
  );
  return profiles.filter((p): p is NonNullable<typeof p> => p !== null);
}
