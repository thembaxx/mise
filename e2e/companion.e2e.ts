import { expect, test } from '@playwright/test';

test('preparation is independently persisted and never adds food to the 3D pan',async({page})=>{
 await page.goto('/recipes/shakshuka/');
 const prep=page.getByRole('region',{name:'Real-world preparation checklist'});
 await expect(prep).toBeVisible();
 await prep.getByRole('checkbox',{name:'Prepare Large eggs'}).check();
 await page.reload();
 await expect(page.getByRole('region',{name:'Real-world preparation checklist'}).getByRole('checkbox',{name:'Prepare Large eggs'})).toBeChecked();
 await page.getByRole('link',{name:'Start Cook Mode'}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog).toBeVisible({timeout:45000});
 await expect(dialog.getByRole('region',{name:'Real-world preparation checklist'}).getByRole('checkbox',{name:'Prepare Large eggs'})).toBeChecked();
 await expect(dialog.getByRole('button',{name:'Add Large eggs to virtual pan'})).toHaveAttribute('aria-pressed','false');
});

test('unit conversion and curated substitution caveats are visible on recipe page',async({page})=>{
 await page.goto('/recipes/shakshuka/');
 const guide=page.getByRole('region',{name:'Ingredient measures and substitutions'});
 await guide.getByRole('radio',{name:'US'}).check();
 await expect(guide.getByText('14.1 oz')).toBeVisible();
 await expect(guide.getByText('2 tbsp')).toBeVisible();
 await guide.getByText('Possible substitute for Red bell pepper').click();
 await expect(guide.getByText(/same number/)).toBeVisible();
 await page.reload();
 await expect(page.getByRole('region',{name:'Ingredient measures and substitutions'}).getByRole('radio',{name:'US'})).toBeChecked();
});

test('multiple timers start independently, pause, and survive reload',async({page})=>{
 test.setTimeout(120_000); // Two full WebGL loads may be slow under software rendering.
 await page.goto('/?view=cook&recipe=shakshuka');
 const dialog=page.getByRole('dialog');
 const board=dialog.getByRole('region',{name:'Independent kitchen timers'});
 await expect(board).toBeVisible({timeout:45000});
 await board.getByRole('button',{name:'Add step timer'}).click();
 await board.getByRole('textbox',{name:'Custom timer name'}).fill('Rice');
 await board.getByRole('spinbutton',{name:'Custom timer minutes'}).fill('2');
 await board.getByRole('button',{name:'Add custom'}).click();
 await expect(board.locator('.companion-timer-list li')).toHaveCount(2);
 await board.getByRole('button',{name:'Start Rice'}).click();
 await expect(board.getByRole('button',{name:'Pause Rice'})).toBeVisible();
 await expect(board.getByRole('button',{name:'Start Dice and prepare'})).toBeVisible();
 await board.getByRole('button',{name:'Start Dice and prepare'}).click();
 await board.getByRole('button',{name:'Pause Dice and prepare'}).click();
 await expect(board.getByRole('button',{name:'Pause Rice'})).toBeVisible();
 await page.reload();
 const reloaded=page.getByRole('region',{name:'Independent kitchen timers'});
 await expect(reloaded.getByRole('button',{name:'Pause Rice'})).toBeVisible({timeout:45000});
 await expect(reloaded.getByRole('button',{name:'Start Dice and prepare'})).toBeVisible();
 await reloaded.getByRole('button',{name:'Pause Rice'}).click();
 await reloaded.getByRole('button',{name:'Reset Rice'}).click();
 await expect(reloaded.getByLabel('Rice remaining 02:00')).toBeVisible();
});

test('mobile Smart Companion controls fit Cook Mode and allow keyboard-independent touch input',async({page,isMobile})=>{
 test.skip(!isMobile,'mobile viewport only');
 await page.goto('/?view=cook&recipe=jollof');
 const dialog=page.getByRole('dialog');
 await expect(dialog).toBeVisible({timeout:45000});
 await expect(dialog.getByRole('region',{name:'Real-world preparation checklist'})).toBeVisible();
 await dialog.getByRole('region',{name:'Real-world preparation checklist'}).getByRole('checkbox',{name:'Prepare Long-grain rice'}).check();
 const board=dialog.getByRole('region',{name:'Independent kitchen timers'});
 await board.getByRole('button',{name:'Add step timer'}).click();
 await expect(board.locator('.companion-timer-list li')).toHaveCount(1);
 await expect(dialog.getByRole('button',{name:'Close cook mode'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false);
});
