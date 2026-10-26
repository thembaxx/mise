import { expect, test } from '@playwright/test';

/**
 * Experiment acceptance gates. Run on both the control React build and Redact build,
 * interpreting the renderer expectation from the Vite mode used for the build.
 *
 * Caveat: a working DOM does not prove the react-reconciler based WebGL renderer
 * is compatible. The 3D canvas gate is intentionally strict when WebGL is present.
 */
test('Redact renders discovery, controlled search and favorites without browser exceptions', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-mise-runtime', 'redact');
  await expect(page.getByRole('heading', { name: /the world/i })).toBeVisible();
  await page.getByRole('button', { name: 'Open app settings' }).click();
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Close app settings' }).click();
  const search = page.getByRole('searchbox', { name: /search recipes/i });
  await search.fill('chakalaka');
  await expect(page.locator('.recipe-card')).toHaveCount(1);
  await search.fill('');
  await page.getByRole('button', { name: /save rainbow chakalaka/i }).click();
  await expect(page.getByRole('button', { name: /show saved recipes, 1 saved/i })).toBeVisible();
  expect(errors, 'Unhandled page errors').toEqual([]);
});

test('Redact loads the Three.js scene, reacts to controls and completes the cooking journey', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /step into the kitchen/i }).click();
  await expect(page.locator('.cooking-tools')).toBeVisible({ timeout: 30000 });
  const scene = page.locator('.kitchen-canvas canvas');
  await expect(scene).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/3D graphics couldn't start/i)).toHaveCount(0);

  const chop = page.getByRole('button', { name: /chop ingredients/i });
  await chop.click();
  await chop.click();
  await page.getByRole('button', { name: /pour ingredients/i }).click();
  const ingredientButtons = page.locator('.ingredient-row .ingredient-check');
  for (const button of await ingredientButtons.all()) {
    if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click();
  }
  const heat = page.getByRole('slider', { name: 'Burner heat' });
  await expect(heat).toHaveValue('0.35');
  const stir = page.getByRole('button', { name: /stir the pan/i });
  await stir.click();
  await stir.click();
  await page.getByRole('button', { name: /go to step 6/i }).click();
  await page.getByRole('button', { name: /plate your masterpiece/i }).click();
  await expect(page.getByText('You made something wonderful.')).toBeVisible();
  expect(errors, 'Unhandled page errors').toEqual([]);
});
