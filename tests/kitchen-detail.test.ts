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

  it('shares detailed produce meshes between physics and quick renderers', () => {
    const sourceFile = source('src/components/KitchenProduce.tsx');
    expect(sourceFile).toContain('new THREE.DataTexture');
    expect(sourceFile).toContain('THREE.SRGBColorSpace');
    for (const part of ['Tomato', 'Citrus', 'Carrot', 'Mushroom', 'Onion', 'Chili', 'Garlic', 'Herb']) {
      expect(sourceFile).toContain('function ' + part);
    }
    for (const renderer of ['src/components/KitchenScene.tsx', 'src/components/LiteKitchenScene.tsx']) {
      const content = source(renderer);
      expect(content).toContain("import IngredientModel from './KitchenProduce'");
      expect(content).toContain('<IngredientModel kind={ingredient.kind} quality={quality}');
    }
  });

  it('wires the faucet to real controls in both renderers and studio UI', () => {
    const details = source('src/components/KitchenDetails.tsx');
    const studio = source('src/components/KitchenStudio.tsx');
    expect(details).toContain('onFaucetChange(!faucetRunning)');
    expect(details).toContain('faucetRunning &&');
    expect(studio).toContain('aria-pressed={faucetRunning}');
    expect(studio).toContain('Turn off faucet');
    expect(studio).toContain('Turn on faucet');
    expect((studio.match(/onFaucetChange={setFaucetRunning}/g) ?? []).length).toBe(2);
  });

  it('avoids duplicate drawer faces and provides a real interior', () => {
    const details = source('src/components/KitchenDetails.tsx');
    expect(details).toContain('i === 1 ? null');
    expect(details).toContain('const target = drawerOpen ? 3.79 : 3.115');
    expect(details).toContain('drawer.current.position.z');
  });

  it('keeps the latest published Three.js r187 without a risky version churn', () => {
    const pkg = JSON.parse(source('package.json'));
    expect(pkg.dependencies.three).toBe('^0.187.0');
    expect(pkg.devDependencies['@types/three']).toBe('^0.187.0');
  });
});
