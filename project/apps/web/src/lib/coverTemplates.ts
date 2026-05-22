/**
 * 智能默认封面模板系统
 * 纯客户端生成，零服务器负担
 * 支持：渐变背景 + 品类图标 + 标题首字 + 哈希配色
 */

// ===== 19个品类配色方案（暗色渐变，白色文字） =====
export interface CategoryStyle {
  gradient: string;        // SVG linearGradient stops
  iconPath: string;        // SVG path d 属性
  iconViewBox?: string;    // 可选自定义 viewBox
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  video: {
    gradient: '<stop offset="0%" stop-color="#7C1D2B"/><stop offset="100%" stop-color="#3B0F3A"/>',
    iconPath: 'M8 5v14l11-7z',
    iconViewBox: '0 0 24 24',
  },
  social: {
    gradient: '<stop offset="0%" stop-color="#1E3A5F"/><stop offset="100%" stop-color="#2D1B4E"/>',
    iconPath: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
    iconViewBox: '0 0 24 24',
  },
  article: {
    gradient: '<stop offset="0%" stop-color="#2D3E35"/><stop offset="100%" stop-color="#1A2B24"/>',
    iconPath: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
    iconViewBox: '0 0 24 24',
  },
  music: {
    gradient: '<stop offset="0%" stop-color="#1A1A3E"/><stop offset="100%" stop-color="#3E1A3E"/>',
    iconPath: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
    iconViewBox: '0 0 24 24',
  },
  ecommerce: {
    gradient: '<stop offset="0%" stop-color="#5C2E14"/><stop offset="100%" stop-color="#3D1F0D"/>',
    iconPath: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
    iconViewBox: '0 0 24 24',
  },
  life: {
    gradient: '<stop offset="0%" stop-color="#1A3E3E"/><stop offset="100%" stop-color="#0D2B2B"/>',
    iconPath: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    iconViewBox: '0 0 24 24',
  },
  knowledge: {
    gradient: '<stop offset="0%" stop-color="#1E2D5C"/><stop offset="100%" stop-color="#0F1A3D"/>',
    iconPath: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z',
    iconViewBox: '0 0 24 24',
  },
  finance: {
    gradient: '<stop offset="0%" stop-color="#1A3E1A"/><stop offset="100%" stop-color="#0D2B0D"/>',
    iconPath: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
    iconViewBox: '0 0 24 24',
  },
  dev: {
    gradient: '<stop offset="0%" stop-color="#1A1A2E"/><stop offset="100%" stop-color="#0D0D1A"/>',
    iconPath: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
    iconViewBox: '0 0 24 24',
  },
  game: {
    gradient: '<stop offset="0%" stop-color="#2E1A3E"/><stop offset="100%" stop-color="#1A0D2B"/>',
    iconPath: 'M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    iconViewBox: '0 0 24 24',
  },
  design: {
    gradient: '<stop offset="0%" stop-color="#3E1A2E"/><stop offset="100%" stop-color="#2B0D1A"/>',
    iconPath: 'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    iconViewBox: '0 0 24 24',
  },
  ai: {
    gradient: '<stop offset="0%" stop-color="#1A3E3E"/><stop offset="100%" stop-color="#0D2B2B"/>',
    iconPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    iconViewBox: '0 0 24 24',
  },
  efficiency: {
    gradient: '<stop offset="0%" stop-color="#1E2D3E"/><stop offset="100%" stop-color="#0F1A2B"/>',
    iconPath: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
    iconViewBox: '0 0 24 24',
  },
  hiring: {
    gradient: '<stop offset="0%" stop-color="#3E2E1A"/><stop offset="100%" stop-color="#2B1F0D"/>',
    iconPath: 'M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z',
    iconViewBox: '0 0 24 24',
  },
  auto: {
    gradient: '<stop offset="0%" stop-color="#3E1A1A"/><stop offset="100%" stop-color="#2B0D0D"/>',
    iconPath: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
    iconViewBox: '0 0 24 24',
  },
  photo: {
    gradient: '<stop offset="0%" stop-color="#2E2E2E"/><stop offset="100%" stop-color="#1A1A1A"/>',
    iconPath: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
    iconViewBox: '0 0 24 24',
  },
  tech: {
    gradient: '<stop offset="0%" stop-color="#1A1A3E"/><stop offset="100%" stop-color="#0D0D2B"/>',
    iconPath: 'M12 2.5s-4.5 5.5-4.5 9.5c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5c0-4-4.5-9.5-4.5-9.5zm0 12c-1.4 0-2.5-1.1-2.5-2.5 0-1.9 1.5-4.3 2.5-5.9 1 1.6 2.5 4 2.5 5.9 0 1.4-1.1 2.5-2.5 2.5zM17 22H7v-2h10v2z',
    iconViewBox: '0 0 24 24',
  },
  qna: {
    gradient: '<stop offset="0%" stop-color="#3E2E1A"/><stop offset="100%" stop-color="#2B1F0D"/>',
    iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z',
    iconViewBox: '0 0 24 24',
  },
  education: {
    gradient: '<stop offset="0%" stop-color="#1A3E2E"/><stop offset="100%" stop-color="#0D2B1F"/>',
    iconPath: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z',
    iconViewBox: '0 0 24 24',
  },
  other: {
    gradient: '<stop offset="0%" stop-color="#3E3E3E"/><stop offset="100%" stop-color="#1A1A1A"/>',
    iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    iconViewBox: '0 0 24 24',
  },
};

