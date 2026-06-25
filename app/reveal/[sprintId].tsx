import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors } from '@/constants/theme';

// Phase 5에서 구현 예정
export default function RevealScreen() {
  const { sprintId } = useLocalSearchParams<{ sprintId: string }>();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: '마니또 공개', headerShown: true, headerTintColor: AppColors.primary }} />
      <View style={styles.center}>
        <Text style={styles.emoji}>🎊</Text>
        <Text style={styles.text}>Phase 5에서 구현 예정입니다</Text>
        <Text style={styles.sub}>sprintId: {sprintId}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 48 },
  text: { fontSize: 15, color: AppColors.textMuted },
  sub: { fontSize: 12, color: AppColors.textSecondary },
});
