const fs = require('fs');
const b = fs.readFileSync('c:/Users/Mayn/CodeBuddy/20260407184558/apps/mobile/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle', 'utf8');

// Search for .mount() calls
let idx = b.indexOf('.mount()');
let count = 0;
while (idx >= 0 && count < 10) {
  const ctx = b.substring(Math.max(0, idx - 150), idx + 80);
  console.log('--- offset:', idx);
  console.log(ctx);
  idx = b.indexOf('.mount()', idx + 1);
  count++;
}

// Also check for __toESM pattern (CJS indicator)
console.log('\n\n=== __toESM count ===');
let esmCount = 0;
let esmIdx = 0;
while ((esmIdx = b.indexOf('__toESM', esmIdx)) >= 0) {
  esmCount++;
  esmIdx++;
}
console.log('__toESM occurrences:', esmCount);

// Check for our custom QueryClientProvider
console.log('\n=== Custom Provider markers ===');
const customIdx = b.indexOf('CustomProvider');
if (customIdx >= 0) {
  console.log('CustomProvider found at:', customIdx);
  console.log(b.substring(Math.max(0, customIdx - 100), customIdx + 200));
} else {
  console.log('CustomProvider NOT found in bundle');
}

// Check for the shim module
const shimIdx = b.indexOf('react-query');
if (shimIdx >= 0) {
  console.log('\nreact-query string found at:', shimIdx);
}
