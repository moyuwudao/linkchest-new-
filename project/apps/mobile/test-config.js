// 验证 app.config.js 是否正确读取 .env.market
const fs = require('fs');
const path = require('path');

// 写入 china
fs.writeFileSync(path.join(__dirname, '.env.market'), 'china');
delete require.cache[require.resolve('./app.config.js')];
const chinaConfig = require('./app.config.js');
console.log('CHINA market:', chinaConfig.default?.expo?.extra?.market);
console.log('CHINA package:', chinaConfig.default?.expo?.android?.package);
console.log('CHINA cleartext:', chinaConfig.default?.expo?.android?.usesCleartextTraffic);

// 写入 global
fs.writeFileSync(path.join(__dirname, '.env.market'), 'global');
delete require.cache[require.resolve('./app.config.js')];
const globalConfig = require('./app.config.js');
console.log('GLOBAL market:', globalConfig.default?.expo?.extra?.market);
console.log('GLOBAL package:', globalConfig.default?.expo?.android?.package);
console.log('GLOBAL cleartext:', globalConfig.default?.expo?.android?.usesCleartextTraffic);
