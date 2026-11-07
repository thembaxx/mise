import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useReducedMotion } from '../motion/preferences';
import KitchenCookware from './KitchenCookware';

type Quality = 'eco' | 'balanced' | 'high';
type Props = {
  quality: Quality;
  heat: number;
  onHeatChange: (value: number) => void;
  drawerOpen: boolean;
  onDrawerChange: (open: boolean) => void;
  faucetRunning: boolean;
  onFaucetChange: (running: boolean) => void;
  lidOpen: boolean;
  onLidChange: (open: boolean) => void;
  inspectionProgress?: number;
};

const CREAM = '#ece7d9';
const STEEL = '#a6aaa8';
const BRASS = '#c4a174';

// Original, repeatable fine-grain textures: no remote assets or network required.
// DataTexture avoids loading a large image on first paint and remains PWA/offline safe.
function surfaceTexture(kind: 'stone' | 'oak', quality: Quality) {
  const size = quality === 'high' ? 1024 : quality === 'balanced' ? 512 : 256;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const grain = Math.sin(u * 132 + Math.sin(v * 16) * 3 + Math.sin(v * 43 + u * 6) * 1.4);
      const fine = Math.sin(u * 497 + v * 89) * Math.sin(v * 441 - u * 71);
      const fleck = Math.sin(x * 1.73 + y * 2.31) * Math.sin(x * .93 - y * 1.13);
      let r: number;
      let g: number;
      let b: number;
      if (kind === 'oak') {
        const figure = (grain * 7 + fine * 2 + fleck * 2) + Math.sin(u * 21 + v * 7) * 8;
        r = 165 + figure;
        g = 113 + figure * .88;
        b = 68 + figure * .67;
      } else {
        const veinField = u * 19 + v * 12 + Math.sin(v * 20 + u * 5) * 2 + Math.sin(u * 31 - v * 27) * .7;
        const vein = Math.pow(Math.max(0, Math.cos(veinField)), 24) * 34;
        const cloud = Math.sin(u * 27 + Math.sin(v * 15)) * 4 + Math.sin(v * 32 + u * 5) * 3;
        r = 218 + cloud - vein + fleck * 3;
        g = 211 + cloud - vein * .95 + fleck * 3;
        b = 195 + cloud - vein * .8 + fleck * 3;
      }
      const index = (y * size + x) * 4;
      pixels[index] = Math.max(0, Math.min(255, r));
      pixels[index + 1] = Math.max(0, Math.min(255, g));
      pixels[index + 2] = Math.max(0, Math.min(255, b));
      pixels[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = quality === 'high' ? 8 : 4;
  texture.needsUpdate = true;
  return texture;
}

function MetalHandle({ x, y, z, width = .72 }: { x: number; y: number; z: number; width?: number }) {
  return <group position={[x, y, z]}>
    {[-1, 1].map(side => (
      <mesh key={side} position={[side * width * .39, 0, .045]} castShadow>
        <cylinderGeometry args={[.025, .029, .11, 16]} />
        <meshStandardMaterial color={STEEL} metalness={.87} roughness={.2} />
      </mesh>
    ))}
    <mesh position={[0, 0, .105]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[.028, .028, width, 20]} />
      <meshStandardMaterial color="#c6c9c6" metalness={.88} roughness={.19} />
    </mesh>
  </group>;
}

function Ceramics({ quality }: { quality: Quality }) {
  const columns = quality === 'eco' ? 12 : 18;
  const rows = quality === 'eco' ? 3 : 5;
  const width = 9.9 / columns;
  const height = 1.48 / rows;
  return <group>
    {Array.from({ length: rows * columns }, (_, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      return <mesh key={index} position={[-4.68 + (col + .5) * width, .44 + (row + .5) * height, -2.94]} receiveShadow>
        <boxGeometry args={[width - .012, height - .013, .028]} />
        <meshPhysicalMaterial color={index % 13 === 0 ? '#c3c6bc' : index % 7 === 0 ? '#e9e8de' : CREAM} roughness={.28} clearcoat={.24} clearcoatRoughness={.3} />
      </mesh>;
    })}
    <mesh position={[0, .42, -2.91]}><boxGeometry args={[10, .035, .06]} /><meshStandardMaterial color="#a0a39b" metalness={.42} roughness={.39} /></mesh>
  </group>;
}

function UpperCabinet({ x, width = 1.4 }: { x: number; width?: number }) {
  return <group position={[x, 3.16, -2.77]}>
    <RoundedBox args={[width, 1.02, .59]} radius={.045} smoothness={4} castShadow>
      <meshPhysicalMaterial color="#35433d" roughness={.62} clearcoat={.14} />
    </RoundedBox>
    <RoundedBox args={[width - .14, .88, .065]} position={[0, .01, .333]} radius={.035} smoothness={3} castShadow>
      <meshPhysicalMaterial color="#465449" roughness={.63} clearcoat={.12} />
    </RoundedBox>
    <MetalHandle x={width * .18} y={-.3} z={.39} width={.35} />
    <mesh position={[0, -.54, .3]}><boxGeometry args={[width - .12, .018, .1]} /><meshBasicMaterial color="#ffe1a0" toneMapped={false} /></mesh>
  </group>;
}


/**
 * A real inset opening in the stone, instead of a sink painted onto a
 * solid countertop. Geometry is intentionally decorative: the established
 * physics counter collider stays in place, preserving cooking/drag logic.
 */
function Countertop({ stone }: { stone: THREE.Texture }) {
  const geometry = useMemo(() => {
    const surface = new THREE.Shape();
    surface.moveTo(-4.76, -3.09);
    surface.lineTo(4.76, -3.09);
    surface.lineTo(4.76, 3.09);
    surface.lineTo(-4.76, 3.09);
    surface.closePath();

    // After the -90-degree X rotation, negative shape Y is positive world Z.
    // Sink opening: centre (-3.75, z=1.61), 1.02 × 0.93 inside the rim.
    const opening = new THREE.Path();
    opening.moveTo(-4.26, -2.075);
    opening.lineTo(-4.26, -1.145);
    opening.lineTo(-3.24, -1.145);
    opening.lineTo(-3.24, -2.075);
    opening.closePath();
    surface.holes.push(opening);

    const result = new THREE.ExtrudeGeometry(surface, {
      depth: .047, steps: 1,
      bevelEnabled: true, bevelThickness: .005, bevelSize: .006,
      bevelSegments: 2, curveSegments: 16,
    });
    result.rotateX(-Math.PI / 2);
    result.computeVertexNormals();
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={[0, -.1385, 0]} castShadow receiveShadow>
    <meshPhysicalMaterial map={stone} roughness={.34} metalness={.03} clearcoat={.19} clearcoatRoughness={.31} />
  </mesh>;
}

/** Continuous inset steel basin with real depth and visible metallic walls. */
function basinGeometry() {
  const positions: number[] = [];
  for (const [hw, hd, y] of [[.51, .465, -.09], [.43, .385, -.275]] as const) {
    positions.push(-hw, y, -hd, hw, y, -hd, hw, y, hd, -hw, y, hd);
  }
  const indices: number[] = [];
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    indices.push(i, next, i + 4, next, next + 4, i + 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function KitchenSink({ quality, faucetRunning, onFaucetChange }: { quality: Quality; faucetRunning: boolean; onFaucetChange: (running: boolean) => void }) {
  const reducedMotion = useReducedMotion();
  const ripples = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({clock}) => {
    ripples.current.forEach((ring, index) => {
      if (!ring) return;
      const phase = reducedMotion ? .3 + index * .23 : (clock.elapsedTime * .7 + index / 3) % 1;
      ring.scale.setScalar(.3 + phase * 2.7);
      (ring.material as THREE.MeshBasicMaterial).opacity = faucetRunning ? .29 * (1 - phase) : 0;
      ring.visible = faucetRunning;
    });
  });
  const basin = useMemo(basinGeometry, []);
  const lip = useMemo(() => {
    const outer = new THREE.Shape();
    outer.moveTo(-.63, -.56);
    outer.lineTo(.63, -.56);
    outer.lineTo(.63, .56);
    outer.lineTo(-.63, .56);
    outer.closePath();
    const inner = new THREE.Path();
    inner.moveTo(-.51, -.465);
    inner.lineTo(-.51, .465);
    inner.lineTo(.51, .465);
    inner.lineTo(.51, -.465);
    inner.closePath();
    outer.holes.push(inner);
    const geometry = new THREE.ExtrudeGeometry(outer, { depth: .014, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 2 });
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, []);
  useEffect(() => () => { basin.dispose(); lip.dispose(); }, [basin, lip]);
  const faucet = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.75, -.03, 2.62),
    new THREE.Vector3(-3.75, .38, 2.62),
    new THREE.Vector3(-3.75, .64, 2.45),
    new THREE.Vector3(-3.75, .64, 2.1),
    new THREE.Vector3(-3.75, .46, 1.98),
  ]), []);
  return <group>
    <mesh geometry={lip} position={[-3.75, -.092, 1.61]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#bec5c2" metalness={.95} roughness={.19} />
    </mesh>
    <mesh geometry={basin} position={[-3.75, 0, 1.61]} receiveShadow>
      <meshPhysicalMaterial color="#6a7572" metalness={.84} roughness={.28} side={THREE.DoubleSide} />
    </mesh>
    <RoundedBox args={[.86, .017, .77]} position={[-3.75, -.275, 1.61]} radius={.07} smoothness={4} receiveShadow>
      <meshPhysicalMaterial color="#4b5b59" metalness={.75} roughness={.34} />
    </RoundedBox>
    <mesh position={[-3.75, -.262, 1.61]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[.065, .012, 8, 32]} />
      <meshStandardMaterial color="#b6c3be" metalness={.94} roughness={.18} />
    </mesh>
    <mesh castShadow>
      <tubeGeometry args={[faucet, quality === 'eco' ? 18 : 36, .048, 12, false]} />
      <meshPhysicalMaterial color="#c9cdc9" metalness={.94} roughness={.16} />
    </mesh>
    <group position={[-3.57, .25, 2.56]} onClick={event => { event.stopPropagation(); onFaucetChange(!faucetRunning); }}>
      <mesh castShadow><cylinderGeometry args={[.09, .09, .12, 32]} /><meshPhysicalMaterial color="#c9cdc9" metalness={.94} roughness={.15} /></mesh>
      <mesh position={[.13, .055, 0]} rotation={[0, 0, faucetRunning ? -.28 : 0]} castShadow>
        <boxGeometry args={[.26, .037, .068]} />
        <meshPhysicalMaterial color="#d3d9d6" metalness={.95} roughness={.17} />
      </mesh>
    </group>
    {faucetRunning && <>
      <mesh position={[-3.75, .10, 1.98]}>
        <cylinderGeometry args={[.015, .03, .73, 20]} />
        <meshPhysicalMaterial color="#a2dce8" transmission={.35} transparent opacity={.71} roughness={.08} metalness={0} depthWrite={false} />
      </mesh>
      {[0, 1, 2].map(index => (
        <mesh key={index} ref={node => { ripples.current[index] = node; }} position={[-3.75, -.262 + index * .002, 1.98]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[.09, .005, 6, 32]} />
          <meshBasicMaterial color="#d0f5fa" transparent opacity={.15} depthWrite={false} />
        </mesh>
      ))}
    </>}
  </group>;
}

function StoveDetails({ heat, onHeatChange }: Pick<Props, 'heat' | 'onHeatChange'>) {
  const stepHeat = () => onHeatChange(heat > .89 ? 0 : Math.min(1, Math.round((heat + .2) * 100) / 100));
  return <group>
    <RoundedBox args={[3.2, .058, 3.0]} radius={.09} position={[1.22, -.067, -.16]} smoothness={4} castShadow receiveShadow>
      <meshPhysicalMaterial color="#1d2524" metalness={.74} roughness={.23} clearcoat={.34} />
    </RoundedBox>
    <mesh position={[1.05, -.023, -1.07]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[.39, .025, 12, 64]} /><meshPhysicalMaterial color="#8c8e88" metalness={.88} roughness={.22} />
    </mesh>
    {[.18, .29].map(radius => <mesh key={radius} position={[1.05, -.013, -1.07]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, .018, 8, 64]} /><meshStandardMaterial color="#424a47" roughness={.3} metalness={.8} />
    </mesh>)}
    <group position={[2.55, .04, 1.02]} onClick={event => { event.stopPropagation(); stepHeat(); }}>
      <mesh castShadow>
        <cylinderGeometry args={[.175, .175, .10, 40]} />
        <meshPhysicalMaterial color="#aaa9a1" metalness={.88} roughness={.18} clearcoat={.38} />
      </mesh>
      <mesh position={[0, .075, 0]} rotation={[0, 0, -heat * Math.PI * 1.45]}>
        <boxGeometry args={[.028, .014, .15]} />
        <meshBasicMaterial color="#f2bc73" />
      </mesh>
      <mesh position={[0, .07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[.22, .01, 6, 40]} />
        <meshStandardMaterial color={heat > 0 ? '#ee9650' : '#727a73'} metalness={.6} roughness={.45} />
      </mesh>
    </group>
  </group>;
}

export default function KitchenDetails({ quality, heat, onHeatChange, drawerOpen, onDrawerChange, faucetRunning, onFaucetChange, lidOpen, onLidChange, inspectionProgress = 0 }: Props) {
  const reducedMotion = useReducedMotion();
  const drawer = useRef<THREE.Group>(null);
  const textures = useMemo(() => ({
    stone: surfaceTexture('stone', quality),
    oak: surfaceTexture('oak', quality),
  }), [quality]);
  useEffect(() => () => {
    textures.stone.dispose();
    textures.oak.dispose();
  }, [textures]);

  useFrame((_state, delta) => {
    if (!drawer.current) return;
    const target = drawerOpen ? 3.79 : 3.115;
    drawer.current.position.z = reducedMotion ? target : THREE.MathUtils.damp(drawer.current.position.z, target, 11, Math.min(delta, .1));
  });

  return <group>
    {/* Slightly raised slab sits above the original physics collision plane. */}
    <Countertop stone={textures.stone} />
    <mesh position={[0, -.17, 3.11]} castShadow>
      <boxGeometry args={[9.54, .095, .06]} />
      <meshStandardMaterial color="#a9a99e" metalness={.36} roughness={.42} />
    </mesh>
    <mesh receiveShadow position={[-1.64, .083, .23]}>
      <boxGeometry args={[2.72, .023, 2.14]} />
      <meshPhysicalMaterial map={textures.oak} color="#f7e5cc" roughness={.67} clearcoat={.11} clearcoatRoughness={.53} />
    </mesh>
    {Array.from({ length: quality === 'high' ? 9 : 5 }, (_, i) => (
      <mesh key={i} position={[-2.59 + i * .23, .099, -.63 + (i % 2) * .06]} rotation={[-Math.PI / 2, 0, -.16]}>
        <planeGeometry args={[.007, .19 + i % 3 * .12]} />
        <meshBasicMaterial color="#64472d" transparent opacity={.12} />
      </mesh>
    ))}
    <Ceramics quality={quality} />
    <UpperCabinet x={-3.75} width={1.7} />
    <UpperCabinet x={-2.08} width={1.46} />
    <UpperCabinet x={2.9} width={1.36} />
    <UpperCabinet x={4.12} width={1.02} />
    <mesh position={[1.15, 3.31, -2.8]} castShadow>
      <boxGeometry args={[2.38, .47, .73]} />
      <meshPhysicalMaterial color="#b6b9b1" roughness={.22} metalness={.88} />
    </mesh>
    <mesh position={[1.15, 2.98, -2.56]} castShadow>
      <cylinderGeometry args={[1.01, .77, .2, 4]} />
      <meshPhysicalMaterial color="#b8bcb9" metalness={.89} roughness={.19} />
    </mesh>
    <pointLight position={[1.16, 2.83, -2.3]} intensity={quality === 'eco' ? .35 : .85} distance={5} color="#ffdea8" />
    <StoveDetails heat={heat} onHeatChange={onHeatChange} />
    <KitchenCookware quality={quality} heat={heat} lidOpen={lidOpen} onLidChange={onLidChange} inspectionProgress={inspectionProgress} />
    <KitchenSink quality={quality} faucetRunning={faucetRunning} onFaucetChange={onFaucetChange} />
    {/* Front cabinetry is visible from the default three-quarter camera. */}
    {[-3.72, -1.94, -.15, 1.65, 3.52].map((x, i) => i === 1 ? null : (
      <group key={i} position={[x, -.68, 3.06]}>
        <RoundedBox args={[1.59, .66, .065]} radius={.035} smoothness={3} castShadow>
          <meshPhysicalMaterial color={i % 2 === 0 ? '#425347' : '#3b4b41'} roughness={.57} clearcoat={.16} />
        </RoundedBox>
        <MetalHandle x={0} y={.18} z={.08} width={.7} />
      </group>
    ))}
    <mesh position={[-1.94, -.65, 3.062]}>
      <boxGeometry args={[1.57, .65, .012]} /><meshStandardMaterial color="#18251d" roughness={1} />
    </mesh>
    <group ref={drawer} position={[-1.94, -.65, 3.115]} onClick={event => { event.stopPropagation(); onDrawerChange(!drawerOpen); }}>
      <RoundedBox args={[1.53, .35, .09]} radius={.035} smoothness={4} castShadow>
        <meshPhysicalMaterial color="#536856" roughness={.5} clearcoat={.2} />
      </RoundedBox>
      <MetalHandle x={0} y={.04} z={.085} width={.72} />
      <group position={[0, .04, -.30]}>
        <mesh receiveShadow position={[0, -.13, 0]}><boxGeometry args={[1.39, .035, .69]} /><meshStandardMaterial color="#936f4c" roughness={.76} /></mesh>
        {[-.68, .68].map(x => <mesh key={x} position={[x, -.02, 0]}><boxGeometry args={[.028, .22, .69]} /><meshStandardMaterial color="#936f4c" roughness={.78} /></mesh>)}
        <mesh position={[0, -.02, -.34]}><boxGeometry args={[1.4, .22, .025]} /><meshStandardMaterial color="#7f5e42" /></mesh>
        {[-.3, 0, .3].map((x, i) => <group key={x} position={[x, -.091, -.03]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow><cylinderGeometry args={[.017, .027, .47, 12]} /><meshStandardMaterial color={i === 1 ? BRASS : STEEL} metalness={.84} roughness={.27} /></mesh>
          <mesh position={[0, .26, 0]}><sphereGeometry args={[.036, 10, 8]} /><meshStandardMaterial color={i === 1 ? BRASS : STEEL} metalness={.81} roughness={.27} /></mesh>
        </group>)}
      </group>
    </group>
    {/* Small glazed objects add scale cues and catch highlights without extra downloads. */}
    {[-3.13, -2.62, 3.12, 3.57].map((x, i) => (
      <group key={i} position={[x, 2.64, -2.52]}>
        <mesh castShadow><cylinderGeometry args={[.14, .15, .29, 24]} /><meshPhysicalMaterial color={i % 2 ? '#b88554' : '#d1b67c'} roughness={.36} metalness={.06} clearcoat={.22} /></mesh>
        <mesh position={[0, .16, 0]}><cylinderGeometry args={[.16, .16, .045, 24]} /><meshStandardMaterial color={BRASS} metalness={.68} roughness={.32} /></mesh>
        <mesh position={[0, -.055, .148]}><boxGeometry args={[.16, .11, .006]} /><meshStandardMaterial color="#e7d9bd" roughness={.8} /></mesh>
      </group>
    ))}
  </group>;
}
