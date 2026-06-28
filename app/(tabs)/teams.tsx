import { StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTeam } from '@/contexts/team-context';
import { Avatar } from '@/components/avatar';
import { AppColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TeamWithRole } from '@/lib/teams';

export default function TeamsScreen() {
  const { myTeams } = useTeam();

  const renderTeam = ({ item }: { item: TeamWithRole }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/team/${item.id}`)}
      activeOpacity={0.7}
    >
      <Avatar name={item.name} size={44} />
      <View style={styles.cardInfo}>
        <Text style={styles.teamName}>{item.name}</Text>
        <View style={styles.roleRow}>
          <View style={[styles.badge, item.role === 'LEADER' ? styles.badgeLeader : styles.badgeMember]}>
            <Text style={[styles.badgeText, item.role === 'LEADER' ? styles.badgeTextLeader : styles.badgeTextMember]}>
              {item.role === 'LEADER' ? '리더' : '멤버'}
            </Text>
          </View>
        </View>
      </View>
      <IconSymbol name="chevron.right" size={18} color={AppColors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>팀</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(onboarding)?addTeam=1')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.addButtonText}>+ 팀 추가</Text>
          </TouchableOpacity>
        </View>

        {myTeams.length === 0 ? (
          /* 빈 상태 */
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>소속된 팀이 없어요</Text>
            <Text style={styles.emptyDesc}>팀에 합류하거나 새 팀을 만들어보세요</Text>
            <View style={styles.emptyButtons}>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(onboarding)/join')}
              >
                <Text style={styles.emptyBtnText}>팀 합류하기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emptyBtn, styles.emptyBtnSecondary]}
                onPress={() => router.push('/(onboarding)/create')}
              >
                <Text style={[styles.emptyBtnText, styles.emptyBtnTextSecondary]}>팀 만들기</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
            data={myTeams}
            keyExtractor={(item) => item.id}
            renderItem={renderTeam}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: AppColors.primaryLight,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary,
  },
  list: { paddingTop: 4, paddingBottom: 24 },
  separator: { height: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: AppColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    boxShadow: `0 2px 8px ${AppColors.cardShadow}`,
    elevation: 2,
  },
  cardInfo: { flex: 1, gap: 4 },
  teamName: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  roleRow: { flexDirection: 'row' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeLeader: { backgroundColor: AppColors.primaryMid },
  badgeMember: { backgroundColor: '#f1f5f9' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextLeader: { color: AppColors.primary },
  badgeTextMember: { color: AppColors.textMuted },

  // 빈 상태
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 60,
  },
  emptyEmoji: { fontSize: 52, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: AppColors.textPrimary },
  emptyDesc: { fontSize: 14, color: AppColors.textMuted, textAlign: 'center' },
  emptyButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: AppColors.primary,
    borderRadius: 10,
  },
  emptyBtnSecondary: {
    backgroundColor: AppColors.white,
    borderWidth: 1.5,
    borderColor: AppColors.border,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: AppColors.white },
  emptyBtnTextSecondary: { color: AppColors.textPrimary },
});
