import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

describe('high-fidelity kitchen feature', () => {
  it('uses offline procedural PBR textures, lights and architectural details', () => {
    const details = source('src/components/KitchenDetails.tsx');
    expect(details).toContain('new THREE.DataTexture');
    expect(details).toContain('THREE.SRGBColorSpace');
    const environment = source('src/components/KitchenStudioEnvironment.tsx');
    expect(environment).toContain('<Environment');
    expect(details).not.toContain('<Environment');
    expect(environment).toContain('kitchenStudioReflectionResolution');
    for (const part of ['Ceramics', 'UpperCabinet', 'KitchenSink', 'StoveDetails', 'KitchenCookware', 'MetalHandle']) {
      expect(details).toContain(part);
    }
    expect(details).not.toContain('https://');
  });

  it('preserves the same high-fidelity scene for lightweight and physics modes', () => {
    for (const path of ['src/components/KitchenScene.tsx', 'src/components/LiteKitchenScene.tsx']) {
      const scene = source(path);
      expect(scene).toContain("import KitchenDetails from './KitchenDetails'");
      expect(scene).toContain("import KitchenStudioEnvironment from './KitchenStudioEnvironment'");
      expect(scene).toContain('<KitchenStudioEnvironment quality={quality} />');
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

  it('uses a hollow, physically modeled skillet rather than layered solid cylinders', () => {
    const cookware = source('src/components/KitchenCookware.tsx');
    const details = source('src/components/KitchenDetails.tsx');
    for (const model of ['panGeometry', 'PanBody', 'Lid', 'brushingTexture']) {
      expect(cookware).toContain(model);
    }
    expect(cookware).toContain('new THREE.LatheGeometry');
    expect(cookware).toContain('roughnessMap={brushed}');
    expect(cookware).toContain('onChange(!open)');
    expect(cookware).toContain('THREE.MathUtils.damp');
    expect(cookware).toContain('reducedMotion');
    expect(details).toContain("import KitchenCookware from './KitchenCookware'");
    expect(details).toContain('<KitchenCookware quality={quality}');
    expect(details).not.toContain('function SaucepanDetails');
    for (const scene of ['src/components/KitchenScene.tsx', 'src/components/LiteKitchenScene.tsx']) {
      const content = source(scene);
      expect(content).toContain('lidOpen={lidOpen}');
      expect(content).toContain('onLidChange={onLidChange}');
      expect(content).not.toContain('cylinderGeometry args={[1.04, .9, .28, 64]}');
    }
  });

  it('retains accessible pan lid controls through both renderers and reset', () => {
    const studio = source('src/components/KitchenStudio.tsx');
    expect(studio).toContain('const [lidOpen, setLidOpen] = useState(true)');
    expect(studio).toContain('setLidOpen(true)');
    expect(studio).toContain('aria-pressed={!lidOpen}');
    expect(studio).toContain('Cover pan');
    expect(studio).toContain('Lift pan lid');
    expect((studio.match(/onLidChange={setLidOpen}/g) ?? []).length).toBe(2);
    const cookware = source('src/components/KitchenCookware.tsx');
    expect(cookware).toContain('scale={[1, .15, 1]}');
    expect(cookware).toContain('!open && heat > .35');
  });

  it('offers consistent smooth, interruptible camera presets in both renderers', () => {
    const rig = source('src/components/KitchenCameraRig.tsx');
    for (const name of ['overview', 'pan', 'prep', 'OrbitControls', 'transitioning', 'onStart', 'reducedMotion']) {
      expect(rig).toContain(name);
    }
    for (const scene of ['src/components/KitchenScene.tsx', 'src/components/LiteKitchenScene.tsx']) {
      expect(source(scene)).toContain('<KitchenCameraRig view={cameraView} dragging={dragging}');
    }
    const studio = source('src/components/KitchenStudio.tsx');
    expect(studio).toContain('aria-label="Kitchen camera view"');
    expect(studio).toContain('setCameraView(value)');
    expect((studio.match(/cameraView={cameraView}/g) ?? []).length).toBe(2);
  });

  it('keeps the glowing stove element below the nonstick cooking surface', () => {
    for (const scene of ['src/components/KitchenScene.tsx', 'src/components/LiteKitchenScene.tsx']) {
      const content = source(scene);
      expect(content).toContain("position={[1.16, .035, .15]}");
      expect(content).toContain("abs(d-.466)");
      expect(content).not.toContain("position={[1.16, .279, .15]}");
    }
  });

  it('lays out camera views on their own row, with mobile single-column fallback', () => {
    const css = source('src/styles.css');
    expect(css).toContain('.scene-bottom {\n  display: grid;');
    expect(css).toContain('.kitchen-camera-modes { grid-column: 1 / -1; }');
    expect(css).toContain('@media (max-width: 700px)');
    const e2e = source('e2e/kitchen-fidelity.e2e.ts');
    expect(e2e).toContain("await burner.press('Home')");
    expect(e2e).not.toContain("burner.fill(");
  });

  it('models an actual inset sink rather than a blocked solid countertop', () => {
    const details = source('src/components/KitchenDetails.tsx');
    expect(details).toContain('function Countertop');
    expect(details).toContain('surface.holes.push(opening)');
    expect(details).toContain('new THREE.ExtrudeGeometry');
    expect(details).toContain('function basinGeometry()');
    expect(details).toContain('outer.holes.push(inner)');
    expect(details).toContain('useEffect(() => () => { basin.dispose(); lip.dispose(); }');
    expect(details).toContain('<Countertop stone={textures.stone} />');
    for (const scene of ['src/components/KitchenScene.tsx', 'src/components/LiteKitchenScene.tsx']) {
      const content = source(scene);
      expect(content).not.toContain('boxGeometry args={[9.5, .14, 6.2]}');
      expect(content).not.toContain('boxGeometry args={[9.5, .015, 6.2]}');
      expect(content).toContain('position={[1.16, .035, .15]}');
    }
  });

  it('keeps the latest published Three.js r187 without a risky version churn', () => {
    const pkg = JSON.parse(source('package.json'));
    expect(pkg.dependencies.three).toBe('^0.187.0');
    expect(pkg.devDependencies['@types/three']).toBe('^0.187.0');
  });
});
