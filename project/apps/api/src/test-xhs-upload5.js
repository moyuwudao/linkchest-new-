const { execSync } = require('child_process');
const localFile = 'D:\\trae_projects\\linkchest\\project\\apps\\api\\src\\test-xhs-quick.sh';
// 强制覆盖，并加执行权限
try { execSync(`ssh ubuntu@43.157.240.68 "rm -f /tmp/test-xhs-quick.sh"`, { stdio: 'inherit' }); } catch {}
execSync(`scp -o StrictHostKeyChecking=no "${localFile}" ubuntu@43.157.240.68:/tmp/test-xhs-quick.sh`, { stdio: 'inherit' });
try { execSync(`ssh ubuntu@43.157.240.68 "chmod +x /tmp/test-xhs-quick.sh"`, { stdio: 'inherit' }); } catch {}
console.log('OK');
