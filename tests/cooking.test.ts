import { describe, expect, it } from 'vitest';
import { applyCookingAction, getCookingRequirements, initialKitchenProgress, isReadyToPlate } from '../src/lib/cooking';

describe('Mise cooking journey', () => {
  it('starts with no activity and requires every cooking milestone', () => {
    const progress = initialKitchenProgress();
    expect(progress).toEqual({ chops: 0, pours: 0, stirs: 0, plated: false });
    expect(isReadyToPlate(getCookingRequirements(progress, 0, 7, .5, 0, 6))).toBe(false);
  });

  it('tracks preparation actions and caps repeat animations', () => {
    let progress = initialKitchenProgress();
    for (let i = 0; i < 9; i++) progress = applyCookingAction(progress, 'chop');
    for (let i = 0; i < 8; i++) progress = applyCookingAction(progress, 'pour');
    for (let i = 0; i < 8; i++) progress = applyCookingAction(progress, 'stir');
    expect(progress).toEqual({ chops: 4, pours: 3, stirs: 6, plated: false });
  });

  it('requires all ingredients, heat, actions and final step to serve', () => {
    let progress = initialKitchenProgress();
    progress = applyCookingAction(progress, 'chop');
    progress = applyCookingAction(progress, 'chop');
    progress = applyCookingAction(progress, 'pour');
    progress = applyCookingAction(progress, 'stir');
    progress = applyCookingAction(progress, 'stir');
    expect(isReadyToPlate(getCookingRequirements(progress, 7, 7, .4, 5, 6))).toBe(true);
    expect(isReadyToPlate(getCookingRequirements(progress, 6, 7, .4, 5, 6))).toBe(false);
    expect(isReadyToPlate(getCookingRequirements(progress, 7, 7, 0, 5, 6))).toBe(false);
    expect(isReadyToPlate(getCookingRequirements(progress, 7, 7, .4, 4, 6))).toBe(false);
    const plated = applyCookingAction(progress, 'plate');
    expect(plated.plated).toBe(true);
    expect(applyCookingAction(plated, 'stir')).toEqual(plated);
    expect(getCookingRequirements(plated, 7, 7, 0, 5, 6).every(requirement => requirement.complete)).toBe(true);
  });

  it('does not permit plating an empty or zero-step recipe', () => {
    const progress = { chops: 2, pours: 1, stirs: 2, plated: false };
    expect(isReadyToPlate(getCookingRequirements(progress, 0, 0, .4, 0, 0))).toBe(false);
  });
});
