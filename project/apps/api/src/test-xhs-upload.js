const fs = require('fs');
const { execSync } = require('child_process');

const localFile = 'D:\\trae_projects\\linkchest\\project\\apps\\api\\src\\test-xhs-via-service.ts';
console.log('Local exists:', fs.existsSync(localFile));
console.log('Local size:', fs.statSync(localFile).size);

// 使用 scp 而不是 ssh+base64（scp 处理二进制更可靠）
try {
  execSync(`scp "${localFile}" ubuntu@43.157.240.68:/opt/linkchest/api/project/apps/api/src/test-xhs-via-service.ts`, { stdio: 'inherit' });
  console.log('SCP OK');
} catch (e) {
  console.log('SCP failed:', e.message);
}
