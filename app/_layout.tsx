import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
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

  // 인증 로딩 + (로그인 상태일 때) 팀 로딩이 모두 끝날 때까지 대기
  const loading = authLoading || (!!user && teamLoading);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!user) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    // 로그인 O, 팀 없음 → 온보딩
    if (myTeams.length === 0) {
      if (!inOnboarding) router.replace('/(onboarding)');
      return;
    }

    // 로그인 O, 팀 있음 → 탭으로
    if (inAuthGroup || inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [user, loading, myTeams.length, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return (
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
  );
}
