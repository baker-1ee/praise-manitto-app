import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '@/lib/firebase';
import {
  anonymizeUserProfile,
  createUserProfile,
  getUserProfile,
  savePushToken,
  subscribeToUserProfile,
  updateUserProfile,
  UserProfile,
} from '@/lib/users';
import {
  deleteTeam,
  findNextLeaderCandidate,
  getMembershipsByUserId,
  leaveMembership,
  transferLeadership,
} from '@/lib/teams';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { registerForPushNotifications } from '@/lib/notifications';

// AuthProvider는 앱 루트에서 항상 마운트되므로 여기서 한 번만 설정해두면
// 로그인 화면을 거치지 않아도(예: 기존 세션 복원) 재인증 시 바로 사용 가능
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: (tokens: { idToken?: string; accessToken?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Pick<UserProfile, 'name' | 'bio'>>) => Promise<void>;
  isGoogleAccount: () => boolean;
  deleteAccount: (password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Firebase Auth 상태 구독
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) setLoading(true);
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
    const unsub = subscribeToUserProfile(
      user.uid,
      (p) => {
        setProfile(p);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [user?.uid]);

  // 로그인 상태가 되면(기존 세션 복원 포함) 푸시 토큰을 등록/갱신
  // 단, 프로필 로드 전이거나 사용자가 알림을 명시적으로 껐으면(pushEnabled === false) 건드리지 않음
  useEffect(() => {
    if (!user || loading || !profile || profile.pushEnabled === false) return;
    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (token) await savePushToken(user.uid, token);
      } catch (e) {
        console.warn('푸시 토큰 등록 실패', e);
      }
    })();
  }, [user?.uid, loading, profile?.pushEnabled]);

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

  const isGoogleAccount = () => user?.providerData[0]?.providerId === 'google.com';

  /** 탈퇴 직전 재인증 — 이메일 계정은 비밀번호, 구글 계정은 구글 재로그인 */
  const reauthenticate = async (password?: string) => {
    if (!user) throw new Error('로그인이 필요합니다.');
    try {
      if (isGoogleAccount()) {
        await GoogleSignin.hasPlayServices();
        const result = await GoogleSignin.signIn();
        const idToken = result.data?.idToken;
        if (!idToken) throw new Error('Google 재인증에 실패했습니다.');
        await reauthenticateWithCredential(user, GoogleAuthProvider.credential(idToken));
      } else {
        if (!password) throw new Error('비밀번호를 입력해주세요.');
        if (!user.email) throw new Error('재인증에 실패했습니다.');
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      }
    } catch (e) {
      const code = e instanceof FirebaseError ? e.code : '';
      throw new Error(code ? getAuthErrorMessage(code) : (e instanceof Error ? e.message : '재인증에 실패했습니다.'));
    }
  };

  /**
   * 회원 탈퇴 — 재인증 후 소속 팀 정리(리더면 위임 또는 팀 삭제, 아니면 탈퇴),
   * 프로필 익명화(과거 칭찬 기록 보존을 위해 완전 삭제하지 않음), Firebase Auth 계정 삭제 순으로 진행
   */
  const deleteAccount = async (password?: string) => {
    if (!user) throw new Error('로그인이 필요합니다.');
    await reauthenticate(password);

    const memberships = await getMembershipsByUserId(user.uid);
    for (const m of memberships) {
      if (m.role === 'LEADER') {
        const candidate = await findNextLeaderCandidate(m.teamId, user.uid);
        if (!candidate) {
          await deleteTeam(m.teamId);
          continue;
        }
        await transferLeadership(m.teamId, m.id, candidate.membershipId, candidate.userId);
      }
      await leaveMembership(m.id);
    }

    await anonymizeUserProfile(user.uid);
    await deleteUser(user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        updateProfile,
        isGoogleAccount,
        deleteAccount,
      }}
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
