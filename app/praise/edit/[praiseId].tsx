import { Text } from '@/components/ui/text';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import {
  getPraiseById,
  isPraiseEditable,
  Praise,
  PRAISE_CATEGORIES,
  PraiseCategory,
  updatePraise,
} from '@/lib/praises';
import { getUserProfile, UserProfile } from '@/lib/users';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui/button';
import { AppColors } from '@/constants/theme';

const MIN_LEN = 10;
const MAX_LEN = 500;

export default function PraiseEditScreen() {
  const { user } = useAuth();
  const { praiseId } = useLocalSearchParams<{ praiseId: string }>();

  const [praise, setPraise] = useState<Praise | null>(null);
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [content, setContent] = useState('');
  const [categories, setCategories] = useState<PraiseCategory[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!praiseId) return;
    (async () => {
      const found = await getPraiseById(praiseId);
      if (found && found.fromUserId === user?.uid) {
        setPraise(found);
        setContent(found.content);
        setCategories(found.categories);
        const profile = await getUserProfile(found.toUserId);
        setTargetProfile(profile);
      }
      setLoading(false);
    })();
  }, [praiseId, user?.uid]);

  const toggleCategory = (cat: PraiseCategory) => {
    setCategories((prev) =>
      prev.includes(cat)
        ? prev.filter((c) => c !== cat)
        : prev.length < 3 ? [...prev, cat] : prev,
    );
  };

  const handleSubmit = async () => {
    setError('');
    if (content.trim().length < MIN_LEN) {
      setError(`칭찬은 최소 ${MIN_LEN}자 이상 작성해주세요.`);
      return;
    }
    if (!praise) return;
    setSubmitting(true);
    try {
      await updatePraise(praise.id, { content: content.trim(), categories });
      router.back();
    } catch {
      setError('수정 가능한 시간(10분)이 지났거나 수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Stack.Screen options={{ title: '칭찬 수정', headerShown: true, headerTintColor: AppColors.primary, headerShadowVisible: false }} />
        <View style={styles.center}><ActivityIndicator color={AppColors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!praise || !targetProfile || !isPraiseEditable(praise)) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Stack.Screen options={{ title: '칭찬 수정', headerShown: true, headerTintColor: AppColors.primary, headerShadowVisible: false }} />
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>⏰</Text>
          <Text style={styles.emptyText}>수정 가능한 시간이 지났어요</Text>
          <Text style={styles.emptySub}>칭찬은 작성 후 10분 이내에만 수정할 수 있어요</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: '칭찬 수정', headerShown: true, headerTintColor: AppColors.primary, headerShadowVisible: false, headerStyle: { backgroundColor: '#fafafc' } }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 수신자 */}
        <View style={styles.toSection}>
          <Text style={styles.toLabel}>받는 사람</Text>
          <View style={styles.toCard}>
            <Avatar name={targetProfile.name} size={44} />
            <View>
              <Text style={styles.toName}>{targetProfile.name}님</Text>
              {targetProfile.bio
                ? <Text style={styles.toBio}>{targetProfile.bio}</Text>
                : null}
            </View>
            <View style={styles.anonymousBadge}>
              <Text style={styles.anonymousText}>익명 발송</Text>
            </View>
          </View>
        </View>

        {/* 카테고리 */}
        <View style={styles.categorySection}>
          <Text style={styles.label}>카테고리 <Text style={styles.labelSub}>(최대 3개)</Text></Text>
          <View style={styles.categoryRow}>
            {PRAISE_CATEGORIES.map((cat) => {
              const selected = categories.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                  onPress={() => toggleCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 칭찬 내용 */}
        <View style={styles.contentSection}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>칭찬 내용</Text>
            <Text style={[styles.charCount, content.length > MAX_LEN && styles.charCountOver]}>
              {content.length}/{MAX_LEN}
            </Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder={`${targetProfile.name}님에게 따뜻한 칭찬을 전해보세요 (최소 ${MIN_LEN}자)`}
            placeholderTextColor={AppColors.textSecondary}
            value={content}
            onChangeText={setContent}
            onFocus={() => {
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
            }}
            multiline
            maxLength={MAX_LEN}
            textAlignVertical="top"
          />
          {content.length > 0 && content.length < MIN_LEN && (
            <Text style={styles.hintText}>{MIN_LEN - content.length}자 더 입력해주세요</Text>
          )}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title="수정하기"
          onPress={handleSubmit}
          loading={submitting}
          disabled={content.trim().length < MIN_LEN || content.length > MAX_LEN}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafc' },
  flex: { flex: 1 },
  scroll: { padding: 20, gap: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: AppColors.textPrimary },
  emptySub: { fontSize: 13, color: AppColors.textMuted, textAlign: 'center', paddingHorizontal: 32 },

  // 수신자
  toSection: { gap: 8 },
  toLabel: { fontSize: 13, fontWeight: '700', color: AppColors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  toCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: AppColors.white, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: AppColors.borderLight,
  },
  toName: { fontSize: 16, fontWeight: '700', color: AppColors.textPrimary },
  toBio: { fontSize: 12, color: AppColors.textMuted, marginTop: 2 },
  anonymousBadge: {
    marginLeft: 'auto',
    backgroundColor: AppColors.primaryMid, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  anonymousText: { fontSize: 11, fontWeight: '600', color: AppColors.primary },

  // 카테고리
  categorySection: { gap: 10 },
  label: { fontSize: 14, fontWeight: '600', color: AppColors.textMuted },
  labelSub: { fontSize: 12, fontWeight: '400' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: AppColors.border, backgroundColor: '#fafafc',
  },
  categoryChipSelected: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: AppColors.textMuted },
  categoryChipTextSelected: { color: AppColors.white },

  // 내용
  contentSection: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  charCount: { fontSize: 12, color: AppColors.textSecondary },
  charCountOver: { color: AppColors.error },
  textArea: {
    backgroundColor: AppColors.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: AppColors.border,
    padding: 14, fontSize: 15, color: AppColors.textPrimary,
    minHeight: 160, lineHeight: 22,
    ...Platform.select({ web: { outlineStyle: 'none' } as object }),
  },
  hintText: { fontSize: 12, color: AppColors.textSecondary },
  errorText: { fontSize: 13, color: AppColors.error, textAlign: 'center' },
});
