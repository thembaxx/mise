import { diagnostics, recordIngredientDrop } from '../lib/diagnostics';
import { useReducedMotion } from '../motion/preferences';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber';
import { ContactShadows, RoundedBox } from '@react-three/drei';
import { CuboidCollider, Physics, RigidBody, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import type { Ingredient } from '../data/recipes';
import type { CookingAction, KitchenProgress } from '../lib/cooking';
import KitchenEffects, { type KitchenPulse } from './KitchenEffects';
import KitchenDetails from './KitchenDetails';
import IngredientModel from './KitchenProduce';
import KitchenCameraRig, { type KitchenCameraView } from './KitchenCameraRig';
import KitchenStudioEnvironment from './KitchenStudioEnvironment';

type Props = { quality?: 'eco' | 'balanced' | 'high'; paused?: boolean; ingredients: Ingredient[]; added: string[]; heat: number; onHeatChange: (value: number) => void; drawerOpen: boolean; onDrawerChange: (open: boolean) => void; faucetRunning: boolean; onFaucetChange: (running: boolean) => void; lidOpen: boolean; onLidChange: (open: boolean) => void; cameraView: KitchenCameraView; onAdd: (id: string) => void; resetKey: string; progress: KitchenProgress; pulse: KitchenPulse; onAction: (action: CookingAction) => void };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function DraggableIngredient({ ingredient, index, cooked, onAdd, onDraggingChange, quality }: {
  ingredient: Ingredient; index: number; cooked: boolean; onAdd: (id: string) => void; onDraggingChange: (dragging: boolean) => void; quality: 'eco' | 'balanced' | 'high';
}) {
  const body = useRef<RapierRigidBody>(null);
  const dragging = useRef(false);
  const dragStarted = useRef(0);
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
    const inPan = Boolean(position && position.x > .15 && position.x < 2.25 && Math.abs(position.z - .15) < 1.05);
    recordIngredientDrop(event.pointerType, event.type === 'pointercancel', inPan, performance.now() - dragStarted.current);
    if (inPan) onAdd(ingredient.id);
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
        dragStarted.current = performance.now();
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
      <IngredientModel kind={ingredient.kind} quality={quality} />
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
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.16, .035, .15]}>
    <circleGeometry args={[1.16, 64]} />
    <shaderMaterial
      ref={shader} transparent depthWrite={false}
      uniforms={{ uTime: { value: 0 }, uHeat: { value: heat } }}
      vertexShader="varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
      fragmentShader="varying vec2 vUv; uniform float uTime; uniform float uHeat; void main(){float d=distance(vUv,vec2(.5));float rings=smoothstep(.018,.002,abs(d-.466))+smoothstep(.012,.003,abs(d-.486));float pulse=.78+.22*sin(uTime*(2.0+uHeat*3.0));vec3 col=mix(vec3(.31,.29,.27),vec3(1.,.32,.08),uHeat);gl_FragColor=vec4(col,rings*(.08+uHeat*.82)*pulse);}"
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
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[4.75, .08, 3.1]} position={[0, -.16, 0]} />
      <CuboidCollider args={[1.38, .1, 1.08]} position={[-1.64, .005, .23]} />
      <CuboidCollider args={[.94, .08, .88]} position={[1.16, .22, .15]} />
    </RigidBody>
    <RoundedBox args={[2.78, .2, 2.2]} radius={.12} smoothness={4} position={[-1.64, -.03, .23]} castShadow receiveShadow><meshStandardMaterial color="#bc8859" roughness={.7} /></RoundedBox>
    {[-.78, .78].map((z, i) => <mesh key={i} position={[-1.64, .077, .23 + z]}><boxGeometry args={[2.4, .005, .016]} /><meshStandardMaterial color="#986b48" transparent opacity={.45} /></mesh>)}
    <mesh position={[1.16, -.06, .15]} castShadow><cylinderGeometry args={[1.28, 1.28, .17, 64]} /><meshStandardMaterial color="#333932" metalness={.62} roughness={.37} /></mesh>
    <Burner heat={heat} />
    {/* Skillet and lid are modeled once in KitchenCookware; keep the original collision volumes. */}
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

