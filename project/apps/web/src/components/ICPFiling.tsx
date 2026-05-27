'use client';

// 国内版备案信息，仅在 china 市场显示
export default function ICPFiling() {
  const market = process.env.NEXT_PUBLIC_MARKET;
  if (market !== 'china') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-paper/80 dark:bg-ink/80 backdrop-blur-sm border-t border-chest-400/10 py-1.5 text-center text-xs text-taupe">
      <a
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-chest-600 dark:hover:text-chest-400 transition-colors"
      >
        粤ICP备2026065057号-1
      </a>
    </div>
  );
}
