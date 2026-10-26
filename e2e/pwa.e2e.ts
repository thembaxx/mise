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
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, { timeout: 30000 }).catch(async () => {
    await page.waitForFunction(() => navigator.serviceWorker?.ready, { timeout: 30000 });
    await page.reload();
  });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), { timeout: 30000 });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /the world/i })).toBeVisible();
  await expect(page.getByText(/Offline mode/)).toBeVisible();
  await page.getByRole('button', { name: 'Open app settings' }).click();
  await expect(page.getByRole('button', { name: 'System', exact: true })).toBeVisible();
});
