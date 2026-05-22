const fs = require('fs');
const path = require('path');

const packages = [
  '@tanstack/react-query',
  '@tanstack/query-core',
];

const rootDir = path.resolve(__dirname, '..');
const nodeModulesPaths = [
  path.join(rootDir, 'node_modules'),
  path.join(rootDir, 'apps', 'mobile', 'node_modules'),
];

packages.forEach(pkg => {
  let pkgPath;
  for (const nmPath of nodeModulesPaths) {
    const candidate = path.join(nmPath, pkg, 'package.json');
    if (fs.existsSync(candidate)) {
      pkgPath = candidate;
      break;
    }
  }
  if (!pkgPath) {
    console.warn(`[fix-tanstack] Package not found: ${pkg}`);
    return;
  }

  let content = fs.readFileSync(pkgPath, 'utf8');
  let modified = false;

  // Fix 1: Replace "react-native": "src/index.ts" with .cjs legacy build
  const fixedReactNative = content.replace(
    '"react-native": "src/index.ts"',
    '"react-native": "build/legacy/index.cjs"'
  );
  if (fixedReactNative !== content) {
    content = fixedReactNative;
    modified = true;
    console.log(`[fix-tanstack] Fixed ${pkg} react-native entry → build/legacy/index.cjs`);
  }

  // Fix 2: Replace "react-native": "build/legacy/index.js" with .cjs
  const fixedReactNative2 = content.replace(
    '"react-native": "build/legacy/index.js"',
    '"react-native": "build/legacy/index.cjs"'
  );
  if (fixedReactNative2 !== content) {
    content = fixedReactNative2;
    modified = true;
    console.log(`[fix-tanstack] Fixed ${pkg} react-native entry → build/legacy/index.cjs`);
  }

  // Fix 3: Rewrite exports field to force all conditions to use .cjs legacy build
  // This is critical because Metro resolves via "exports" before "react-native" field.
  try {
    const pkgJson = JSON.parse(content);
    if (pkgJson.exports && pkgJson.exports['.']) {
      const oldExports = JSON.stringify(pkgJson.exports);
      pkgJson.exports['.'] = {
        'react-native': {
          types: './build/legacy/index.d.ts',
          default: './build/legacy/index.cjs'
        },
        import: {
          types: './build/legacy/index.d.ts',
          default: './build/legacy/index.cjs'
        },
        require: {
          types: './build/legacy/index.d.cts',
          default: './build/legacy/index.cjs'
        },
        default: {
          types: './build/legacy/index.d.ts',
          default: './build/legacy/index.cjs'
        }
      };
      const newExports = JSON.stringify(pkgJson.exports);
      if (oldExports !== newExports) {
        content = JSON.stringify(pkgJson, null, 2) + '\n';
        modified = true;
        console.log(`[fix-tanstack] Fixed ${pkg} exports → build/legacy/index.cjs`);
      }
    }
  } catch (e) {
    console.warn(`[fix-tanstack] Failed to parse/rewrite exports for ${pkg}:`, e.message);
  }

  if (modified) {
    fs.writeFileSync(pkgPath, content);
  } else {
    console.log(`[fix-tanstack] ${pkg} already fixed`);
  }
});
