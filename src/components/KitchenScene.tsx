import { useReducedMotion } from '../motion/preferences';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls, RoundedBox } from '@react-three/drei';
import { CuboidCollider, Physics, RigidBody, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import type { Ingredient, IngredientKind } from '../data/recipes';
import type { CookingAction, KitchenProgress } from '../lib/cooking';
import KitchenEffects, { type KitchenPulse } from './KitchenEffects';

type Props = { quality?: 'eco' | 'balanced' | 'high'; ingredients: Ingredient[]; added: string[]; heat: number; onAdd: (id: string) => void; resetKey: string; progress: KitchenProgress; pulse: KitchenPulse; onAction: (action: CookingAction) => void };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function IngredientModel({ kind }: { kind: IngredientKind }) {
  switch (kind) {
    case 'tomato':
      return <group>
        <mesh castShadow><sphereGeometry args={[.24, 28, 20]} /><meshStandardMaterial color="#d94b32" roughness={.3} /></mesh>
        {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[0, .24, 0]} rotation={[0, i * Math.PI * 2 / 5, Math.PI / 2]}><coneGeometry args={[.055, .21, 3]} /><meshStandardMaterial color="#4d7140" /></mesh>)}
      </group>;
    case 'lemon':
    case 'lime':
      return <group>
        <mesh castShadow scale={[1.27, .83, .82]}><sphereGeometry args={[.23, 32, 24]} /><meshStandardMaterial color={kind === 'lime' ? '#94b945' : '#f4d15c'} roughness={.55} /></mesh>
        {[-1, 1].map(side => <mesh key={side} position={[side * .3, 0, 0]} rotation={[0, 0, side * Math.PI / 2]}><coneGeometry args={[.06, .12, 12]} /><meshStandardMaterial color={kind === 'lime' ? '#8dab3c' : '#e9c44d'} /></mesh>)}
      </group>;
    case 'carrot':
      return <group rotation={[0, 0, -.32]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[.17, .72, 24]} /><meshStandardMaterial color="#ee8c35" roughness={.65} /></mesh>
        {[-.1, 0, .1].map((z, i) => <mesh key={i} position={[-.38, .06, z]} rotation={[z * 2, 0, -.7 + i * .28]}><coneGeometry args={[.035, .3, 6]} /><meshStandardMaterial color="#598746" /></mesh>)}
      </group>;
    case 'mushroom':
      return <group>
        <mesh position={[0, -.09, 0]} castShadow><cylinderGeometry args={[.075, .09, .27, 16]} /><meshStandardMaterial color="#e5d8b9" /></mesh>
        <mesh position={[0, .1, 0]} castShadow scale={[1.2, .72, 1.2]}><sphereGeometry args={[.23, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.7]} /><meshStandardMaterial color="#a7754d" roughness={.82} /></mesh>
        <mesh position={[0, .08, 0]}><cylinderGeometry args={[.19, .19, .025, 24]} /><meshStandardMaterial color="#eee1c6" /></mesh>
      </group>;
    case 'onion':
      return <group>
        <mesh castShadow scale={[.92, 1.04, .92]}><sphereGeometry args={[.23, 28, 24]} /><meshStandardMaterial color="#b58aa0" roughness={.47} /></mesh>
        <mesh position={[0, .23, 0]}><coneGeometry args={[.055, .13, 12]} /><meshStandardMaterial color="#c6a1a8" /></mesh>
        {[-.12, 0, .12].map((x, i) => <mesh key={i} position={[x, 0, .204]} scale={[.15, .88, .08]}><sphereGeometry args={[.23, 12, 12]} /><meshStandardMaterial color="#dfb6bc" transparent opacity={.45} /></mesh>)}
      </group>;
    case 'chili': {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-.33, .07, 0), new THREE.Vector3(-.1, -.06, 0), new THREE.Vector3(.14, -.04, 0), new THREE.Vector3(.31, .1, 0)]);
      return <group><mesh castShadow><tubeGeometry args={[curve, 20, .083, 10, false]} /><meshStandardMaterial color="#c93b2c" roughness={.34} /></mesh><mesh position={[-.35, .09, 0]} rotation={[0, 0, -.6]}><cylinderGeometry args={[.035, .04, .17, 8]} /><meshStandardMaterial color="#457a43" /></mesh></group>;
    }
    case 'garlic':
      return <group>
        {Array.from({ length: 5 }, (_, i) => <mesh key={i} castShadow position={[Math.sin(i * 1.256) * .11, -.035, Math.cos(i * 1.256) * .11]} scale={[.65, 1.05, .65]}><sphereGeometry args={[.17, 16, 12]} /><meshStandardMaterial color="#eee3cb" roughness={.83} /></mesh>)}
        <mesh position={[0, .18, 0]}><coneGeometry args={[.07, .24, 12]} /><meshStandardMaterial color="#e5d6b8" /></mesh>
      </group>;
    case 'eggplant':
      return <group rotation={[0, 0, -.42]}>
        <mesh castShadow scale={[.8, 1.42, .8]}><sphereGeometry args={[.24, 28, 24]} /><meshStandardMaterial color="#50355b" roughness={.29} metalness={.08} /></mesh>
        <mesh position={[0, .36, 0]}><coneGeometry args={[.14, .23, 6]} /><meshStandardMaterial color="#568045" /></mesh>
      </group>;
    case 'herb':
      return <group>
        {Array.from({ length: 7 }, (_, i) => {
          const a = i * Math.PI * 2 / 7;
          return <group key={i} rotation={[0, a, -.35]}>
            <mesh position={[.1, .1, 0]} rotation={[0, 0, -.55]}><sphereGeometry args={[.13, 12, 10]} /><meshStandardMaterial color={i % 2 ? '#5b9349' : '#80a85b'} side={THREE.DoubleSide} /></mesh>
            <mesh position={[0, -.02, 0]}><cylinderGeometry args={[.012, .015, .3, 6]} /><meshStandardMaterial color="#487d42" /></mesh>
          </group>;
        })}
      </group>;
  }
}

