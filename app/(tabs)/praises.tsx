import { Text } from '@/components/ui/text';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTeam } from '@/contexts/team-context';
import { useSprint } from '@/contexts/sprint-context';
import { Praise } from '@/lib/praises';
import { AppColors } from '@/constants/theme';
import { PraiseCardSkeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/avatar';

type Tab = 'sent' | 'received';

export default function PraisesScreen() {
  const { myTeams, selectedTeam, selectedTeamId, setSelectedTeam } = useTeam();
  const { activeSprint, sentPraises, receivedPraises } = useSprint();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<Tab>('sent');
  const [showTeamPicker, setShowTeamPicker] = useState(false);

  const loading = activeSprint === undefined;

  // tabParam 변경 시 탭 전환
  useEffect(() => {
    if (tabParam === 'received') setActiveTab('received');
    else if (tabParam === 'sent') setActiveTab('sent');
  }, [tabParam]);

  const list = activeTab === 'sent' ? sentPraises : receivedPraises;
  const isRevealed = activeSprint?.status === 'REVEALED' || activeSprint?.status === 'CLOSED';

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>칭찬</Text>
        {myTeams.length > 1 && (
          <TouchableOpacity style={styles.teamSelector} onPress={() => setShowTeamPicker(true)}>
            <Text style={styles.teamSelectorText}>{selectedTeam?.name ?? '팀 선택'}</Text>
            <Text style={styles.teamSelectorArrow}>▾</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 탭 */}
      <View style={styles.tabs}>
        {(['sent', 'received'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'sent' ? `보낸 칭찬 ${sentPraises.length}` : `받은 칭찬 ${receivedPraises.length}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {[1, 2, 3].map((i) => <PraiseCardSkeleton key={i} />)}
        </ScrollView>
      ) : !activeSprint ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>😴</Text>
          <Text style={styles.emptyText}>스프린트가 없어요</Text>
        </View>
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <Image
            source={activeTab === 'received'
              ? require('@/assets/images/whale-crying.png')
              : require('@/assets/images/whale-writing.png')}
            style={styles.emptyWhale}
            resizeMode="contain"
          />
          <Text style={styles.emptyText}>
            {activeTab === 'sent' ? '칭찬은 고래도 춤추게 한대요' : '곧 칭찬이 도착할거에요'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {list.map((praise) => (
            <PraiseCard
              key={praise.id}
              praise={praise}
              tab={activeTab}
              isRevealed={isRevealed}
            />
          ))}
        </ScrollView>
      )}

      {/* 팀 선택 모달 */}
      <Modal visible={showTeamPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} onPress={() => setShowTeamPicker(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>팀 선택</Text>
            {myTeams.map((team) => (
              <TouchableOpacity
                key={team.id}
                style={[styles.pickerItem, team.id === selectedTeamId && styles.pickerItemActive]}
                onPress={() => { setSelectedTeam(team.id); setShowTeamPicker(false); }}
              >
                <Avatar name={team.name} size={32} />
                <Text style={[styles.pickerItemText, team.id === selectedTeamId && styles.pickerItemTextActive]}>
                  {team.name}
                </Text>
                {team.id === selectedTeamId && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function PraiseCard({ praise, tab, isRevealed }: {
  praise: Praise;
  tab: Tab;
  isRevealed: boolean;
}) {
  const date = praise.createdAt?.toDate();
  const dateStr = date
    ? `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    : '';

  return (
    <View style={styles.card}>
      {/* 발신자 (받은 칭찬: 공개 전 익명) */}
      {tab === 'received' && (
        <View style={styles.cardFrom}>
          <View style={styles.anonymousDot} />
          <Text style={styles.cardFromText}>
            {isRevealed ? '마니또' : '익명의 팀원'}
          </Text>
        </View>
      )}

      {/* 칭찬 내용 */}
      <Text style={styles.cardContent}>{praise.content}</Text>

      {/* 카테고리 + 날짜 */}
      <View style={styles.cardFooter}>
        <View style={styles.categoryChips}>
          {praise.categories.map((cat) => (
            <View key={cat} style={styles.chip}>
              <Text style={styles.chipText}>{cat}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.cardDate}>{dateStr}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '800', color: AppColors.textPrimary },
  teamSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: AppColors.primaryLight,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  teamSelectorText: { fontSize: 14, fontWeight: '600', color: AppColors.primary },
  teamSelectorArrow: { fontSize: 12, color: AppColors.primary },

  // 탭
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20, marginTop: 12, marginBottom: 8,
    backgroundColor: AppColors.primaryLight,
    borderRadius: 12, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: AppColors.white },
  tabText: { fontSize: 14, fontWeight: '600', color: AppColors.textMuted },
  tabTextActive: { color: AppColors.primary },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyEmoji: { fontSize: 44 },
  emptyWhale: { width: 200, height: 200 },
  emptyText: { fontSize: 15, color: AppColors.textMuted, marginTop: 4 },

  list: { padding: 20, gap: 12, paddingBottom: 32 },
  card: {
    backgroundColor: AppColors.white, borderRadius: 14,
    borderWidth: 1, borderColor: AppColors.borderLight,
    padding: 16, gap: 10,
  },
  cardFrom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  anonymousDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: AppColors.primary,
  },
  cardFromText: { fontSize: 13, fontWeight: '600', color: AppColors.primary },
  cardContent: {
    fontSize: 15, color: AppColors.textPrimary,
    lineHeight: 23,
  },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  chip: {
    backgroundColor: AppColors.primaryLight, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: AppColors.primary },
  cardDate: { fontSize: 11, color: AppColors.textSecondary },

  // 팀 선택 모달
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: AppColors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingBottom: 36, paddingHorizontal: 20, gap: 4,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: AppColors.textPrimary, marginBottom: 8 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12,
  },
  pickerItemActive: { backgroundColor: AppColors.primaryLight },
  pickerItemText: { flex: 1, fontSize: 15, color: AppColors.textPrimary, fontWeight: '500' },
  pickerItemTextActive: { color: AppColors.primary, fontWeight: '700' },
  checkmark: { fontSize: 16, color: AppColors.primary, fontWeight: '700' },
});
