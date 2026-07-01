import { Text } from '@/components/ui/text';
import React, { useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Avatar } from '@/components/avatar';

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
        <Image
          source={require('@/assets/images/whale question.png')}
          style={styles.frontWhale}
          resizeMode="contain"
        />
        <View style={styles.frontTextArea}>
          <Text style={styles.frontTitle}>나의 비밀 미션</Text>
          <View style={styles.frontHintRow}>
            <Text style={styles.frontHint}>탭해서 확인하기</Text>
          </View>
        </View>
      </Animated.View>

      {/* 뒷면 */}
      <Animated.View style={[styles.card, styles.back, backStyle]}>
        <Avatar name={target?.name} size={56} />
        <Text style={styles.backName}>{target?.name ?? '...'}</Text>
        {target?.bio ? (
          <Text style={styles.backBio}>{target.bio}</Text>
        ) : null}
        <View style={styles.backLabel}>
          <Text style={styles.backLabelText}>작은 것도 좋아요. 숨은 매력을 발견해 칭찬해보아요</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const CARD_HEIGHT = 196;

const styles = StyleSheet.create({
  container: {
    height: CARD_HEIGHT,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: CARD_HEIGHT,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 20,
  },
  front: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#DCE8F8',
    gap: 0,
  },
  back: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DCE8F8',
  },

  // 앞면
  frontWhale: {
    width: 170,
    height: 170,
  },
  frontTextArea: {
    flex: 1,
    gap: 10,
    alignItems: 'flex-start',
  },
  frontTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A2F4A',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  frontHintRow: {
    borderWidth: 1,
    borderColor: 'rgba(0,113,227,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  frontHint: {
    fontSize: 12,
    color: '#0071e3',
    letterSpacing: 0.2,
  },

  // 뒷면
  backName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2F4A',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  backBio: {
    fontSize: 13,
    color: '#8A9BB0',
    textAlign: 'center',
  },
  backLabel: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#E8F1FB',
    borderRadius: 20,
  },
  backLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0071e3',
    letterSpacing: 0.1,
  },
});
