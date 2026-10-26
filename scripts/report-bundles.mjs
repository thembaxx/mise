import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const directory = resolve('dist/assets');
const filenames = (await readdir(directory)).filter(name => name.endsWith('.js')).sort();
let sum = 0;
const results = [];
for (const name of filenames) {
  const bytes = await readFile(resolve(directory,name));
  const gzip = gzipSync(bytes).length;
  sum += gzip;
  results.push({ name, kB: +(bytes.length / 1000).toFixed(2), gzipKB: +(gzip / 1000).toFixed(2) });
}
console.table(results);
console.log('Total gzipped JS across emitted chunks:',(sum/1000).toFixed(2),'kB (not the initial load)');
const quick = results.find(row => /^KitchenStudio-/.test(row.name));
const optional = results.find(row => /^KitchenScene-/.test(row.name));
console.log('Quick kitchen entry:',quick?.name||'bundled with shared chunk');
console.log('Optional full physics:',optional?.name||'check chunk names and imports');
console.log('Note: build/preview browser network waterfall determines which chunks load before opt-in.');
