import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

describe('mobile animated GLB preview', () => {
  it('compiles the standalone WebGL2 viewer and exposes both variants', () => {
    const viewer = readFileSync(new URL('../public/3d-viewer.js', import.meta.url), 'utf8');
    const html = readFileSync(new URL('../public/3d-preview.html', import.meta.url), 'utf8');
    expect(() => new Script(viewer)).not.toThrow();
    expect(html).toContain('data-model-stem="mise-plated-dish"');
    expect(html).toContain('<script src="/3d-viewer.js" defer>');
    for (const feature of ['gl.drawElements', 'gl.drawArrays', 'nodeMatrix', 'updatePose', 'pointermove', 'ResizeObserver', 'toBlob', 'prefers-reduced-motion']) expect(viewer).toContain(feature);
    expect(viewer).not.toMatch(/https?:\/\//);
  });

  it('pre-caches the self-contained viewer and animated GLB offline', () => {
    const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
    expect(vite).toContain('glb,webmanifest');
    expect(vite).toContain("'**/*.{js,css,html,svg,png,glb,webmanifest,txt,xml,woff2}'");
  });
});
