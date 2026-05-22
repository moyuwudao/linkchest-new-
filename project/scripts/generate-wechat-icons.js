const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../project/assets/icons/master/icon-master.png');
const outputDir = path.join(__dirname, '../project/assets/icons/wechat');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('正在读取原始图标...');
  
  // 生成 28x28 像素图标（水印图标）
  await sharp(inputPath)
    .resize(28, 28)
    .png()
    .toFile(path.join(outputDir, 'icon-28x28.png'));
  console.log('✅ 已生成 28x28 像素图标');
  
  // 生成 108x108 像素图标（高清图标）
  await sharp(inputPath)
    .resize(108, 108)
    .png()
    .toFile(path.join(outputDir, 'icon-108x108.png'));
  console.log('✅ 已生成 108x108 像素图标');
  
  // 验证生成的文件
  const files = fs.readdirSync(outputDir);
  files.forEach(file => {
    const stats = fs.statSync(path.join(outputDir, file));
    console.log(`📄 ${file} - ${stats.size} bytes`);
  });
  
  console.log('\n🎉 微信图标生成完成！');
  console.log(`输出目录: ${outputDir}`);
}

generateIcons().catch(err => {
  console.error('❌ 生成图标失败:', err);
  process.exit(1);
});