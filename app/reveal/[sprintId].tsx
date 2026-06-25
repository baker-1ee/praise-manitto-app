import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfettiCannon from 'react-native-confetti-cannon';

import { getRevealData, RevealData, RevealPair } from '@/lib/sprints';
import { Avatar } from '@/components/avatar';
import { AppColors } from '@/constants/theme';

export default function RevealScreen() {
  const { sprintId } = useLocalSearchParams<{ sprintId: string }>();
  const [data, setData] = useState<RevealData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const confettiRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    if (!sprintId) return;
    getRevealData(sprintId).then((d) => {
      setData(d);
      setLoading(false);
      if (d) {
        // 처음엔 전부 펼침
        setExpandedIds(new Set(d.pairs.map((p) => p.targetId)));
        setTimeout(() => confettiRef.current?.start(), 400);
      }
    });
  }, [sprintId]);

  const toggleExpand = (targetId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(targetId) ? next.delete(targetId) : next.add(targetId);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: '마니또 공개 🎉',
          headerShown: true,
          headerTintColor: AppColors.primary,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#fafafa' },
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingEmoji}>🎉</Text>
          <Text style={styles.loadingText}>마니또 공개 중...</Text>
          <ActivityIndicator color={AppColors.primary} style={{ marginTop: 12 }} />
        </View>
      ) : !data ? (
        <View style={styles.center}>
          <Text style={styles.loadingEmoji}>😶</Text>
          <Text style={styles.loadingText}>공개 데이터를 불러올 수 없습니다</Text>
        </View>
      ) : (
        <>
          <ConfettiCannon
            ref={confettiRef}
            count={160}
            origin={{ x: -20, y: 0 }}
            autoStart={false}
            fadeOut
            colors={[AppColors.primary, '#f59e0b', '#10b981', '#ef4444', '#3b82f6']}
          />
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* 헤더 */}
            <View style={styles.header}>
              <Text style={styles.sprintName}>{data.sprint.name}</Text>
              <Text style={styles.sprintDate}>
                {data.sprint.startDate.toDate().toLocaleDateString('ko-KR')} ~{' '}
                {data.sprint.endDate.toDate().toLocaleDateString('ko-KR')}
              </Text>
              <View style={styles.revealBadge}>
                <Text style={styles.revealBadgeText}>🎊 마니또 공개!</Text>
              </View>
              <Text style={styles.totalText}>
                이번 스프린트에서 총{' '}
                <Text style={styles.totalHighlight}>{data.totalPraises}개</Text>의 칭찬이 오갔어요 💌
              </Text>
            </View>

            {/* 멤버별 카드 */}
            {data.pairs.map((pair) => (
              <PairCard
                key={pair.targetId}
                pair={pair}
                expanded={expandedIds.has(pair.targetId)}
                onToggle={() => toggleExpand(pair.targetId)}
              />
            ))}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function PairCard({ pair, expanded, onToggle }: {
  pair: RevealPair;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onToggle} activeOpacity={0.85}>
      {/* 수신자 헤더 */}
      <View style={styles.cardHeader}>
        <Avatar name={pair.targetName} size={44} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardTargetName}>{pair.targetName}</Text>
          <Text style={styles.cardManitoText}>
            💌 {pair.praises.length > 0 ? `칭찬 ${pair.praises.length}개` : '칭찬 없음'}
          </Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▽'}</Text>
      </View>

      {/* 마니또 관계 + 칭찬 (펼침 시) */}
      {expanded && (
        <View style={styles.cardBody}>
          <View style={styles.divider} />
          <View style={styles.manitoRow}>
            <Avatar name={pair.manitoName} size={30} />
            <Text style={styles.manitoText}>
              <Text style={styles.manitoName}>{pair.manitoName}</Text>
              <Text>님이 칭찬했어요</Text>
            </Text>
          </View>
          {pair.praises.length === 0 ? (
            <Text style={styles.noPraise}>작성된 칭찬이 없어요</Text>
          ) : (
            pair.praises.map((praise, i) => (
              <View key={i} style={styles.praiseBox}>
                {praise.categories.length > 0 && (
                  <View style={styles.categoryRow}>
                    {praise.categories.map((cat) => (
                      <View key={cat} style={styles.chip}>
                        <Text style={styles.chipText}>{cat}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.praiseContent}>"{praise.content}"</Text>
                {praise.createdAt && (
                  <Text style={styles.praiseDate}>
                    {praise.createdAt.toDate().toLocaleDateString('ko-KR')}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingEmoji: { fontSize: 52 },
  loadingText: { fontSize: 16, color: AppColors.textMuted },

  scroll: { padding: 20, gap: 12, paddingBottom: 40 },

  // 헤더
  header: { alignItems: 'center', gap: 8, paddingBottom: 8 },
  sprintName: { fontSize: 22, fontWeight: '800', color: AppColors.textPrimary, letterSpacing: -0.5 },
  sprintDate: { fontSize: 13, color: AppColors.textMuted },
  revealBadge: {
    backgroundColor: AppColors.primaryMid, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  revealBadgeText: { fontSize: 15, fontWeight: '700', color: AppColors.primary },
  totalText: { fontSize: 14, color: AppColors.textMuted, textAlign: 'center' },
  totalHighlight: { fontWeight: '800', color: AppColors.primary },

  // 카드
  card: {
    backgroundColor: AppColors.white, borderRadius: 16,
    borderWidth: 1, borderColor: AppColors.borderLight, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
  },
  cardInfo: { flex: 1 },
  cardTargetName: { fontSize: 16, fontWeight: '700', color: AppColors.textPrimary },
  cardManitoText: { fontSize: 13, color: AppColors.textMuted, marginTop: 2 },
  chevron: { fontSize: 12, color: AppColors.textSecondary },

  cardBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  divider: { height: 1, backgroundColor: AppColors.borderLight },
  manitoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  manitoText: { fontSize: 14, color: AppColors.textMuted },
  manitoName: { fontWeight: '700', color: AppColors.primary },
  noPraise: { fontSize: 14, color: AppColors.textSecondary },

  praiseBox: {
    backgroundColor: AppColors.primaryLight, borderRadius: 12, padding: 14, gap: 6,
  },
  categoryRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    backgroundColor: AppColors.white, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: AppColors.primary },
  praiseContent: { fontSize: 14, color: AppColors.textPrimary, lineHeight: 21, fontStyle: 'italic' },
  praiseDate: { fontSize: 11, color: AppColors.textSecondary },
});
