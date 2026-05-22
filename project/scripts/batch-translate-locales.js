const fs = require('fs');
const path = require('path');
const { translate } = require('bing-translate-api');

const platforms = ['web', 'mobile'];
const targetLangs = ['ko', 'fr', 'de'];

const skipKeys = new Set([
  'app.nameEn', 'app.subtitleEn',
  'settings.languageEn', 'settings.languageDe', 'settings.languageJa',
  'settings.languageKo', 'settings.languageFr', 'settings.languageZh',
]);

const skipValues = new Set([
  'LinkChest', 'URL', 'API', 'App', 'OK', 'ID', 'MAX', 'MIN', 'PC', 'iOS',
  'VIP', 'HTML', 'PDF', 'CSV', 'JSON', 'OAuth', 'PWA', 'RSS', 'SEO', 'OG',
  'GitHub', 'Twitter', 'X', 'YouTube', 'Bilibili', 'TikTok', 'Amazon',
  'Vercel', 'CloudBase', 'Supabase', 'Prisma', 'Next.js', 'React',
  'Node.js', 'JavaScript', 'TypeScript',
]);

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

function unflatten(flat) {
  const result = {};
  for (const [key, val] of Object.entries(flat)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length; i++) {
      if (i === parts.length - 1) {
        current[parts[i]] = val;
      } else {
        if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
    }
  }
  return result;
}

function protectPlaceholders(text) {
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, '___PLH_$1___');
}
function restorePlaceholders(text) {
  return text.replace(/___PLH_([a-zA-Z0-9_]+)___/g, '{$1}');
}

async function translateWithRetry(text, from, to, retries = 3) {
  const pt = protectPlaceholders(text);
  for (let i = 0; i < retries; i++) {
    try {
      const result = await translate(pt, from, to);
      return restorePlaceholders(result.translation);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function batchTranslate(values, from, to, batchSize = 8, delay = 400) {
  const map = new Map();
  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    const promises = batch.map(async v => {
      try {
        const translated = await translateWithRetry(v, from, to);
        map.set(v, translated);
        return { v, translated, success: true };
      } catch (e) {
        map.set(v, v);
        return { v, error: e.message, success: false };
      }
    });
    const results = await Promise.all(promises);
    results.forEach(r => {
      const status = r.success ? 'OK' : 'FAIL';
      console.log(`  [${status}] "${r.v.slice(0,45)}" -> "${(r.translated || r.v).slice(0,45)}"`);
    });
    if (i + batchSize < values.length) {
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return map;
}

async function main() {
  // 第一阶段：收集所有需要翻译的数据
  const langData = {}; // lang -> { uniqueValues: Set(), platforms: [{platform, targetPath, targetFlat, toTranslateKeys: []}] }
  for (const lang of targetLangs) {
    langData[lang] = { uniqueValues: new Set(), platforms: [] };
  }

  for (const platform of platforms) {
    const baseDir = path.join(__dirname, '..', 'apps', platform, 'src', 'lib', 'locales');
    const enJson = JSON.parse(fs.readFileSync(path.join(baseDir, 'en.json'), 'utf8'));
    const enFlat = flatten(enJson);

    for (const lang of targetLangs) {
      const targetPath = path.join(baseDir, `${lang}.json`);
      const targetJson = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      const targetFlat = flatten(targetJson);

      const toTranslateKeys = [];
      for (const [key, enVal] of Object.entries(enFlat)) {
        if (skipKeys.has(key)) continue;
        if (skipValues.has(enVal.trim())) continue;
        const targetVal = targetFlat[key];
        if (targetVal === undefined) continue;
        if (targetVal === enVal) {
          toTranslateKeys.push(key);
          langData[lang].uniqueValues.add(enVal);
        }
      }

      langData[lang].platforms.push({ platform, targetPath, targetFlat, enFlat, toTranslateKeys });
      console.log(`${platform} ${lang}: ${toTranslateKeys.length} keys to translate`);
    }
  }

  // 第二阶段：按语言批量翻译
  for (const lang of targetLangs) {
    const uniqueValues = [...langData[lang].uniqueValues];
    console.log(`\n========== TRANSLATING ${lang.toUpperCase()} (${uniqueValues.length} unique values) ==========`);
    if (uniqueValues.length === 0) continue;

    const translationMap = await batchTranslate(uniqueValues, 'en', lang, 8, 400);

    // 第三阶段：应用翻译到所有平台
    for (const p of langData[lang].platforms) {
      for (const key of p.toTranslateKeys) {
        const enVal = p.enFlat[key];
        p.targetFlat[key] = translationMap.get(enVal);
      }
      const outputJson = unflatten(p.targetFlat);
      fs.writeFileSync(p.targetPath, JSON.stringify(outputJson, null, 2) + '\n', 'utf8');
      console.log(`Saved: ${p.targetPath}`);
    }
  }

  console.log('\n========== ALL DONE ==========');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
