import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
import {draftToRecipe,loadPersonalRecipes,savePersonalRecipe,createCollection,loadCollections,setRecipeSaved,savedRecipeIds} from '../src/lib/personal-cookbook';
import {serializeCookbookBackup,validateCookbookBackup,previewCookbookRestore,applyCookbookRestore,BACKUP_VERSION} from '../src/lib/cookbook-backup';
function memory(){
 const values=new Map<string,string>();
 return {getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v)},removeItem:(k:string)=>{values.delete(k)}};
}
const mk=(name:string)=>draftToRecipe({name,minutes:25,servings:2,ingredients:'2 onions\n300 g tomatoes',steps:'Chop the onions.\nCook until tender.'});
beforeEach(()=>{vi.stubGlobal('localStorage',memory());vi.stubGlobal('window',{dispatchEvent:()=>true});vi.stubGlobal('Event',class{constructor(public type:string){}});});
afterEach(()=>vi.unstubAllGlobals());
describe('versioned cookbook backups',()=>{
 it('exports real local recipes, collection associations and favourites without transient cooking state',()=>{
  const r=mk('Sunday soup');expect(savePersonalRecipe(r)).toBe(true);
  expect(createCollection('Family')).toBe(true);
  expect(setRecipeSaved(r.id,true)).toBe(true);
  const text=serializeCookbookBackup(),data=validateCookbookBackup(text);
  expect(data.version).toBe(BACKUP_VERSION);
  expect(data.recipes[0].id).toBe(r.id);
  expect(data.collections[0].name).toBe('Family');
  expect(data.favourites).toContain(r.id);
  expect(text).not.toContain('mise:timers');
 });
 it('rejects unknown schema, truncated JSON, excessive content and forged recipe values',()=>{
  expect(()=>validateCookbookBackup('{}')).toThrow(/format or version/);
  expect(()=>validateCookbookBackup('{')).toThrow(/not valid JSON/);
  expect(()=>validateCookbookBackup('x'.repeat(950_001))).toThrow(/950 KB/);
  const obj=JSON.parse(serializeCookbookBackup());
  obj.recipes=[{id:'personal-fake',name:'Fake',minutes:-1,servings:2,ingredients:[],steps:[]}];
  expect(()=>validateCookbookBackup(JSON.stringify(obj))).toThrow(/invalid recipe/);
 });
 it('refuses duplicates, invalid collection references, and a tampered version',()=>{
  const recipe=mk('Demo');savePersonalRecipe(recipe);
  const obj=JSON.parse(serializeCookbookBackup());
  obj.recipes.push(obj.recipes[0]);
  expect(()=>validateCookbookBackup(JSON.stringify(obj))).toThrow(/duplicate recipe IDs/);
  obj.recipes.pop();obj.collections=[{id:'collection-1',name:'Family',recipeIds:['personal-missing']}];
  expect(()=>validateCookbookBackup(JSON.stringify(obj))).toThrow(/missing recipes/);
  obj.collections=[];obj.version=2;
  expect(()=>validateCookbookBackup(JSON.stringify(obj))).toThrow(/version/);
 });
 it('merges new recipes without replacing same-id conflicting data',()=>{
  const original=mk('One');savePersonalRecipe(original);
  const snapshot=serializeCookbookBackup();
  const alternate=mk('Two');savePersonalRecipe(alternate);
  const plan=previewCookbookRestore(snapshot,'merge');
  expect(plan.duplicate).toBe(1);expect(plan.added).toBe(0);
  expect(plan.recipes).toHaveLength(2);
  applyCookbookRestore(plan);
  expect(loadPersonalRecipes()).toHaveLength(2);
 });
 it('restores a file to an otherwise empty browser',()=>{
  const r=mk('Private meal');savePersonalRecipe(r);
  createCollection('Weekend');setRecipeSaved(r.id,true);
  const backup=serializeCookbookBackup();
  vi.stubGlobal('localStorage',memory());
  const plan=previewCookbookRestore(backup,'merge');
  expect(plan.added).toBe(1);
  applyCookbookRestore(plan);
  expect(loadPersonalRecipes()[0].name).toBe('Private meal');
  expect(loadCollections()[0].name).toBe('Weekend');
  expect(savedRecipeIds()).toContain(r.id);
 });
 it('replaces personal cookbook but does not delete built-in shopping entries',()=>{
  const first=mk('First');savePersonalRecipe(first);
  const backup=serializeCookbookBackup();
  const second=mk('Second');savePersonalRecipe(second);
  const plan=previewCookbookRestore(backup,'replace');
  expect(plan.replaced).toBe(2);
  applyCookbookRestore(plan);
  expect(loadPersonalRecipes().map(r=>r.name)).toEqual(['First']);
 });
 it('rejects restore if local cookbook changed after review',()=>{
  const file=serializeCookbookBackup();
  const plan=previewCookbookRestore(file,'merge');
  savePersonalRecipe(mk('Changed meanwhile'));
  expect(()=>applyCookbookRestore(plan)).toThrow(/changed since/);
 });
 it('rolls back cookbook keys if quota fails during second write',()=>{
  const first=mk('Old');savePersonalRecipe(first);const backup=serializeCookbookBackup();
  const second=mk('New');savePersonalRecipe(second);
  const storage=localStorage;let failing=true;
  vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.getItem(k),removeItem:(k:string)=>storage.removeItem(k),setItem:(k:string,v:string)=>{if(failing && k==='mise:collections:v1'){failing=false;throw new Error('quota');}storage.setItem(k,v);}});
  const plan=previewCookbookRestore(backup,'replace');
  expect(()=>applyCookbookRestore(plan)).toThrow(/previous cookbook was restored/);
  expect(loadPersonalRecipes()).toHaveLength(2);
 });
});