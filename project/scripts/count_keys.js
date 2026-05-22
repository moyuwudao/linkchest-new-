const fs = require('fs');
const files = [
  'apps/web/src/lib/locales/zh.json',
  'apps/web/src/lib/locales/ja.json',
  'apps/web/src/lib/locales/fr.json',
  'apps/web/src/lib/locales/de.json',
  'apps/web/src/lib/locales/ko.json',
  'apps/mobile/src/lib/locales/zh.json',
  'apps/mobile/src/lib/locales/ja.json',
  'apps/mobile/src/lib/locales/fr.json',
  'apps/mobile/src/lib/locales/de.json',
  'apps/mobile/src/lib/locales/ko.json'
];
const count = (json) => {
  let n = 0;
  for (const k in json) {
    if (typeof json[k] === 'object' && json[k] !== null) n += count(json[k]);
    else n++;
  }
  return n;
};
files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log(f + ': ' + count(data));
});
