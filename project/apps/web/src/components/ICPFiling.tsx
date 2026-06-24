'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { getMarketConfig } from '@/lib/api/market';

// 备案信息组件
// 仅在国内版显示，默认折叠，点击展开查看详情
export default function ICPFiling() {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getMarketConfig().then(config => {
      setShow(config.market === 'china');
    }).catch(() => {
      setShow(false);
    });
  }, []);

  if (!show) return null;

  return (
    <div className="text-center">
      {/* 版权 + 备案信息（紧凑排列，最多两行） */}
      <div className="flex flex-col items-center gap-0.5">
        {/* 第一行：版权 + 公司名 */}
        <p className="text-xs text-taupe">
          © 2026 链藏. 保留所有权利 · © 2026 深圳市链记信息技术有限责任公司
        </p>
        {/* 第二行：ICP备案 + 公安备案 */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <a
            href="https://beian.miit.gov.cn/#/Integrated/index"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-taupe hover:text-chest-600 dark:hover:text-chest-400 transition-colors"
          >
            粤ICP备2026065057号-1
          </a>
          <span className="text-taupe/30">|</span>
          <a
            href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=44030002013807"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-taupe hover:text-chest-600 dark:hover:text-chest-400 transition-colors"
          >
            <img
              src="/images/gaba.png"
              alt="公安备案"
              className="shrink-0"
              style={{ width: '1.1em', height: '1.1em' }}
            />
            <span>粤公网安备44030002013807号</span>
          </a>
        </div>
      </div>
    </div>
  );
}
