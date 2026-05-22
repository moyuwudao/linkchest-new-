const fs = require('fs');
const path = require('path');

/**
 * 解析 CSV 行（简单实现，支持引号包裹）
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

/**
 * 读取 CSV，返回 { key: translatedText } 的 Map
 * @param {string} csvPath - CSV 文件路径
 * @param {number} keyColumn - key 所在列索引（默认 0）
 * @param {number} valueColumn - 翻译值所在列索引
 */
function readTranslationCsv(csvPath, keyColumn = 0, valueColumn) {
  const content = fs.readFileSync(csvPath, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = content.split('\n').filter(l => l.trim());
  const map = new Map();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length > Math.max(keyColumn, valueColumn)) {
      const key = cols[keyColumn].trim();
      const value = cols[valueColumn].trim();
      if (key && value) {
        map.set(key, value);
      }
    }
  }
  return map;
}

/**
 * 将扁平化的 key-value 重新构建为嵌套 JSON 对象
 */
function buildNestedJson(flatMap) {
  const result = {};
  for (const [key, value] of flatMap) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = value;
      } else {
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {};
        }
        current = current[part];
      }
    }
  }
  return result;
}

/**
 * 按原始 JSON 的结构顺序和 key 集合，用翻译值重建 JSON
 * 这样能保持原始 JSON 的结构、顺序和未翻译的键
 */
function rebuildJson(originalJson, translationMap) {
  function rebuild(obj) {
    if (typeof obj === 'string') {
      return obj; // 不应该走到这里
    }
    const result = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === 'string') {
        // 查找翻译
        // 这里需要知道完整路径，但我们在递归中不知道父路径...
        // 换一种方式：先 flatten 原始 JSON，再替换，再 buildNested
        result[key] = value;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = rebuild(value);
      }
    }
    return result;
  }
  return rebuild(originalJson);
}

/**
 * 更好的方式：
 * 1. flatten 原始 zh.json 得到所有 key
 * 2. 对每个 key，如果 translationMap 中有值则替换，否则保留原中文
 * 3. buildNestedJson
 */
function flattenJson(obj, prefix = '', result = new Map()) {
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'string') {
      result.set(fullKey, value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenJson(value, fullKey, result);
    }
  }
  return result;
}

function applyTranslation(originalJsonPath, translationCsvPath, outputJsonPath, valueColumn = 1) {
  const original = JSON.parse(fs.readFileSync(originalJsonPath, 'utf-8'));
  const flatOriginal = flattenJson(original);
  const translations = readTranslationCsv(translationCsvPath, 0, valueColumn);

  const merged = new Map();
  for (const [key, originalValue] of flatOriginal) {
    if (translations.has(key)) {
      merged.set(key, translations.get(key));
    } else {
      merged.set(key, originalValue); // 未翻译的保留中文
    }
  }

  const outputJson = buildNestedJson(merged);
  fs.writeFileSync(outputJsonPath, JSON.stringify(outputJson, null, 2) + '\n', 'utf-8');
  console.log(`输出: ${outputJsonPath} (共 ${translations.size} 条翻译)`);
}

// 命令行用法
// node scripts/csv-to-json.js <csv-file> <output-lang> [valueColumn]
// 示例：
// node scripts/csv-to-json.js web-translation-ja.csv ja
// 这会读取 CSV 第 1 列（索引1）作为日语翻译，输出 apps/web/src/lib/locales/ja.json

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('用法: node csv-to-json.js <csv-file> <lang-code> [value-column-index]');
    console.log('');
    console.log('示例:');
    console.log('  node csv-to-json.js web-translation-ja.csv ja');
    console.log('  node csv-to-json.js mobile-translation-ja.csv ja 2');
    console.log('');
    console.log('CSV 格式要求: 第一列是 key，第 N 列是翻译值（默认第 2 列，索引 1）');
    process.exit(1);
  }

  const csvFile = args[0];
  const lang = args[1];
  const valueColumn = parseInt(args[2] || '1', 10);

  const root = path.resolve(__dirname, '..');
  const csvPath = path.resolve(root, csvFile);

  // 判断是 web 还是 mobile
  const isMobile = csvFile.includes('mobile');
  const appDir = isMobile ? 'apps/mobile' : 'apps/web';
  const originalZh = path.join(root, appDir, 'src', 'lib', 'locales', 'zh.json');
  const outputJson = path.join(root, appDir, 'src', 'lib', 'locales', `${lang}.json`);

  if (!fs.existsSync(csvPath)) {
    console.error(`错误: CSV 文件不存在 ${csvPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(originalZh)) {
    console.error(`错误: 原始中文文件不存在 ${originalZh}`);
    process.exit(1);
  }

  applyTranslation(originalZh, csvPath, outputJson, valueColumn);
}

main();
