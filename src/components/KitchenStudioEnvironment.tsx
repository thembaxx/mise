import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import {
  isSoftwareKitchenRenderer,
  kitchenStudioReflectionResolution,
  kitchenStudioReflectionIntensity,
  type KitchenGraphicsTier,
} from '../lib/kitchen-studio-light';

/**
 * A single softbox reflection source for both lightweight and physics kitchens.
 * This replaces the former inline environment; no second PMREM is allocated,
 * and Drei owns GPU cleanup when the scene unmounts.
 */
export default function KitchenStudioEnvironment({ quality }: { quality: KitchenGraphicsTier }) {
  const { gl } = useThree();
  const software = useMemo(() => {
    const context = gl.getContext();
    const debug = context.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(
      context.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER),
    );
    return isSoftwareKitchenRenderer(renderer);
  }, [gl]);
  const resolution = kitchenStudioReflectionResolution(quality, software);
  const intensity = kitchenStudioReflectionIntensity(quality, software);
  if (resolution === 0) return null;

  return (
    <Environment resolution={resolution}>
      <Lightformer
        form="rect"
        intensity={intensity}
        position={[0, 5, 3]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[9, 4, 1]}
      />
      <Lightformer
        form="rect"
        intensity={intensity * 0.65}
        position={[-5, 2, 1]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[5, 3, 1]}
      />
      <Lightformer
        form="rect"
        intensity={intensity * 0.47}
        position={[4, 3, -2]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[4, 2, 1]}
      />
    </Environment>
  );
}
