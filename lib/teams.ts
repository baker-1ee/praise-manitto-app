import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: Timestamp | null;
}

export interface Membership {
  id: string;
  userId: string;
  teamId: string;
  role: 'LEADER' | 'MEMBER';
  joinedAt: Timestamp | null;
}

export type TeamWithRole = Team & {
  role: 'LEADER' | 'MEMBER';
  membershipId: string;
};

export interface MemberWithProfile {
  membershipId: string;
  userId: string;
  role: 'LEADER' | 'MEMBER';
  joinedAt: Timestamp | null;
  name: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
}

// ─── 내부 유틸 ───────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  // 헷갈리는 문자(0, O, I, 1) 제외
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}

// ─── Firestore CRUD ──────────────────────────────────────────────────────────

/** 팀 생성 → 생성자는 LEADER로 자동 등록 */
export async function createTeam(userId: string, name: string): Promise<string> {
  const inviteCode = generateInviteCode();

  const teamRef = await addDoc(collection(db, 'teams'), {
    name: name.trim(),
    inviteCode,
    createdBy: userId,
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'memberships'), {
    userId,
    teamId: teamRef.id,
    role: 'LEADER',
    joinedAt: serverTimestamp(),
  });

  return teamRef.id;
}

/** 초대 코드로 팀 합류 */
export async function joinTeamByCode(userId: string, code: string): Promise<string> {
  const normalizedCode = code.toUpperCase().trim();

  const teamsSnap = await getDocs(
    query(collection(db, 'teams'), where('inviteCode', '==', normalizedCode)),
  );

  if (teamsSnap.empty) {
    throw new Error('유효하지 않은 초대 코드입니다.');
  }

  const teamId = teamsSnap.docs[0].id;

  // 이미 멤버인지 체크 (단일 필드 쿼리 후 클라이언트 필터)
  const myMembershipsSnap = await getDocs(
    query(collection(db, 'memberships'), where('userId', '==', userId)),
  );
  const alreadyMember = myMembershipsSnap.docs.some((d) => d.data().teamId === teamId);
  if (alreadyMember) {
    throw new Error('이미 해당 팀의 멤버입니다.');
  }

  await addDoc(collection(db, 'memberships'), {
    userId,
    teamId,
    role: 'MEMBER',
    joinedAt: serverTimestamp(),
  });

  return teamId;
}

/** 내 멤버십 실시간 구독 */
export function subscribeToMyMemberships(
  userId: string,
  callback: (memberships: Membership[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(collection(db, 'memberships'), where('userId', '==', userId));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Membership, 'id'>),
      })),
    );
  }, onError);
}

/** 팀 단건 조회 */
export async function getTeam(teamId: string): Promise<Team | null> {
  const snap = await getDoc(doc(db, 'teams', teamId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Team, 'id'>) };
}

/** 팀 멤버 + 프로필 목록 */
export async function getTeamMembersWithProfiles(teamId: string): Promise<MemberWithProfile[]> {
  const membershipsSnap = await getDocs(
    query(collection(db, 'memberships'), where('teamId', '==', teamId)),
  );

  const results = await Promise.all(
    membershipsSnap.docs.map(async (membershipDoc) => {
      const { userId, role, joinedAt } = membershipDoc.data() as Omit<Membership, 'id'>;
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (!userSnap.exists()) return null;
      const userData = userSnap.data() as {
        name: string;
        email: string;
        bio?: string;
        avatarUrl?: string;
      };
      return {
        membershipId: membershipDoc.id,
        userId,
        role: role as 'LEADER' | 'MEMBER',
        joinedAt: (joinedAt as Timestamp | null) ?? null,
        ...userData,
      };
    }),
  );

  return results.filter((r): r is MemberWithProfile => r !== null);
}

/** 팀 나가기 (membership 삭제) */
export async function leaveMembership(membershipId: string): Promise<void> {
  await deleteDoc(doc(db, 'memberships', membershipId));
}

/** 팀 삭제 (LEADER 전용) — 스프린트·pairs·칭찬·nudgeLogs·멤버십 전체 삭제 */
export async function deleteTeam(teamId: string): Promise<void> {
  // 1. 해당 팀의 스프린트 목록
  const sprintsSnap = await getDocs(
    query(collection(db, 'sprints'), where('teamId', '==', teamId)),
  );

  for (const sprintDoc of sprintsSnap.docs) {
    const sprintId = sprintDoc.id;

    // 1-a. pairs 서브컬렉션
    const pairsSnap = await getDocs(collection(db, 'sprints', sprintId, 'pairs'));
    await Promise.all(pairsSnap.docs.map((d) => deleteDoc(d.ref)));

    // 1-b. praises (sprintId 기준)
    const praisesSnap = await getDocs(
      query(collection(db, 'praises'), where('sprintId', '==', sprintId)),
    );
    await Promise.all(praisesSnap.docs.map((d) => deleteDoc(d.ref)));

    // 1-c. nudgeLogs (sprintId 기준)
    const nudgeSnap = await getDocs(
      query(collection(db, 'nudgeLogs'), where('sprintId', '==', sprintId)),
    );
    await Promise.all(nudgeSnap.docs.map((d) => deleteDoc(d.ref)));

    // 1-d. 스프린트 문서
    await deleteDoc(sprintDoc.ref);
  }

  // 2. 멤버십 전체 삭제
  const membershipsSnap = await getDocs(
    query(collection(db, 'memberships'), where('teamId', '==', teamId)),
  );
  await Promise.all(membershipsSnap.docs.map((d) => deleteDoc(d.ref)));

  // 3. 팀 문서 삭제
  await deleteDoc(doc(db, 'teams', teamId));
}

/** 초대 코드 재발급 (LEADER 전용) */
export async function regenerateInviteCode(teamId: string): Promise<string> {
  const newCode = generateInviteCode();
  await updateDoc(doc(db, 'teams', teamId), { inviteCode: newCode });
  return newCode;
}
