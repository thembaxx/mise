import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useReducedMotion } from '../motion/preferences';

export type KitchenCameraView = 'overview' | 'pan' | 'prep';

const VIEWS: Record<KitchenCameraView, { camera: [number, number, number]; target: [number, number, number] }> = {
  overview: { camera: [5.2, 4.25, 6.8], target: [0, .55, 0] },
  pan: { camera: [3.75, 2.66, 4.2], target: [1.16, .34, .15] },
  prep: { camera: [-4.15, 2.55, 3.85], target: [-1.64, .30, .23] },
};

type Props = { view: KitchenCameraView; dragging: boolean };

/**
 * One camera implementation for Quick and Physics kitchen scenes.
 * Camera presets never mutate the cooking state or Rapier drag coordinates.
 * Orbit gestures cancel cinematic camera travel rather than fighting the user.
 */
export default function KitchenCameraRig({ view, dragging }: Props) {
  const camera = useThree(state => state.camera);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const transitioning = useRef(true);
  const reducedMotion = useReducedMotion();
  const destination = useMemo(() => ({
    camera: new THREE.Vector3(...VIEWS[view].camera),
    target: new THREE.Vector3(...VIEWS[view].target),
  }), [view]);

  useEffect(() => { transitioning.current = true; }, [destination]);

  useFrame((_state, delta) => {
    const orbit = controls.current;
    if (!orbit || !transitioning.current) return;
    if (reducedMotion) {
      camera.position.copy(destination.camera);
      orbit.target.copy(destination.target);
      orbit.update();
      transitioning.current = false;
      return;
    }
    const step = Math.min(delta, .07);
    const factor = 1 - Math.exp(-7 * step);
    camera.position.lerp(destination.camera, factor);
    orbit.target.lerp(destination.target, factor);
    orbit.update();
    if (camera.position.distanceToSquared(destination.camera) < .0008
      && orbit.target.distanceToSquared(destination.target) < .0008) {
      camera.position.copy(destination.camera);
      orbit.target.copy(destination.target);
      orbit.update();
      transitioning.current = false;
    }
  });

  return <OrbitControls
    ref={controls}
    makeDefault
    enabled={!dragging}
    onStart={() => { transitioning.current = false; }}
    enableDamping
    dampingFactor={.08}
    enablePan={false}
    minDistance={4.4}
    maxDistance={12}
    minPolarAngle={.22}
    maxPolarAngle={1.4}
  />;
}
