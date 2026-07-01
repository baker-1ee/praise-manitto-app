import { Text } from '@/components/ui/text';
import React, { forwardRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, secureTextEntry, style, ...props }, ref) => {
    const [hidden, setHidden] = useState(secureTextEntry ?? false);
    const isPassword = secureTextEntry === true;

    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={[styles.inputWrapper, error ? styles.inputError : undefined]}>
          <TextInput
            ref={ref}
            style={[styles.input, style]}
            placeholderTextColor={AppColors.textSecondary}
            secureTextEntry={isPassword ? hidden : false}
            autoCapitalize="none"
            autoCorrect={false}
            {...props}
          />
          {isPassword && (
            <TouchableOpacity
              onPress={() => setHidden((h) => !h)}
              style={styles.eyeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconSymbol
                name={hidden ? 'eye' : 'eye.slash'}
                size={20}
                color={AppColors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  },
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textMuted,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderRadius: 12,
    backgroundColor: AppColors.primaryLight,
    paddingHorizontal: 14,
    height: 50,
  },
  inputError: {
    borderColor: AppColors.error,
    backgroundColor: AppColors.errorLight,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textPrimary,
    ...Platform.select({ web: { outlineStyle: 'none' } as object }),
  },
  eyeButton: {
    paddingLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: AppColors.error,
  },
});
