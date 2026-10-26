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


// Portrait Apple launch artwork; provide light and dark launch screens for common viewport sizes.
const launchSizes = [[1170,2532],[1179,2556],[1290,2796],[1320,2868],[1668,2388]];
async function generateSplash(width, height, theme) {
  const background = theme === 'dark' ? '#111B17' : '#F7F6F1';
  const ink = theme === 'dark' ? '#F7EED7' : '#213125';
  const sub = theme === 'dark' ? '#A8B7A5' : '#73806E';
  const iconSize = Math.round(Math.min(width * .29, 270));
  const top = Math.round(height * .41 - iconSize * .5);
  const icon = await sharp(mark).resize(iconSize, iconSize).png().toBuffer();
  const caption = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
    '<text x="' + width/2 + '" y="' + (top+iconSize+87) + '" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="72" fill="' + ink + '">Mise</text>' +
    '<text x="' + width/2 + '" y="' + (top+iconSize+138) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="23" fill="' + sub + '">The world, on your table.</text></svg>'
  );
  await sharp({ create: { width, height, channels: 4, background } })
    .composite([{ input: icon, left: Math.round((width-iconSize)/2), top }, { input: caption }])
    .png({ compressionLevel: 9 })
    .toFile(fileURLToPath(new URL('splash-'+width+'x'+height+'-'+theme+'.png', publicDir)));
}
for (const [width,height] of launchSizes) {
  await generateSplash(width,height,'light');
  await generateSplash(width,height,'dark');
}
console.log('Generated light and dark native-style Apple launch screens.');
