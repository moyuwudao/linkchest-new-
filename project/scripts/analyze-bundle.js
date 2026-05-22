const fs = require('fs');
const b = fs.readFileSync('c:/Users/Mayn/CodeBuddy/20260407184558/apps/mobile/test-bundle-dev.js', 'utf8');

// Find all non-comment lines with "import * as React"
const lines = b.split('\n');
let count = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('import * as React') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
    console.log('Line', i + 1, ':', line.substring(0, 200));
    count++;
    if (count >= 10) break;
  }
}
console.log('Total non-comment import * as React:', count);

// Also search for tanstack module paths
console.log('\n=== @tanstack module references ===');
count = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('tanstack') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
    console.log('Line', i + 1, ':', line.substring(0, 200));
    count++;
    if (count >= 10) break;
  }
}
console.log('Total tanstack references:', count);
