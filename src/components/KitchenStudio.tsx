import { diagnostics } from '../lib/diagnostics';
import { useStepDirection } from '../motion/useStepDirection';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { ArrowRight } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { Check } from '@phosphor-icons/react/dist/csr/Check';
import { ChefHat } from '@phosphor-icons/react/dist/csr/ChefHat';
import { Clock } from '@phosphor-icons/react/dist/csr/Clock';
import { Fire } from '@phosphor-icons/react/dist/csr/Fire';
import { Minus } from '@phosphor-icons/react/dist/csr/Minus';
import { Pause } from '@phosphor-icons/react/dist/csr/Pause';
import { Play } from '@phosphor-icons/react/dist/csr/Play';
import { Plus } from '@phosphor-icons/react/dist/csr/Plus';
import { ArrowCounterClockwise } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise';
import { Timer } from '@phosphor-icons/react/dist/csr/Timer';
import { ForkKnife } from '@phosphor-icons/react/dist/csr/ForkKnife';
import CookingControls from './CookingControls';
import type { KitchenPulse } from './KitchenEffects';
import { applyCookingAction, getCookingRequirements, initialKitchenProgress, isReadyToPlate, type CookingAction } from '../lib/cooking';
import { playCookingCue, cookingHaptic } from '../lib/cooking-sound';
import LiteKitchenScene from './LiteKitchenScene';
// Rapier/physics are intentionally loaded only after the visitor enables the simulation.
const PhysicsKitchenScene = lazy(() => import('./KitchenScene'));
const CookMode = lazy(() => import('./CookMode'));
import SceneErrorBoundary, { SupportsWebGL } from './SceneErrorBoundary';
import type { Recipe } from '../data/recipes';
import { allRecipes } from '../lib/personal-cookbook';
import { addRecipeToShoppingList, loadKitchenSnapshot, saveKitchenSnapshot, clearKitchenSnapshot } from '../lib/kitchen-storage';
import { ClipboardText } from '@phosphor-icons/react/dist/csr/ClipboardText';
import { CornersOut } from '@phosphor-icons/react/dist/csr/CornersOut';
import { Gauge } from '@phosphor-icons/react/dist/csr/Gauge';

