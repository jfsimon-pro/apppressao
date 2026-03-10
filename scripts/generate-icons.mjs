import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgBuffer = readFileSync(join(root, 'public/icons/icon.svg'));

const sizes = [48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512];

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(join(root, `public/icons/icon-${size}x${size}.png`));
  console.log(`✓ icon-${size}x${size}.png`);
}

// Also generate apple-touch-icon (180x180)
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(join(root, 'public/apple-touch-icon.png'));
console.log('✓ apple-touch-icon.png');

// favicon 32x32
await sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toFile(join(root, 'public/favicon-32x32.png'));
console.log('✓ favicon-32x32.png');

console.log('\nDone! All icons generated.');
