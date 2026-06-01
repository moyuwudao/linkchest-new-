const babel = require('@babel/core');
const fs = require('fs');

const code = fs.readFileSync('/mnt/d/trae_projects/linkchest/project/apps/mobile/src/lib/i18n.tsx', 'utf8');

const result = babel.transformSync(code, {
  presets: ['module:@react-native/babel-preset'],
  filename: 'src/lib/i18n.tsx',
});

if (result && result.code) {
  const lines = result.code.split('\n');
  console.log('Babel output (lines with locales or json):');
  lines.forEach((line, idx) => {
    if (line.includes('locales') || line.includes('.json')) {
      console.log(`  Line ${idx + 1}: ${line.trim()}`);
    }
  });
} else {
  console.log('Babel transform failed');
}
