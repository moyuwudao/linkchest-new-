const sharp = require('sharp');

async function main() {
  // Use extracted image 1 as master, center crop to 1024x1024
  await sharp('assets/icon-extracted-1.png')
    .resize(1024, 1024, { fit: 'cover', position: 'center' })
    .png()
    .toFile('assets/test-master-1024.png');
  console.log('Generated test-master-1024.png');

  // Check content bounds
  const { data, info } = await sharp('assets/test-master-1024.png')
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
  console.log('bounds: x=' + minX + '-' + maxX + '(' + (maxX - minX + 1) + '), y=' + minY + '-' + maxY + '(' + (maxY - minY + 1) + ')');
  console.log('non-white:', nonWhite);
  console.log('center:', (minX + maxX) / 2, (minY + maxY) / 2);

  // Also check edge colors to see if there's padding
  console.log('\nEdge sample colors (center of each edge):');
  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);
  console.log('top edge center:', data[midX * 4], data[midX * 4 + 1], data[midX * 4 + 2], data[midX * 4 + 3]);
  console.log('bottom edge center:', data[((height - 1) * width + midX) * 4], data[((height - 1) * width + midX) * 4 + 1], data[((height - 1) * width + midX) * 4 + 2]);
  console.log('left edge center:', data[midY * width * 4], data[midY * width * 4 + 1], data[midY * width * 4 + 2]);
  console.log('right edge center:', data[(midY * width + width - 1) * 4], data[(midY * width + width - 1) * 4 + 1], data[(midY * width + width - 1) * 4 + 2]);
}

main();
