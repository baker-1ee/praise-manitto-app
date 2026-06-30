import React, { useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { useGoogleSignIn } from '@/hooks/use-google-sign-in';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppColors } from '@/constants/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const google = useGoogleSignIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const displayError = error || google.error;

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
          {/* 로고 */}
          <View style={styles.header}>
            <Image source={require('@/assets/images/whale.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.appName}>칭찬 마니또</Text>
            <Text style={styles.subtitle}>팀원에게 따뜻한 칭찬을 전해보세요</Text>
          </View>

          {/* 구글 로그인 */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => { google.clearError(); google.signIn(); }}
            disabled={google.loading}
            activeOpacity={0.75}
          >
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleText}>Google로 계속하기</Text>
          </TouchableOpacity>

          {/* 구분선 */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 이메일/비밀번호 폼 */}
          <View style={styles.form}>
            <Input
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
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            {displayError ? <Text style={styles.errorText}>{displayError}</Text> : null}

            <Button title="로그인" onPress={handleLogin} loading={loading} />
          </View>

          {/* 회원가입 링크 */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>계정이 없으신가요?</Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                <Text style={styles.link}>회원가입</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: { width: 120, height: 120, marginBottom: 12 },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: AppColors.primary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: AppColors.textMuted },
  form: { gap: 16 },
  errorText: {
    fontSize: 13,
    color: AppColors.error,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: AppColors.border },
  dividerText: { fontSize: 13, color: AppColors.textSecondary },
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
  googleG: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
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
