const fs = require('fs');
const { execSync } = require('child_process');

const localFile = 'D:\\trae_projects\\linkchest\\project\\apps\\api\\src\\test-xhs-deep-debug.ts';
execSync(`scp "${localFile}" ubuntu@43.157.240.68:/opt/linkchest/api/project/apps/api/src/test-xhs-deep-debug.ts`, { stdio: 'inherit' });
console.log('OK');
