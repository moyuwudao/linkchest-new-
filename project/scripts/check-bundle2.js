const fs = require('fs');
const b = fs.readFileSync('c:/Users/Mayn/CodeBuddy/20260407184558/apps/mobile/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle', 'utf8');

// Search for client.mount or .mount( calls
console.log('=== .mount( search ===');
let idx = 0;
let count = 0;
while ((idx = b.indexOf('.mount(', idx)) >= 0 && count < 10) {
  const ctx = b.substring(Math.max(0, idx - 100), idx + 100);
  console.log('--- offset:', idx);
  console.log(ctx.replace(/\n/g, ' '));
  idx++;
  count++;
}

// Search for QueryClientContext 
console.log('\n=== QueryClientContext search ===');
idx = 0; count = 0;
while ((idx = b.indexOf('QueryClientContext', idx)) >= 0 && count < 5) {
  const ctx = b.substring(Math.max(0, idx - 100), idx + 100);
  console.log('--- offset:', idx);
  console.log(ctx.replace(/\n/g, ' '));
  idx++;
  count++;
}

// Search for "jsx_runtime" which is the CJS indicator
console.log('\n=== jsx_runtime search ===');
idx = 0; count = 0;
while ((idx = b.indexOf('jsx_runtime', idx)) >= 0 && count < 3) {
  const ctx = b.substring(Math.max(0, idx - 50), idx + 50);
  console.log('--- offset:', idx);
  console.log(ctx.replace(/\n/g, ' '));
  idx++;
  count++;
}

// Total file size
console.log('\nBundle size:', b.length);
