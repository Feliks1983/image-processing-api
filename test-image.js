const fs = require('fs');
const sharp = require('sharp');

(async () => {
  if (fs.existsSync('test-image.jpg')) return;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#f97316"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="800" cy="500" r="300" fill="white" fill-opacity="0.4"/></svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile('test-image.jpg');
  console.log('Created test-image.jpg');
})();
