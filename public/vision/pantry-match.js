// Deterministic, transparent matching of user-confirmed ingredients.
const ignored = new Set(['fresh','mixed','small','large','ripe','chopped','boneless','cooked','plain','extra','virgin','mild','toasted','ground','optional','sheets','pieces','cloves','whole','powder','or','of','and','red','white','green','vegetable','oil','sea','zest','small']);
const alias = {tomatoes:'tomato',tomatos:'tomato',mushrooms:'mushroom',carrots:'carrot',peppers:'pepper',capsicum:'pepper',aubergines:'eggplant',aubergine:'eggplant',eggplants:'eggplant',chillies:'chili',chilies:'chili',chilli:'chili',scallions:'onion',onions:'onion',beans:'bean',garlics:'garlic',limes:'lime',lemons:'lemon',eggs:'egg',tortillas:'tortilla',noodles:'noodle',chickpeas:'chickpea',paprikas:'paprika',coriander:'cilantro',spinach:'spinach',cheeses:'cheese',dill:'dill',basil:'basil',spaghetti:'pasta'};
export function ingredientTokens(text){
  const words = String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z]+/g)||[];
  return [...new Set(words.map(word=>alias[word]||word).filter(word=>word.length>2&&!ignored.has(word)))];
}
function ingredientMatches(ingredient, present){
  const tokens=ingredientTokens(ingredient);
  return tokens.some(word=>present.has(word));
}
export function suggestIngredientsFromText(description,recipes){
  const seen=new Set(),present=new Set(ingredientTokens(description));
  for(const recipe of recipes){
    for(const ingredient of recipe.ingredients){
      for(const token of ingredientTokens(ingredient)){
        if(present.has(token))seen.add(token);
      }
    }
  }
  return [...seen].slice(0,20);
}
export function rankRecipes(confirmedIngredients,recipes){
  const present=new Set(ingredientTokens(confirmedIngredients));
  if(!present.size)return [];
  return recipes.map(recipe=>{
    const matched=recipe.ingredients.filter(name=>ingredientMatches(name,present));
    const missing=recipe.ingredients.filter(name=>!ingredientMatches(name,present));
    return {id:recipe.id,name:recipe.name,matched,missing,coverage:matched.length/recipe.ingredients.length};
  }).filter(recipe=>recipe.matched.length>0).sort((a,b)=>b.matched.length-a.matched.length||b.coverage-a.coverage||a.name.localeCompare(b.name)).slice(0,5);
}
