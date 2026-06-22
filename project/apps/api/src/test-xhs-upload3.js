const { execSync } = require('child_process');
const fs = require('fs');

const localFile = 'D:\\trae_projects\\linkchest\\project\\apps\\api\\src\\test-xhs-deep-debug.js';
const content = fs.readFileSync(localFile, 'utf8');
console.log('Local size:', content.length);
// 编译为 JS（保留 const/let 等现代特性，Node 14+ 可用）
execSync(`scp "${localFile}" ubuntu@43.157.240.68:/opt/linkchest/api/project/apps/api/src/test-xhs-deep-debug.js`, { stdio: 'inherit' });
console.log('OK');
