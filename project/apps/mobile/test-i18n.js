const en = require('./src/lib/locales/en.json');
const zh = require('./src/lib/locales/zh.json');

function flatten(obj, prefix = '') {
  const result = {};
  if (!obj || typeof obj !== 'object') return result;
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (value && typeof value === 'object') {
      Object.assign(result, flatten(value, fullKey));
    }
  }
  return result;
}

const enFlat = flatten(en);
const zhFlat = flatten(zh);

console.log('=== en.json ===');
console.log('tier.pro:', enFlat['tier.pro']);
console.log('tier.super:', enFlat['tier.super']);
console.log('tier.perMonth:', enFlat['tier.perMonth']);

console.log('\n=== zh.json ===');
console.log('tier.pro:', zhFlat['tier.pro']);
console.log('tier.super:', zhFlat['tier.super']);
console.log('tier.perMonth:', zhFlat['tier.perMonth']);
