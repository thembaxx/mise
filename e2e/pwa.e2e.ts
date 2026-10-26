import { expect, test } from '@playwright/test';

test('native chrome respects saved theme preferences before paint', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open app settings' }).click();
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content','#111B17');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.getByRole('button', { name: 'Open app settings' }).click();
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content','#F7F6F1');
});

test('installed service worker loads the app while offline after a successful visit', async ({ page, context }) => {
  await page.goto('/');
  // First visits often activate a worker without controlling the current page.
  // Wait for activation, then navigate once under service-worker control.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(
    () => page.evaluate(() => Boolean(navigator.serviceWorker?.controller)),
    { timeout: 12000 },
  ).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /the world/i })).toBeVisible();
  await expect(page.getByText(/Offline mode/)).toBeVisible();
  await page.getByRole('button', { name: 'Open app settings' }).click();
  await expect(page.getByRole('button', { name: 'System', exact: true })).toBeVisible();
});
