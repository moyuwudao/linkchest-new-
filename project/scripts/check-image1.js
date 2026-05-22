const sharp = require('sharp');

async function main() {
  // Check icon-extracted-1.png boundaries
  const { data, info } = await sharp('assets/icon-extracted-1.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let nonWhite = 0, nonTransparent = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a > 10) {
        nonTransparent++;
        if (r < 240 || g < 240 || b < 240) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          nonWhite++;
        }
      }
    }
  }
  console.log('icon-extracted-1.png:');
  console.log('  size:', width, 'x', height);
  console.log('  non-transparent:', nonTransparent);
  console.log('  non-white:', nonWhite);
  console.log('  bounds: x=' + minX + '-' + maxX + '(' + (maxX - minX + 1) + '), y=' + minY + '-' + maxY + '(' + (maxY - minY + 1) + ')');

  // Now try center crop to 1024x1024 and check
  const { data: cData, info: cInfo } = await sharp('assets/icon-extracted-1.png')
    .resize(1024, 1024, { fit: 'cover', position: 'center' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cw = cInfo.width, ch = cInfo.height;
  let cminX = cw, cmaxX = 0, cminY = ch, cmaxY = 0;
  let cNonWhite = 0;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      const r = cData[i], g = cData[i + 1], b = cData[i + 2];
      if (r < 240 || g < 240 || b < 240) {
        cminX = Math.min(cminX, x); cmaxX = Math.max(cmaxX, x);
        cminY = Math.min(cminY, y); cmaxY = Math.max(cmaxY, y);
        cNonWhite++;
      }
    }
  }
  console.log('\nCenter-cropped 1024x1024:');
  console.log('  non-white:', cNonWhite);
  console.log('  bounds: x=' + cminX + '-' + cmaxX + '(' + (cmaxX - cminX + 1) + '), y=' + cminY + '-' + cmaxY + '(' + (cmaxY - cminY + 1) + ')');
}

main();
