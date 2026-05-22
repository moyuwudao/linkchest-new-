const fs = require('fs');

function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else {
      Object.assign(result, flatten(value, fullKey));
    }
  }
  return result;
}

function loadFlat(path) {
  const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
  return flatten(data);
}

const webZh = loadFlat('apps/web/src/lib/locales/zh.json');
const webEn = loadFlat('apps/web/src/lib/locales/en.json');
const mobZh = loadFlat('apps/mobile/src/lib/locales/zh.json');
const mobEn = loadFlat('apps/mobile/src/lib/locales/en.json');

const webKeys = new Set(Object.keys(webZh));
const mobKeys = new Set(Object.keys(mobZh));

const shared = [];
const webOnly = [];
const mobOnly = [];
const diffValue = [];

for (const key of webKeys) {
  if (mobKeys.has(key)) {
    const sameZh = webZh[key] === mobZh[key];
    const sameEn = webEn[key] === mobEn[key];
    if (sameZh && sameEn) {
      shared.push(key);
    } else {
      diffValue.push({
        key,
        webZh: webZh[key], mobZh: mobZh[key],
        webEn: webEn[key], mobEn: webEn[key],
      });
    }
  } else {
    webOnly.push(key);
  }
}

for (const key of mobKeys) {
  if (!webKeys.has(key)) {
    mobOnly.push(key);
  }
}

console.log('=== Summary ===');
console.log('Web total:', webKeys.size);
console.log('Mobile total:', mobKeys.size);
console.log('Shared (same values):', shared.length);
console.log('Shared (diff values):', diffValue.length);
console.log('Web only:', webOnly.length);
console.log('Mobile only:', mobOnly.length);

console.log('\n=== Web Only Keys (first 20) ===');
webOnly.slice(0, 20).forEach(k => console.log(' ', k));

console.log('\n=== Mobile Only Keys (first 20) ===');
mobOnly.slice(0, 20).forEach(k => console.log(' ', k));

console.log('\n=== Diff Value Keys (first 20) ===');
diffValue.slice(0, 20).forEach(d => console.log(' ', d.key));

fs.writeFileSync('scripts/locale-analysis.json', JSON.stringify({
  shared,
  webOnly,
  mobOnly,
  diffValue: diffValue.map(d => d.key),
  diffValueDetails: diffValue,
}, null, 2));
console.log('\nSaved to scripts/locale-analysis.json');
