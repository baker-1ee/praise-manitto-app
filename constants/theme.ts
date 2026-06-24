import { Platform } from 'react-native';

// 웹 서비스와 동일한 purple/violet 팔레트
export const AppColors = {
  primary: '#7c3aed',
  primaryDark: '#5b21b6',
  primaryLight: '#f0ebff',
  primaryMid: '#ede9fe',
  textPrimary: '#1c1b1f',
  textMuted: '#5b5080',
  textSecondary: '#9c95b8',
  border: 'rgba(124,58,237,0.15)',
  borderLight: 'rgba(124,58,237,0.08)',
  error: '#dc2626',
  errorLight: '#fef2f2',
  success: '#16a34a',
  white: '#ffffff',
  backgroundDark: '#0f0f12',
  cardShadow: 'rgba(124,58,237,0.06)',
} as const;

export const Colors = {
  light: {
    text: '#1c1b1f',
    background: '#fafafa',
    tint: AppColors.primary,
    icon: AppColors.textMuted,
    tabIconDefault: AppColors.textSecondary,
    tabIconSelected: AppColors.primary,
    card: '#ffffff',
    border: AppColors.border,
  },
  dark: {
    text: '#ecedee',
    background: AppColors.backgroundDark,
    tint: '#c4b5fd',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#c4b5fd',
    card: '#1a1a24',
    border: 'rgba(196,181,253,0.15)',
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
});
