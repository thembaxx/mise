import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicDir = new URL('../public/', import.meta.url);
const load = (file) => readFile(new URL(file, publicDir));

const [mark, maskable, social] = await Promise.all([
  load('brand/mise-mark.svg'),
  load('brand/mise-maskable.svg'),
  load('brand/mise-social.svg'),
]);

const output = async (source, filename, width, height = width) => {
  const destination = new URL(filename, publicDir);
  await sharp(source, { density: 192 }).resize(width, height).png({ compressionLevel: 9 }).toFile(fileURLToPath(destination));
};

await mkdir(fileURLToPath(publicDir), { recursive: true });
await Promise.all([
  output(mark, 'favicon-32.png', 32),
  output(mark, 'apple-touch-icon.png', 180),
  output(mark, 'icon-192.png', 192),
  output(mark, 'icon-512.png', 512),
  output(maskable, 'icon-maskable-512.png', 512),
  output(social, 'og-mise.png', 1200, 630),
]);
console.log('Mise branding assets generated: favicon, iOS/PWA icons and 1200×630 Open Graph image.');
