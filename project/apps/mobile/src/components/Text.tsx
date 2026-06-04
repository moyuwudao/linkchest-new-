/**
 * 统一排版组件 — 替代内联 style={{ fontSize: 14, fontWeight: '600' }}
 * 颜色从 useThemeStore 读取，自动适配 light/dark
 * 不修改颜色逻辑（仅补充排版层）
 */
import React, { memo } from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useThemeStore } from '../store/theme';
import { typography, type TypographyVariant } from '../theme/tokens';

export interface TextProps extends Omit<RNTextProps, 'style'> {
  variant?: TypographyVariant;
  color?: 'text' | 'textSecondary' | 'textTertiary' | 'textMuted' | 'primary' | 'danger' | 'success';
  align?: 'left' | 'center' | 'right';
  style?: RNTextProps['style'];
}

function TextComponent({
  variant = 'body',
  color = 'text',
  align,
  style,
  children,
  ...rest
}: TextProps) {
  const colors = useThemeStore(s => s.colors);
  return (
    <RNText
      allowFontScaling
      style={[
        styles.base,
        typography[variant] as any,
        { color: colors[color] },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});

export const Text = memo(TextComponent);
export default Text;
