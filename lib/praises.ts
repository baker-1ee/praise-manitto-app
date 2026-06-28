import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
}

/** 내가 보낸 칭찬 실시간 구독 — 단일 필드 + 클라이언트 필터/정렬 */
export function subscribeToSentPraises(
  sprintId: string,
  userId: string,
  callback: (praises: Praise[]) => void,
): () => void {
  const q = query(collection(db, 'praises'), where('sprintId', '==', sprintId));
  return onSnapshot(q, (snap) => {
    const result = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Praise, 'id'>) }))
      .filter((p) => p.fromUserId === userId)
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    callback(result);
  });
}

/** 내가 받은 칭찬 실시간 구독 — 단일 필드 + 클라이언트 필터/정렬 */
export function subscribeToReceivedPraises(
  sprintId: string,
  userId: string,
  callback: (praises: Praise[]) => void,
): () => void {
  const q = query(collection(db, 'praises'), where('sprintId', '==', sprintId));
  return onSnapshot(q, (snap) => {
    const result = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Praise, 'id'>) }))
      .filter((p) => p.toUserId === userId)
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    callback(result);
  });
}

/** 칭찬 통계 — 단일 쿼리 후 클라이언트 집계 */
export async function getPraiseStats(
  sprintId: string,
  userId: string,
): Promise<{ sent: number; received: number }> {
  const snap = await getDocs(
    query(collection(db, 'praises'), where('sprintId', '==', sprintId)),
  );
  const all = snap.docs.map((d) => d.data() as { fromUserId: string; toUserId: string });
  return {
    sent: all.filter((p) => p.fromUserId === userId).length,
    received: all.filter((p) => p.toUserId === userId).length,
  };
}

/** 스프린트 칭찬 총 개수 */
export async function getSprintPraiseCount(sprintId: string): Promise<number> {
  const snap = await getDocs(
    query(collection(db, 'praises'), where('sprintId', '==', sprintId)),
  );
  return snap.size;
}

// ─── 조르기 (nudge) ───────────────────────────────────────────────────────────

export interface NudgeLog {
  id: string;
  sprintId: string;
  requesterId: string;
  toUserId: string;
  createdAt: Timestamp | null;
}

/** 오늘 이미 조른 적 있는지 확인 — 단일 필드 + 클라이언트 필터 */
export async function hasNudgedToday(
  sprintId: string,
  requesterId: string,
): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const snap = await getDocs(
    query(collection(db, 'nudgeLogs'), where('sprintId', '==', sprintId)),
  );
  return snap.docs.some((d) => {
    const data = d.data();
    if (data.requesterId !== requesterId) return false;
    const ts = (data.createdAt as Timestamp | null)?.toDate();
    return ts ? ts >= todayStart : false;
  });
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
}
