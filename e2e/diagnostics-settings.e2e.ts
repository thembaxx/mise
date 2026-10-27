import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('local diagnostics require opt-in, export locally, and erase on disable', async ({ page }) => {
  await page.goto('/cookbook/');
  await page.getByRole('button', { name: 'Open app settings' }).click();
  const toggle = page.getByRole('button', { name: /Local diagnostics: off/ });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => window.miseDiagnostics.exportJSONL())).toBe('');
  await toggle.click();
  await expect(page.getByRole('button', { name: /Local diagnostics: on/ })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => {
    window.miseDiagnostics.setEnabled(true, 'synthetic');
    window.miseDiagnostics.record('recipe_import_text', 'failure', { code: 'invalid_recipe' });
  });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export diagnostics/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('mise-diagnostics.jsonl');
  const event = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(event).toMatchObject({ app: 'mise', source: 'synthetic', operation: 'recipe_import_text', outcome: 'failure' });
  await page.getByRole('button', { name: /Local diagnostics: on/ }).click();
  expect(await page.evaluate(() => window.miseDiagnostics.exportJSONL())).toBe('');
  await page.getByRole('button', { name: 'Close app settings' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Open app settings' }).click();
  await expect(page.getByRole('button', { name: /Local diagnostics: off/ })).toBeVisible();
});
