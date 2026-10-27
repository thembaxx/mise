import { useEffect, useRef, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useReducedMotion } from '../motion/preferences';
import type { CookingAction, KitchenProgress } from '../lib/cooking';

export type KitchenPulse = { action: CookingAction; id: number } | null;

interface Props {
  progress: KitchenProgress;
  addedCount: number;
  heat: number;
  pulse: KitchenPulse;
  onAction: (action: CookingAction) => void;
}

/** Lightweight procedural utensils: the same actions can always be triggered using accessible HTML controls. */
function InteractiveUtensils({ pulse, onAction }: Pick<Props, 'pulse' | 'onAction'>) {
  const reducedMotion = useReducedMotion();
  const knife = useRef<THREE.Group>(null);
  const spoon = useRef<THREE.Group>(null);
  const bottle = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const pulseAt = useRef(0);
  useEffect(() => { pulseAt.current = clock.current; }, [pulse]);
  useFrame(({ clock: sceneClock }) => {
    clock.current = sceneClock.elapsedTime;
    const elapsed = sceneClock.elapsedTime - pulseAt.current;
    const t = Math.max(0, elapsed);
    const envelope = !reducedMotion && t < .72 ? Math.sin(t / .72 * Math.PI) : 0;
    if (knife.current) {
      const move = pulse?.action === 'chop' ? Math.abs(Math.sin(t * 21)) * envelope : 0;
      knife.current.position.y = .47 - move * .23;
      knife.current.rotation.z = -.3 - move * .2;
    }
    if (spoon.current) {
      const move = pulse?.action === 'stir' ? envelope : 0;
      spoon.current.rotation.y = move * Math.sin(t * 17) * .55;
      spoon.current.rotation.x = .38 + move * Math.sin(t * 14) * .2;
    }
    if (bottle.current) {
      const move = pulse?.action === 'pour' ? envelope : 0;
      bottle.current.rotation.z = move * -1.1;
      bottle.current.position.y = .58 + move * .17;
    }
  });
  return <>
    <group ref={knife} position={[-1.75, .47, -.52]} rotation={[0, 0, -.3]} onClick={event => { event.stopPropagation(); onAction('chop'); }}>
      <mesh position={[.02, -.05, 0]} castShadow><boxGeometry args={[.11, .6, .07]} /><meshStandardMaterial color="#a5afb0" metalness={.8} roughness={.23} /></mesh>
      <mesh position={[.02, -.31, 0]} castShadow><coneGeometry args={[.06, .14, 4]} /><meshStandardMaterial color="#c7c9c5" metalness={.72} roughness={.23} /></mesh>
      <RoundedBox args={[.18, .37, .17]} radius={.035} position={[.02, .37, 0]} castShadow><meshStandardMaterial color="#684635" roughness={.73} /></RoundedBox>
    </group>

    <group ref={spoon} position={[1.18, .62, .22]} rotation={[.38, 0, -.5]} onClick={event => { event.stopPropagation(); onAction('stir'); }}>
      <mesh position={[0, .31, 0]} castShadow><cylinderGeometry args={[.052, .063, .93, 12]} /><meshStandardMaterial color="#ba854f" roughness={.73} /></mesh>
      <mesh position={[0, -.19, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow scale={[1, 1.35, .32]}><sphereGeometry args={[.18, 20, 12]} /><meshStandardMaterial color="#b7814f" roughness={.73} /></mesh>
    </group>

    <group ref={bottle} position={[-.65, .58, -1.02]} onClick={event => { event.stopPropagation(); onAction('pour'); }}>
      <mesh castShadow><cylinderGeometry args={[.15, .21, .54, 18]} /><meshStandardMaterial color="#789158" roughness={.25} transparent opacity={.8} /></mesh>
      <mesh position={[0, .31, 0]}><cylinderGeometry args={[.06, .08, .2, 12]} /><meshStandardMaterial color="#5f7b4f" roughness={.4} /></mesh>
      <mesh position={[0, .4, 0]}><cylinderGeometry args={[.075, .075, .075, 12]} /><meshStandardMaterial color="#ba9467" metalness={.35} roughness={.47} /></mesh>
      <mesh position={[0, -.06, .157]}><boxGeometry args={[.19, .24, .008]} /><meshBasicMaterial color="#ede1b3" /></mesh>
    </group>
  </>;
}

const STEAM_COUNT = 12;

function Steam({ heat, addedCount }: Pick<Props, 'heat' | 'addedCount'>) {
  const spheres = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const intensity = heat > .05 && addedCount > 0 ? heat : 0;
    spheres.current.forEach((mesh, i) => {
      if (!mesh) return;
      const speed = .25 + heat * .38;
      const phase = (clock.elapsedTime * speed + i * .18) % 1;
      const angle = i * 2.4;
      mesh.position.set(1.16 + Math.sin(angle) * .36 + Math.sin(clock.elapsedTime * .8 + i) * .06, .5 + phase * 1.4, .15 + Math.cos(angle) * .28);
      mesh.scale.setScalar(.4 + phase * 1.4);
      (mesh.material as THREE.MeshBasicMaterial).opacity = intensity * Math.sin(phase * Math.PI) * .19;
      mesh.visible = intensity > 0;
    });
  });
  return <group>
    {Array.from({ length: STEAM_COUNT }, (_, i) => <mesh key={i} ref={mesh => { spheres.current[i] = mesh; }}>
      <sphereGeometry args={[.095, 9, 7]} />
      <meshBasicMaterial transparent depthWrite={false} color="#fff7e7" opacity={0} />
    </mesh>)}
  </group>;
}

