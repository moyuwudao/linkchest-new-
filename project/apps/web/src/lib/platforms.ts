// 平台配置 - 从 API 动态加载，本地仅保留工具函数和 fallback
// 与后端 apps/api/src/services/platforms.ts 的 SUPPORTED_PLATFORMS 保持同步（91个平台）

export type PlatformPriority = 'S' | 'A' | 'B' | 'C'

export interface PlatformInfo {
  key: string;
  name: string;
  color: string;
  category: string; // video | social | article | music | ecommerce | life | knowledge | finance | dev | game | design | ai | efficiency | hiring | auto | photo | tech | qna | education
  priority: PlatformPriority;
  isEcommerce: boolean;
  appSchemes?: string[];
  defaultCover?: string;
}

// ===== 本地 Fallback（API 不可用时使用）— 91个平台，按 S/A/B/C 优先级分级 =====
const FALLBACK_PLATFORMS: PlatformInfo[] = [
  // ========== S级 - 全球核心命脉（12个） ==========
  // 国内核心
  { key: 'douyin', name: '抖音', color: '#000000', category: 'video', priority: 'S', isEcommerce: false },
  { key: 'xiaohongshu', name: '小红书', color: '#FF2442', category: 'social', priority: 'S', isEcommerce: false },
  { key: 'bilibili', name: '哔哩哔哩', color: '#00A1D6', category: 'video', priority: 'S', isEcommerce: false },
  { key: 'wechat', name: '微信公众号', color: '#07C160', category: 'article', priority: 'S', isEcommerce: false },
  { key: 'zhihu', name: '知乎', color: '#0066FF', category: 'social', priority: 'S', isEcommerce: false },
  { key: 'weibo', name: '微博', color: '#E6162D', category: 'social', priority: 'S', isEcommerce: false },
  // 国际核心
  { key: 'youtube', name: 'YouTube', color: '#FF0000', category: 'video', priority: 'S', isEcommerce: false },
  { key: 'tiktok', name: 'TikTok', color: '#000000', category: 'video', priority: 'S', isEcommerce: false },
  { key: 'instagram', name: 'Instagram', color: '#E4405F', category: 'social', priority: 'S', isEcommerce: false },
  { key: 'twitter', name: 'Twitter/X', color: '#1DA1F2', category: 'social', priority: 'S', isEcommerce: false },
  { key: 'reddit', name: 'Reddit', color: '#FF4500', category: 'social', priority: 'S', isEcommerce: false },
  { key: 'pinterest', name: 'Pinterest', color: '#BD081C', category: 'social', priority: 'S', isEcommerce: false },

  // ========== A级 - 区域高频（23个） ==========
  // 国内生活/电商/资讯
  { key: 'dianping', name: '大众点评', color: '#FF6633', category: 'life', priority: 'A', isEcommerce: false },
  { key: 'meituan', name: '美团', color: '#FFD100', category: 'life', priority: 'A', isEcommerce: false },
  { key: 'mafengwo', name: '马蜂窝', color: '#FFA500', category: 'life', priority: 'A', isEcommerce: false },
  { key: 'ctrip', name: '携程', color: '#0A6EBD', category: 'life', priority: 'A', isEcommerce: false },
  { key: 'fliggy', name: '飞猪', color: '#FF6A00', category: 'life', priority: 'A', isEcommerce: false },
  { key: 'taobao', name: '淘宝', color: '#FF5000', category: 'ecommerce', priority: 'A', isEcommerce: true },
  { key: 'jd', name: '京东', color: '#E4393C', category: 'ecommerce', priority: 'A', isEcommerce: true },
  { key: 'douban', name: '豆瓣', color: '#007722', category: 'social', priority: 'A', isEcommerce: false },
  { key: 'toutiao', name: '今日头条', color: '#ED1C24', category: 'article', priority: 'A', isEcommerce: false },
  { key: 'netease-music', name: '网易云音乐', color: '#C20C0C', category: 'music', priority: 'A', isEcommerce: false },
  { key: 'qq-music', name: 'QQ音乐', color: '#31C27C', category: 'music', priority: 'A', isEcommerce: false },
  // 国际生活/电商/资讯
  { key: 'tripadvisor', name: 'TripAdvisor', color: '#34E0A1', category: 'life', priority: 'A', isEcommerce: false },
  { key: 'booking', name: 'Booking.com', color: '#003580', category: 'life', priority: 'A', isEcommerce: false },
  { key: 'airbnb', name: 'Airbnb', color: '#FF5A5F', category: 'life', priority: 'A', isEcommerce: false },
  { key: 'expedia', name: 'Expedia', color: '#0033A0', category: 'life', priority: 'A', isEcommerce: false },
  { key: 'amazon', name: 'Amazon', color: '#FF9900', category: 'ecommerce', priority: 'A', isEcommerce: true },
  { key: 'ebay', name: 'eBay', color: '#E53238', category: 'ecommerce', priority: 'A', isEcommerce: true },
  { key: 'linkedin', name: 'LinkedIn', color: '#0A66C2', category: 'social', priority: 'A', isEcommerce: false },
  { key: 'discord', name: 'Discord', color: '#5865F2', category: 'social', priority: 'A', isEcommerce: false },
  { key: 'medium', name: 'Medium', color: '#00AB6C', category: 'article', priority: 'A', isEcommerce: false },
  { key: 'quora', name: 'Quora', color: '#B92B27', category: 'qna', priority: 'A', isEcommerce: false },
  { key: 'spotify', name: 'Spotify', color: '#1DB954', category: 'music', priority: 'A', isEcommerce: false },
  { key: 'apple-music', name: 'Apple Music', color: '#FC3C44', category: 'music', priority: 'A', isEcommerce: false },

  // ========== B级 - 垂直头部（26个） ==========
  // 开发者
  { key: 'github', name: 'GitHub', color: '#24292F', category: 'dev', priority: 'B', isEcommerce: false },
  { key: 'stackoverflow', name: 'Stack Overflow', color: '#BC4C00', category: 'dev', priority: 'B', isEcommerce: false },
  { key: 'csdn', name: 'CSDN', color: '#FC5531', category: 'dev', priority: 'B', isEcommerce: false },
  { key: 'gitee', name: 'Gitee', color: '#C71D23', category: 'dev', priority: 'B', isEcommerce: false },
  // 设计
  { key: 'dribbble', name: 'Dribbble', color: '#EA4C89', category: 'design', priority: 'B', isEcommerce: false },
  { key: 'behance', name: 'Behance', color: '#1769FF', category: 'design', priority: 'B', isEcommerce: false },
  { key: 'figma', name: 'Figma', color: '#F24E1E', category: 'design', priority: 'B', isEcommerce: false },
  // 效率工具
  { key: 'notion', name: 'Notion', color: '#000000', category: 'efficiency', priority: 'B', isEcommerce: false },
  { key: 'yuque', name: '语雀', color: '#25B0ED', category: 'efficiency', priority: 'B', isEcommerce: false },
  { key: 'google-workspace', name: 'Google Workspace', color: '#4285F4', category: 'efficiency', priority: 'B', isEcommerce: false },
  { key: 'dropbox', name: 'Dropbox', color: '#0061FF', category: 'efficiency', priority: 'B', isEcommerce: false },
  // 在线学习
  { key: 'coursera', name: 'Coursera', color: '#0056D2', category: 'education', priority: 'B', isEcommerce: false },
  { key: 'udemy', name: 'Udemy', color: '#A435D0', category: 'education', priority: 'B', isEcommerce: false },
  { key: 'edx', name: 'edX', color: '#021F4D', category: 'education', priority: 'B', isEcommerce: false },
  { key: 'imooc', name: '慕课网', color: '#F9503D', category: 'education', priority: 'B', isEcommerce: false },
  { key: 'khan-academy', name: 'Khan Academy', color: '#14BF96', category: 'education', priority: 'B', isEcommerce: false },
  // 科技资讯
  { key: 'producthunt', name: 'Product Hunt', color: '#DA552F', category: 'tech', priority: 'B', isEcommerce: false },
  { key: '36kr', name: '36氪', color: '#0070FF', category: 'tech', priority: 'B', isEcommerce: false },
  { key: 'sspai', name: '少数派', color: '#DA2828', category: 'tech', priority: 'B', isEcommerce: false },
  { key: 'techcrunch', name: 'TechCrunch', color: '#0A9B4E', category: 'tech', priority: 'B', isEcommerce: false },
  // 游戏
  { key: 'steam', name: 'Steam', color: '#171a21', category: 'game', priority: 'B', isEcommerce: false },
  { key: 'taptap', name: 'TapTap', color: '#00DCC8', category: 'game', priority: 'B', isEcommerce: false },
  { key: 'twitch', name: 'Twitch', color: '#9146FF', category: 'game', priority: 'B', isEcommerce: false },
  // AI
  { key: 'chatgpt', name: 'ChatGPT', color: '#10A37F', category: 'ai', priority: 'B', isEcommerce: false },
  { key: 'claude', name: 'Claude', color: '#D97706', category: 'ai', priority: 'B', isEcommerce: false },

  // ========== C级 - 中低频垂直（30个） ==========
  // 国内视频
  { key: 'kuaishou', name: '快手', color: '#FF4906', category: 'video', priority: 'C', isEcommerce: false },
  { key: 'tencent-video', name: '腾讯视频', color: '#FF6A10', category: 'video', priority: 'C', isEcommerce: false },
  { key: 'youku', name: '优酷', color: '#1A91FF', category: 'video', priority: 'C', isEcommerce: false },
  { key: 'iqiyi', name: '爱奇艺', color: '#00BE06', category: 'video', priority: 'C', isEcommerce: false },
  // 国内社区
  { key: 'tieba', name: '百度贴吧', color: '#4E6EF2', category: 'social', priority: 'C', isEcommerce: false },
  { key: 'hupu', name: '虎扑', color: '#D4213D', category: 'social', priority: 'C', isEcommerce: false },
  // 国内财经
  { key: 'xueqiu', name: '雪球', color: '#0076FF', category: 'finance', priority: 'C', isEcommerce: false },
  { key: 'eastmoney', name: '东方财富', color: '#E4393C', category: 'finance', priority: 'C', isEcommerce: false },
  // 国内汽车
  { key: 'dongchedi', name: '懂车帝', color: '#FF5000', category: 'auto', priority: 'C', isEcommerce: false },
  { key: 'autohome', name: '汽车之家', color: '#E60012', category: 'auto', priority: 'C', isEcommerce: false },
  // 国内招聘
  { key: 'bosszhipin', name: 'Boss直聘', color: '#00BEAD', category: 'hiring', priority: 'C', isEcommerce: false },
  // 国内房产
  { key: 'anjuke', name: '安居客', color: '#00B96B', category: 'life', priority: 'C', isEcommerce: false },
  { key: 'ke', name: '贝壳找房', color: '#00B96B', category: 'life', priority: 'C', isEcommerce: false },
  // 国内阅读
  { key: 'weread', name: '微信读书', color: '#07C160', category: 'article', priority: 'C', isEcommerce: false },
  { key: 'qidian', name: '起点', color: '#00A862', category: 'article', priority: 'C', isEcommerce: false },
  // 国内电商
  { key: 'pinduoduo', name: '拼多多', color: '#E02E24', category: 'ecommerce', priority: 'C', isEcommerce: true },
  { key: 'xianyu', name: '闲鱼', color: '#FF6A00', category: 'ecommerce', priority: 'C', isEcommerce: true },
  // 国际视频
  { key: 'netflix', name: 'Netflix', color: '#E50914', category: 'video', priority: 'C', isEcommerce: false },
  { key: 'disney-plus', name: 'Disney+', color: '#113CCF', category: 'video', priority: 'C', isEcommerce: false },
  { key: 'hbo-max', name: 'HBO Max', color: '#B535F6', category: 'video', priority: 'C', isEcommerce: false },
  // 国际社交
  { key: 'telegram', name: 'Telegram', color: '#26A5E4', category: 'social', priority: 'C', isEcommerce: false },
  { key: 'snapchat', name: 'Snapchat', color: '#FFFC00', category: 'social', priority: 'C', isEcommerce: false },
  // 国际效率
  { key: 'slack', name: 'Slack', color: '#4A154B', category: 'efficiency', priority: 'C', isEcommerce: false },
  { key: 'trello', name: 'Trello', color: '#0079BF', category: 'efficiency', priority: 'C', isEcommerce: false },
  { key: 'onedrive', name: 'OneDrive', color: '#094AB2', category: 'efficiency', priority: 'C', isEcommerce: false },
  // 国际财经
  { key: 'wise', name: 'Wise', color: '#009B77', category: 'finance', priority: 'C', isEcommerce: false },
  { key: 'robinhood', name: 'Robinhood', color: '#00C805', category: 'finance', priority: 'C', isEcommerce: false },
  // 国际招聘
  { key: 'glassdoor', name: 'Glassdoor', color: '#0A6B35', category: 'hiring', priority: 'C', isEcommerce: false },
  { key: 'indeed', name: 'Indeed', color: '#2164F3', category: 'hiring', priority: 'C', isEcommerce: false },
  // 国际图片
  { key: 'unsplash', name: 'Unsplash', color: '#111111', category: 'photo', priority: 'C', isEcommerce: false },
  { key: 'pexels', name: 'Pexels', color: '#05A081', category: 'photo', priority: 'C', isEcommerce: false },
];

