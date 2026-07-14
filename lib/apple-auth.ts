import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

const NONCE_CHARSET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';

function randomNonce(length = 32): string {
  const bytes = Crypto.getRandomBytes(length);
  let result = '';
  for (const byte of bytes) result += NONCE_CHARSET[byte % NONCE_CHARSET.length];
  return result;
}

/**
 * Firebase의 Apple OAuthProvider는 재전송 공격 방지를 위해 원본 nonce와
 * SHA256 해시된 nonce를 모두 요구함 — 해시된 값은 Apple에 요청 시,
 * 원본 값은 Firebase에 credential 생성 시 전달해야 함
 */
export async function signInWithAppleNative() {
  const rawNonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  return { ...credential, rawNonce };
}