// ===== 哈希配色盘（用于未知平台，保证同一URL颜色固定） =====
const HASH_PALETTE = [
  { from: '#7C1D2B', to: '#3B0F3A' },   // 红紫
  { from: '#1E3A5F', to: '#2D1B4E' },   // 蓝紫
  { from: '#1A3E1A', to: '#0D2B0D' },   // 深绿
  { from: '#3E1A3E', to: '#1A0D2B' },   // 紫
  { from: '#5C2E14', to: '#3D1F0D' },   // 棕
  { from: '#1A1A3E', to: '#0D0D2B' },   // 深蓝
  { from: '#3E1A1A', to: '#2B0D0D' },   // 暗红
  { from: '#1A3E3E', to: '#0D2B2B' },   // 青
  { from: '#2E1A3E', to: '#1A0D2B' },   // 深紫
  { from: '#3E3E1A', to: '#2B2B0D' },   // 橄榄
  { from: '#1A3E2E', to: '#0D2B1F' },   // 绿青
  { from: '#2E2E2E', to: '#1A1A1A' },   // 灰
];

/**
 * 根据 URL 字符串哈希值选取固定颜色
 * 保证同一链接永远同一颜色，相邻链接颜色差异明显
 */
export function hashToColor(url?: string): { from: string; to: string } {
  if (!url) return HASH_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转为 32bit 整数
  }
  const index = Math.abs(hash) % HASH_PALETTE.length;
  return HASH_PALETTE[index];
}

/**
 * 获取品类样式
 */
export function getCategoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES.other;
}

/**
 * 清理非法 UTF-16 surrogate（不完整的 emoji/损坏字符），避免 encodeURIComponent 抛出 URIError
 */
function sanitizeForUri(str: string): string {
  // 替换孤立的 surrogate 为 �
  return str.replace(/[\uD800-\uDFFF]/g, '\uFFFD');
}

/**
 * 提取文本首字符（中文取首字，英文取首字母）
 */
export function getFirstChar(text?: string): string {
  if (!text || !text.trim()) return '?';
  const trimmed = text.trim();
  // 清理非法字符
  const clean = sanitizeForUri(trimmed);
  if (!clean) return '?';
  // 如果是英文，取第一个字母（大写）
  if (/^[a-zA-Z]/.test(clean)) {
    return clean.charAt(0).toUpperCase();
  }
  // 否则取第一个字符（中文/日文/韩文等）
  return clean.charAt(0);
}

/**
 * 计算背景色亮度，返回合适的文字颜色
 */
export function getContrastColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

/**
 * 生成增强版默认封面 SVG data URI
 * @param platformKey 平台key
 * @param platformName 平台名称
 * @param platformColor 平台主色
 * @param category 品类
 * @param title 标题（用于首字）
 * @param url 链接（用于哈希配色兜底）
 */
export function generateEnhancedCoverSVG(
  platformKey: string,
  platformName: string,
  platformColor: string,
  category: string,
  title?: string,
  url?: string,
): string {
  const style = getCategoryStyle(category);
  const firstChar = getFirstChar(title || platformName);

  // 如果 platformColor 是浅色系，使用 category 的暗色渐变；否则用 platformColor 变暗
  const hex = platformColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  let gradientStops: string;
  if (luminance > 0.6) {
    // 平台色太浅，用品类暗色渐变或哈希配色
    const hashColors = hashToColor(url || platformKey);
    gradientStops = `<stop offset="0%" stop-color="${hashColors.from}"/><stop offset="100%" stop-color="${hashColors.to}"/>`;
  } else {
    // 基于平台色生成暗色渐变
    const darken = (c: number) => Math.max(0, Math.floor(c * 0.45));
    const darkColor = `rgb(${darken(r)},${darken(g)},${darken(b)})`;
    const darkerColor = `rgb(${darken(r) * 0.6},${darken(g) * 0.6},${darken(b) * 0.6})`;
    gradientStops = `<stop offset="0%" stop-color="${darkColor}"/><stop offset="100%" stop-color="${darkerColor}"/>`;
  }

  const vb = style.iconViewBox || '0 0 24 24';
  const textColor = '#ffffff';

  const safeFirstChar = escapeXml(sanitizeForUri(firstChar));
  const safeDisplayText = escapeXml(sanitizeForUri(title || platformName));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      ${gradientStops}
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="400" height="300" fill="url(#g)" rx="12"/>
  <g transform="translate(200,115)" filter="url(#shadow)">
    <circle cx="0" cy="0" r="38" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
    <svg x="-14" y="-14" width="28" height="28" viewBox="${vb}">
      <path d="${style.iconPath}" fill="${textColor}" fill-opacity="0.9"/>
    </svg>
  </g>
  <text x="200" y="195" font-family="system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="56" font-weight="700" fill="${textColor}" text-anchor="middle" dominant-baseline="middle" filter="url(#shadow)">${safeFirstChar}</text>
  <text x="200" y="245" font-family="system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="16" fill="${textColor}" text-anchor="middle" opacity="0.55">${safeDisplayText}</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
