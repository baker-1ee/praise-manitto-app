import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { AppColors } from '@/constants/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as number, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function PraiseCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width="30%" height={12} borderRadius={6} />
      <Skeleton width="100%" height={14} borderRadius={6} style={{ marginTop: 2 }} />
      <Skeleton width="85%" height={14} borderRadius={6} />
      <View style={styles.footer}>
        <Skeleton width={60} height={22} borderRadius={11} />
        <Skeleton width={60} height={22} borderRadius={11} />
        <View style={{ flex: 1 }} />
        <Skeleton width={50} height={12} borderRadius={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: AppColors.borderLight,
  },
  card: {
    backgroundColor: AppColors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    padding: 16,
    gap: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
});
