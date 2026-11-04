import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { IngredientKind } from '../data/recipes';

type Quality = 'eco' | 'balanced' | 'high';
type Props = { kind: IngredientKind; quality?: Quality };

const producePalette: Record<string, [number, number, number]> = {
  tomato: [209, 60, 42], lemon: [245, 208, 83], lime: [125, 168, 63],
  carrot: [223, 105, 34], mushroom: [158, 106, 69], onion: [175, 124, 142],
  chili: [182, 37, 29], garlic: [231, 219, 195], eggplant: [62, 36, 84], herb: [77, 141, 59],
};

function seededGrain(x: number, y: number) {
  return Math.sin(x * 12.9898 + y * 78.233) * Math.sin(y * 39.3467 - x * 11.123);
}

function skinTexture(kind: IngredientKind, quality: Quality) {
  const size = quality === 'high' ? 512 : quality === 'balanced' ? 256 : 128;
  const data = new Uint8Array(size * size * 4);
  const rgb = producePalette[kind] ?? [185, 148, 89];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const freckles = seededGrain(x, y) * 8 + Math.sin(u * 94 + v * 63) * 2;
      const veins = Math.sin(u * 50 + Math.sin(v * 19) * 2.5) * (kind === 'onion' || kind === 'carrot' ? 8 : 2);
      const light = .88 + .10 * Math.cos((v - .5) * Math.PI) + (freckles + veins) / 255;
      const index = (y * size + x) * 4;
      data[index] = Math.max(0, Math.min(255, rgb[0] * light));
      data[index + 1] = Math.max(0, Math.min(255, rgb[1] * light));
      data[index + 2] = Math.max(0, Math.min(255, rgb[2] * light));
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function OrganicSkin({ kind, quality, radius = .23, scale = [1, 1, 1] }: Props & { radius?: number; scale?: [number, number, number] }) {
  const detail = quality === 'high' ? 64 : quality === 'balanced' ? 40 : 24;
  const texture = useMemo(() => skinTexture(kind, quality ?? 'balanced'), [kind, quality]);
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(radius, detail, Math.round(detail * .75));
    const positions = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const a = Math.atan2(z, x);
      const vertical = y / radius;
      const ribs = kind === 'tomato' ? .047 * Math.cos(a * 8) * (1 - Math.abs(vertical) * .35)
        : kind === 'onion' ? .025 * Math.cos(a * 11) : 0;
      const dimple = kind === 'tomato' ? Math.exp(-((x * x + z * z) / (radius * radius * .12))) * Math.max(0, vertical) * .055 : 0;
      const irregularity = .008 * Math.sin(a * 13 + vertical * 6) + .004 * Math.cos(a * 21 - vertical * 9);
      const rad = 1 + ribs + irregularity;
      positions.setXYZ(i, x * rad * scale[0], y * rad * scale[1] - dimple, z * rad * scale[2]);
    }
    g.computeVertexNormals();
    return g;
  // The parent passes stable scalar values for the individual fruit kind.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, quality, radius, scale[0], scale[1], scale[2]]);
  useEffect(() => () => { texture.dispose(); geometry.dispose(); }, [texture, geometry]);

  return <mesh castShadow receiveShadow geometry={geometry}>
    <meshPhysicalMaterial map={texture} bumpMap={texture} bumpScale={kind === 'tomato' ? .0015 : .003}
      roughness={kind === 'eggplant' ? .25 : kind === 'tomato' ? .34 : .57}
      metalness={0} clearcoat={kind === 'eggplant' || kind === 'tomato' ? .24 : .09}
      clearcoatRoughness={.18} />
  </mesh>;
}

function Calyx({ color = '#4e7b3d', leaves = 6 }: { color?: string; leaves?: number }) {
  return <group>
    <mesh position={[0, .028, 0]} castShadow><cylinderGeometry args={[.027, .035, .12, 12]} /><meshStandardMaterial color="#49723e" roughness={.74} /></mesh>
    {Array.from({length: leaves}, (_, i) => <mesh key={i} castShadow
      position={[Math.cos(i * Math.PI * 2 / leaves) * .092, -.01, Math.sin(i * Math.PI * 2 / leaves) * .092]}
      rotation={[0, -i * Math.PI * 2 / leaves, -.19]} scale={[1, .17, .35]}>
      <sphereGeometry args={[.17, 14, 10]} />
      <meshStandardMaterial color={color} roughness={.76} side={THREE.DoubleSide} />
    </mesh>)}
  </group>;
}

