import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { recipes } from '../src/data/recipes';
import { addRecipeToShoppingList, loadKitchenSnapshot } from '../src/lib/kitchen-storage';
import { loadPrep, savePrep, createTimer, saveTimers, loadTimers, startTimer } from '../src/lib/companion';
import {
  allRecipes, createCollection, deletePersonalRecipe, draftToRecipe, findRecipe,
  importRecipeContent, isPersonalRecipe, loadCollections, loadPersonalRecipes, parseIngredient,
  recipeToDraft, savePersonalRecipe, savedRecipeIds, setRecipeSaved, toggleInCollection,
} from '../src/lib/personal-cookbook';
const storage=()=>{
 const data=new Map<string,string>();
 return {getItem:(id:string)=>data.get(id)||null,setItem:(id:string,value:string)=>{data.set(id,value)},removeItem:(id:string)=>{data.delete(id)}};
};
beforeEach(()=>{vi.stubGlobal('localStorage',storage());vi.stubGlobal('window',{dispatchEvent:()=>true});vi.stubGlobal('Event',class{constructor(public type:string){}});});
afterEach(()=>vi.unstubAllGlobals());
const draft={name:'Sunday beans',minutes:45,servings:4,ingredients:'200 g beans\n2 onions\n1 tbsp oil',steps:'Wash the beans.\nSimmer with the onions.'};
describe('personal cookbook validation and storage',()=>{
 it('creates local recipes with stable ids, validated ingredients and shopping integration',()=>{
  const recipe=draftToRecipe(draft);
  expect(isPersonalRecipe(recipe.id)).toBe(true);
  expect(recipe.ingredients.map(i=>i.amount)).toEqual([200,2,1]);
  expect(savePersonalRecipe(recipe)).toBe(true);
  expect(findRecipe(recipe.id)?.name).toBe('Sunday beans');
  expect(allRecipes().length).toBe(recipes.length+1);
  expect(addRecipeToShoppingList(recipe)).toBe(3);
  expect(loadKitchenSnapshot(recipe).stepIndex).toBe(0);
  expect(savePrep(recipe,[recipe.ingredients[0].id])).toBe(true);
  expect(loadPrep(recipe)).toHaveLength(1);
  const timer=startTimer(createTimer('Beans',5,'b')!,1000);
  saveTimers(recipe.id,[timer]);
  expect(loadTimers(recipe.id,61000)[0].remainingSeconds).toBe(240);
  expect(recipeToDraft(recipe).steps).toContain('Simmer with the onions.');
 });
 it('preserves recipe identity when edited and cleans favourite/collection references on delete',()=>{
  const a=draftToRecipe(draft);savePersonalRecipe(a);
  const b=draftToRecipe({...recipeToDraft(a),name:'Beans with spice'});savePersonalRecipe(b);
  expect(b.id).toBe(a.id);expect(loadPersonalRecipes()).toHaveLength(1);
  expect(createCollection('Sunday supper')).toBe(true);
  const id=loadCollections()[0].id;
  expect(toggleInCollection(id,a.id)).toBe(true);
  expect(setRecipeSaved(a.id,true)).toBe(true);
  expect(savedRecipeIds()).toContain(a.id);
  expect(deletePersonalRecipe(a.id)).toBe(true);
  expect(savedRecipeIds()).not.toContain(a.id);
  expect(loadCollections()[0].recipeIds).toEqual([]);
  expect(findRecipe(a.id)).toBeUndefined();
 });
 it('clears outdated prep, timers and shopping items after ingredient edits',()=>{
  const recipe=draftToRecipe(draft);savePersonalRecipe(recipe);
  savePrep(recipe,[recipe.ingredients[0].id]);
  saveTimers(recipe.id,[createTimer('beans',5,'x')!]);
  addRecipeToShoppingList(recipe);
  const revised=draftToRecipe({...recipeToDraft(recipe),ingredients:'2 carrots\n400 g spinach'});
  expect(savePersonalRecipe(revised)).toBe(true);
  expect(loadPrep(revised)).toEqual([]);
  expect(loadTimers(revised.id)).toEqual([]);
  expect(loadKitchenSnapshot(revised).added).toEqual([]);
  expect(addRecipeToShoppingList(revised)).toBe(2);
 });
 it('rejects empty instructions, massive ingredient values and corrupt storage',()=>{
  expect(()=>draftToRecipe({...draft,steps:''})).toThrow();
  expect(()=>draftToRecipe({...draft,ingredients:'9999999999 g beans'})).toThrow();
  expect(()=>parseIngredient('')).toThrow();
  localStorage.setItem('mise:personal-recipes:v1',JSON.stringify([{id:'personal-fake',name:'unsafe',minutes:-1}]));
  expect(loadPersonalRecipes()).toEqual([]);
 });
 it('fails safely if browser storage is unavailable',()=>{
  vi.stubGlobal('localStorage',{getItem:()=>{throw Error('storage denied')},setItem:()=>{throw Error('storage denied')}});
  expect(loadPersonalRecipes()).toEqual([]);
  expect(savePersonalRecipe(draftToRecipe(draft))).toBe(false);
 });
});
describe('supported recipe import without unsafe HTML rendering',()=>{
 it('extracts JSON-LD Recipe from an @graph inside HTML',()=>{
  const schema={'@context':'https://schema.org','@graph':[{'@type':['Thing','Recipe'],name:'Citrus roast',
    recipeIngredient:['2 lemons','400 g potatoes'],recipeInstructions:[{'@type':'HowToStep',text:'Cut the potatoes.'},{'@type':'HowToStep',text:'Roast until crisp.'}],
    totalTime:'PT1H10M',recipeYield:'4 servings'}]};
  const content='<script type="application/ld+json">'+JSON.stringify(schema)+'</script>';
  const result=importRecipeContent(content,'https://www.example.com/roast');
  expect(result.name).toBe('Citrus roast');expect(result.minutes).toBe(70);
  expect(result.servings).toBe(4);expect(result.steps).toContain('Roast until crisp.');
  expect(draftToRecipe(result).ingredients[0].name).toBe('lemons');
 });
 it('parses structured plain text and requires explicit method headings',()=>{
  const result=importRecipeContent('Family soup\nIngredients\n1 onion\n3 carrots\nInstructions\nWash vegetables.\nSimmer for a while.');
  expect(result.name).toBe('Family soup');expect(result.ingredients).toContain('3 carrots');
  expect(()=>importRecipeContent('Hello, no recipe here.')).toThrow();
 });
 it('rejects unsupported URL schemes, private URLs and malformed input content',()=>{
  const json=JSON.stringify({'@type':'Recipe',name:'Toast',recipeIngredient:['1 bread'],recipeInstructions:['Toast the bread.']});
  expect(importRecipeContent(json,'javascript:alert(1)').sourceUrl).toBe('');
  expect(importRecipeContent(json,'https://localhost/private').sourceUrl).toBe('');
  expect(()=>importRecipeContent('x'.repeat(500_001))).toThrow();
 });
});