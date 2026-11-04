import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectGlb } from './validate-3d-assets.mjs';

const STEM = 'mise-premium-cookware-candidate';
function ensure(ok, why) { if (!ok) throw new Error(why); }

export function verifyKitchenCookwarePack(directory) {
  const base = join(resolve(directory), STEM);
  ensure(statSync(base + '.blend').size > 1024, 'Editable Blender source missing');
  const bytes = readFileSync(base + '.glb');
  const metrics = inspectGlb(bytes);
  const jsonSize = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonSize).trim());
  const nodeNames = new Set((gltf.nodes || []).map(node => node.name));
  for (const name of [
    'Mise_Kitchen_Cookware', 'Skillet_Group',
    'Skillet_outer_curved_shell', 'Skillet_inner_ceramic_bowl',
    'Skillet_polished_rolled_rim', 'Skillet_handle_graphite',
    'Lid_Animated_Transform', 'Lid_curved_glass_shell',
    'Lid_polished_rolled_edge', 'Lid_graphite_knob_foot',
  ]) ensure(nodeNames.has(name), 'Required model component missing: ' + name);
  ensure(metrics.meshes >= 12 && metrics.positions >= 1000, 'Cookware geometry is too low-detail');
  ensure(metrics.animations >= 1, 'Lid animation keyframes were not exported');
  ensure((gltf.materials || []).some(m => m.pbrMetallicRoughness?.metallicFactor >= .9),
    'Missing reflective steel material');
  ensure((gltf.materials || []).some(m => m.extensions?.KHR_materials_transmission),
    'Missing glass transmission material');
  ensure((gltf.animations || []).some(a => (a.channels || []).some(c =>
    ['translation', 'rotation'].includes(c.target?.path)
  )), 'Lid animation contains no usable transforms');
  const manifest = JSON.parse(readFileSync(base + '.json', 'utf8'));
  ensure(
    manifest.project === 'mise' && manifest.preset === 'kitchen-cookware' &&
    manifest.source === STEM + '.blend' && manifest.candidate === STEM + '.glb' &&
    manifest.generator === 'Blender bpy' && manifest.review_status === 'UNAPPROVED',
    'Cookware provenance data is invalid'
  );
  ensure(/Original generated work/.test(manifest.license), 'Licensing declaration missing');
  const checksum = createHash('sha256').update(bytes).digest('hex');
  ensure(checksum === manifest.sha256, 'GLB checksum mismatch');
  return { meshes: metrics.meshes, vertexPositions: metrics.positions, animations: metrics.animations, sha256: checksum };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw Error('Usage: node scripts/check-kitchen-candidate.mjs OUTPUT_DIR');
    console.log('Cookware review pack valid:', JSON.stringify(verifyKitchenCookwarePack(process.argv[2])));
  } catch (error) {
    console.error('Cookware candidate rejected:', error.message);
    process.exitCode = 1;
  }
}
