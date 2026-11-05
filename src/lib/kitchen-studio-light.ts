export type KitchenGraphicsTier = 'eco' | 'balanced' | 'high';

/** Software WebGL is a fallback, not a viable host for GPU cube-map capture. */
export function isSoftwareKitchenRenderer(renderer: string): boolean {
  return /swiftshader|llvmpipe|softpipe|software rasterizer/i.test(renderer);
}

/** One shared reflection cubemap per kitchen, never two overlapping environments. */
export function kitchenStudioReflectionResolution(
  quality: KitchenGraphicsTier,
  softwareRenderer: boolean,
): number {
  if (quality === 'eco' || softwareRenderer) return 0;
  return quality === 'high' ? 256 : 128;
}

export function kitchenStudioReflectionIntensity(
  quality: KitchenGraphicsTier,
  softwareRenderer: boolean,
): number {
  if (quality === 'eco' || softwareRenderer) return 0;
  return quality === 'high' ? 3.4 : 2.2;
}
