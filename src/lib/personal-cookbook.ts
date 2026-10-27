import { recipes, type Ingredient, type IngredientKind, type Recipe, type RecipeStep, type Region } from '../data/recipes';
import { getShoppingItems, saveShoppingItems } from './kitchen-storage';

const RECIPE_KEY = 'mise:personal-recipes:v1';
const COLLECTION_KEY = 'mise:collections:v1';
const FAVORITES_KEY = 'mise:saved';
const MAX_RECIPES = 80;
const MAX_COLLECTIONS = 30;
const MAX_CONTENT = 800_000;
const imageFallback = '/brand/mise-social.svg';
const kinds: IngredientKind[] = ['tomato','lemon','carrot','mushroom','onion','chili','garlic','herb','eggplant','lime'];
const regions: Region[] = ['Asia','Europe','Africa','Americas','Middle East','Personal'];

export type PersonalRecipe = Recipe & { sourceUrl?: string };
export type CookbookCollection = { id: string; name: string; recipeIds: string[] };
export type RecipeDraft = {
  id?: string;
  name: string;
  subtitle?: string;
  story?: string;
  minutes: number;
  servings: number;
  region?: Region;
  country?: string;
  ingredients: string;
  steps: string;
  sourceUrl?: string;
};

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw && raw.length < MAX_CONTENT ? JSON.parse(raw) : null;
  } catch { return null; }
}
function write(key: string, value: unknown): boolean {
  try {
    const raw = JSON.stringify(value);
    if (raw.length > MAX_CONTENT) return false;
    localStorage.setItem(key, raw);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('mise:cookbook:updated'));
    return true;
  } catch { return false; }
}
const str = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const finite = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const uuid = () => 'personal-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
const allowedUrl = (value: unknown) => {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' && !url.username && !url.password && !/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname) && !url.hostname.endsWith('.local') ? url.href : '';
  } catch { return ''; }
};
export const isPersonalRecipe = (id: string) => id.startsWith('personal-');
export const savedRecipeIds = (): string[] => {
  const value = read(FAVORITES_KEY);
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length < 110))].slice(0,200) : [];
};
export const setRecipeSaved = (id: string, enabled: boolean): boolean => {
  const previous = savedRecipeIds();
  const next = enabled ? [...new Set([...previous,id])] : previous.filter(value => value !== id);
  return write(FAVORITES_KEY,next);
};

export function validateStoredRecipe(value: unknown): PersonalRecipe | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<PersonalRecipe>;
  if (!isPersonalRecipe(str(row.id,90)) || !str(row.name,120) ||
      !finite(row.minutes,1,720) || !finite(row.servings,1,12) ||
      !Array.isArray(row.ingredients) || !Array.isArray(row.steps) ||
      row.ingredients.length < 1 || row.ingredients.length > 60 || row.steps.length < 1 || row.steps.length > 40) return null;
  const ingredients: Ingredient[] = [];
  for (const raw of row.ingredients) {
    if (!raw || typeof raw !== 'object' || !str(raw.id,90) || !str(raw.name,160) ||
        !finite(raw.amount,0.001,100_000) || !str(raw.unit,30) ||
        !kinds.includes(raw.kind)) return null;
    ingredients.push({id:str(raw.id,90),name:str(raw.name,160),amount:raw.amount,unit:str(raw.unit,30),kind:raw.kind});
  }
  const steps: RecipeStep[] = [];
  for (const raw of row.steps) {
    if (!raw || !str(raw.title,120) || !str(raw.instruction,1300) || !finite(raw.minutes,0,180)) return null;
    steps.push({title:str(raw.title,120),instruction:str(raw.instruction,1300),minutes:raw.minutes,tip:str(raw.tip,350)});
  }
  if (new Set(ingredients.map(item => item.id)).size !== ingredients.length) return null;
  return {
    id:row.id!,name:str(row.name,120),subtitle:str(row.subtitle,130) || 'From my own kitchen',
    country:str(row.country,80) || 'My kitchen',region:regions.includes(row.region!) ? row.region! : 'Personal',
    minutes:row.minutes!,difficulty:row.difficulty === 'Medium' || row.difficulty === 'A little project' ? row.difficulty : 'Easy',
    servings:row.servings!,image:allowedUrl(row.image) || imageFallback,
    accent:/^#[\da-fA-F]{6}$/.test(row.accent || '') ? row.accent! : '#dcebb2',
    tags:Array.isArray(row.tags) ? row.tags.filter((tag):tag is string => typeof tag === 'string').slice(0,10).map(tag => tag.slice(0,40)) : ['Personal'],
    story:str(row.story,1400),ingredients,steps,sourceUrl:allowedUrl(row.sourceUrl),
  };
}
export const loadPersonalRecipes = (): PersonalRecipe[] => {
  const raw = read(RECIPE_KEY);
  return Array.isArray(raw) ? raw.slice(0,MAX_RECIPES).map(validateStoredRecipe).filter((recipe):recipe is PersonalRecipe => recipe !== null) : [];
};
export const allRecipes = (): Recipe[] => [...recipes,...loadPersonalRecipes()];
export const findRecipe = (id: string | null | undefined): Recipe | undefined => id ? allRecipes().find(recipe => recipe.id === id) : undefined;