function ChoppedFood({ chops }: { chops: number }) {
  if (!chops) return null;
  return <group position={[-2.08, .12, .55]}>
    {Array.from({ length: Math.min(chops * 3, 12) }, (_, i) => {
      const x = (i % 4) * .18;
      const z = Math.floor(i / 4) * .18;
      return <mesh key={i} position={[x, .017, z]} rotation={[-Math.PI / 2, 0, i * 1.2]} castShadow>
        <cylinderGeometry args={[.065, .065, .025, 5]} />
        <meshStandardMaterial color={i % 3 === 0 ? '#cb5937' : i % 3 === 1 ? '#e6a04e' : '#77a45c'} roughness={.8}/>
      </mesh>;
    })}
  </group>;
}

function FinishedPlate() {
  const reducedMotion = useReducedMotion();
  const plate = useRef<THREE.Group>(null);
  const reveal = useRef(0);
  const [originalDish, setOriginalDish] = useState<{ scene: THREE.Group; animations: THREE.AnimationClip[] } | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    const load = (path: string, older = false) => {
      loader.load(path, ({ scene, animations }) => {
        if (!cancelled) setOriginalDish({ scene, animations });
      }, undefined, () => {
        if (!cancelled && !older) load('/models/original/mise-plated-dish.glb', true);
        // Keep the existing procedural dish on offline or model errors.
      });
    };
    load('/models/original/mise-plated-dish-animated.glb');
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!originalDish || reducedMotion || !originalDish.animations.length) return;
    const mixer = new THREE.AnimationMixer(originalDish.scene);
    originalDish.animations.forEach(clip => mixer.clipAction(clip).play());
    mixerRef.current = mixer;
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(originalDish.scene);
      mixerRef.current = null;
    };
  }, [originalDish, reducedMotion]);
  useFrame((_, delta) => {
    if (!reducedMotion) mixerRef.current?.update(Math.min(delta, .05));
    if (!plate.current || reducedMotion || reveal.current >= 1) return;
    reveal.current = Math.min(1, reveal.current + Math.min(delta, .05) * 2.3);
    const t = reveal.current;
    // One-shot plate reveal; never animates when the visitor prefers reduced motion.
    plate.current.scale.setScalar(0.75 + 0.25 * (1 - Math.pow(1 - t, 3)));
  });
  return <group ref={plate} position={[-1.5, .25, .23]} scale={reducedMotion ? 1 : .75}>
    {originalDish ? <primitive object={originalDish.scene} dispose={null} /> : <>
    <mesh castShadow><cylinderGeometry args={[.68, .64, .09, 48]} /><meshStandardMaterial color="#f6f1dc" roughness={.46}/></mesh>
    <mesh position={[0, .065, 0]}><torusGeometry args={[.55, .035, 10, 48]} /><meshStandardMaterial color="#d5cfad" /></mesh>
    {Array.from({ length: 9 }, (_, i) => {
      const a = i * 2.399;
      const r = .13 + .034 * i;
      return <mesh key={i} position={[Math.cos(a) * r, .105, Math.sin(a) * r]} castShadow scale={[.65, .4, .65]}>
        <sphereGeometry args={[.17, 12, 9]}/><meshStandardMaterial color={i % 3 === 0 ? '#dd663f' : i % 3 === 1 ? '#e8bb5d' : '#769a5b'} roughness={.62}/>
      </mesh>;
    })}
    {/* Hand-placed herb garnish and toasted sesame keep plating legible even on eco graphics. */}
    {Array.from({ length: 5 }, (_, i) => {
      const a = i * Math.PI * 2 / 5 + .22;
      return <group key={'herb' + i} position={[Math.cos(a) * .20, .15, Math.sin(a) * .17]} rotation={[0, a, .13]}>
        <mesh castShadow scale={[.14, .032, .068]}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color={i % 2 ? '#54804c' : '#83a25f'} roughness={.83} /></mesh>
        <mesh position={[.10, .015, 0]} rotation={[0, 0, -.12]} castShadow scale={[.12, .028, .052]}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color='#6c9853' roughness={.82} /></mesh>
      </group>;
    })}
    {Array.from({ length: 8 }, (_, i) => {
      const a = i * 2.399;
      const r = .17 + .028 * (i % 4);
      return <mesh key={'seed' + i} position={[Math.cos(a) * r, .18, Math.sin(a) * r]} rotation={[0, a, .45]} scale={[.018, .011, .009]}>
        <sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={i % 3 ? '#e9ce91' : '#3e392c'} roughness={.9} />
      </mesh>;
    })}
    </>}
  </group>;
}


