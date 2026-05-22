const pkg = require('c:/Users/Mayn/CodeBuddy/20260407184558/node_modules/@tanstack/query-core/package.json');
console.log('react-native:', pkg['react-native']);
console.log('exports["."]:', JSON.stringify(pkg.exports && pkg.exports['.'], null, 2));
