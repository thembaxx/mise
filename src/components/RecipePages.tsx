import { useEffect, useState } from 'react';
import { ArrowLeft, Check, ClipboardList, Share2, Trash2 } from 'lucide-react';
import { addRecipeToShoppingList, getShoppingItems, recipePath, saveShoppingItems, type ShoppingItem } from '../lib/kitchen-storage';
import { recipes, type Recipe } from '../data/recipes';
import { useNativeApp } from '../pwa/useNativeApp';
import { NativeDialog, NativeHeaderActions, NativeNotices } from './NativeControls';

export function RecipePage({ recipe }: { recipe: Recipe | undefined }) {
  const native = useNativeApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [servings, setServings] = useState(recipe?.servings || 2);
  useEffect(() => { document.title = recipe ? recipe.name + ' recipe · Mise' : 'Recipe not found · Mise'; }, [recipe]);

  if (!recipe) return <main className="recipe-page"><a href="/" className="recipe-back"><ArrowLeft size={18}/> Back to Mise</a><h1>That recipe isn’t on our table yet.</h1><p>Try the discovery page for something delicious.</p></main>;
  const related = recipes.filter(candidate => candidate.id !== recipe.id)
    .sort((a, b) => Number(b.region === recipe.region) - Number(a.region === recipe.region)
      || Number(b.tags.some(tag => recipe.tags.includes(tag))) - Number(a.tags.some(tag => recipe.tags.includes(tag))))
    .slice(0, 3);
  const scale = (value: number) => (Math.round(value * servings / recipe.servings * 10) / 10).toLocaleString();
  const add = () => {
    const count = addRecipeToShoppingList(recipe, servings);
    setMessage(count < 0 ? 'Shopping list could not be saved on this device.' : count ? count + ' ingredients added to your list.' : 'These ingredients are already on your list.');
  };
  const share = async () => {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: recipe.name + ' · Mise', url });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); setMessage('Recipe link copied.'); }
      else setMessage('Copy this recipe URL: ' + url);
    } catch (error) { if ((error as Error)?.name !== 'AbortError') setMessage('Sharing unavailable on this device.'); }
  };
  return <main className="recipe-page" id="top">
    <header className="recipe-page-header">
      <a href="/" className="recipe-wordmark"><img src="/brand/mise-mark.svg" alt="" width="36" height="36" /> Mise</a>
      <nav aria-label="Recipe navigation"><a href="/#discover">Discover</a><a href="/shopping/"><ClipboardList size={16}/> Shopping list</a><NativeHeaderActions app={native} onSettings={() => setSettingsOpen(true)}/></nav>
    </header>
    <article className="recipe-article">
      <div className="recipe-page-top"><a href="/#discover" className="recipe-back"><ArrowLeft size={16}/> All recipes</a><span>{recipe.country} · {recipe.region}</span></div>
      <div className="recipe-page-hero">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot"/> A WORLD ON YOUR TABLE</p>
          <h1>{recipe.name}</h1>
          <p className="recipe-lede">{recipe.story}</p>
          <div className="recipe-facts"><span>{recipe.minutes} min</span><span>{recipe.difficulty}</span><span>{servings} servings</span></div>
          <div className="recipe-page-actions"><button type="button" onClick={add}><ClipboardList size={18}/> Add ingredients</button><button type="button" onClick={() => void share()}><Share2 size={18}/> Share recipe</button><a href={'/?view=kitchen&recipe=' + encodeURIComponent(recipe.id)}>Cook interactively</a></div>
          {message && <p role="status" className="recipe-notice">{message} <a href="/shopping/">View list</a></p>}
        </div>
        <div className="recipe-page-image" style={{ background: recipe.accent }}><img src={recipe.image} alt={recipe.name} onError={event => {event.currentTarget.src = '/brand/mise-social.svg';}} /></div>
      </div>
      <div className="recipe-page-columns">
        <section className="recipe-ingredients"><div className="recipe-section-heading"><div><p className="eyebrow">WHAT YOU NEED</p><h2>Ingredients</h2></div><label>Servings <select value={servings} onChange={event => setServings(Number(event.target.value))}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label></div><ul>{recipe.ingredients.map(item=><li key={item.id}><span>{item.name}</span><strong>{scale(item.amount)} {item.unit}</strong></li>)}</ul></section>
        <section className="recipe-method"><p className="eyebrow">A LITTLE AT A TIME</p><h2>How to make it</h2><ol>{recipe.steps.map((step,index)=><li key={index} id={'step-'+(index+1)}><span className="recipe-step-number">{String(index+1).padStart(2,'0')}</span><div><h3>{step.title}</h3><p>{step.instruction}</p><aside><strong>Chef’s note</strong> {step.tip}</aside></div><small>{step.minutes} min</small></li>)}</ol></section>
      </div>
      <section className="recipe-related" aria-label="Discover more recipes">
        <p className="eyebrow">MORE FLAVORS TO EXPLORE</p>
        <h2>Your next adventure</h2>
        <div className="recipe-related-grid">
          {related.map(other => <a href={recipePath(other.id)} key={other.id}>
            <img loading="lazy" src={other.image} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src='/brand/mise-social.svg'; }}/>
            <span>{other.country} · {other.minutes} min</span><strong>{other.name}</strong>
          </a>)}
        </div>
      </section>
      <div className="recipe-bottom-cta"><h2>Ready to make it yours?</h2><p>Take this recipe into the interactive kitchen, or discover another part of the world.</p><a href={'/?view=kitchen&recipe=' + encodeURIComponent(recipe.id)}>Enter the kitchen</a></div>
    </article>
    <NativeDialog app={native} open={settingsOpen} close={() => setSettingsOpen(false)}/>
    <NativeNotices app={native}/>
  </main>;
}

