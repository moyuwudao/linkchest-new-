const fs = require('fs');
const path = require('path');

const zhPath = path.join(__dirname, '../docs/terms/privacy-policy-zh.md');
const enPath = path.join(__dirname, '../docs/terms/privacy-policy-en.md');
const outPath = path.join(__dirname, '../apps/mobile/src/screens/privacy-content.json');

const zh = fs.readFileSync(zhPath, 'utf-8');
const en = fs.readFileSync(enPath, 'utf-8');

const out = {
  zh: zh.replace(/\r?\n/g, '\r\n'),
  en: en.replace(/\r?\n/g, '\r\n'),
};

fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log('Generated privacy-content.json');
