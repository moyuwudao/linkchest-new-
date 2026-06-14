import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '链藏 LinkChest - 全网好内容，一键收入链藏',
  description: '跨平台收藏聚合管理工具，帮助用户统一收集、整理、分享来自 X、TikTok、YouTube、Amazon 等 91+ 平台的内容链接。',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Landing 页面使用极简布局，不包含侧边栏
  return <>{children}</>;
}
