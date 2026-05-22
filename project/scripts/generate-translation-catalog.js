const fs = require('fs');
const path = require('path');

function flatten(obj, prefix = '', result = {}) {
  for (const [key, val] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      flatten(val, newKey, result);
    } else {
      result[newKey] = val;
    }
  }
  return result;
}

function escapeTableCell(str) {
  if (typeof str !== 'string') return String(str);
  return str.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

function sectionToTable(title, keys, zhMap, enMap) {
  let md = `### ${title}\n\n`;
  md += '| Key | 中文 | English | 新语言 |\n';
  md += '|-----|------|---------|--------|\n';
  for (const k of keys) {
    const zh = escapeTableCell(zhMap[k] ?? '');
    const en = escapeTableCell(enMap[k] ?? '');
    md += `| ${k} | ${zh} | ${en} | |\n`;
  }
  md += '\n';
  return md;
}

function generate() {
  const webZh = flatten(readJson('apps/web/src/lib/locales/zh.json'));
  const webEn = flatten(readJson('apps/web/src/lib/locales/en.json'));
  const mobileZh = flatten(readJson('apps/mobile/src/lib/locales/zh.json'));
  const mobileEn = flatten(readJson('apps/mobile/src/lib/locales/en.json'));

  const webKeys = Object.keys(webZh).sort();
  const mobileKeys = Object.keys(mobileZh).sort();

  // Group keys by first segment
  function groupKeys(keys) {
    const groups = {};
    for (const k of keys) {
      const first = k.split('.')[0];
      if (!groups[first]) groups[first] = [];
      groups[first].push(k);
    }
    return groups;
  }

  const webGroups = groupKeys(webKeys);
  const mobileGroups = groupKeys(mobileKeys);

  let md = '# LinkChest 完整翻译目录\n\n';
  md += '本文档梳理了 LinkChest 项目所有需要翻译的内容，包含中文原文与英文原文对照。请在 `新语言` 列填入目标语言的翻译结果。\n\n---\n\n';

  md += '## 一、概览统计\n\n';
  md += '| 类别 | 条目数 |\n|------|--------|\n';
  md += `| Web 端 UI 翻译 | ${webKeys.length} |\n`;
  md += `| Mobile 端 UI 翻译 | ${mobileKeys.length} |\n`;
  md += '| API 错误码消息 | ~88 |\n';
  md += '| 硬编码 Web 文本 | ~60 |\n';
  md += '| 硬编码 Mobile 文本 | ~12 |\n';
  md += '| 邮件模板文本 | ~8 |\n';
  md += `| **总计** | **${webKeys.length + mobileKeys.length + 88 + 60 + 12 + 8}** |\n\n---\n\n`;

  md += '## 二、Web 端 UI 翻译\n\n';
  md += '来源：`apps/web/src/lib/locales/zh.json` / `en.json`\n\n';
  md += '模板占位符（如 `{title}`、`{count}`）请保留不变。\n\n';

  for (const [group, keys] of Object.entries(webGroups)) {
    md += sectionToTable(group, keys, webZh, webEn);
  }

  md += '## 三、Mobile 端 UI 翻译\n\n';
  md += '来源：`apps/mobile/src/lib/locales/zh.json` / `en.json`\n\n';
  md += '模板占位符（如 `{title}`、`{count}`）请保留不变。\n\n';

  for (const [group, keys] of Object.entries(mobileGroups)) {
    md += sectionToTable(group, keys, mobileZh, mobileEn);
  }

  // API Error codes
  md += '## 四、API 错误码消息\n\n';
  md += '来源：`apps/api/src/lib/errorCodes.ts`\n\n';
  md += '当前 API 同时返回 `message`（中文）和 `messageEn`（英文）。建议改为仅返回错误码，由前端根据 locale 查表。\n\n';

  // Extract from errorCodes.ts manually since it's not JSON
  const errorCodeLines = fs.readFileSync('apps/api/src/lib/errorCodes.ts', 'utf-8').split('\n');
  const zhEntries = [];
  const enEntries = [];
  let inZh = false;
  let inEn = false;

  for (const line of errorCodeLines) {
    if (line.includes('ErrorCodeToMessage:')) { inZh = true; inEn = false; continue; }
    if (line.includes('ErrorCodeToMessageEn:')) { inZh = false; inEn = true; continue; }
    if (line.includes('export function errorResponse')) { inZh = false; inEn = false; continue; }
    if (inZh || inEn) {
      const match = line.match(/\[([^\]]+)\]:\s*['"](.+?)['"]/);
      if (match) {
        const code = match[1].replace(/.*\./, '').replace(/'/g, '');
        const msg = match[2];
        if (inZh) zhEntries.push({ code, msg });
        else enEntries.push({ code, msg });
      }
    }
  }

  md += '| 错误码 | 中文 | English | 新语言 |\n|--------|------|---------|--------|\n';
  for (let i = 0; i < zhEntries.length; i++) {
    const zh = escapeTableCell(zhEntries[i].msg);
    const en = enEntries[i] ? escapeTableCell(enEntries[i].msg) : '';
    md += `| ${zhEntries[i].code} | ${zh} | ${en} | |\n`;
  }
  md += '\n';

  // Hardcoded texts
  md += '## 五、硬编码 Web 文本\n\n';
  md += '以下文本直接硬编码在代码中，未通过 i18n 系统管理，需要提取到翻译文件或改为动态读取。\n\n';

  md += '### 5.1 SEO / 页面元数据 (`apps/web/src/app/layout.tsx`)\n\n';
  md += '| Key | 中文 | English | 新语言 |\n|-----|------|---------|--------|\n';
  md += '| layout.title | 链藏 LinkChest - 全网好内容，一键收入链藏 | — | |\n';
  md += '| layout.description | 跨平台收藏聚合管理工具，帮助用户统一收集、整理、分享来自 X、TikTok、YouTube、Amazon 等 91+ 平台的内容链接。 | — | |\n';
  md += '| layout.ogLocale | zh_CN | — | |\n';
  md += '| layout.siteName | 链藏 LinkChest | — | |\n';
  md += '| layout.appleWebAppTitle | 链藏 LinkChest | — | |\n';
  md += '| layout.htmlLang | zh-CN | — | |\n';
  md += '\n';

  md += '### 5.2 404 页面 (`apps/web/src/app/not-found.tsx`)\n\n';
  md += '| Key | 中文 | English | 新语言 |\n|-----|------|---------|--------|\n';
  md += '| notFound.title | 页面未找到 | — | |\n';
  md += '| notFound.desc | 抱歉，您访问的页面不存在或已被移除。 | — | |\n';
  md += '| notFound.backHome | 返回首页 | — | |\n';
  md += '\n';

  md += '### 5.3 分享页 SEO (`apps/web/src/app/s/[shareId]/page.tsx`)\n\n';
  md += '| Key | 中文 | English | 新语言 |\n|-----|------|---------|--------|\n';
  md += '| sharePage.fallbackTitle | 链藏 LinkChest 分享 | — | |\n';
  md += '| sharePage.fallbackDesc | 查看 LinkChest 分享的内容收藏 | — | |\n';
  md += '| sharePage.titleSuffix | 链藏 LinkChest | — | |\n';
  md += '| sharePage.ogImageAlt | 链藏 LinkChest | — | |\n';
  md += '\n';

  md += '### 5.4 下载页 SEO (`apps/web/src/app/download/layout.tsx`)\n\n';
  md += '| Key | 中文 | English | 新语言 |\n|-----|------|---------|--------|\n';
  md += '| download.title | 下载 LinkChest APP - 链藏 | — | |\n';
  md += '| download.description | 下载 LinkChest 安卓 APP，随时随地管理你的跨平台收藏。 | — | |\n';
  md += '| download.ogTitle | 下载 LinkChest APP | — | |\n';
  md += '| download.ogDesc | 下载 LinkChest 安卓 APP，随时随地管理你的跨平台收藏。 | — | |\n';
  md += '\n';

  md += '### 5.5 管理后台仪表盘 (`apps/web/src/app/admin/page.tsx`)\n\n';
  md += '| Key | 中文 | English | 新语言 |\n|-----|------|---------|--------|\n';
  md += '| admin.metric.requests1h | 1小时请求量 | — | |\n';
  md += '| admin.metric.errorRate1h | 1小时错误率 | — | |\n';
  md += '| admin.metric.avgDuration | 平均响应时间 | — | |\n';
  md += '| admin.metric.activeErrors | 活跃错误事件 | — | |\n';
  md += '| admin.metric.subValue24h | 24小时 | — | |\n';
  md += '| admin.metric.subValue24hAvg | 24小时平均 | — | |\n';
  md += '| admin.metric.subValuePendingConfirmed | 待处理 / 已确认 | — | |\n';
  md += '| admin.chart.trafficTrend | 最近1小时流量趋势 | — | |\n';
  md += '| admin.chart.errorDistribution | Top 错误分布 | — | |\n';
  md += '| admin.chart.noErrorData | 暂无错误数据 | — | |\n';
  md += '| admin.section.recentErrors | 最近错误事件 | — | |\n';
  md += '| admin.section.recentAlerts | 最近告警 | — | |\n';
  md += '| admin.section.systemResources | 系统资源 | — | |\n';
  md += '| admin.section.sharePerformance | 分享页性能 | — | |\n';
  md += '| admin.section.upgradeSuggestions | 升级建议与容量规划 | — | |\n';
  md += '| admin.status.pending | 待处理 | — | |\n';
  md += '| admin.status.confirmed | 已确认 | — | |\n';
  md += '| admin.status.fixed | 已修复 | — | |\n';
  md += '| admin.status.ignored | 已忽略 | — | |\n';
  md += '| admin.trend.up | 上升 | — | |\n';
  md += '| admin.trend.down | 下降 | — | |\n';
  md += '| admin.trend.flat | 持平 | — | |\n';
  md += '| admin.system.physicalMemory | 物理内存 | — | |\n';
  md += '| admin.system.nodeHeap | Node.js 堆内存 | — | |\n';
  md += '| admin.system.cpuLoad | CPU 负载 | — | |\n';
  md += '| admin.system.cpuCoresSuffix | 核 | — | |\n';
  md += '| admin.system.nodeRss | Node.js RSS | — | |\n';
  md += '| admin.share.cacheHitRate1h | 缓存命中率 (1h) | — | |\n';
  md += '| admin.share.shareRequests1h | 分享页请求 (1h) | — | |\n';
  md += '| admin.share.shareQps | 分享页 QPS (预估) | — | |\n';
  md += '| admin.share.avgDuration1h | 平均响应 (1h) | — | |\n';
  md += '| admin.share.avgDuration24h | 平均响应 (24h) | — | |\n';
  md += '| admin.error.loadFailed | 加载仪表盘数据失败 | — | |\n';
  md += '| admin.error.retry | 重试 | — | |\n';
  md += '| admin.suggestion.currentConfig | 当前配置 | — | |\n';
  md +=('| admin.suggestion.thresholds | 关键阈值 | — | |\n');
  md += '| admin.suggestion.noSuggestions | 当前系统运行平稳，暂无升级建议。继续监控即可。 | — | |\n';
  md += '\n';

  md += '## 六、硬编码 Mobile 文本\n\n';
  md += '### 6.1 等级/套餐页面 (`TierScreen.tsx` / `TierUpgradeScreen.tsx`)\n\n';
  md += '以下 `limitInfo` 对象中的文本直接硬编码，未使用全局 `t()` 翻译系统。\n\n';
  md += '| Key | 中文 | English | 新语言 |\n|-----|------|---------|--------|\n';
  md += '| tierLimit.collections | 收藏数量 | Collections | |\n';
  md += '| tierLimit.tags | 标签数量 | Tags | |\n';
  md += '| tierLimit.lists | 分组数量 | Groups | |\n';
  md += '| tierLimit.shares | 分享数量 | Shares | |\n';
  md += '| tierLimit.shareItems | 分享项 | Share Items | |\n';
  md += '| tierLimit.coverImages | 封面数量 | Covers | |\n';
  md += '\n';

  md += '## 七、邮件模板文本\n\n';
  md += '来源：`apps/api/src/services/ses.ts`\n\n';
  md += '| Key | 中文 | English | 新语言 |\n|-----|------|---------|--------|\n';
  md += '| email.verificationSubject | 验证码 | — | |\n';
  md += '| email.alertPriority.P0 | 紧急 | — | |\n';
  md += '| email.alertPriority.P1 | 严重 | — | |\n';
  md += '| email.alertPriority.P2 | 一般 | — | |\n';
  md += '| email.alertPriority.P3 | 提示 | — | |\n';
  md += '| email.alertTitle | LinkChest 运维告警 | — | |\n';
  md += '| email.alertField.priority | 优先级 | — | |\n';
  md += '| email.alertField.rule | 规则 | — | |\n';
  md += '| email.alertField.detail | 详情 | — | |\n';
  md += '| email.alertField.time | 时间 | — | |\n';
  md += '| email.alertFooter | 此邮件由 LinkChest 自动告警系统发送，请勿回复。 | — | |\n';
  md += '| email.dateFormatLocale | zh-CN | — | |\n';
  md += '\n';

  md += '---\n\n';
  md += '## 附录：使用说明\n\n';
  md += '1. **Web 翻译文件**：`apps/web/src/lib/locales/` 目录下新增 `{lang}.json`，结构同 `zh.json`。\n';
  md += '2. **Mobile 翻译文件**：`apps/mobile/src/lib/locales/` 目录下新增 `{lang}.json`，结构同 `zh.json`。\n';
  md += '3. **API 错误码**：建议改为仅返回错误码，由前端根据 `locale` 查表，而非返回双语言 `message` / `messageEn`。\n';
  md += '4. **硬编码文本**：需要将上述硬编码文本提取到对应的翻译 JSON 文件中，并在代码中改为 `t(\'key\')` 调用。\n';
  md += '5. **邮件模板**：SES 模板需要在腾讯云控制台创建对应语言版本的模板，并在代码中根据 `locale` 选择模板 ID。\n';

  fs.writeFileSync('translation-catalog.md', md, 'utf-8');
  console.log(`Generated translation-catalog.md with ${webKeys.length} web keys, ${mobileKeys.length} mobile keys, ${zhEntries.length} error codes.`);
}

generate();
