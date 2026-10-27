import { useEffect, useState } from 'react';
import { Clock } from '@phosphor-icons/react/dist/csr/Clock';
import { Pause } from '@phosphor-icons/react/dist/csr/Pause';
import { Play } from '@phosphor-icons/react/dist/csr/Play';
import { Plus } from '@phosphor-icons/react/dist/csr/Plus';
import { ArrowCounterClockwise } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise';
import { Trash } from '@phosphor-icons/react/dist/csr/Trash';
import type { Recipe } from '../data/recipes';
import { MAX_TIMERS, createTimer, formatIngredient, loadMeasureSystem, loadPrep, loadTimers, pauseTimer, reconcileTimers, resetTimer, saveMeasureSystem, savePrep, saveTimers, startTimer, suggestSwap, type CompanionTimer, type MeasureSystem } from '../lib/companion';

export function PrepChecklist({ recipe }: { recipe: Recipe }) {
 const [checked,setChecked]=useState<string[]>(()=>loadPrep(recipe));
 const [message,setMessage]=useState('');
 useEffect(()=>{
  const sync=()=>setChecked(loadPrep(recipe));
  window.addEventListener('storage',sync);
  window.addEventListener('mise:prep-updated',sync);
  return()=>{window.removeEventListener('storage',sync);window.removeEventListener('mise:prep-updated',sync)};
 },[recipe]);
 const toggle=(id:string)=>{
  const next=checked.includes(id)?checked.filter(value=>value!==id):[...checked,id];
  if(savePrep(recipe,next)){setChecked(next);setMessage('Preparation saved on this device.')}
  else setMessage('Preparation could not be saved on this device.');
 };
 return <section className="companion-section companion-prep" aria-label="Real-world preparation checklist">
  <header><h3>Prep ingredients</h3><span>{checked.length}/{recipe.ingredients.length} ready</span></header>
  <p className="companion-help">Check off what you have prepared in your real kitchen. This does not affect the virtual pan.</p>
  <ul>{recipe.ingredients.map(item=><li key={item.id}><label><input type="checkbox" aria-label={'Prepare '+item.name} checked={checked.includes(item.id)} onChange={()=>toggle(item.id)}/><span>{item.name}</span></label></li>)}</ul>
  <span className="visually-hidden" role="status">{message}</span>
 </section>;
}

export function IngredientGuide({recipe,servings}:{recipe:Recipe;servings:number}) {
 const [system,setSystem]=useState<MeasureSystem>(()=>loadMeasureSystem());
 const change=(next:MeasureSystem)=>{setSystem(next);saveMeasureSystem(next);};
 return <section className="companion-section companion-guide" aria-label="Ingredient measures and substitutions">
  <header><h3>Measurements & swaps</h3></header>
  <fieldset className="companion-units"><legend>Measurement system</legend>
   <label><input type="radio" name={'units-'+recipe.id} checked={system==='metric'} onChange={()=>change('metric')}/> Metric</label>
   <label><input type="radio" name={'units-'+recipe.id} checked={system==='us'} onChange={()=>change('us')}/> US</label>
  </fieldset>
  <ul>{recipe.ingredients.map(item=>{
   const swap=suggestSwap(item);
   return <li key={item.id}>
    <div className="companion-amount-row"><span>{item.name}</span><strong>{formatIngredient(item,servings,recipe.servings,system)}</strong></div>
    {swap&&<details><summary>Possible substitute for {item.name}</summary><p><strong>{swap.name}.</strong> {swap.note}</p></details>}
   </li>;
  })}</ul>
  <p className="companion-help">Mass and liquid volumes use standard conversions; spoon measures and whole ingredients stay as written. We never guess ingredient density. Substitutions can change taste, texture, allergens and cooking time: check labels and dietary needs.</p>
 </section>;
}

