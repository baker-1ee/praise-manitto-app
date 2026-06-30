import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useGlobalSearchParams, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
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
  const { addTeam } = useGlobalSearchParams();
  // Expo Router: 네비게이터가 완전히 마운트된 뒤에만 이동
  const navigationState = useRootNavigationState();

  const loading = authLoading || (!!user && teamLoading);
  // 인증된 유저가 아직 (auth) 화면에 있으면 전환 완료까지 오버레이 유지
  const showOverlay = loading || (!!user && segments[0] === '(auth)');

  useEffect(() => {
    // 네비게이터 미준비 또는 데이터 로딩 중이면 대기
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

    if (inAuthGroup || (inOnboarding && !addTeam)) {
      router.replace('/(tabs)');
    }
  }, [navigationState?.key, user, loading, myTeams.length, segments, addTeam]);

  return (
    <>
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
            headerStyle: { backgroundColor: '#fafafc' },
          }}
        />
      </Stack>
      {showOverlay && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      )}
    </>
  );
}