function Citrus({ kind, quality }: Props) {
  return <group rotation={[0, 0, -.13]}>
    <OrganicSkin kind={kind} quality={quality} scale={[1.26, .82, .88]} />
    {[-1, 1].map(side => <mesh key={side} position={[side * .286, 0, 0]} rotation={[0, 0, -side * Math.PI / 2]} castShadow>
      <coneGeometry args={[.046, .088, 20]} />
      <meshStandardMaterial color={kind === 'lime' ? '#839f40' : '#e8be56'} roughness={.68} />
    </mesh>)}
    <mesh position={[0, .18, .008]} rotation={[0, .18, -.2]} scale={[.18, .035, .09]}>
      <sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#678948" roughness={.65} />
    </mesh>
  </group>;
}

function Tomato({quality}: {quality: Quality}) {
  return <group>
    <OrganicSkin kind="tomato" quality={quality} scale={[1.03, .85, 1.02]} />
    <group position={[0, .208, 0]}><Calyx leaves={7} /></group>
    <mesh position={[0, .28, 0]} rotation={[0, 0, -.3]}>
      <cylinderGeometry args={[.018, .025, .15, 12]} /><meshStandardMaterial color="#547d42" />
    </mesh>
  </group>;
}

function Carrot({quality}: {quality: Quality}) {
  const detail = quality === 'high' ? 40 : 24;
  return <group rotation={[0, 0, -.36]}>
    <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
      <coneGeometry args={[.19, .76, detail, 12]} />
      <meshPhysicalMaterial color="#dd732e" roughness={.65} clearcoat={.08} />
    </mesh>
    {Array.from({length: 18}, (_, i) => {
      const x = -.3 + i * .036;
      const radius = .02 + (i / 18) * .12;
      return <mesh key={i} position={[x, radius * .83, .002]} rotation={[0, 0, -.45]} scale={[1, .26, 1]}>
        <torusGeometry args={[Math.max(.016, radius), .0025, 4, 18, Math.PI * .65]} />
        <meshStandardMaterial color={i % 2 ? '#be5b21' : '#efa044'} roughness={.86} />
      </mesh>;
    })}
    {[-.13, 0, .13].map((z,i)=> <group key={i} position={[-.38, .05, z]} rotation={[z * 2, 0, -.25+i*.23]}>
      <mesh><cylinderGeometry args={[.013, .022, .33, 8]} /><meshStandardMaterial color="#567b45" /></mesh>
      {[-1,1].map(side=><mesh key={side} position={[side*.075,.10,0]} scale={[.17,.035,.08]} rotation={[0,0,side*.35]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#6e984b" side={THREE.DoubleSide}/></mesh>)}
    </group>)}
  </group>;
}

function Mushroom({quality}: {quality: Quality}) {
  return <group>
    <mesh castShadow position={[0,-.105,0]}><cylinderGeometry args={[.065,.09,.27,20]} /><meshStandardMaterial color="#e0cfac" roughness={.84}/></mesh>
    <mesh castShadow position={[0,.08,0]} scale={[1.14,.72,1.17]}>
      <sphereGeometry args={[.235, quality === 'high' ? 64 : 32, 24, 0, Math.PI*2, 0, Math.PI*.6]} />
      <meshPhysicalMaterial color="#906345" roughness={.73} clearcoat={.06}/>
    </mesh>
    <mesh position={[0,.031,0]}><cylinderGeometry args={[.203,.175,.014,48]} /><meshStandardMaterial color="#d2bc96" roughness={.82}/></mesh>
    {Array.from({length: quality === 'high' ? 32 : 16}, (_,i)=><mesh key={i} position={[0,.023,0]} rotation={[0,i*Math.PI*2/(quality==='high'?32:16),0]}>
      <boxGeometry args={[.01,.006,.34]} /><meshStandardMaterial color={i%2?'#ad8965':'#c4aa85'} roughness={.86}/>
    </mesh>)}
  </group>;
}

function Onion({quality}: {quality: Quality}) {
  return <group>
    <OrganicSkin kind="onion" quality={quality} scale={[.95,1.10,.95]}/>
    <mesh position={[0,.267,0]}><coneGeometry args={[.052,.145,20]} /><meshStandardMaterial color="#bd9c9e" roughness={.68}/></mesh>
    {Array.from({length:6},(_,i)=><mesh key={i} position={[0,-.26,0]} rotation={[0,i*Math.PI/3,.4]}>
      <cylinderGeometry args={[.006,.003,.14,6]}/><meshStandardMaterial color="#c9b598" roughness={.9}/>
    </mesh>)}
  </group>;
}

function Chili({quality}: {quality: Quality}) {
  const mesh = useMemo(()=>{
    const curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(-.31,.11,0),new THREE.Vector3(-.15,-.02,0),
      new THREE.Vector3(.08,-.075,.03),new THREE.Vector3(.27,.075,.02)
    ]);
    const rings=quality==='high'?60:30, sides=quality==='high'?18:12;
    const vertices:number[]=[], indices:number[]=[];
    for(let i=0;i<=rings;i++){
      const t=i/rings, center=curve.getPoint(t);
      const radius=.087*Math.sin(Math.PI*(.13 + t*.87))*(1-.24*t);
      for(let j=0;j<=sides;j++){
        const angle=j/sides*Math.PI*2;
        vertices.push(center.x,center.y+Math.cos(angle)*radius,center.z+Math.sin(angle)*radius);
        if(i<rings && j<sides){const p=i*(sides+1)+j;indices.push(p,p+sides+1,p+1,p+1,p+sides+1,p+sides+2);}
      }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    g.setIndex(indices);g.computeVertexNormals();
    return g;
  },[quality]);
  useEffect(()=>()=>mesh.dispose(),[mesh]);
  return <group>
    <mesh geometry={mesh} castShadow><meshPhysicalMaterial color="#c73529" roughness={.31} clearcoat={.25}/></mesh>
    <mesh position={[-.345,.11,0]} rotation={[0,0,-.6]}><cylinderGeometry args={[.024,.035,.17,12]}/><meshStandardMaterial color="#4f7843"/></mesh>
    <mesh position={[-.31,.09,0]} rotation={[0,0,Math.PI/2]}><coneGeometry args={[.07,.09,8]}/><meshStandardMaterial color="#557b3d"/></mesh>
  </group>;
}

function Garlic({quality}: {quality: Quality}) {
  return <group>
    {Array.from({length:6},(_,i)=>{
      const a=i*Math.PI/3;
      return <group key={i} position={[Math.cos(a)*.1,-.025,Math.sin(a)*.1]} rotation={[.10*Math.sin(a),a,-.12]}>
        <OrganicSkin kind="garlic" quality={quality} radius={.15} scale={[.58,1.15,.66]}/>
      </group>;
    })}
    <mesh position={[0,.18,0]}><coneGeometry args={[.06,.23,20]}/><meshStandardMaterial color="#d7c9ab" roughness={.85}/></mesh>
  </group>;
}

function Herb({quality}: {quality: Quality}) {
  return <group>
    {Array.from({length:quality==='high'?9:6},(_,i)=>{
      const a=i*Math.PI*2/(quality==='high'?9:6);
      return <group key={i} rotation={[0,a,-.22]}>
        <mesh position={[0,.08,0]} rotation={[0,0,.25]}><cylinderGeometry args={[.009,.012,.28,8]}/><meshStandardMaterial color="#49793c" roughness={.87}/></mesh>
        <mesh castShadow position={[.105,.14,0]} rotation={[0,0,-.55]} scale={[1.2,.33,.68]}>
          <sphereGeometry args={[.13,20,12]}/><meshPhysicalMaterial color={i%2?'#65974c':'#487e3f'} roughness={.78} side={THREE.DoubleSide}/>
        </mesh>
        <mesh position={[.105,.14,.082]} rotation={[0,0,-.55]} scale={[.09,.15,.015]}>
          <sphereGeometry args={[1,8,6]}/><meshStandardMaterial color="#9bbc65" roughness={.91}/>
        </mesh>
      </group>;
    })}
  </group>;
}

export default function IngredientModel({kind,quality='balanced'}:Props) {
  switch(kind) {
    case 'tomato': return <Tomato quality={quality}/>;
    case 'lemon':
    case 'lime': return <Citrus kind={kind} quality={quality}/>;
    case 'carrot': return <Carrot quality={quality}/>;
    case 'mushroom': return <Mushroom quality={quality}/>;
    case 'onion': return <Onion quality={quality}/>;
    case 'chili': return <Chili quality={quality}/>;
    case 'garlic': return <Garlic quality={quality}/>;
    case 'eggplant': return <group rotation={[0,0,-.28]}>
      <OrganicSkin kind="eggplant" quality={quality} scale={[.78,1.48,.8]}/>
      <group position={[0,.35,0]}><Calyx color="#4d7d43" leaves={5}/></group>
    </group>;
    case 'herb': return <Herb quality={quality}/>;
    default: return <OrganicSkin kind={kind} quality={quality}/>;
  }
}