type Props = { recipe: Recipe; onRecipeChange: (id: string) => void };
const formatTime = (seconds: number) => [Math.floor(seconds / 60), seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
const formatAmount = (amount: number) => Number.isInteger(amount) ? String(amount) : amount.toFixed(1).replace(/\.0$/, '');

export default function KitchenStudio({ recipe, onRecipeChange }: Props) {
  const [restored] = useState(() => loadKitchenSnapshot(recipe));
  const [physicsEnabled, setPhysicsEnabled] = useState(false);
  const [cookModeOpen, setCookModeOpen] = useState(() => new URLSearchParams(window.location.search).get('view') === 'cook');
  const closeCookMode = useCallback(() => setCookModeOpen(false), []);
  const [graphics, setGraphics] = useState<'eco' | 'balanced' | 'high'>(() => {
    try {
      const value = localStorage.getItem('mise:graphics');
      if (value === 'eco' || value === 'balanced' || value === 'high') return value;
    } catch { /* Private browsing or storage denied. */ }
    return window.matchMedia('(max-width: 760px)').matches ? 'eco' : 'balanced';
  });
  const [stepIndex, setStepIndex] = useState(restored.stepIndex);
  const [added, setAdded] = useState<string[]>(restored.added);
  const [heat, setHeat] = useState(restored.heat);
  const [servings, setServings] = useState(restored.servings);
  const [seconds, setSeconds] = useState(restored.seconds ?? recipe.steps[restored.stepIndex].minutes * 60);
  const [running, setRunning] = useState(false);
  const timerDeadline = useRef<number | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const [time, setTime] = useState(() => new Date());
  const [timerNotice, setTimerNotice] = useState('');
  const [progress, setProgress] = useState(restored.progress);
  const [shoppingNote, setShoppingNote] = useState('');
  const [pulse, setPulse] = useState<KitchenPulse>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('mise:sound') === 'on'; } catch { return false; }
  });
  const changeSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    try { localStorage.setItem('mise:sound', enabled ? 'on' : 'off'); } catch { /* optional preference */ }
  };
  const [actionFeedback, setActionFeedback] = useState('Try chopping an ingredient to begin.');
  useEffect(() => { try { localStorage.setItem('mise:graphics', graphics); } catch { /* optional preference */ } }, [graphics]);

  // KitchenGateway is keyed by recipe, so switching recipes remounts this studio.
  // The state from this device is restored before the first interactive frame.
  useEffect(() => {
    saveKitchenSnapshot(recipe, { stepIndex, added, heat, servings, progress, seconds });
  }, [recipe, stepIndex, added, heat, servings, progress, seconds]);

  // Do not discard a saved countdown when the component first mounts. Only
  // restart the timer when the user actually changes the recipe step.
  const previousTimerStep = useRef(stepIndex);
  useEffect(() => {
    if (previousTimerStep.current === stepIndex) return;
    previousTimerStep.current = stepIndex;
    setSeconds(recipe.steps[stepIndex].minutes * 60);
    setRunning(false);
    setTimerNotice('');
  }, [stepIndex, recipe.steps]);

  useEffect(() => {
    if (!running) return;
    timerDeadline.current = Date.now() + seconds * 1000;
    const interval = window.setInterval(() => {
      const deadline = timerDeadline.current;
      if (deadline !== null) setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 250);
    return () => { window.clearInterval(interval); timerDeadline.current = null; };
    // Only restart the deadline when the timer is toggled, not on each tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    const recalculate = () => {
      if (document.visibilityState === 'hidden') return;
      if (timerDeadline.current !== null) setSeconds(Math.max(0,Math.ceil((timerDeadline.current - Date.now()) / 1000)));
    };
    document.addEventListener('visibilitychange',recalculate);
    window.addEventListener('focus',recalculate);
    window.addEventListener('pageshow',recalculate);
    return () => {document.removeEventListener('visibilitychange',recalculate);window.removeEventListener('focus',recalculate);window.removeEventListener('pageshow',recalculate);};
  },[]);

  useEffect(() => {
    if (seconds === 0 && running) {
      setRunning(false);
      setTimerNotice('Time is up. Check your food!');
    }
  }, [seconds, running]);

  useEffect(() => {
    const interval = window.setInterval(() => setTime(new Date()), 15000);
    return () => window.clearInterval(interval);
  }, []);

  const activityStarted = useRef<number | null>(null);
  const beginActivity = () => { activityStarted.current ??= performance.now(); };
  const abandonActivity = useCallback((code: 'page_left' | 'reset') => {
    if (activityStarted.current === null) return;
    diagnostics.record('cooking_session', 'abandoned', { code, durationMs: performance.now() - activityStarted.current });
    activityStarted.current = null;
  }, []);
  useEffect(() => {
    const leave = () => abandonActivity('page_left');
    window.addEventListener('pagehide', leave);
    return () => { window.removeEventListener('pagehide', leave); leave(); };
  }, [abandonActivity]);
  const changeStep = (next: number) => {
    if (next === stepIndex) return;
    if (!progress.plated) beginActivity();
    diagnostics.record('cooking_step', 'success', { code: next > stepIndex ? 'forward' : 'backward' });
    setStepIndex(next);
  };
  const addIngredient = useCallback((id: string) => {
    if (added.includes(id)) return;
    beginActivity();
    diagnostics.record('cooking_ingredient', 'success');
    setAdded(current => current.includes(id) ? current : [...current, id]);
  }, [added]);
  const requirements = getCookingRequirements(progress, added.length, recipe.ingredients.length, heat, stepIndex, recipe.steps.length);
  const cookingAction = useCallback((action: CookingAction) => {
    if (progress.plated) return;
    if (action === 'plate' && !isReadyToPlate(getCookingRequirements(progress, added.length, recipe.ingredients.length, heat, stepIndex, recipe.steps.length))) {
      diagnostics.record('cooking_plate', 'failure', { code: 'prerequisites' });
      return;
    }
    if (action === 'stir' && (heat <= 0 || added.length === 0)) {
      diagnostics.record('cooking_stir', 'failure', { code: 'prerequisites' });
      setActionFeedback('Turn up the heat and add ingredients before stirring.');
      return;
    }
    const next = applyCookingAction(progress, action);
    if (next === progress || (action !== 'plate' && next.chops === progress.chops && next.pours === progress.pours && next.stirs === progress.stirs)) return;
    beginActivity();
    diagnostics.record('cooking_' + action, 'success');
    if (action === 'plate') {
      diagnostics.record('cooking_session', 'success', { durationMs: performance.now() - activityStarted.current! });
      activityStarted.current = null;
    }
    setProgress(next);
    setPulse(previous => ({ action, id: (previous?.id || 0) + 1 }));
    if (action === 'plate') { setRunning(false); setHeat(0); }
    setActionFeedback({
      chop: 'Freshly chopped · ' + next.chops + ' of 4 cuts.',
      pour: 'Poured into the pan · ' + next.pours + ' of 3 pours.',
      stir: 'Pan stirred · ' + next.stirs + ' of 6 stirs.',
      plate: 'Ready to serve. Bon appétit!',
    }[action]);
    playCookingCue(action, soundEnabled, heat);
    cookingHaptic(action);
  }, [progress, added.length, recipe.ingredients.length, recipe.steps.length, heat, stepIndex, soundEnabled]);
  const resetKitchen = () => {
    abandonActivity('reset');
    clearKitchenSnapshot(recipe.id);
    setShoppingNote('');
    setAdded([]);
    setHeat(.35);
    setProgress(initialKitchenProgress());
    setPulse(null);
    setStepIndex(0);
    setRunning(false);
    setSeconds(recipe.steps[0].minutes * 60);
    setActionFeedback('Kitchen reset. Your recipe is ready to start again.');
    setResetCount(count => count + 1);
  };
  const direction = useStepDirection(stepIndex);
  const step = recipe.steps[stepIndex];
  const stepProgress = (stepIndex + 1) / recipe.steps.length;
  const timerTotal = Math.max(1, step.minutes * 60);
  const timerProgress = Math.max(0, Math.min(1, seconds / timerTotal));
  const clockText = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const toggleTimer = () => { if (seconds === 0) setSeconds(timerTotal); setTimerNotice(''); setRunning(value => !value); };
  const resetTimer = () => { setRunning(false); setSeconds(timerTotal); setTimerNotice(''); };
  const addMinute = () => { if (timerDeadline.current !== null) timerDeadline.current += 60000; setSeconds(value => value + 60); };

  return <section className="studio-section" id="cooking-studio">
    <div className="section-head studio-heading">
      <div>
        <p className="eyebrow"><span className="eyebrow-dot" /> Your kitchen</p>
        <h2>Set out your<br /><em>ingredients.</em></h2>
      </div>
      <p>Try the recipe in the interactive kitchen, or open Cook Mode for large instructions and a step timer.</p>
    </div>

    <div className="studio-shell">
      <div className="studio-visual">
        <div className="scene-topbar">
          <span className="scene-live"><span /> Interactive kitchen</span>
          <span className="local-clock"><Clock size={15} /> {clockText}</span>
          <div className="scene-actions">
            <button type="button" className="physics-mode-toggle" aria-pressed={physicsEnabled} onClick={() => setPhysicsEnabled(enabled => !enabled)} title={physicsEnabled ? 'Switch to the lighter kitchen' : 'Let ingredients tumble and settle naturally'}>
              {physicsEnabled ? 'Physics on' : 'Quick 3D'} <span className="physics-status-dot" aria-hidden="true" />
            </button>
            <label className="graphics-mode-control" title="3D graphics quality"><Gauge size={14}/><span className="visually-hidden">Graphics quality</span><select aria-label="Graphics quality" value={graphics} onChange={event => setGraphics(event.target.value as 'eco'|'balanced'|'high')}><option value="eco">Eco</option><option value="balanced">Balanced</option><option value="high">High</option></select></label>
            <button className="scene-icon-button" type="button" onClick={resetKitchen} aria-label="Reset 3D kitchen" title="Reset 3D kitchen"><ArrowCounterClockwise size={16} /></button>
          </div>
        </div>
        <SceneErrorBoundary><SupportsWebGL>
          <div className="kitchen-scene-outer">
          {physicsEnabled
            ? <Suspense fallback={<p className="physics-loader" role="status">Loading realistic motion…</p>}><PhysicsKitchenScene quality={graphics} ingredients={recipe.ingredients} added={added} heat={heat} onAdd={addIngredient} resetKey={recipe.id + '-' + resetCount} progress={progress} pulse={pulse} onAction={cookingAction} /></Suspense>
            : <LiteKitchenScene quality={graphics} ingredients={recipe.ingredients} added={added} heat={heat} onAdd={addIngredient} resetKey={recipe.id + '-' + resetCount} progress={progress} pulse={pulse} onAction={cookingAction} />}
            {progress.plated && <p className="kitchen-finished-overlay" role="status">Bon appétit!</p>}
          </div>
        </SupportsWebGL></SceneErrorBoundary>
        <div className="scene-bottom">
          <div className="scene-hint">
            <span className="gesture-symbol"><ForkKnife size={17} /></span>
            <div><strong>Get hands-on</strong><small>Drag ingredients into the pan. Tap utensils, drag the worktop to look around, or pinch to zoom. You can also use the recipe controls.</small></div>
          </div>
          <div className="heat-control">
            <label htmlFor="burner-heat"><Fire size={16} /> Heat <strong>{heat < .05 ? 'Off' : heat < .4 ? 'Low' : heat < .75 ? 'Medium' : 'High'}</strong></label>
            <input id="burner-heat" aria-label="Burner heat" type="range" min="0" max="1" step=".05" value={heat} onChange={e => setHeat(Number(e.target.value))} style={{ '--heat': (heat * 100) + '%' } as React.CSSProperties} />
          </div>
        </div>
      </div>

      <aside className="studio-panel" aria-label="Guided recipe and cooking controls">
        <div className="panel-menu-label">
          <span>Recipe</span>
          <ChefHat size={18} />
        </div>
        <label className="visually-hidden" htmlFor="recipe-switch">Choose recipe</label>
        <select id="recipe-switch" className="recipe-switch" value={recipe.id} onChange={e => onRecipeChange(e.target.value)}>
          {allRecipes().map(item => <option key={item.id} value={item.id}>{item.name} — {item.country}</option>)}
        </select>
        <h3>{recipe.name}</h3>
        <p className="panel-story">{recipe.story}</p>
        <div className="panel-facts"><span><Clock size={14} /> {recipe.minutes} min</span><span>{recipe.country}</span><span>{recipe.difficulty}</span></div>
        <button className="cook-mode-launch" type="button" onClick={() => setCookModeOpen(true)}><CornersOut size={19}/> <span><strong>Enter Cook Mode</strong><small>Large steps, timer and optional voice guidance</small></span><ArrowRight size={19}/></button>
        <div className="panel-rule" />

        <div className="method-topline"><span>Method</span><span>{String(stepIndex + 1).padStart(2, '0')} / {String(recipe.steps.length).padStart(2, '0')}</span></div>
        <div className="step-progress" aria-label={'Step ' + (stepIndex + 1) + ' of ' + recipe.steps.length}>
          {recipe.steps.map((_, i) => <button key={i} type="button" aria-label={'Go to step ' + (i + 1)} aria-current={i === stepIndex ? 'step' : undefined} className={i <= stepIndex ? 'is-complete' : ''} onClick={() => changeStep(i)} />)}
        </div>
        <div className="method-card" key={recipe.id + stepIndex} data-direction={direction}>
          <span className="step-number">STEP {String(stepIndex + 1).padStart(2, '0')}</span>
          <h4>{step.title}</h4>
          <p>{step.instruction}</p>
          <div className="chef-tip"><span>CHEF'S NOTE</span><p>{step.tip}</p></div>
        </div>
        <div className="step-navigation">
          <button type="button" className="round-outline" aria-label="Previous step" onClick={() => changeStep(Math.max(0, stepIndex - 1))} disabled={stepIndex === 0}><ArrowLeft size={19} /></button>
          <span>{Math.round(stepProgress * 100)}% of the way there</span>
          <button type="button" className="round-dark" aria-label="Next step" onClick={() => changeStep(Math.min(recipe.steps.length - 1, stepIndex + 1))} disabled={stepIndex === recipe.steps.length - 1}><ArrowRight size={19} /></button>
        </div>

        <div className="timer-card">
          <div className="timer-face" style={{ '--timer-progress': (timerProgress * 100) + '%' } as React.CSSProperties}>
            <div><Timer size={15} /><strong>{formatTime(seconds)}</strong></div>
          </div>
          <div className="timer-info">
            <span>STEP TIMER</span>
            <strong>Good things take time.</strong>
            <small aria-live="polite">{timerNotice || (running ? 'Counting down...' : 'Ready when you are')}</small>
            <div className="timer-buttons">
              <button type="button" className="timer-play" onClick={toggleTimer} aria-label={running ? 'Pause timer' : 'Start timer'}>{running ? <Pause size={15} weight="fill" /> : <Play size={15} weight="fill" />}{running ? 'Pause' : 'Start'}</button>
              <button type="button" className="timer-small" onClick={resetTimer} aria-label="Reset timer"><ArrowCounterClockwise size={15} /></button>
              <button type="button" className="timer-small" onClick={addMinute} aria-label="Add one minute"><Plus size={15} /></button>
            </div>
          </div>
        </div>

        <div className="ingredients-heading">
          <div><span>Ingredients</span><small>{added.length} of {recipe.ingredients.length} in the pan</small></div>
          <div className="serving-controls" aria-label="Adjust servings">
            <button type="button" onClick={() => setServings(value => Math.max(1, value - 1))} aria-label="Fewer servings"><Minus size={13} /></button>
            <span>{servings} {servings === 1 ? 'serving' : 'servings'}</span>
            <button type="button" onClick={() => setServings(value => Math.min(12, value + 1))} aria-label="More servings"><Plus size={13} /></button>
          </div>
        </div>
        <div className="ingredient-list">
          {recipe.ingredients.map(ingredient => {
            const isAdded = added.includes(ingredient.id);
            return <div className={'ingredient-row ' + (isAdded ? 'ingredient-added' : '')} key={ingredient.id}>
              <button type="button" className="ingredient-check" aria-label={(isAdded ? 'Added ' : 'Add ') + ingredient.name + ' to pan'} onClick={() => addIngredient(ingredient.id)} aria-pressed={isAdded}><Check size={14} /></button>
              <span className="ingredient-name">{ingredient.name}</span>
              <span className="ingredient-amount">{formatAmount(ingredient.amount * servings / recipe.servings)} {ingredient.unit}</span>
            </div>;
          })}
        </div>
        <div className="studio-shopping">
          <button type="button" onClick={() => { const count = addRecipeToShoppingList(recipe, servings); setShoppingNote(count < 0 ? 'Could not save list on this device.' : count ? count + ' ingredients added.' : 'These ingredients are already on your list.'); }}><ClipboardText size={17}/> Add ingredients to shopping list</button>
          <a href="/shopping/">Open list <ArrowRight size={15}/></a>
        </div>
        {shoppingNote && <p className="studio-shopping-status" role="status">{shoppingNote}</p>}
        <CookingControls progress={progress} requirements={requirements} ingredientCount={recipe.ingredients.length} addedCount={added.length} heat={heat} sound={soundEnabled} onSoundChange={changeSound} onAction={cookingAction} />
        <p className="cooking-action-feedback" role="status" aria-live="polite">{actionFeedback}</p>
        <p className="ingredient-disclaimer">The 3D ingredients are playful representations. Follow the written recipe and cook food safely in your real kitchen.</p>
      </aside>
    </div>
    {cookModeOpen && <Suspense fallback={<p role="status" className="cook-mode-loading">Preparing Cook Mode…</p>}>
      <CookMode recipe={recipe} stepIndex={stepIndex} onStep={changeStep} added={added} onAdd={addIngredient} servings={servings} seconds={seconds} running={running} onTimerToggle={toggleTimer} onTimerReset={resetTimer} onTimerAdd={addMinute} heat={heat} onHeat={setHeat} progress={progress} onAction={cookingAction} close={closeCookMode}/>
    </Suspense>}
  </section>;
}
