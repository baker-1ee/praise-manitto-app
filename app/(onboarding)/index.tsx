import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { AlertModal } from '@/components/ui/alert-modal';

export default function OnboardingScreen() {
  const { profile, signOut } = useAuth();
  const [alert, setAlert] = useState<{ title: string; message?: string; type?: 'default' | 'error' | 'success'; buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }> } | null>(null);

  const handleLogout = () => {
    setAlert({
      title: '로그아웃',
      message: '정말 로그아웃 하시겠어요?',
      buttons: [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.emoji}>💌</Text>
          <Text style={styles.title}>칭찬 마니또</Text>
          <Text style={styles.greeting}>
            {profile?.name ? `${profile.name}님, 환영해요!` : '환영해요!'}
          </Text>
          <Text style={styles.subtitle}>팀에 합류하거나 새 팀을 만들어 시작하세요</Text>
        </View>

        {/* 선택 카드 */}
        <View style={styles.cards}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/(onboarding)/join')}
            activeOpacity={0.8}
          >
            <Text style={styles.cardEmoji}>🔑</Text>
            <Text style={styles.cardTitle}>팀 합류하기</Text>
            <Text style={styles.cardDesc}>초대 코드가 있다면 팀에 참여해보세요</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, styles.cardSecondary]}
            onPress={() => router.push('/(onboarding)/create')}
            activeOpacity={0.8}
          >
            <Text style={styles.cardEmoji}>✨</Text>
            <Text style={[styles.cardTitle, styles.cardTitleSecondary]}>새 팀 만들기</Text>
            <Text style={[styles.cardDesc, styles.cardDescSecondary]}>
              팀이 없다면 직접 만들어 초대해보세요
            </Text>
          </TouchableOpacity>
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity onPress={handleLogout} hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}>
          <Text style={styles.logoutText}>다른 계정으로 로그인</Text>
        </TouchableOpacity>
      </View>
      <AlertModal
        visible={!!alert}
        title={alert?.title ?? ''}
        message={alert?.message}
        type={alert?.type}
        buttons={alert?.buttons}
        onClose={() => setAlert(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.white },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  emoji: { fontSize: 52, marginBottom: 4 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: AppColors.primary,
    letterSpacing: -0.5,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  cards: { gap: 14, width: '100%' },
  card: {
    backgroundColor: AppColors.primary,
    borderRadius: 16,
    padding: 24,
    gap: 6,
  },
  cardSecondary: {
    backgroundColor: AppColors.white,
    borderWidth: 1.5,
    borderColor: AppColors.border,
  },
  cardEmoji: { fontSize: 28, marginBottom: 4 },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.white,
  },
  cardTitleSecondary: { color: AppColors.textPrimary },
  cardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  cardDescSecondary: { color: AppColors.textMuted },
  logoutText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textDecorationLine: 'underline',
  },
});
