'use client';

import { useState, useEffect } from 'react';
import { getMarketConfig } from '@/lib/api/market';

// 备案信息组件
// 仅在国内版显示，包含 ICP 备案号、公司业务简介、地址、联系电话
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
    <div className="text-center space-y-1.5 pt-2">
      <p className="text-xs text-taupe">链藏产品运营</p>
      <p className="text-xs text-taupe">深圳市罗湖区笋岗街道田心社区宝安北路3039号笋岗仓库十号库5层505A-3D47</p>
      <p className="text-xs text-taupe">
        联系电话：
        <a href="tel:18681517372" className="hover:text-chest-600 dark:hover:text-chest-400 transition-colors">
          18681517372
        </a>
      </p>
      <a
        href="https://beian.miit.gov.cn/#/Integrated/index"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs text-taupe hover:text-chest-600 dark:hover:text-chest-400 transition-colors"
      >
        粤ICP备2026065057号-1
      </a>
    </div>
  );
}
