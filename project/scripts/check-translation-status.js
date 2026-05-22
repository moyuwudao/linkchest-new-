const fs = require('fs');
const path = require('path');

function walk(obj, p, r) {
  for (const k in obj) {
    const np = p ? p + '.' + k : k;
    if (typeof obj[k] === 'string') {
      const v = obj[k].trim();
      if (/^[a-zA-Z\s\{\}\(\)\[\]\:\!\?\.\,\'\"\-\+\/\#0-9]+$/.test(v) && v.length > 3 && !['LinkChest','URL','API','App','OK','ID','MAX','MIN','PC','iOS','VIP','HTML','PDF','CSV','JSON','OAuth','PWA','RSS'].some(w => v.includes(w))) {
        r.push(np + ': ' + v.slice(0, 60));
      }
    } else {
      walk(obj[k], np, r);
    }
  }
}

const files = [
  'apps/web/src/lib/locales/zh.json',
  'apps/web/src/lib/locales/ja.json',
  'apps/web/src/lib/locales/ko.json',
  'apps/web/src/lib/locales/fr.json',
  'apps/web/src/lib/locales/de.json',
  'apps/mobile/src/lib/locales/zh.json',
  'apps/mobile/src/lib/locales/ja.json',
  'apps/mobile/src/lib/locales/ko.json',
  'apps/mobile/src/lib/locales/fr.json',
  'apps/mobile/src/lib/locales/de.json',
];

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  const r = [];
  walk(data, '', r);
  console.log('\n========== ' + f + ' ==========');
  console.log('English-like strings: ' + r.length);
  r.slice(0, 20).forEach(s => console.log('  ' + s));
}
