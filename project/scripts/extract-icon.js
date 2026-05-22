const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 用户提供的PNG图标路径
const pngPath = 'C:\\Users\\Mayn\\Downloads\\你的段落文字 (1).png';
const outputDir = 'c:\\Users\\Mayn\\CodeBuddy\\20260407184558\\apps\\chrome-extension\\public\\icons';

async function generateIcons() {
    // 读取原始PNG文件
    const inputBuffer = fs.readFileSync(pngPath);
    
    // 获取图像元数据
    const metadata = await sharp(inputBuffer).metadata();
    console.log('Input image:', metadata.width, 'x', metadata.height, 'format:', metadata.format, 'channels:', metadata.channels, 'hasAlpha:', metadata.hasAlpha);

    // 第一步：自动裁剪掉周围的空白/透明区域
    console.log('\nStep 1: Trimming transparent/white edges...');
    const trimmedImage = await sharp(inputBuffer)
        .trim()  // 自动去除边缘的透明或接近白色的像素
        .toBuffer();
    
    const trimmedMetadata = await sharp(trimmedImage).metadata();
    console.log('Trimmed image:', trimmedMetadata.width, 'x', trimmedMetadata.height);
    console.log('Removed blank area around the icon content');

    // 保存裁剪后的图片用于检查
    await sharp(trimmedImage)
        .toFile(path.join(outputDir, 'trimmed-original.png'));

    // 第二步：基于裁剪后的图标生成各尺寸
    const sizes = [
        { name: 'icon16.png', size: 16 },
        { name: 'icon32.png', size: 32 },
        { name: 'icon48.png', size: 48 },
        { name: 'icon128.png', size: 128 }
    ];

    console.log('\nStep 2: Generating icons from trimmed image...');
    for (const icon of sizes) {
        try {
            // 使用 cover 模式填满画布
            await sharp(trimmedImage)
                .resize(icon.size, icon.size, {
                    fit: 'cover',
                    position: 'center',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png({
                    quality: 100,
                    compressionLevel: 9
                })
                .toFile(path.join(outputDir, icon.name));
            
            console.log('Generated:', icon.name, `(${icon.size}×${icon.size})`);
        } catch (err) {
            console.error('Error generating', icon.name, err.message);
        }
    }

    console.log('\n✓ All icons generated from trimmed image!');
    console.log('- Trimmed blank edges first');
    console.log('- Then scaled to fill canvas');
}

generateIcons().catch(err => {
    console.error('Error:', err);
});
