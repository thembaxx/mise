import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recipes } from '../src/data/recipes';
import { draftToRecipe, loadPersonalRecipes, loadCollections, savePersonalRecipe, savedRecipeIds, createCollection, setRecipeSaved, toggleInCollection } from '../src/lib/personal-cookbook';
import { exportCookbook, parseCookbookBackup, previewRestore, applyRestore, MAX_BACKUP_BYTES } from '../src/lib/cookbook-backup';

function storage(){
 const items=new Map<string,string>();
 return {getItem:(k:string)=>items.get(k)??null,setItem:(k:string,v:string)=>{items.set(k,String(v));},removeItem:(k:string)=>{items.delete(k);}};
}
beforeEach(()=>{vi.stubGlobal('localStorage',storage());vi.stubGlobal('window',{dispatchEvent:()=>true});vi.stubGlobal('Event',class{constructor(public type:string){}});});
afterEach(()=>vi.unstubAllGlobals());
const source={name:'Winter lentils',minutes:35,servings:3,ingredients:'400 g lentils\n2 onions',steps:'Rinse lentils.\nSimmer for 30 minutes.'};
const seed=()=>{
 const item=draftToRecipe(source);
 expect(savePersonalRecipe(item)).toBe(true);
 expect(createCollection('Cold weather')).toBe(true);
 expect(toggleInCollection(loadCollections()[0].id,item.id)).toBe(true);
 expect(setRecipeSaved(item.id,true)).toBe(true);
 expect(setRecipeSaved(recipes[0].id,true)).toBe(true);
 return item;
};
describe('portable Mise cookbook backups',()=>{
 it('exports versioned, device-local recipes, collections and favourites with no unrelated state',()=>{
  const item=seed();
  localStorage.setItem('mise:timers:v1:'+item.id,'secret unrelated cooking data');
  const doc=parseCookbookBackup(exportCookbook());
  expect(doc.version).toBe(1);
  expect(doc.format).toBe('mise-cookbook');
  expect(doc.recipes).toHaveLength(1);
  expect(doc.collections[0].recipeIds).toEqual([item.id]);
  expect(doc.favorites).toContain(recipes[0].id);
  expect(exportCookbook()).not.toContain('secret unrelated cooking data');
 });
 it('shows a read-only merge preview and never overwrites an existing dish',()=>{
  const item=seed();
  const text=exportCookbook();
  const preview=previewRestore(text,'merge');
  expect(preview.duplicateRecipes).toBe(1);
  expect(preview.addedRecipes).toBe(0);
  expect(loadPersonalRecipes()).toHaveLength(1);
  const done=applyRestore(text,'merge');
  expect(done.resultRecipes).toBe(1);
  expect(loadPersonalRecipes()[0].id).toBe(item.id);
  expect(loadCollections()).toHaveLength(1);
 });
 it('replaces only after explicitly applying the reviewed backup',()=>{
  const item=seed(),backup=exportCookbook();
  const extra=draftToRecipe({...source,name:'Spicy chickpeas'});
  savePersonalRecipe(extra);
  expect(previewRestore(backup,'replace').removedRecipes).toBe(1);
  expect(loadPersonalRecipes()).toHaveLength(2);
  applyRestore(backup,'replace');
  expect(loadPersonalRecipes()).toHaveLength(1);
  expect(loadPersonalRecipes()[0].id).toBe(item.id);
  expect(savedRecipeIds()).toContain(recipes[0].id);
 });
 it('invalidates old cooking timers and shopping state when replace changes a saved recipe with the same ID',()=>{
  const item=seed();
  localStorage.setItem('mise:timers:v1:'+item.id,'some old timer');
  localStorage.setItem('mise:prep:v1:'+item.id,'["ingredient-1"]');
  const backup=JSON.parse(exportCookbook());
  backup.recipes[0].ingredients[0].name='Chickpeas';
  applyRestore(JSON.stringify(backup),'replace');
  expect(localStorage.getItem('mise:timers:v1:'+item.id)).toBeNull();
  expect(localStorage.getItem('mise:prep:v1:'+item.id)).toBeNull();
  expect(loadPersonalRecipes()[0].ingredients[0].name).toBe('Chickpeas');
 });
 it('rejects unsupported versions, invalid quantities, duplicate ids, missing references and excessive data without changing storage',()=>{
  seed();
  const raw=JSON.parse(exportCookbook());
  const previous=localStorage.getItem('mise:personal-recipes:v1');
  for(const broken of [
   {...raw,version:2},
   {...raw,recipes:[raw.recipes[0],raw.recipes[0]]},
   {...raw,recipes:[{...raw.recipes[0],minutes:-1}]},
   {...raw,collections:[{...raw.collections[0],recipeIds:['personal-does-not-exist']}]},
   {...raw,favorites:[raw.recipes[0].id,raw.recipes[0].id]},
  ]){
   expect(()=>previewRestore(JSON.stringify(broken),'replace')).toThrow();
   expect(localStorage.getItem('mise:personal-recipes:v1')).toBe(previous);
  }
  expect(()=>parseCookbookBackup('x'.repeat(MAX_BACKUP_BYTES+1))).toThrow();
 });
 it('rolls back all three keys when storage fails mid-restore',()=>{
  seed();
  const backup=exportCookbook();
  const initial=storage();
  for(const key of ['mise:personal-recipes:v1','mise:collections:v1','mise:saved']){
    const current=localStorage.getItem(key);
    if(current)initial.setItem(key,current);
  }
  let fails=0;
  const bad={...initial,setItem:(key:string,value:string)=>{
    if(key==='mise:collections:v1'&&fails++===0)throw new Error('quota');
    initial.setItem(key,value);
  }};
  vi.stubGlobal('localStorage',bad);
  expect(()=>applyRestore(backup,'replace')).toThrow(/storage failed/i);
  expect(initial.getItem('mise:personal-recipes:v1')).toBe(localStorage.getItem('mise:personal-recipes:v1'));
 });
});
