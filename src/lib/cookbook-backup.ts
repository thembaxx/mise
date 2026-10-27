import { recipes } from '../data/recipes';
import {
  loadCollections, loadPersonalRecipes, savedRecipeIds, validateStoredRecipe,
  type CookbookCollection, type PersonalRecipe,
} from './personal-cookbook';
import { getShoppingItems, saveShoppingItems } from './kitchen-storage';

export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 1_000_000;
const KEYS = ['mise:personal-recipes:v1','mise:collections:v1','mise:saved'] as const;
const BUILT_IN_IDS = new Set(recipes.map(recipe => recipe.id));

export type CookbookBackup = {
  format: 'mise-cookbook';
  version: 1;
  exportedAt: string;
  recipes: PersonalRecipe[];
  collections: CookbookCollection[];
  favorites: string[];
};
export type RestoreMode = 'merge' | 'replace';
export type RestorePlan = {
  mode: RestoreMode;
  recipes: PersonalRecipe[];
  collections: CookbookCollection[];
  favorites: string[];
  incomingRecipes: number;
  incomingCollections: number;
  addedRecipes: number;
  duplicateRecipes: number;
  conflictingIds: number;
  resultRecipes: number;
  resultCollections: number;
  removedRecipes: number;
  warnings: string[];
};
const fingerprint = (recipe:PersonalRecipe) => JSON.stringify([
  recipe.name.trim().toLowerCase(),
  recipe.ingredients.map(item => [item.name.trim().toLowerCase(),item.amount,item.unit.trim().toLowerCase()]),
  recipe.steps.map(step => step.instruction.trim().toLowerCase()),
]);
const isRecord = (value:unknown):value is Record<string,unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const validPersonalId = (id:unknown):id is string =>
  typeof id === 'string' && /^personal-[a-z0-9-]{5,90}$/i.test(id);
const validCollectionId = (id:unknown):id is string =>
  typeof id === 'string' && /^collection-[a-z0-9-]{5,90}$/i.test(id);
const unique = (items:string[]) => [...new Set(items)];

