const fs = require('fs');
const svg = fs.readFileSync('assets/linkchest.svg', 'utf8');

// Find image elements
const images = svg.match(/<image[^>]*>/g);
console.log('images found:', images ? images.length : 0);
if (images) {
  images.forEach((img, i) => console.log(i, img.substring(0, 250)));
}

// Find all elements with large width/height attributes
const allTags = svg.match(/<[a-zA-Z][^>]*>/g);
console.log('\ntotal tags:', allTags ? allTags.length : 0);

// Show first 20 tags
if (allTags) {
  console.log('\nFirst 20 tags:');
  allTags.slice(0, 20).forEach((t, i) => {
    const short = t.substring(0, 120);
    console.log(i, short);
  });
}

// Find the main visible content - look for <use> or <image>
const uses = svg.match(/<use[^>]*>/g);
console.log('\nuse elements:', uses ? uses.length : 0);
if (uses) {
  uses.slice(0, 5).forEach((u, i) => console.log(i, u.substring(0, 200)));
}