export function savePersonalRecipe(recipe: PersonalRecipe): boolean {
  const validated = validateStoredRecipe(recipe);
  if (!validated) return false;
  const current = loadPersonalRecipes();
  const existing = current.findIndex(item => item.id === validated.id);
  if (existing === -1 && current.length >= MAX_RECIPES) return false;
  const former = existing >= 0 ? current[existing] : undefined;
  const contentChanged = former && (JSON.stringify(former.ingredients) !== JSON.stringify(validated.ingredients) || JSON.stringify(former.steps) !== JSON.stringify(validated.steps));
  if (existing >= 0) current[existing] = validated;
  else current.push(validated);
  if (!write(RECIPE_KEY,current)) return false;
  if (contentChanged) clearCookingState(validated.id);
  // Keep shopping labels accurate when the user renames an unchanged recipe.
  if (former && former.name !== validated.name && !contentChanged) {
    saveShoppingItems(getShoppingItems().map(item => item.recipeId === validated.id ? {...item,recipeName:validated.name} : item));
  }
  return true;
}
function clearCookingState(id: string): void {
  try { for (const prefix of ['mise:progress:v1:','mise:prep:v1:','mise:timers:v1:']) localStorage.removeItem(prefix+id); } catch { /* optional device storage */ }
  saveShoppingItems(getShoppingItems().filter(item => item.recipeId !== id));
}
export function deletePersonalRecipe(id: string): boolean {
  if (!isPersonalRecipe(id)) return false;
  if (!write(RECIPE_KEY,loadPersonalRecipes().filter(item => item.id !== id))) return false;
  clearCookingState(id);
  setRecipeSaved(id,false);
  const collections = loadCollections().map(item => ({...item,recipeIds:item.recipeIds.filter(value => value !== id)}));
  write(COLLECTION_KEY,collections);
  return true;
}
export function loadCollections(): CookbookCollection[] {
  const raw = read(COLLECTION_KEY);
  if (!Array.isArray(raw)) return [];
  const ids = new Set(allRecipes().map(recipe => recipe.id));
  return raw.slice(0,MAX_COLLECTIONS).filter((item):item is CookbookCollection =>
    Boolean(item && typeof item.id === 'string' && typeof item.name === 'string' && Array.isArray(item.recipeIds)))
    .map(item => ({id:str(item.id,100),name:str(item.name,70),recipeIds:[...new Set(item.recipeIds.filter((id):id is string => typeof id === 'string' && ids.has(id)))].slice(0,160)}));
}
export function createCollection(name: string): boolean {
  if (!name.trim() || name.trim().length > 70) return false;
  const list = loadCollections();
  if (list.length >= MAX_COLLECTIONS) return false;
  return write(COLLECTION_KEY,[...list,{id:'collection-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7),name:name.trim(),recipeIds:[]}]);
}
export const deleteCollection = (id: string) => write(COLLECTION_KEY,loadCollections().filter(item => item.id !== id));
export function toggleInCollection(id: string,recipeId: string): boolean {
  if (!findRecipe(recipeId)) return false;
  return write(COLLECTION_KEY,loadCollections().map(item => item.id !== id ? item : ({
    ...item,recipeIds:item.recipeIds.includes(recipeId) ? item.recipeIds.filter(value => value !== recipeId) : [...item.recipeIds,recipeId],
  })));
}

export function parseIngredient(line: string, index: number): Ingredient {
  const clean = line.replace(/^\s*[-•*]\s*/,'').trim();
  if (!clean || clean.length > 180) throw new Error('Each ingredient needs a name of at most 180 characters.');
  // A quantity is never guessed from descriptive text. Unknown measurements stay as "item".
  const match = /^(\d+(?:[.,]\d+)?|\d+\/\d+)\s+([a-zA-Z]+)\s+(.+)$/.exec(clean);
  let amount = 1, unit = 'item', name = clean;
  if (match) {
    const quantity = match[1].includes('/') ? Number(match[1].split('/')[0]) / Number(match[1].split('/')[1]) : Number(match[1].replace(',','.'));
    if (!finite(quantity,0.001,100_000)) throw new Error('Ingredient quantities must be positive and reasonable.');
    amount = quantity; unit = match[2].slice(0,30); name = match[3];
  } else {
    const count = /^(\d+(?:[.,]\d+)?)\s+(.+)$/.exec(clean);
    if (count) {
      const quantity = Number(count[1].replace(',','.'));
      if (!finite(quantity,0.001,100_000)) throw new Error('Ingredient quantities must be positive and reasonable.');
      amount = quantity; name = count[2];
    }
  }
  const kind: IngredientKind = /tomato/i.test(name) ? 'tomato' : /onion|shallot/i.test(name) ? 'onion'
    : /garlic/i.test(name) ? 'garlic' : /mushroom/i.test(name) ? 'mushroom' : /carrot/i.test(name) ? 'carrot'
    : /lime/i.test(name) ? 'lime' : /lemon/i.test(name) ? 'lemon' : /chill?i|pepper/i.test(name) ? 'chili'
    : /eggplant|aubergine/i.test(name) ? 'eggplant' : 'herb';
  return {id:'ingredient-'+(index+1),name:name.slice(0,160),amount,unit,kind};
}
export function draftToRecipe(input: RecipeDraft): PersonalRecipe {
  const name = input.name.trim();
  const ingredientLines = input.ingredients.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const stepLines = input.steps.split(/\r?\n/).map(s => s.trim().replace(/^\s*\d+[.)]\s*/, '')).filter(Boolean);
  if (name.length < 2 || name.length > 120) throw new Error('Enter a recipe name (2–120 characters).');
  if (!finite(input.minutes,1,720) || !Number.isInteger(input.minutes)) throw new Error('Cooking time must be 1–720 whole minutes.');
  if (!finite(input.servings,1,12) || !Number.isInteger(input.servings)) throw new Error('Servings must be 1–12.');
  if (ingredientLines.length < 1 || ingredientLines.length > 60 || stepLines.length < 1 || stepLines.length > 40) throw new Error('Add 1–60 ingredients and 1–40 steps, one per line.');
  if (stepLines.some(line => line.length > 1300)) throw new Error('Keep each step under 1,300 characters.');
  const ingredients = ingredientLines.map(parseIngredient);
  const steps = stepLines.map((instruction,index) => ({title:'Step '+(index+1),instruction,minutes:Math.max(0,Math.min(180,Math.round(input.minutes / stepLines.length))),tip:''}));
  const current = input.id ? loadPersonalRecipes().find(recipe => recipe.id === input.id) : undefined;
  const candidate: PersonalRecipe = {
    id:current?.id || uuid(),name,subtitle:str(input.subtitle,130) || 'From my own kitchen',
    country:str(input.country,80) || 'My kitchen',
    region:regions.includes(input.region!) ? input.region! : 'Personal',
    minutes:input.minutes,difficulty:current?.difficulty || 'Easy',servings:input.servings,
    image:current?.image || imageFallback,accent:current?.accent || '#dcebb2',tags:current?.tags || ['Personal'],
    story:str(input.story,1400) || 'A recipe from my personal cookbook.',ingredients,steps,sourceUrl:allowedUrl(input.sourceUrl) || current?.sourceUrl,
  };
  const validated = validateStoredRecipe(candidate);
  if (!validated) throw new Error('The recipe could not be validated.');
  return validated;
}
export const recipeToDraft = (recipe: Recipe): RecipeDraft => ({
  id:recipe.id,name:recipe.name,subtitle:recipe.subtitle,story:recipe.story,
  minutes:recipe.minutes,servings:recipe.servings,region:recipe.region,country:recipe.country,
  ingredients:recipe.ingredients.map(item => item.amount+' '+item.unit+' '+item.name).join('\n'),
  steps:recipe.steps.map(item => item.instruction).join('\n'),sourceUrl:('sourceUrl' in recipe ? String(recipe.sourceUrl || '') : ''),
});

function textValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && typeof (value as {text?:unknown}).text === 'string') return String((value as {text:string}).text).trim();
  return '';
}
function isoMinutes(value: unknown): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?/i.exec(str(value,70));
  return match ? Number(match[1] || 0)*60+Number(match[2] || 0) : 0;
}
function findSchema(value: unknown): Record<string,unknown> | null {
  if (Array.isArray(value)) {for (const item of value) {const recipe=findSchema(item);if (recipe) return recipe;} return null;}
  if (!value || typeof value !== 'object') return null;
  const obj=value as Record<string,unknown>;
  const type=obj['@type'];
  if (type === 'Recipe' || Array.isArray(type) && type.includes('Recipe')) return obj;
  return findSchema(obj['@graph']);
}
export function importRecipeContent(content: string, sourceUrl = ''): RecipeDraft {
  if (!content || content.length > 500_000) throw new Error('Recipe content is empty or too large (limit 500 KB).');
  let data: unknown = null;
  const trimmed=content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {data=JSON.parse(trimmed);} catch { /* plain text may contain braces */ }
  } else {
    const script=/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    while ((match=script.exec(content))) {
      try { const candidate=JSON.parse(match[1]); if(findSchema(candidate)){data=candidate;break;} } catch { /* ignore invalid block */ }
    }
  }
  const schema=findSchema(data);
  if (schema) {
    const ingredients=Array.isArray(schema.recipeIngredient) ? schema.recipeIngredient.map(textValue).filter(Boolean) : [];
    const instructions=Array.isArray(schema.recipeInstructions)
      ? schema.recipeInstructions.map(textValue).filter(Boolean)
      : [textValue(schema.recipeInstructions)].filter(Boolean);
    const name=textValue(schema.name);
    if (!name || !ingredients.length || !instructions.length) throw new Error('Recipe schema is missing a name, ingredients or instructions.');
    const minutes=isoMinutes(schema.totalTime) || isoMinutes(schema.cookTime) + isoMinutes(schema.prepTime) || 30;
    const yieldValue=Array.isArray(schema.recipeYield)?schema.recipeYield[0]:schema.recipeYield;
    const servings = Number.parseInt(String(yieldValue ?? '2'),10);
    return {name,minutes:Math.min(720,Math.max(1,minutes)),servings:Number.isFinite(servings)?Math.min(12,Math.max(1,servings)):2,
      ingredients:ingredients.join('\n'),steps:instructions.join('\n'),
      story:textValue(schema.description).slice(0,1400),sourceUrl:allowedUrl(sourceUrl)};
  }
  // Plain text template: title, "Ingredients", ingredient lines, "Instructions"/"Method", step lines.
  const lines=content.replace(/<[^>]+>/g,' ').split(/\r?\n/).map(value=>value.trim()).filter(Boolean);
  const start=lines.findIndex(line=>/^ingredients?\s*:?\s*$/i.test(line));
  const middle=lines.findIndex((line,index)=>index>start && /^(instructions?|directions?|method|steps?)\s*:?\s*$/i.test(line));
  if (start<1 || middle<=start+1 || middle===lines.length-1) throw new Error('Paste Recipe JSON-LD, a supported recipe page, or text with Ingredients and Instructions headings.');
  return {name:lines[0].slice(0,120),minutes:30,servings:2,
    ingredients:lines.slice(start+1,middle).join('\n'),steps:lines.slice(middle+1).join('\n'),sourceUrl:allowedUrl(sourceUrl)};
}
export async function importRecipeUrl(value: string): Promise<RecipeDraft> {
  const url=allowedUrl(value);
  if (!url) throw new Error('Enter a public HTTPS recipe URL. Private-network addresses are unsupported.');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try {
    const response=await fetch(url,{credentials:'omit',redirect:'error',signal:controller.signal,headers:{Accept:'text/html, application/ld+json'}});
    if (!response.ok) throw new Error('The recipe page did not respond successfully.');
    const contentType=response.headers.get('content-type') || '';
    if (!/text\/html|application\/ld\+json|application\/json/.test(contentType)) throw new Error('This URL did not return a supported recipe page.');
    const content=await response.text();
    return importRecipeContent(content,url);
  } catch (error) {
    if (error instanceof TypeError || (error as Error)?.name==='AbortError')
      throw new Error('The website blocked browser import or timed out. Copy its recipe text or JSON-LD into the paste field instead.');
    throw error;
  } finally {clearTimeout(timeout);}
}
