/**
 * 智能默认封面模板系统（React Native 版）
 * 纯客户端生成，零服务器负担
 */

export interface CategoryStyle {
  from: string;
  to: string;
  icon: string; // Ionicons 图标名
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  video:     { from: '#7C1D2B', to: '#3B0F3A', icon: 'play' },
  social:    { from: '#1E3A5F', to: '#2D1B4E', icon: 'chatbubble' },
  article:   { from: '#2D3E35', to: '#1A2B24', icon: 'document-text' },
  music:     { from: '#1A1A3E', to: '#3E1A3E', icon: 'musical-note' },
  ecommerce: { from: '#5C2E14', to: '#3D1F0D', icon: 'pricetag' },
  life:      { from: '#1A3E3E', to: '#0D2B2B', icon: 'location' },
  knowledge: { from: '#1E2D5C', to: '#0F1A3D', icon: 'book' },
  finance:   { from: '#1A3E1A', to: '#0D2B0D', icon: 'trending-up' },
  dev:       { from: '#1A1A2E', to: '#0D0D1A', icon: 'code-slash' },
  game:      { from: '#2E1A3E', to: '#1A0D2B', icon: 'game-controller' },
  design:    { from: '#3E1A2E', to: '#2B0D1A', icon: 'color-palette' },
  ai:        { from: '#1A3E3E', to: '#0D2B2B', icon: 'sparkles' },
  efficiency:{ from: '#1E2D3E', to: '#0F1A2B', icon: 'list' },
  hiring:    { from: '#3E2E1A', to: '#2B1F0D', icon: 'briefcase' },
  auto:      { from: '#3E1A1A', to: '#2B0D0D', icon: 'car' },
  photo:     { from: '#2E2E2E', to: '#1A1A1A', icon: 'image' },
  tech:      { from: '#1A1A3E', to: '#0D0D2B', icon: 'rocket' },
  qna:       { from: '#3E2E1A', to: '#2B1F0D', icon: 'help-circle' },
  education: { from: '#1A3E2E', to: '#0D2B1F', icon: 'school' },
  other:     { from: '#3E3E3E', to: '#1A1A1A', icon: 'globe' },
};

const HASH_PALETTE = [
  { from: '#7C1D2B', to: '#3B0F3A' },
  { from: '#1E3A5F', to: '#2D1B4E' },
  { from: '#1A3E1A', to: '#0D2B0D' },
  { from: '#3E1A3E', to: '#1A0D2B' },
  { from: '#5C2E14', to: '#3D1F0D' },
  { from: '#1A1A3E', to: '#0D0D2B' },
  { from: '#3E1A1A', to: '#2B0D0D' },
  { from: '#1A3E3E', to: '#0D2B2B' },
  { from: '#2E1A3E', to: '#1A0D2B' },
  { from: '#3E3E1A', to: '#2B2B0D' },
  { from: '#1A3E2E', to: '#0D2B1F' },
  { from: '#2E2E2E', to: '#1A1A1A' },
];

export function hashToColor(url?: string): { from: string; to: string } {
  if (!url) return HASH_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % HASH_PALETTE.length;
  return HASH_PALETTE[index];
}

export function getCategoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES.other;
}

export function getFirstChar(text?: string): string {
  if (!text || !text.trim()) return '?';
  const trimmed = text.trim();
  if (/^[a-zA-Z]/.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase();
  }
  return trimmed.charAt(0);
}

/** 获取默认封面样式（用于回收站等场景） */
export function getDefaultCoverStyle(platform?: string, url?: string, title?: string): { backgroundColor: string; icon: string } {
  const color = hashToColor(url || title || platform);
  const initial = getFirstChar(title || platform || '?');
  return {
    backgroundColor: color.from,
    icon: initial,
  };
}
