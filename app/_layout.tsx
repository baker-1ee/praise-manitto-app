import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { NanumPenScript_400Regular } from '@expo-google-fonts/nanum-pen-script';
import { GowunDodum_400Regular } from '@expo-google-fonts/gowun-dodum';
import { Stack, useGlobalSearchParams, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { TeamProvider, useTeam } from '@/contexts/team-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppColors } from '@/constants/theme';

// 네이티브 스플래시를 JS가 준비될 때까지 유지
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({ NanumPenScript_400Regular, GowunDodum_400Regular });

  if (!fontsLoaded) return null;

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
  const navigationState = useRootNavigationState();

  const loading = authLoading || (!!user && teamLoading);
  const inAuthGroup = segments[0] === '(auth)';
  const inOnboarding = segments[0] === '(onboarding)';

  // 올바른 목적지에 실제로 도달했을 때만 스플래시 숨김
  const onCorrectScreen =
    !loading &&
    !!navigationState?.key &&
    (
      (!user && inAuthGroup) ||
      (!!user && myTeams.length === 0 && (inOnboarding || !!addTeam)) ||
      (!!user && myTeams.length > 0 && !inAuthGroup && !(inOnboarding && !addTeam))
    );

  useEffect(() => {
    if (onCorrectScreen) SplashScreen.hideAsync();
  }, [onCorrectScreen]);

  useEffect(() => {
    if (!navigationState?.key || loading) return;

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
  );
}