function DraggableIngredient({ ingredient, index, cooked, onAdd, onDraggingChange }: {
  ingredient: Ingredient; index: number; cooked: boolean; onAdd: (id: string) => void; onDraggingChange: (dragging: boolean) => void;
}) {
  const body = useRef<RapierRigidBody>(null);
  const dragging = useRef(false);
  const [hover, setHover] = useState(false);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.1), []);
  const point = useMemo(() => new THREE.Vector3(), []);
  const x = -2.55 + (index % 4) * .58;
  const z = -.35 + Math.floor(index / 4) * .76;

  useEffect(() => {
    if (cooked && body.current) {
      body.current.setTranslation({ x: .65 + (index % 3) * .33, y: .95, z: -.14 + Math.floor(index / 3) * .3 }, true);
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  }, [cooked, index]);

  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    event.stopPropagation();
    dragging.current = false;
    onDraggingChange(false);
    (event.target as unknown as { releasePointerCapture?: (id: number) => void }).releasePointerCapture?.(event.pointerId);
    const position = body.current?.translation();
    if (position && position.x > .15 && position.x < 2.25 && Math.abs(position.z - .15) < 1.05) onAdd(ingredient.id);
  };

  return <RigidBody ref={body} colliders="ball" restitution={.18} friction={1.3} linearDamping={2.2} angularDamping={3.5} position={[x, .95 + (index % 2) * .12, z]} enabledRotations={[false, true, false]}>
    <group
      scale={cooked ? .9 : 1}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      onPointerDown={(event) => {
        if (cooked) return;
        event.stopPropagation();
        dragging.current = true;
        onDraggingChange(true);
        (event.target as unknown as { setPointerCapture?: (id: number) => void }).setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragging.current) return;
        event.stopPropagation();
        if (event.ray.intersectPlane(plane, point) && body.current) {
          body.current.setTranslation({ x: clamp(point.x, -3.1, 2.9), y: 1.1, z: clamp(point.z, -1.5, 1.4) }, true);
          body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          body.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <IngredientModel kind={ingredient.kind} />
      {hover && !cooked && <mesh position={[0, .52, 0]}><ringGeometry args={[.20, .27, 24]} /><meshBasicMaterial color="#a7e063" side={THREE.DoubleSide} /></mesh>}
    </group>
  </RigidBody>;
}

function Burner({ heat }: { heat: number }) {
  const reducedMotion = useReducedMotion();
  const shader = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (shader.current) {
      shader.current.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
      shader.current.uniforms.uHeat.value = heat;
    }
  });
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.16, .279, .15]}>
    <circleGeometry args={[1.16, 64]} />
    <shaderMaterial
      ref={shader} transparent depthWrite={false}
      uniforms={{ uTime: { value: 0 }, uHeat: { value: heat } }}
      vertexShader="varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
      fragmentShader="varying vec2 vUv; uniform float uTime; uniform float uHeat; void main(){float d=distance(vUv,vec2(.5));float rings=smoothstep(.018,.002,abs(d-.31))+smoothstep(.015,.002,abs(d-.39));float pulse=.78+.22*sin(uTime*(2.0+uHeat*3.0));vec3 col=mix(vec3(.23,.28,.21),vec3(1.,.29,.08),uHeat);gl_FragColor=vec4(col,rings*(.25+uHeat*.72)*pulse);}"
    />
  </mesh>;
}

