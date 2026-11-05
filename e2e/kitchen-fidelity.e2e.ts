import { expect, test } from '@playwright/test';

test('kitchen 3D drawer and cooking controls remain accessible on mobile and desktop', async ({ page, isMobile }) => {
  await page.goto('/?view=kitchen');
  const openDrawer = page.getByRole('button', { name: 'Open prep drawer' });
  await expect(openDrawer).toBeVisible({ timeout: 40_000 });
  await openDrawer.click();

  const closeDrawer = page.getByRole('button', { name: 'Close prep drawer' });
  await expect(closeDrawer).toHaveAttribute('aria-pressed', 'true');
  await closeDrawer.click();
  await expect(openDrawer).toHaveAttribute('aria-pressed', 'false');

  const faucet = page.getByRole('button', { name: 'Turn on faucet' });
  await expect(faucet).toBeVisible();
  await faucet.scrollIntoViewIfNeeded();
  // On a narrow screen the 3D canvas is mostly above the cooking controls.
  // Pausing only that canvas keeps real HTML controls responsive.
  if (isMobile) await expect(page.locator('.kitchen-canvas')).toHaveAttribute('data-scene-paused', 'true');
  await faucet.click();
  await expect(page.getByRole('button', { name: 'Turn off faucet' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Turn off faucet' }).click();
  await expect(faucet).toHaveAttribute('aria-pressed', 'false');

  const coverPan = page.getByRole('button', { name: 'Cover pan' });
  await expect(coverPan).toHaveAttribute('aria-pressed', 'false');
  await coverPan.click();
  const liftPan = page.getByRole('button', { name: 'Lift pan lid' });
  await expect(liftPan).toHaveAttribute('aria-pressed', 'true');
  await liftPan.click();
  await expect(coverPan).toHaveAttribute('aria-pressed', 'false');

  const graphics = page.getByRole('combobox', { name: 'Graphics quality' });
  await graphics.selectOption('high');
  await expect(graphics).toHaveValue('high');
  const burner = page.getByRole('slider', { name: 'Burner heat' });
  await burner.focus();
  await burner.press('Home');
  for (let i = 0; i < 16; i++) await burner.press('ArrowRight');
  await expect(burner).toHaveValue('0.8');

  const cameras = page.getByRole('group', { name: 'Kitchen camera view' });
  await expect(cameras.getByRole('button', { name: 'Full kitchen' })).toHaveAttribute('aria-pressed', 'true');
  await cameras.getByRole('button', { name: 'Focus pan' }).click();
  await expect(cameras.getByRole('button', { name: 'Focus pan' })).toHaveAttribute('aria-pressed', 'true');
  await cameras.getByRole('button', { name: 'Prep station' }).click();
  await expect(cameras.getByRole('button', { name: 'Prep station' })).toHaveAttribute('aria-pressed', 'true');
  await expect(cameras.getByRole('button', { name: 'Full kitchen' })).toHaveAttribute('aria-pressed', 'false');

  const clipped = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(clipped).toBe(false);
});

test('kitchen can opt into physics and still exposes equivalent HTML controls', async ({ page }) => {
  await page.goto('/?view=kitchen');
  const mode = page.getByRole('button', { name: /Quick 3D/i });
  await expect(mode).toBeVisible({ timeout: 40_000 });
  await mode.click();
  await expect(page.getByRole('button', { name: /Physics on/i })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Open prep drawer' })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Burner heat' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Turn on faucet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cover pan' })).toBeVisible();
});
