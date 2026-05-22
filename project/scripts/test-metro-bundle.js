const { execSync } = require('child_process');
const path = require('path');

const rootDir = 'c:/Users/Mayn/CodeBuddy/20260407184558/apps/mobile';

// Run Metro bundler directly with verbose output
try {
  const cmd = `npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output ${rootDir}/test-bundle.js --assets-dest ${rootDir}/test-assets --config ${rootDir}/metro.config.js --verbose 2>&1`;
  console.log('Running:', cmd);
  const output = execSync(cmd, {
    cwd: rootDir,
    env: {
      ...process.env,
      NODE_PATH: `${rootDir}/node_modules;c:/Users/Mayn/CodeBuddy/20260407184558/node_modules`,
    },
    maxBuffer: 50 * 1024 * 1024,
    encoding: 'utf8',
    timeout: 300000,
  });
  console.log(output.substring(0, 5000));
} catch (e) {
  console.log('STDOUT:', (e.stdout || '').substring(0, 5000));
  console.log('STDERR:', (e.stderr || '').substring(0, 5000));
}
