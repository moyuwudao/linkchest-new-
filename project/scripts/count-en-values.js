const fs = require('fs');
const path = require('path');

const files = [
  'apps/web/src/lib/locales/fr.json',
  'apps/web/src/lib/locales/de.json',
  'apps/mobile/src/lib/locales/ja.json',
  'apps/mobile/src/lib/locales/zh.json',
];

const enPattern = /^[a-zA-Z\s\{\}\(\)\[\]:!?.,'"\-+/#0-9]+$/;
const whitelist = ['LinkChest','URL','API','App','OK','ID','MAX','MIN','PC','iOS','VIP','HTML','PDF','CSV','JSON','OAuth','PWA','RSS','GitHub','Twitter','X','YouTube','Bilibili'];

function walk(obj, cb) {
  for (const k in obj) {
    if (typeof obj[k] === 'string') {
      cb(k, obj[k]);
    } else {
      walk(obj[k], cb);
    }
  }
}

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  let total = 0, en = 0;
  walk(data, (k, v) => {
    total++;
    const t = v.trim();
    if (enPattern.test(t) && t.length > 3 && !whitelist.some(w => t.includes(w))) {
      en++;
    }
  });
  console.log(f.replace(/.*\//, '') + ': ' + en + '/' + total + ' English-like');
}
