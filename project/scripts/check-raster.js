const sharp = require('sharp');

async function main() {
  const { data, info } = await sharp('assets/icon-extracted-1.png')
    .resize(2048, 2048, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let nonWhite = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a > 10 && (r < 245 || g < 245 || b < 245)) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        nonWhite++;
      }
    }
  }
  console.log('Raster 2021x2048:');
  console.log('  non-white:', nonWhite);
  console.log('  bounds: x=' + minX + '-' + maxX + '(' + (maxX - minX + 1) + '), y=' + minY + '-' + maxY + '(' + (maxY - minY + 1) + ')');
  console.log('  center: (' + (minX + maxX) / 2 + ', ' + (minY + maxY) / 2 + ')');

  // Check the original extracted PNG
  const { data: oData, info: oInfo } = await sharp('assets/icon-extracted-1.png')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ow = oInfo.width, oh = oInfo.height;
  let ominX = ow, omaxX = 0, ominY = oh, omaxY = 0;
  let oNonWhite = 0;
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const i = (y * ow + x) * 4;
      const r = oData[i], g = oData[i + 1], b = oData[i + 2], a = oData[i + 3];
      if (a > 10 && (r < 245 || g < 245 || b < 245)) {
        ominX = Math.min(ominX, x); omaxX = Math.max(omaxX, x);
        ominY = Math.min(ominY, y); omaxY = Math.max(omaxY, y);
        oNonWhite++;
      }
    }
  }
  console.log('\nOriginal extracted 1214x1230:');
  console.log('  non-white:', oNonWhite);
  console.log('  bounds: x=' + ominX + '-' + omaxX + '(' + (omaxX - ominX + 1) + '), y=' + ominY + '-' + omaxY + '(' + (omaxY - ominY + 1) + ')');
  console.log('  center: (' + (ominX + omaxX) / 2 + ', ' + (ominY + omaxY) / 2 + ')');
}

main();
