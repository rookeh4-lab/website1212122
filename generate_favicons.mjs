import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const INPUT = 'public/logo.png';
const OUT = 'public';

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'favicon-96x96.png', size: 96 },
  { name: 'favicon-144x144.png', size: 144 },
  { name: 'icon.png', size: 32 },
  { name: 'favicon.png', size: 64 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

async function main() {
  for (const { name, size } of sizes) {
    await sharp(INPUT)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(path.join(OUT, name));
    console.log(`✓ ${name} (${size}x${size})`);
  }

  // Generate favicon.ico (32x32 PNG wrapped as ICO — browsers accept PNG in ICO)
  const ico32 = await sharp(INPUT)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toBuffer();
  
  // Simple ICO file format: header + directory entry + PNG data
  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0);     // reserved
  iconDir.writeUInt16LE(1, 2);     // type: 1 = ICO
  iconDir.writeUInt16LE(1, 4);     // count: 1 image

  const iconEntry = Buffer.alloc(16);
  iconEntry.writeUInt8(32, 0);     // width
  iconEntry.writeUInt8(32, 1);     // height
  iconEntry.writeUInt8(0, 2);      // color palette
  iconEntry.writeUInt8(0, 3);      // reserved
  iconEntry.writeUInt16LE(1, 4);   // color planes
  iconEntry.writeUInt16LE(32, 6);  // bits per pixel
  iconEntry.writeUInt32LE(ico32.length, 8);  // size of PNG data
  iconEntry.writeUInt32LE(22, 12); // offset to PNG data (6 + 16 = 22)

  const icoBuffer = Buffer.concat([iconDir, iconEntry, ico32]);
  fs.writeFileSync(path.join(OUT, 'favicon.ico'), icoBuffer);
  console.log('✓ favicon.ico (32x32)');

  // Generate favicon.svg (embed the PNG as base64 in an SVG)
  const svgPng = await sharp(INPUT)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toBuffer();
  const b64 = svgPng.toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <image width="512" height="512" href="data:image/png;base64,${b64}" />
</svg>`;
  fs.writeFileSync(path.join(OUT, 'favicon.svg'), svg);
  console.log('✓ favicon.svg');

  console.log('\nAll favicons generated successfully!');
}

main().catch(console.error);
