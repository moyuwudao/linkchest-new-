/**
 * BrandHero — 登录页 Logo + 品牌色渐变光晕
 * 纯展示组件，不影响业务逻辑和 i18n
 * 颜色从 useThemeStore 读取（自动适配 light/dark）
 */
import React, { memo } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { useThemeStore } from '../store/theme';
import { spacing, radius, typography } from '../theme/tokens';
import { LocalizedText } from './LocalizedText';

export interface BrandHeroProps {
  /** 应用名（已在外层 i18n 解析后传入） */
  name: string;
  /** 副标题（已在外层 i18n 解析后传入） */
  subtitle: string;
  /** 是否在中文 locale 下显示 */
  showLogoImage?: boolean;
}

function BrandHeroComponent({ name, subtitle, showLogoImage = true }: BrandHeroProps) {
  const colors = useThemeStore(s => s.colors);

  return (
    <View style={styles.wrap}>
      {/* 品牌色光晕（绝对定位，柔光效果） */}
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          { backgroundColor: colors.glow },
        ]}
      />
      <View style={styles.row}>
        {showLogoImage && (
          <Image
            source={require('../../assets/logo.png')}
            style={[styles.logo, { backgroundColor: colors.card }]}
            resizeMode="contain"
          />
        )}
        <LocalizedText
          text={name}
          variant="display"
          color="text"
        />
      </View>
      <LocalizedText
        text={subtitle}
        variant="caption"
        color="textSecondary"
        style={styles.subtitle}
        numberOfLines={2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  glow: {
    position: 'absolute',
    top: -20,
    left: '20%',
    right: '20%',
    height: 120,
    borderRadius: 60,
    // 模糊通过大半径 + 低不透明度实现
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  subtitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
    // 排版 token 内部已含 lineHeight
    ...typography.caption,
  },
});

export const BrandHero = memo(BrandHeroComponent);
export default BrandHero;
