import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { BookOpen } from '@phosphor-icons/react/dist/csr/BookOpen';
import { Check } from '@phosphor-icons/react/dist/csr/Check';
import { ClipboardText } from '@phosphor-icons/react/dist/csr/ClipboardText';
import { DownloadSimple } from '@phosphor-icons/react/dist/csr/DownloadSimple';
import { Heart } from '@phosphor-icons/react/dist/csr/Heart';
import { Link } from '@phosphor-icons/react/dist/csr/Link';
import { Pencil } from '@phosphor-icons/react/dist/csr/Pencil';
import { Plus } from '@phosphor-icons/react/dist/csr/Plus';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { ShieldCheck } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { Trash } from '@phosphor-icons/react/dist/csr/Trash';
import { Upload } from '@phosphor-icons/react/dist/csr/Upload';
import { X } from '@phosphor-icons/react/dist/csr/X';
import { applyRestore, exportCookbook, MAX_BACKUP_BYTES, previewRestore, type RestoreMode, type RestorePlan } from '../lib/cookbook-backup';
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
  const [restoreMode,setRestoreMode]=useState<RestoreMode>('merge');
  const [backupContents,setBackupContents]=useState('');
  const [backupFileName,setBackupFileName]=useState('');
  const [restorePlan,setRestorePlan]=useState<RestorePlan|null>(null);
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
  const downloadBackup=()=>{
    try{
      const content=exportCookbook();
      const blob=new Blob([content],{type:'application/json'});
      const link=document.createElement('a');
      const downloadUrl=URL.createObjectURL(blob);
      link.href=downloadUrl;link.download='mise-cookbook-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(downloadUrl),1000);
      setStatus('Cookbook backup downloaded. Keep it somewhere safe.');
    }catch(error){setStatus((error as Error).message);}
  };
  const updateRestore=(content:string,mode:RestoreMode)=>{
    setRestorePlan(null);
    try{setRestorePlan(previewRestore(content,mode));setStatus('Backup validated. Review the counts before applying changes.');}
    catch(error){setStatus((error as Error).message);}
  };
  const pickBackup=async(file:File|undefined)=>{
    setRestorePlan(null);setBackupContents('');setBackupFileName(file?.name||'');
    if(!file)return;
    if(file.size>MAX_BACKUP_BYTES){setStatus('Backup exceeds the 1 MB limit.');return;}
    try{const content=await file.text();setBackupContents(content);updateRestore(content,restoreMode);}
    catch{setStatus('Could not read this backup file.');}
  };
  const commitRestore=()=>{
    if(!restorePlan||!backupContents)return;
    try{
      const outcome=applyRestore(backupContents,restoreMode);
      setBackupContents('');setRestorePlan(null);setBackupFileName('');
      setStatus('Restored '+outcome.resultRecipes+' personal recipes and '+outcome.resultCollections+' collections on this device.');
      refresh();setCollectionId('all');
    }catch(error){setStatus((error as Error).message);}
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
      <nav aria-label="Cookbook navigation"><a href="/#discover">Discover</a><a href="/shopping/"><ClipboardText size={16}/> Shopping list</a><NativeHeaderActions app={native} onSettings={()=>setSettingsOpen(true)}/></nav>
    </header>
    <div className="cookbook-main">
      <a href="/#discover" className="recipe-back"><ArrowLeft size={16}/> Back to recipes</a>
      <div className="cookbook-hero"><div><h1>My <em>cookbook.</em></h1>
        <p>Your recipes and favorites, organized in one place. Saved on this device.</p>
      </div><div className="cookbook-hero-action"><button type="button" onClick={startNew}><Plus size={17}/> New recipe</button><span>{personal.length} personal {personal.length === 1 ? 'recipe' : 'recipes'}</span></div></div>
      {status && <p className="recipe-notice cookbook-status" role="status">{status}</p>}
      <section className="cookbook-editor-section" aria-label="Recipe editor">
        {!importOpen
          ? <button type="button" className="cookbook-import-opener" onClick={()=>{setImportOpen(true);setEditor('url');}}><Upload size={19}/> Import a recipe from a website or text <Plus size={16}/></button>
          : <div className="cookbook-editor">
            <div className="cookbook-editor-title"><div><h2>{draft.id?'Edit your recipe':'Add a recipe'}</h2></div><button type="button" aria-label="Close recipe editor" onClick={()=>setImportOpen(false)}><X size={20}/></button></div>
            <div className="cookbook-editor-tabs" role="group" aria-label="Recipe input method">
              {([['manual','Write my own'],['url','From a URL'],['paste','Paste recipe']] as const).map(([id,label])=>
                <button type="button" key={id} className={editor===id?'active':''} aria-pressed={editor===id} onClick={()=>setEditor(id)}>{label}</button>)}
            </div>
            {editor==='url' ? <div className="cookbook-import-field">
              <label htmlFor="import-url">Recipe webpage URL</label>
              <input id="import-url" type="url" inputMode="url" value={url} placeholder="https://example.com/recipe" onChange={event=>setUrl(event.target.value)}/>
              <button type="button" disabled={busy || !url.trim() || !native.online} onClick={()=>void importFromUrl()}><Link size={16}/>{busy?'Importing…':'Import recipe'}</button>
              <p>Paste a public recipe link to import its ingredients and instructions. If the website blocks importing, use Paste recipe instead. Review quantities and allergens before saving. The URL is sent to Mise when you tap Import.</p>
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
      <section className="cookbook-backup" aria-label="Cookbook backup and restore">
        <details><summary><span><ShieldCheck size={20}/> Your recipes, kept safe</span><span>Backup &amp; restore</span></summary>
          <div className="cookbook-backup-content">
            <div><h2>Take your cookbook with you.</h2>
              <p>Export a versioned JSON backup of your personal recipes, collections and favourites. Only you receive the file; there is no cloud sync or upload to Mise.</p>
              <button type="button" className="cookbook-save" onClick={downloadBackup}><DownloadSimple size={17}/> Download cookbook backup</button>
            </div>
            <div className="cookbook-restore">
              <h3>Restore a backup</h3>
              <label htmlFor="cookbook-backup-file">Choose a Mise JSON backup file (1 MB maximum)</label>
              <input id="cookbook-backup-file" aria-label="Choose cookbook backup" type="file" accept=".json,application/json" onChange={event=>void pickBackup(event.currentTarget.files?.[0])}/>
              <fieldset><legend>Restore method</legend>
                <label><input type="radio" name="restore-mode" checked={restoreMode==='merge'} onChange={()=>{setRestoreMode('merge');if(backupContents)updateRestore(backupContents,'merge');}}/> Merge — keep my existing recipes</label>
                <label><input type="radio" name="restore-mode" checked={restoreMode==='replace'} onChange={()=>{setRestoreMode('replace');if(backupContents)updateRestore(backupContents,'replace');}}/> Replace — use only the backup</label>
              </fieldset>
              {restorePlan&&<div className="cookbook-restore-preview" role="region" aria-label="Restore preview">
                <strong>Review before restoring</strong>
                <p>{restorePlan.incomingRecipes} recipes in file · {restorePlan.incomingCollections} collections in file</p>
                <p>{restorePlan.addedRecipes} recipes to add · {restorePlan.duplicateRecipes} identical recipes skipped · {restorePlan.conflictingIds} ID conflicts resolved</p>
                <p>After restore: {restorePlan.resultRecipes} recipes, {restorePlan.resultCollections} collections{restorePlan.mode==='replace'?' · '+restorePlan.removedRecipes+' existing recipes removed':''}</p>
                {restorePlan.warnings.map(note=><p key={note}>{note}</p>)}
                <button type="button" className="cookbook-save" onClick={commitRestore}><Check size={16}/> {restoreMode==='replace'?'Confirm replace cookbook':'Confirm merge backup'}</button>
              </div>}
              {backupFileName&&!restorePlan&&<p role="status">{backupFileName} could not be validated. No changes were made.</p>}
            </div>
          </div>
        </details>
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
          }}><Trash size={14}/> Delete collection</button>}
        </aside>
        <section className="cookbook-results" aria-label="Cookbook recipes">
          <div className="cookbook-results-header"><div><h2>{collectionId==='saved'?'Favourites':collectionId==='personal'?'My recipes':collections.find(c=>c.id===collectionId)?.name || 'All recipes'}</h2><small>{visible.length} recipes</small></div>
            <label className="cookbook-search"><MagnifyingGlass size={17}/><span className="visually-hidden">Search cookbook</span><input type="search" value={search} placeholder="Search recipes" onChange={event=>setSearch(event.target.value)}/></label></div>
          {visible.length ? <div className="cookbook-grid">{visible.map(recipe=><article className="cookbook-item" key={recipe.id}>
            <a className="cookbook-item-photo" href={recipePath(recipe.id)}><img loading="lazy" src={recipe.image} alt="" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/brand/mise-social.svg';}}/></a>
            <div className="cookbook-item-body"><span>{isPersonalRecipe(recipe.id)?'MY RECIPE':recipe.country.toUpperCase()} · {recipe.minutes} MIN</span>
              <h3><a href={recipePath(recipe.id)}>{recipe.name}</a></h3><p>{recipe.ingredients.length} ingredients · {recipe.difficulty}</p>
              <div className="cookbook-item-actions">
                <button type="button" aria-label={(saved.includes(recipe.id)?'Remove ':'Save ')+recipe.name+' favourite'} aria-pressed={saved.includes(recipe.id)} onClick={()=>toggleFavourite(recipe.id)}><Heart size={17} weight={saved.includes(recipe.id)?'fill':'regular'}/></button>
                {isPersonalRecipe(recipe.id) && <><button type="button" aria-label={'Edit '+recipe.name} onClick={()=>editRecipe(recipe)}><Pencil size={17}/></button><button type="button" aria-label={'Delete '+recipe.name} onClick={()=>remove(recipe)}><Trash size={17}/></button></>}
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
      <p className="cookbook-privacy"><strong>Private, local-first.</strong> Your recipes and collections are saved in this browser only, not synced between devices. Clearing site data removes them unless you have exported a backup. Restoring or exporting uses only this device; backup JSON files contain your recipes in readable text, so store them privately. Personal recipe links work only on devices where the recipe is saved. Public recipe import depends on each website's access rules.</p>
    </div>
    <NativeDialog app={native} open={settingsOpen} close={()=>setSettingsOpen(false)}/>
    <NativeNotices app={native}/>
  </main>;
}