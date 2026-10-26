import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

describe('Mise brand and SEO', () => {
  const html = read('index.html');

  it('uses the production canonical consistently across discoverability signals', () => {
    const origin = 'https://mise-two-teal.vercel.app/';
    expect(html).toContain('rel="canonical" href="' + origin + '"');
    expect(html).toContain('property="og:url" content="' + origin + '"');
    expect(read('public/sitemap.xml')).toContain('<loc>' + origin + '</loc>');
    expect(read('public/robots.txt')).toContain('Sitemap: ' + origin + 'sitemap.xml');
  });

  it('declares share metadata, a real icon family and crawlable structured data', () => {
    expect(html).toContain('property="og:image"');
    expect(html).toContain('content="1200"');
    expect(html).toContain('content="630"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('"WebApplication"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('rel="manifest"');
  });

  it('defines a complete install icon collection and three original vectors', () => {
    const manifest = JSON.parse(read('public/manifest.webmanifest'));
    expect(manifest.name).toMatch(/^Mise/);
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/icon-192.png', sizes: '192x192' }),
      expect.objectContaining({ src: '/icon-512.png', sizes: '512x512' }),
      expect.objectContaining({ src: '/icon-maskable-512.png', purpose: 'maskable' }),
    ]));
    for (const asset of ['mise-mark.svg','mise-maskable.svg','mise-social.svg']) {
      const source = read('public/brand/' + asset);
      expect(source).toContain('<svg');
      expect(source).toContain('</svg>');
    }
  });

  it('keeps a discoverable home page without fictitious recipe routes', () => {
    expect(read('public/sitemap.xml').match(/<loc>/g)).toHaveLength(1);
    expect(read('public/robots.txt')).toContain('Allow: /');
  });
});
