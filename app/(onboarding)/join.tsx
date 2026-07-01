import { Text } from '@/components/ui/text';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTeam } from '@/contexts/team-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppColors } from '@/constants/theme';

export default function JoinTeamScreen() {
  const { joinTeam, setSelectedTeam } = useTeam();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setError('');
    if (code.trim().length !== 6) {
      setError('6자리 초대 코드를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const teamId = await joinTeam(code);
      setSelectedTeam(teamId);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
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
            <Text style={styles.descEmoji}>🔑</Text>
            <Text style={styles.descText}>
              팀장에게 받은 6자리 초대 코드를 입력해주세요.{'\n'}
              영문 대문자와 숫자로 구성되어 있습니다.
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="초대 코드"
              placeholder="예: AB3K7P"
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              autoCapitalize="characters"
              maxLength={6}
              style={styles.codeInput}
              returnKeyType="done"
              onSubmitEditing={handleJoin}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button
              title="팀 합류하기"
              onPress={handleJoin}
              loading={loading}
              disabled={code.length !== 6}
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
  codeInput: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: AppColors.error,
    textAlign: 'center',
  },
});
