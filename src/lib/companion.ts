import type { Ingredient, Recipe } from '../data/recipes';
export type MeasureSystem = 'metric' | 'us';
export type TimerStatus = 'paused' | 'running' | 'finished';
export type CompanionTimer = { id:string;label:string;durationSeconds:number;remainingSeconds:number;deadline:number|null;status:TimerStatus };
export const MAX_TIMERS=5;
const prepKey=(id:string)=>'mise:prep:v1:'+id;
const timerKey=(id:string)=>'mise:timers:v1:'+id;
const read=(key:string):unknown=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
const write=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
const number=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function loadMeasureSystem():MeasureSystem{try{return localStorage.getItem('mise:units:v1')==='us'?'us':'metric'}catch{return 'metric'}}
export function saveMeasureSystem(value:MeasureSystem){try{localStorage.setItem('mise:units:v1',value);return true}catch{return false}}
export function formatIngredient(item:Ingredient,servings:number,base:number,system:MeasureSystem):string{
  const ratios:Record<string,[number,string]>={g:[1/28.349523125,'oz'],kg:[2.2046226218,'lb'],ml:[1/29.5735295625,'US fl oz'],l:[1.0566882094,'US qt']};
  const ratio=system==='us'?ratios[item.unit]:undefined;
  const value=item.amount*servings/base*(ratio?.[0]??1);
  const digits=ratio?(value<1?2:1):(value<1?2:value<10?1:0);
  return Number(value.toFixed(digits)).toLocaleString('en-US',{maximumFractionDigits:digits})+' '+(ratio?.[1]??item.unit);
}
export type SuggestedSwap={name:string;note:string};
export function suggestSwap(item:Ingredient):SuggestedSwap|null {
 const name=item.name.toLowerCase();
 if(/^red bell peppers?$/.test(name))return{name:'Yellow or orange bell pepper',note:'Use the same number; taste and color change.'};
 if(name==='spinach')return{name:'Kale',note:'Use a similar trimmed weight, remove stems and cook longer.'};
 if(name==='cooked black beans')return{name:'Cooked kidney beans',note:'Use the same cooked weight; taste and texture change.'};
 if(name==='fresh coriander')return{name:'Flat-leaf parsley',note:'Use a similar weight, but flavor differs.'};
 if(name==='mixed mushrooms'||name==='mushrooms')return{name:'Button mushrooms',note:'Use the same weight for a milder flavor.'};
 if(name==='olive oil')return{name:'Neutral vegetable oil',note:'Use the same volume; aroma will differ.'};
 if(name==='lime')return{name:'Lemon',note:'Use similar fresh juice to taste.'};
 if(name==='vegetable stock')return{name:'Water with seasonings',note:'Use the same volume; the result will be less savory.'};
 return null;
}
export function loadPrep(recipe:Recipe):string[]{
 const raw=read(prepKey(recipe.id));
 const validIds=new Set(recipe.ingredients.map(i=>i.id));
 return Array.isArray(raw)?[...new Set(raw.filter((id):id is string=>typeof id==='string'&&validIds.has(id)))]:[];
}
export function savePrep(recipe:Recipe,checked:string[]):boolean{
 const ids=new Set(recipe.ingredients.map(i=>i.id));
 const saved=write(prepKey(recipe.id),[...new Set(checked.filter(id=>ids.has(id)))]);
 if(saved&&typeof window!=='undefined')window.dispatchEvent(new Event('mise:prep-updated'));
 return saved;
}
export function reconcileTimers(timers:CompanionTimer[],now=Date.now()):CompanionTimer[]{
 return timers.map(timer=>{
  if(timer.status!=='running'||timer.deadline===null)return timer;
  const remainingSeconds=Math.max(0,Math.ceil((timer.deadline-now)/1000));
  if(remainingSeconds===0)return{...timer,remainingSeconds:0,deadline:null,status:'finished'};
  return remainingSeconds===timer.remainingSeconds?timer:{...timer,remainingSeconds};
 });
}
export function loadTimers(recipeId:string,now=Date.now()):CompanionTimer[]{
 const raw=read(timerKey(recipeId));
 if(!Array.isArray(raw))return[];
 const timers:CompanionTimer[]=[];
 for(const item of raw.slice(0,MAX_TIMERS)){
  if(!item||typeof item!=='object')continue;
  const value=item as Partial<CompanionTimer>;
  if(typeof value.id!=='string'||value.id.length>90||typeof value.label!=='string'||value.label.length>90||
  !number(value.durationSeconds,1,10800)||!number(value.remainingSeconds,0,10800)||
  !['running','paused','finished'].includes(value.status||''))continue;
  const deadline=value.status==='running'&&number(value.deadline,1,Number.MAX_SAFE_INTEGER)?value.deadline:null;
  timers.push({id:value.id,label:value.label,durationSeconds:value.durationSeconds,remainingSeconds:value.remainingSeconds,
   status:deadline?'running':value.status==='finished'?'finished':'paused',deadline});
 }
 return reconcileTimers(timers,now);
}
export function saveTimers(recipeId:string,timers:CompanionTimer[]):boolean{return write(timerKey(recipeId),timers.slice(0,MAX_TIMERS))}
export function createTimer(label:string,minutes:number,id:string):CompanionTimer|null{
 if(!Number.isInteger(minutes)||minutes<1||minutes>180||!label.trim()||!id)return null;
 const seconds=minutes*60;
 return{id,label:label.trim().slice(0,90),durationSeconds:seconds,remainingSeconds:seconds,deadline:null,status:'paused'};
}
export function startTimer(timer:CompanionTimer,now=Date.now()):CompanionTimer {
 const existing=reconcileTimers([timer],now)[0];
 const seconds=existing.status==='finished'?existing.durationSeconds:existing.remainingSeconds;
 return{...existing,remainingSeconds:seconds,deadline:now+seconds*1000,status:'running'};
}
export function pauseTimer(timer:CompanionTimer,now=Date.now()):CompanionTimer{
 const existing=reconcileTimers([timer],now)[0];
 return existing.status==='running'?{...existing,status:'paused',deadline:null}:existing;
}
export function resetTimer(timer:CompanionTimer):CompanionTimer{
 return{...timer,remainingSeconds:timer.durationSeconds,deadline:null,status:'paused'};
}
