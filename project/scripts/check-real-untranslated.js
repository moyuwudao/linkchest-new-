const fs = require('fs');

function walk(obj, p, cb) {
  for (const k in obj) {
    const np = p ? p + '.' + k : k;
    if (typeof obj[k] === 'string') cb(np, obj[k]);
    else walk(obj[k], np, cb);
  }
}

const whitelist = new Set(['LinkChest','URL','API','App','OK','ID','MAX','MIN','PC','iOS','VIP','HTML','PDF','CSV','JSON','OAuth','PWA','RSS','SEO','OG','GitHub','Twitter','X','YouTube','Bilibili','TikTok','Amazon','Vercel','CloudBase','Supabase','Prisma','Next.js','React','Node.js','JavaScript','TypeScript','PayPal','Pro']);

const files = [
  ['apps/web/src/lib/locales/en.json', 'apps/web/src/lib/locales/ko.json', 'WEB ko'],
  ['apps/web/src/lib/locales/en.json', 'apps/web/src/lib/locales/fr.json', 'WEB fr'],
  ['apps/web/src/lib/locales/en.json', 'apps/web/src/lib/locales/de.json', 'WEB de'],
  ['apps/mobile/src/lib/locales/en.json', 'apps/mobile/src/lib/locales/ko.json', 'MOBILE ko'],
  ['apps/mobile/src/lib/locales/en.json', 'apps/mobile/src/lib/locales/fr.json', 'MOBILE fr'],
  ['apps/mobile/src/lib/locales/en.json', 'apps/mobile/src/lib/locales/de.json', 'MOBILE de'],
];

for (const [enPath, targetPath, label] of files) {
  const en = JSON.parse(fs.readFileSync(enPath));
  const target = JSON.parse(fs.readFileSync(targetPath));
  const enFlat = {};
  walk(en, '', (k, v) => enFlat[k] = v);
  
  let untranslated = 0;
  const samples = [];
  walk(target, '', (k, v) => {
    if (enFlat[k] === v && !whitelist.has(v.trim())) {
      untranslated++;
      if (samples.length < 10) samples.push(k + ': ' + v.slice(0, 60));
    }
  });
  console.log(`${label}: ${untranslated} truly untranslated keys`);
  samples.forEach(s => console.log('  ' + s));
  console.log('');
}
