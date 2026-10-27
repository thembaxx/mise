import { expect, test } from '@playwright/test';

test('direct recipe link opens distraction-free Cook Mode with shared steps and accessible controls', async ({page}) => {
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/?view=cook&recipe=shakshuka');
  const dialog=page.locator('.cook-mode[role="dialog"]');
  await expect(dialog).toBeVisible({timeout:45000});
  await expect(dialog.getByRole('heading',{name:'Dice and prepare'})).toBeVisible();
  await expect(dialog.getByText('Sunrise shakshuka')).toBeVisible();
  await dialog.getByRole('button',{name:/Next step/}).click();
  await expect(dialog.getByRole('heading',{name:'Soften the vegetables'})).toBeVisible();
  await dialog.getByRole('button',{name:/Previous/}).click();
  await expect(dialog.getByRole('heading',{name:'Dice and prepare'})).toBeVisible();
  await dialog.getByRole('button',{name:'Add one minute in cook mode'}).click();
  await expect(dialog.getByLabel('Timer remaining 07:00')).toBeVisible();
  await dialog.getByRole('button',{name:/Start cook mode timer/}).click();
  await expect(dialog.getByRole('button',{name:/Pause cook mode timer/})).toBeVisible();
  await dialog.getByRole('button',{name:/Pause cook mode timer/}).click();
  await dialog.getByRole('button',{name:/Add Large eggs to virtual pan/}).click();
  await expect(dialog.getByRole('button',{name:/Added Large eggs/})).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Enter Cook Mode/})).toBeVisible();
  expect(errors).toEqual([]);
});

test('Cook Mode works on mobile without sideways scrolling and offers safe fallbacks',async({page,isMobile})=>{
  test.skip(!isMobile,'mobile viewport only');
  await page.goto('/?view=cook&recipe=jollof');
  const dialog=page.locator('.cook-mode[role="dialog"]');
  await expect(dialog).toBeVisible({timeout:45000});
  await expect(dialog.getByRole('heading',{name:'Blend the base'})).toBeVisible();
  await dialog.getByRole('button',{name:/Keep awake off/}).click();
  await expect(dialog.locator('.cook-mode-status')).toBeVisible();
  await dialog.getByRole('button',{name:'Read current step aloud'}).click();
  await expect(dialog.getByRole('button',{name:/Stop reading the step|Read current step aloud/})).toBeVisible();
  await dialog.getByRole('button',{name:'Close cook mode'}).click();
  await expect(dialog).toHaveCount(0);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  expect(overflow).toBe(false);
});

test('graphics preset is optional, persisted, and 3D kitchen loads',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:/step into the kitchen/i}).click();
  await expect(page.locator('.kitchen-canvas canvas')).toBeVisible({timeout:40000});
  const quality=page.getByRole('combobox',{name:'Graphics quality'});
  await quality.selectOption('eco');
  await expect(quality).toHaveValue('eco');
  await page.reload();
  await page.getByRole('button',{name:/step into the kitchen/i}).click();
  await expect(page.getByRole('combobox',{name:'Graphics quality'})).toHaveValue('eco');
});

test('recipe detail offers accessible focused cook link and related discovery',async({page})=>{
  await page.goto('/recipes/chakalaka/');
  await expect(page.getByRole('link',{name:'Start Cook Mode'})).toHaveAttribute('href','/?view=cook&recipe=chakalaka');
  await expect(page.getByRole('region',{name:'Discover more recipes'})).toBeVisible();
  await expect(page.locator('.recipe-related-grid a')).toHaveCount(3);
});
