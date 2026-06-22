const { execSync } = require('child_process');
const localFile = 'D:\\trae_projects\\linkchest\\project\\apps\\api\\src\\test-xhs-api.sh';
execSync(`scp "${localFile}" ubuntu@43.157.240.68:/tmp/test-xhs-api.sh && chmod +x /tmp/test-xhs-api.sh`, { stdio: 'inherit' });
console.log('OK');
