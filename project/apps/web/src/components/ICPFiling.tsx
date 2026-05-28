// 国内版备案信息组件
// 在国内服务器上始终显示
export default function ICPFiling() {
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
