const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { default: toIco } = require('png-to-ico');

const MASTER = path.resolve(__dirname, '../assets/icons/master/icon-master.png');
const MOBILE = path.resolve(__dirname, '../apps/mobile/assets');
const WEB_PUBLIC = path.resolve(__dirname, '../apps/web/public');
const ANDROID_RES = path.resolve(__dirname, '../apps/mobile/android/app/src/main/res');

async function main() {
  // 1. Mobile icon
  await fs.promises.copyFile(MASTER, path.join(MOBILE, 'icon.png'));
  console.log('✓ apps/mobile/assets/icon.png');

  // 2. Mobile splash
  await fs.promises.copyFile(MASTER, path.join(MOBILE, 'splash.png'));
  console.log('✓ apps/mobile/assets/splash.png');

  // 3. Android native splashscreen images
  const androidDirs = ['drawable-mdpi', 'drawable-hdpi', 'drawable-xhdpi', 'drawable-xxhdpi', 'drawable-xxxhdpi'];
  for (const dir of androidDirs) {
    await fs.promises.copyFile(MASTER, path.join(ANDROID_RES, dir, 'splashscreen_image.png'));
    console.log(`✓ android/${dir}/splashscreen_image.png`);
  }

  // 4. adaptive-icon.png (transparent background)
  const { data, info } = await sharp(MASTER).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const BG_R = 255, BG_G = 255, BG_B = 255;
  const TOLERANCE = 45;
  const FEATHER = 25;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const dist = Math.sqrt((r - BG_R) ** 2 + (g - BG_G) ** 2 + (b - BG_B) ** 2);
    if (dist < TOLERANCE) {
      data[i + 3] = 0;
    } else if (dist < TOLERANCE + FEATHER) {
      data[i + 3] = Math.round(((dist - TOLERANCE) / FEATHER) * 255);
    }
  }
  await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(path.join(MOBILE, 'adaptive-icon.png'));
  console.log('✓ apps/mobile/assets/adaptive-icon.png');

  // 5. Web public icons
  const webFiles = [
    'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png',
    'icon-192x192.png', 'icon-256x256.png', 'icon-384x384.png', 'icon-512x512.png',
  ];
  for (const f of webFiles) {
    await fs.promises.copyFile(path.resolve(__dirname, '../assets/icons/web', f), path.join(WEB_PUBLIC, f));
    console.log(`✓ apps/web/public/${f}`);
  }

  // 6. logo.png (transparent, 192x192)
  await sharp(data, { raw: { width, height, channels: 4 } })
    .resize(192, 192, { fit: 'inside' })
    .png()
    .toFile(path.join(WEB_PUBLIC, 'logo.png'));
  console.log('✓ apps/web/public/logo.png');

  // 7. favicon.ico
  const buf = await toIco([
    path.resolve(__dirname, '../assets/icons/web/favicon-16x16.png'),
    path.resolve(__dirname, '../assets/icons/web/favicon-32x32.png'),
  ]);
  await fs.promises.writeFile(path.join(WEB_PUBLIC, 'favicon.ico'), buf);
  console.log('✓ apps/web/public/favicon.ico');

  console.log('\n✅ All icons synced successfully.');
}

main().catch((err) => { console.error(err); process.exit(1); });
