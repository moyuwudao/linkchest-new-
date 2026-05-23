const fs = require('fs');
const path = require('path');

const CASE_KEYWORDS = {
  'CASE-001': { keywords: ['services.gradle.org'], message: 'Gradle 镜像被重置为官方地址', suggestion: '执行 bash /mnt/d/trae_projects/linkchest/project/apps/mobile/fix-gradle-mirror.sh 恢复镜像', autoFixable: true },
  'CASE-002': { keywords: ['clean', 'cache'], message: '使用了 clean 命令导致缓存被删除', suggestion: '禁止 clean，重新构建', autoFixable: false },
  'CASE-003': { keywords: ['prebuild', 'icon'], message: 'prebuild 后图标被覆盖', suggestion: '恢复图标文件', autoFixable: true },
  'CASE-004': { keywords: ['download', 'gradle', 'dependency'], message: 'Gradle 反复下载依赖', suggestion: '检查镜像和缓存配置', autoFixable: false },
  'CASE-005': { keywords: ['offline', 'No cached'], message: '离线模式构建失败', suggestion: '移除 --offline 参数', autoFixable: true },
  'CASE-006': { keywords: ['JAVA_HOME'], message: 'JAVA_HOME 环境变量未设置', suggestion: 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64', autoFixable: true },
  'CASE-007': { keywords: ['incompatible', 'Kotlin', 'Gradle'], message: 'Gradle 版本不兼容', suggestion: '更新版本配置', autoFixable: false },
  'CASE-008': { keywords: ['quote', 'escape', 'PowerShell'], message: '构建脚本引号转义问题', suggestion: '使用 bash 脚本构建', autoFixable: false },
  'CASE-009': { keywords: ['different', 'sync', 'directory'], message: '代码目录与构建目录不同步', suggestion: '同步代码目录', autoFixable: false },
  'CASE-010': { keywords: ['EBUSY', 'rmdir', 'locked'], message: '文件被占用', suggestion: '关闭占用进程后重试', autoFixable: false },
  'CASE-011': { keywords: ['eas', 'login', 'cli'], message: '违规使用 EAS 构建', suggestion: '禁止 EAS，改用 WSL 构建', autoFixable: true },
  'CASE-013': { keywords: ['exports is not defined', '__dirname is not defined'], message: 'app.config.js ESM 兼容性错误', suggestion: 'app.config.js 改为 CommonJS', autoFixable: true },
  'CASE-014': { keywords: ['usesCleartextTraffic'], message: 'expo-build-properties 覆盖 usesCleartextTraffic', suggestion: '修改 expo-build-properties 配置', autoFixable: true },
  'CASE-016': { keywords: ['.env.market'], message: '.env.market 缺失或 MARKET 错误', suggestion: '检查并创建 .env.market 文件', autoFixable: true },
  'CASE-S007': { keywords: ['heap out of memory', 'Java heap space'], message: 'Node.js/Java 内存不足', suggestion: '增加 Node.js/Java 内存限制', autoFixable: true },
  'CASE-S008': { keywords: ['port', 'already in use'], message: '端口占用', suggestion: '更换端口或关闭占用进程', autoFixable: true },
  'CASE-S009': { keywords: ['MODULE_NOT_FOUND'], message: '部署后功能回退', suggestion: '服务器本地重新构建', autoFixable: false },
  'CASE-E010': { keywords: ['linkchest.net'], message: '国内版构建产物包含海外域名', suggestion: '检查 .env.market 隔离配置和 Metro 缓存', autoFixable: false },
};

function analyzeLogFile(jsonlPath) {
  if (!fs.existsSync(jsonlPath)) {
    console.error(`日志文件不存在: ${jsonlPath}`);
    return;
  }

  const lines = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n').filter(Boolean);
  const entries = lines.map(l => {
    try { return JSON.parse(l); } catch (e) { return null; }
  }).filter(Boolean);

  const report = {
    build_id: entries[0]?.build_id || 'unknown',
    flavor: entries[0]?.flavor || 'N/A',
    wsl_instance: entries[0]?.wsl_instance || 'N/A',
    total_entries: entries.length,
    errors: [],
    warnings: [],
    stages: {},
    duration_sec: null,
    matched_cases: [],
  };

  let gradleStart = null;
  let gradleEnd = null;

  for (const entry of entries) {
    const stage = entry.stage || 'unknown';
    report.stages[stage] = (report.stages[stage] || 0) + 1;

    if (entry.level === 'ERROR') {
      report.errors.push({
        stage: entry.stage,
        step: entry.step,
        message: entry.message,
        extra: entry.extra || entry.error || {},
      });
    }
    if (entry.level === 'WARN') {
      report.warnings.push({
        stage: entry.stage,
        step: entry.step,
        message: entry.message,
      });
    }

    if (entry.step === 'gradle-start' && entry.timestamp) {
      gradleStart = new Date(entry.timestamp).getTime();
    }
    if (entry.step === 'gradle-success' && entry.timestamp) {
      gradleEnd = new Date(entry.timestamp).getTime();
    }

    if (entry.extra?.error?.code) {
      report.matched_cases.push(entry.extra.error.code);
    }
  }

  if (gradleStart && gradleEnd) {
    report.duration_sec = Math.round((gradleEnd - gradleStart) / 1000);
  }

  const logText = entries.map(e => e.message).join('\n');
  for (const [caseId, caseInfo] of Object.entries(CASE_KEYWORDS)) {
    if (report.matched_cases.includes(caseId)) continue;
    const matched = caseInfo.keywords.some(kw => {
      const kws = kw.split(/\s+/);
      return kws.every(k => logText.toLowerCase().includes(k.toLowerCase()));
    });
    if (matched) {
      report.matched_cases.push(caseId);
      report.errors.push({
        stage: 'build',
        step: 'keyword-match',
        message: caseInfo.message,
        extra: { case: caseId, suggestion: caseInfo.suggestion, auto_fixable: caseInfo.autoFixable },
      });
    }
  }

  return report;
}

function printReport(report) {
  console.log('\n========================================');
  console.log('  构建日志分析报告');
  console.log('========================================');
  console.log(`构建 ID: ${report.build_id}`);
  console.log(`版本: ${report.flavor}`);
  console.log(`WSL 实例: ${report.wsl_instance}`);
  console.log(`日志条目数: ${report.total_entries}`);
  if (report.duration_sec !== null) {
    console.log(`构建耗时: ${report.duration_sec}s`);
  }
  console.log('');

  console.log('--- 阶段分布 ---');
  for (const [stage, count] of Object.entries(report.stages)) {
    console.log(`  ${stage}: ${count}`);
  }
  console.log('');

  if (report.matched_cases.length > 0) {
    console.log('--- 匹配案例 ---');
    for (const caseId of report.matched_cases) {
      const info = CASE_KEYWORDS[caseId];
      if (info) {
        console.log(`  ${caseId}: ${info.message}`);
        console.log(`    建议: ${info.suggestion}`);
        console.log(`    自动修复: ${info.autoFixable ? '是' : '否'}`);
      } else {
        console.log(`  ${caseId}: (未知案例)`);
      }
    }
    console.log('');
  }

  if (report.errors.length > 0) {
    console.log('--- 错误列表 ---');
    for (const err of report.errors) {
      console.log(`  [${err.stage}:${err.step}] ${err.message}`);
      if (err.extra?.suggestion) {
        console.log(`    建议: ${err.extra.suggestion}`);
      }
    }
    console.log('');
  }

  if (report.warnings.length > 0) {
    console.log('--- 警告列表 ---');
    for (const warn of report.warnings) {
      console.log(`  [${warn.stage}:${warn.step}] ${warn.message}`);
    }
    console.log('');
  }

  if (report.errors.length === 0 && report.warnings.length === 0) {
    console.log('✅ 未发现错误或警告');
  }

  console.log('========================================\n');
}

function analyzeLatest(days = 7) {
  const tmpDir = '/tmp';
  const logDir = path.join(__dirname, '..', '.build-logs');
  const allLogs = [];

  if (fs.existsSync(tmpDir)) {
    try {
      const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.jsonl'));
      for (const f of files) {
        const stat = fs.statSync(path.join(tmpDir, f));
        const ageDays = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays <= days) {
          allLogs.push(path.join(tmpDir, f));
        }
      }
    } catch (e) {}
  }

  if (fs.existsSync(logDir)) {
    try {
      const files = fs.readdirSync(logDir).filter(f => f.endsWith('.jsonl'));
      for (const f of files) {
        const stat = fs.statSync(path.join(logDir, f));
        const ageDays = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays <= days) {
          allLogs.push(path.join(logDir, f));
        }
      }
    } catch (e) {}
  }

  console.log(`\n找到 ${allLogs.length} 个日志文件（最近 ${days} 天）\n`);

  let totalBuilds = 0;
  let failedBuilds = 0;
  const flavorStats = {};
  const caseStats = {};

  for (const logPath of allLogs) {
    const report = analyzeLogFile(logPath);
    if (!report) continue;

    totalBuilds++;
    const isFailed = report.errors.length > 0;
    if (isFailed) failedBuilds++;

    const f = report.flavor || 'unknown';
    flavorStats[f] = flavorStats[f] || { total: 0, failed: 0 };
    flavorStats[f].total++;
    if (isFailed) flavorStats[f].failed++;

    for (const caseId of report.matched_cases) {
      caseStats[caseId] = (caseStats[caseId] || 0) + 1;
    }
  }

  console.log('========================================');
  console.log('  构建统计概览');
  console.log('========================================');
  console.log(`总构建次数: ${totalBuilds}`);
  console.log(`失败次数: ${failedBuilds}`);
  console.log(`异常率: ${totalBuilds > 0 ? ((failedBuilds / totalBuilds) * 100).toFixed(2) : 0}%`);
  console.log('');

  console.log('--- 按版本统计 ---');
  for (const [flavor, stats] of Object.entries(flavorStats)) {
    const rate = stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(2) : 0;
    console.log(`  ${flavor}: ${stats.failed}/${stats.total} (${rate}%)`);
  }
  console.log('');

  if (Object.keys(caseStats).length > 0) {
    console.log('--- 案例命中统计 ---');
    const sorted = Object.entries(caseStats).sort((a, b) => b[1] - a[1]);
    for (const [caseId, count] of sorted) {
      const info = CASE_KEYWORDS[caseId];
      console.log(`  ${caseId}: ${count}次${info ? ' - ' + info.message : ''}`);
    }
    console.log('');
  }

  console.log('========================================\n');
}

const args = process.argv.slice(2);
if (args.length === 0) {
  analyzeLatest();
} else if (args[0] === '--file' && args[1]) {
  const report = analyzeLogFile(args[1]);
  if (report) printReport(report);
} else if (args[0] === '--stats') {
  const days = parseInt(args[1], 10) || 7;
  analyzeLatest(days);
} else {
  console.log('用法:');
  console.log('  node analyze-build-log.js              # 分析最近7天的所有日志');
  console.log('  node analyze-build-log.js --stats 30   # 分析最近30天的统计');
  console.log('  node analyze-build-log.js --file /tmp/build-global-xxx.jsonl  # 分析单个日志文件');
}
