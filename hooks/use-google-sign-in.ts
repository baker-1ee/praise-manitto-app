import { Alert } from 'react-native';

// Google Sign-In은 EAS 개발 빌드 / 프로덕션 빌드에서만 동작합니다.
// Expo Go는 custom URL scheme을 등록할 수 없어 OAuth 리다이렉트가 불가능합니다.
// TODO: EAS 빌드 전환 시 expo-auth-session/providers/google 으로 교체

export function useGoogleSignIn() {
  const signIn = () => {
    Alert.alert(
      'Google 로그인',
      'Expo Go에서는 Google 로그인을 지원하지 않아요.\n이메일/비밀번호로 로그인해주세요.',
      [{ text: '확인' }],
    );
  };

  return {
    signIn,
    loading: false,
    error: '',
    clearError: () => {},
    isAvailable: true,
  };
}
