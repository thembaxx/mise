import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

test('cloud Blender authoring is opt-in and review-only', () => {
  const script = readFileSync(new URL('../scripts/author-blender-candidate.py', import.meta.url), 'utf8');
  const workflow = readFileSync(new URL('../.github/workflows/blender-candidate.yml', import.meta.url), 'utf8');
  expect(script).toContain('def dish_scene():');
  expect(script).toContain('export_format="GLB"');
  expect(workflow).toContain('workflow_dispatch');
  expect(workflow).toContain('validate-3d-assets');
  expect(workflow).not.toMatch(/push:\s*|schedule:\s*/);
  expect(workflow).not.toMatch(/contents:\s*write/);
});

test('candidate review stays on-device and checks GLB bounds', () => {
  const script = readFileSync(new URL('../public/3d-viewer.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../public/3d-preview.html', import.meta.url), 'utf8');
  expect(html).toContain('id="candidate"');
  expect(script).toContain('candidateInput.files?.[0]');
  expect(script).toContain('file.arrayBuffer()');
  expect(script).toContain('file.size>MAX_FILE');
  expect(script).not.toContain('FormData(');
});
