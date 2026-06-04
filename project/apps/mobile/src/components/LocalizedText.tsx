/**
 * i18n 友好文字组件
 * 解决问题：同一行内多语言文案长度差异大（中/英/日/法/德 长度差 2-3 倍）
 * - 默认不截断、不缩字号（避免"评分"等关键信息被压缩）
 * - 接收 numberOfLines / adjustsFontSizeToFit 由调用方按需开启
 * - 不改 i18n key，不引入新 key，确保不引入新 i18n 问题
 */
import React, { memo } from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useThemeStore } from '../store/theme';
import { typography, type TypographyVariant } from '../theme/tokens';

export interface LocalizedTextProps extends Omit<RNTextProps, 'style'> {
  /** i18n key（已在外层 t() 解析后传入） */
  text: string;
  variant?: TypographyVariant;
  color?: 'text' | 'textSecondary' | 'textTertiary' | 'textMuted' | 'primary' | 'danger' | 'success';
  align?: 'left' | 'center' | 'right';
  /** 自动按行数限制，默认不限制 */
  numberOfLines?: number;
  /** 容器宽度不足时自动缩字号（默认关闭以避免"评分"被压成"评..."） */
  adjustsFontSizeToFit?: boolean;
  /** 缩字号下限（仅在 adjustsFontSizeToFit=true 时生效） */
  minimumFontScale?: number;
  style?: RNTextProps['style'];
}

function LocalizedTextComponent({
  text,
  variant = 'body',
  color = 'text',
  align,
  numberOfLines,
  adjustsFontSizeToFit = false,
  minimumFontScale = 0.7,
  style,
  ...rest
}: LocalizedTextProps) {
  const colors = useThemeStore(s => s.colors);
  return (
    <RNText
      allowFontScaling
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      style={[
        typography[variant] as any,
        { color: colors[color] },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    >
      {text}
    </RNText>
  );
}

export const LocalizedText = memo(LocalizedTextComponent);
export default LocalizedText;
