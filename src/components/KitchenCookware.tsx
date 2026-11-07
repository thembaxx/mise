import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useReducedMotion } from '../motion/preferences';
import { prepareCookwareInspection, setCookwareInspection } from '../lib/cookware-inspection';

type Quality = 'eco' | 'balanced' | 'high';

type Props = {
  quality: Quality;
  heat: number;
  lidOpen: boolean;
  onLidChange: (open: boolean) => void;
  /** Deterministic teardown scrub: 0 assembled, 1 fully separated. */
  inspectionProgress?: number;
};

const PAN_POSITION: [number, number, number] = [1.16, 0, .15];
const METAL = '#b2b8b4';
const IRON = '#252c2b';

/**
 * A physically shaped skillet with a concave cooking surface.
 * Meshes are deliberately not colliders: both existing kitchen renderers
 * retain their original interaction volumes and ingredient landing logic.
 */
function panGeometry(quality: Quality) {
  const segments = quality === 'high' ? 160 : quality === 'balanced' ? 112 : 72;
  const outer = new THREE.LatheGeometry([
    new THREE.Vector2(0, .064),
    new THREE.Vector2(.68, .064),
    new THREE.Vector2(.83, .077),
    new THREE.Vector2(.91, .118),
    new THREE.Vector2(.976, .265),
    new THREE.Vector2(1.045, .425),
    new THREE.Vector2(1.055, .44),
  ], segments);
  const interior = new THREE.LatheGeometry([
    new THREE.Vector2(0, .276),
    new THREE.Vector2(.52, .276),
    new THREE.Vector2(.73, .287),
    new THREE.Vector2(.83, .312),
    new THREE.Vector2(.905, .365),
    new THREE.Vector2(1.015, .434),
  ], segments);
  return { outer, interior };
}

