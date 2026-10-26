import { describe, expect, it } from 'vitest';
import { recipes, regions } from '../src/data/recipes';

describe('curated global recipe catalog', () => {
  it('provides recipes from multiple regions', () => {
    expect(recipes.length).toBeGreaterThanOrEqual(8);
    expect(new Set(recipes.map(recipe => recipe.region)).size).toBeGreaterThanOrEqual(4);
  });

  it('has no duplicated recipe or ingredient identifiers', () => {
    expect(new Set(recipes.map(recipe => recipe.id)).size).toBe(recipes.length);
    for (const recipe of recipes) {
      expect(new Set(recipe.ingredients.map(item => item.id)).size).toBe(recipe.ingredients.length);
    }
  });

  it('includes complete, usable cooking steps', () => {
    for (const recipe of recipes) {
      expect(recipe.name.trim()).not.toBe('');
      expect(recipe.country.trim()).not.toBe('');
      expect(recipe.story.trim().length).toBeGreaterThan(50);
      expect(recipe.ingredients.length).toBeGreaterThanOrEqual(5);
      expect(recipe.steps.length).toBeGreaterThanOrEqual(4);
      expect(recipe.servings).toBeGreaterThan(0);
      expect(recipe.minutes).toBeGreaterThan(0);
      expect(regions).toContain(recipe.region);
      for (const step of recipe.steps) {
        expect(step.title.trim()).not.toBe('');
        expect(step.instruction.trim().length).toBeGreaterThan(35);
        expect(step.tip.trim()).not.toBe('');
        expect(step.minutes).toBeGreaterThan(0);
      }
    }
  });

  it('maps every 3D ingredient to a supported primitive', () => {
    const supported = new Set(['tomato', 'lemon', 'carrot', 'mushroom', 'onion', 'chili', 'garlic', 'herb', 'eggplant', 'lime']);
    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        expect(supported.has(ingredient.kind)).toBe(true);
        expect(ingredient.amount).toBeGreaterThan(0);
      }
    }
  });
});
