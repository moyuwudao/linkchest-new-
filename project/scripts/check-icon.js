const sharp = require('sharp');

async function check(path) {
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let nonWhite = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r < 240 || g < 240 || b < 240) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        nonWhite++;
      }
    }
  }
  console.log(`\n${path}`);
  console.log(`  size: ${width}x${height}`);
  console.log(`  non-white pixels: ${nonWhite}`);
  console.log(`  bounds: x=${minX}-${maxX}(${maxX - minX + 1}), y=${minY}-${maxY}(${maxY - minY + 1})`);
  console.log(`  center: (${(minX + maxX) / 2}, ${(minY + maxY) / 2})`);
}

(async () => {
  await check('assets/icons/master/icon-master.png');
  await check('assets/icons/web/icon-192x192.png');
  await check('assets/icons/ios/AppIcon-1024x1024@1x.png');
  await check('apps/mobile/assets/icon.png');
  await check('apps/web/public/icon-192x192.png');
})();
