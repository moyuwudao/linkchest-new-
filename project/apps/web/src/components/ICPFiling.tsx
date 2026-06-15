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
      {/* 默认显示：公司名 + 备案号 */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-xs text-taupe">© 2026 深圳市链记信息技术有限责任公司</p>
        <a
          href="https://beian.miit.gov.cn/#/Integrated/index"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-taupe hover:text-chest-600 dark:hover:text-chest-400 transition-colors"
        >
          粤ICP备2026065057号-1
        </a>
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 text-xs text-taupe/60 hover:text-taupe transition-colors mt-0.5"
        >
          {expanded ? '收起' : '更多信息'}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* 展开后显示：业务简介 + 地址 + 电话 */}
      {expanded && (
        <div className="mt-2 space-y-0.5 text-xs text-taupe/70">
          <p>链藏产品运营</p>
          <p>深圳市罗湖区笋岗街道田心社区宝安北路3039号笋岗仓库十号库5层505A-3D47</p>
          <p>
            联系电话：
            <a href="tel:18681517372" className="hover:text-chest-600 dark:hover:text-chest-400 transition-colors">
              18681517372
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
