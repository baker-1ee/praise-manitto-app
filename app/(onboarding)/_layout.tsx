import { Stack } from 'expo-router';
import { AppColors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: AppColors.primary,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#fafafc' },
        headerBackTitle: '뒤로',
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="join" options={{ title: '팀 합류' }} />
      <Stack.Screen name="create" options={{ title: '팀 만들기' }} />
    </Stack>
  );
}
