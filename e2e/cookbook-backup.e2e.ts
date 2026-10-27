import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function addRecipe(page:import('@playwright/test').Page,name:string){
  await page.getByRole('button',{name:'New recipe'}).click();
  await page.getByRole('textbox',{name:'Recipe name'}).fill(name);
  await page.getByRole('textbox',{name:/Ingredients — one per line/}).fill('2 onions\n300 g tomatoes');
  await page.getByRole('textbox',{name:/Instructions — one step per line/}).fill('Chop vegetables.\nCook until soft.');
  await page.getByRole('button',{name:'Save to my cookbook'}).click();
  await expect(page.getByRole('heading',{name})).toBeVisible();
}
test('versioned JSON export supports an explicit reviewed merge and replace on desktop and mobile',async({page})=>{
  await page.goto('/cookbook/');
  await addRecipe(page,'Backup soup');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export JSON backup'}).click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^mise-cookbook-\d{4}-\d{2}-\d{2}\.json$/);
  const json=await readFile(await download.path());
  const backup=JSON.parse(json.toString('utf8'));
  expect(backup.format).toBe('mise-personal-cookbook');
  expect(backup.version).toBe(1);
  expect(backup.recipes).toHaveLength(1);
  await addRecipe(page,'Newer stew');
  await page.getByRole('button',{name:'Restore a backup'}).click();
  await page.locator('input[type="file"]').setInputFiles({name:'mise.json',mimeType:'application/json',buffer:json});
  await page.getByRole('button',{name:'Preview changes'}).click();
  await expect(page.getByRole('heading',{name:'Review your restore'})).toBeVisible();
  await page.getByRole('button',{name:'Confirm merge'}).click();
  await expect(page.getByRole('heading',{name:'Newer stew'})).toBeVisible();
  await page.getByRole('radio',{name:/Replace this cookbook/}).check();
  await page.locator('input[type="file"]').setInputFiles({name:'mise.json',mimeType:'application/json',buffer:json});
  await page.getByRole('button',{name:'Preview changes'}).click();
  await expect(page.getByRole('button',{name:'Confirm replacement'})).toBeDisabled();
  await page.getByRole('checkbox',{name:/I understand that replacing/}).check();
  await page.getByRole('button',{name:'Confirm replacement'}).click();
  await expect(page.getByRole('heading',{name:'Backup soup'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Newer stew'})).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading',{name:'Backup soup'})).toBeVisible();
});
test('rejects malformed backups before changing current recipes',async({page})=>{
  await page.goto('/cookbook/');
  await addRecipe(page,'Safe soup');
  await page.getByRole('button',{name:'Restore a backup'}).click();
  await page.locator('input[type="file"]').setInputFiles({name:'unsafe.json',mimeType:'application/json',buffer:Buffer.from('{"format":"mise-personal-cookbook","version":999}')});
  await expect(page.getByRole('status').filter({hasText:/Unsupported cookbook format or version/})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Safe soup'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Preview changes'})).toBeDisabled();
});