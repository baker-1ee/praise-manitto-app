import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '@/lib/firebase';
import {
  createUserProfile,
  getUserProfile,
  subscribeToUserProfile,
  updateUserProfile,
  UserProfile,
} from '@/lib/users';
import { getAuthErrorMessage } from '@/lib/auth-errors';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: (tokens: { idToken?: string; accessToken?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Pick<UserProfile, 'name' | 'bio'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Firebase Auth 상태 구독
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // Firestore 프로필 실시간 구독 (로그인 상태일 때만)
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserProfile(user.uid, (p) => {
      setProfile(p);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      const code = e instanceof FirebaseError ? e.code : '';
      throw new Error(getAuthErrorMessage(code));
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
      await createUserProfile(newUser.uid, email, name);
    } catch (e) {
      const code = e instanceof FirebaseError ? e.code : '';
      throw new Error(getAuthErrorMessage(code));
    }
  };

  const signInWithGoogle = async ({
    idToken,
    accessToken,
  }: {
    idToken?: string;
    accessToken?: string;
  }) => {
    try {
      // idToken 우선, 없으면 accessToken으로 credential 생성
      const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken);
      const { user: firebaseUser } = await signInWithCredential(auth, credential);

      // 최초 구글 로그인이면 Firestore 프로필 생성
      const existing = await getUserProfile(firebaseUser.uid);
      if (!existing) {
        await createUserProfile(
          firebaseUser.uid,
          firebaseUser.email ?? '',
          firebaseUser.displayName ?? '사용자',
        );
      }
    } catch (e) {
      const code = e instanceof FirebaseError ? e.code : '';
      throw new Error(getAuthErrorMessage(code));
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const updateProfile = async (data: Partial<Pick<UserProfile, 'name' | 'bio'>>) => {
    if (!user) return;
    await updateUserProfile(user.uid, data);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signUp, signInWithGoogle, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
