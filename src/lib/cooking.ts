export type CookingAction = 'chop' | 'pour' | 'stir' | 'plate';

export interface KitchenProgress {
  chops: number;
  pours: number;
  stirs: number;
  plated: boolean;
}

export interface CookingRequirement {
  id: string;
  title: string;
  complete: boolean;
}

export function initialKitchenProgress(): KitchenProgress {
  return { chops: 0, pours: 0, stirs: 0, plated: false };
}

export function applyCookingAction(progress: KitchenProgress, action: CookingAction): KitchenProgress {
  if (progress.plated) return progress;
  switch (action) {
    case 'chop': return { ...progress, chops: Math.min(progress.chops + 1, 4) };
    case 'pour': return { ...progress, pours: Math.min(progress.pours + 1, 3) };
    case 'stir': return { ...progress, stirs: Math.min(progress.stirs + 1, 6) };
    case 'plate': return { ...progress, plated: true };
  }
}

/** 3D studio goals are intentionally playful and do not imply food is safe to eat. */
export function getCookingRequirements(
  progress: KitchenProgress,
  addedCount: number,
  ingredientCount: number,
  heat: number,
  stepIndex: number,
  stepCount: number,
): CookingRequirement[] {
  return [
    { id: 'prep', title: 'Chop ingredients twice', complete: progress.chops >= 2 },
    { id: 'pour', title: 'Pour oil or sauce', complete: progress.pours >= 1 },
    { id: 'ingredients', title: 'Add every ingredient to the pan', complete: ingredientCount > 0 && addedCount >= ingredientCount },
    { id: 'heat', title: 'Turn the heat on', complete: heat > 0 },
    { id: 'stir', title: 'Stir the pan twice', complete: progress.stirs >= 2 },
    { id: 'steps', title: 'Read the final recipe step', complete: stepCount > 0 && stepIndex >= stepCount - 1 },
  ];
}

export function isReadyToPlate(requirements: CookingRequirement[]): boolean {
  return requirements.length > 0 && requirements.every(requirement => requirement.complete);
}
