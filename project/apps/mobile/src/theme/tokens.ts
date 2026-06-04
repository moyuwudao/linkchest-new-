/**
 * Design Tokens — 间距 / 圆角 / 字号 / 字重 / 阴影
 * 颜色 token 在 src/store/theme.ts 中维护（保持单一来源）
 * 本文件仅补充尺寸与排版相关 token
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const typography = {
  display:  { fontSize: 28, lineHeight: 36, fontWeight: fontWeight.bold },
  title:    { fontSize: 20, lineHeight: 28, fontWeight: fontWeight.semibold },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: fontWeight.semibold },
  body:     { fontSize: 15, lineHeight: 22, fontWeight: fontWeight.regular },
  bodyBold: { fontSize: 15, lineHeight: 22, fontWeight: fontWeight.semibold },
  caption:  { fontSize: 13, lineHeight: 18, fontWeight: fontWeight.regular },
  micro:    { fontSize: 11, lineHeight: 14, fontWeight: fontWeight.regular },
} as const;

export type TypographyVariant = keyof typeof typography;
export type SpacingKey = keyof typeof spacing;
export type RadiusKey = keyof typeof radius;

/**
 * 标准阴影（中性、低调、不浮夸）
 */
export const shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
} as const;

export type ShadowKey = keyof typeof shadow;

/**
 * 动画时长与缓动（与 lib/animations.ts 配合）
 */
export const motion = {
  duration: {
    fast: 120,
    normal: 220,
    slow: 360,
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)' as const,
    decelerate: 'cubic-bezier(0.0, 0, 0.2, 1)' as const,
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)' as const,
  },
} as const;
