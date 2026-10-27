import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';

const origin = 'https://mise-two-teal.vercel.app';
const source = await readFile(resolve('src/data/recipes.ts'),'utf8');
const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {recipes} = await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const errors = [];
const check=(condition,message)=>{if(!condition)errors.push(message)};
const text=(filename)=>readFile(resolve('dist',filename),'utf8');

const sitemap=await text('sitemap.xml');
const xmlLocations=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
const expected=[origin+'/',...recipes.map(recipe=>origin+'/recipes/'+recipe.id+'/')];
check(xmlLocations.length===expected.length,'Sitemap entry count mismatch');
check(new Set(xmlLocations).size===xmlLocations.length,'Duplicate sitemap entries');
for(const url of expected)check(xmlLocations.includes(url),'Sitemap missing '+url);
check(!xmlLocations.some(url=>url.includes('/shopping/')||url.includes('/cookbook/')||url.includes('/recipes/personal-')),'Device-local pages accidentally indexed');

const routeDirs=await readdir(resolve('dist/recipes'),{withFileTypes:true});
check(routeDirs.filter(entry=>entry.isDirectory()).length===recipes.length,'Number of generated recipe route directories is wrong');
const uniqueNames=new Set();
for(const recipe of recipes){
  const route='recipes/'+recipe.id+'/index.html';
  let html='';
  try{html=await text(route)}catch{check(false,'Missing recipe HTML '+route);continue}
  const canonical=origin+'/recipes/'+recipe.id+'/';
  const title=recipe.name+' recipe · Mise';
  check(html.includes('<h1>'+recipe.name.replace(/&/g,'&amp;')+'</h1>'),'Missing visible recipe heading for '+recipe.id);
  check(html.includes('<h2>Ingredients</h2>'),'Missing visible ingredients for '+recipe.id);
  check(html.includes('<h2>How to make it</h2>'),'Missing visible method for '+recipe.id);
  check(html.includes('<title>'+title.replace(/&/g,'&amp;')+'</title>'),'Missing unique title '+recipe.id);
  check(html.includes('rel="canonical" href="'+canonical+'"'),'Incorrect canonical '+recipe.id);
  check(html.includes('property="og:url" content="'+canonical+'"'),'Incorrect og:url '+recipe.id);
  check(!html.includes('name="robots" content="noindex'),'Public page accidentally noindex '+recipe.id);
  check(html.includes('src="/assets/') && html.includes('/brand/mise-mark.svg'),'Missing client bundle or brand on '+recipe.id);
  const scripts=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  check(scripts.length===1,'Expected one JSON-LD script '+recipe.id);
  if(scripts.length){
    try{
      const data=JSON.parse(scripts[0][1]);
      check(data['@context']==='https://schema.org' && data['@type']==='Recipe','Wrong schema type '+recipe.id);
      check(data.name===recipe.name && data.mainEntityOfPage===canonical,'Wrong schema identity '+recipe.id);
      check(data.recipeIngredient?.length===recipe.ingredients.length,'Ingredient count mismatch '+recipe.id);
      check(data.recipeInstructions?.length===recipe.steps.length,'Step count mismatch '+recipe.id);
      check(data.recipeInstructions?.every((step,index)=>step['@type']==='HowToStep'&&step.url===canonical+'#step-'+(index+1)&&step.text===recipe.steps[index].instruction),'Invalid HowToStep '+recipe.id);
      check(data.image?.every(url=>/^https:\/\//.test(url)),'Missing valid image URL '+recipe.id);
      check(data.totalTime==='PT'+recipe.minutes+'M','Wrong duration '+recipe.id);
    }catch(error){check(false,'JSON-LD parse error '+recipe.id+': '+error.message)}
  }
  for(const item of recipe.ingredients)check(html.includes(item.name.replace(/&/g,'&amp;')),'Missing ingredient text '+recipe.id+': '+item.name);
  uniqueNames.add(recipe.name);
}
check(uniqueNames.size===recipes.length,'Duplicate recipe names');
const list=await text('shopping/index.html');
check(list.includes('name="robots" content="noindex, follow"'),'Shopping page not protected from indexing');
check(list.includes('rel="canonical" href="'+origin+'/shopping/"'),'Shopping canonical mismatch');
const cookbook=await text('cookbook/index.html');
check(cookbook.includes('name="robots" content="noindex, nofollow"'),'Personal cookbook not protected from indexing');
check(cookbook.includes('rel="canonical" href="'+origin+'/cookbook/"'),'Personal cookbook canonical mismatch');
check(!cookbook.includes('"@type":"Recipe"'),'Personal recipes must never be embedded into public HTML');
check((await text('index.html')).includes('The world, on your table'),'Home identity missing');
check((await text('sw.js')).includes('precacheAndRoute'),'Missing offline service-worker precache');
if(errors.length){
  for(const error of errors)console.error('VERIFY FAIL:',error);
  throw new Error('Recipe prerender verification failed ('+errors.length+' error(s)).');
}
console.log('Verified '+recipes.length+' unique crawlable recipe documents, JSON-LD, canonical metadata, sitemap, private shopping and cookbook pages, and service worker.');
