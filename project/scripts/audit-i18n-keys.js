#!/usr/bin/env node
/**
 * I18N Key Audit Script
 * Extracts all translation keys from source code and checks against locale files
 */

const fs = require('fs');
const path = require('path');

// --- Config ---
const PLATFORMS = [
  {
    name: 'web',
    srcDir: 'apps/web/src',
    localeDir: 'apps/web/src/lib/locales',
    localePattern: /\.(json)$/,
    // Match t('key') or t("key") or t(`key`)
    keyRegex: /\bt\(['"`]([a-zA-Z0-9_\.\-]+)['"`]/g,
  },
  {
    name: 'mobile',
    srcDir: 'apps/mobile/src',
    localeDir: 'apps/mobile/src/lib/locales',
    localePattern: /\.(json)$/,
    keyRegex: /\bt\(['"`]([a-zA-Z0-9_\.\-]+)['"`]/g,
  },
  {
    name: 'chrome',
    srcDir: 'apps/chrome-extension/src',
    localeDir: null, // Chrome extension uses inline translations in lib/i18n.ts
    keyRegex: /\bt\(['"`]([a-zA-Z0-9_\.\-]+)['"`]/g,
  }
];

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

// --- Helpers ---
function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, dist, etc.
      if (['node_modules', 'dist', 'build', '.next', 'out'].includes(entry.name)) continue;
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  }
}

function extractKeysFromFile(filePath, regex) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys = new Set();
  let match;
  while ((match = regex.exec(content)) !== null) {
    keys.add(match[1]);
  }
  return Array.from(keys);
}

function flattenKeys(obj, prefix = '') {
  const keys = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sub of flattenKeys(v, fullKey)) keys.add(sub);
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

// --- Main ---
const rootDir = path.resolve(__dirname, '..');

for (const platform of PLATFORMS) {
  console.log(`\n========== ${platform.name.toUpperCase()} PLATFORM ==========\n`);

  const srcDir = path.join(rootDir, platform.srcDir);
  const usedKeys = new Map(); // key -> Set of file paths

  // 1. Extract keys from source
  walkDir(srcDir, (filePath) => {
    const ext = path.extname(filePath);
    if (!EXTENSIONS.includes(ext)) return;

    const keys = extractKeysFromFile(filePath, platform.keyRegex);
    for (const key of keys) {
      if (!usedKeys.has(key)) usedKeys.set(key, new Set());
      usedKeys.get(key).add(path.relative(rootDir, filePath));
    }
  });

  // Also search for hardcoded Chinese / English strings that should be translated
  // (This is a secondary check, we'll report obvious hardcoded UI strings)

  if (platform.localeDir) {
    const localeDir = path.join(rootDir, platform.localeDir);
    const localeFiles = fs.readdirSync(localeDir).filter(f => platform.localePattern.test(f));
    const localeData = {};
    const allLocaleKeys = new Set();

    for (const lf of localeFiles) {
      const lang = path.basename(lf, path.extname(lf));
      const content = JSON.parse(fs.readFileSync(path.join(localeDir, lf), 'utf-8'));
      localeData[lang] = content;
      const keys = flattenKeys(content);
      for (const k of keys) allLocaleKeys.add(k);
    }

    // Find used keys that are NOT in ANY locale file
    const missingGlobally = [];
    for (const [key, files] of usedKeys) {
      if (!allLocaleKeys.has(key)) {
        missingGlobally.push({ key, files: Array.from(files) });
      }
    }

    if (missingGlobally.length > 0) {
      console.log(`❌ KEYS USED IN CODE BUT MISSING FROM ALL LOCALE FILES (${missingGlobally.length}):`);
      for (const { key, files } of missingGlobally) {
        console.log(`   - "${key}"`);
        for (const f of files.slice(0, 3)) {
          console.log(`       in ${f}`);
        }
        if (files.length > 3) console.log(`       ... and ${files.length - 3} more file(s)`);
      }
    } else {
      console.log('✅ All used keys exist in at least one locale file.');
    }

    // Find keys missing per locale
    console.log('\n📋 PER-LOCALE MISSING KEYS:');
    for (const lf of localeFiles) {
      const lang = path.basename(lf, path.extname(lf));
      const localeKeys = flattenKeys(localeData[lang]);
      const missing = [];
      for (const [key] of usedKeys) {
        if (!localeKeys.has(key)) missing.push(key);
      }
      if (missing.length > 0) {
        console.log(`   [${lang}] Missing ${missing.length} keys:`);
        for (const k of missing.slice(0, 20)) {
          console.log(`      - ${k}`);
        }
        if (missing.length > 20) console.log(`      ... and ${missing.length - 20} more`);
      } else {
        console.log(`   [${lang}] ✅ Complete`);
      }
    }

    // Find locale keys never used in code (orphaned)
    const orphaned = [];
    for (const k of allLocaleKeys) {
      if (!usedKeys.has(k)) orphaned.push(k);
    }
    if (orphaned.length > 0) {
      console.log(`\n🧹 ORPHANED KEYS (in locale files but never used in code) (${orphaned.length}):`);
      for (const k of orphaned.slice(0, 20)) {
        console.log(`   - ${k}`);
      }
      if (orphaned.length > 20) console.log(`   ... and ${orphaned.length - 20} more`);
    }

  } else {
    // Chrome extension: inline translations
    const i18nFile = path.join(rootDir, platform.srcDir, 'lib', 'i18n.ts');
    if (fs.existsSync(i18nFile)) {
      const content = fs.readFileSync(i18nFile, 'utf-8');
      // Extract keys from the translations object roughly
      const definedKeys = new Set();
      // Match quoted keys: 'key': or "key":
      const keyDefRegex = /['"`]([a-zA-Z0-9_\.\-]+)['"`]\s*:/g;
      let m;
      while ((m = keyDefRegex.exec(content)) !== null) {
        definedKeys.add(m[1]);
      }
      // Match unquoted JS object literal keys (Chrome extension style)
      const jsKeywords = new Set(['const','let','var','function','return','if','else','for','while','switch','case','break','continue','new','this','typeof','instanceof','export','import','default','from','as','interface','type','class','extends','implements','public','private','protected','static','async','await','try','catch','finally','throw','yield','void','delete','in','of','with','do','debugger','super','true','false','null','undefined','Record','string','number','boolean','any','unknown','never']);
      const unquotedRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
      while ((m = unquotedRegex.exec(content)) !== null) {
        if (!jsKeywords.has(m[1])) {
          definedKeys.add(m[1]);
        }
      }

      const missing = [];
      for (const [key, files] of usedKeys) {
        if (!definedKeys.has(key)) {
          missing.push({ key, files: Array.from(files) });
        }
      }

      if (missing.length > 0) {
        console.log(`❌ KEYS USED BUT NOT DEFINED in ${path.relative(rootDir, i18nFile)} (${missing.length}):`);
        for (const { key, files } of missing) {
          console.log(`   - "${key}" in ${files.join(', ')}`);
        }
      } else {
        console.log('✅ All used keys exist in inline translations.');
      }
    }
  }
}

// Also check packages/i18n error codes used by api.ts
console.log(`\n========== SHARED ERROR CODES (packages/i18n) ==========\n`);
const errorDir = path.join(rootDir, 'packages', 'i18n', 'src');
if (fs.existsSync(errorDir)) {
  const errorFiles = fs.readdirSync(errorDir).filter(f => f.startsWith('error.'));
  const allErrorKeys = new Set();
  const errorData = {};
  for (const ef of errorFiles) {
    const lang = ef.match(/error\.(\w+)\.ts/)?.[1];
    if (!lang) continue;
    const content = fs.readFileSync(path.join(errorDir, ef), 'utf-8');
    // Extract ERROR_CODES keys
    const keyRegex = /(\w+):\s*['"`]/g;
    const keys = new Set();
    let m;
    while ((m = keyRegex.exec(content)) !== null) {
      keys.add(m[1]);
      allErrorKeys.add(m[1]);
    }
    errorData[lang] = keys;
  }

  // Check api.ts for getErrorMessage usage
  const apiFile = path.join(rootDir, 'apps/web/src/lib/api.ts');
  if (fs.existsSync(apiFile)) {
    const apiContent = fs.readFileSync(apiFile, 'utf-8');
    const errRegex = /getErrorMessage\(['"`]([a-zA-Z0-9_\.\-]+)['"`]/g;
    const usedErrorCodes = new Set();
    let m;
    while ((m = errRegex.exec(apiContent)) !== null) {
      usedErrorCodes.add(m[1]);
    }

    const missingErrors = [];
    for (const code of usedErrorCodes) {
      if (!allErrorKeys.has(code)) missingErrors.push(code);
    }
    if (missingErrors.length > 0) {
      console.log(`❌ Error codes used in api.ts but missing from packages/i18n (${missingErrors.length}):`);
      for (const c of missingErrors) console.log(`   - ${c}`);
    } else {
      console.log('✅ All error codes used in api.ts exist in packages/i18n.');
    }
  }
}

console.log('\n========== DONE ==========\n');
