const sharp = require('sharp');

async function main() {
  const { data, info } = await sharp('assets/icon-extracted-1.png')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  let goldPixels = 0;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let sumX = 0, sumY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a > 10 && r > 150 && g > 120 && b < 120) {
        goldPixels++;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        sumX += x; sumY += y;
      }
    }
  }

  console.log('Gold-ish pixels in icon-extracted-1.png:');
  console.log('  count:', goldPixels);
  console.log('  bounds: x=' + minX + '-' + maxX + '(' + (maxX - minX + 1) + '), y=' + minY + '-' + maxY + '(' + (maxY - minY + 1) + ')');
  console.log('  center: (' + (sumX / goldPixels).toFixed(1) + ', ' + (sumY / goldPixels).toFixed(1) + ')');
  console.log('  image center: (' + (width / 2) + ', ' + (height / 2) + ')');

  // Also check the generated icon-master.png
  const { data: mData, info: mInfo } = await sharp('assets/icons/master/icon-master.png')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mw = mInfo.width, mh = mInfo.height;
  let mGold = 0, mMinX = mw, mMaxX = 0, mMinY = mh, mMaxY = 0, mSumX = 0, mSumY = 0;
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const i = (y * mw + x) * 4;
      const r = mData[i], g = mData[i + 1], b = mData[i + 2], a = mData[i + 3];
      if (a > 10 && r > 150 && g > 120 && b < 120) {
        mGold++;
        mMinX = Math.min(mMinX, x); mMaxX = Math.max(mMaxX, x);
        mMinY = Math.min(mMinY, y); mMaxY = Math.max(mMaxY, y);
        mSumX += x; mSumY += y;
      }
    }
  }
  console.log('\nGold-ish pixels in icon-master.png:');
  console.log('  count:', mGold);
  console.log('  bounds: x=' + mMinX + '-' + mMaxX + '(' + (mMaxX - mMinX + 1) + '), y=' + mMinY + '-' + mMaxY + '(' + (mMaxY - mMinY + 1) + ')');
  console.log('  center: (' + (mSumX / mGold).toFixed(1) + ', ' + (mSumY / mGold).toFixed(1) + ')');
}

main();
