import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const { myTeams, selectedTeam, selectedTeamId, setSelectedTeam } = useTeam();

  const [activeSprint, setActiveSprint] = useState<Sprint | null | undefined>(undefined); // undefined = 로딩
  const [myPair, setMyPair] = useState<ManitoPair | null>(null);
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [lastRevealedSprint, setLastRevealedSprint] = useState<Sprint | null>(null);
  const [showTeamPicker, setShowTeamPicker] = useState(false);

  // 팀 변경 시 스프린트 구독
  useEffect(() => {
    if (!selectedTeamId) { setActiveSprint(null); return; }

    setActiveSprint(undefined); // 로딩 초기화
    setMyPair(null);
    setTargetProfile(null);
    setLastRevealedSprint(null);

    const unsub = subscribeToActiveSprint(selectedTeamId, (sprint) => {
      setActiveSprint(sprint);
    });
    return unsub;
  }, [selectedTeamId]);

  // 활성 스프린트 변경 시 마니또 쌍 조회
  useEffect(() => {
    if (!user || activeSprint === undefined) return;

    if (!activeSprint) {
      // 직전 공개 스프린트 조회
      if (selectedTeamId) {
        getLastRevealedSprint(selectedTeamId).then(setLastRevealedSprint);
      }
      return;
    }

    getMyPair(activeSprint.id, user.uid).then(setMyPair);
  }, [activeSprint, user?.uid]);

  // 마니또 대상 프로필 조회
  useEffect(() => {
    if (!myPair?.targetId) { setTargetProfile(null); return; }
    getUserProfile(myPair.targetId).then(setTargetProfile);
  }, [myPair?.targetId]);

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

          {/* 팀 선택 (2개 이상일 때만 표시) */}
          {myTeams.length > 1 && (
            <TouchableOpacity style={styles.teamSelector} onPress={() => setShowTeamPicker(true)}>
              <Text style={styles.teamSelectorText}>{selectedTeam?.name ?? '팀 선택'}</Text>
              <Text style={styles.teamSelectorArrow}>▾</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 로딩 */}
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={AppColors.primary} />
          </View>
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

            {/* CTA 버튼 */}
            <TouchableOpacity
              style={styles.praiseButton}
              onPress={() => router.push('/praise/write')}
            >
              <Text style={styles.praiseButtonText}>✍️  칭찬 쓰기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 스프린트 없음 */}
        {!isLoading && !activeSprint && (
          <View style={styles.emptySection}>
            {lastRevealedSprint ? (
              /* 직전 공개 스프린트 카드 */
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
              /* 스프린트 완전 없음 */
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

  // 헤더
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 12 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  helloText: { fontSize: 17, fontWeight: '700', color: AppColors.textPrimary, letterSpacing: -0.3 },
  helloSub: { fontSize: 13, color: AppColors.textMuted, marginTop: 2 },
  teamSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: AppColors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  teamSelectorText: { fontSize: 14, fontWeight: '600', color: AppColors.primary },
  teamSelectorArrow: { fontSize: 12, color: AppColors.primary },

  // 로딩
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },

  // 스프린트 섹션
  sprintSection: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  sprintHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sprintInfo: { gap: 2 },
  sprintName: { fontSize: 16, fontWeight: '700', color: AppColors.textPrimary, letterSpacing: -0.3 },
  sprintDate: { fontSize: 12, color: AppColors.textMuted },
  activeBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  activeBadgeText: { fontSize: 12, fontWeight: '600', color: '#16a34a' },

  // 칭찬 쓰기 버튼
  praiseButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  praiseButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // 빈 상태
  emptySection: { paddingHorizontal: 20, paddingTop: 16 },
  revealedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: AppColors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  revealedEmoji: { fontSize: 36 },
  revealedInfo: { flex: 1, gap: 4 },
  revealedTitle: { fontSize: 16, fontWeight: '700', color: AppColors.textPrimary },
  revealedSub: { fontSize: 13, color: AppColors.textMuted },
  noSprintCard: {
    backgroundColor: AppColors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  noSprintEmoji: { fontSize: 48, marginBottom: 4 },
  noSprintTitle: { fontSize: 16, fontWeight: '600', color: AppColors.textPrimary },
  noSprintSub: { fontSize: 13, color: AppColors.textMuted, textAlign: 'center' },

  // 팀 선택 모달
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 36,
    paddingHorizontal: 20,
    gap: 4,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: AppColors.textPrimary, marginBottom: 8 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  pickerItemActive: { backgroundColor: AppColors.primaryLight },
  pickerItemText: { flex: 1, fontSize: 15, color: AppColors.textPrimary, fontWeight: '500' },
  pickerItemTextActive: { color: AppColors.primary, fontWeight: '700' },
  checkmark: { fontSize: 16, color: AppColors.primary, fontWeight: '700' },
});
