import { Text as RNText, TextProps } from 'react-native';

export function Text({ style, ...props }: TextProps) {
  return (
    <RNText
      style={[{ fontFamily: 'GowunDodum_400Regular' }, style]}
      {...props}
    />
  );
}