function KitchenEnvironment({ heat }: { heat: number }) {
  return <group>
    <mesh position={[0, 1.95, -3.08]} receiveShadow><planeGeometry args={[11, 6]} /><meshStandardMaterial color="#344139" roughness={1} /></mesh>
    <mesh position={[0, 1.15, -3.02]} receiveShadow><planeGeometry args={[11, 1.55]} /><meshStandardMaterial color="#d4c8ac" roughness={.93} /></mesh>
    {Array.from({ length: 16 }, (_, i) => <mesh key={'v' + i} position={[-5.2 + i * .7, 1.15, -2.99]}><planeGeometry args={[.008, 1.55]} /><meshBasicMaterial color="#afa38e" transparent opacity={.45} /></mesh>)}
    {Array.from({ length: 4 }, (_, i) => <mesh key={'h' + i} position={[0, .56 + i * .4, -2.985]}><planeGeometry args={[11, .008]} /><meshBasicMaterial color="#afa38e" transparent opacity={.45} /></mesh>)}
    <RoundedBox args={[8.8, .23, .47]} radius={.06} position={[0, 2.36, -2.76]} castShadow><meshStandardMaterial color="#5b3c2d" roughness={.67} /></RoundedBox>
    {[-3.3, -2.4, 2.6, 3.5].map((x, i) => <group key={i} position={[x, 2.64, -2.69]}>
      <mesh castShadow><cylinderGeometry args={[.16, .17, .39, 16]} /><meshStandardMaterial color={i % 2 ? '#e0bd7e' : '#d4d0b9'} roughness={.5} /></mesh>
      <mesh position={[0, .22, 0]}><cylinderGeometry args={[.18, .18, .05, 16]} /><meshStandardMaterial color="#3c4034" /></mesh>
    </group>)}
    {/* Original low-poly shelf vignette: decorative only, outside the cooking physics. */}
    <group position={[0, 2.65, -2.62]}>
      <mesh castShadow position={[0, -0.03, 0]}>
        <boxGeometry args={[1.24, .17, .42]} />
        <meshStandardMaterial color="#986841" roughness={.83} />
      </mesh>
      {[-.36, -.12, .12, .36].map((x, i) => (
        <group key={x} position={[x, .16, 0]}>
          <mesh castShadow>
            <icosahedronGeometry args={[i === 3 ? .14 : .12, 1]} />
            <meshStandardMaterial color={['#d46e35', '#e4b742', '#a9bd65', '#b84d34'][i]} roughness={.7} />
          </mesh>
          <mesh position={[0, .13, 0]} rotation={[0, 0, .35]}>
            <cylinderGeometry args={[.012, .013, .09, 6]} />
            <meshStandardMaterial color="#58724b" />
          </mesh>
        </group>
      ))}
      <mesh castShadow position={[.69, .05, 0]}>
        <cylinderGeometry args={[.13, .16, .35, 12]} />
        <meshStandardMaterial color="#dad0b2" roughness={.92} />
      </mesh>
      {[-.05, .06].map((x) => (
        <mesh key={x} position={[.69 + x, .32, 0]} rotation={[0, 0, x * 3]}>
          <icosahedronGeometry args={[.14, 0]} />
          <meshStandardMaterial color="#5f8456" />
        </mesh>
      ))}
    </group>
    <mesh position={[0, -.72, 0]} receiveShadow castShadow><boxGeometry args={[9.4, .85, 6.1]} /><meshStandardMaterial color="#785a43" roughness={.78} /></mesh>
    <mesh position={[0, -.25, 0]} receiveShadow><boxGeometry args={[9.5, .14, 6.2]} /><meshStandardMaterial color="#b7a58c" roughness={.72} /></mesh>
    <mesh position={[0, -.172, 0]} receiveShadow><boxGeometry args={[9.5, .015, 6.2]} /><meshStandardMaterial color="#e3d8c4" roughness={.7} /></mesh>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[4.75, .08, 3.1]} position={[0, -.16, 0]} />
      <CuboidCollider args={[1.38, .1, 1.08]} position={[-1.64, .005, .23]} />
      <CuboidCollider args={[.94, .08, .88]} position={[1.16, .22, .15]} />
    </RigidBody>
    <RoundedBox args={[2.78, .2, 2.2]} radius={.12} smoothness={4} position={[-1.64, -.03, .23]} castShadow receiveShadow><meshStandardMaterial color="#bc8859" roughness={.7} /></RoundedBox>
    {[-.78, .78].map((z, i) => <mesh key={i} position={[-1.64, .077, .23 + z]}><boxGeometry args={[2.4, .005, .016]} /><meshStandardMaterial color="#986b48" transparent opacity={.45} /></mesh>)}
    <mesh position={[1.16, -.06, .15]} castShadow><cylinderGeometry args={[1.28, 1.28, .17, 64]} /><meshStandardMaterial color="#333932" metalness={.62} roughness={.37} /></mesh>
    <Burner heat={heat} />
    <mesh position={[1.16, .12, .15]} castShadow receiveShadow><cylinderGeometry args={[1.04, .9, .28, 64]} /><meshStandardMaterial color="#272b29" metalness={.68} roughness={.29} /></mesh>
    <mesh position={[1.16, .271, .15]}><torusGeometry args={[.98, .055, 12, 64]} /><meshStandardMaterial color="#515851" metalness={.7} roughness={.28} /></mesh>
    <mesh position={[1.16, .273, .15]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.92, 64]} /><meshStandardMaterial color="#3c4039" metalness={.28} roughness={.67} /></mesh>
    <mesh position={[2.43, .16, .15]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[.115, .15, 1.3, 20]} /><meshStandardMaterial color="#343a33" roughness={.5} /></mesh>
    <mesh position={[2.99, .16, .15]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.16, .16, .48, 20]} /><meshStandardMaterial color="#a7774e" roughness={.63} /></mesh>
    <group position={[3.62, .02, -1.3]}>
      <mesh castShadow><cylinderGeometry args={[.31, .26, .53, 20]} /><meshStandardMaterial color="#ddd3b9" /></mesh>
      {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[(i - 2) * .07, .42 + (i % 2) * .1, 0]}><sphereGeometry args={[.15, 12, 8]} /><meshStandardMaterial color="#567c4b" /></mesh>)}
    </group>
    <group position={[-3.68, .03, -1.1]}>
      <mesh castShadow><cylinderGeometry args={[.28, .31, .5, 20]} /><meshStandardMaterial color="#c8a57d" /></mesh>
      {[-.12, 0, .12].map((x, i) => <mesh key={i} position={[x, .45, 0]} rotation={[0, 0, .12 * i]}><cylinderGeometry args={[.026, .026, .55, 8]} /><meshStandardMaterial color="#c6a17b" /></mesh>)}
    </group>
  </group>;
}

