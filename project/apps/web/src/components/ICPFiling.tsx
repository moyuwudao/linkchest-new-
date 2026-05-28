'use client';

// 国内版备案信息组件
// 根据市场配置动态显示，仅在国内版显示
export default function ICPFiling() {
  const isChinaMarket = typeof window !== 'undefined' && 
    window.location.hostname === 'linkchest.cn';

  // 仅在国内版显示备案号
  if (!isChinaMarket) {
    return null;
  }

  return (
    <div className="text-center text-xs text-taupe py-2">
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
