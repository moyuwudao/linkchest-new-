const fs = require('fs');
const sharp = require('sharp');

const svgPath = 'c:\\Users\\Mayn\\CodeBuddy\\20260407184558\\assets\\linkchest.svg';
const svgContent = fs.readFileSync(svgPath, 'utf8');
const match = svgContent.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
const base64Data = match[1];
const pngBuffer = Buffer.from(base64Data, 'base64');

// 获取原始图像的raw像素数据
sharp(pngBuffer).raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
    console.log('Image info:', info);
    
    // 统计像素值分布
    const histogram = {};
    for (let i = 0; i < data.length; i += info.channels) {
        // 计算灰度值（如果是RGB，取平均值）
        let grayValue = 0;
        for (let c = 0; c < Math.min(info.channels, 3); c++) {
            grayValue += data[i + c];
        }
        grayValue = Math.round(grayValue / Math.min(info.channels, 3));
        histogram[grayValue] = (histogram[grayValue] || 0) + 1;
    }
    
    // 输出前20个最常见的像素值
    const sorted = Object.entries(histogram).sort((a, b) => b[1] - a[1]).slice(0, 20);
    console.log('Top 20 pixel values:');
    sorted.forEach(([val, count]) => {
        console.log('  Value', val, ':', count, 'pixels');
    });
    
    // 检查几个关键位置的像素值（中心区域和边缘）
    const width = info.width;
    const height = info.height;
    const channels = info.channels;
    
    console.log('\nSample pixels:');
    // 中心点
    const centerIdx = (Math.floor(height/2) * width + Math.floor(width/2)) * channels;
    console.log('Center:', data[centerIdx], data[centerIdx+1], data[centerIdx+2]);
    
    // 左上角
    console.log('Top-left:', data[0], data[1], data[2]);
    
    // 右下角
    const brIdx = ((height-1) * width + (width-1)) * channels;
    console.log('Bottom-right:', data[brIdx], data[brIdx+1], data[brIdx+2]);
    
    // 检查边缘和中心的差异
    let edgeLight = 0;
    let centerDark = 0;
    
    // 采样边缘
    for (let x = 0; x < width; x += 10) {
        const idx = (x) * channels;
        let gray = 0;
        for (let c = 0; c < Math.min(channels, 3); c++) {
            gray += data[idx + c];
        }
        gray = gray / Math.min(channels, 3);
        if (gray > 200) edgeLight++;
    }
    
    // 采样中心区域
    const centerY = Math.floor(height/2);
    const centerX = Math.floor(width/2);
    for (let y = centerY - 50; y < centerY + 50; y += 5) {
        for (let x = centerX - 50; x < centerX + 50; x += 5) {
            const idx = (y * width + x) * channels;
            let gray = 0;
            for (let c = 0; c < Math.min(channels, 3); c++) {
                gray += data[idx + c];
            }
            gray = gray / Math.min(channels, 3);
            if (gray < 100) centerDark++;
        }
    }
    
    console.log('\nEdge light pixels (>200):', edgeLight);
    console.log('Center dark pixels (<100):', centerDark);
    
    if (edgeLight > centerDark) {
        console.log('\nConclusion: Background is LIGHT, Content is DARK');
        console.log('Threshold logic: pixel < 200 = content (white), pixel >= 200 = background (transparent)');
    } else {
        console.log('\nConclusion: Background is DARK, Content is LIGHT');
        console.log('Threshold logic: pixel > 200 = content (white), pixel <= 200 = background (transparent)');
    }
});
