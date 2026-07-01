import { Text } from '@/components/ui/text';
import React from 'react';
import {
  Modal,
  StyleSheet,
TouchableOpacity,
  View,
} from 'react-native';
import { AppColors } from '@/constants/theme';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertModalProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onClose: () => void;
  type?: 'default' | 'error' | 'success';
}

export function AlertModal({
  visible,
  title,
  message,
  buttons,
  onClose,
  type = 'default',
}: AlertModalProps) {
  const resolvedButtons: AlertButton[] = buttons ?? [{ text: '확인', style: 'default' }];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
          <View style={styles.buttonRow}>
            {resolvedButtons.map((btn, i) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              const btnColor = isDestructive ? AppColors.error : isCancel ? AppColors.textSecondary : (type === 'error' ? AppColors.error : type === 'success' ? AppColors.success : AppColors.primary);
              const filled = !isCancel;

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.button,
                    filled ? { backgroundColor: btnColor } : styles.buttonOutline,
                    resolvedButtons.length > 1 && { flex: 1 },
                  ]}
                  onPress={() => { btn.onPress?.(); onClose(); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.buttonText, !filled && { color: AppColors.textMuted }]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 20,
  },
  content: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonOutline: {
    backgroundColor: AppColors.primaryLight,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
