import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Blender primary plated-dish model',()=>{
 it('ships an embedded, animated glTF 2.0',()=>{
  const bytes=readFileSync(new URL('../public/models/original/mise-plated-blender-candidate.glb',import.meta.url));
  expect(bytes.toString('ascii',0,4)).toBe('glTF');
  expect(bytes.readUInt32LE(4)).toBe(2);
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  expect(bytes.length).toBeLessThan(8*1024*1024);
  const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  expect(json.asset.version).toBe('2.0');
  expect(json.meshes.length).toBeGreaterThan(1);
  expect(json.animations.length).toBeGreaterThan(0);
  expect(json.buffers.every((b:{uri?:string})=>!b.uri)).toBe(true);
 });
 it('preserves earlier animated and static options, reduced-motion and offline precaching',()=>{
  const src=readFileSync(new URL('../src/components/KitchenEffects.tsx',import.meta.url),'utf8');
  const pwa=readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
  const page=readFileSync(new URL('../public/3d-preview.html',import.meta.url),'utf8');
  for(const part of ['mise-plated-blender-candidate.glb','mise-plated-dish-animated.glb','mise-plated-dish.glb'])expect(src).toContain(part);
  expect(src).toContain('reducedMotion');
  expect(pwa).toContain('glb,webmanifest');
  expect(page).toContain('Blender original');
 });
});