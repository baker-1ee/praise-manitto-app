import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Avatar } from '@/components/avatar';
import { AppColors } from '@/constants/theme';

interface ManitoTarget {
  name: string;
  bio?: string;
  avatarUrl?: string;
}

interface ManitoCardProps {
  target: ManitoTarget | null;
}

export function ManitoCard({ target }: ManitoCardProps) {
  const progress = useSharedValue(0);
  const [flipped, setFlipped] = useState(false);

  // opacity 기반 크로스플랫폼 플립 (backfaceVisibility Android 미지원 대응)
  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 0.5], [1, 1, 0], 'clamp'),
    transform: [{ rotateY: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }],
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.5, 0.55, 1], [0, 1, 1], 'clamp'),
    transform: [{ rotateY: `${interpolate(progress.value, [0, 1], [-180, 0])}deg` }],
  }));

  const handleFlip = () => {
    if (!target) return;
    const next = flipped ? 0 : 1;
    progress.value = withTiming(next, { duration: 420 });
    setFlipped(!flipped);
  };

  return (
    <TouchableOpacity onPress={handleFlip} activeOpacity={0.95} style={styles.container}>
      {/* 앞면 */}
      <Animated.View style={[styles.card, styles.front, frontStyle]}>
        <Text style={styles.frontEmoji}>💌</Text>
        <Text style={styles.frontTitle}>마니또가 배정됐어요!</Text>
        <Text style={styles.frontHint}>탭해서 확인하기</Text>
      </Animated.View>

      {/* 뒷면 */}
      <Animated.View style={[styles.card, styles.back, backStyle]}>
        <Avatar name={target?.name} size={60} />
        <Text style={styles.backName}>{target?.name ?? '...'}님</Text>
        {target?.bio ? (
          <Text style={styles.backBio}>{target.bio}</Text>
        ) : null}
        <View style={styles.backLabel}>
          <Text style={styles.backLabelText}>이번 스프린트 내 마니또 대상</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const CARD_HEIGHT = 200;

const styles = StyleSheet.create({
  container: {
    height: CARD_HEIGHT,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: CARD_HEIGHT,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
  },
  front: {
    backgroundColor: AppColors.primary,
  },
  back: {
    backgroundColor: AppColors.white,
    borderWidth: 1.5,
    borderColor: AppColors.border,
  },

  // 앞면
  frontEmoji: { fontSize: 36, marginBottom: 4 },
  frontTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.white,
    letterSpacing: -0.3,
  },
  frontHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },

  // 뒷면
  backName: {
    fontSize: 20,
    fontWeight: '800',
    color: AppColors.textPrimary,
    letterSpacing: -0.3,
  },
  backBio: {
    fontSize: 13,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  backLabel: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: AppColors.primaryLight,
    borderRadius: 20,
  },
  backLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.primary,
  },
});
