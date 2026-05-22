const fs = require('fs');
const path = require('path');

const svg = fs.readFileSync('assets/linkchest.svg', 'utf8');

// Find all image elements with base64 data
const imageMatches = svg.matchAll(/<image[^>]*xlink:href="data:image\/png;base64,([^"]*)"[^>]*>/g);
const images = [...imageMatches];

console.log('Found', images.length, 'embedded PNG images');

// The second image is likely the actual displayed content
// Let's save both for inspection
images.forEach((match, index) => {
  const base64Data = match[1];
  const buffer = Buffer.from(base64Data, 'base64');
  const outputPath = path.join(__dirname, `../assets/icon-extracted-${index}.png`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Saved image ${index}: ${outputPath} (${buffer.length} bytes)`);
});

// Also check if the second image is inside the visible g structure
// by looking at what's around each image in the SVG
images.forEach((match, index) => {
  const pos = match.index;
  const context = svg.substring(Math.max(0, pos - 200), pos + 50);
  console.log(`\nImage ${index} context:`);
  console.log(context);
});
