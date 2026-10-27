import { expect, test } from '@playwright/test';

async function expectNoOverflow(page: import('@playwright/test').Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}

test('kitchen controls stay inside the toolbar at phone, tablet and desktop widths', async ({ page, isMobile }) => {
  test.setTimeout(90_000);
  await page.goto('/?view=kitchen');
  const toolbar = page.locator('.scene-topbar');
  await expect(toolbar).toBeVisible({ timeout: 40_000 });

  for (const width of isMobile ? [320, 390, 540] : [768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const clipped = await toolbar.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return [...element.querySelectorAll('button, select, .scene-live, .local-clock')]
        .filter(control => {
          const box = control.getBoundingClientRect();
          return box.left < bounds.left || box.right > bounds.right + 1
            || box.top < bounds.top || box.bottom > bounds.bottom + 1;
        }).map(control => control.getAttribute('aria-label') || control.textContent);
    });
    expect(clipped, `Clipped kitchen controls at ${width}px`).toEqual([]);
    await expectNoOverflow(page);
  }
});

test('phone navigation stays reachable after scrolling and exposes cookbook and shopping links', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Phone navigation only');
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  const bounds = await page.locator('.site-header').evaluate(header => {
    const logo = header.querySelector('.logo')!.getBoundingClientRect();
    const actions = header.querySelector('.header-actions')!.getBoundingClientRect();
    return { logoRight: logo.right, actionsLeft: actions.left, actionsRight: actions.right };
  });
  expect(bounds.logoRight).toBeLessThanOrEqual(bounds.actionsLeft);
  expect(bounds.actionsRight).toBeLessThanOrEqual(320);
  await page.evaluate(() => scrollTo(0, 900));
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const menu = page.locator('.mobile-menu');
  await expect(menu.getByRole('link', { name: 'My cookbook' })).toBeInViewport();
  await expect(menu.getByRole('link', { name: 'Shopping list' })).toBeInViewport();
  await menu.getByRole('link', { name: 'Shopping list' }).click();
  await expect(page.getByRole('heading', { name: /shopping/i })).toBeVisible();
  await expectNoOverflow(page);
});

test('recipe and cookbook pages reflow without clipped text or Safari-zoom-sized inputs', async ({ page, isMobile }) => {
  for (const width of isMobile ? [320, 390] : [768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/recipes/shakshuka/', '/cookbook/', '/shopping/']) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      await expectNoOverflow(page);
    }
    await page.goto('/cookbook/');
    await page.getByRole('button', { name: 'New recipe' }).click();
    await expectNoOverflow(page);
    if (isMobile) {
      const smallInputs = await page.locator('.cookbook-form input, .cookbook-form textarea').evaluateAll(inputs =>
        inputs.filter(input => parseFloat(getComputedStyle(input).fontSize) < 16).map(input => input.getAttribute('name')));
      expect(smallInputs).toEqual([]);
    }
  }
});
