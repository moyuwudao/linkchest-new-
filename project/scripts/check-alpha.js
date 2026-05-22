const sharp = require('sharp');

async function main() {
  const { data, info } = await sharp('assets/icons/master/icon-master.png')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  let transparent = 0, white = 0, dark = 0;
  let minX = width, maxX = 0, minY = height, maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 10) {
        transparent++;
      } else if (r > 240 && g > 240 && b > 240) {
        white++;
      } else {
        dark++;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
  }

  console.log('icon-master.png 1024x1024:');
  console.log('  transparent:', transparent);
  console.log('  white:', white);
  console.log('  dark:', dark);
  console.log('  total:', width * height);
  console.log('  dark bounds: x=' + minX + '-' + maxX + ', y=' + minY + '-' + maxY);
  console.log('  dark size: ' + (maxX - minX + 1) + 'x' + (maxY - minY + 1));

  // Sample some edge pixels
  console.log('\nEdge pixel samples:');
  for (let y of [0, 256, 512, 768, 1023]) {
    const i = (y * width + 512) * 4;
    console.log('  y=' + y + ' center: RGBA=(' + data[i] + ',' + data[i+1] + ',' + data[i+2] + ',' + data[i+3] + ')');
  }
}

main();