function KitchenWorld({ ingredients, added, heat, onHeatChange, drawerOpen, onDrawerChange, faucetRunning, onFaucetChange, lidOpen, onLidChange, cameraView, onAdd, progress, pulse, onAction, quality = 'balanced', paused = false, inspectionProgress = 0 }: Omit<Props, 'resetKey'>) {
  const [dragging, setDragging] = useState(false);
  return <>
    <color attach="background" args={['#d8d1bf']} />
    <fog attach="fog" args={['#d8d1bf', 12, 23]} />
    <KitchenStudioEnvironment quality={quality} />
    <ambientLight intensity={.68} />
    <hemisphereLight args={['#fff9e8', '#6a5d4b', .92]} />
    <directionalLight position={[-3, 7, 5]} intensity={2.75} castShadow shadow-mapSize={quality === 'high' ? [2048, 2048] : quality === 'balanced' ? [1024, 1024] : [512, 512]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
    <pointLight position={[1, 2.3, .2]} color={heat > 0 ? '#ffab6b' : '#fff4d8'} intensity={heat * 2.4 + .75} distance={5} />
    <Physics gravity={[0, -9.81, 0]} colliders={false} paused={paused}>
      <KitchenEnvironment heat={heat} />
      <KitchenDetails quality={quality} heat={heat} onHeatChange={onHeatChange} drawerOpen={drawerOpen} onDrawerChange={onDrawerChange} faucetRunning={faucetRunning} onFaucetChange={onFaucetChange} lidOpen={lidOpen} onLidChange={onLidChange} inspectionProgress={inspectionProgress} />
      {ingredients.slice(0, 8).map((ingredient, index) =>
        <DraggableIngredient key={ingredient.id} ingredient={ingredient} index={index} cooked={added.includes(ingredient.id)} onAdd={onAdd} onDraggingChange={setDragging} quality={quality} />
      )}
    </Physics>
    <KitchenEffects progress={progress} pulse={pulse} onAction={onAction} heat={heat} addedCount={added.length} quality={quality} />
    <ContactShadows position={[0, -.15, 0]} opacity={.24} scale={10} blur={2.5} far={4} />
    <KitchenCameraRig view={cameraView} dragging={dragging} />
  </>;
}

export default function KitchenScene({ quality = 'balanced', paused = false, ingredients, added, heat, onHeatChange, drawerOpen, onDrawerChange, faucetRunning, onFaucetChange, lidOpen, onLidChange, cameraView, onAdd, resetKey, progress, pulse, onAction }: Props) {
  const [inspectionProgress, setInspectionProgress] = useState(0);
  useEffect(() => setInspectionProgress(0), [resetKey]);
  return <div className="kitchen-canvas" style={{ position: 'relative' }} data-scene-paused={paused ? 'true' : 'false'} aria-label="Interactive three-dimensional kitchen. Drag food from the chopping board into the pan, or use the ingredient buttons beside the scene.">
    <Canvas onCreated={() => diagnostics.record('webgl_start', 'success')} key={resetKey} frameloop={paused ? 'never' : 'always'} shadows={quality !== 'eco'} camera={{ position: [5.2, 4.25, 6.8], fov: 42, near: .1, far: 100 }} dpr={quality === 'eco' ? [1, 1] : quality === 'high' ? [1, 2] : [1, 1.5]} gl={{ antialias: quality !== 'eco', powerPreference: quality === 'eco' ? 'low-power' : 'high-performance' }}>
      <Suspense fallback={null}><KitchenWorld inspectionProgress={inspectionProgress} paused={paused} ingredients={ingredients} added={added} heat={heat} onHeatChange={onHeatChange} drawerOpen={drawerOpen} onDrawerChange={onDrawerChange} faucetRunning={faucetRunning} onFaucetChange={onFaucetChange} lidOpen={lidOpen} onLidChange={onLidChange} cameraView={cameraView} onAdd={onAdd} progress={progress} pulse={pulse} onAction={onAction} quality={quality} /></Suspense>
    </Canvas>
    <label
      className="kitchen-inspection-control"
      style={{
        position: 'absolute',
        zIndex: 5,
        left: 12,
        bottom: 12,
        display: 'grid',
        gap: 4,
        padding: '8px 10px',
        borderRadius: 12,
        background: 'rgba(24, 32, 27, .88)',
        color: '#fff',
        fontSize: 12,
      }}
    >
      <span>Inspect cookware</span>
      <input
        aria-label="Cookware teardown progress"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={inspectionProgress}
        onChange={(event) => setInspectionProgress(Number(event.target.value))}
      />
      <output>{Math.round(inspectionProgress * 100)}%</output>
    </label>
  </div>;
}