/** Heat-dependent shallow simmer bubbles. No particle texture, shader or extra package. */
function PanSimmer({ heat, addedCount, pours }: { heat: number; addedCount: number; pours: number }) {
  const bubbles = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const intensity = heat > .08 && addedCount > 0 ? Math.min(1, heat * (pours ? 1.2 : .8)) : 0;
    bubbles.current.forEach((bubble, index) => {
      if (!bubble) return;
      const phase = (clock.elapsedTime * (.8 + heat) + index * .137) % 1;
      const size = .35 + phase * 1.3;
      bubble.scale.setScalar(size);
      bubble.visible = intensity > 0;
      (bubble.material as THREE.MeshBasicMaterial).opacity = intensity * Math.sin(Math.PI * phase) * .28;
    });
  });
  return <group position={[1.16, .283, .15]} rotation={[-Math.PI / 2, 0, 0]}>
    {Array.from({ length: 9 }, (_, index) => {
      const angle = index * 2.3999, radius = .12 + .065 * (index % 5);
      return <mesh key={index} ref={node => { bubbles.current[index] = node; }} position={[Math.cos(angle) * radius, Math.sin(angle) * radius, .015]}>
        <ringGeometry args={[.055, .08, 14]}/>
        <meshBasicMaterial color="#ffdb90" transparent opacity={0} depthWrite={false}/>
      </mesh>;
    })}
  </group>;
}

/** A visible, brief pour arc connects the bottle action to the pan without DOM overlays. */
function PourArc({ pulse }: { pulse: KitchenPulse }) {
  const stream = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);
  useEffect(() => { elapsed.current = 0; }, [pulse]);
  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, .1);
    const active = pulse?.action === 'pour' && elapsed.current < .7;
    if (!stream.current) return;
    stream.current.visible = active;
    if (active) {
      stream.current.scale.set(1, .6 + Math.sin(elapsed.current * Math.PI / .7) * .65, 1);
      (stream.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(elapsed.current * Math.PI / .7) * .56;
    }
  });
  return <mesh ref={stream} visible={false} position={[.32, .85, -.42]} rotation={[0, 0, -.78]}>
    <cylinderGeometry args={[.025, .044, 1.05, 9]}/>
    <meshBasicMaterial color="#e6c98f" transparent opacity={0} depthWrite={false}/>
  </mesh>;
}

export default function KitchenEffects({ progress, addedCount, heat, pulse, onAction }: Props) {
  const reducedMotion = useReducedMotion();
  return <>
    <InteractiveUtensils pulse={pulse} onAction={onAction}/>
    {!progress.plated && <ChoppedFood chops={progress.chops}/>}
    {!reducedMotion && <>
      <Steam heat={heat} addedCount={addedCount}/>
      <PanSimmer heat={heat} addedCount={addedCount} pours={progress.pours}/>
      <PourArc pulse={pulse}/>
    </>}
    {progress.pours > 0 && <mesh position={[1.16, .286, .15]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[.67, 48]} />
      <meshStandardMaterial color="#927543" transparent opacity={Math.min(progress.pours * .14, .38)} depthWrite={false} metalness={.42} roughness={.3}/>
    </mesh>}
    {progress.plated && <FinishedPlate />}
  </>;
}
