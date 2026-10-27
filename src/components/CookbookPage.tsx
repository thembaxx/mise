import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, BookOpen, Check, ClipboardList, Heart, Link2, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { addRecipeToShoppingList, recipePath } from '../lib/kitchen-storage';
import { NativeDialog, NativeHeaderActions, NativeNotices } from './NativeControls';
import { useNativeApp } from '../pwa/useNativeApp';
import {
  allRecipes, createCollection, deleteCollection, deletePersonalRecipe, draftToRecipe,
  importRecipeContent, importRecipeUrl, isPersonalRecipe, loadCollections, loadPersonalRecipes,
  recipeToDraft, savePersonalRecipe, savedRecipeIds, setRecipeSaved, toggleInCollection,
  type RecipeDraft,
} from '../lib/personal-cookbook';
import type { Recipe } from '../data/recipes';

const emptyDraft: RecipeDraft = {name:'',minutes:30,servings:2,ingredients:'',steps:'',region:'Personal',country:'My kitchen'};
type EditorMode = 'manual'|'url'|'paste';

export default function CookbookPage() {
  const native=useNativeApp();
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [revision,setRevision]=useState(0);
  const [status,setStatus]=useState('');
  const [search,setSearch]=useState('');
  const [collectionId,setCollectionId]=useState('all');
  const [draft,setDraft]=useState<RecipeDraft>(emptyDraft);
  const [editor,setEditor]=useState<EditorMode>('manual');
  const [importOpen,setImportOpen]=useState(false);
  const [url,setUrl]=useState('');
  const [pasted,setPasted]=useState('');
  const [busy,setBusy]=useState(false);
  const [collectionName,setCollectionName]=useState('');
  const catalog=useMemo(()=>allRecipes(),[revision]);
  const personal=useMemo(()=>loadPersonalRecipes(),[revision]);
  const collections=useMemo(()=>loadCollections(),[revision]);
  const saved=useMemo(()=>savedRecipeIds(),[revision]);

  const refresh=()=>setRevision(value=>value+1);
  useEffect(()=>{
    document.title='My cookbook · Mise';
    const sync=()=>refresh();
    window.addEventListener('storage',sync);
    window.addEventListener('mise:cookbook:updated',sync);
    return()=>{window.removeEventListener('storage',sync);window.removeEventListener('mise:cookbook:updated',sync);};
  },[]);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const sharedUrl=params.get('url') || (params.get('text') || '').match(/https:\/\/\S+/)?.[0] || '';
    const sharedText=params.get('text') || '';
    if (sharedUrl) {setUrl(sharedUrl);setImportOpen(true);setEditor('url');setStatus('Shared recipe received. Review the source before importing.');}
    else if (sharedText) {setPasted(sharedText);setImportOpen(true);setEditor('paste');}
    if(sharedUrl || sharedText) history.replaceState(null,'','/cookbook/');
  },[]);

  const visible=catalog.filter(recipe=>(collectionId==='all' || collectionId==='saved' && saved.includes(recipe.id)
    || collectionId==='personal' && isPersonalRecipe(recipe.id)
    || collections.some(collection=>collection.id===collectionId && collection.recipeIds.includes(recipe.id)))
    && (recipe.name+' '+recipe.country+' '+recipe.tags.join(' ')).toLowerCase().includes(search.toLowerCase().trim()));

  const editRecipe=(recipe:Recipe)=>{
    setDraft(recipeToDraft(recipe));
    setEditor('manual');setImportOpen(true);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const startNew=()=>{
    setDraft(emptyDraft);setUrl('');setPasted('');setEditor('manual');setImportOpen(true);
  };
  const save=(event:FormEvent)=>{
    event.preventDefault();
    try{
      const recipe=draftToRecipe(draft);
      if (!savePersonalRecipe(recipe)) throw new Error('Device storage is full or unavailable. Your changes were not saved.');
      setStatus('Saved '+recipe.name+' to your personal cookbook on this device.');
      setDraft(emptyDraft);setImportOpen(false);setCollectionId('personal');refresh();
    }catch(error){setStatus((error as Error).message);}
  };
  const importFromUrl=async()=>{
    setBusy(true);setStatus('');
    try{setDraft(await importRecipeUrl(url));setEditor('manual');setStatus('Recipe imported into the editor. Review ingredients and steps before saving.');}
    catch(error){setStatus((error as Error).message);}
    finally{setBusy(false);}
  };
  const importFromText=()=>{
    try{setDraft(importRecipeContent(pasted,url));setEditor('manual');setStatus('Recipe parsed. Check the quantities, timing and method before saving.');}
    catch(error){setStatus((error as Error).message);}
  };
  const toggleFavourite=(id:string)=>{
    if(setRecipeSaved(id,!saved.includes(id)))refresh();
    else setStatus('Could not save your favourites on this device.');
  };
  const remove=(recipe:Recipe)=>{
    if (!window.confirm('Delete "'+recipe.name+'"? This removes your local recipe, but cannot undo this action.')) return;
    if(deletePersonalRecipe(recipe.id)){setStatus('Recipe deleted from this device.');refresh();}
    else setStatus('Unable to delete recipe.');
  };
  const addCollection=(event:FormEvent)=>{
    event.preventDefault();
    if(createCollection(collectionName)){setCollectionName('');refresh();setStatus('Collection created.');}
    else setStatus('Enter a name; collections are limited to 30.');
  };

  return <main className="recipe-page cookbook-page" id="top">
    <header className="recipe-page-header">
      <a href="/" className="recipe-wordmark"><img src="/brand/mise-mark.svg" width="36" height="36" alt=""/> Mise</a>
      <nav aria-label="Cookbook navigation"><a href="/#discover">Discover</a><a href="/shopping/"><ClipboardList size={16}/> Shopping list</a><NativeHeaderActions app={native} onSettings={()=>setSettingsOpen(true)}/></nav>
    </header>
    <div className="cookbook-main">
      <a href="/#discover" className="recipe-back"><ArrowLeft size={16}/> Back to recipes</a>
      <div className="cookbook-hero"><div><p className="eyebrow">A PLACE FOR EVERYTHING DELICIOUS</p><h1>My <em>cookbook.</em></h1>
        <p>Keep family recipes, collect favourites and bring your own discoveries into the Mise kitchen. Everything stays on this device.</p>
      </div><div className="cookbook-hero-action"><strong>{personal.length}</strong><span>PERSONAL RECIPES</span><button type="button" onClick={startNew}><Plus size={17}/> New recipe</button></div></div>
      {status && <p className="recipe-notice cookbook-status" role="status">{status}</p>}
      <section className="cookbook-editor-section" aria-label="Recipe editor">
        {!importOpen
          ? <button type="button" className="cookbook-import-opener" onClick={()=>{setImportOpen(true);setEditor('url');}}><Upload size={19}/> Import a recipe from a website or text <Plus size={16}/></button>
          : <div className="cookbook-editor">
            <div className="cookbook-editor-title"><div><p className="eyebrow">YOUR NEXT FAVOURITE</p><h2>{draft.id?'Edit your recipe':'Add a recipe'}</h2></div><button type="button" aria-label="Close recipe editor" onClick={()=>setImportOpen(false)}><X size={20}/></button></div>
            <div className="cookbook-editor-tabs" role="group" aria-label="Recipe input method">
              {([['manual','Write my own'],['url','From a URL'],['paste','Paste recipe']] as const).map(([id,label])=>
                <button type="button" key={id} className={editor===id?'active':''} aria-pressed={editor===id} onClick={()=>setEditor(id)}>{label}</button>)}
            </div>
            {editor==='url' ? <div className="cookbook-import-field">
              <label htmlFor="import-url">Recipe webpage URL</label>
              <input id="import-url" type="url" inputMode="url" value={url} placeholder="https://example.com/recipe" onChange={event=>setUrl(event.target.value)}/>
              <button type="button" disabled={busy || !url.trim() || !native.online} onClick={()=>void importFromUrl()}><Link2 size={16}/>{busy?'Importing…':'Import recipe'}</button>
              <p>Direct import requires an HTTPS page with Recipe JSON-LD that allows browser access (CORS). Many websites block it. We never use a scraping proxy or bypass restrictions; use Paste recipe instead. Your imported text stays local.</p>
            </div> : editor==='paste' ? <div className="cookbook-import-field">
              <label htmlFor="import-paste">Recipe text, HTML or JSON-LD</label>
              <textarea id="import-paste" rows={8} maxLength={500000} value={pasted} onChange={event=>setPasted(event.target.value)}
                placeholder={'Grandma’s stew\nIngredients\n2 cups beans\n1 onion\nInstructions\nSoak beans overnight.\nSimmer until tender.'}/>
              <button type="button" disabled={!pasted.trim()} onClick={importFromText}><Upload size={16}/> Parse recipe</button>
              <p>Use a title, Ingredients and Instructions headings, or valid Recipe JSON-LD. Always check quantities and allergen information after import.</p>
            </div> : <form className="cookbook-form" onSubmit={save}>
              <label>Recipe name<input required minLength={2} maxLength={120} value={draft.name} onChange={event=>setDraft(value=>({...value,name:event.target.value}))}/></label>
              <div className="cookbook-form-row">
                <label>Cooking time (minutes)<input required type="number" min="1" max="720" step="1" value={draft.minutes} onChange={event=>setDraft(value=>({...value,minutes:Number(event.target.value)}))}/></label>
                <label>Servings<input required type="number" min="1" max="12" step="1" value={draft.servings} onChange={event=>setDraft(value=>({...value,servings:Number(event.target.value)}))}/></label>
              </div>
              <label>Short description (optional)<input maxLength={130} value={draft.subtitle || ''} onChange={event=>setDraft(value=>({...value,subtitle:event.target.value}))}/></label>
              <label>Story or notes (optional)<textarea rows={2} maxLength={1400} value={draft.story || ''} onChange={event=>setDraft(value=>({...value,story:event.target.value}))}/></label>
              <label>Ingredients — one per line<textarea required rows={6} value={draft.ingredients} onChange={event=>setDraft(value=>({...value,ingredients:event.target.value}))} placeholder={'400 g tomatoes\n2 tbsp olive oil\n1 onion'}/></label>
              <label>Instructions — one step per line<textarea required rows={6} value={draft.steps} onChange={event=>setDraft(value=>({...value,steps:event.target.value}))} placeholder={'Chop vegetables.\nHeat the oil in a pan.\nSimmer until tender.'}/></label>
              <p>Use quantities like “400 g tomatoes” or “2 onions”. Unrecognised units stay as written; Mise never estimates ingredient density. Changing the ingredients or steps of an existing recipe resets its old cooking progress, timers and related shopping entries.</p>
              <button type="submit" className="cookbook-save"><Check size={18}/> {draft.id?'Save changes':'Save to my cookbook'}</button>
            </form>}
          </div>}
      </section>
      <div className="cookbook-browser">
        <aside className="cookbook-sidebar">
          <h2>Collections</h2>
          <div className="cookbook-collection-links" role="group" aria-label="Filter cookbook">
            {[{id:'all',name:'All recipes'},{id:'personal',name:'My recipes'},{id:'saved',name:'Favourites'},...collections].map(collection=>
              <button key={collection.id} type="button" aria-pressed={collectionId===collection.id} className={collectionId===collection.id?'active':''} onClick={()=>setCollectionId(collection.id)}>
                <BookOpen size={15}/><span>{collection.name}</span>
              </button>)}
          </div>
          <form className="cookbook-add-collection" onSubmit={addCollection}>
            <label htmlFor="collection-name">New collection</label><div><input id="collection-name" value={collectionName} maxLength={70} placeholder="Weeknight favourites" onChange={event=>setCollectionName(event.target.value)}/><button type="submit" aria-label="Create collection" disabled={!collectionName.trim()}><Plus size={16}/></button></div>
          </form>
          {collectionId.startsWith('collection-') && <button className="cookbook-delete-collection" type="button" onClick={()=>{
            if(window.confirm('Delete this collection? Recipes will be kept.') && deleteCollection(collectionId)){setCollectionId('all');refresh();}
          }}><Trash2 size={14}/> Delete collection</button>}
        </aside>
        <section className="cookbook-results" aria-label="Cookbook recipes">
          <div className="cookbook-results-header"><div><p className="eyebrow">YOUR RECIPES, YOUR WAY</p><h2>{collectionId==='saved'?'Favourites':collectionId==='personal'?'My recipes':collections.find(c=>c.id===collectionId)?.name || 'All recipes'}</h2><small>{visible.length} recipes</small></div>
            <label className="cookbook-search"><Search size={17}/><span className="visually-hidden">Search cookbook</span><input type="search" value={search} placeholder="Search recipes" onChange={event=>setSearch(event.target.value)}/></label></div>
          {visible.length ? <div className="cookbook-grid">{visible.map(recipe=><article className="cookbook-item" key={recipe.id}>
            <a className="cookbook-item-photo" href={recipePath(recipe.id)}><img loading="lazy" src={recipe.image} alt="" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/brand/mise-social.svg';}}/></a>
            <div className="cookbook-item-body"><span>{isPersonalRecipe(recipe.id)?'MY RECIPE':recipe.country.toUpperCase()} · {recipe.minutes} MIN</span>
              <h3><a href={recipePath(recipe.id)}>{recipe.name}</a></h3><p>{recipe.subtitle}</p>
              <div className="cookbook-item-actions">
                <button type="button" aria-label={(saved.includes(recipe.id)?'Remove ':'Save ')+recipe.name+' favourite'} aria-pressed={saved.includes(recipe.id)} onClick={()=>toggleFavourite(recipe.id)}><Heart size={17} fill={saved.includes(recipe.id)?'currentColor':'none'}/></button>
                {isPersonalRecipe(recipe.id) && <><button type="button" aria-label={'Edit '+recipe.name} onClick={()=>editRecipe(recipe)}><Pencil size={17}/></button><button type="button" aria-label={'Delete '+recipe.name} onClick={()=>remove(recipe)}><Trash2 size={17}/></button></>}
                <a href={'/?view=cook&recipe='+encodeURIComponent(recipe.id)}>Cook</a>
              </div>
              {collections.length>0 && <details className="cookbook-collection-edit"><summary>Organise in collections</summary>{collections.map(collection=>
                <label key={collection.id}><input type="checkbox" checked={collection.recipeIds.includes(recipe.id)} onChange={()=>{
                  if(toggleInCollection(collection.id,recipe.id))refresh();else setStatus('Could not update collection.');
                }}/>{collection.name}</label>)}</details>}
            </div>
          </article>)}</div> : <div className="cookbook-empty"><BookOpen size={28}/><h3>Nothing on this shelf yet.</h3><p>Save recipes you love, create your own, or try another collection.</p><button type="button" onClick={startNew}><Plus size={15}/> Write a recipe</button></div>}
        </section>
      </div>
      <p className="cookbook-privacy"><strong>Private, local-first.</strong> Your recipes and collections are saved in this browser only, not synced between devices. Clearing site data removes them. Personal recipe links work only on devices where the recipe is saved. Public recipe import depends on each website's access rules.</p>
    </div>
    <NativeDialog app={native} open={settingsOpen} close={()=>setSettingsOpen(false)}/>
    <NativeNotices app={native}/>
  </main>;
}