export function exportCookbook(): string {
  const catalog = new Set([...BUILT_IN_IDS,...loadPersonalRecipes().map(item=>item.id)]);
  const backup:CookbookBackup = {
    format:'mise-cookbook', version:BACKUP_VERSION, exportedAt:new Date().toISOString(),
    recipes:loadPersonalRecipes(),
    collections:loadCollections().map(item=>({...item,recipeIds:item.recipeIds.filter(id=>catalog.has(id))})),
    favorites:savedRecipeIds().filter(id=>catalog.has(id)),
  };
  const json=JSON.stringify(backup,null,2);
  if (new TextEncoder().encode(json).byteLength>MAX_BACKUP_BYTES) throw new Error('Cookbook is too large for a single portable backup.');
  return json;
}
export function parseCookbookBackup(text:string):CookbookBackup {
  if (new TextEncoder().encode(text).byteLength>MAX_BACKUP_BYTES) throw new Error('Backup exceeds the 1 MB limit.');
  let raw:unknown;
  try{raw=JSON.parse(text);}catch{throw new Error('Select a valid Mise JSON backup file.');}
  if (!isRecord(raw) || raw.format!=='mise-cookbook' || raw.version!==BACKUP_VERSION ||
      typeof raw.exportedAt!=='string' || !Number.isFinite(Date.parse(raw.exportedAt)) ||
      !Array.isArray(raw.recipes) || !Array.isArray(raw.collections) || !Array.isArray(raw.favorites))
    throw new Error('Unsupported or malformed cookbook backup. Only version 1 is supported.');
  if(raw.recipes.length>80 || raw.collections.length>30 || raw.favorites.length>200)
    throw new Error('Backup exceeds Mise recipe, collection or favourite limits.');
  const incoming:PersonalRecipe[]=[];
  const known = new Set(BUILT_IN_IDS);
  const recipeIds = new Set<string>();
  for(const value of raw.recipes){
    if (!isRecord(value) || !validPersonalId(value.id) || recipeIds.has(value.id)) throw new Error('Invalid or duplicate personal recipe identifier.');
    const recipe=validateStoredRecipe(value);
    if (!recipe || recipe.name!==value.name || recipe.ingredients.length!==(value.ingredients as unknown[]).length ||
        recipe.steps.length!==(value.steps as unknown[]).length ||
        (value.minutes!==undefined && !Number.isInteger(value.minutes)) ||
        (value.servings!==undefined && !Number.isInteger(value.servings)) ||
        recipe.ingredients.some((item,index)=>{
          const source=(value.ingredients as unknown[])[index];
          return !isRecord(source) || item.id!==source.id || item.name!==source.name ||
            item.unit!==source.unit || item.amount!==source.amount ||
            item.kind!==source.kind;
        }) ||
        recipe.steps.some((item,index)=>{
          const source=(value.steps as unknown[])[index];
          return !isRecord(source) || item.title!==source.title ||
            item.instruction!==source.instruction || item.minutes!==source.minutes || item.tip!==source.tip;
        })) throw new Error('A recipe contains invalid or truncated fields. No changes were made.');
    recipeIds.add(recipe.id);
    known.add(recipe.id);
    incoming.push(recipe);
  }
  const collections:CookbookCollection[]=[];
  const collectionIds=new Set<string>();
  for(const value of raw.collections){
    if (!isRecord(value) || !validCollectionId(value.id) || collectionIds.has(value.id) ||
        typeof value.name!=='string' || !value.name.trim() || value.name.length>70 ||
        !Array.isArray(value.recipeIds) || value.recipeIds.length>160 ||
        value.recipeIds.some((id:unknown)=>typeof id!=='string'||!known.has(id)) ||
        new Set(value.recipeIds).size!==value.recipeIds.length)
      throw new Error('Backup contains an invalid collection or unknown recipe reference.');
    collectionIds.add(value.id);
    collections.push({id:value.id,name:value.name.trim(),recipeIds:[...value.recipeIds] as string[]});
  }
  if(raw.favorites.some((id:unknown)=>typeof id!=='string'||!known.has(id)) ||
     new Set(raw.favorites).size!==raw.favorites.length)
    throw new Error('Backup favourites contain unknown or duplicate recipe references.');
  return {
    format:'mise-cookbook',version:BACKUP_VERSION,exportedAt:raw.exportedAt,
    recipes:incoming,collections,favorites:[...raw.favorites] as string[],
  };
}
export function previewRestore(text:string,mode:RestoreMode):RestorePlan {
  const backup=parseCookbookBackup(text);
  if(mode!=='merge'&&mode!=='replace')throw new Error('Choose a valid restore mode.');
  const previous=loadPersonalRecipes();
  const oldIds=new Set(previous.map(item=>item.id));
  const result=mode==='replace'?[] as PersonalRecipe[]:[...previous];
  const ids=new Set(result.map(item=>item.id));
  const fingerprints=new Map(result.map(item=>[fingerprint(item),item.id]));
  const idMap=new Map<string,string>();
  let duplicates=0,conflicts=0,added=0;
  for(const item of backup.recipes){
    const sameFingerprint=fingerprints.get(fingerprint(item));
    if(sameFingerprint){
      idMap.set(item.id,sameFingerprint);duplicates++;continue;
    }
    if(ids.has(item.id)){
      // Never overwrite a different local recipe during a merge.
      // Resolve to a new personal ID, keeping the imported original unmodified otherwise.
      conflicts++;
      let newId='personal-'+crypto.randomUUID();
      while(ids.has(newId))newId='personal-'+crypto.randomUUID();
      const copy={...item,id:newId};
      result.push(copy);ids.add(newId);fingerprints.set(fingerprint(copy),newId);idMap.set(item.id,newId);added++;
    }else{
      result.push(item);ids.add(item.id);fingerprints.set(fingerprint(item),item.id);idMap.set(item.id,item.id);added++;
    }
  }
  if(result.length>80) throw new Error('Restore would exceed 80 recipes. Remove some recipes first.');
  const currentCollections=mode==='replace'?[]:loadCollections();
  const resultCollections:CookbookCollection[]=currentCollections.map(item=>({...item,recipeIds:[...item.recipeIds]}));
  const names=new Map(resultCollections.map((item,index)=>[item.name.toLowerCase(),index]));
  const collectionIds=new Set(resultCollections.map(item=>item.id));
  const validIds=new Set([...BUILT_IN_IDS,...result.map(item=>item.id)]);
  for(const item of backup.collections){
    const mapped=unique(item.recipeIds.map(id=>idMap.get(id)||id).filter(id=>validIds.has(id)));
    const index=names.get(item.name.toLowerCase());
    if(index!==undefined) resultCollections[index].recipeIds=unique([...resultCollections[index].recipeIds,...mapped]);
    else{
      const id=collectionIds.has(item.id)?'collection-'+crypto.randomUUID():item.id;
      collectionIds.add(id);names.set(item.name.toLowerCase(),resultCollections.length);
      resultCollections.push({...item,id,recipeIds:mapped});
    }
  }
  if(resultCollections.length>30)throw new Error('Restore would exceed 30 collections.');
  const favorites=unique([
    ...(mode==='merge'?savedRecipeIds():[]),
    ...backup.favorites.map(id=>idMap.get(id)||id),
  ]).filter(id=>validIds.has(id));
  if(favorites.length>200)throw new Error('Restore would exceed 200 favourites.');
  for(const [key,value] of [[KEYS[0],result],[KEYS[1],resultCollections],[KEYS[2],favorites]] as const){
    if(JSON.stringify(value).length>=800_000)throw new Error('Restore would exceed device storage capacity for '+key+'.');
  }
  const removed=mode==='replace'?[...oldIds].filter(id=>!result.some(item=>item.id===id)).length:0;
  return {
    mode,recipes:result,collections:resultCollections,favorites,
    incomingRecipes:backup.recipes.length,incomingCollections:backup.collections.length,
    addedRecipes:added,duplicateRecipes:duplicates,conflictingIds:conflicts,
    resultRecipes:result.length,resultCollections:resultCollections.length,removedRecipes:removed,
    warnings:[mode==='replace'?'Replace removes local cookbook recipes, collections and favourites not present in this backup.':'Merge keeps existing recipes, combines collections and skips identical dishes.',
      'Shopping lists, kitchen progress and timers are not included in backups. Keep a copy of the file somewhere safe.'],
  };
}
export function applyRestore(text:string,mode:RestoreMode):RestorePlan {
  // Revalidate immediately before writing; never trust a stale UI preview.
  const plan=previewRestore(text,mode);
  const values=[plan.recipes,plan.collections,plan.favorites];
  const previous=KEYS.map(key=>localStorage.getItem(key));
  try{
    for(let i=0;i<KEYS.length;i++)localStorage.setItem(KEYS[i],JSON.stringify(values[i]));
  }catch{
    for(let i=0;i<KEYS.length;i++){
      try{if(previous[i]===null)localStorage.removeItem(KEYS[i]);else localStorage.setItem(KEYS[i],previous[i]!);}catch{/* Browser storage can fail; report below. */}
    }
    throw new Error('Device storage failed during restore. Previously saved data was restored where possible.');
  }
  if(mode==='replace'){
    const remaining=new Set(plan.recipes.map(item=>item.id));
    try{
      const before=previous[0] ? JSON.parse(previous[0]) as PersonalRecipe[] : [];
      for(const item of before){
        const replacement=plan.recipes.find(recipe=>recipe.id===item.id);
        if(!replacement||fingerprint(replacement)!==fingerprint(item)){
          for(const prefix of ['mise:prep:v1:','mise:progress:v1:','mise:timers:v1:'])localStorage.removeItem(prefix+item.id);
        }
      }
    }catch{/* Nonessential prior per-recipe data cleanup. */}
    let updatedIds=new Set<string>();
    try{
      const before=previous[0] ? JSON.parse(previous[0]) as PersonalRecipe[] : [];
      updatedIds=new Set(before.filter(old=>{
        const replacement=plan.recipes.find(recipe=>recipe.id===old.id);
        return !replacement||fingerprint(replacement)!==fingerprint(old);
      }).map(old=>old.id));
    }catch{/* Invalid previous local data must not affect a validated restore. */}
    saveShoppingItems(getShoppingItems().filter(item=>!updatedIds.has(item.recipeId)&&(!item.recipeId.startsWith('personal-')||remaining.has(item.recipeId))));
  }
  if(typeof window!=='undefined')window.dispatchEvent(new Event('mise:cookbook:updated'));
  return plan;
}
