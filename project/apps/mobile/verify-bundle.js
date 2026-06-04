const fs = require('fs');
const path = require('path');

const globalBundle = fs.readFileSync(path.join(__dirname, 'android/app/build/generated/assets/createBundleGlobalReleaseJsAndAssets/index.android.bundle'), 'utf8');
const chinaBundle = fs.readFileSync(path.join(__dirname, 'android/app/build/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle'), 'utf8');

function findConfig(bundle, label) {
  // 包名已统一为 com.linkchest.app（与软著登记一致）
  const patterns = ['com.linkchest.app'];
  for (const p of patterns) {
    const idx = bundle.indexOf(p);
    if (idx >= 0) {
      const context = bundle.substring(Math.max(0, idx - 80), idx + p.length + 80);
      console.log(`\n${label} - "${p}" at ${idx}:`);
      console.log('  ...' + context.replace(/\n/g, ' ') + '...');
    }
  }

  // 搜索 usesCleartextTraffic
  const cleartext = bundle.indexOf('usesCleartextTraffic');
  if (cleartext >= 0) {
    console.log(`\n${label} - usesCleartextTraffic found at ${cleartext}`);
  } else {
    console.log(`\n${label} - usesCleartextTraffic NOT found in JS bundle (expected, it's Android native)`);
  }
}

findConfig(globalBundle, 'GLOBAL');
findConfig(chinaBundle, 'CHINA');

// 检查两个 bundle 是否完全相同
if (globalBundle === chinaBundle) {
  console.log('\n⚠️  WARNING: Global and China bundles are IDENTICAL!');
} else {
  console.log('\n✅ Global and China bundles are DIFFERENT (correct!)');
  // 找出不同的部分
  const len = Math.min(globalBundle.length, chinaBundle.length);
  let diffCount = 0;
  let firstDiff = -1;
  for (let i = 0; i < len; i++) {
    if (globalBundle[i] !== chinaBundle[i]) {
      diffCount++;
      if (firstDiff === -1) firstDiff = i;
    }
  }
  console.log(`  Different characters: ${diffCount}`);
  if (firstDiff >= 0) {
    console.log(`  First diff at position ${firstDiff}:`);
    console.log(`  Global: ...${globalBundle.substring(firstDiff - 30, firstDiff + 50)}...`);
    console.log(`  China:  ...${chinaBundle.substring(firstDiff - 30, firstDiff + 50)}...`);
  }
}
