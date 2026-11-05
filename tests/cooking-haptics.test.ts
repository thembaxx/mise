import { describe, expect, it } from 'vitest';
import { cookingHaptic, cookingVibration } from '../src/lib/cooking-sound';

describe('optional cooking haptics', () => {
  it('keeps every vibration pattern brief', () => {
    expect(cookingVibration('chop')).toBe(12);
    expect(cookingVibration('pour')).toBe(9);
    expect(cookingVibration('stir')).toBe(7);
    expect(cookingVibration('plate')).toEqual([14, 24, 24]);
  });

  it('never throws on a server without vibration hardware', () => {
    expect(() => cookingHaptic('plate')).not.toThrow();
  });
});
