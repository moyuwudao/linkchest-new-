const fs = require('fs');

function getKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? prefix + '.' + k : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys.push(...getKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function checkPair(zhPath, enPath, label) {
  const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const zhKeys = new Set(getKeys(zh));
  const enKeys = new Set(getKeys(en));
  const missingInEn = [...zhKeys].filter(k => !enKeys.has(k));
  const missingInZh = [...enKeys].filter(k => !zhKeys.has(k));
  console.log('\n=== ' + label + ' ===');
  if (missingInEn.length) {
    console.log('Keys in zh but missing in en:');
    missingInEn.forEach(k => console.log('  - ' + k));
  }
  if (missingInZh.length) {
    console.log('Keys in en but missing in zh:');
    missingInZh.forEach(k => console.log('  - ' + k));
  }
  if (!missingInEn.length && !missingInZh.length) {
    console.log('All keys match! Total: ' + zhKeys.size);
  }
}

checkPair('apps/mobile/src/lib/locales/zh.json', 'apps/mobile/src/lib/locales/en.json', 'Mobile');
checkPair('apps/web/src/lib/locales/zh.json', 'apps/web/src/lib/locales/en.json', 'Web');
