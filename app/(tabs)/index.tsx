import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { useAuth } from '@/contexts/auth-context';
import { AppColors } from '@/constants/theme';

export default function HomeScreen() {
  const { profile } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.greeting}>
          <Avatar name={profile?.name} size={52} />
          <View>
            <Text style={styles.hello}>안녕하세요, {profile?.name ?? '...'}님 👋</Text>
            <Text style={styles.sub}>오늘도 팀원을 칭찬해보세요!</Text>
          </View>
        </View>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderEmoji}>😴</Text>
          <Text style={styles.placeholderText}>현재 진행 중인 스프린트가 없어요</Text>
          <Text style={styles.placeholderSub}>팀장님이 새 스프린트를 시작하면 알려드릴게요!</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  hello: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textPrimary,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 13,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  placeholderSub: {
    fontSize: 13,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
});
