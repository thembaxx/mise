import { useEffect, useState } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { Check } from '@phosphor-icons/react/dist/csr/Check';
import { ClipboardText } from '@phosphor-icons/react/dist/csr/ClipboardText';
import { ShareNetwork } from '@phosphor-icons/react/dist/csr/ShareNetwork';
import { Heart } from '@phosphor-icons/react/dist/csr/Heart';
import { ActionFeedback, useActionFeedback } from './ActionFeedback';
import { Trash } from '@phosphor-icons/react/dist/csr/Trash';
import { addRecipeToShoppingList, getShoppingItems, recipePath, saveShoppingItems, type ShoppingItem } from '../lib/kitchen-storage';
import { type Recipe } from '../data/recipes';
import { allRecipes, isPersonalRecipe, savedRecipeIds, setRecipeSaved } from '../lib/personal-cookbook';
import { IngredientGuide, PrepChecklist } from './SmartCompanion';
import { useNativeApp } from '../pwa/useNativeApp';
import { NativeDialog, NativeHeaderActions, NativeNotices } from './NativeControls';

export function RecipePage({ recipe }: { recipe: Recipe | undefined }) {
  const native = useNativeApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'shopping' | 'share'>('shopping');
  const feedback = useActionFeedback();
  const [saved, setSaved] = useState(() => Boolean(recipe && savedRecipeIds().includes(recipe.id)));
  useEffect(() => {
    const sync = () => setSaved(Boolean(recipe && savedRecipeIds().includes(recipe.id)));
    window.addEventListener('storage', sync);
    window.addEventListener('mise:cookbook:updated', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('mise:cookbook:updated', sync); };
  }, [recipe]);
  const [servings, setServings] = useState(recipe?.servings || 2);
  useEffect(() => {
    document.title = recipe ? recipe.name + ' recipe · Mise' : 'Recipe not found · Mise';
    const meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previous = meta?.content;
    if (meta && recipe && isPersonalRecipe(recipe.id)) meta.content = 'noindex, nofollow';
    return () => { if (meta && previous !== undefined) meta.content = previous; };
  }, [recipe]);

  if (!recipe) return <main className="recipe-page"><a href="/" className="recipe-back"><ArrowLeft size={18}/> Back to Mise</a><h1>Recipe not found.</h1><p>Browse recipes to find something to cook.</p></main>;
  const related = allRecipes().filter(candidate => candidate.id !== recipe.id)
    .sort((a, b) => Number(b.region === recipe.region) - Number(a.region === recipe.region)
      || Number(b.tags.some(tag => recipe.tags.includes(tag))) - Number(a.tags.some(tag => recipe.tags.includes(tag))))
    .slice(0, 3);
  const add = () => {
    setMessageKind('shopping');
    const count = addRecipeToShoppingList(recipe, servings);
    setMessage(count < 0 ? 'Shopping list could not be saved on this device.' : count ? count + ' ingredients added to your list.' : 'These ingredients are already on your list.');
  };
  const share = async () => {
    setMessage('');
    setMessageKind('share');
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: recipe.name + ' · Mise', url });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); setMessage('Recipe link copied.'); }
      else setMessage('Copy this recipe URL: ' + url);
    } catch (error) { if ((error as Error)?.name !== 'AbortError') setMessage('Sharing unavailable on this device.'); }
  };
  const toggleSaved = () => {
    const wasSaved = savedRecipeIds().includes(recipe.id);
    if (!setRecipeSaved(recipe.id, !wasSaved)) { feedback.show('Recipe could not be saved on this device.', undefined, true); return; }
    feedback.show(wasSaved ? 'Removed from saved recipes.' : 'Saved to your cookbook.', () => {
      if (!setRecipeSaved(recipe.id, wasSaved)) feedback.show('Could not undo. Check device storage.', undefined, true);
    });
  };
  return <main className="recipe-page" id="top">
    <header className="recipe-page-header">
      <a href="/" className="recipe-wordmark"><img src="/brand/mise-mark.svg" alt="" width="36" height="36" /> Mise</a>
      <nav aria-label="Recipe navigation"><a href="/#discover">Discover</a><a href="/shopping/"><ClipboardText size={16}/> Shopping list</a><a href="/cookbook/">My cookbook</a><NativeHeaderActions app={native} onSettings={() => setSettingsOpen(true)}/></nav>
    </header>
    <article className="recipe-article">
      <div className="recipe-page-top"><a href="/#discover" className="recipe-back"><ArrowLeft size={16}/> All recipes</a><span>{recipe.country} · {recipe.region}</span></div>
      <div className="recipe-page-hero">
        <div>
          <p className="eyebrow">{recipe.country}</p>
          <h1>{recipe.name}</h1>
          <p className="recipe-lede">{recipe.story}</p>
          <div className="recipe-facts"><span>{recipe.minutes} min</span><span>{recipe.difficulty}</span><span>{servings} servings</span></div>
          <div className="recipe-page-actions"><button id={'save-' + recipe.id} type="button" aria-pressed={saved} onClick={toggleSaved}><Heart size={18} weight={saved ? 'fill' : 'regular'}/>{saved ? 'Saved' : 'Save recipe'}</button><button type="button" onClick={add}><ClipboardText size={18}/> Add ingredients</button>{isPersonalRecipe(recipe.id) ? <a href="/cookbook/"><ShareNetwork size={18}/> Edit in my cookbook</a> : <button type="button" onClick={() => void share()}>{message === 'Recipe link copied.' ? <Check size={18}/> : <ShareNetwork size={18}/>} {message === 'Recipe link copied.' ? 'Link copied' : 'Share recipe'}</button>}<a href={'/?view=kitchen&recipe=' + encodeURIComponent(recipe.id)}>Cook interactively</a><a href={'/?view=cook&recipe=' + encodeURIComponent(recipe.id)}>Start Cook Mode</a></div>
          {message && <p role="status" className="recipe-notice">{message} {messageKind === 'shopping' && <a href="/shopping/">View list</a>}</p>}
        </div>
        <div className="recipe-page-image" style={{ background: recipe.accent }}><img src={recipe.image} alt={recipe.name} onError={event => {event.currentTarget.src = '/brand/mise-social.svg';}} /></div>
      </div>
      <div className="recipe-page-columns">
        <section className="recipe-ingredients"><div className="recipe-section-heading"><div><h2>Ingredients</h2></div><label>Servings <select value={servings} onChange={event => setServings(Number(event.target.value))}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label></div><IngredientGuide recipe={recipe} servings={servings}/><PrepChecklist recipe={recipe}/></section>
        <section className="recipe-method"><h2>How to make it</h2><ol>{recipe.steps.map((step,index)=><li key={index} id={'step-'+(index+1)}><span className="recipe-step-number">{String(index+1).padStart(2,'0')}</span><div><h3>{step.title}</h3><p>{step.instruction}</p><aside><strong>Chef’s note</strong> {step.tip}</aside></div><small>{step.minutes} min</small></li>)}</ol></section>
      </div>
      <section className="recipe-related" aria-label="Discover more recipes">

        <h2>More recipes to try</h2>
        <div className="recipe-related-grid">
          {related.map(other => <a href={recipePath(other.id)} key={other.id}>
            <img loading="lazy" src={other.image} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src='/brand/mise-social.svg'; }}/>
            <span>{other.country} · {other.minutes} min</span><strong>{other.name}</strong>
          </a>)}
        </div>
      </section>

    </article>
    <ActionFeedback notice={feedback.notice} dismiss={feedback.dismiss}/><NativeDialog app={native} open={settingsOpen} close={() => setSettingsOpen(false)}/>
    <NativeNotices app={native}/>
  </main>;
}

