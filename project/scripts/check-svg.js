const sharp = require('sharp');

async function main() {
  const { data, info } = await sharp('assets/linkchest.svg', { density: 300 })
    .resize(2048, 2048, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let nonWhite = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r < 245 || g < 245 || b < 245) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        nonWhite++;
      }
    }
  }
  console.log('SVG rasterized:', width, 'x', height);
  console.log('non-white:', nonWhite, 'of', width * height);
  console.log('bounds: x=' + minX + '-' + maxX + '(' + (maxX - minX + 1) + '), y=' + minY + '-' + maxY + '(' + (maxY - minY + 1) + ')');
  console.log('top-left RGBA:', data[0], data[1], data[2], data[3]);
  console.log('top-right RGB:', data[(width - 1) * 4], data[(width - 1) * 4 + 1], data[(width - 1) * 4 + 2]);
  console.log('bottom-left RGB:', data[(height - 1) * width * 4], data[(height - 1) * width * 4 + 1], data[(height - 1) * width * 4 + 2]);
  console.log('bottom-right RGB:', data[((height - 1) * width + width - 1) * 4], data[((height - 1) * width + width - 1) * 4 + 1], data[((height - 1) * width + width - 1) * 4 + 2]);
}

main();
