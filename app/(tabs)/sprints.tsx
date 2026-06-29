import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { useTeam } from '@/contexts/team-context';
import { getTeamMembersWithProfiles } from '@/lib/teams';
import {
  checkRevealEligibility,
  createSprint,
  deleteSprint,
  formatSprintDate,
  getPastSprintsPaged,
  getSprintParticipants,
  revealSprint,
  Sprint,
  subscribeToActiveSprint,
} from '@/lib/sprints';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { getSprintPraiseCount } from '@/lib/praises';
import { getUserProfile } from '@/lib/users';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/avatar';
import { AppColors } from '@/constants/theme';
import { AlertModal } from '@/components/ui/alert-modal';

export default function SprintsScreen() {
  const { user } = useAuth();
  const { myTeams, selectedTeam, selectedTeamId, setSelectedTeam } = useTeam();

  const myMembership = myTeams.find((t) => t.id === selectedTeamId);
  const isLeader = myMembership?.role === 'LEADER';

  const [activeSprint, setActiveSprint] = useState<Sprint | null | undefined>(undefined);
  const [pastSprints, setPastSprints] = useState<Sprint[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingPast, setLoadingPast] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [praiseCounts, setPraiseCounts] = useState<Record<string, number>>({});
  const [participantsModal, setParticipantsModal] = useState<{ sprint: Sprint; members: { userId: string; name: string; bio?: string }[] } | null>(null);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message?: string; type?: 'default' | 'error' | 'success'; buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }> } | null>(null);

  // 스프린트 생성 폼
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d;
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [creatingSprint, setCreatingSprint] = useState(false);
  const [sprintError, setSprintError] = useState('');

  // 활성 스프린트 실시간 구독 — ACTIVE만 "진행 중"으로 취급
  useEffect(() => {
    if (!selectedTeamId) { setActiveSprint(null); setLoadingActive(false); return; }
    setLoadingActive(true);
    setActiveSprint(undefined);
    return subscribeToActiveSprint(selectedTeamId, (s) => {
      const active = s?.status === 'ACTIVE' ? s : null;
      setActiveSprint(active);
      setLoadingActive(false);
    });
  }, [selectedTeamId]);

  // 활성 스프린트가 사라지면(공개/삭제) 지난 목록 첫 페이지 리셋
  useEffect(() => {
    if (activeSprint !== null || !selectedTeamId) return;
    getPastSprintsPaged(selectedTeamId).then(({ sprints, lastDoc: ld, hasMore: hm }) => {
      setPastSprints(sprints);
      setLastDoc(ld);
      setHasMore(hm);
    });
  }, [activeSprint]);

  // 지난 스프린트 첫 페이지 로드
  useEffect(() => {
    if (!selectedTeamId) { setPastSprints([]); setHasMore(false); setLastDoc(null); return; }
    setLoadingPast(true);
    setPastSprints([]);
    setLastDoc(null);
    getPastSprintsPaged(selectedTeamId).then(({ sprints, lastDoc: ld, hasMore: hm }) => {
      setPastSprints(sprints);
      setLastDoc(ld);
      setHasMore(hm);
      setLoadingPast(false);
    });
  }, [selectedTeamId]);

  const loadMore = async () => {
    if (!selectedTeamId || !hasMore || loadingPast || !lastDoc) return;
    setLoadingPast(true);
    const { sprints, lastDoc: ld, hasMore: hm } = await getPastSprintsPaged(selectedTeamId, lastDoc);
    setPastSprints((prev) => {
      const ids = new Set(prev.map((s) => s.id));
      return [...prev, ...sprints.filter((s) => !ids.has(s.id))];
    });
    setLastDoc(ld);
    setHasMore(hm);
    setLoadingPast(false);
  };


  // 새로 로드된 지난 스프린트 칭찬 수 조회
  useEffect(() => {
    pastSprints.forEach(async (s) => {
      if (praiseCounts[s.id] !== undefined) return;
      const count = await getSprintPraiseCount(s.id);
      setPraiseCounts((prev) => ({ ...prev, [s.id]: count }));
    });
  }, [pastSprints.map((s) => s.id).join(',')]);

  // 진행 중 스프린트 칭찬 수는 탭 포커스마다 갱신
  useFocusEffect(
    useCallback(() => {
      if (!activeSprint) return;
      getSprintPraiseCount(activeSprint.id).then((count) =>
        setPraiseCounts((prev) => ({ ...prev, [activeSprint.id]: count })),
      );
    }, [activeSprint?.id]),
  );

  const handleOpenParticipants = async (sprint: Sprint) => {
    setLoadingParticipants(true);
    setParticipantsModal({ sprint, members: [] });
    const members = await getSprintParticipants(sprint.id);
    setParticipantsModal({ sprint, members });
    setLoadingParticipants(false);
  };

  const handleReveal = async () => {
    if (!activeSprint) return;
    setRevealing(true);
    try {
      const { canReveal, unpraised } = await checkRevealEligibility(activeSprint.id);
      if (!canReveal) {
        const names = await Promise.all(
          unpraised.map(async (uid) => {
            const p = await getUserProfile(uid);
            return p?.name ?? uid;
          }),
        );
        setAlert({
          title: '공개 불가 🚫',
          message: `아직 칭찬을 작성하지 않은 팀원이 있어요:\n\n${names.map((n) => `• ${n}`).join('\n')}\n\n모든 팀원이 칭찬을 작성해야 공개할 수 있습니다.`,
          type: 'error',
        });
        return;
      }
      setAlert({
        title: '마니또 공개',
        message: '스프린트를 공개하면 모든 마니또 관계가 공개됩니다. 계속할까요?',
        buttons: [
          { text: '취소', style: 'cancel' },
          {
            text: '공개하기 🎉',
            style: 'default',
            onPress: async () => {
              try {
                await revealSprint(activeSprint.id);
                router.push(`/reveal/${activeSprint.id}`);
              } catch {
                setAlert({ title: '오류', message: '공개 처리 중 오류가 발생했습니다.', type: 'error' });
              }
            },
          },
        ],
      });
    } catch {
      setAlert({ title: '오류', message: '공개 가능 여부 확인 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setRevealing(false);
    }
  };

  const handleDeleteSprint = () => {
    if (!activeSprint) return;
    setAlert({
      title: '스프린트를 삭제할까요?',
      message: `'${activeSprint.name}'을 삭제하면 모든 칭찬 기록이 영구적으로 사라져요. 이 작업은 되돌릴 수 없어요.`,
      buttons: [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteSprint(activeSprint.id);
            } catch {
              setAlert({ title: '오류', message: '스프린트 삭제에 실패했습니다.', type: 'error' });
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    });
  };

  const handleCreateSprint = async () => {
    setSprintError('');
    if (!sprintName.trim()) { setSprintError('스프린트 이름을 입력해주세요.'); return; }
    if (endDate <= startDate) { setSprintError('종료일은 시작일 이후여야 합니다.'); return; }

    setCreatingSprint(true);
    try {
      const currentMembers = await getTeamMembersWithProfiles(selectedTeamId!);
      const memberIds = currentMembers.map((m) => m.userId);
      await createSprint({
        teamId: selectedTeamId!,
        name: sprintName.trim(),
        startDate,
        endDate,
        memberIds,
        createdBy: user!.uid,
      });
      setSprintName('');
      setShowCreateForm(false);
      setSelectedTeam(selectedTeamId!);
      router.replace('/(tabs)');
    } catch (e) {
      setSprintError(e instanceof Error ? e.message : '스프린트 생성에 실패했습니다.');
    } finally {
      setCreatingSprint(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>스프린트</Text>
        <View style={styles.headerRight}>
          {isLeader && !activeSprint && !showCreateForm && (
            <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreateForm(true)}>
              <Text style={styles.newBtnText}>+ 새 스프린트</Text>
            </TouchableOpacity>
          )}
          {myTeams.length > 1 && (
            <TouchableOpacity style={styles.teamSelector} onPress={() => setShowTeamPicker(true)}>
              <Text style={styles.teamSelectorText}>{selectedTeam?.name ?? '팀 선택'}</Text>
              <Text style={styles.teamSelectorArrow}>▾</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loadingActive ? (
        <View style={styles.center}>
          <ActivityIndicator color={AppColors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* 스프린트 생성 폼 (리더 전용) */}
          {showCreateForm && (
            <View style={styles.createForm}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>새 스프린트</Text>
                <TouchableOpacity onPress={() => { setShowCreateForm(false); setSprintError(''); setSprintName(''); }}>
                  <Text style={styles.cancelText}>취소</Text>
                </TouchableOpacity>
              </View>
              <Input
                label="스프린트 이름"
                placeholder="예: 2026년 7월 1주차"
                value={sprintName}
                onChangeText={setSprintName}
                maxLength={30}
              />
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>시작일</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
                  <Text style={styles.dateValue}>{startDate.toLocaleDateString('ko-KR')}</Text>
                </TouchableOpacity>
              </View>
              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_: DateTimePickerEvent, d?: Date) => {
                    setShowStartPicker(Platform.OS === 'ios');
                    if (d) setStartDate(d);
                  }}
                />
              )}
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>종료일</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
                  <Text style={styles.dateValue}>{endDate.toLocaleDateString('ko-KR')}</Text>
                </TouchableOpacity>
              </View>
              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  minimumDate={startDate}
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_: DateTimePickerEvent, d?: Date) => {
                    setShowEndPicker(Platform.OS === 'ios');
                    if (d) setEndDate(d);
                  }}
                />
              )}
              {sprintError ? <Text style={styles.errorText}>{sprintError}</Text> : null}
              <Button title="스프린트 시작하기" onPress={handleCreateSprint} loading={creatingSprint} />
            </View>
          )}

          {/* 진행 중 스프린트 */}
          {activeSprint && (
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionLabel}>진행 중</Text>
                {isLeader && (
                  <View style={styles.leaderActions}>
                    <TouchableOpacity style={styles.deleteSprintBtn} onPress={handleDeleteSprint} disabled={deleting}>
                      {deleting
                        ? <ActivityIndicator size={14} color={AppColors.error} />
                        : <Text style={styles.deleteSprintBtnText}>삭제</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.revealBtn} onPress={handleReveal} disabled={revealing}>
                      {revealing
                        ? <ActivityIndicator size={14} color={AppColors.white} />
                        : <Text style={styles.revealBtnText}>공개하기 🎉</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <View style={styles.activeCard}>
                <View style={styles.sprintInfo}>
                  <Text style={styles.sprintName}>{activeSprint.name}</Text>
                  <Text style={styles.sprintDate}>
                    {formatSprintDate(activeSprint.startDate)} ~ {formatSprintDate(activeSprint.endDate)}
                  </Text>
                </View>
                <View style={styles.pastBadgeRow}>
                  {praiseCounts[activeSprint.id] !== undefined && (
                    <TouchableOpacity
                      style={styles.praiseBadge}
                      onPress={() => handleOpenParticipants(activeSprint)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.praiseBadgeText}>💌 {praiseCounts[activeSprint.id]}</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>진행 중</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 지난 스프린트 */}
          {pastSprints.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>지난 스프린트</Text>
              <View style={styles.pastList}>
                {pastSprints.map((s, i) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.pastItem, i < pastSprints.length - 1 && styles.pastItemBorder]}
                    onPress={() => router.push(`/reveal/${s.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sprintInfo}>
                      <Text style={styles.sprintName}>{s.name}</Text>
                      <Text style={styles.sprintDate}>
                        {formatSprintDate(s.startDate)} ~ {formatSprintDate(s.endDate)}
                      </Text>
                    </View>
                    <View style={styles.pastBadgeRow}>
                      {praiseCounts[s.id] !== undefined && (
                        <TouchableOpacity
                          style={styles.praiseBadge}
                          onPress={(e) => { e.stopPropagation?.(); handleOpenParticipants(s); }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.praiseBadgeText}>💌 {praiseCounts[s.id]}</Text>
                        </TouchableOpacity>
                      )}
                      <View style={[
                        styles.pastBadge,
                        s.status === 'REVEALED' ? styles.pastBadgeRevealed : styles.pastBadgeClosed,
                      ]}>
                        <Text style={[
                          styles.pastBadgeText,
                          s.status === 'REVEALED' ? styles.pastBadgeTextRevealed : styles.pastBadgeTextClosed,
                        ]}>
                          {s.status === 'REVEALED' ? '공개됨 →' : '종료 →'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 더 보기 */}
          {hasMore && (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingPast}>
              {loadingPast
                ? <ActivityIndicator size="small" color={AppColors.primary} />
                : <Text style={styles.loadMoreText}>더 보기</Text>}
            </TouchableOpacity>
          )}
          {loadingPast && !hasMore && pastSprints.length === 0 && (
            <ActivityIndicator color={AppColors.primary} style={{ marginTop: 8 }} />
          )}

          {/* 빈 상태 */}
          {!activeSprint && pastSprints.length === 0 && !showCreateForm && !loadingPast && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>아직 스프린트가 없어요</Text>
              {isLeader
                ? <Text style={styles.emptyDesc}>위의 버튼으로 첫 스프린트를 시작해보세요!</Text>
                : <Text style={styles.emptyDesc}>팀장이 스프린트를 시작하면 여기에 표시돼요</Text>}
            </View>
          )}

        </ScrollView>
      )}

      {/* 참여 멤버 모달 */}
      <Modal visible={!!participantsModal} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} onPress={() => setParticipantsModal(null)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>{participantsModal?.sprint.name}</Text>
            <Text style={styles.participantsSubtitle}>참여 멤버 {participantsModal?.members.length ?? 0}명</Text>
            {loadingParticipants ? (
              <ActivityIndicator color={AppColors.primary} style={{ marginVertical: 20 }} />
            ) : (
              participantsModal?.members.map((m) => (
                <View key={m.userId} style={styles.participantRow}>
                  <Avatar name={m.name} size={36} />
                  <View>
                    <Text style={styles.participantName}>{m.name}</Text>
                    {m.bio ? <Text style={styles.participantBio}>{m.bio}</Text> : null}
                  </View>
                </View>
              ))
            )}
          </View>
        </TouchableOpacity>
      </Modal>

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
      <AlertModal
        visible={!!alert}
        title={alert?.title ?? ''}
        message={alert?.message}
        type={alert?.type}
        buttons={alert?.buttons}
        onClose={() => setAlert(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '800', color: AppColors.textPrimary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newBtn: {
    backgroundColor: AppColors.primary, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  newBtnText: { fontSize: 13, fontWeight: '700', color: AppColors.white },
  teamSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: AppColors.primaryLight,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  teamSelectorText: { fontSize: 14, fontWeight: '600', color: AppColors.primary },
  teamSelectorArrow: { fontSize: 12, color: AppColors.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },

  // 생성 폼
  createForm: {
    backgroundColor: AppColors.white, borderRadius: 14,
    borderWidth: 1, borderColor: AppColors.border,
    padding: 16, gap: 14,
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formTitle: { fontSize: 15, fontWeight: '700', color: AppColors.textPrimary },
  cancelText: { fontSize: 14, fontWeight: '600', color: AppColors.textMuted },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateLabel: { fontSize: 14, fontWeight: '600', color: AppColors.textMuted },
  dateButton: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: AppColors.primaryLight, borderRadius: 8,
  },
  dateValue: { fontSize: 14, fontWeight: '600', color: AppColors.primary },
  errorText: { fontSize: 13, color: AppColors.error, textAlign: 'center' },

  // 섹션
  section: { gap: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: AppColors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  leaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteSprintBtn: {
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1.5, borderColor: AppColors.error,
  },
  deleteSprintBtnText: { fontSize: 13, fontWeight: '700', color: AppColors.error },
  revealBtn: {
    backgroundColor: AppColors.primary, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  revealBtnText: { fontSize: 13, fontWeight: '700', color: AppColors.white },

  // 진행 중 카드
  activeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: AppColors.white, borderRadius: 14,
    borderWidth: 1, borderColor: AppColors.borderLight,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  sprintInfo: { flex: 1, gap: 2 },
  sprintName: { fontSize: 15, fontWeight: '600', color: AppColors.textPrimary },
  sprintDate: { fontSize: 12, color: AppColors.textMuted },
  activeBadge: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeText: { fontSize: 11, fontWeight: '600', color: '#16a34a' },

  // 지난 스프린트 목록
  pastList: {
    backgroundColor: AppColors.white, borderRadius: 14,
    borderWidth: 1, borderColor: AppColors.borderLight, overflow: 'hidden',
  },
  pastItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  pastItemBorder: { borderBottomWidth: 1, borderBottomColor: AppColors.borderLight },
  pastBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  praiseBadge: { backgroundColor: AppColors.primaryLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  praiseBadgeText: { fontSize: 11, fontWeight: '600', color: AppColors.primary },
  pastBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pastBadgeRevealed: { backgroundColor: AppColors.primaryMid },
  pastBadgeClosed: { backgroundColor: '#f1f5f9' },
  pastBadgeText: { fontSize: 11, fontWeight: '600' },
  pastBadgeTextRevealed: { color: AppColors.primary },
  pastBadgeTextClosed: { color: AppColors.textMuted },

  // 더 보기
  loadMoreBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: AppColors.borderLight,
    backgroundColor: '#fafafc',
  },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: AppColors.primary },

  // 빈 상태
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: AppColors.textPrimary },
  emptyDesc: { fontSize: 13, color: AppColors.textMuted, textAlign: 'center' },

  // 팀 선택 모달
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: AppColors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingBottom: 36, paddingHorizontal: 20, gap: 4,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: AppColors.textPrimary, marginBottom: 2 },
  participantsSubtitle: { fontSize: 12, color: AppColors.textMuted, marginBottom: 8 },
  participantRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  participantName: { fontSize: 15, fontWeight: '600', color: AppColors.textPrimary },
  participantBio: { fontSize: 12, color: AppColors.textMuted, marginTop: 1 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12,
  },
  pickerItemActive: { backgroundColor: AppColors.primaryLight },
  pickerItemText: { flex: 1, fontSize: 15, color: AppColors.textPrimary, fontWeight: '500' },
  pickerItemTextActive: { color: AppColors.primary, fontWeight: '700' },
  checkmark: { fontSize: 16, color: AppColors.primary, fontWeight: '700' },
});
