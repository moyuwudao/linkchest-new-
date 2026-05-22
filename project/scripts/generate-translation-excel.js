const fs = require('fs');
const XLSX = require('xlsx');

const mdPath = 'c:\\Users\\Mayn\\CodeBuddy\\20260407184558\\translation-catalog.md';
const outputPath = 'c:\\Users\\Mayn\\CodeBuddy\\20260407184558\\translation-catalog.xlsx';

const content = fs.readFileSync(mdPath, 'utf-8');
const lines = content.split(/\r?\n/);

const rows = [];
let currentSource = null;
let currentNamespace = null;

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
    if (parts[0] === '') parts.shift();
    if (parts[parts.length - 1] === '') parts.pop();
    if (parts.length >= 3 && parts[0] !== 'Key' && parts[0] !== '错误码' && !parts[0].includes('---')) {
      rows.push([
        currentSource,
        currentNamespace || '',
        parts[0],
        parts[1],
        parts[2] || '',
        '', '', '', '', ''
      ]);
    }
  }
}

const wsData = [
  ['来源(Source)', '分类(Namespace)', '键名(Key)', '中文(ZH)', '英文(EN)', '法语(FR)', '德语(DE)', '日语(JA)', '韩语(KO)', '备注(Context)'],
  ...rows
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(wsData);
XLSX.utils.book_append_sheet(wb, ws, 'Translations');

// Set column widths
ws['!cols'] = [
  { wch: 18 },
  { wch: 22 },
  { wch: 38 },
  { wch: 42 },
  { wch: 48 },
  { wch: 42 },
  { wch: 42 },
  { wch: 42 },
  { wch: 42 },
  { wch: 30 }
];

// Freeze first row
ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' };

// Apply header styles via cell objects
const headerFill = { patternType: 'solid', fgColor: { rgb: '4472C4' } };
const headerFont = { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 };
const headerAlign = { horizontal: 'center', vertical: 'center', wrapText: true };
const thinBorder = {
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } }
};

const evenFill = { patternType: 'solid', fgColor: { rgb: 'D9E1F2' } };
const oddFill = { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } };

const range = XLSX.utils.decode_range(ws['!ref']);
for (let R = range.s.r; R <= range.e.r; ++R) {
  const isHeader = R === 0;
  const fill = isHeader ? headerFill : (R % 2 === 0 ? evenFill : oddFill);
  const font = isHeader ? headerFont : undefined;
  const alignment = isHeader ? headerAlign : { vertical: 'center', wrapText: true };

  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
    if (!ws[cellRef]) ws[cellRef] = { v: '' };
    ws[cellRef].s = {
      fill,
      font,
      alignment,
      border: thinBorder
    };
  }
}

// Auto-filter
ws['!autofilter'] = { ref: ws['!ref'] };

XLSX.writeFile(wb, outputPath);
console.log(`Generated ${outputPath} with ${rows.length} rows`);
