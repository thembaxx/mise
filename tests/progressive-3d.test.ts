import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const read = (name: string) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

describe('progressive 3D kitchen boundary', () => {
  it('does not load Rapier physics with the quick-start 3D scene', () => {
    const quick = read('src/components/LiteKitchenScene.tsx');
    expect(quick).not.toContain('@react-three/rapier');
    expect(quick).not.toContain('RapierRigidBody');
    expect(quick).not.toContain('<Physics');
    expect(quick).toContain('DraggableIngredient');
    expect(quick).toContain('onPointerMove');
    expect(quick).toContain('OrbitControls');
  });
  it('uses a deferred physics-specific import, not an eager engine import', () => {
    const studio = read('src/components/KitchenStudio.tsx');
    expect(studio).toContain("lazy(() => import('./KitchenScene'))");
    expect(studio).toContain('LiteKitchenScene');
    expect(studio).toContain('physicsEnabled');
    expect(studio).toContain('aria-pressed={physicsEnabled}');
    expect(read('src/components/KitchenScene.tsx')).toContain("@react-three/rapier");
  });
  it('only caches physics after opt-in while keeping quick scene offline', () => {
    const config = read('vite.config.ts');
    expect(config).toContain("globIgnores: ['**/KitchenScene-*.js']");
    expect(config).toContain('mise-opt-in-physics-v1');
    expect(config).toContain("handler: 'CacheFirst'");
  });
  it('keeps cooking visuals in sync with plating and adapts particles to graphics quality', () => {
    const effects = read('src/components/KitchenEffects.tsx');
    expect(effects).toContain('!progress.plated && <PanHeatCue');
    expect(effects).toContain('!progress.plated && !reducedMotion');
    expect(effects).toContain("quality === 'eco' ? 5 : STEAM_COUNT");
    expect(effects).toContain("quality === 'eco' ? 4 : 9");
    for (const scene of ['src/components/LiteKitchenScene.tsx', 'src/components/KitchenScene.tsx']) {
      expect(read(scene)).toContain('quality={quality} />');
    }
  });
  it('keeps kitchen hints out of Drei DOM portals to avoid unmount errors', () => {
    const effects = read('src/components/KitchenEffects.tsx');
    expect(effects).not.toContain('<Html');
    expect(effects).not.toContain("import { Html");
    const studio = read('src/components/KitchenStudio.tsx');
    expect(studio).toContain('kitchen-finished-overlay');
    expect(studio).toContain('role="status"');
  });
});
