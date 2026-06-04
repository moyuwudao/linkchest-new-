/**
 * 链接文字组件 — 解决链接点击区太小问题
 * 整行都可点击，不只是文字
 */
import React, { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useThemeStore } from '../store/theme';
import { typography, spacing } from '../theme/tokens';
import { LocalizedText } from './LocalizedText';

export interface LinkTextProps {
  text: string;
  onPress: () => void;
  variant?: 'body' | 'caption';
  color?: 'primary' | 'danger';
  /** 链接与左右文字之间的间距 */
  gap?: number;
  /** 整行容器水平对齐 */
  align?: 'left' | 'center' | 'right';
  /** 禁用态 */
  disabled?: boolean;
}

function LinkTextComponent({
  text,
  onPress,
  variant = 'body',
  color = 'primary',
  gap = spacing.xs,
  align,
  disabled = false,
}: LinkTextProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={{
        paddingHorizontal: gap,
        // flexShrink 防止 Modal 中文字溢出
        flexShrink: 1,
      }}
    >
      <LocalizedText
        text={text}
        variant={variant}
        color={color}
        style={align ? { textAlign: align } : undefined}
        numberOfLines={1}
      />
    </TouchableOpacity>
  );
}

export const LinkText = memo(LinkTextComponent);
export default LinkText;
