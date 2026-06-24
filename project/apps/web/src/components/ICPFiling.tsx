// 备案信息组件 - 纯静态渲染，无需异步请求
// 公安备案图标使用内联 SVG，避免外部依赖

const GABA_ICON_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='%23007bff'%3E%3Cpath d='M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 2.18l6 2.25v4.91c0 3.81-2.53 7.53-6 8.63-3.47-1.1-6-4.82-6-8.63V6.43l6-2.25zM12 7c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 5c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z'/%3E%3C/svg%3E`;

export default function ICPFiling() {
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
              src={GABA_ICON_SVG}
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
