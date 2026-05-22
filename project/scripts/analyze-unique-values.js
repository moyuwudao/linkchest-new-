const fs = require('fs');

function walk(obj, cb) {
  for (const k in obj) {
    if (typeof obj[k] === 'string') cb(obj[k]);
    else walk(obj[k], cb);
  }
}

const whitelist = ['LinkChest','URL','API','App','OK','ID','MAX','MIN','PC','iOS','VIP','HTML','PDF','CSV','JSON','OAuth','PWA','RSS','GitHub','Twitter','X','YouTube','Bilibili'];
const enPattern = /^[a-zA-Z\s\{\}\(\)\[\]:!?.,'"\-+\/#0-9]+$/;

const files = [
  'apps/web/src/lib/locales/ko.json',
  'apps/web/src/lib/locales/fr.json',
  'apps/web/src/lib/locales/de.json',
  'apps/mobile/src/lib/locales/ko.json',
  'apps/mobile/src/lib/locales/fr.json',
  'apps/mobile/src/lib/locales/de.json',
];

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  const unique = new Set();
  walk(data, v => {
    const t = v.trim();
    if (t.length > 3 && enPattern.test(t) && !whitelist.some(w => t.includes(w))) {
      unique.add(t);
    }
  });
  console.log(f.replace(/.*\//, '') + ': ' + unique.size + ' unique values');
}
