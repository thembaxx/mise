import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { prepareCookwareInspection, restoreCookwareAssembly, setCookwareInspection } from '../src/lib/cookware-inspection';

describe('cookware inspection', () => {
  it('separates registered parts and restores exact authored transforms', () => {
    const root = new THREE.Group();
    const pan = new THREE.Group();
    const lid = new THREE.Group();
    pan.position.set(1, 0, 0);
    lid.position.set(0, 1, 0);
    root.add(pan, lid);
    prepareCookwareInspection(root, [
      { object: pan, direction: new THREE.Vector3(-1, 0, 0), distance: 0.8 },
      { object: lid, direction: new THREE.Vector3(0, 1, 0), distance: 0.5 },
    ]);
    setCookwareInspection(root, 1);
    expect(pan.position.x).toBeLessThan(1);
    expect(lid.position.y).toBeGreaterThan(1);
    restoreCookwareAssembly(root);
    expect(pan.position.toArray()).toEqual([1, 0, 0]);
    expect(lid.position.toArray()).toEqual([0, 1, 0]);
  });

  it('clamps progress and does not mutate unregistered children', () => {
    const root = new THREE.Group();
    const part = new THREE.Group();
    const untouched = new THREE.Group();
    untouched.position.set(2, 3, 4);
    root.add(part, untouched);
    prepareCookwareInspection(root, [{ object: part }]);
    expect(setCookwareInspection(root, 4)).toBe(1);
    expect(setCookwareInspection(root, Number.NaN)).toBe(0);
    expect(untouched.position.toArray()).toEqual([2, 3, 4]);
  });
});
