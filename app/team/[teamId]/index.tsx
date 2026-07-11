import { Text } from '@/components/ui/text';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
TouchableOpacity,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { useAuth } from '@/contexts/auth-context';
import { useTeam } from '@/contexts/team-context';
import {
  deleteTeam,
  getTeam,
  getTeamMembersWithProfiles,
  leaveMembership,
  MemberWithProfile,
  regenerateInviteCode,
  Team,
} from '@/lib/teams';
import { Avatar } from '@/components/avatar';
import { AppColors } from '@/constants/theme';
import { AlertModal } from '@/components/ui/alert-modal';

export default function TeamManageScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { user } = useAuth();
  const { myTeams, leaveTeam } = useTeam();

  const myMembership = myTeams.find((t) => t.id === teamId);
  const isLeader = myMembership?.role === 'LEADER';

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ title: string; message?: string; type?: 'default' | 'error' | 'success'; buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }> } | null>(null);

  const loadData = useCallback(async () => {
    if (!teamId) return;
    setLoadingData(true);
    try {
      const [teamData, membersData] = await Promise.all([
        getTeam(teamId),
        getTeamMembersWithProfiles(teamId),
      ]);
      setTeam(teamData);
      setMembers(membersData.sort((a, b) => (a.role === 'LEADER' ? -1 : b.role === 'LEADER' ? 1 : 0)));
    } finally {
      setLoadingData(false);
    }
  }, [teamId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCopyCode = async () => {
    if (!team?.inviteCode) return;
    await Clipboard.setStringAsync(team.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    setAlert({
      title: '초대 코드 재발급',
      message: '기존 코드는 더 이상 사용할 수 없습니다.',
      buttons: [
        { text: '취소', style: 'cancel' },
        {
          text: '재발급',
          style: 'default',
          onPress: async () => {
            setRegenerating(true);
            try {
              const newCode = await regenerateInviteCode(teamId!);
              setTeam((prev) => prev ? { ...prev, inviteCode: newCode } : prev);
            } catch {
              setAlert({ title: '오류', message: '코드 재발급에 실패했습니다.', type: 'error' });
            } finally {
              setRegenerating(false);
            }
          },
        },
      ],
    });
  };

  const handleDelete = () => {
    setAlert({
      title: '팀을 정말 삭제할까요?',
      message: `'${team?.name}' 팀을 삭제하면 칭찬 기록도 사라져요. 이 작업은 되돌릴 수 없어요.`,
      buttons: [
        { text: '취소', style: 'cancel' },
        {
          text: '팀 삭제',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteTeam(teamId!);
              router.dismissAll();
            } catch {
              setAlert({ title: '오류', message: '팀 삭제에 실패했습니다. 다시 시도해주세요.', type: 'error' });
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    });
  };

  const handleKick = (member: MemberWithProfile) => {
    setAlert({
      title: '팀원 내보내기',
      message: `'${member.name}'님을 팀에서 내보낼까요?`,
      buttons: [
        { text: '취소', style: 'cancel' },
        {
          text: '내보내기',
          style: 'destructive',
          onPress: async () => {
            setKickingId(member.membershipId);
            try {
              await leaveMembership(member.membershipId);
              await loadData();
            } catch {
              setAlert({ title: '오류', message: '내보내기에 실패했습니다. 다시 시도해주세요.', type: 'error' });
            } finally {
              setKickingId(null);
            }
          },
        },
      ],
    });
  };

  const handleLeave = () => {
    setAlert({
      title: '팀 나가기',
      message: `'${team?.name}' 팀에서 나가시겠어요?`,
      buttons: [
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
              setAlert({ title: '오류', message: e instanceof Error ? e.message : '실패했습니다.', type: 'error' });
            } finally {
              setLeaving(false);
            }
          },
        },
      ],
    });
  };

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

        {/* ── 초대 코드 (LEADER만) ── */}
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
                {isLeader && item.userId !== user?.uid && (
                  <TouchableOpacity
                    style={styles.kickButton}
                    onPress={() => handleKick(item)}
                    disabled={kickingId === item.membershipId}
                  >
                    {kickingId === item.membershipId
                      ? <ActivityIndicator size={12} color={AppColors.error} />
                      : <Text style={styles.kickButtonText}>내보내기</Text>}
                  </TouchableOpacity>
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

        {/* ── 팀 삭제 (LEADER만) ── */}
        {isLeader && (
          <View style={styles.leaveSection}>
            <TouchableOpacity style={styles.leaveButton} onPress={handleDelete} disabled={deleting}>
              {deleting
                ? <ActivityIndicator size="small" color={AppColors.error} />
                : <Text style={styles.leaveText}>팀 삭제</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, gap: 8, paddingBottom: 40 },

  section: { gap: 10, marginBottom: 8 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700',
    color: AppColors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

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
  kickButton: {
    paddingHorizontal: 8, paddingVertical: 4,
  },
  kickButtonText: {
    fontSize: 12, fontWeight: '600', color: AppColors.error,
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
