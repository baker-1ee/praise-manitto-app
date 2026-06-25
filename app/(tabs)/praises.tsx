import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { useTeam } from '@/contexts/team-context';
import { subscribeToActiveSprint, Sprint } from '@/lib/sprints';
import {
  getDocs, collection, query, where, orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Praise,
  subscribeToReceivedPraises,
  subscribeToSentPraises,
} from '@/lib/praises';
import { AppColors } from '@/constants/theme';
import { PraiseCardSkeleton } from '@/components/ui/skeleton';

type Tab = 'sent' | 'received';

export default function PraisesScreen() {
  const { user } = useAuth();
  const { selectedTeamId } = useTeam();

  const [activeTab, setActiveTab] = useState<Tab>('sent');
  const [activeSprint, setActiveSprint] = useState<Sprint | null | undefined>(undefined);
  const [sentPraises, setSentPraises] = useState<Praise[]>([]);
  const [receivedPraises, setReceivedPraises] = useState<Praise[]>([]);
  const [loading, setLoading] = useState(true);

  // 활성 스프린트 구독
  useEffect(() => {
    if (!selectedTeamId) { setActiveSprint(null); setLoading(false); return; }
    const unsub = subscribeToActiveSprint(selectedTeamId, (s) => {
      setActiveSprint(s);
      setLoading(false);
    });
    return unsub;
  }, [selectedTeamId]);

  // 보낸 칭찬 구독 (활성 스프린트 있으면 스프린트 기준, 없으면 팀 전체 내역)
  useEffect(() => {
    if (!user || !selectedTeamId) { setSentPraises([]); return; }
    if (activeSprint) {
      const unsub = subscribeToSentPraises(activeSprint.id, user.uid, setSentPraises);
      return unsub;
    }
    // 스프린트 없을 때 팀 전체 보낸 칭찬
    getDocs(query(
      collection(db, 'praises'),
      where('teamId', '==', selectedTeamId),
      where('fromUserId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    )).then((snap) => {
      setSentPraises(snap.docs.map((d) => ({ id: d.id, ...d.data() as Omit<Praise, 'id'> })));
    });
  }, [activeSprint?.id, user?.uid, selectedTeamId]);

  // 받은 칭찬 구독 (활성 스프린트 있으면 스프린트 기준, 없으면 팀 전체 내역)
  useEffect(() => {
    if (!user || !selectedTeamId) { setReceivedPraises([]); return; }
    if (activeSprint) {
      const unsub = subscribeToReceivedPraises(activeSprint.id, user.uid, setReceivedPraises);
      return unsub;
    }
    // 스프린트 없을 때 팀 전체 받은 칭찬
    getDocs(query(
      collection(db, 'praises'),
      where('teamId', '==', selectedTeamId),
      where('toUserId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    )).then((snap) => {
      setReceivedPraises(snap.docs.map((d) => ({ id: d.id, ...d.data() as Omit<Praise, 'id'> })));
    });
  }, [activeSprint?.id, user?.uid, selectedTeamId]);

  const list = activeTab === 'sent' ? sentPraises : receivedPraises;
  const isRevealed = activeSprint?.status === 'REVEALED' || activeSprint?.status === 'CLOSED';

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>칭찬</Text>
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
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>{activeTab === 'sent' ? '✍️' : '💌'}</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'sent' ? '아직 보낸 칭찬이 없어요' : '아직 받은 칭찬이 없어요'}
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
      <Text style={styles.cardContent}>"{praise.content}"</Text>

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
  safe: { flex: 1, backgroundColor: '#fafafa' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: AppColors.textPrimary },

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
  emptyText: { fontSize: 15, color: AppColors.textMuted },

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
    lineHeight: 23, fontStyle: 'italic',
  },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  chip: {
    backgroundColor: AppColors.primaryLight, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: AppColors.primary },
  cardDate: { fontSize: 11, color: AppColors.textSecondary },
});
