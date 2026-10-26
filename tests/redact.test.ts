import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (file: string) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

describe('Redact isolation', () => {
  it('uses the official Vite plugin and full compatibility preset only on this experiment branch', () => {
    const vite = read('vite.config.ts');
    expect(vite).toContain("import { redact } from '@tanstack/redact/vite'");
    expect(vite).toContain("mode === 'react' ? [] : [redact()]");
  });
  it('pins an exact experimental version, while retaining React 19 as a dependency', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.devDependencies['@tanstack/redact']).toBe('0.1.4');
    expect(pkg.dependencies.react).toMatch(/19/);
    expect(pkg.scripts['build:react']).toContain('--mode react');
  });
});
