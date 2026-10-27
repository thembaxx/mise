import { expect, test } from '@playwright/test';

test('recipe pages serve unique pre-rendered HTML and Google Recipe structured data', async ({ request, page }) => {
  const response = await request.get('/recipes/chakalaka/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('<h1>Rainbow chakalaka</h1>');
  expect(html).toContain('<h2>Ingredients</h2>');
  expect(html).toContain('https://mise-two-teal.vercel.app/recipes/chakalaka/');
  const structured = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  expect(structured).not.toBeNull();
  const json = JSON.parse(structured![1]);
  expect(json['@type']).toBe('Recipe');
  expect(json.name).toBe('Rainbow chakalaka');
  expect(json.recipeIngredient.length).toBeGreaterThan(5);
  expect(json.recipeInstructions.every((step: { '@type': string }) => step['@type']==='HowToStep')).toBe(true);

  await page.goto('/recipes/chakalaka/');
  await expect(page.getByRole('heading',{name:'Rainbow chakalaka'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Ingredients',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'How to make it'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Cook interactively'})).toHaveAttribute('href','/?view=kitchen&recipe=chakalaka');
});

test('shopping list and per-recipe servings persist across navigation and reload',async ({ page }) => {
  await page.goto('/recipes/jollof/');
  await page.getByRole('combobox',{name:'Servings'}).selectOption('2');
  await page.getByRole('button',{name:'Add ingredients'}).click();
  await page.getByRole('link',{name:/View list/}).click();
  await expect(page.getByRole('heading',{name:'Shopping list'})).toBeVisible();
  const items=page.locator('.shopping-items li');
  await expect(items).toHaveCount(9);
  await items.first().getByRole('checkbox').check();
  await page.reload();
  await expect(items.first().getByRole('checkbox')).toBeChecked();
  await page.getByRole('button',{name:/Remove Long-grain rice/}).click();
  await expect(items).toHaveCount(8);
});

test('cook a linked recipe and restore progress after a page refresh',async ({page})=>{
  await page.goto('/recipes/shakshuka/');
  await page.getByRole('link',{name:'Cook interactively'}).click();
  await expect(page.getByRole('heading',{name:/the world/i})).toBeVisible();
  await page.getByRole('button',{name:/step into the kitchen/i}).click();
  await expect(page.locator('.cooking-tools')).toBeVisible({timeout:30000});
  const chop=page.getByRole('button',{name:/chop ingredients/i});
  await chop.click();
  await chop.click();
  await page.getByRole('button',{name:/go to step 3/i}).click();
  await expect(page.locator('.cooking-meter')).toHaveAttribute('aria-valuenow',/^[1-6]$/);
  await page.reload();
  await page.getByRole('button',{name:/step into the kitchen/i}).click();
  await expect(page.getByRole('button',{name:/go to step 3/i})).toHaveAttribute('aria-current','step');
  await expect(page.getByRole('button',{name:/chop ingredients/i})).toBeVisible();
});

test('mobile layout has accessible navigation, settings and no horizontal overflow',async ({page,isMobile})=>{
  test.skip(!isMobile,'mobile viewport only');
  await page.goto('/recipes/bibimbap/');
  await expect(page.getByRole('heading',{name:/Rainbow bibimbap/})).toBeVisible();
  await page.getByRole('button',{name:'Open app settings'}).click();
  await page.getByRole('button',{name:'Dark',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.getByRole('button',{name:'Close app settings'}).click();
  const horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth + 2);
  expect(horizontalOverflow).toBe(false);
});

test('sitemap lists all generated public recipes and excludes personal list',async ({request})=>{
  const response=await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const xml=await response.text();
  expect(xml).toContain('/recipes/shakshuka/');
  expect(xml).toContain('/recipes/jollof/');
  expect(xml).not.toContain('/shopping/');
});
