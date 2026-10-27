import { expect, test } from '@playwright/test';

test('quick WebGL kitchen stays interactive before optional physics download', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: /step into the kitchen/i }).click();
  await expect(page.locator('.cooking-tools')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.kitchen-canvas canvas')).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: /Quick 3D/i })).toHaveAttribute('aria-pressed', 'false');
  const physicsRequests = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .filter(entry => /\/assets\/KitchenScene-[^/]+\.js/.test(entry.name)).length);
  expect(physicsRequests, 'Full-physics chunk must not download before opt-in').toBe(0);
  await page.getByRole('button', { name: /chop ingredients/i }).click();
  await expect(page.getByText(/Freshly chopped/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('physics is explicitly activated and full scene still loads', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: /step into the kitchen/i }).click();
  const toggle = page.getByRole('button', { name: /Quick 3D/i });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.getByRole('button', { name: /Physics on/i })).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.kitchen-canvas canvas')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/3D graphics couldn't start/i)).toHaveCount(0);
  await page.getByRole('button', { name: /pour ingredients/i }).click();
  await expect(page.getByText(/Poured into the pan/)).toBeVisible();
  expect(errors).toEqual([]);
});
