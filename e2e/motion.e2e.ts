import { expect, test } from '@playwright/test';

test('recipe results remain legible after rapid filtering, search and preference changes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=discover');
  const cards = page.locator('.recipe-card');
  const count = await cards.count();
  const filters = page.getByRole('group', { name: 'Filter recipes by region' });
  await filters.getByRole('button', { name: 'Asia', exact: true }).click();
  await filters.getByRole('button', { name: 'All', exact: true }).click();
  await expect(cards).toHaveCount(count);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => cards.evaluateAll(elements => elements.every(element =>
    getComputedStyle(element).opacity === '1' && getComputedStyle(element).transform === 'none'))).toBe(true);
  await page.getByRole('searchbox').fill('shakshuka');
  await expect(cards).toHaveCount(1);
  await page.getByRole('searchbox').fill('no-such-dish');
  await expect(page.getByText('No recipes found.')).toBeVisible();
  await page.getByRole('button', { name: 'Show all recipes' }).click();
  await expect(cards).toHaveCount(count);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(cards.first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('settings can reverse mid-transition and release focus without exposing hidden controls', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Open app settings' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'App settings' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Dark', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(dialog).toHaveCount(0);
  await trigger.press('Enter');
  await expect(dialog.getByRole('button', { name: 'Close app settings' })).toBeFocused();
  // Keyboard actions bypass spatial movement, including an opening transition.
  expect(await page.locator('.native-settings-sheet').evaluate(element => element.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('button', { name: 'Close app settings' }).click();
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close app settings' })).toBeFocused();
});

test('touch navigation closes accessibly and never retains image hover zoom', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch-specific hover and navigation');
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Open navigation' });
  await trigger.tap();
  const menu = page.locator('.mobile-menu');
  await expect(menu).toBeVisible();
  await page.getByRole('button', { name: 'Close navigation' }).tap();
  await expect(menu).toBeHidden();
  await expect(menu).toHaveAttribute('inert', '');
  await trigger.focus();
  await trigger.press('Enter');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(menu).toBeHidden();
  await page.getByRole('button', { name: 'Explore recipes' }).tap();
  await page.locator('.save-button').first().tap();
  expect(await page.locator('.recipe-image img').first().evaluate(image => getComputedStyle(image).transform)).toBe('none');
});

test('reduced-motion cooking preserves progress and instant keyboard step changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?view=cook&recipe=shakshuka');
  const dialog = page.locator('.cook-mode[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 40_000 });
  const next = dialog.getByRole('button', { name: 'Next step', exact: true });
  await next.focus();
  await next.press('Enter');
  await expect(dialog.getByRole('heading', { name: 'Soften the vegetables' })).toBeVisible();
  const progress = dialog.getByRole('progressbar', { name: 'Recipe step progress' });
  await expect(progress).toHaveAttribute('aria-valuenow', '2');
  const fillRatio = await progress.evaluate(element => {
    const fill = element.firstElementChild!.getBoundingClientRect();
    return fill.width / element.getBoundingClientRect().width;
  });
  expect(fillRatio).toBeCloseTo(2 / 6, 2);
  expect(await dialog.evaluate(element => getComputedStyle(element).transform)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await next.press('Enter');
  await expect(progress).toHaveAttribute('aria-valuenow', '3');
  const content = dialog.locator('.cook-mode-step-content');
  expect(await content.evaluate(element => element.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
  await dialog.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Soften the vegetables' })).toBeVisible();
  await expect(content).toHaveAttribute('data-direction', 'backward');
  await dialog.getByRole('button', { name: 'Add one minute in cook mode' }).click();
  await expect(content).toHaveAttribute('data-direction', 'backward');
  await page.keyboard.press('Escape');
  await expect(page.locator('.cook-mode')).toHaveCount(0);
  expect(await page.locator('.method-card').evaluate(element => getComputedStyle(element).opacity)).toBe('1');
});


test('settings keep focus on the chosen theme across all page shells', async ({ page }) => {
  for (const route of ['/', '/recipes/shakshuka/', '/cookbook/', '/shopping/']) {
    await page.goto(route);
    const trigger = page.getByRole('button', { name: 'Open app settings' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'App settings' });
    const light = dialog.getByRole('button', { name: 'Light', exact: true });
    await light.click();
    await expect(light).toBeFocused();
    const dark = dialog.getByRole('button', { name: 'Dark', exact: true });
    await dark.click();
    await expect(dark).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
});
