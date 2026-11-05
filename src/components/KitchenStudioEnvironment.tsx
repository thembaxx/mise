import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  isSoftwareKitchenRenderer,
  kitchenStudioReflectionIntensity,
  type KitchenGraphicsTier,
} from '../lib/kitchen-studio-light';

/**
 * Physically based softbox reflections give metal cookware, taps and glass
 * the appearance of actual manufactured materials. The room is never drawn:
 * the kitchen's authored walls/background and touch targets remain unchanged.
 */
export default function KitchenStudioEnvironment({ quality }: { quality: KitchenGraphicsTier }) {
  const { gl, scene, invalidate } = useThree();
  const software = useMemo(() => {
    const context = gl.getContext();
    const debug = context.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(
      context.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER),
    );
    return isSoftwareKitchenRenderer(renderer);
  }, [gl]);
  const intensity = kitchenStudioReflectionIntensity(quality, software);

  useEffect(() => {
    if (intensity === 0) return;
    const room = new RoomEnvironment();
    const generator = new PMREMGenerator(gl);
    const target = generator.fromScene(room, 0.04);
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;
    room.dispose();
    generator.dispose();
    invalidate();
    return () => {
      scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      target.dispose();
      invalidate();
    };
  }, [gl, scene, invalidate, intensity]);

  return null;
}
