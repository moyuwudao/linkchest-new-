const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 用户提供的PNG图标路径
const pngPath = 'C:\\Users\\Mayn\\Downloads\\你的段落文字 (1).png';
const basePath = 'c:\\Users\\Mayn\\CodeBuddy\\20260407184558\\assets\\icons';

async function generateAllIcons() {
    // 读取原始PNG文件
    const inputBuffer = fs.readFileSync(pngPath);
    
    // 获取图像元数据
    const metadata = await sharp(inputBuffer).metadata();
    console.log('Input image:', metadata.width, 'x', metadata.height);
    console.log('hasAlpha:', metadata.hasAlpha);

    // 第一步：自动裁剪掉周围的空白/透明区域
    console.log('\nStep 1: Trimming transparent/white edges...');
    const trimmedImage = await sharp(inputBuffer)
        .trim()
        .toBuffer();
    
    const trimmedMetadata = await sharp(trimmedImage).metadata();
    console.log('Trimmed image:', trimmedMetadata.width, 'x', trimmedMetadata.height);

    // 定义所有需要生成的图标
    const iconConfigs = [
        // ===== WEB 端图标 =====
        { path: 'web/favicon-16x16.png', size: 16 },
        { path: 'web/favicon-32x32.png', size: 32 },
        { path: 'web/icon-192x192.png', size: 192 },
        { path: 'web/icon-256x256.png', size: 256 },
        { path: 'web/icon-384x384.png', size: 384 },
        { path: 'web/icon-512x512.png', size: 512 },
        { path: 'web/apple-touch-icon.png', size: 180 },
        
        // ===== Android 图标 =====
        { path: 'android/mipmap-mdpi/ic_launcher.png', size: 48 },      // mdpi
        { path: 'android/mipmap-hdpi/ic_launcher.png', size: 72 },     // hdpi
        { path: 'android/mipmap-xhdpi/ic_launcher.png', size: 96 },     // xhdpi
        { path: 'android/mipmap-xxhdpi/ic_launcher.png', size: 144 },   // xxhdpi
        { path: 'android/mipmap-xxxhdpi/ic_launcher.png', size: 192 },  // xxxhdpi
        
        // ===== iOS 图标 =====
        { path: 'ios/AppIcon-20x20@2x.png', size: 40 },
        { path: 'ios/AppIcon-20x20@3x.png', size: 60 },
        { path: 'ios/AppIcon-29x29@2x.png', size: 58 },
        { path: 'ios/AppIcon-29x29@3x.png', size: 87 },
        { path: 'ios/AppIcon-40x40@2x.png', size: 80 },
        { path: 'ios/AppIcon-40x40@3x.png', size: 120 },
        { path: 'ios/AppIcon-60x60@2x.png', size: 120 },
        { path: 'ios/AppIcon-60x60@3x.png', size: 180 },
        { path: 'ios/AppIcon-76x76@2x.png', size: 152 },
        { path: 'ios/AppIcon-83.5x83.5@2x.png', size: 167 },
        { path: 'ios/AppIcon-1024x1024@1x.png', size: 1024 },
        
        // ===== Master 图标 =====
        { path: 'master/icon-master.png', size: 512 }
    ];

    console.log('\nStep 2: Generating all icons...');
    
    let successCount = 0;
    let errorCount = 0;

    for (const config of iconConfigs) {
        try {
            const outputPath = path.join(basePath, config.path);
            
            // 确保目录存在
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // 使用 cover 模式生成图标
            await sharp(trimmedImage)
                .resize(config.size, config.size, {
                    fit: 'cover',
                    position: 'center',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png({
                    quality: 100,
                    compressionLevel: 9
                })
                .toFile(outputPath);
            
            console.log('✓', config.path, `(${config.size}×${config.size})`);
            successCount++;
        } catch (err) {
            console.error('✗ Error generating', config.path, err.message);
            errorCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✓ Generation complete!`);
    console.log(`  Success: ${successCount} icons`);
    console.log(`  Errors: ${errorCount} icons`);
    console.log('='.repeat(50));
}

generateAllIcons().catch(err => {
    console.error('Error:', err);
});
