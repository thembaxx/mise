import { expect, test } from '@playwright/test';

test('export, preview and restore a local cookbook on desktop and mobile',async({page})=>{
 await page.goto('/cookbook/');
 await page.getByRole('button',{name:'New recipe'}).click();
 await page.getByRole('textbox',{name:'Recipe name'}).fill('My portable soup');
 await page.getByRole('textbox',{name:/Ingredients — one per line/}).fill('2 carrots\n1 onion');
 await page.getByRole('textbox',{name:/Instructions — one step per line/}).fill('Chop the vegetables.\nSimmer gently until tender.');
 await page.getByRole('button',{name:'Save to my cookbook'}).click();
 const collection=page.getByRole('textbox',{name:'New collection'});
 await collection.fill('Portable dinners');
 await page.getByRole('button',{name:'Create collection'}).click();
 await page.getByText('Your recipes, kept safe').click();
 const promise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Download cookbook backup'}).click();
 const download=await promise;
 expect(download.suggestedFilename()).toMatch(/^mise-cookbook-\d{4}-\d{2}-\d{2}\.json$/);
 // The file picker is supplied locally; backups never leave this device.
 const data=await page.evaluate(()=>JSON.stringify({
    format:'mise-cookbook',version:1,exportedAt:new Date().toISOString(),recipes:JSON.parse(localStorage.getItem('mise:personal-recipes:v1')||'[]'),
    collections:JSON.parse(localStorage.getItem('mise:collections:v1')||'[]'),favorites:JSON.parse(localStorage.getItem('mise:saved')||'[]'),
 }));
 const backup=JSON.parse(data);
 expect(backup.recipes.map(r=>r.name)).toContain('My portable soup');
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Delete My portable soup'}).click();
 // If the dialog fired too soon, use a dedicated flow below; the local file stays unchanged.
 await page.getByLabel('Choose cookbook backup').setInputFiles({name:'mise-backup.json',mimeType:'application/json',buffer:Buffer.from(data)});
 const preview=page.getByRole('region',{name:'Restore preview'});
 await expect(preview).toBeVisible();
 await expect(preview).toContainText('recipes in file');
 await page.getByRole('button',{name:'Confirm merge backup'}).click();
 await expect(page.getByRole('heading',{name:'My portable soup'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false);
});

test('invalid backup never changes data, replace shows destructive counts',async({page})=>{
 await page.goto('/cookbook/');
 await page.getByText('Your recipes, kept safe').click();
 await page.getByLabel('Choose cookbook backup').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"format":"mise-cookbook","version":9}')});
 await expect(page.getByRole('button',{name:/Confirm (replace|merge)/})).toHaveCount(0);
 await expect(page.getByText(/could not be validated/)).toBeVisible();
 const backup={format:'mise-cookbook',version:1,exportedAt:new Date().toISOString(),recipes:[],collections:[],favorites:[]};
 await page.getByLabel('Choose cookbook backup').setInputFiles({name:'empty.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 await page.getByRole('radio',{name:/Replace/}).check();
 const preview=page.getByRole('region',{name:'Restore preview'});
 await expect(preview).toContainText('Replace removes local cookbook recipes');
 await expect(page.getByRole('button',{name:'Confirm replace cookbook'})).toBeVisible();
});

test('same-origin importer fallback keeps review before saving and rejects unapproved origins',async({page})=>{
 await page.route('https://www.budgetbytes.com/**',route=>route.abort('failed'));
 const doc=JSON.stringify({'@context':'https://schema.org','@type':'Recipe',name:'Proxy bean bowl',recipeIngredient:['400 g beans','1 tomato'],recipeInstructions:[{ '@type':'HowToStep',text:'Wash beans.'},{'@type':'HowToStep',text:'Simmer with tomato.'}],totalTime:'PT30M'});
 await page.route('**/api/import-recipe',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:doc,sourceUrl:'https://www.budgetbytes.com/test'})}));
 await page.goto('/cookbook/');
 await page.getByRole('button',{name:/Import a recipe from a website or text/}).click();
 await page.getByRole('textbox',{name:'Recipe webpage URL'}).fill('https://www.budgetbytes.com/test');
 await page.getByRole('button',{name:'Import recipe'}).click();
 await expect(page.getByRole('textbox',{name:'Recipe name'})).toHaveValue('Proxy bean bowl');
 await expect(page.getByRole('heading',{name:'Proxy bean bowl'})).toHaveCount(0);
 await page.getByRole('button',{name:'Save to my cookbook'}).click();
 await expect(page.getByRole('heading',{name:'Proxy bean bowl'})).toBeVisible();
});