export function ShoppingPage() {
  const native = useNativeApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [items, setItems] = useState<ShoppingItem[]>(() => getShoppingItems());
  const [message, setMessage] = useState('');
  useEffect(() => { document.title = 'My shopping list · Mise'; }, []);
  const apply = (next: ShoppingItem[]) => { if (saveShoppingItems(next)) setItems(next); else setMessage('Unable to save changes. Check browser storage permissions.'); };
  const copyList = async () => {
    const list = items.map(item => (item.checked ? '✓ ' : '☐ ') + item.amount + ' ' + item.unit + ' ' + item.name + ' (' + item.recipeName + ')').join('\n');
    try {
      await navigator.clipboard.writeText(list);
      setMessage('List copied to clipboard.');
    } catch { setMessage('Clipboard unavailable. Use your browser’s share or selection controls.'); }
  };
  return <main className="recipe-page shopping-page">
    <header className="recipe-page-header"><a className="recipe-wordmark" href="/"><img src="/brand/mise-mark.svg" alt="" width="36" height="36"/> Mise</a><nav><a href="/#discover">Discover</a><NativeHeaderActions app={native} onSettings={() => setSettingsOpen(true)}/></nav></header>
    <div className="shopping-main"><a className="recipe-back" href="/#discover"><ArrowLeft size={17}/> Browse recipes</a><p className="eyebrow">THE THINGS YOU’LL NEED</p><h1>Shopping list</h1><p>Everything in one place, saved on this device. Tick off ingredients as you shop.</p>
      <div className="shopping-summary"><span>{items.filter(item => item.checked).length} of {items.length} checked</span><div><button type="button" onClick={() => void copyList()} disabled={!items.length}><Share2 size={16}/> Copy list</button><button type="button" onClick={() => apply([])} disabled={!items.length}><Trash2 size={16}/> Clear all</button></div></div>
      {message && <p role="status" className="recipe-notice">{message}</p>}
      {items.length ? <ul className="shopping-items">{items.map(item=><li key={item.id} className={item.checked ? 'is-done' : ''}><label><input type="checkbox" checked={item.checked} onChange={() => apply(items.map(other=>other.id===item.id?{...other,checked:!other.checked}:other))}/><span><strong>{item.name}</strong><small><a href={recipePath(item.recipeId)}>{item.recipeName}</a></small></span></label><span>{item.amount} {item.unit}</span><button type="button" aria-label={'Remove '+item.name} onClick={() => apply(items.filter(other=>other.id!==item.id))}><Trash2 size={16}/></button></li>)}</ul> : <div className="shopping-empty"><Check size={24}/><h2>Your list is ready for ideas.</h2><p>Open any recipe and tap “Add ingredients” to fill it.</p><a href="/#discover">Discover recipes</a></div>}
    </div>
    <NativeDialog app={native} open={settingsOpen} close={() => setSettingsOpen(false)}/><NativeNotices app={native}/>
  </main>;
}