export function ShoppingPage() {
  const native = useNativeApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [items, setItems] = useState<ShoppingItem[]>(() => getShoppingItems());
  const feedback = useActionFeedback();
  const [message, setMessage] = useState('');
  useEffect(() => { document.title = 'My shopping list · Mise'; }, []);
  const apply = (next: ShoppingItem[]) => { if (saveShoppingItems(next)) setItems(next); else setMessage('Unable to save changes. Check browser storage permissions.'); };
  const removeItems = (ids: string[]) => {
    const previous = items;
    const removed = new Set(ids);
    const next = items.filter(item => !removed.has(item.id));
    if (!saveShoppingItems(next)) { feedback.show('Could not update your list. Check device storage.', undefined, true); return; }
    setItems(next);
    feedback.show(ids.length === 1 ? 'Ingredient removed.' : 'Shopping list cleared.', () => {
      const current = getShoppingItems();
      const currentById = new Map(current.map(item => [item.id, item]));
      const previousIds = new Set(previous.map(item => item.id));
      const restored = previous.flatMap(item => currentById.has(item.id) ? [currentById.get(item.id)!] : removed.has(item.id) ? [item] : []);
      restored.push(...current.filter(item => !previousIds.has(item.id)));
      if (!saveShoppingItems(restored)) { feedback.show('Could not restore your list. Check device storage.', undefined, true); return; }
      setItems(restored);
    });
  };
  const copyList = async () => {
    const list = items.map(item => (item.checked ? '[x] ' : '[ ] ') + item.amount + ' ' + item.unit + ' ' + item.name + ' (' + item.recipeName + ')').join('\n');
    try {
      await navigator.clipboard.writeText(list);
      setMessage('List copied to clipboard.');
    } catch { setMessage('Clipboard unavailable. Use your browser’s share or selection controls.'); }
  };
  return <main className="recipe-page shopping-page">
    <header className="recipe-page-header"><a className="recipe-wordmark" href="/"><img src="/brand/mise-mark.svg" alt="" width="36" height="36"/> Mise</a><nav><a href="/#discover">Discover</a><a href="/cookbook/">My cookbook</a><NativeHeaderActions app={native} onSettings={() => setSettingsOpen(true)}/></nav></header>
    <div className="shopping-main"><a className="recipe-back" href="/#discover"><ArrowLeft size={17}/> Browse recipes</a><h1>Shopping list</h1><p>Everything in one place, saved on this device. Tick off ingredients as you shop.</p>
      <div className="shopping-summary"><span>{items.length > 0 && items.every(item => item.checked) ? <><Check size={17}/> All packed. You’re ready to cook.</> : <>{items.filter(item => item.checked).length} of {items.length} checked</>}</span><div><button type="button" onClick={() => void copyList()} disabled={!items.length}><ShareNetwork size={16}/> Copy list</button><button type="button" onClick={() => removeItems(items.map(item => item.id))} disabled={!items.length}><Trash size={16}/> Clear all</button></div></div>
      {message && <p role="status" className="recipe-notice">{message}</p>}
      {items.length ? <ul className="shopping-items">{items.map(item=><li key={item.id} className={item.checked ? 'is-done' : ''}><label><input type="checkbox" checked={item.checked} onChange={() => apply(items.map(other=>other.id===item.id?{...other,checked:!other.checked}:other))}/><span><strong>{item.name}</strong><small><a href={recipePath(item.recipeId)}>{item.recipeName}</a></small></span></label><span>{item.amount} {item.unit}</span><button type="button" id={'remove-' + item.id} aria-label={'Remove '+item.name} onClick={() => removeItems([item.id])}><Trash size={16}/></button></li>)}</ul> : <div className="shopping-empty"><Check size={24}/><h2>Your shopping list is empty.</h2><p>Open any recipe and tap “Add ingredients” to fill it.</p><a href="/#discover">Discover recipes</a></div>}
    </div>
    <ActionFeedback notice={feedback.notice} dismiss={feedback.dismiss}/><NativeDialog app={native} open={settingsOpen} close={() => setSettingsOpen(false)}/><NativeNotices app={native}/>
  </main>;
}
