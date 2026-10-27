import { recipes, type Recipe } from '../data/recipes';
import {
  loadPersonalRecipes, loadCollections, savedRecipeIds,
  validateStoredRecipe, type PersonalRecipe, type CookbookCollection,
} from './personal-cookbook';
import { getShoppingItems, saveShoppingItems } from './kitchen-storage';

export const BACKUP_FORMAT = 'mise-personal-cookbook';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 950_000;
const KEYS = ['mise:personal-recipes:v1', 'mise:collections:v1', 'mise:saved'] as const;
export type RestoreMode = 'merge' | 'replace';
export type CookbookBackup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  recipes: PersonalRecipe[];
  collections: CookbookCollection[];
  favourites: string[];
};
export type RestorePlan = {
  mode: RestoreMode;
  incoming: CookbookBackup;
  recipes: PersonalRecipe[];
  collections: CookbookCollection[];
  favourites: string[];
  added: number;
  duplicate: number;
  conflicting: number;
  collectionAdded: number;
  replaced: number;
  /** Used to catch changes made in another tab between preview and confirmation. */
  baseline: string;
};
const isRecord = (value: unknown): value is Record<string,unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const unique = <T,>(items: T[]) => [...new Set(items)];
const asString = (value:unknown, max:number) => typeof value === 'string' && value.trim().length>0 && value.length<=max;
const safeId = (id:string) => /^[a-z0-9-]{1,110}$/.test(id);
const fingerprint = (recipe: Recipe) => JSON.stringify({
  name:recipe.name.trim().toLocaleLowerCase('en-US'),
  ingredients:recipe.ingredients.map(item => [item.name.trim().toLocaleLowerCase('en-US'),item.amount,item.unit]),
  steps:recipe.steps.map(item=>item.instruction.trim().toLocaleLowerCase('en-US')),
});
const localBaseline = (): string => {
  try {return KEYS.map(key => localStorage.getItem(key) || '').join('\u0000');}
  catch {throw new Error('Browser storage is unavailable. Backup restore cannot proceed.');}
};
export function makeCookbookBackup(now:Date = new Date()): CookbookBackup {
  localBaseline(); // Do not misrepresent blocked device storage as an empty backup.
  const personal=loadPersonalRecipes(),known=new Set([...recipes.map(row=>row.id),...personal.map(row=>row.id)]);
  return {format:BACKUP_FORMAT,version:BACKUP_VERSION,exportedAt:now.toISOString(),
    recipes:personal,collections:loadCollections(),favourites:savedRecipeIds().filter(id=>known.has(id))};
}
export function serializeCookbookBackup(): string {
  const json = JSON.stringify(makeCookbookBackup(),null,2);
  if (new TextEncoder().encode(json).length > MAX_BACKUP_BYTES)
    throw new Error('Your cookbook exceeds the current 950 KB export limit.');
  return json;
}
export function validateCookbookBackup(text: string): CookbookBackup {
  if (!text.trim() || new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)
    throw new Error('Choose a nonempty Mise cookbook JSON file smaller than 950 KB.');
  let value:unknown;
  try {value=JSON.parse(text);}catch{throw new Error('The file is not valid JSON.');}
  if (!isRecord(value) || value.format!==BACKUP_FORMAT || value.version!==BACKUP_VERSION ||
    typeof value.exportedAt!=='string' || !Number.isFinite(Date.parse(value.exportedAt)) ||
    !Array.isArray(value.recipes) || !Array.isArray(value.collections) || !Array.isArray(value.favourites))
    throw new Error('Unsupported cookbook format or version. This app accepts Mise v1 backups only.');
  if (value.recipes.length>80 || value.collections.length>30 || value.favourites.length>200)
    throw new Error('Backup exceeds Mise limits (80 recipes, 30 collections, 200 favourites).');
  const parsed: PersonalRecipe[]=[];
  for(const entry of value.recipes){
    if (!isRecord(entry) || !asString(entry.id,90) || !safeId(entry.id as string) || !asString(entry.name,120) ||
      (entry.subtitle!==undefined && typeof entry.subtitle!=='string') ||
      !Array.isArray(entry.ingredients) || !Array.isArray(entry.steps) ||
      entry.ingredients.some(i=>!isRecord(i)||!asString(i.id,90)||!asString(i.name,160)||!asString(i.unit,30)) ||
      entry.steps.some(s=>!isRecord(s)||!asString(s.title,120)||!asString(s.instruction,1300)) ||
      (entry.story!==undefined && (typeof entry.story!=='string'||entry.story.length>1400)) ||
      (entry.sourceUrl!==undefined && typeof entry.sourceUrl!=='string'))
      throw new Error('Backup contains an invalid recipe; no data was changed.');
    const validated=validateStoredRecipe(entry);
    if (!validated) throw new Error('Backup contains a malformed recipe or measurement.');
    parsed.push(validated);
  }
  if (unique(parsed.map(row=>row.id)).length!==parsed.length)
    throw new Error('Backup contains duplicate recipe IDs.');
  const known=new Set([...recipes.map(row=>row.id),...parsed.map(row=>row.id)]);
  const collections:CookbookCollection[]=[];
  for(const entry of value.collections) {
    if (!isRecord(entry) || !asString(entry.id,100) || !safeId(entry.id as string) ||
      !asString(entry.name,70) || !Array.isArray(entry.recipeIds) || entry.recipeIds.length>160 ||
      entry.recipeIds.some(id=>typeof id!=='string' || !safeId(id) || !known.has(id)) ||
      unique(entry.recipeIds).length!==entry.recipeIds.length)
      throw new Error('Backup has an invalid collection or references missing recipes.');
    collections.push({id:entry.id as string,name:(entry.name as string).trim(),recipeIds:entry.recipeIds as string[]});
  }
  if (unique(collections.map(row=>row.id)).length!==collections.length)
    throw new Error('Backup contains duplicate collection IDs.');
  if(value.favourites.some(id=>typeof id!=='string' || !safeId(id) || !known.has(id)) ||
    unique(value.favourites).length!==value.favourites.length)
    throw new Error('Backup has duplicate or missing favourite recipe references.');
  return {format:BACKUP_FORMAT,version:BACKUP_VERSION,exportedAt:value.exportedAt,
    recipes:parsed,collections,favourites:value.favourites as string[]};
}
export function previewCookbookRestore(json:string,mode:RestoreMode): RestorePlan {
  const incoming=validateCookbookBackup(json);
  const existing=loadPersonalRecipes(),currentCollections=loadCollections(),currentFavourites=savedRecipeIds();
  const baseline=localBaseline();
  if(mode==='replace')return {
    mode,incoming,recipes:incoming.recipes,collections:incoming.collections,favourites:incoming.favourites,
    added:incoming.recipes.length,duplicate:0,conflicting:0,
    collectionAdded:incoming.collections.length,replaced:existing.length,baseline,
  };
  const ids=new Set(existing.map(row=>row.id)),contents=new Set(existing.map(fingerprint));
  let duplicate=0,conflicting=0,added=0;
  const merged=[...existing];
  const incomingIds=new Map<string,string>();
  for(const entry of incoming.recipes) {
    if(ids.has(entry.id)){
      const previous=existing.find(row=>row.id===entry.id)!;
      if(fingerprint(previous)===fingerprint(entry)) duplicate++;
      else conflicting++;
      incomingIds.set(entry.id,entry.id);
      continue;
    }
    if(contents.has(fingerprint(entry))){duplicate++;continue;}
    if(merged.length>=80)throw new Error('Merged recipes exceed the 80-recipe limit. Use a smaller file or replace after backing up.');
    ids.add(entry.id);contents.add(fingerprint(entry));merged.push(entry);added++;
    incomingIds.set(entry.id,entry.id);
  }
  const collectionIds=new Set(currentCollections.map(c=>c.id));
  const mergedCollections=[...currentCollections];
  let collectionAdded=0;
  for(const entry of incoming.collections) {
    if(collectionIds.has(entry.id))continue;
    if(mergedCollections.length>=30)throw new Error('Merged collections exceed the 30-collection limit.');
    // Do not bring references to skipped or conflicted incoming recipes.
    mergedCollections.push({...entry,recipeIds:entry.recipeIds.filter(id=>!id.startsWith('personal-')||incomingIds.has(id))});
    collectionIds.add(entry.id);collectionAdded++;
  }
  const known=new Set([...recipes.map(row=>row.id),...merged.map(row=>row.id)]);
  const favourites=unique([...currentFavourites,...incoming.favourites.filter(id=>known.has(id))]);
  if(favourites.length>200)throw new Error('Merged favourites exceed the limit of 200.');
  return {mode,incoming,recipes:merged,collections:mergedCollections,favourites,
    added,duplicate,conflicting,collectionAdded,replaced:0,baseline};
}
export function applyCookbookRestore(plan:RestorePlan): void {
  if(localBaseline()!==plan.baseline) throw new Error('Your cookbook changed since the preview. Review the file again.');
  // Recompute instead of trusting mutable preview arrays; validation remains mandatory.
  const fresh=previewCookbookRestore(JSON.stringify(plan.incoming),plan.mode);
  const next=[JSON.stringify(fresh.recipes),JSON.stringify(fresh.collections),JSON.stringify(fresh.favourites)];
  const previous=KEYS.map(key=>localStorage.getItem(key));
  const beforeRecipes=loadPersonalRecipes();
  try {
    KEYS.forEach((key,index)=>localStorage.setItem(key,next[index]));
  }catch{
    let rollbackFailed=false;
    KEYS.forEach((key,index)=>{try{if(previous[index]===null)localStorage.removeItem(key);else localStorage.setItem(key,previous[index]!);}catch{rollbackFailed=true;}});
    throw new Error(rollbackFailed?'Restore failed and browser storage could not fully roll back. Check existing recipes before retrying.':'Storage is full or blocked. Your previous cookbook was restored.');
  }
  // Never restore running timers, cooking steps, or stale shopping entries from an older backup.
  if(plan.mode==='replace'){
    const incomingIds=new Set(fresh.recipes.map(row=>row.id));
    const incomingById=new Map(fresh.recipes.map(row=>[row.id,row]));
    const changedIds=new Set(beforeRecipes.filter(row=>!incomingIds.has(row.id) || fingerprint(row)!==fingerprint(incomingById.get(row.id)!)).map(row=>row.id));
    // Shopping list is a separate user document. Keep built-in recipes; prune only
    // personal recipe entries absent after replacement.
    saveShoppingItems(getShoppingItems().filter(item=>!item.recipeId.startsWith('personal-') || incomingIds.has(item.recipeId)));
    for(const id of changedIds) for(const prefix of ['mise:progress:v1:','mise:prep:v1:','mise:timers:v1:']) {
      try{localStorage.removeItem(prefix+id);}catch{ /* browser may deny item-specific cleanup */ }
    }
  }
  window.dispatchEvent(new Event('mise:cookbook:updated'));
}
