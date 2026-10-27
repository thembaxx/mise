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
