const fs = require('fs');
const sharp = require('sharp');

const svgPath = 'C:\\Users\\Mayn\\Downloads\\你的段落文字.svg';
const svgContent = fs.readFileSync(svgPath, 'utf8');
const match = svgContent.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
const base64Data = match[1];
const pngBuffer = Buffer.from(base64Data, 'base64');

console.log('Extracted PNG size:', pngBuffer.length, 'bytes');

// 获取原始图像的raw像素数据
sharp(pngBuffer).raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
    console.log('Image info:', info);
    
    const width = info.width;
    const height = info.height;
    const channels = info.channels;
    
    // 检查关键位置的像素值
    console.log('\n=== 像素采样 ===');
    
    // 四个角
    const topLeftIdx = 0;
    const topRightIdx = (width - 1) * channels;
    const bottomLeftIdx = ((height - 1) * width) * channels;
    const bottomRightIdx = ((height - 1) * width + (width - 1)) * channels;
    
    console.log('\n四角像素（应该是黑边）:');
    console.log('左上角 (0,0):', data[topLeftIdx], data[topLeftIdx+1], data[topLeftIdx+2]);
    console.log('右上角 (width-1,0):', data[topRightIdx], data[topRightIdx+1], data[topRightIdx+2]);
    console.log('左下角 (0,height-1):', data[bottomLeftIdx], data[bottomLeftIdx+1], data[bottomLeftIdx+2]);
    console.log('右下角:', data[bottomRightIdx], data[bottomRightIdx+1], data[bottomRightIdx+2]);
    
    // 中心区域
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const centerIdx = (centerY * width + centerX) * channels;
    console.log('\n中心像素（应该是图标内容）:');
    console.log('中心 (centerX,centerY):', data[centerIdx], data[centerIdx+1], data[centerIdx+2]);
    
    // 统计像素值分布
    const histogram = {};
    for (let i = 0; i < data.length; i += channels) {
        let grayValue = 0;
        for (let c = 0; c < Math.min(channels, 3); c++) {
            grayValue += data[i + c];
        }
        grayValue = Math.round(grayValue / Math.min(channels, 3));
        histogram[grayValue] = (histogram[grayValue] || 0) + 1;
    }
    
    console.log('\n=== 像素值分布（Top 10）===');
    const sorted = Object.entries(histogram)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    sorted.forEach(([val, count]) => {
        const percentage = (count / (width * height) * 100).toFixed(2);
        console.log(`值 ${val}: ${count} 像素 (${percentage}%)`);
    });
    
    // 结论
    console.log('\n=== 分析结论 ===');
    const cornerAvg = (data[topLeftIdx] + data[topRightIdx] + data[bottomLeftIdx] + data[bottomRightIdx]) / 4;
    const centerVal = data[centerIdx];
    
    if (cornerAvg < 128 && centerVal > 200) {
        console.log('✓ 四角是深色（黑边），中心是浅色（图标内容）');
        console.log('处理策略：深色(<128)→透明，浅色(>200)→白色不透明');
    } else if (cornerAvg > 200 && centerVal < 128) {
        console.log('✓ 四角是浅色（背景），中心是深色（图标内容）');
        console.log('处理策略：深色(<128)→白色不透明，浅色(>200)→透明');
    } else {
        console.log('? 需要进一步分析');
        console.log('四角平均值:', cornerAvg.toFixed(0));
        console.log('中心值:', centerVal);
    }
});
