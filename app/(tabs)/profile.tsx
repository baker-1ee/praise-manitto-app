import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
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

export default function ProfileScreen() {
  const { profile, updateProfile, signOut } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message?: string; type?: 'default' | 'error' | 'success'; buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }> } | null>(null);

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

          {/* 로그아웃 */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>로그아웃</Text>
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
    paddingBottom: 40,
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
    marginVertical: 28,
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
});
