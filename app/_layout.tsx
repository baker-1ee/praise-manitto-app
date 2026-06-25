import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
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
  // Expo Router: 네비게이터가 완전히 마운트된 뒤에만 이동
  const navigationState = useRootNavigationState();

  const loading = authLoading || (!!user && teamLoading);

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

    if (inAuthGroup || inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [navigationState?.key, user, loading, myTeams.length, segments]);

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
