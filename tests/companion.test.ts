import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recipes, type Ingredient } from '../src/data/recipes';
import { createTimer, formatIngredient, loadMeasureSystem, loadPrep, loadTimers, pauseTimer, reconcileTimers, resetTimer, saveMeasureSystem, savePrep, saveTimers, startTimer, suggestSwap } from '../src/lib/companion';
function memoryStorage(){
 const values=new Map<string,string>();
 return {getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,String(v))},removeItem:(k:string)=>{values.delete(k)}};
}
beforeEach(()=>{vi.stubGlobal('localStorage',memoryStorage());vi.stubGlobal('window',{dispatchEvent:()=>true});vi.stubGlobal('Event',class{constructor(public type:string){}})});
afterEach(()=>vi.unstubAllGlobals());
const item=(amount:number,unit:string):Ingredient=>({id:'test',name:'Example',kind:'herb',amount,unit});
describe('honest cooking measurements',()=>{
 it('converts exact mass and volume dimensions to US units',()=>{
  expect(formatIngredient(item(100,'g'),2,2,'us')).toBe('3.5 oz');
  expect(formatIngredient(item(400,'g'),2,2,'us')).toBe('14.1 oz');
  expect(formatIngredient(item(250,'ml'),2,2,'us')).toBe('8.5 US fl oz');
  expect(formatIngredient(item(1,'kg'),2,2,'us')).toBe('2.2 lb');
  expect(formatIngredient(item(1,'l'),2,2,'us')).toBe('1.1 US qt');
 });
 it('does not silently infer ingredient density or reinterpret spoons/counts',()=>{
  expect(formatIngredient(item(2,'tbsp'),2,2,'us')).toBe('2 tbsp');
  expect(formatIngredient(item(3,'whole'),2,2,'us')).toBe('3 whole');
  expect(formatIngredient(item(200,'g'),1,2,'metric')).toBe('100 g');
  expect(formatIngredient(item(2,'tsp'),1,2,'us')).toBe('1 tsp');
 });
 it('offers only curated swaps with caveats, not fabricated allergen-free equivalents',()=>{
  expect(suggestSwap({...item(1,'whole'),name:'Red bell pepper'})?.note).toContain('same number');
  expect(suggestSwap({...item(4,'whole'),name:'Eggs'})).toBeNull();
  expect(suggestSwap({...item(120,'g'),name:'Spinach'})?.note).toContain('cook longer');
 });
 it('persists the measurement preference locally',()=>{
  expect(loadMeasureSystem()).toBe('metric');
  expect(saveMeasureSystem('us')).toBe(true);
  expect(loadMeasureSystem()).toBe('us');
 });
});
describe('real-world preparation checklist',()=>{
 it('stores per-recipe ingredient preparation independently of virtual cooking state',()=>{
  const recipe=recipes[0],other=recipes[1],id=recipe.ingredients[0].id;
  expect(savePrep(recipe,[id,id,'unknown'])).toBe(true);
  expect(loadPrep(recipe)).toEqual([id]);
  expect(loadPrep(other)).toEqual([]);
  expect(localStorage.getItem('mise:progress:v1:'+recipe.id)).toBeNull();
 });
});
describe('independent wall-clock timers',()=>{
 it('creates paused timers and preserves five per recipe without starting them',()=>{
  const timer=createTimer('Oven',10,'oven')!;
  expect(timer.status).toBe('paused');
  expect(createTimer('invalid',0,'x')).toBeNull();
  expect(createTimer('invalid',181,'x')).toBeNull();
  expect(createTimer('invalid',1.5,'x')).toBeNull();
  expect(saveTimers('shakshuka',[timer])).toBe(true);
  expect(loadTimers('shakshuka')).toEqual([timer]);
  expect(loadTimers('bibimbap')).toEqual([]);
 });
 it('uses absolute deadlines so background throttling and reload do not stall time',()=>{
  const t=createTimer('Potatoes',5,'a')!;
  const running=startTimer(t,1000);
  expect(running.deadline).toBe(301000);
  const after=reconcileTimers([running],121000);
  expect(after[0].remainingSeconds).toBe(180);
  expect(pauseTimer(running,121000).remainingSeconds).toBe(180);
  const done=reconcileTimers([running],301200)[0];
  expect(done.status).toBe('finished');
  expect(done.remainingSeconds).toBe(0);
  expect(startTimer(done,400000).remainingSeconds).toBe(300);
 });
 it('runs one timer independently and safely pauses/resets another',()=>{
  const a=createTimer('Rice',5,'a')!,b=createTimer('Vegetables',10,'b')!;
  const running=startTimer(a,10000);
  expect(reconcileTimers([running,b],70000).map(x=>x.remainingSeconds)).toEqual([240,600]);
  expect(pauseTimer(running,70000).status).toBe('paused');
  expect(resetTimer(running).remainingSeconds).toBe(300);
 });
 it('rejects malformed persisted records and safely reconciles time when reloaded',()=>{
  const running=startTimer(createTimer('Pasta',2,'p')!,10000);
  saveTimers('pasta',[running]);
  expect(loadTimers('pasta',80000)[0].remainingSeconds).toBe(50);
  localStorage.setItem('mise:timers:v1:pasta',JSON.stringify([{id:'bad',label:'A',durationSeconds:-2,status:'running',deadline:99,remainingSeconds:10}]));
  expect(loadTimers('pasta')).toEqual([]);
 });
});
