const sharp = require('sharp');

async function check(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let nonWhite = 0, nonTransparent = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a > 10) {
        nonTransparent++;
        if (r < 245 || g < 245 || b < 245) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          nonWhite++;
        }
      }
    }
  }
  console.log(`\n${path}`);
  console.log(`  size: ${width}x${height}`);
  console.log(`  non-transparent: ${nonTransparent}`);
  console.log(`  non-white pixels: ${nonWhite}`);
  console.log(`  bounds: x=${minX}-${maxX}(${maxX - minX + 1}), y=${minY}-${maxY}(${maxY - minY + 1})`);
  console.log(`  center: (${(minX + maxX) / 2}, ${(minY + maxY) / 2})`);
}

(async () => {
  await check('assets/icon-extracted-0.png');
  await check('assets/icon-extracted-1.png');
})();
