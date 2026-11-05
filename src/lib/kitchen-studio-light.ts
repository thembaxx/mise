export type KitchenGraphicsTier = 'eco' | 'balanced' | 'high';

/** Physically based reflections are optional, never required for cooking actions. */
export function isSoftwareKitchenRenderer(renderer: string): boolean {
  return /swiftshader|llvmpipe|softpipe|software rasterizer/i.test(renderer);
}

export function kitchenStudioReflectionIntensity(
  quality: KitchenGraphicsTier,
  softwareRenderer: boolean,
): number {
  if (quality === 'eco' || softwareRenderer) return 0;
  return quality === 'high' ? 0.78 : 0.48;
}
