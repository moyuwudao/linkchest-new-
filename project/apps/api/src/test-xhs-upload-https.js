const { execSync } = require('child_process');
const localFile = 'D:\\trae_projects\\linkchest\\project\\apps\\api\\src\\test-xhs-https.js';
execSync(`scp "${localFile}" ubuntu@43.157.240.68:/opt/linkchest/api/project/apps/api/src/test-xhs-https.js`, { stdio: 'inherit' });
console.log('OK');
