const { execSync } = require('child_process');
const localFile = 'D:\\trae_projects\\linkchest\\project\\apps\\api\\src\\test-xhs-single.ts';
execSync(`scp "${localFile}" ubuntu@43.157.240.68:/opt/linkchest/api/project/apps/api/src/test-xhs-single.ts`, { stdio: 'inherit' });
console.log('OK');
