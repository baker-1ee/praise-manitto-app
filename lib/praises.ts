import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendPushNotifications } from '@/lib/notifications';
import { getUserProfile } from '@/lib/users';

/** 칭찬 작성 후 수정 가능한 시간(ms) — Firestore 보안 규칙과 동일하게 유지 */
export const PRAISE_EDIT_WINDOW_MS = 10 * 60 * 1000;

// ─── 타입 ────────────────────────────────────────────────────────────────────

export const PRAISE_CATEGORIES = [
  '기술력', '협업', '커뮤니케이션', '리더십', '성장', '기타',
] as const;

export type PraiseCategory = typeof PRAISE_CATEGORIES[number];

export interface Praise {
  id: string;
  sprintId: string;
  teamId: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  categories: PraiseCategory[];
  createdAt: Timestamp | null;
}

// ─── 칭찬 CRUD ───────────────────────────────────────────────────────────────

/** 칭찬 작성 */
export async function writePraise(params: {
  sprintId: string;
  teamId: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  categories: PraiseCategory[];
}): Promise<void> {
  await addDoc(collection(db, 'praises'), {
    ...params,
    createdAt: serverTimestamp(),
  });

  // 알림 발송 실패가 칭찬 작성 자체를 실패시키면 안 되므로 베스트 에포트로 처리
  try {
    const toProfile = await getUserProfile(params.toUserId);
    await sendPushNotifications(
      [toProfile],
      '🐳 마니또의 칭찬이 도착했어요 💌',
      '지금 확인해보세요!',
    );
  } catch (e) {
    console.warn('칭찬 수신 알림 발송 실패', e);
  }
}

/** 작성 후 10분 이내인지 확인 (수정 가능 여부) */
export function isPraiseEditable(praise: Pick<Praise, 'createdAt'>, now = Date.now()): boolean {
  if (!praise.createdAt) return false;
  return now - praise.createdAt.toDate().getTime() < PRAISE_EDIT_WINDOW_MS;
}

/** 칭찬 단건 조회 */
export async function getPraiseById(praiseId: string): Promise<Praise | null> {
  const snap = await getDoc(doc(db, 'praises', praiseId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Praise, 'id'>) };
}

/** 칭찬 수정 — 작성 후 10분 이내, 본인 작성 건만 (Firestore 보안 규칙에서 최종 검증) */
export async function updatePraise(
  praiseId: string,
  params: { content: string; categories: PraiseCategory[] },
): Promise<void> {
  await updateDoc(doc(db, 'praises', praiseId), params);
}

/** 내가 보낸 칭찬 실시간 구독 — 복합 인덱스: sprintId + fromUserId + createdAt desc */
export function subscribeToSentPraises(
  sprintId: string,
  userId: string,
  callback: (praises: Praise[]) => void,
): () => void {
  const q = query(
    collection(db, 'praises'),
    where('sprintId', '==', sprintId),
    where('fromUserId', '==', userId),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Praise, 'id'>) })));
  });
}

/** 내가 받은 칭찬 실시간 구독 — 복합 인덱스: sprintId + toUserId + createdAt desc */
export function subscribeToReceivedPraises(
  sprintId: string,
  userId: string,
  callback: (praises: Praise[]) => void,
): () => void {
  const q = query(
    collection(db, 'praises'),
    where('sprintId', '==', sprintId),
    where('toUserId', '==', userId),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Praise, 'id'>) })));
  });
}


/** 스프린트 칭찬 총 개수 — 문서 다운로드 없이 서버 집계 */
export async function getSprintPraiseCount(sprintId: string): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(db, 'praises'), where('sprintId', '==', sprintId)),
  );
  return snap.data().count;
}

// ─── 조르기 (nudge) ───────────────────────────────────────────────────────────

export interface NudgeLog {
  id: string;
  sprintId: string;
  requesterId: string;
  toUserId: string;
  createdAt: Timestamp | null;
}

/** 오늘 이미 조른 적 있는지 확인 — 복합 인덱스: sprintId + requesterId + createdAt */
export async function hasNudgedToday(
  sprintId: string,
  requesterId: string,
): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const snap = await getDocs(
    query(
      collection(db, 'nudgeLogs'),
      where('sprintId', '==', sprintId),
      where('requesterId', '==', requesterId),
      where('createdAt', '>=', Timestamp.fromDate(todayStart)),
    ),
  );
  return !snap.empty;
}

/** 조르기 기록 저장 */
export async function recordNudge(params: {
  sprintId: string;
  requesterId: string;
  toUserId: string;
}): Promise<void> {
  await addDoc(collection(db, 'nudgeLogs'), {
    ...params,
    createdAt: serverTimestamp(),
  });

  // 알림 발송 실패가 조르기 자체를 실패시키면 안 되므로 베스트 에포트로 처리
  try {
    const toProfile = await getUserProfile(params.toUserId);
    await sendPushNotifications(
      [toProfile],
      '🐳 마니띠가 칭찬을 기다리고 있어요',
      '지금 마니띠에게 칭찬을 써주세요!',
    );
  } catch (e) {
    console.warn('조르기 알림 발송 실패', e);
  }
}