function brushingTexture(quality: Quality) {
  const size = quality === 'high' ? 512 : quality === 'balanced' ? 256 : 128;
  const bytes = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const radial = Math.sin(x * .24 + Math.cos(y * .015) * 4) * .07;
      const grain = Math.sin(x * 4.03 + y * .21) * .045;
      const value = Math.round((.44 + radial + grain) * 255);
      const offset = 4 * (y * size + x);
      bytes[offset] = value;
      bytes[offset + 1] = value;
      bytes[offset + 2] = value;
      bytes[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function PanBody({ quality }: { quality: Quality }) {
  const geometry = useMemo(() => panGeometry(quality), [quality]);
  const brushed = useMemo(() => brushingTexture(quality), [quality]);
  useEffect(() => () => {
    geometry.outer.dispose();
    geometry.interior.dispose();
    brushed.dispose();
  }, [geometry, brushed]);

  return <group position={PAN_POSITION}>
    <mesh geometry={geometry.outer} castShadow receiveShadow>
      <meshPhysicalMaterial color="#606e6b" metalness={.85} roughness={.37} roughnessMap={brushed} clearcoat={.22} clearcoatRoughness={.29} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={geometry.interior} castShadow receiveShadow>
      <meshPhysicalMaterial color={IRON} roughness={.49} metalness={.32} clearcoat={.12} clearcoatRoughness={.48} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, .438, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
      <torusGeometry args={[1.035, .028, quality === 'high' ? 20 : 12, quality === 'high' ? 144 : 96]} />
      <meshPhysicalMaterial color="#c9ceca" metalness={.94} roughness={.19} clearcoat={.3} />
    </mesh>
    {/* Grooves in the brushed exterior; they follow the side of the pan rather than floating over the food. */}
    {[.87, .91, .95].map((radius, i) => <mesh key={radius} position={[0, .155 + .043 * i, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, .006, 6, 128]} />
      <meshStandardMaterial color="#a4ada7" metalness={.87} roughness={.28} transparent opacity={.56} />
    </mesh>)}
    {/* Two metallic rivets and a tapered, heat-safe handle. */}
    {[-.15, .15].map(z => <mesh key={z} castShadow position={[.993, .355, z]}>
      <sphereGeometry args={[.047, 16, 12]} />
      <meshPhysicalMaterial color={METAL} metalness={.94} roughness={.23} />
    </mesh>)}
    <RoundedBox args={[.55, .11, .29]} radius={.05} smoothness={4} position={[1.23, .303, 0]} castShadow>
      <meshStandardMaterial color="#9da6a3" roughness={.24} metalness={.82} />
    </RoundedBox>
    <mesh position={[1.92, .303, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[.12, .16, 1.04, 36]} />
      <meshPhysicalMaterial color="#242b29" metalness={.18} roughness={.58} clearcoat={.11} />
    </mesh>
    <mesh position={[2.40, .303, 0]} rotation={[0, 0, Math.PI / 2]}>
      <torusGeometry args={[.062, .016, 8, 24]} />
      <meshStandardMaterial color="#abb2ad" metalness={.9} roughness={.25} />
    </mesh>
  </group>;
}

/**
 * A separate moveable borosilicate glass lid. It sits beside the cooking
 * vessel by default, so ingredients remain visible and touch targets clear.
 * Its HTML counterpart is always usable without WebGL pointer support.
 */
function Lid({ quality, open, heat, onChange }: { quality: Quality; open: boolean; heat: number; onChange: (value: boolean) => void }) {
  const reducedMotion = useReducedMotion();
  const root = useRef<THREE.Group>(null);
  const domeGeometry = useMemo(() => new THREE.SphereGeometry(
    .98, quality === 'high' ? 112 : quality === 'balanced' ? 72 : 40,
    quality === 'high' ? 48 : 28, 0, Math.PI * 2, 0, Math.PI / 2,
  ), [quality]);
  useEffect(() => () => domeGeometry.dispose(), [domeGeometry]);

  useFrame((_, delta) => {
    if (!root.current) return;
    const target = open ? [3.42, .62, 1.67, -.24] : [1.16, .47, .15, 0];
    const step = Math.min(.07, delta);
    if (reducedMotion) {
      root.current.position.set(target[0], target[1], target[2]);
      root.current.rotation.z = target[3];
      return;
    }
    root.current.position.x = THREE.MathUtils.damp(root.current.position.x, target[0], 9, step);
    root.current.position.y = THREE.MathUtils.damp(root.current.position.y, target[1], 9, step);
    root.current.position.z = THREE.MathUtils.damp(root.current.position.z, target[2], 9, step);
    root.current.rotation.z = THREE.MathUtils.damp(root.current.rotation.z, target[3], 9, step);
  });

  return <group ref={root} position={open ? [3.42, .62, 1.67] : [1.16, .47, .15]} rotation={[0, 0, open ? -.24 : 0]}
    onClick={event => { event.stopPropagation(); onChange(!open); }}>
    {/* True hollow shape/scale cues instead of a flat circular sticker. */}
    <mesh geometry={domeGeometry} scale={[1, .15, 1]} castShadow>
      <meshPhysicalMaterial color="#e4eee9" metalness={0} roughness={.09}
        transmission={quality === 'eco' ? .15 : .87} thickness={.04} ior={1.47}
        transparent opacity={quality === 'eco' ? .38 : .81}
        clearcoat={.8} clearcoatRoughness={.07}
        side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
      <torusGeometry args={[.98, .045, 18, 112]} />
      <meshPhysicalMaterial color="#b7c0bb" metalness={.93} roughness={.19} />
    </mesh>
    <mesh position={[0, .16, 0]} castShadow>
      <cylinderGeometry args={[.19, .22, .13, 48]} />
      <meshPhysicalMaterial color="#3a4140" roughness={.38} metalness={.3} />
    </mesh>
    <mesh position={[0, .26, 0]} castShadow>
      <cylinderGeometry args={[.14, .16, .09, 48]} />
      <meshPhysicalMaterial color="#b8bdba" metalness={.89} roughness={.18} />
    </mesh>
    {/* Condensation builds inside the lid with heat, without animation or external particles. */}
    {!open && heat > .35 && quality !== 'eco' && Array.from({length: quality === 'high' ? 26 : 14}, (_, index) => {
      const angle = index * 2.399963, radius = .19 + (index % 6) * .11;
      return <mesh key={index} position={[Math.sin(angle) * radius, .022 + .13 * (1 - radius / .98), Math.cos(angle) * radius]} scale={[1, .32, 1]}>
        <sphereGeometry args={[.018 + (index % 3) * .006, 10, 8]} />
        <meshPhysicalMaterial color="#e5f1e9" roughness={.08} transmission={.8} transparent opacity={.58} />
      </mesh>;
    })}
    {quality !== 'eco' && <mesh position={[0, .09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[.58, .66, 80]} />
      <meshPhysicalMaterial color="#dee7e3" metalness={0} roughness={.27} transparent opacity={.1} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>}
  </group>;
}

export default function KitchenCookware({ quality, heat, lidOpen, onLidChange, inspectionProgress = 0 }: Props) {
  const assembly = useRef<THREE.Group>(null);
  const pan = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  useEffect(() => {
    if (!assembly.current || !pan.current || !lid.current) return;
    prepareCookwareInspection(assembly.current, [
      { object: pan.current, direction: new THREE.Vector3(-1, .24, 0), distance: .68, rotation: new THREE.Vector3(0, 0, -.08) },
      { object: lid.current, direction: new THREE.Vector3(.28, 1, .32), distance: .54, rotation: new THREE.Vector3(.12, 0, .16) },
    ]);
    assembly.current.userData.setInspectionProgress = (progress: number) => setCookwareInspection(assembly.current!, progress);
  }, []);
  useFrame(() => {
    if (assembly.current) setCookwareInspection(assembly.current, inspectionProgress);
  });
  return <group ref={assembly}>
    <group ref={pan}>
      <PanBody quality={quality} />
    </group>
    <group ref={lid}>
      <Lid quality={quality} open={lidOpen} heat={heat} onChange={onLidChange} />
    </group>
    {/* Warmth near the base increases with the user's actual burner heat. */}
    {heat > .12 && <pointLight position={[1.16, .18, .15]} intensity={heat * .58} distance={2.4} color="#f8a46d" />}
  </group>;
}
