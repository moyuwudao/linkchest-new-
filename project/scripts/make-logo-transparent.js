const sharp = require('sharp');
const path = require('path');

const INPUT = path.resolve(__dirname, '../assets/icons/master/icon-master.png');
const OUTPUT = path.resolve(__dirname, '../apps/web/public/logo.png');

// 白色背景
const BG_R = 255, BG_G = 255, BG_B = 255;
const TOLERANCE = 45; // 颜色容差
const FEATHER = 25; // 羽化范围

async function main() {
  const { data, info } = await sharp(INPUT)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dist = Math.sqrt(
      (r - BG_R) ** 2 + (g - BG_G) ** 2 + (b - BG_B) ** 2
    );

    if (dist < TOLERANCE) {
      // 完全透明
      data[i + 3] = 0;
    } else if (dist < TOLERANCE + FEATHER) {
      // 羽化边缘：线性渐变 alpha
      const alpha = Math.round(((dist - TOLERANCE) / FEATHER) * 255);
      data[i + 3] = alpha;
    }
    // 其他像素保持原样
  }

  await sharp(data, { raw: { width, height, channels: 4 } })
    .resize(192, 192, { fit: 'inside' })
    .png()
    .toFile(OUTPUT);

  console.log('✓ Transparent logo generated:', OUTPUT);
}

main().catch(console.error);
