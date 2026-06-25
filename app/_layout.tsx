import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { TeamProvider, useTeam } from '@/contexts/team-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppColors } from '@/constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <TeamProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootNavigator />
          <StatusBar style="auto" />
        </ThemeProvider>
      </TeamProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { user, loading: authLoading } = useAuth();
  const { myTeams, loading: teamLoading } = useTeam();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  const loading = authLoading || (!!user && teamLoading);

  useEffect(() => {
    // 네비게이터 미준비 또는 로딩 중이면 대기
    if (!navigationState?.key || loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!user) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    if (myTeams.length === 0) {
      if (!inOnboarding) router.replace('/(onboarding)');
      return;
    }

    if (inAuthGroup || inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [navigationState?.key, user, loading, myTeams.length, segments]);

  // Stack은 항상 렌더링 — 언마운트되면 라우트가 네비게이터에서 제거되어
  // router.replace('/(onboarding)') 호출 시 "not handled" 에러 발생
  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="team/[teamId]/index"
          options={{
            headerShown: true,
            headerTintColor: AppColors.primary,
            headerBackTitle: '팀',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: '#fafafa' },
          }}
        />
      </Stack>

      {/* 로딩 오버레이 — Stack 위에 얹어서 라우트 등록 유지 */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
