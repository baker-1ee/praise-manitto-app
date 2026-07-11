import { db } from '@/lib/firebase';
import {
  collection,
  deleteField,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  pushToken?: string;
  pushEnabled?: boolean; // false면 알림 끔(사용자가 명시적으로 껐음). 미설정(undefined)은 켜짐으로 취급
  createdAt: Timestamp | null;
}

export async function createUserProfile(
  uid: string,
  email: string,
  name: string,
): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    email,
    name,
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...(snap.data() as Omit<UserProfile, 'uid'>) };
}

/** 여러 유저 프로필 배치 조회 — 최대 30개씩 청크로 in 쿼리 */
export async function getUserProfilesByIds(uids: string[]): Promise<UserProfile[]> {
  const uniqueIds = [...new Set(uids)];
  if (uniqueIds.length === 0) return [];

  const profiles: UserProfile[] = [];
  const chunkSize = 30;
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const snap = await getDocs(
      query(collection(db, 'users'), where('__name__', 'in', chunk)),
    );
    snap.docs.forEach((d) => {
      profiles.push({ uid: d.id, ...(d.data() as Omit<UserProfile, 'uid'>) });
    });
  }
  return profiles;
}

/** 푸시 토큰 저장 — 로그인/앱 실행 시마다 최신 토큰으로 갱신 */
export async function savePushToken(uid: string, token: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { pushToken: token, pushEnabled: true });
}

/** 푸시 알림 켜기/끄기 — 토큰은 그대로 두고 플래그만 변경 (다시 켤 때 재등록 불필요, 발송 시 이 플래그로 필터링) */
export async function setPushEnabled(uid: string, enabled: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { pushEnabled: enabled });
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, 'name' | 'bio' | 'avatarUrl'>>,
): Promise<void> {
  const payload: Record<string, unknown> = { ...data };
  // undefined 값은 Firestore가 거부하므로 deleteField()로 교체
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) payload[key] = deleteField();
  });
  await updateDoc(doc(db, 'users', uid), payload);
}

/**
 * 회원 탈퇴 시 프로필을 익명화 — 완전 삭제하지 않고 이름만 "탈퇴한 사용자"로 남김
 * (다른 필드는 setDoc 덮어쓰기로 전부 제거됨: 이메일·소개·푸시토큰 등)
 * 과거 칭찬 기록·마니또 짝은 그대로 남아있어야 하므로, uid로 이름을 조회하는
 * 기존 코드(getUserProfile 등)가 수정 없이 "탈퇴한 사용자"를 보여주게 됨
 */
export async function anonymizeUserProfile(uid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid), { name: '탈퇴한 사용자', email: '' });
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({ uid: snap.id, ...(snap.data() as Omit<UserProfile, 'uid'>) });
    },
    onError,
  );
}

export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  // 공백 없는 한 단어면 최대 3글자
  if (parts.length === 1) return trimmed.slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  '#7c3aed', '#2563eb', '#0891b2',
  '#16a34a', '#d97706', '#dc2626',
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
