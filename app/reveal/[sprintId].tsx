import { Text } from '@/components/ui/text';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfettiCannon from 'react-native-confetti-cannon';

import { getRevealData, RevealData, RevealPair } from '@/lib/sprints';
import { Avatar } from '@/components/avatar';
import { AppColors } from '@/constants/theme';

function buildChain(pairs: RevealPair[]): RevealPair[] {
  if (pairs.length === 0) return pairs;
  const map = new Map(pairs.map((p) => [p.manitoId, p]));
  const visited = new Set<string>();
  const chain: RevealPair[] = [pairs[0]];
  visited.add(pairs[0].manitoId);
  let current = pairs[0];
  for (let i = 1; i < pairs.length; i++) {
    const next = map.get(current.targetId);
    if (!next || visited.has(next.manitoId)) break;
    chain.push(next);
    visited.add(next.manitoId);
    current = next;
  }
  return chain;
}

export default function RevealScreen() {
  const { sprintId } = useLocalSearchParams<{ sprintId: string }>();
  const [data, setData] = useState<RevealData | null>(null);
  const [loading, setLoading] = useState(true);
  const confettiRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    if (!sprintId) return;
    getRevealData(sprintId)
      .then((d) => {
        setData(d);
        setLoading(false);
        if (d) setTimeout(() => confettiRef.current?.start(), 400);
      })
      .catch(() => setLoading(false));
  }, [sprintId]);

  const chain = data ? buildChain(data.pairs) : [];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: '마니또 공개',
          headerShown: true,
          headerTintColor: AppColors.primary,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#fafafc' },
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>마니또 공개 중...</Text>
          <ActivityIndicator color={AppColors.primary} style={{ marginTop: 12 }} />
        </View>
      ) : !data ? (
        <View style={styles.center}>
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
<Text style={styles.totalText}>
                <Text style={styles.totalHighlight}>{data.pairs.length}명</Text>이 참여하여{' '}
                총 <Text style={styles.totalHighlight}>{data.totalPraises}개</Text>의 칭찬이 오갔어요
              </Text>
            </View>

            {/* 꼬리물기 체인 */}
            {chain.map((pair, index) => (
              <View key={pair.manitoId}>
                <ChainCard pair={pair} index={index} />
                {index < chain.length - 1 && (
                  <View style={styles.connector}>
                    <View style={styles.connectorLine} />
                    <View style={styles.connectorArrow} />
                    <View style={styles.connectorLine} />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function ChainCard({ pair, index }: { pair: RevealPair; index: number }) {
  return (
    <View style={styles.card}>
      {/* 마니또 헤더 */}
      <View style={styles.cardHeader}>
        <Avatar name={pair.manitoName} size={44} />
        <View style={styles.cardHeaderText}>
          <Text style={styles.manitoName}>{pair.manitoName}</Text>
          <Text style={styles.manitoSub}>의 비밀 칭찬</Text>
        </View>
        <View style={styles.indexBadge}>
          <Text style={styles.indexBadgeText}>{index + 1}</Text>
        </View>
      </View>

      {/* 수신자 */}
      <View style={styles.targetRow}>
        <Text style={styles.targetLabel}>To.</Text>
        <Avatar name={pair.targetName} size={28} />
        <Text style={styles.targetName}>{pair.targetName}</Text>
      </View>

      {/* 칭찬 내용 */}
      {pair.praises.length === 0 ? (
        <View style={styles.noPraiseBox}>
          <Text style={styles.noPraiseText}>작성된 칭찬이 없어요</Text>
        </View>
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
            <Text style={styles.praiseContent}>{praise.content}</Text>
            {praise.createdAt && (
              <Text style={styles.praiseDate}>
                {praise.createdAt.toDate().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: AppColors.textMuted },
  scroll: { padding: 20, paddingBottom: 48 },

  // 헤더
  header: { alignItems: 'center', gap: 8, paddingBottom: 24 },
  sprintName: { fontSize: 20, fontWeight: '800', color: AppColors.textPrimary, letterSpacing: -0.5 },
  sprintDate: { fontSize: 13, color: AppColors.textMuted },
totalText: { fontSize: 14, color: AppColors.textMuted, textAlign: 'center' },
  totalHighlight: { fontWeight: '800', color: AppColors.primary },

  // 카드
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    padding: 16,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardHeaderText: { flex: 1 },
  manitoName: { fontSize: 16, fontWeight: '700', color: AppColors.textPrimary, letterSpacing: -0.3 },
  manitoSub: { fontSize: 12, color: AppColors.textMuted, marginTop: 1 },
  indexBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: AppColors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  indexBadgeText: { fontSize: 12, fontWeight: '700', color: AppColors.primary },

  // 수신자
  targetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: AppColors.primaryLight,
    borderRadius: 10, padding: 10,
  },
  targetLabel: { fontSize: 12, fontWeight: '700', color: AppColors.primary },
  targetName: { fontSize: 14, fontWeight: '600', color: AppColors.textPrimary },

  // 칭찬
  praiseBox: { gap: 6 },
  noPraiseBox: { paddingVertical: 4 },
  noPraiseText: { fontSize: 13, color: AppColors.textSecondary },
  categoryRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    backgroundColor: AppColors.primaryLight, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: AppColors.primary },
  praiseContent: { fontSize: 14, color: AppColors.textPrimary, lineHeight: 22 },
  praiseDate: { fontSize: 11, color: AppColors.textSecondary },

  // 연결선
  connector: { alignItems: 'center', paddingVertical: 2 },
  connectorLine: { width: 2, height: 14, backgroundColor: AppColors.borderLight },
  connectorArrow: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: AppColors.borderLight,
  },
});
