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
  writeBatch,
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

/** 팀 멤버 + 프로필 목록 — 배치 조회로 N+1 제거 */
export async function getTeamMembersWithProfiles(teamId: string): Promise<MemberWithProfile[]> {
  const membershipsSnap = await getDocs(
    query(collection(db, 'memberships'), where('teamId', '==', teamId)),
  );
  if (membershipsSnap.empty) return [];

  const memberships = membershipsSnap.docs.map((d) => ({
    membershipId: d.id,
    ...(d.data() as Omit<Membership, 'id'>),
  }));

  const userIds = memberships.map((m) => m.userId);
  const userMap = new Map<string, { name: string; email: string; bio?: string; avatarUrl?: string }>();
  const chunkSize = 30;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    const usersSnap = await getDocs(
      query(collection(db, 'users'), where('__name__', 'in', chunk)),
    );
    usersSnap.docs.forEach((d) => {
      userMap.set(d.id, d.data() as { name: string; email: string; bio?: string; avatarUrl?: string });
    });
  }

  return memberships
    .map((m) => {
      const userData = userMap.get(m.userId);
      if (!userData) return null;
      return {
        membershipId: m.membershipId,
        userId: m.userId,
        role: m.role as 'LEADER' | 'MEMBER',
        joinedAt: (m.joinedAt as Timestamp | null) ?? null,
        ...userData,
      };
    })
    .filter((r): r is MemberWithProfile => r !== null);
}

/** 팀 나가기 (membership 삭제) */
export async function leaveMembership(membershipId: string): Promise<void> {
  await deleteDoc(doc(db, 'memberships', membershipId));
}

/** 특정 유저의 멤버십 전체 조회 (회원 탈퇴 시 소속 팀 정리용) */
export async function getMembershipsByUserId(userId: string): Promise<Membership[]> {
  const snap = await getDocs(
    query(collection(db, 'memberships'), where('userId', '==', userId)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Membership, 'id'>) }));
}

/** 리더 자동 위임 대상 조회 — 나를 제외하고 가장 먼저 합류한 팀원 */
export async function findNextLeaderCandidate(
  teamId: string,
  excludeUserId: string,
): Promise<{ membershipId: string; userId: string } | null> {
  const snap = await getDocs(
    query(collection(db, 'memberships'), where('teamId', '==', teamId)),
  );
  const others = snap.docs
    .map((d) => ({ membershipId: d.id, ...(d.data() as Omit<Membership, 'id'>) }))
    .filter((m) => m.userId !== excludeUserId);
  if (others.length === 0) return null;

  others.sort((a, b) => {
    const aTime = (a.joinedAt as Timestamp | null)?.toMillis() ?? 0;
    const bTime = (b.joinedAt as Timestamp | null)?.toMillis() ?? 0;
    return aTime - bTime;
  });
  return { membershipId: others[0].membershipId, userId: others[0].userId };
}

/** 리더 위임 — 팀의 createdBy와 두 멤버십의 role을 함께 갱신 */
export async function transferLeadership(
  teamId: string,
  fromMembershipId: string,
  toMembershipId: string,
  toUserId: string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'teams', teamId), { createdBy: toUserId });
  batch.update(doc(db, 'memberships', fromMembershipId), { role: 'MEMBER' });
  batch.update(doc(db, 'memberships', toMembershipId), { role: 'LEADER' });
  await batch.commit();
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
