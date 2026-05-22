const fs = require('fs');
const path = require('path');

/**
 * 将嵌套 JSON 扁平化为 key-value 列表
 * @param {object} obj - JSON 对象
 * @param {string} prefix - 键前缀
 * @param {Array} result - 结果数组
 */
function flattenJson(obj, prefix = '', result = []) {
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'string') {
      result.push({ key: fullKey, text: value });
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenJson(value, fullKey, result);
    }
  }
  return result;
}

/**
 * 读取 JSON 文件并扁平化
 */
function extract(jsonPath) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const items = flattenJson(data);
  return items;
}

/**
 * 合并 Web 和 Mobile 的提取结果，对齐相同 key
 */
function mergeWebMobile(webItems, mobileItems) {
  const allKeys = new Set();
  webItems.forEach(i => allKeys.add(i.key));
  mobileItems.forEach(i => allKeys.add(i.key));

  const webMap = new Map(webItems.map(i => [i.key, i.text]));
  const mobileMap = new Map(mobileItems.map(i => [i.key, i.text]));

  const lines = [];
  lines.push('key,web_zh,mobile_zh');
  for (const key of Array.from(allKeys).sort()) {
    const webText = webMap.get(key) || '';
    const mobileText = mobileMap.get(key) || '';
    // CSV 转义：如果包含逗号、引号或换行，用引号包裹
    const escape = (s) => {
      if (!s) return '';
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    lines.push(`${key},${escape(webText)},${escape(mobileText)}`);
  }
  return lines.join('\n');
}

// 主程序
const root = path.resolve(__dirname, '..');
const webZh = path.join(root, 'apps', 'web', 'src', 'lib', 'locales', 'zh.json');
const mobileZh = path.join(root, 'apps', 'mobile', 'src', 'lib', 'locales', 'zh.json');

const webItems = extract(webZh);
const mobileItems = extract(mobileZh);

console.log(`Web 端提取: ${webItems.length} 条`);
console.log(`Mobile 端提取: ${mobileItems.length} 条`);

// 输出合并 CSV
const mergedCsv = mergeWebMobile(webItems, mobileItems);
const mergedPath = path.join(root, 'translation-source.csv');
fs.writeFileSync(mergedPath, mergedCsv, 'utf-8');
console.log(`合并 CSV 已保存: ${mergedPath}`);

// 同时输出单独的 CSV 方便分开翻译
function toCsv(items, filePath) {
  const lines = ['key,zh'];
  for (const { key, text } of items) {
    const escape = (s) => {
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    lines.push(`${key},${escape(text)}`);
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

toCsv(webItems, path.join(root, 'web-translation-source.csv'));
toCsv(mobileItems, path.join(root, 'mobile-translation-source.csv'));
console.log('单独 CSV 已保存: web-translation-source.csv, mobile-translation-source.csv');
