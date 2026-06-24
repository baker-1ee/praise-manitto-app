import { db } from '@/lib/firebase';
import {
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
  await updateDoc(doc(db, 'users', uid), data);
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
): () => void {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ uid: snap.id, ...(snap.data() as Omit<UserProfile, 'uid'>) });
  });
}

export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
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
