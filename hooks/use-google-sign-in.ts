import { useState } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth } from '@/contexts/auth-context';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

export function useGoogleSignIn() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = async () => {
    setLoading(true);
    setError('');
    try {
      await GoogleSignin.hasPlayServices();
      // 이미 로그인된 계정이 있으면 UI 없이 처리 (번쩍임 방지)
      const silentResult = await GoogleSignin.signInSilently();
      const idToken = silentResult.type === 'noSavedCredentialFound'
        ? (await GoogleSignin.signIn()).data?.idToken
        : silentResult.data?.idToken;
      if (!idToken) throw new Error('Google 로그인 실패: 토큰을 받지 못했습니다.');
      await signInWithGoogle({ idToken });
    } catch (e: any) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (e.code === statusCodes.IN_PROGRESS) return;
      setError(e.message ?? 'Google 로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return {
    signIn,
    loading,
    error,
    clearError: () => setError(''),
    isAvailable: true,
  };
}
