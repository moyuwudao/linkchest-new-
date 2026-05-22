const fs = require('fs');

const mdPath = 'c:\\Users\\Mayn\\CodeBuddy\\20260407184558\\translation-catalog.md';
const outputPath = 'c:\\Users\\Mayn\\CodeBuddy\\20260407184558\\translation-catalog.csv';

const content = fs.readFileSync(mdPath, 'utf-8');
const lines = content.split(/\r?\n/);

const rows = [];
let currentSource = null;
let currentNamespace = null;

function escapeCsv(val) {
  if (val == null) return '';
  const str = String(val).replace(/\r?\n/g, '\\n');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

for (const line of lines) {
  const stripped = line.trimEnd();
  if (stripped.startsWith('## 二、Web 端 UI 翻译')) {
    currentSource = 'web';
    currentNamespace = null;
    continue;
  } else if (stripped.startsWith('## 三、Mobile 端 UI 翻译')) {
    currentSource = 'mobile';
    currentNamespace = null;
    continue;
  } else if (stripped.startsWith('## 四、API 错误码消息')) {
    currentSource = 'api-error';
    currentNamespace = null;
    continue;
  } else if (stripped.startsWith('## 五、硬编码 Web 文本')) {
    currentSource = 'hardcoded-web';
    currentNamespace = null;
    continue;
  } else if (stripped.startsWith('## 六、硬编码 Mobile 文本')) {
    currentSource = 'hardcoded-mobile';
    currentNamespace = null;
    continue;
  } else if (stripped.startsWith('## 七、邮件模板文本')) {
    currentSource = 'email';
    currentNamespace = null;
    continue;
  } else if (stripped.startsWith('## ')) {
    currentSource = null;
    currentNamespace = null;
    continue;
  }

  if (stripped.startsWith('### ')) {
    currentNamespace = stripped.slice(4).trim();
    continue;
  }

  if (currentSource && stripped.startsWith('|')) {
    const parts = stripped.split('|').map(p => p.trim());
    // Remove first empty element if line starts with |
    if (parts[0] === '') parts.shift();
    // Remove last empty element if line ends with |
    if (parts[parts.length - 1] === '') parts.pop();
    // Skip header and separator rows
    if (parts.length >= 3 && parts[0] !== 'Key' && parts[0] !== '错误码' && !parts[0].includes('---')) {
      const key = parts[0];
      const zh = parts[1];
      const en = parts[2] || '';
      rows.push({ source: currentSource, namespace: currentNamespace || '', key, zh, en });
    }
  }
}

const headers = ['来源(Source)', '分类(Namespace)', '键名(Key)', '中文(ZH)', '英文(EN)', '法语(FR)', '德语(DE)', '日语(JA)', '韩语(KO)', '备注(Context)'];
let csv = headers.map(escapeCsv).join(',') + '\n';
for (const r of rows) {
  csv += [
    r.source, r.namespace, r.key, r.zh, r.en, '', '', '', '', ''
  ].map(escapeCsv).join(',') + '\n';
}

fs.writeFileSync(outputPath, '\uFEFF' + csv, 'utf-8');
console.log(`Generated ${outputPath} with ${rows.length} rows`);
