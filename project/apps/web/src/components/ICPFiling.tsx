'use client';

import { useEffect, useState } from 'react';
import { getMarketConfig } from '@/lib/api/market';

// 国内版备案信息，仅在 china 市场显示
export default function ICPFiling() {
  const [isChina, setIsChina] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkMarket() {
      try {
        const config = await getMarketConfig();
        setIsChina(config.market === 'china');
      } catch {
        // 如果 API 失败，尝试从环境变量判断（构建时注入）
        setIsChina(process.env.NEXT_PUBLIC_MARKET === 'china');
      } finally {
        setLoading(false);
      }
    }
    checkMarket();
  }, []);

  // 加载中或不显示时返回空占位，保持布局稳定
  if (loading || !isChina) {
    return <div className="h-6" />;
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
