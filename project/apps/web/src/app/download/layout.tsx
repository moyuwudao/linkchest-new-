import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '下载 LinkChest APP - 链藏',
  description: '下载 LinkChest 安卓 APP，随时随地管理你的跨平台收藏。',
  openGraph: {
    title: '下载 LinkChest APP',
    description: '下载 LinkChest 安卓 APP，随时随地管理你的跨平台收藏。',
  },
};

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
