import { Text } from '@/components/ui/text';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { useTeam } from '@/contexts/team-context';
import { useSprint } from '@/contexts/sprint-context';
import { ManitoCard } from '@/components/manito-card';
import { Avatar } from '@/components/avatar';
import { AlertModal } from '@/components/ui/alert-modal';
import {
  formatSprintDate,
  getLastRevealedSprint,
  getMyPair,
  ManitoPair,
  Sprint,
} from '@/lib/sprints';
import { getUserProfile, UserProfile } from '@/lib/users';
import { hasNudgedToday, recordNudge } from '@/lib/praises';

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const { myTeams, selectedTeam, selectedTeamId, setSelectedTeam } = useTeam();
  const { activeSprint, sentPraises, receivedPraises } = useSprint();

  const [myPair, setMyPair] = useState<ManitoPair | null>(null);
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [lastRevealedSprint, setLastRevealedSprint] = useState<Sprint | null>(null);
  const [nudging, setNudging] = useState(false);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message?: string; type?: 'default' | 'error' | 'success' } | null>(null);

  const stats = { sent: sentPraises.length, received: receivedPraises.length };

  useEffect(() => {
    if (!user || activeSprint === undefined) return;
    if (!activeSprint) {
      if (selectedTeamId) getLastRevealedSprint(selectedTeamId).then(setLastRevealedSprint);
      return;
    }
    getMyPair(activeSprint.id, user.uid).then(setMyPair);
  }, [activeSprint?.id, user?.uid]);

  useEffect(() => {
    if (!myPair?.targetId) { setTargetProfile(null); return; }
    getUserProfile(myPair.targetId).then(setTargetProfile);
  }, [myPair?.targetId]);

  const handleNudge = async () => {
    if (!activeSprint || !user || !myPair) return;
    const alreadyNudged = await hasNudgedToday(activeSprint.id, user.uid);
    if (alreadyNudged) {
      setAlert({ title: '오늘 이미 조른 적 있어요', message: '내일 다시 시도해주세요.' });
      return;
    }
    setNudging(true);
    try {
      await recordNudge({ sprintId: activeSprint.id, requesterId: user.uid, toUserId: myPair.targetId });
      setAlert({ title: '조르기 완료!', message: '마니또에게 칭찬을 기다리고 있다고 전달했어요.', type: 'success' });
    } catch {
      setAlert({ title: '오류', message: '조르기에 실패했습니다.', type: 'error' });
    } finally {
      setNudging(false);
    }
  };

  const isLoading = activeSprint === undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.greetingRow}>
            <Avatar name={profile?.name} size={40} />
            <View style={styles.greetingText}>
              <Text style={styles.helloText}>{profile?.name ?? '...'}</Text>
              <Text style={styles.helloSub}>오늘도 팀원을 칭찬해보세요</Text>
            </View>
          </View>
          {myTeams.length > 1 && (
            <TouchableOpacity style={styles.teamSelector} onPress={() => setShowTeamPicker(true)}>
              <Text style={styles.teamSelectorText}>{selectedTeam?.name ?? '팀 선택'}</Text>
              <Text style={styles.teamSelectorArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {isLoading && (
          <View style={styles.center}><ActivityIndicator color="#111" /></View>
        )}

        {/* 활성 스프린트 */}
        {!isLoading && activeSprint?.status === 'ACTIVE' && (
          <View style={styles.section}>
            <View style={styles.sprintHeader}>
              <View style={styles.sprintInfo}>
                <Text style={styles.sprintName}>{activeSprint.name}</Text>
                <Text style={styles.sprintDate}>
                  {formatSprintDate(activeSprint.startDate)} – {formatSprintDate(activeSprint.endDate)}
                </Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>진행 중</Text>
              </View>
            </View>

            <ManitoCard target={targetProfile} />

            <View style={styles.statsRow}>
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => router.push({ pathname: '/(tabs)/praises', params: { tab: 'sent' } })}
              >
                <Text style={styles.statNumber}>{stats.sent}</Text>
                <Text style={styles.statLabel}>보낸 칭찬</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => router.push({ pathname: '/(tabs)/praises', params: { tab: 'received' } })}
              >
                <Text style={styles.statNumber}>{stats.received}</Text>
                <Text style={styles.statLabel}>받은 칭찬</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/praise/write')}>
              <Text style={styles.primaryButtonText}>칭찬 쓰기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleNudge}
              disabled={nudging}
            >
              {nudging
                ? <ActivityIndicator size="small" color="#111" />
                : <Text style={styles.secondaryButtonText}>마니또에게 칭찬 조르기</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* 스프린트 공개됨 */}
        {!isLoading && activeSprint?.status === 'REVEALED' && (
          <View style={styles.section}>
            <View style={styles.sprintHeader}>
              <View style={styles.sprintInfo}>
                <Text style={styles.sprintName}>{activeSprint.name}</Text>
                <Text style={styles.sprintDate}>
                  {formatSprintDate(activeSprint.startDate)} – {formatSprintDate(activeSprint.endDate)}
                </Text>
              </View>
              <View style={[styles.badge, styles.badgeOutline]}>
                <Text style={[styles.badgeText, styles.badgeOutlineText]}>공개됨</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.revealedBanner} onPress={() => router.push(`/reveal/${activeSprint.id}`)} activeOpacity={0.7}>
              <Image source={require('@/assets/images/whale-letter.png')} style={styles.revealedWhale} resizeMode="contain" />
              <View style={styles.revealedBannerContent}>
                <Text style={styles.revealedBannerTitle}>마니또가 밝혀졌어요</Text>
                <View style={styles.revealedHintRow}>
                  <Text style={styles.revealedHintText}>탭해서 확인하기</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.statsRow}>
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => router.push({ pathname: '/(tabs)/praises', params: { tab: 'sent' } })}
              >
                <Text style={styles.statNumber}>{stats.sent}</Text>
                <Text style={styles.statLabel}>보낸 칭찬</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => router.push({ pathname: '/(tabs)/praises', params: { tab: 'received' } })}
              >
                <Text style={styles.statNumber}>{stats.received}</Text>
                <Text style={styles.statLabel}>받은 칭찬</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 스프린트 없음 */}
        {!isLoading && !activeSprint && (
          <View style={styles.section}>
            {lastRevealedSprint ? (
              <TouchableOpacity
                style={styles.revealedBanner}
                onPress={() => router.push(`/reveal/${lastRevealedSprint.id}`)}
                activeOpacity={0.7}
              >
                <Image source={require('@/assets/images/whale-letter.png')} style={styles.revealedWhale} resizeMode="contain" />
                <View style={styles.revealedBannerContent}>
                  <Text style={styles.revealedBannerTitle}>마니또가 공개됐어요</Text>
                  <View style={styles.revealedHintRow}>
                    <Text style={styles.revealedHintText}>탭해서 확인하기</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>진행 중인 스프린트가 없어요</Text>
                <Text style={styles.emptySub}>팀장님이 새 스프린트를 시작하면 알려드릴게요</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 커스텀 알럿 */}
      <AlertModal
        visible={!!alert}
        title={alert?.title ?? ''}
        message={alert?.message}
        type={alert?.type}
        onClose={() => setAlert(null)}
      />

      {/* 팀 선택 모달 */}
      <Modal visible={showTeamPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} onPress={() => setShowTeamPicker(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>팀 선택</Text>
            <View style={styles.pickerDivider} />
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

const W = {
  bg: '#fafafc',          // 배경
  surface: '#FFFFFF',     // 카드 흰색
  surfaceWarm: '#EEF4FC', // 연한 블루 서피스
  text: '#1A2F4A',        // 딥 네이비 텍스트
  muted: '#8A9BB8',       // 뮤트 블루 그레이
  border: '#DCE8F8',      // 연한 블루 테두리
  accent: '#0071e3',      // 버튼용 블루
  accentLight: '#E8F1FB', // 연한 포인트
  dark: '#0066cc',        // 뱃지용 진한 블루
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: W.bg },
  scroll: { paddingBottom: 40 },

  // 헤더
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, gap: 14 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greetingText: { gap: 2 },
  helloText: { fontSize: 16, fontWeight: '700', color: W.text, letterSpacing: -0.3 },
  helloSub: { fontSize: 13, color: W.muted },
  teamSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: W.border,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: W.surface,
  },
  teamSelectorText: { fontSize: 13, fontWeight: '500', color: W.text },
  teamSelectorArrow: { fontSize: 16, color: W.muted, lineHeight: 18 },

  divider: { height: 1, backgroundColor: W.border },

  center: { paddingVertical: 60, alignItems: 'center' },

  section: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },

  // 스프린트 헤더
  sprintHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  sprintInfo: { gap: 3 },
  sprintName: { fontSize: 15, fontWeight: '700', color: W.text, letterSpacing: -0.3 },
  sprintDate: { fontSize: 12, color: W.muted },

  badge: {
    backgroundColor: W.dark, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#fff', letterSpacing: 0.2 },
  badgeOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: W.border },
  badgeOutlineText: { color: W.muted },

  // 통계
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, backgroundColor: W.surface, borderRadius: 10,
    borderWidth: 1, borderColor: W.border,
    paddingVertical: 18, alignItems: 'center', gap: 4,
  },
  statNumber: { fontSize: 30, fontWeight: '800', color: W.accent, letterSpacing: -1 },
  statLabel: { fontSize: 12, color: W.muted, fontWeight: '500' },

  // 버튼
  primaryButton: {
    backgroundColor: W.accent, borderRadius: 10,
    height: 50, alignItems: 'center', justifyContent: 'center',
  },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.1 },
  secondaryButton: {
    borderRadius: 10, height: 46,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: W.border,
    backgroundColor: W.surface,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '500', color: W.muted },

  // 공개 배너
  revealedBanner: {
    flexDirection: 'row', alignItems: 'center',
    height: 196, borderRadius: 12, paddingHorizontal: 20,
    borderWidth: 1, borderColor: W.border,
    backgroundColor: W.surface,
  },
  revealedWhale: { width: 170, height: 170, marginRight: 4 },
  revealedBannerContent: { flex: 1, gap: 10 },
  revealedBannerTitle: { fontSize: 16, fontWeight: '700', color: W.text, letterSpacing: -0.3 },
  revealedHintRow: {
    borderWidth: 1,
    borderColor: 'rgba(0,113,227,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  revealedHintText: { fontSize: 12, color: W.accent, letterSpacing: 0.2 },

  // 빈 상태
  emptyCard: {
    borderRadius: 10, paddingVertical: 48, paddingHorizontal: 24,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: W.border,
    backgroundColor: W.surface,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: W.text },
  emptySub: { fontSize: 13, color: W.muted, textAlign: 'center', lineHeight: 19 },

  // 팀 선택 모달
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: W.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingTop: 20, paddingBottom: 36, paddingHorizontal: 20, gap: 0,
  },
  pickerTitle: { fontSize: 14, fontWeight: '700', color: W.text, marginBottom: 14, letterSpacing: 0.5, textTransform: 'uppercase' },
  pickerDivider: { height: 1, backgroundColor: W.border, marginBottom: 8 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 8, borderRadius: 8,
  },
  pickerItemActive: { backgroundColor: W.accentLight },
  pickerItemText: { flex: 1, fontSize: 15, color: W.text, fontWeight: '400' },
  pickerItemTextActive: { color: W.accent, fontWeight: '700' },
  checkmark: { fontSize: 14, color: W.accent, fontWeight: '700' },
});
