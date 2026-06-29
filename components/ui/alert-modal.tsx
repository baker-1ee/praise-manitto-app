import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppColors } from '@/constants/theme';

interface AlertModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  onClose: () => void;
  type?: 'default' | 'error' | 'success';
}


export function AlertModal({
  visible,
  title,
  message,
  confirmText = '확인',
  onClose,
  type = 'default',
}: AlertModalProps) {
  const btnColor =
    type === 'error' ? AppColors.error :
    type === 'success' ? AppColors.success :
    AppColors.primary;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: btnColor }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{confirmText}</Text>
          </TouchableOpacity>
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
  button: {
    marginTop: 12,
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
