import { Text } from '@/components/ui/text';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
Switch,
TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { Avatar } from '@/components/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppColors } from '@/constants/theme';
import { AlertModal } from '@/components/ui/alert-modal';
import { registerForPushNotifications } from '@/lib/notifications';
import { savePushToken, setPushEnabled } from '@/lib/users';

export default function ProfileScreen() {
  const { user, profile, updateProfile, signOut, isGoogleAccount, deleteAccount } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [togglingPush, setTogglingPush] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message?: string; type?: 'default' | 'error' | 'success'; buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }> } | null>(null);
  const [showWithdrawPassword, setShowWithdrawPassword] = useState(false);
  const [withdrawPassword, setWithdrawPassword] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const pushEnabled = profile?.pushEnabled !== false && !!profile?.pushToken;

  const handleTogglePush = async (value: boolean) => {
    if (!user) return;
    setTogglingPush(true);
    try {
      if (value && !profile?.pushToken) {
        // 토큰이 아직 없을 때(최초 등록)만 권한 요청 — 이미 있으면 재사용
        const token = await registerForPushNotifications();
        if (token) {
          await savePushToken(user.uid, token);
        } else {
          setAlert({
            title: '알림 권한이 필요해요',
            message: '기기 설정에서 알림 권한을 허용해주세요.',
            type: 'error',
          });
        }
      } else {
        await setPushEnabled(user.uid, value);
      }
    } catch {
      setAlert({ title: '오류', message: '설정 변경에 실패했습니다. 다시 시도해주세요.', type: 'error' });
    } finally {
      setTogglingPush(false);
    }
  };

  // 프로필 로드 시 초기값 세팅
  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setBio(profile.bio ?? '');
    }
  }, [profile?.name, profile?.bio]);

  const isDirty =
    name.trim() !== (profile?.name ?? '') ||
    bio.trim() !== (profile?.bio ?? '');

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSuccess(false);
    try {
      await updateProfile({ name: name.trim(), bio: bio.trim() || undefined });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setAlert({ title: '오류', message: '저장에 실패했습니다. 다시 시도해주세요.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setAlert({
      title: '로그아웃',
      message: '정말 로그아웃 하시겠어요?',
      buttons: [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
      ],
    });
  };

  const runWithdraw = async (password?: string) => {
    setWithdrawing(true);
    setWithdrawError('');
    try {
      await deleteAccount(password);
      setShowWithdrawPassword(false);
      setWithdrawPassword('');
    } catch (e) {
      const message = e instanceof Error ? e.message : '탈퇴 처리 중 오류가 발생했습니다.';
      if (showWithdrawPassword) {
        setWithdrawError(message);
      } else {
        setAlert({ title: '오류', message, type: 'error' });
      }
    } finally {
      setWithdrawing(false);
    }
  };

  const handleWithdraw = () => {
    setAlert({
      title: '정말 탈퇴하시겠어요?',
      message: '탈퇴하면 프로필이 삭제되고 소속된 모든 팀에서 나가요. 팀장으로 있는 팀은 다른 팀원에게 자동으로 위임되며(팀원이 없으면 팀도 함께 삭제돼요), 이미 작성된 칭찬 기록은 팀에 그대로 남아요. 이 작업은 되돌릴 수 없어요.',
      type: 'error',
      buttons: [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: () => {
            if (isGoogleAccount()) {
              runWithdraw();
            } else {
              setWithdrawError('');
              setWithdrawPassword('');
              setShowWithdrawPassword(true);
            }
          },
        },
      ],
    });
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color={AppColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <Text style={styles.pageTitle}>프로필</Text>

          {/* 아바타 */}
          <View style={styles.avatarSection}>
            <Avatar name={name || profile.name} size={80} />
            <Text style={styles.emailText}>{profile.email}</Text>
          </View>

          {/* 폼 */}
          <View style={styles.form}>
            <Input
              label="이름"
              value={name}
              onChangeText={setName}
              placeholder="이름을 입력하세요"
              maxLength={20}
            />
            <View>
              <Input
                label="한줄 소개"
                value={bio}
                onChangeText={setBio}
                placeholder="나를 한 줄로 소개해보세요 (선택)"
                maxLength={50}
              />
              <Text style={styles.charCount}>{bio.length}/50</Text>
            </View>

            {success && (
              <Text style={styles.successText}>✓ 저장되었습니다</Text>
            )}

            <Button
              title="저장"
              onPress={handleSave}
              loading={saving}
              disabled={!isDirty || !name.trim()}
            />
          </View>

          {/* 구분선 */}
          <View style={styles.divider} />

          {/* 알림 설정 */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>푸시 알림</Text>
            <Switch
              value={pushEnabled}
              onValueChange={handleTogglePush}
              disabled={togglingPush}
              trackColor={{ true: AppColors.primary }}
            />
          </View>

          {/* 구분선 */}
          <View style={styles.dividerTight} />

          {/* 로그아웃 */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>

          {/* 회원 탈퇴 */}
          <TouchableOpacity style={styles.withdrawButton} onPress={handleWithdraw}>
            <Text style={styles.withdrawText}>회원 탈퇴</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <AlertModal
        visible={!!alert}
        title={alert?.title ?? ''}
        message={alert?.message}
        type={alert?.type}
        buttons={alert?.buttons}
        onClose={() => setAlert(null)}
      />
      <Modal visible={showWithdrawPassword} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>비밀번호 확인</Text>
            <Text style={styles.sheetMessage}>탈퇴를 진행하려면 비밀번호를 입력해주세요.</Text>
            <Input
              secureTextEntry
              value={withdrawPassword}
              onChangeText={setWithdrawPassword}
              placeholder="비밀번호"
              error={withdrawError}
              autoFocus
            />
            <View style={styles.sheetButtonRow}>
              <TouchableOpacity
                style={styles.sheetCancelBtn}
                onPress={() => setShowWithdrawPassword(false)}
                disabled={withdrawing}
              >
                <Text style={styles.sheetCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetConfirmBtn}
                onPress={() => runWithdraw(withdrawPassword)}
                disabled={withdrawing || !withdrawPassword}
              >
                {withdrawing
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.sheetConfirmText}>탈퇴하기</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fafafc',
  },
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: AppColors.textPrimary,
    paddingVertical: 16,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  emailText: {
    fontSize: 14,
    color: AppColors.textMuted,
  },
  form: {
    gap: 16,
  },
  charCount: {
    fontSize: 11,
    color: AppColors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  successText: {
    fontSize: 13,
    color: AppColors.success,
    textAlign: 'center',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginVertical: 20,
  },
  dividerTight: {
    height: 1,
    backgroundColor: AppColors.border,
    marginTop: 16,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  logoutButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: AppColors.error,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.error,
  },
  withdrawButton: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  withdrawText: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.textSecondary,
    textDecorationLine: 'underline',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    width: '100%',
    padding: 20,
    gap: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  sheetMessage: {
    fontSize: 13,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: -8,
  },
  sheetButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sheetCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primaryLight,
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textMuted,
  },
  sheetConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.error,
  },
  sheetConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
