import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { diagnostics, recordIngredientDrop } from '../src/lib/diagnostics';
import { importRecipeContent, importRecipeUrl } from '../src/lib/personal-cookbook';

const events = () => diagnostics.exportJSONL().split('\n').filter(Boolean).map(line => JSON.parse(line));
beforeEach(() => {
  diagnostics.setEnabled(false);
  const data = new Map<string, string>();
  vi.stubGlobal('window', { localStorage: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  } });
});
afterEach(() => { diagnostics.setEnabled(false); vi.unstubAllGlobals(); });

describe('Mise operational diagnostics integration', () => {
  it('keeps imports functional and empty by default; opt-in emits outcomes without recipe data', async () => {
    const content = 'Private family recipe\nIngredients\n1 secret ingredient\nInstructions\nPrivate method.';
    importRecipeContent(content, 'https://example.com/private-recipe');
    expect(events()).toEqual([]);
    diagnostics.setEnabled(true, 'synthetic');
    importRecipeContent(content, 'https://example.com/private-recipe');
    expect(() => importRecipeContent('Private invalid content')).toThrow();
    await expect(importRecipeUrl('https://localhost/private-recipe')).rejects.toThrow();
    expect(events()).toEqual([
      expect.objectContaining({ operation: 'recipe_import_text', outcome: 'success', source: 'synthetic' }),
      expect.objectContaining({ operation: 'recipe_import_text', outcome: 'failure', code: 'invalid_recipe' }),
      expect.objectContaining({ operation: 'recipe_import_url', outcome: 'failure', code: 'invalid_url' }),
    ]);
    expect(diagnostics.exportJSONL()).not.toMatch(/Private|secret|https:|localhost/);
    diagnostics.setEnabled(false);
    expect(events()).toEqual([]);
  });

  it('records failed URL imports once, preserving the caller error without exporting it', async () => {
    diagnostics.setEnabled(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(importRecipeUrl('https://example.com/private')).rejects.toThrow('The recipe page did not respond successfully.');
    expect(events()).toEqual([expect.objectContaining({ operation: 'recipe_import_url', outcome: 'failure', code: 'import_unavailable' })]);
    expect(diagnostics.exportJSONL()).not.toMatch(/example|private|respond|https/);
  });

  it('distinguishes touch cancellation, missed drops and success without pointer coordinates or identities', () => {
    diagnostics.setEnabled(true);
    recordIngredientDrop('touch', true, false, 200);
    recordIngredientDrop('touch', false, false, 400);
    recordIngredientDrop('touch', false, true, 600);
    recordIngredientDrop('mouse', false, true, 300);
    expect(events()).toEqual([
      expect.objectContaining({ operation: 'touch_ingredient_drop', outcome: 'abandoned', code: 'cancelled', durationMs: 200 }),
      expect.objectContaining({ operation: 'touch_ingredient_drop', outcome: 'failure', code: 'outside_pan', durationMs: 400 }),
      expect.objectContaining({ operation: 'touch_ingredient_drop', outcome: 'success', durationMs: 600 }),
    ]);
  });

  it('rejects unexpected operation/reason metadata at the collector boundary', () => {
    diagnostics.setEnabled(true);
    diagnostics.record('Private recipe name', 'failure', { code: 'https://example.com/private' });
    diagnostics.record('recipe_import_text', 'failure', { code: 'private_error_content' });
    expect(events()).toHaveLength(1);
    expect(events()[0]).not.toHaveProperty('code');
  });
});
