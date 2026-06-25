import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { useTeam } from '@/contexts/team-context';
import { ManitoCard } from '@/components/manito-card';
import { Avatar } from '@/components/avatar';
import { AppColors } from '@/constants/theme';
import {
  formatSprintDate,
  getLastRevealedSprint,
  getMyPair,
  ManitoPair,
  Sprint,
  subscribeToActiveSprint,
} from '@/lib/sprints';
import { getUserProfile, UserProfile } from '@/lib/users';
import {
  getPraiseStats,
  hasNudgedToday,
  recordNudge,
} from '@/lib/praises';

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const { myTeams, selectedTeam, selectedTeamId, setSelectedTeam } = useTeam();

  const [activeSprint, setActiveSprint] = useState<Sprint | null | undefined>(undefined);
  const [myPair, setMyPair] = useState<ManitoPair | null>(null);
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [lastRevealedSprint, setLastRevealedSprint] = useState<Sprint | null>(null);
  const [stats, setStats] = useState({ sent: 0, received: 0 });
  const [nudging, setNudging] = useState(false);
  const [showTeamPicker, setShowTeamPicker] = useState(false);

  // 팀 변경 시 스프린트 구독
  useEffect(() => {
    if (!selectedTeamId) { setActiveSprint(null); return; }
    setActiveSprint(undefined);
    setMyPair(null);
    setTargetProfile(null);
    setLastRevealedSprint(null);
    setStats({ sent: 0, received: 0 });
    const unsub = subscribeToActiveSprint(selectedTeamId, (sprint) => {
      setActiveSprint(sprint);
    });
    return unsub;
  }, [selectedTeamId]);

  // 활성 스프린트 변경 시 데이터 로드
  useEffect(() => {
    if (!user || activeSprint === undefined) return;
    if (!activeSprint) {
      if (selectedTeamId) getLastRevealedSprint(selectedTeamId).then(setLastRevealedSprint);
      return;
    }
    getMyPair(activeSprint.id, user.uid).then(setMyPair);
    getPraiseStats(activeSprint.id, user.uid).then(setStats);
  }, [activeSprint?.id, user?.uid]);

  // 마니또 대상 프로필
  useEffect(() => {
    if (!myPair?.targetId) { setTargetProfile(null); return; }
    getUserProfile(myPair.targetId).then(setTargetProfile);
  }, [myPair?.targetId]);

  const handleNudge = async () => {
    if (!activeSprint || !user || !myPair) return;
    const alreadyNudged = await hasNudgedToday(activeSprint.id, user.uid);
    if (alreadyNudged) {
      Alert.alert('오늘 이미 조른 적 있어요 😅', '내일 다시 시도해주세요!');
      return;
    }
    setNudging(true);
    try {
      await recordNudge({ sprintId: activeSprint.id, requesterId: user.uid, toUserId: myPair.targetId });
      Alert.alert('조르기 완료! 🥺', '마니또에게 칭찬을 기다리고 있다고 전달했어요.');
    } catch {
      Alert.alert('오류', '조르기에 실패했습니다.');
    } finally {
      setNudging(false);
    }
  };

  const isLoading = activeSprint === undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 인사 + 팀 선택 헤더 */}
        <View style={styles.header}>
          <View style={styles.greetingRow}>
            <Avatar name={profile?.name} size={44} />
            <View>
              <Text style={styles.helloText}>안녕하세요, {profile?.name ?? '...'}님 👋</Text>
              <Text style={styles.helloSub}>오늘도 팀원을 칭찬해보세요!</Text>
            </View>
          </View>
          {myTeams.length > 1 && (
            <TouchableOpacity style={styles.teamSelector} onPress={() => setShowTeamPicker(true)}>
              <Text style={styles.teamSelectorText}>{selectedTeam?.name ?? '팀 선택'}</Text>
              <Text style={styles.teamSelectorArrow}>▾</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading && (
          <View style={styles.center}><ActivityIndicator color={AppColors.primary} /></View>
        )}

        {/* 활성 스프린트 있음 */}
        {!isLoading && activeSprint && (
          <View style={styles.sprintSection}>
            {/* 스프린트 헤더 */}
            <View style={styles.sprintHeader}>
              <View style={styles.sprintInfo}>
                <Text style={styles.sprintName}>{activeSprint.name}</Text>
                <Text style={styles.sprintDate}>
                  {formatSprintDate(activeSprint.startDate)} ~ {formatSprintDate(activeSprint.endDate)}
                </Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>진행 중</Text>
              </View>
            </View>

            {/* 마니또 카드 */}
            <ManitoCard target={targetProfile} />

            {/* 칭찬 통계 */}
            <View style={styles.statsRow}>
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => router.push('/(tabs)/praises')}
              >
                <Text style={styles.statNumber}>{stats.sent}</Text>
                <Text style={styles.statLabel}>내가 보낸 칭찬</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => router.push({ pathname: '/(tabs)/praises', params: { tab: 'received' } })}
              >
                <Text style={styles.statNumber}>{stats.received}</Text>
                <Text style={styles.statLabel}>내가 받은 칭찬</Text>
              </TouchableOpacity>
            </View>

            {/* CTA 버튼 */}
            <TouchableOpacity style={styles.praiseButton} onPress={() => router.push('/praise/write')}>
              <Text style={styles.praiseButtonText}>✍️  칭찬 쓰기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nudgeButton}
              onPress={handleNudge}
              disabled={nudging}
            >
              {nudging
                ? <ActivityIndicator size="small" color={AppColors.primary} />
                : <Text style={styles.nudgeButtonText}>🥺  마니또에게 칭찬 조르기</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* 스프린트 없음 */}
        {!isLoading && !activeSprint && (
          <View style={styles.emptySection}>
            {lastRevealedSprint ? (
              <TouchableOpacity
                style={styles.revealedCard}
                onPress={() => router.push(`/reveal/${lastRevealedSprint.id}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.revealedEmoji}>🎊</Text>
                <View style={styles.revealedInfo}>
                  <Text style={styles.revealedTitle}>마니또가 공개됐어요!</Text>
                  <Text style={styles.revealedSub}>{lastRevealedSprint.name} 결과 보러가기 →</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.noSprintCard}>
                <Text style={styles.noSprintEmoji}>😴</Text>
                <Text style={styles.noSprintTitle}>진행 중인 스프린트가 없어요</Text>
                <Text style={styles.noSprintSub}>팀장님이 새 스프린트를 시작하면 알려드릴게요!</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 12 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  helloText: { fontSize: 17, fontWeight: '700', color: AppColors.textPrimary, letterSpacing: -0.3 },
  helloSub: { fontSize: 13, color: AppColors.textMuted, marginTop: 2 },
  teamSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', backgroundColor: AppColors.primaryLight,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  teamSelectorText: { fontSize: 14, fontWeight: '600', color: AppColors.primary },
  teamSelectorArrow: { fontSize: 12, color: AppColors.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  sprintSection: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  sprintHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sprintInfo: { gap: 2 },
  sprintName: { fontSize: 16, fontWeight: '700', color: AppColors.textPrimary, letterSpacing: -0.3 },
  sprintDate: { fontSize: 12, color: AppColors.textMuted },
  activeBadge: { backgroundColor: '#dcfce7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  activeBadgeText: { fontSize: 12, fontWeight: '600', color: '#16a34a' },

  // 통계
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: AppColors.white, borderRadius: 14,
    borderWidth: 1, borderColor: AppColors.borderLight,
    padding: 16, alignItems: 'center', gap: 4,
  },
  statNumber: { fontSize: 28, fontWeight: '800', color: AppColors.primary, letterSpacing: -1 },
  statLabel: { fontSize: 12, color: AppColors.textMuted, fontWeight: '500' },

  // CTA
  praiseButton: {
    backgroundColor: AppColors.primary, borderRadius: 12,
    height: 50, alignItems: 'center', justifyContent: 'center',
  },
  praiseButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  nudgeButton: {
    borderRadius: 12, height: 46,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: AppColors.border,
    backgroundColor: AppColors.white,
  },
  nudgeButtonText: { fontSize: 15, fontWeight: '600', color: AppColors.textMuted },

  // 빈 상태
  emptySection: { paddingHorizontal: 20, paddingTop: 8 },
  revealedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: AppColors.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: AppColors.borderLight,
  },
  revealedEmoji: { fontSize: 36 },
  revealedInfo: { flex: 1, gap: 4 },
  revealedTitle: { fontSize: 16, fontWeight: '700', color: AppColors.textPrimary },
  revealedSub: { fontSize: 13, color: AppColors.textMuted },
  noSprintCard: {
    backgroundColor: AppColors.white, borderRadius: 16, padding: 32,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: AppColors.borderLight,
  },
  noSprintEmoji: { fontSize: 48, marginBottom: 4 },
  noSprintTitle: { fontSize: 16, fontWeight: '600', color: AppColors.textPrimary },
  noSprintSub: { fontSize: 13, color: AppColors.textMuted, textAlign: 'center' },

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
