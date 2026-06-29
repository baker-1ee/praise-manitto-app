import { Platform } from 'react-native';

export const AppColors = {
  primary: '#0071e3',
  primaryDark: '#0066cc',
  primaryLight: '#EAF2FF',
  primaryMid: '#D4E8FF',
  textPrimary: '#1A2F4A',
  textMuted: '#5A6E84',
  textSecondary: '#8A9BB8',
  border: 'rgba(0,113,227,0.2)',
  borderLight: 'rgba(0,113,227,0.1)',
  error: '#dc2626',
  errorLight: '#fef2f2',
  success: '#16a34a',
  white: '#ffffff',
  backgroundDark: '#0a1929',
  cardShadow: 'rgba(0,113,227,0.06)',
} as const;

export const Colors = {
  light: {
    text: '#1A2F4A',
    background: '#fafafc',
    tint: AppColors.primary,
    icon: AppColors.textMuted,
    tabIconDefault: AppColors.textSecondary,
    tabIconSelected: AppColors.primary,
    card: '#ffffff',
    border: AppColors.border,
  },
  dark: {
    text: '#e8f0fb',
    background: AppColors.backgroundDark,
    tint: '#2997ff',
    icon: '#8A9BB8',
    tabIconDefault: '#8A9BB8',
    tabIconSelected: '#2997ff',
    card: '#0d1f35',
    border: 'rgba(41,151,255,0.15)',
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
