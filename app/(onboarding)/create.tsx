import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTeam } from '@/contexts/team-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppColors } from '@/constants/theme';

export default function CreateTeamScreen() {
  const { createTeam, setSelectedTeam } = useTeam();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setError('');
    if (!name.trim()) {
      setError('팀 이름을 입력해주세요.');
      return;
    }
    if (name.trim().length < 2) {
      setError('팀 이름은 최소 2자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      const teamId = await createTeam(name);
      setSelectedTeam(teamId);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : '팀 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.descBox}>
            <Text style={styles.descEmoji}>✨</Text>
            <Text style={styles.descText}>
              팀을 만들면 자동으로 팀장이 됩니다.{'\n'}
              팀원들에게 초대 코드를 공유해 초대하세요!
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="팀 이름"
              placeholder="예: 개발 1팀, 마케팅팀..."
              value={name}
              onChangeText={setName}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button
              title="팀 만들기"
              onPress={handleCreate}
              loading={loading}
              disabled={!name.trim()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.white },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 28,
  },
  descBox: {
    backgroundColor: AppColors.primaryLight,
    borderRadius: 14,
    padding: 20,
    gap: 10,
    alignItems: 'center',
  },
  descEmoji: { fontSize: 32 },
  descText: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: { gap: 16 },
  errorText: {
    fontSize: 13,
    color: AppColors.error,
    textAlign: 'center',
  },
});
