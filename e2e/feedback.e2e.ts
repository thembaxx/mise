import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Deliberately exercise the supported no-WebGL path, including on touch devices.
  await page.addInitScript(() => {
    // Reapply the synthetic label before app effects on every document navigation.
    Object.defineProperty(window, 'miseDiagnostics', { configurable: true, set(api) {
      api.setEnabled(true, 'synthetic');
      Object.defineProperty(window, 'miseDiagnostics', { value: api, writable: true, configurable: true });
    } });
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === 'webgl2') return null;
      return original.call(this, type, ...args);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('/cookbook/');
  await page.waitForFunction(() => Boolean(window.miseDiagnostics));
  await page.evaluate(() => { window.miseDiagnostics.clear(); window.miseDiagnostics.setEnabled(true, 'synthetic'); });
});

test.afterEach(async ({ page }, testInfo) => {
  if (page.isClosed()) return;
  const events = await page.evaluate(({ failed }) => {
    window.miseDiagnostics.record('qa_recipe_flow', failed ? 'failure' : 'success', failed ? { code: 'assertion_failed' } : {});
    return window.miseDiagnostics.exportJSONL();
  }, { failed: testInfo.status !== testInfo.expectedStatus });
  expect(events).not.toContain('Private fixture');
  expect(events).not.toContain('https://example.com');
  expect(events.trim().split('\n').every(line => JSON.parse(line).source === 'synthetic')).toBe(true);
  await testInfo.attach('synthetic-feedback.jsonl', { body: events, contentType: 'application/x-ndjson' });
  if (process.env.FEEDBACK_OUTPUT) {
    mkdirSync(dirname(process.env.FEEDBACK_OUTPUT), { recursive: true });
    appendFileSync(process.env.FEEDBACK_OUTPUT, events.endsWith('\n') ? events : events + '\n');
  }
});

test('synthetic import and complete cooking journey', async ({ page, isMobile }) => {
  await page.getByRole('button', { name: /Import a recipe from a website or text/ }).click();
  await page.getByRole('button', { name: 'Paste recipe' }).click();
  await page.getByRole('textbox', { name: 'Recipe text, HTML or JSON-LD' }).fill('Private fixture\nIngredients\n1 onion\n1 carrot\nInstructions\nChop the vegetables.\nCook until tender.');
  await page.getByRole('button', { name: 'Parse recipe' }).click();
  await expect(page.getByRole('textbox', { name: 'Recipe name' })).toHaveValue('Private fixture');
  await page.getByRole('button', { name: 'Save to my cookbook' }).click();
  await page.getByRole('link', { name: 'Private fixture', exact: true }).first().click();
  await page.getByRole('link', { name: 'Start Cook Mode' }).click();
  const dialog = page.locator('.cook-mode[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/3D graphics couldn't start on this device/)).toBeAttached();
  for (const button of await dialog.locator('.cook-mode-ingredient-scroll button').all()) {
    if (isMobile) await button.tap(); else await button.click();
  }
  const chop = dialog.getByRole('button', { name: 'Cook mode chop', exact: true });
  await chop.click(); await chop.click();
  await dialog.getByRole('button', { name: 'Cook mode pour', exact: true }).click();
  const stir = dialog.getByRole('button', { name: 'Cook mode stir', exact: true });
  await stir.click(); await stir.click();
  await dialog.getByRole('button', { name: /Next step/ }).click();
  await dialog.getByRole('button', { name: 'Cook mode plate', exact: true }).click();
  const events = await page.evaluate(() => window.miseDiagnostics.exportJSONL());
  expect(events).toContain('"operation":"recipe_import_text","outcome":"success"');
  expect(events).toContain('"operation":"cooking_session","outcome":"success"');
  expect(events).toContain('"code":"unsupported"');
});

test('synthetic blocked imports and explicitly abandoned cooking', async ({ page }) => {
  await page.getByRole('button', { name: /Import a recipe from a website or text/ }).click();
  await page.getByRole('textbox', { name: 'Recipe webpage URL' }).fill('https://example.com/private-source');
  await page.route('https://example.com/**', route => route.fulfill({ status: 503, body: 'Private fixture failure' }));
  await page.getByRole('button', { name: 'Import recipe', exact: true }).click();
  await expect(page.getByText('The recipe page did not respond successfully.')).toBeVisible();
  await page.getByRole('button', { name: 'Paste recipe' }).click();
  await page.getByRole('textbox', { name: 'Recipe text, HTML or JSON-LD' }).fill('Private fixture invalid input');
  await page.getByRole('button', { name: 'Parse recipe' }).click();
  await expect(page.getByText(/Paste Recipe JSON-LD, a supported recipe page/)).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: /step into the kitchen/i }).click();
  await page.getByRole('button', { name: /chop ingredients/i }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.goto('/cookbook/');
  const events = await page.evaluate(() => window.miseDiagnostics.exportJSONL());
  expect(events).toContain('"operation":"recipe_import_url","outcome":"failure"');
  expect(events).toContain('"operation":"recipe_import_text","outcome":"failure"');
  expect(events).toContain('"operation":"cooking_session","outcome":"abandoned"');
});
