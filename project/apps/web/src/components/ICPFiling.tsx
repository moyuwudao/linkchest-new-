'use client';

// 国内版备案信息，仅在 china 市场显示
export default function ICPFiling() {
  const market = process.env.NEXT_PUBLIC_MARKET;
  if (market !== 'china') return null;

  return (
    <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-taupe">
      <a
        href="https://beian.miit.gov.cn/#/Integrated/index"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-chest-600 dark:hover:text-chest-400 transition-colors"
      >
        粤ICP备2026065057号-1
      </a>
    </div>
  );
}
