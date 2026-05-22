const sharp = require('sharp');

async function main() {
  const { data, info } = await sharp('apps/mobile/assets/adaptive-icon.png')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let transparent = 0, dark = 0;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 10) transparent++;
      else if (r < 240 || g < 240 || b < 240) {
        dark++;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
  }
  console.log('adaptive-icon.png 1024x1024:');
  console.log('  transparent:', transparent);
  console.log('  dark:', dark);
  console.log('  dark bounds: x=' + minX + '-' + maxX + ', y=' + minY + '-' + maxY);
  console.log('  dark size: ' + (maxX - minX + 1) + 'x' + (maxY - minY + 1));

  // Sample edge colors
  const mid = Math.floor(width / 2);
  console.log('\nEdge samples:');
  console.log('top center RGBA:', data[mid * 4], data[mid * 4 + 1], data[mid * 4 + 2], data[mid * 4 + 3]);
  console.log('bottom center RGBA:', data[((height - 1) * width + mid) * 4], data[((height - 1) * width + mid) * 4 + 1], data[((height - 1) * width + mid) * 4 + 2], data[((height - 1) * width + mid) * 4 + 3]);
  console.log('left center RGBA:', data[mid * width * 4], data[mid * width * 4 + 1], data[mid * width * 4 + 2], data[mid * width * 4 + 3]);
  console.log('right center RGBA:', data[(mid * width + width - 1) * 4], data[(mid * width + width - 1) * 4 + 1], data[(mid * width + width - 1) * 4 + 2], data[(mid * width + width - 1) * 4 + 3]);
}

main();
