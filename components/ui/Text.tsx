import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { type as typeScale } from '@/constants/theme';

type Variant = keyof typeof typeScale;

// Agar `style` o'z shrift o'lchamini bersa-yu, qator balandligini bermasa — variantning kichik
// qator balandligi qoladi va harflarning tepasi kesiladi. Shuning uchun uni o'lchamga mos hisoblaymiz.
export function Text({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  const own = StyleSheet.flatten(style) as TextStyle | undefined;
  const fix = own?.fontSize && own.lineHeight == null ? { lineHeight: Math.round(own.fontSize * 1.3) } : null;
  return <RNText {...rest} style={[typeScale[variant], style, fix]} />;
}
