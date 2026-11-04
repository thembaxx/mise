import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

describe('high-fidelity kitchen feature', () => {
  it('uses offline procedural PBR textures, lights and architectural details', () => {
    const details = source('src/components/KitchenDetails.tsx');
    expect(details).toContain('new THREE.DataTexture');
    expect(details).toContain('THREE.SRGBColorSpace');
    expect(details).toContain('<Environment');
    for (const part of ['Ceramics', 'UpperCabinet', 'KitchenSink', 'StoveDetails', 'SaucepanDetails', 'MetalHandle']) {
      expect(details).toContain(part);
    }
    expect(details).not.toContain('https://');
  });

  it('preserves the same high-fidelity scene for lightweight and physics modes', () => {
    for (const path of ['src/components/KitchenScene.tsx', 'src/components/LiteKitchenScene.tsx']) {
      const scene = source(path);
      expect(scene).toContain("import KitchenDetails from './KitchenDetails'");
      expect(scene).toContain('<KitchenDetails quality={quality}');
      expect(scene).toContain('onHeatChange={onHeatChange}');
      expect(scene).toContain('onDrawerChange={onDrawerChange}');
      expect(scene).toContain("quality === 'high' ? [2048, 2048]");
    }
    expect(source('src/components/LiteKitchenScene.tsx')).not.toContain('@react-three/rapier');
  });

  it('makes stove heat and drawer controls work via accessible DOM alternatives', () => {
    const studio = source('src/components/KitchenStudio.tsx');
    const details = source('src/components/KitchenDetails.tsx');
    expect(studio).toContain('drawerOpen');
    expect(studio).toContain('aria-pressed={drawerOpen}');
    expect(studio).toContain('onHeatChange={setHeat}');
    expect(studio).toContain('onDrawerChange={setDrawerOpen}');
    expect(studio).toContain('aria-label="Burner heat"');
    expect(details).toContain('onHeatChange(');
    expect(details).toContain('onDrawerChange(!drawerOpen)');
    expect(details).toContain('reducedMotion');
  });

  it('retains a manually selectable eco mode and keeps inputs readable', () => {
    const studio = source('src/components/KitchenStudio.tsx');
    expect(studio).toContain('<option value="eco">Eco</option>');
    expect(studio).toContain('<option value="high">High</option>');
    expect(studio).toContain("matches ? 'balanced' : 'high'");
    const styles = source('src/styles.css');
    expect(styles).toContain('R187 kitchen art direction');
    expect(styles).toContain('select, textarea { font-size: 16px; }');
  });

  it('keeps the latest published Three.js r187 without a risky version churn', () => {
    const pkg = JSON.parse(source('package.json'));
    expect(pkg.dependencies.three).toBe('^0.187.0');
    expect(pkg.devDependencies['@types/three']).toBe('^0.187.0');
  });
});