const clock=(seconds:number)=>Math.floor(Math.max(0,seconds)/60).toString().padStart(2,'0')+':'+(Math.max(0,seconds)%60).toString().padStart(2,'0');
export function RecipeTimers({recipe,currentStep}:{recipe:Recipe;currentStep:number}){
 const [timers,setTimers]=useState<CompanionTimer[]>(()=>loadTimers(recipe.id));
 const [label,setLabel]=useState('');
 const [minutes,setMinutes]=useState(5);
 const [message,setMessage]=useState('');
 const apply=(fn:(timers:CompanionTimer[])=>CompanionTimer[])=>{
  setTimers(previous=>{
   const updated=fn(reconcileTimers(previous));
   if(!saveTimers(recipe.id,updated)){setMessage('Timer storage is unavailable.');return previous;}
   return updated;
  });
 };
 useEffect(()=>{
  const tick=()=>setTimers(previous=>{
   const updated=reconcileTimers(previous);
   return updated.some((timer,i)=>timer!==previous[i])?updated:previous;
  });
  const id=window.setInterval(tick,1000);
  const onVisible=()=>{if(document.visibilityState==='visible')tick()};
  const onStorage=(event:StorageEvent)=>{if(event.key==='mise:timers:v1:'+recipe.id)setTimers(loadTimers(recipe.id));};
  window.addEventListener('focus',tick);
  window.addEventListener('storage',onStorage);
  document.addEventListener('visibilitychange',onVisible);
  return()=>{window.clearInterval(id);window.removeEventListener('focus',tick);window.removeEventListener('storage',onStorage);document.removeEventListener('visibilitychange',onVisible)};
 },[recipe.id]);
 useEffect(()=>{saveTimers(recipe.id,timers);},[recipe.id,timers]);
 const add=(name:string,duration:number)=>{
  if(timers.length>=MAX_TIMERS){setMessage('Maximum five timers. Remove one to add another.');return;}
  const id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  const timer=createTimer(name,duration,id);
  if(!timer){setMessage('Choose a name and 1 to 180 whole minutes.');return;}
  apply(previous=>[...previous,timer]);
  setMessage('Added paused timer. Press Start when ready.');
 };
 return <section className="companion-section companion-timers" aria-label="Independent kitchen timers">
  <header><h3><Clock size={17}/> Kitchen timers</h3><span>{timers.length}/{MAX_TIMERS}</span></header>
  <p className="companion-help">Up to five independent timers, stored on this device. Running timers use real elapsed time even when this tab is hidden. Background alarms aren't guaranteed; check food when you return.</p>
  <div className="companion-timer-add">
   <button type="button" onClick={()=>add(recipe.steps[currentStep].title,recipe.steps[currentStep].minutes)}><Plus size={15}/> Add step timer</button>
   <label>Timer name<input aria-label="Custom timer name" maxLength={90} placeholder="e.g. Potatoes" value={label} onChange={e=>setLabel(e.target.value)}/></label>
   <label>Minutes<input aria-label="Custom timer minutes" type="number" min={1} max={180} step={1} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></label>
   <button type="button" disabled={!label.trim()||!Number.isInteger(minutes)||minutes<1||minutes>180} onClick={()=>add(label,minutes)}><Plus size={15}/> Add custom</button>
  </div>
  <ul className="companion-timer-list">{timers.map(timer=><li key={timer.id}>
   <div className="companion-timer-heading"><strong>{timer.label}</strong><span>{timer.status==='finished'?'Finished':timer.status==='running'?'Running':'Paused'}</span></div>
   <output aria-label={timer.label+' remaining '+clock(timer.remainingSeconds)}>{clock(timer.remainingSeconds)}</output>
   <div className="companion-timer-actions">
    {timer.status==='running'
      ? <button type="button" aria-label={'Pause '+timer.label} onClick={()=>apply(current=>current.map(t=>t.id===timer.id?pauseTimer(t):t))}><Pause size={16}/> Pause</button>
      : <button type="button" aria-label={'Start '+timer.label} onClick={()=>apply(current=>current.map(t=>t.id===timer.id?startTimer(t):t))}><Play size={16}/> {timer.status==='finished'?'Restart':'Start'}</button>}
    <button type="button" aria-label={'Reset '+timer.label} onClick={()=>apply(current=>current.map(t=>t.id===timer.id?resetTimer(t):t))}><ArrowCounterClockwise size={16}/></button>
    <button type="button" aria-label={'Remove '+timer.label} onClick={()=>apply(current=>current.filter(t=>t.id!==timer.id))}><Trash size={16}/></button>
   </div>
  </li>)}</ul>
  {timers.length===0&&<p className="companion-help">Timers start paused, independently of the existing step timer.</p>}
  <span role="status" className="companion-notice">{message}{timers.some(timer=>timer.status==='finished')?' A timer finished. Check your food.':''}</span>
 </section>;
}
