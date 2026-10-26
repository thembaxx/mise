import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { recipes } from '../src/data/recipes';
import {
  addRecipeToShoppingList, clearKitchenSnapshot, getShoppingItems, loadKitchenSnapshot,
  recipePath, recipeUrl, saveKitchenSnapshot, saveShoppingItems,
} from '../src/lib/kitchen-storage';
import { readFileSync } from 'node:fs';

function mockStorage() {
  const values = new Map<string,string>();
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string,v: string) => { values.set(k,String(v)); },
    removeItem: (k: string) => { values.delete(k); },
  };
}
beforeEach(() => {
  vi.stubGlobal('localStorage',mockStorage());
  vi.stubGlobal('window',{ dispatchEvent: () => true });
  vi.stubGlobal('Event', class { constructor(public type: string) {} });
});
afterEach(() => vi.unstubAllGlobals());

describe('world recipe content', () => {
  it('provides twelve unique shareable global recipes with full instructions', () => {
    expect(recipes.length).toBeGreaterThanOrEqual(12);
    expect(new Set(recipes.map(r=>r.id)).size).toBe(recipes.length);
    expect(new Set(recipes.map(r=>r.country)).size).toBeGreaterThanOrEqual(10);
    for (const recipe of recipes) {
      expect(recipe.id).toMatch(/^[a-z0-9-]+$/);
      expect(recipe.ingredients.length).toBeGreaterThanOrEqual(5);
      expect(recipe.steps.length).toBeGreaterThanOrEqual(4);
      expect(recipe.steps.every(step=>step.instruction.length>25)).toBe(true);
      expect(recipePath(recipe.id)).toMatch(/^\/recipes\/[^/]+\/$/);
      expect(recipeUrl(recipe.id)).toContain(recipePath(recipe.id));
    }
  });
  it('generates crawlable HTML with Recipe HowToStep and matching sitemap URLs', () => {
    const script = readFileSync(new URL('../scripts/prerender-recipes.mjs',import.meta.url),'utf8');
    expect(script).toContain("resolve('dist/recipes',recipe.id)");
    expect(script).toContain("'@type':'Recipe'");
    expect(script).toContain("'@type':'HowToStep'");
    expect(script).toContain("resolve('dist/sitemap.xml')");
  });
});

describe('local shopping list', () => {
  it('adds ingredients without duplicates and respects adjusted servings', () => {
    const recipe = recipes[0];
    expect(addRecipeToShoppingList(recipe,4)).toBe(recipe.ingredients.length);
    const list = getShoppingItems();
    expect(list).toHaveLength(recipe.ingredients.length);
    expect(list[0].amount).toBeCloseTo(recipe.ingredients[0].amount*4/recipe.servings);
    expect(addRecipeToShoppingList(recipe,4)).toBe(0);
    expect(addRecipeToShoppingList(recipe,2)).toBe(0);
    expect(getShoppingItems()[0].amount).toBeCloseTo(recipe.ingredients[0].amount);
    expect(saveShoppingItems([{...getShoppingItems()[0],checked:true},...getShoppingItems().slice(1)])).toBe(true);
    expect(addRecipeToShoppingList(recipe,6)).toBe(0);
    expect(getShoppingItems()[0].amount).toBeCloseTo(recipe.ingredients[0].amount); // checked item remains untouched
    expect(getShoppingItems()[1].amount).toBeCloseTo(recipe.ingredients[1].amount*6/recipe.servings);
  });
  it('persists checks/removal and safely handles unavailable storage', () => {
    addRecipeToShoppingList(recipes[1]);
    const list = getShoppingItems();
    expect(saveShoppingItems([{...list[0],checked:true}])).toBe(true);
    expect(getShoppingItems()[0].checked).toBe(true);
    vi.stubGlobal('localStorage',{getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')}});
    expect(getShoppingItems()).toEqual([]);
    expect(addRecipeToShoppingList(recipes[1])).toBe(-1);
  });
});

describe('per-recipe cooking snapshot', () => {
  it('restores progress, ingredient checks and servings without mixing recipes', () => {
    const recipe=recipes[0], other=recipes[1];
    expect(loadKitchenSnapshot(recipe).stepIndex).toBe(0);
    saveKitchenSnapshot(recipe,{stepIndex:3,added:[recipe.ingredients[0].id],heat:.8,servings:4,seconds:52,progress:{chops:2,pours:1,stirs:1,plated:false}});
    expect(loadKitchenSnapshot(recipe).stepIndex).toBe(3);
    expect(loadKitchenSnapshot(recipe).progress.chops).toBe(2);
    expect(loadKitchenSnapshot(recipe).seconds).toBe(52);
    expect(loadKitchenSnapshot(other).added).toEqual([]);
    clearKitchenSnapshot(recipe.id);
    expect(loadKitchenSnapshot(recipe).progress.chops).toBe(0);
  });
  it('sanitizes corrupt/foreign data rather than trusting localStorage blindly', () => {
    const recipe=recipes[0];
    localStorage.setItem('mise:progress:v1:'+recipe.id,JSON.stringify({stepIndex:999,added:['unknown',recipe.ingredients[0].id],servings:999,heat:-5,seconds:999999,progress:{chops:99,pours:-3,stirs:Infinity,plated:'yes'}}));
    const restored=loadKitchenSnapshot(recipe);
    expect(restored.stepIndex).toBe(recipe.steps.length-1);
    expect(restored.added).toEqual([recipe.ingredients[0].id]);
    expect(restored.servings).toBe(12);
    expect(restored.heat).toBe(0);
    expect(restored.seconds).toBe(recipe.steps.at(-1)!.minutes*60);
    expect(restored.progress.plated).toBe(false);
  });
});
