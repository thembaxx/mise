import { expect, test } from '@playwright/test';

test('saving offers undo without losing another saved recipe', async ({ page }) => {
  await page.goto('/?view=discover');
  const cards = page.locator('.recipe-card');
  const first = cards.nth(0).getByRole('button', { name: /^Save / });
  await first.click();
  await expect(cards.nth(0).getByRole('button', { name: /^Remove / })).toHaveAttribute('aria-pressed', 'true');
  await cards.nth(1).getByRole('button', { name: /^Save / }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(cards.nth(0).getByRole('button', { name: /^Remove / })).toHaveAttribute('aria-pressed', 'true');
  await expect(cards.nth(1).getByRole('button', { name: /^Save / })).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Show saved recipes, 1 saved' })).toBeVisible();
  await page.locator('.recipe-card .recipe-name').first().click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Saved', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('a failed save never shows a false success or changes the heart', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'mise:saved') throw new DOMException('Storage full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.goto('/?view=discover');
  const save = page.locator('.save-button').first();
  await save.click();
  await expect(page.locator('.action-feedback')).toContainText('could not be saved');
  await expect(save).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0);
});

test('search can be cleared in place and empty saved recipes explain how to start', async ({ page }) => {
  await page.goto('/?view=discover');
  const search = page.getByRole('searchbox');
  await search.fill('shakshuka');
  await expect(page.locator('.recipe-card')).toHaveCount(1);
  await expect(page.locator('.recipes-topline')).toContainText('1 recipe');
  await page.getByRole('button', { name: 'Clear recipe search' }).click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('');
  await page.getByRole('button', { name: 'Only show my saved recipes' }).click();
  await expect(page.getByRole('heading', { name: 'Your saved recipes will appear here.' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.locator('.recipe-card')).toHaveCount(12);
});

test('shopping removal and clear can be undone while preserving later checks', async ({ page }) => {
  await page.goto('/recipes/shakshuka/');
  await page.getByRole('button', { name: 'Add ingredients', exact: true }).click();
  await page.getByRole('link', { name: 'View list', exact: true }).click();
  const rows = page.locator('.shopping-items li');
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  const firstName = await rows.first().locator('strong').innerText();
  await rows.first().getByRole('button', { name: /^Remove / }).click();
  await expect(rows).toHaveCount(count - 1);
  await rows.first().getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(rows).toHaveCount(count);
  await expect(rows.first().locator('strong')).toHaveText(firstName);
  await expect(rows.first().getByRole('button', { name: /^Remove / })).toBeFocused();
  await expect(rows.nth(1).getByRole('checkbox')).toBeChecked();
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your shopping list is empty.' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(rows).toHaveCount(count);
  await expect(rows.nth(1).getByRole('checkbox')).toBeChecked();
  await page.reload();
  await expect(rows).toHaveCount(count);
  await expect(rows.nth(1).getByRole('checkbox')).toBeChecked();
});

test('Undo stays available while focused and the latest feedback gets its own timeout', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?view=discover');
  await page.clock.install();
  await page.locator('.save-button').nth(0).click();
  await page.clock.fastForward(2000);
  await page.locator('.save-button').nth(1).click();
  await page.clock.fastForward(5000);
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await expect(undo).toBeVisible();
  await undo.hover();
  await undo.focus();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(10000);
  await expect(undo).toBeFocused();
  await undo.press('Enter');
  await expect(page.locator('.save-button').nth(1)).toHaveAttribute('aria-pressed', 'false');
});

test('copying a recipe confirms the copy without an unrelated shopping link', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (value: string) => { (window as unknown as { copiedRecipe: string }).copiedRecipe = value; } }, configurable: true });
  });
  await page.goto('/recipes/shakshuka/');
  await page.getByRole('button', { name: 'Share recipe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Link copied', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View list', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { copiedRecipe: string }).copiedRecipe)).toContain('/recipes/shakshuka/');
});

test('discovery spacing remains compact on phones, tablets and desktop', async ({ page, isMobile }) => {
  for (const width of isMobile ? [320, 390] : [768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?view=discover');
    const gap = await page.evaluate(() => {
      const intro = document.querySelector('.discover-intro')!.getBoundingClientRect();
      const results = document.querySelector('.recipes-content')!.getBoundingClientRect();
      return innerWidth <= 1050 ? results.top - intro.bottom : 0;
    });
    expect(gap).toBeLessThanOrEqual(40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});
