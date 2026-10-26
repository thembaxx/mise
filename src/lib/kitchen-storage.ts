import type { Recipe } from '../data/recipes';
import { initialKitchenProgress, type KitchenProgress } from './cooking';

export interface ShoppingItem {
  id: string;
  recipeId: string;
  recipeName: string;
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
}
export interface KitchenSnapshot {
  stepIndex: number;
  added: string[];
  heat: number;
  servings: number;
  progress: KitchenProgress;
}

const shoppingKey = 'mise:shopping:v1';
const progressKey = (recipeId: string) => 'mise:progress:v1:' + recipeId;
const clamp = (value: unknown, minimum: number, maximum: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : fallback;
const nonNegativeInt = (value: unknown, max: number) => Math.floor(clamp(value, 0, max, 0));

function read(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return null; }
}
function write(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}
export const recipePath = (id: string) => '/recipes/' + encodeURIComponent(id) + '/';
export const recipeUrl = (id: string, origin = 'https://mise-two-teal.vercel.app') => origin + recipePath(id);

export function getShoppingItems(): ShoppingItem[] {
  const stored = read(shoppingKey);
  if (!Array.isArray(stored)) return [];
  return stored.filter((item): item is ShoppingItem =>
    !!item && typeof item.id === 'string' && typeof item.recipeId === 'string' &&
    typeof item.recipeName === 'string' && typeof item.name === 'string' &&
    typeof item.amount === 'number' && Number.isFinite(item.amount) &&
    typeof item.unit === 'string' && typeof item.checked === 'boolean').slice(0, 400);
}
export function saveShoppingItems(items: ShoppingItem[]): boolean {
  const changed = write(shoppingKey, items.slice(0, 400));
  if (changed && typeof window !== 'undefined') window.dispatchEvent(new Event('mise:shopping:changed'));
  return changed;
}
export function addRecipeToShoppingList(recipe: Recipe, servings = recipe.servings): number {
  const previous = getShoppingItems();
  const existing = new Set(previous.map(item => item.id));
  const entries = recipe.ingredients.filter(item => !existing.has(recipe.id + ':' + item.id)).map(item => ({
    id: recipe.id + ':' + item.id, recipeId: recipe.id, recipeName: recipe.name,
    name: item.name, amount: Math.round(item.amount * clamp(servings, 1, 12, recipe.servings) / recipe.servings * 100) / 100,
    unit: item.unit, checked: false,
  }));
  return saveShoppingItems([...previous, ...entries]) ? entries.length : -1;
}

export function loadKitchenSnapshot(recipe: Recipe): KitchenSnapshot {
  const raw = read(progressKey(recipe.id));
  const fallback: KitchenSnapshot = {
    stepIndex: 0, added: [], heat: .35, servings: recipe.servings, progress: initialKitchenProgress(),
  };
  if (!raw || typeof raw !== 'object') return fallback;
  const data = raw as Partial<KitchenSnapshot>;
  const ids = new Set(recipe.ingredients.map(item => item.id));
  const progress = data.progress && typeof data.progress === 'object' ? data.progress : fallback.progress;
  return {
    stepIndex: nonNegativeInt(data.stepIndex, recipe.steps.length - 1),
    added: Array.isArray(data.added) ? [...new Set(data.added.filter((id): id is string => typeof id === 'string' && ids.has(id)))] : [],
    heat: clamp(data.heat, 0, 1, .35),
    servings: Math.floor(clamp(data.servings, 1, 12, recipe.servings)),
    progress: {
      chops: nonNegativeInt(progress.chops, 4), pours: nonNegativeInt(progress.pours, 3),
      stirs: nonNegativeInt(progress.stirs, 6), plated: progress.plated === true,
    },
  };
}
export function saveKitchenSnapshot(recipe: Recipe, snapshot: KitchenSnapshot): boolean {
  return write(progressKey(recipe.id), snapshot);
}
export function clearKitchenSnapshot(recipeId: string): void {
  try { localStorage.removeItem(progressKey(recipeId)); } catch { /* storage disabled */ }
}
