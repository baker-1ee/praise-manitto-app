import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { signInWithAppleNative } from '@/lib/apple-auth';

export function useAppleSignIn() {
  const { signInWithApple } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = async () => {
    setLoading(true);
    setError('');
    try {
      const credential = await signInWithAppleNative();
      if (!credential.identityToken) throw new Error('Apple 로그인 실패: 토큰을 받지 못했습니다.');
      await signInWithApple({
        identityToken: credential.identityToken,
        rawNonce: credential.rawNonce,
        fullName: credential.fullName,
      });
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') return;
      setError(e.message ?? 'Apple 로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return {
    signIn,
    loading,
    error,
    clearError: () => setError(''),
  };
}
