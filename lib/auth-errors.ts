export function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return '이미 사용 중인 이메일입니다.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case 'auth/weak-password':
      return '비밀번호는 최소 6자리 이상이어야 합니다.';
    case 'auth/invalid-email':
      return '올바른 이메일 형식이 아닙니다.';
    case 'auth/too-many-requests':
      return '잠시 후 다시 시도해주세요.';
    case 'auth/network-request-failed':
      return '네트워크 오류가 발생했습니다.';
    default:
      return '오류가 발생했습니다. 다시 시도해주세요.';
  }
}