function KitchenWorld({ ingredients, added, heat, onAdd, progress, pulse, onAction }: Omit<Props, 'resetKey'>) {
  const [dragging, setDragging] = useState(false);
  return <>
    <color attach="background" args={['#d8d1bf']} />
    <fog attach="fog" args={['#d8d1bf', 12, 23]} />
    <ambientLight intensity={1.45} />
    <hemisphereLight args={['#fff9e8', '#6a5d4b', 1.35]} />
    <directionalLight position={[-3, 7, 5]} intensity={3} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
    <pointLight position={[1, 2.3, .2]} color={heat > 0 ? '#ffab6b' : '#fff4d8'} intensity={heat * 4 + .6} distance={5} />
    <Physics gravity={[0, -9.81, 0]} colliders={false}>
      <KitchenEnvironment heat={heat} />
      {ingredients.slice(0, 8).map((ingredient, index) =>
        <DraggableIngredient key={ingredient.id} ingredient={ingredient} index={index} cooked={added.includes(ingredient.id)} onAdd={onAdd} onDraggingChange={setDragging} />
      )}
    </Physics>
    <KitchenEffects progress={progress} pulse={pulse} onAction={onAction} heat={heat} addedCount={added.length} />
    <ContactShadows position={[0, -.15, 0]} opacity={.24} scale={10} blur={2.5} far={4} />
    <OrbitControls makeDefault enabled={!dragging} enablePan={false} minDistance={5} maxDistance={11} minPolarAngle={.35} maxPolarAngle={1.4} target={[0, .55, 0]} />
  </>;
}

export default function KitchenScene({ quality = 'balanced', ingredients, added, heat, onAdd, resetKey, progress, pulse, onAction }: Props) {
  return <div className="kitchen-canvas" aria-label="Interactive three-dimensional kitchen. Drag food from the chopping board into the pan, or use the ingredient buttons beside the scene.">
    <Canvas key={resetKey} shadows={quality !== 'eco'} camera={{ position: [5.2, 4.25, 6.8], fov: 42, near: .1, far: 100 }} dpr={quality === 'eco' ? [1, 1] : quality === 'high' ? [1, 1.7] : [1, 1.2]} gl={{ antialias: quality !== 'eco', powerPreference: quality === 'eco' ? 'low-power' : 'high-performance' }}>
      <Suspense fallback={null}><KitchenWorld ingredients={ingredients} added={added} heat={heat} onAdd={onAdd} progress={progress} pulse={pulse} onAction={onAction} /></Suspense>
    </Canvas>
  </div>;
}
