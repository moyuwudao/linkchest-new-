const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '..', '.build-logs', '.build-history.json');

function loadHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveHistory(history) {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function recordBuild(flavor, durationSec, success, cases = []) {
  const history = loadHistory();
  const key = flavor || 'unknown';

  if (!history[key]) {
    history[key] = { builds: [] };
  }

  history[key].builds.push({
    timestamp: new Date().toISOString(),
    duration_sec: durationSec,
    success,
    cases
  });

  const maxRecords = 50;
  if (history[key].builds.length > maxRecords) {
    history[key].builds = history[key].builds.slice(-maxRecords);
  }

  saveHistory(history);
  return analyzeTrends(history, key);
}

function analyzeTrends(history, flavor) {
  const builds = (history[flavor]?.builds) || [];
  if (builds.length < 2) {
    return { status: 'insufficient_data', message: '数据不足，需要至少2次构建记录' };
  }

  const durations = builds.map(b => b.duration_sec).filter(d => d !== null && d !== undefined);
  const successes = builds.filter(b => b.success);
  const failures = builds.filter(b => !b.success);

  if (durations.length === 0) {
    return { status: 'no_duration_data', message: '无耗时数据' };
  }

  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const latest = durations[durations.length - 1];
  const ratio = latest / avg;

  const alerts = [];

  if (ratio > 1.5) {
    alerts.push({
      level: 'WARN',
      type: 'duration_spike',
      message: `构建耗时异常: ${latest}s，超过历史均值 ${avg.toFixed(1)}s 的 ${(ratio * 100).toFixed(0)}%`,
      suggestion: '检查是否有新增依赖、缓存失效或网络下载问题'
    });
  }

  if (ratio > 2.0) {
    alerts.push({
      level: 'ERROR',
      type: 'duration_critical',
      message: `构建耗时严重异常: ${latest}s，超过历史均值 ${avg.toFixed(1)}s 的 ${(ratio * 100).toFixed(0)}%`,
      suggestion: '立即检查构建环境，可能存在严重问题'
    });
  }

  const recentBuilds = builds.slice(-5);
  const recentFailures = recentBuilds.filter(b => !b.success).length;
  if (recentFailures >= 3) {
    alerts.push({
      level: 'ERROR',
      type: 'failure_streak',
      message: `最近5次构建中有 ${recentFailures} 次失败`,
      suggestion: '检查构建环境稳定性或代码变更'
    });
  }

  const failureRate = failures.length / builds.length;
  if (builds.length >= 5 && failureRate > 0.3) {
    alerts.push({
      level: 'WARN',
      type: 'high_failure_rate',
      message: `构建失败率过高: ${(failureRate * 100).toFixed(1)}% (${failures.length}/${builds.length})`,
      suggestion: '分析失败日志，定位高频问题'
    });
  }

  return {
    status: alerts.length > 0 ? 'alert' : 'normal',
    flavor,
    total_builds: builds.length,
    avg_duration_sec: avg.toFixed(1),
    latest_duration_sec: latest,
    failure_rate: (failureRate * 100).toFixed(1),
    alerts
  };
}

function printMonitorResult(result) {
  console.log('\n========================================');
  console.log('  构建监控报告');
  console.log('========================================');
  console.log(`版本: ${result.flavor}`);
  console.log(`状态: ${result.status === 'normal' ? '✅ 正常' : '⚠️ 异常'}`);
  console.log(`总构建次数: ${result.total_builds}`);
  console.log(`平均耗时: ${result.avg_duration_sec}s`);
  console.log(`最近耗时: ${result.latest_duration_sec}s`);
  console.log(`失败率: ${result.failure_rate}%`);

  if (result.alerts && result.alerts.length > 0) {
    console.log('\n--- 告警 ---');
    for (const alert of result.alerts) {
      const icon = alert.level === 'ERROR' ? '🔴' : '🟡';
      console.log(`  ${icon} [${alert.type}] ${alert.message}`);
      console.log(`     建议: ${alert.suggestion}`);
    }
  }

  console.log('========================================\n');
}

module.exports = {
  recordBuild,
  analyzeTrends,
  loadHistory,
  printMonitorResult
};

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--record' && args[1] && args[2]) {
    const flavor = args[1];
    const duration = parseInt(args[2], 10);
    const success = args[3] !== 'false';
    const result = recordBuild(flavor, duration, success);
    printMonitorResult(result);
  } else if (args[0] === '--check' && args[1]) {
    const history = loadHistory();
    const result = analyzeTrends(history, args[1]);
    printMonitorResult(result);
  } else {
    console.log('用法:');
    console.log('  node build-monitor.js --record global 120 true   # 记录一次构建');
    console.log('  node build-monitor.js --check global             # 检查趋势');
  }
}
