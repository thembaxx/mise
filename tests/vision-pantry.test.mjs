import { test } from 'vitest';
import assert from 'node:assert/strict';
import { ingredientTokens, suggestIngredientsFromText, rankRecipes } from '../public/vision/pantry-match.js';

const recipes=[
 {id:'ramen',name:'Ramen',ingredients:['Mixed mushrooms','Ramen noodles','Garlic cloves','White miso paste']},
 {id:'pie',name:'Spinach pie',ingredients:['Fresh spinach','Feta cheese','Filo pastry sheets']}
];
test('normalizes common ingredient variants and ignores generic modifiers',()=>{
 assert.deepEqual(ingredientTokens('Ripe tomatoes, aubergines, CHILLIES'),['tomato','eggplant','chili']);
});
test('ranks only user-confirmed ingredient matches',()=>{
 const results=rankRecipes('mushrooms, ramen noodles, garlic',recipes);
 assert.equal(results[0].id,'ramen');
 assert.equal(results[0].matched.length,3);
 assert.equal(results[0].missing.length,1);
 assert.deepEqual(rankRecipes('',recipes),[]);
});
test('presents visual suggestions but does not invent unseen ingredients',()=>{
 assert.deepEqual(suggestIngredientsFromText('A bowl with mushrooms and spinach',recipes),['mushroom','spinach']);
 assert.deepEqual(suggestIngredientsFromText('A bowl with bell peppers',[{ingredients:['Bell pepper']}]),['pepper']);
});
