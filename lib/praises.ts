import {
  addDoc,
  collection,
  getCountFromServer,
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
}
