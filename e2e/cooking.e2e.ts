import { expect, test } from '@playwright/test';

test('discovers a recipe and completes the guided cooking activity', async ({ page }) => {
  // End-to-end ingredient-by-ingredient interaction can exceed 45 seconds with software WebGL.
  test.setTimeout(120_000);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /the world/i })).toBeVisible();

  await page.getByRole('button', { name: /step into the kitchen/i }).click();
  await expect(page.locator('.cooking-tools')).toBeVisible({ timeout: 25000 });

  const plate = page.getByRole('button', { name: /plate your masterpiece/i });
  await expect(plate).toBeDisabled();

  const chop = page.getByRole('button', { name: /chop ingredients/i });
  await chop.click();
  await chop.click();

  await page.getByRole('button', { name: /pour ingredients/i }).click();
  await page.locator('.ingredient-row .ingredient-check').first().click();
  await expect(page.getByRole('button', { name: /stir the pan/i })).toBeEnabled();
  const stir = page.getByRole('button', { name: /stir the pan/i });
  await stir.click();
  await stir.click();

  for (const button of await page.locator('.ingredient-row .ingredient-check').all()) {
    if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click();
  }
  await page.getByRole('button', { name: /go to step 6/i }).click();
  await expect(plate).toBeEnabled();
  await plate.click();

  await expect(page.getByText('You made something wonderful.')).toBeVisible();
  await expect(page.locator('.cooking-meter')).toHaveAttribute('aria-valuenow', '6');
});

test('searches recipes and remembers favorites between reloads', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('searchbox', { name: /search recipes/i });
  await search.fill('chakalaka');
  await expect(page.locator('.recipe-card')).toHaveCount(1);
  await page.getByRole('button', { name: /save rainbow chakalaka/i }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: /show saved recipes, 1 saved/i })).toBeVisible();
});

test('provides a non-WebGL route to guided cooking', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (type === 'webgl2') return null;
      return original.call(this, type, ...args);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('/');
  await page.getByRole('button', { name: /step into the kitchen/i }).click();
  await expect(page.getByText(/3D graphics couldn't start on this device/i)).toBeVisible({ timeout: 25000 });
  await expect(page.getByRole('button', { name: /chop ingredients/i })).toBeEnabled();
});
