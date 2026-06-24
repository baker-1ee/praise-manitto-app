import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors } from '@/constants/theme';

export default function PraisesScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>칭찬</Text>
        <View style={styles.placeholder}>
          <Text style={styles.emoji}>💬</Text>
          <Text style={styles.text}>Phase 4에서 구현 예정입니다</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: AppColors.textPrimary,
    paddingVertical: 16,
  },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emoji: { fontSize: 48 },
  text: { fontSize: 15, color: AppColors.textMuted },
});