// ===== 缓存 =====
let cachedPlatforms: PlatformInfo[] | null = null;
let fetchPromise: Promise<PlatformInfo[]> | null = null;

// ===== 从 API 加载平台配置 =====
export async function fetchPlatforms(): Promise<PlatformInfo[]> {
  if (cachedPlatforms) return cachedPlatforms;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const { api } = await import('./api');
      const res = await api.get('/collections/platforms');
      const data = (res.data?.data || res.data) as PlatformInfo[] | undefined;
      if (Array.isArray(data) && data.length > 0) {
        cachedPlatforms = data;
        return cachedPlatforms;
      }
    } catch {
      // API 不可用，使用 fallback
    }
    cachedPlatforms = FALLBACK_PLATFORMS;
    return cachedPlatforms;
  })();

  return fetchPromise;
}

// ===== 同步获取（使用缓存或 fallback） =====
export function getPlatforms(): PlatformInfo[] {
  return cachedPlatforms || FALLBACK_PLATFORMS;
}

// ===== 按优先级获取平台 =====
export function getPlatformsByPriority(priority: PlatformPriority): PlatformInfo[] {
  return getPlatforms().filter(p => p.priority === priority);
}

// ===== 获取 S/A 级平台（用于前端快速推荐） =====
export function getTopPlatforms(): PlatformInfo[] {
  return getPlatforms().filter(p => p.priority === 'S' || p.priority === 'A');
}

