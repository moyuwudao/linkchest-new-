const fs = require('fs');

function walk(obj, p, cb) {
  for (const k in obj) {
    const np = p ? p + '.' + k : k;
    if (typeof obj[k] === 'string') cb(np, obj[k]);
    else walk(obj[k], np, cb);
  }
}

const en = JSON.parse(fs.readFileSync('apps/web/src/lib/locales/en.json'));
const fr = JSON.parse(fs.readFileSync('apps/web/src/lib/locales/fr.json'));
const enFlat = {};
walk(en, '', (k, v) => enFlat[k] = v);

const samples = [];
walk(fr, '', (k, v) => {
  const t = v.trim();
  if (/^[a-zA-Z\s]{4,}$/.test(t) && enFlat[k] && enFlat[k] !== v) {
    samples.push(k + ': fr="' + v + '" en="' + enFlat[k] + '"');
  }
});
console.log('Mismatched English-like values (first 30):');
console.log(samples.slice(0, 30).join('\n'));

// Also check: keys in fr but NOT in en
const frFlat = {};
walk(fr, '', (k, v) => frFlat[k] = v);
const missingInEn = [];
for (const k in frFlat) {
  if (!enFlat[k]) missingInEn.push(k + ': ' + frFlat[k]);
}
console.log('\nKeys in fr but NOT in en (first 20):');
console.log(missingInEn.slice(0, 20).join('\n'));
