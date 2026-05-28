'use client';

import { useState, useEffect } from 'react';
import { getMarketConfig } from '@/lib/api/market';

// 备案信息组件
// 仅在国内版显示
export default function ICPFiling() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    getMarketConfig().then(config => {
      setShow(config.market === 'china');
    }).catch(() => {
      setShow(false);
    });
  }, []);

  if (!show) return null;

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
