import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Single draw-call GPU plume. The existing mesh-based steam remains the eco fallback.
const vertexShader = `
  uniform float uTime;
  uniform float uHeat;
  attribute float aSeed;
  varying float vFade;
  void main() {
    float progress = fract(aSeed + uTime * (0.09 + uHeat * 0.16));
    vec3 p = position;
    p.y += progress * (1.25 + uHeat * 0.6);
    p.x += sin(aSeed * 31.0 + uTime * 0.65) * (0.055 + progress * 0.18);
    p.z += cos(aSeed * 24.0 + uTime * 0.4) * (0.045 + progress * 0.16);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = 3.5 + progress * 5.5;
    vFade = sin(progress * 3.14159265) * (0.5 + 0.5 * aSeed);
  }
`;
const fragmentShader = `
  uniform float uOpacity;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float fog = 1.0 - smoothstep(0.08, 0.5, d);
    gl_FragColor = vec4(vec3(0.96, 0.97, 0.93), fog * vFade * uOpacity);
    #include <colorspace_fragment>
  }
`;

export default function GpuSteam({ heat, addedCount, quality }: {
  heat: number;
  addedCount: number;
  quality: 'balanced' | 'high';
}) {
  const shader = useRef<THREE.ShaderMaterial>(null);
  const count = quality === 'high' ? 240 : 112;
  const attributes = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399963229728653;
      const r = Math.sqrt((i + 0.5) / count) * 0.53;
      positions[i * 3] = 1.16 + Math.cos(angle) * r;
      positions[i * 3 + 1] = 0.56;
      positions[i * 3 + 2] = 0.15 + Math.sin(angle) * r * 0.75;
      seeds[i] = (i * 0.61803398875) % 1;
    }
    return { positions, seeds };
  }, [count]);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uHeat: { value: 0 },
    uOpacity: { value: 0 },
  }), []);
  useFrame(({ clock }) => {
    const target = shader.current;
    if (!target) return;
    target.uniforms.uTime.value = clock.elapsedTime;
    target.uniforms.uHeat.value = heat;
    target.uniforms.uOpacity.value = addedCount > 0 && heat > 0.05 ? Math.min(0.23, heat * 0.21) : 0;
  });
  return (
    <points frustumCulled={false} raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[attributes.positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[attributes.seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={shader}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}