export function getPlatformInfo(key: string): PlatformInfo | undefined {
  return getPlatforms().find(p => p.key === key);
}

// ===== 兼容旧代码：PLATFORMS 常量 =====
export const PLATFORMS = FALLBACK_PLATFORMS;

// ===== platformNames（从缓存动态生成，fallback 到静态数据） =====
export const platformNames: Record<string, string> = {};
// 初始化 fallback 名称
FALLBACK_PLATFORMS.forEach(p => { platformNames[p.key] = p.name; });
platformNames['other'] = 'Other';

// 当 API 数据加载后更新名称映射
export function updatePlatformNames(platforms: PlatformInfo[]) {
  platforms.forEach(p => { platformNames[p.key] = p.name; });
}

// ===== 工具函数 =====

export function getPlatformName(key: string): string {
  return getPlatformInfo(key)?.name || '其他';
}

export function getPlatformColor(key: string): string {
  return getPlatformInfo(key)?.color || '#999999';
}

export function getPlatformIcon(key: string): string {
  return getPlatformInfo(key)?.key || 'globe';
}

export function isPlatformValid(key: string): boolean {
  return !!getPlatformInfo(key);
}

// 根据背景色亮度返回合适的文字颜色
export function getContrastTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? 'text-charcoal' : 'text-parchment';
}

// ===== 增强版默认封面生成（渐变 + 图标 + 首字） =====
import { generateEnhancedCoverSVG } from './coverTemplates';

/**
 * 生成平台默认占位图（SVG data URI）
 * 增强版：渐变背景 + 品类图标 + 标题首字 + 平台名
 * @param platformKey 平台key
 * @param title 可选标题（用于首字，比平台名更有辨识度）
 * @param url 可选链接（用于未知平台的哈希配色）
 */
export function generateDefaultCover(platformKey: string, title?: string, url?: string): string {
  const platforms = getPlatforms();
  const platform = platforms.find(p => p.key === platformKey);

  if (!platform) {
    // 未知平台：使用哈希配色 + "?" 首字
    return generateEnhancedCoverSVG(
      platformKey,
      platformNames[platformKey] || 'Other',
      '#6b7280',
      'other',
      title,
      url || platformKey,
    );
  }

  return generateEnhancedCoverSVG(
    platform.key,
    platform.name,
    platform.color,
    platform.category,
    title,
    url,
  );
}
