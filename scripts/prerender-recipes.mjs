import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import ts from 'typescript';

const origin = 'https://mise-two-teal.vercel.app';
const source = await readFile(resolve('src/data/recipes.ts'),'utf8');
const transpiled = ts.transpileModule(source,{ compilerOptions: { target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext }}).outputText;
const { recipes } = await import('data:text/javascript;base64,'+Buffer.from(transpiled).toString('base64'));
const original = await readFile(resolve('dist/index.html'),'utf8');
const escape = value => String(value).replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeJSON = value => JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
const text = value => escape(value).trim();
const metadata = (html,{title,description,url,image,type='website',robots='index, follow, max-image-preview:large',jsonld})=>{
  const tags=[
    ['<title>[^<]*</title>', '<title>'+text(title)+'</title>'],
    ['<meta name="description" content="[^"]*" />','<meta name="description" content="'+text(description)+'" />'],
    ['<meta name="robots" content="[^"]*" />','<meta name="robots" content="'+robots+'" />'],
    ['<link rel="canonical" href="[^"]*" />','<link rel="canonical" href="'+escape(url)+'" />'],
    ['<meta property="og:type" content="[^"]*" />','<meta property="og:type" content="'+type+'" />'],
    ['<meta property="og:title" content="[^"]*" />','<meta property="og:title" content="'+text(title)+'" />'],
    ['<meta property="og:description" content="[^"]*" />','<meta property="og:description" content="'+text(description)+'" />'],
    ['<meta property="og:url" content="[^"]*" />','<meta property="og:url" content="'+escape(url)+'" />'],
    ['<meta property="og:image" content="[^"]*" />','<meta property="og:image" content="'+escape(image)+'" />'],
    ['<meta property="og:image:secure_url" content="[^"]*" />','<meta property="og:image:secure_url" content="'+escape(image)+'" />'],
    ['<meta name="twitter:title" content="[^"]*" />','<meta name="twitter:title" content="'+text(title)+'" />'],
    ['<meta name="twitter:description" content="[^"]*" />','<meta name="twitter:description" content="'+text(description)+'" />'],
    ['<meta name="twitter:image" content="[^"]*" />','<meta name="twitter:image" content="'+escape(image)+'" />'],
    ['<script type="application/ld\\+json">[\\s\\S]*?</script>','<script type="application/ld+json">'+safeJSON(jsonld)+'</script>'],
  ];
  for(const [pattern,replacement] of tags){const expression=new RegExp(pattern);if(!expression.test(html))throw new Error('Missing expected metadata: '+pattern);html=html.replace(expression,replacement);}
  return html;
};
const duration = minutes=>'PT'+minutes+'M';
const canonical = recipe=>origin+'/recipes/'+recipe.id+'/';
const render = recipe=>{
  const location=canonical(recipe),title=recipe.name+' recipe · Mise';
  const jsonld = {'@context':'https://schema.org','@type':'Recipe',name:recipe.name,image:[recipe.image],description:recipe.story,author:{'@type':'Organization',name:'Mise'},mainEntityOfPage:location,recipeCuisine:recipe.country,recipeYield:recipe.servings+' servings',totalTime:duration(recipe.minutes),keywords:recipe.tags.join(', '),recipeIngredient:recipe.ingredients.map(i=>i.amount+' '+i.unit+' '+i.name),recipeInstructions:recipe.steps.map((step,index)=>({'@type':'HowToStep',name:step.title,text:step.instruction,url:location+'#step-'+(index+1)}))};
  const heading='<a href="/">Mise home</a><p>'+text(recipe.country)+' · '+text(recipe.region)+'</p><h1>'+text(recipe.name)+'</h1><p>'+text(recipe.story)+'</p>';
  const ingredients='<section><h2>Ingredients</h2><ul>'+recipe.ingredients.map(i=>'<li>'+text(i.amount+' '+i.unit+' '+i.name)+'</li>').join('')+'</ul></section>';
  const steps='<section><h2>How to make it</h2><ol>'+recipe.steps.map((s,index)=>'<li id="step-'+(index+1)+'"><h3>'+text(s.title)+'</h3><p>'+text(s.instruction)+'</p><p>Chef’s note: '+text(s.tip)+'</p></li>').join('')+'</ol></section>';
  let html=metadata(original,{title,description:recipe.story,url:location,image:recipe.image,jsonld});
  const shell='<div id="root"><main class="static-recipe-content"><article>'+heading+ingredients+steps+'</article></main></div>';
  const root = /<div id="root"><div class="mise-boot"[\s\S]*?<\/div><\/div>/;
  if(!root.test(html))throw new Error('Root not found');
  return html.replace(root,shell);
};
for(const recipe of recipes){
  const directory=resolve('dist/recipes',recipe.id);
  await mkdir(directory,{recursive:true});
  await writeFile(join(directory,'index.html'),render(recipe));
}
const shopping=metadata(original,{title:'My shopping list · Mise',description:'Manage your Mise shopping list on this device.',url:origin+'/shopping/',image:origin+'/og-mise.png',robots:'noindex, follow',jsonld:{'@context':'https://schema.org','@type':'WebPage',name:'My shopping list',url:origin+'/shopping/'}});
await mkdir(resolve('dist/shopping'),{recursive:true});
await writeFile(resolve('dist/shopping/index.html'),shopping);
const urls=[origin+'/',...recipes.map(canonical)];
await writeFile(resolve('dist/sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(url=>'  <url><loc>'+escape(url)+'</loc></url>').join('\n')+'\n</urlset>\n');
console.log('Prerendered '+recipes.length+' crawlable recipe pages and '+urls.length+' sitemap URLs.');
