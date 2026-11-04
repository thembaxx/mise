import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { verifyKitchenCookwarePack } from './check-kitchen-candidate.mjs';

const source = readFileSync(new URL('./author-kitchen-cookware.py', import.meta.url), 'utf8');

test('editable cookware generator creates Blender source, GLB and provenance', () => {
  for (const token of ['.blend', '.glb', '.json', 'bpy.ops.export_scene.gltf', 'hashlib.sha256', 'UNAPPROVED']) {
    assert(source.includes(token), 'Missing Blender generator contract: ' + token);
  }
  assert(source.includes('export_yup=True'));
});

test('skillet uses distinct inner and outer surfaces, handles and rim', () => {
  for (const name of ['Skillet_outer_curved_shell', 'Skillet_inner_ceramic_bowl',
    'Skillet_polished_rolled_rim', 'Skillet_handle_graphite', 'Lid_curved_glass_shell',
    'Lid_Animated_Transform']) assert(source.includes(name), name + ' is missing');
  assert(source.includes('lathe('));
  assert(source.includes('transmission=.87'));
});

test('review assets require manual approval and source provenance', () => {
  assert(source.includes('Nothing writes to public/models/'));
  assert(source.includes('review_status'));
  assert.throws(() => verifyKitchenCookwarePack('/__intentionally_nonexistent__'), /ENOENT/);
});
