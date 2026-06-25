import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { useAuth } from '@/contexts/auth-context';
import { useTeam } from '@/contexts/team-context';
import {
  getTeam,
  getTeamMembersWithProfiles,
  leaveMembership,
  MemberWithProfile,
  regenerateInviteCode,
  Team,
} from '@/lib/teams';
import {
  createSprint,
  formatSprintDate,
  getTeamSprints,
  Sprint,
} from '@/lib/sprints';
import { Avatar } from '@/components/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TeamManageScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { user } = useAuth();
  const { myTeams, leaveTeam } = useTeam();

  const myMembership = myTeams.find((t) => t.id === teamId);
  const isLeader = myMembership?.role === 'LEADER';

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [leaving, setLeaving] = useState(false);

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
  const [creatingSprint, setCreatingsprint] = useState(false);
  const [sprintError, setSprintError] = useState('');

  const loadData = useCallback(async () => {
    if (!teamId) return;
    setLoadingData(true);
    try {
      const [teamData, membersData, sprintsData] = await Promise.all([
        getTeam(teamId),
        getTeamMembersWithProfiles(teamId),
        isLeader ? getTeamSprints(teamId) : Promise.resolve([]),
      ]);
      setTeam(teamData);
      setMembers(membersData.sort((a, b) => (a.role === 'LEADER' ? -1 : b.role === 'LEADER' ? 1 : 0)));
      setSprints(sprintsData);
    } finally {
      setLoadingData(false);
    }
  }, [teamId, isLeader]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCopyCode = async () => {
    if (!team?.inviteCode) return;
    await Clipboard.setStringAsync(team.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    Alert.alert('초대 코드 재발급', '기존 코드는 더 이상 사용할 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '재발급',
        onPress: async () => {
          setRegenerating(true);
          try {
            const newCode = await regenerateInviteCode(teamId!);
            setTeam((prev) => prev ? { ...prev, inviteCode: newCode } : prev);
          } catch {
            Alert.alert('오류', '코드 재발급에 실패했습니다.');
          } finally {
            setRegenerating(false);
          }
        },
      },
    ]);
  };

  const handleLeave = () => {
    Alert.alert('팀 나가기', `'${team?.name}' 팀에서 나가시겠어요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          setLeaving(true);
          try {
            await leaveTeam(teamId!);
            router.back();
          } catch (e) {
            Alert.alert('오류', e instanceof Error ? e.message : '실패했습니다.');
          } finally {
            setLeaving(false);
          }
        },
      },
    ]);
  };

  const handleCreateSprint = async () => {
    setSprintError('');
    if (!sprintName.trim()) { setSprintError('스프린트 이름을 입력해주세요.'); return; }
    if (endDate <= startDate) { setSprintError('종료일은 시작일 이후여야 합니다.'); return; }

    const memberIds = members.map((m) => m.userId);
    if (memberIds.length < 2) { setSprintError('팀원이 최소 2명 이상이어야 합니다.'); return; }

    setCreatingsprint(true);
    try {
      await createSprint({
        teamId: teamId!,
        name: sprintName.trim(),
        startDate,
        endDate,
        memberIds,
        createdBy: user!.uid,
      });
      setSprintName('');
      setShowCreateForm(false);
      loadData(); // 목록 갱신
    } catch (e) {
      setSprintError(e instanceof Error ? e.message : '스프린트 생성에 실패했습니다.');
    } finally {
      setCreatingsprint(false);
    }
  };

  const activeSprint = sprints.find((s) => s.status === 'ACTIVE');

  if (loadingData) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: '팀 관리' }} />
        <View style={styles.loading}><ActivityIndicator color={AppColors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: team?.name ?? '팀 관리' }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 초대 코드 섹션 (LEADER만) ── */}
        {isLeader && team && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>초대 코드</Text>
            <View style={styles.codeCard}>
              <Text style={styles.codeText}>{team.inviteCode}</Text>
              <View style={styles.codeActions}>
                <TouchableOpacity style={styles.codeBtn} onPress={handleCopyCode}>
                  <Text style={[styles.codeBtnText, copied && styles.codeBtnTextSuccess]}>
                    {copied ? '✓ 복사됨' : '복사'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.codeDivider} />
                <TouchableOpacity style={styles.codeBtn} onPress={handleRegenerate} disabled={regenerating}>
                  {regenerating
                    ? <ActivityIndicator size={14} color={AppColors.textMuted} />
                    : <Text style={styles.codeBtnTextMuted}>재발급</Text>}
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.codeHint}>팀원에게 위 코드를 공유해 초대하세요</Text>
          </View>
        )}

        {/* ── 스프린트 섹션 (LEADER만) ── */}
        {isLeader && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>스프린트</Text>
              {!activeSprint && (
                <TouchableOpacity onPress={() => setShowCreateForm((v) => !v)}>
                  <Text style={styles.sectionAction}>{showCreateForm ? '취소' : '+ 새 스프린트'}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 스프린트 생성 폼 */}
            {showCreateForm && (
              <View style={styles.createForm}>
                <Input
                  label="스프린트 이름"
                  placeholder="예: 2026년 7월 1주차"
                  value={sprintName}
                  onChangeText={setSprintName}
                  maxLength={30}
                />

                {/* 시작일 */}
                <View style={styles.dateRow}>
                  <Text style={styles.dateLabel}>시작일</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartPicker(true)}
                  >
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

                {/* 종료일 */}
                <View style={styles.dateRow}>
                  <Text style={styles.dateLabel}>종료일</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndPicker(true)}
                  >
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

            {/* 스프린트 목록 */}
            {sprints.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>아직 스프린트가 없어요</Text>
              </View>
            ) : (
              <View style={styles.sprintList}>
                {sprints.map((s) => (
                  <View key={s.id} style={styles.sprintItem}>
                    <View style={styles.sprintItemInfo}>
                      <Text style={styles.sprintItemName}>{s.name}</Text>
                      <Text style={styles.sprintItemDate}>
                        {formatSprintDate(s.startDate)} ~ {formatSprintDate(s.endDate)}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      s.status === 'ACTIVE' ? styles.statusActive :
                      s.status === 'REVEALED' ? styles.statusRevealed :
                      styles.statusClosed,
                    ]}>
                      <Text style={[
                        styles.statusText,
                        s.status === 'ACTIVE' ? styles.statusTextActive :
                        s.status === 'REVEALED' ? styles.statusTextRevealed :
                        styles.statusTextClosed,
                      ]}>
                        {s.status === 'ACTIVE' ? '진행 중' : s.status === 'REVEALED' ? '공개됨' : '종료'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── 멤버 목록 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>팀원 {members.length}명</Text>
          <View style={styles.membersList}>
            {members.map((item) => (
              <View key={item.membershipId} style={styles.memberRow}>
                <Avatar name={item.name} size={40} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  {item.bio ? <Text style={styles.memberBio}>{item.bio}</Text> : null}
                </View>
                <View style={[styles.roleBadge, item.role === 'LEADER' ? styles.roleBadgeLeader : styles.roleBadgeMember]}>
                  <Text style={[styles.roleBadgeText, item.role === 'LEADER' ? styles.roleBadgeTextLeader : styles.roleBadgeTextMember]}>
                    {item.role === 'LEADER' ? '리더' : '멤버'}
                  </Text>
                </View>
                {item.userId === user?.uid && item.role !== 'LEADER' && (
                  <Text style={styles.meLabel}>나</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* ── 팀 나가기 (MEMBER만) ── */}
        {!isLeader && (
          <View style={styles.leaveSection}>
            <TouchableOpacity style={styles.leaveButton} onPress={handleLeave} disabled={leaving}>
              {leaving
                ? <ActivityIndicator size="small" color={AppColors.error} />
                : <Text style={styles.leaveText}>팀 나가기</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, gap: 8, paddingBottom: 40 },

  section: { gap: 10, marginBottom: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: {
    fontSize: 13, fontWeight: '700',
    color: AppColors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  sectionAction: { fontSize: 14, fontWeight: '600', color: AppColors.primary },

  // 초대 코드
  codeCard: {
    backgroundColor: AppColors.white, borderRadius: 14,
    borderWidth: 1, borderColor: AppColors.border,
    padding: 20, alignItems: 'center', gap: 16,
  },
  codeText: { fontSize: 32, fontWeight: '800', color: AppColors.primary, letterSpacing: 8 },
  codeActions: { flexDirection: 'row', alignItems: 'center' },
  codeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 8 },
  codeBtnText: { fontSize: 14, fontWeight: '600', color: AppColors.primary },
  codeBtnTextSuccess: { color: AppColors.success },
  codeBtnTextMuted: { fontSize: 14, fontWeight: '600', color: AppColors.textMuted },
  codeDivider: { width: 1, height: 16, backgroundColor: AppColors.border },
  codeHint: { fontSize: 12, color: AppColors.textSecondary, textAlign: 'center' },

  // 스프린트 생성 폼
  createForm: {
    backgroundColor: AppColors.white, borderRadius: 14,
    borderWidth: 1, borderColor: AppColors.border,
    padding: 16, gap: 14,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateLabel: { fontSize: 14, fontWeight: '600', color: AppColors.textMuted },
  dateButton: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: AppColors.primaryLight, borderRadius: 8,
  },
  dateValue: { fontSize: 14, fontWeight: '600', color: AppColors.primary },
  errorText: { fontSize: 13, color: AppColors.error, textAlign: 'center' },

  // 스프린트 목록
  emptyBox: {
    backgroundColor: AppColors.white, borderRadius: 14,
    borderWidth: 1, borderColor: AppColors.borderLight,
    padding: 20, alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: AppColors.textMuted },
  sprintList: {
    backgroundColor: AppColors.white, borderRadius: 14,
    borderWidth: 1, borderColor: AppColors.borderLight, overflow: 'hidden',
  },
  sprintItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: AppColors.borderLight,
  },
  sprintItemInfo: { flex: 1, gap: 2 },
  sprintItemName: { fontSize: 14, fontWeight: '600', color: AppColors.textPrimary },
  sprintItemDate: { fontSize: 11, color: AppColors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusActive: { backgroundColor: '#dcfce7' },
  statusRevealed: { backgroundColor: AppColors.primaryMid },
  statusClosed: { backgroundColor: '#f1f5f9' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusTextActive: { color: '#16a34a' },
  statusTextRevealed: { color: AppColors.primary },
  statusTextClosed: { color: AppColors.textMuted },

  // 멤버 목록
  membersList: {
    backgroundColor: AppColors.white, borderRadius: 14,
    borderWidth: 1, borderColor: AppColors.borderLight, overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: AppColors.borderLight,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: AppColors.textPrimary },
  memberBio: { fontSize: 12, color: AppColors.textMuted, marginTop: 1 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleBadgeLeader: { backgroundColor: AppColors.primaryMid },
  roleBadgeMember: { backgroundColor: '#f1f5f9' },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  roleBadgeTextLeader: { color: AppColors.primary },
  roleBadgeTextMember: { color: AppColors.textMuted },
  meLabel: {
    fontSize: 11, fontWeight: '700', color: AppColors.primary,
    backgroundColor: AppColors.primaryLight,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },

  // 팀 나가기
  leaveSection: { marginTop: 16 },
  leaveButton: {
    height: 50, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: AppColors.error,
  },
  leaveText: { fontSize: 16, fontWeight: '600', color: AppColors.error },
});
