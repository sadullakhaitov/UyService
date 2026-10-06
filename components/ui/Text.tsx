import { Text as RNText, type TextProps } from 'react-native';
import { type as typeScale } from '@/constants/theme';

type Variant = keyof typeof typeScale;

export function Text({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  return <RNText {...rest} style={[typeScale[variant], style]} />;
}
