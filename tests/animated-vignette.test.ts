import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('animated plated-dish asset', () => {
  it('ships an embedded, lightweight GLB with a named garnish clip', () => {
    const bytes = readFileSync(new URL('../public/models/original/mise-plated-dish-animated.glb', import.meta.url));
    expect(bytes.toString('ascii', 0, 4)).toBe('glTF');
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    expect(bytes.length).toBeLessThan(8 * 1024 * 1024);
    const json = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
    expect(json.asset.version).toBe('2.0');
    expect(json.animations.map((clip: {name: string}) => clip.name)).toContain('Garnish breathing');
    expect(json.meshes.length).toBeGreaterThan(0);
    expect(json.buffers.every((item: {uri?: string}) => !item.uri)).toBe(true);
  });

  it('retains optional 3D with reduced-motion and offline fallbacks', () => {
    const effects = readFileSync(new URL('../src/components/KitchenEffects.tsx', import.meta.url), 'utf8');
    const config = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
    expect(effects).toContain('mise-plated-dish-animated.glb');
    expect(effects).toContain('mise-plated-dish.glb');
    expect(effects).toContain('reducedMotion');
    expect(config).toContain('glb,webmanifest');
  });
});
