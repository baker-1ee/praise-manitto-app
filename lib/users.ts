import { db } from '@/lib/firebase';
import {
  deleteField,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
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
