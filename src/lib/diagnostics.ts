import { createDiagnostics } from './feedback/browser';

/** Only fixed operation/reason labels cross this boundary; never recipe data. */
export const diagnostics = createDiagnostics('mise', {
  operations: ['recipe_import_text', 'recipe_import_url', 'cooking_step', 'cooking_ingredient',
    'cooking_chop', 'cooking_pour', 'cooking_stir', 'cooking_plate', 'cooking_session',
    'touch_ingredient_drop', 'webgl_start', 'webgl_context', 'qa_recipe_flow'],
  codes: ['invalid_recipe', 'invalid_url', 'import_unavailable', 'prerequisites',
    'forward', 'backward', 'page_left', 'reset', 'cancelled', 'outside_pan',
    'unsupported', 'scene_error', 'context_lost', 'assertion_failed'],
});

declare global {
  interface Window { miseDiagnostics: typeof diagnostics }
}
if (typeof window !== 'undefined') window.miseDiagnostics = diagnostics;

export function recordIngredientDrop(pointerType: string, cancelled: boolean, inPan: boolean, durationMs: number) {
  if (pointerType !== 'touch') return;
  diagnostics.record('touch_ingredient_drop', cancelled ? 'abandoned' : inPan ? 'success' : 'failure', {
    durationMs, ...(cancelled ? { code: 'cancelled' } : !inPan ? { code: 'outside_pan' } : {}),
  });
}
