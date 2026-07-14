import { Text } from '@/components/ui/text';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';

import { useAuth } from '@/contexts/auth-context';
import { useGoogleSignIn } from '@/hooks/use-google-sign-in';
import { useAppleSignIn } from '@/hooks/use-apple-sign-in';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppColors } from '@/constants/theme';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const google = useGoogleSignIn();
  const apple = useAppleSignIn();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const validate = (): string | null => {
    if (!name.trim()) return '이름을 입력해주세요.';
    if (name.trim().length < 2) return '이름은 최소 2자 이상이어야 합니다.';
    if (!email.trim()) return '이메일을 입력해주세요.';
    if (!password) return '비밀번호를 입력해주세요.';
    if (password.length < 6) return '비밀번호는 최소 6자리 이상이어야 합니다.';
    if (password !== confirm) return '비밀번호가 일치하지 않습니다.';
    return null;
  };

  const handleRegister = async () => {
    setError('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const displayError = error || google.error || apple.error;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>회원가입</Text>
            <Text style={styles.subtitle}>칭찬 마니또에 오신 것을 환영해요!</Text>
          </View>

          {/* 애플 회원가입 (iOS 전용) */}
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={styles.appleButton}
              onPress={() => { apple.clearError(); apple.signIn(); }}
            />
          )}

          {/* 구글 회원가입 */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => { google.clearError(); google.signIn(); }}
            disabled={google.loading}
            activeOpacity={0.75}
          >
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleText}>Google로 시작하기</Text>
          </TouchableOpacity>

          {/* 구분선 */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는 이메일로 가입</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 이메일/비밀번호 폼 */}
          <View style={styles.form}>
            <Input
              label="이름"
              placeholder="팀에서 사용할 이름을 입력하세요"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              maxLength={20}
            />
            <Input
              ref={emailRef}
              label="이메일"
              placeholder="이메일을 입력하세요"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Input
              ref={passwordRef}
              label="비밀번호"
              placeholder="비밀번호 (최소 6자리)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <Input
              ref={confirmRef}
              label="비밀번호 확인"
              placeholder="비밀번호를 한 번 더 입력하세요"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />

            {displayError ? <Text style={styles.errorText}>{displayError}</Text> : null}

            <Button title="가입하기" onPress={handleRegister} loading={loading} />
          </View>

          {/* 로그인 링크 */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>이미 계정이 있으신가요?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                <Text style={styles.link}>로그인</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafc' },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: AppColors.primary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: AppColors.textMuted },
  appleButton: {
    height: 50,
    marginBottom: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#dadce0',
    backgroundColor: '#ffffff',
  },
  googleG: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  googleText: { fontSize: 16, fontWeight: '600', color: AppColors.textPrimary },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: AppColors.border },
  dividerText: { fontSize: 12, color: AppColors.textSecondary, whiteSpace: 'nowrap' } as object,
  form: { gap: 14 },
  errorText: { fontSize: 13, color: AppColors.error, textAlign: 'center' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 28,
  },
  footerText: { fontSize: 14, color: AppColors.textMuted },
  link: { fontSize: 14, fontWeight: '700', color: AppColors.primary },
});
