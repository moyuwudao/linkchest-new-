const fs = require('fs');

function getKeys(obj, prefix = '') {
  const keys = [];
  for (const k in obj) {
    const path = prefix ? prefix + '.' + k : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys.push(...getKeys(obj[k], path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function compare(basePath, targetPath) {
  const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
  const target = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  const baseKeys = new Set(getKeys(base));
  const targetKeys = getKeys(target);
  const missing = [];
  targetKeys.forEach(k => {
    if (!baseKeys.has(k)) missing.push(k);
  });
  return missing;
}

console.log('=== Web: zh vs ja ===');
compare('apps/web/src/lib/locales/ja.json', 'apps/web/src/lib/locales/zh.json').forEach(k => console.log('  missing in ja: ' + k));

console.log('\n=== Web: zh vs fr ===');
compare('apps/web/src/lib/locales/fr.json', 'apps/web/src/lib/locales/zh.json').forEach(k => console.log('  missing in fr: ' + k));

console.log('\n=== Web: zh vs de ===');
compare('apps/web/src/lib/locales/de.json', 'apps/web/src/lib/locales/zh.json').forEach(k => console.log('  missing in de: ' + k));

console.log('\n=== Web: zh vs ko ===');
compare('apps/web/src/lib/locales/ko.json', 'apps/web/src/lib/locales/zh.json').forEach(k => console.log('  missing in ko: ' + k));

console.log('\n=== Mobile: zh vs ja ===');
compare('apps/mobile/src/lib/locales/ja.json', 'apps/mobile/src/lib/locales/zh.json').forEach(k => console.log('  missing in ja: ' + k));

console.log('\n=== Mobile: zh vs fr ===');
compare('apps/mobile/src/lib/locales/fr.json', 'apps/mobile/src/lib/locales/zh.json').forEach(k => console.log('  missing in fr: ' + k));

console.log('\n=== Mobile: zh vs de ===');
compare('apps/mobile/src/lib/locales/de.json', 'apps/mobile/src/lib/locales/zh.json').forEach(k => console.log('  missing in de: ' + k));

console.log('\n=== Mobile: zh vs ko ===');
compare('apps/mobile/src/lib/locales/ko.json', 'apps/mobile/src/lib/locales/zh.json').forEach(k => console.log('  missing in ko: ' + k));
