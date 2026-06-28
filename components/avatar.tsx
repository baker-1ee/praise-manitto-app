import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { getAvatarColor, getInitials } from '@/lib/users';

interface AvatarProps {
  name?: string | null;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ name, size = 48, style }: AvatarProps) {
  const initials = getInitials(name);
  const bg = getAvatarColor(name ?? '?');
  const fontSize = size * (initials.length >= 3 ? 0.28 : initials.length === 2 ? 0.33 : 0.38);

  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize }]} numberOfLines={1} adjustsFontSizeToFit>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: '700',
  },
});
