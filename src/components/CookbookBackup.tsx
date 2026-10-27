import { useState, type ChangeEvent } from 'react';
import { ArrowDownToLine, Check, FileJson2, ShieldCheck, Upload, X } from 'lucide-react';
import {
  applyCookbookRestore, previewCookbookRestore, serializeCookbookBackup,
  MAX_BACKUP_BYTES, type RestoreMode, type RestorePlan,
} from '../lib/cookbook-backup';

type Props = {onChange:()=>void};

export default function CookbookBackup({onChange}:Props){
  const [open,setOpen]=useState(false);
  const [file,setFile]=useState('');
  const [content,setContent]=useState('');
  const [mode,setMode]=useState<RestoreMode>('merge');
  const [plan,setPlan]=useState<RestorePlan|null>(null);
  const [confirmReplace,setConfirmReplace]=useState(false);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);

  const download=()=>{
    try{
      const data=serializeCookbookBackup();
      const objectUrl=URL.createObjectURL(new Blob([data],{type:'application/json'}));
      const a=document.createElement('a');
      a.href=objectUrl;a.download='mise-cookbook-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.append(a);a.click();a.remove();
      window.setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
      setNotice('Cookbook backup saved. Keep the JSON file somewhere safe — Mise does not store it in the cloud.');
    }catch(error){setNotice((error as Error).message);}
  };
  const readFile=async(event:ChangeEvent<HTMLInputElement>)=>{
    const chosen=event.target.files?.[0];
    setPlan(null);setConfirmReplace(false);setContent('');
    if(!chosen)return;
    setFile(chosen.name);
    if(chosen.size>MAX_BACKUP_BYTES){setNotice('The backup file exceeds the 950 KB limit.');return;}
    setBusy(true);
    try{
      const value=await chosen.text();
      previewCookbookRestore(value,mode);
      setContent(value);
      setNotice('Backup loaded. Choose an import mode and review the changes before restoring.');
    }catch(error){setNotice((error as Error).message);}
    finally{setBusy(false);event.target.value='';}
  };
  const preview=()=>{
    try{
      setPlan(previewCookbookRestore(content,mode));
      setConfirmReplace(false);
      setNotice('Review the counts, then confirm the restore. Nothing has changed yet.');
    }catch(error){setPlan(null);setNotice((error as Error).message);}
  };
  const restore=()=>{
    if(!plan || plan.mode==='replace'&&!confirmReplace)return;
    try{
      applyCookbookRestore(plan);
      setNotice('Cookbook restore completed. Your saved recipes and collections are ready on this device.');
      setPlan(null);setContent('');setFile('');setConfirmReplace(false);onChange();
    }catch(error){setPlan(null);setNotice((error as Error).message+' Review the file again before retrying.');}
  };
  return <section className="cookbook-backup" aria-label="Cookbook backup and restore">
    <div className="cookbook-backup-intro">
      <div><p className="eyebrow"><ShieldCheck size={15}/> KEEP YOUR RECIPES SAFE</p><h2>Take your cookbook with you.</h2>
        <p>Your saved recipes and collections live in this browser. Export a JSON backup before switching devices or clearing site data.</p></div>
      <div className="cookbook-backup-actions">
        <button type="button" onClick={download}><ArrowDownToLine size={18}/> Export JSON backup</button>
        <button type="button" className="cookbook-backup-secondary" aria-expanded={open} aria-controls="cookbook-restore-panel" onClick={()=>setOpen(!open)}><Upload size={18}/>{open?'Hide restore':'Restore a backup'}</button>
      </div>
    </div>
    {notice&&<p className="cookbook-backup-notice" role="status">{notice}</p>}
    {open&&<div id="cookbook-restore-panel" className="cookbook-restore-panel">
      <div className="cookbook-restore-heading"><div><h3>Restore from a Mise backup</h3><p>Only version 1 Mise JSON backups are accepted. Your file is checked locally before any data changes.</p></div>
        <button type="button" aria-label="Close restore panel" onClick={()=>setOpen(false)}><X size={18}/></button>
      </div>
      <label className="cookbook-file-input"><FileJson2 size={20}/> Select JSON backup
        <input type="file" accept=".json,application/json" onChange={event=>void readFile(event)} disabled={busy}/>
      </label>
      {file&&<p className="cookbook-file-name">Selected: {file}</p>}
      <fieldset className="cookbook-restore-modes"><legend>Choose how to restore</legend>
        <label><input type="radio" name="cookbook-restore-mode" checked={mode==='merge'} onChange={()=>{setMode('merge');setPlan(null);}}/>
          <span><strong>Merge safely</strong><small>Keep existing recipes. Skip duplicates or conflicting IDs; add new recipes and collections.</small></span>
        </label>
        <label><input type="radio" name="cookbook-restore-mode" checked={mode==='replace'} onChange={()=>{setMode('replace');setPlan(null);setConfirmReplace(false);}}/>
          <span><strong>Replace this cookbook</strong><small>Overwrite saved personal recipes, favourites and collections using the backup file.</small></span>
        </label>
      </fieldset>
      <button type="button" className="cookbook-preview-button" disabled={!content||busy} onClick={preview}>Preview changes</button>
      {plan&&<div className="cookbook-restore-preview">
        <h4>Review your restore</h4><dl>
          <div><dt>New personal recipes</dt><dd>{plan.added}</dd></div>
          <div><dt>Identical duplicates skipped</dt><dd>{plan.duplicate}</dd></div>
          <div><dt>Conflicting recipes preserved</dt><dd>{plan.conflicting}</dd></div>
          <div><dt>New collections</dt><dd>{plan.collectionAdded}</dd></div>
          <div><dt>Recipes replaced</dt><dd>{plan.replaced}</dd></div>
          <div><dt>Total recipes after restore</dt><dd>{plan.recipes.length}</dd></div>
        </dl>
        {plan.mode==='replace'&&<label className="cookbook-confirm-replace"><input type="checkbox" checked={confirmReplace} onChange={e=>setConfirmReplace(e.target.checked)}/>
          I understand that replacing will overwrite my current personal recipes, favourites and collections. I have exported my current cookbook.</label>}
        <button className="cookbook-confirm-restore" type="button" disabled={plan.mode==='replace'&&!confirmReplace} onClick={restore}><Check size={17}/> Confirm {plan.mode==='replace'?'replacement':'merge'}</button>
      </div>}
      <p className="cookbook-restore-privacy"><strong>Local and private:</strong> The file is read in your browser, never uploaded. Backups contain recipes, collection names and favourite IDs (including any source URLs), but not active timers or cooking progress. They do not include shopping lists. You can restore the same file on another device manually.</p>
    </div>}
  </section>;
}