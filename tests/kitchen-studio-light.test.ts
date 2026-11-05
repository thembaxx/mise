import { describe, expect, it } from 'vitest';
import {
  isSoftwareKitchenRenderer,
  kitchenStudioReflectionIntensity,
} from '../src/lib/kitchen-studio-light';

describe('PBR kitchen environment budgets', () => {
  it('adds meaningful reflections in high detail and subtler reflections in balanced', () => {
    expect(kitchenStudioReflectionIntensity('high', false)).toBe(0.78);
    expect(kitchenStudioReflectionIntensity('balanced', false)).toBe(0.48);
  });

  it('avoids expensive PMREM allocations in eco and on CPU-rasterized WebGL', () => {
    expect(kitchenStudioReflectionIntensity('eco', false)).toBe(0);
    expect(kitchenStudioReflectionIntensity('high', true)).toBe(0);
    expect(isSoftwareKitchenRenderer('ANGLE SwiftShader Device')).toBe(true);
    expect(isSoftwareKitchenRenderer('Mesa llvmpipe')).toBe(true);
    expect(isSoftwareKitchenRenderer('Apple M4 GPU')).toBe(false);
  });
});
