import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors } from '@/constants/theme';

// Phase 4에서 구현 예정
export default function PraiseWriteScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: '칭찬 쓰기', headerShown: true, headerTintColor: AppColors.primary }} />
      <View style={styles.center}>
        <Text style={styles.emoji}>✍️</Text>
        <Text style={styles.text}>Phase 4에서 구현 예정입니다</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 48 },
  text: { fontSize: 15, color: AppColors.textMuted },
});
