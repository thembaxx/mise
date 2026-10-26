import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChefHat, Clock3, Flame, Minus, Pause, Play, Plus, RotateCcw, Timer, UtensilsCrossed } from 'lucide-react';
import CookingControls from './CookingControls';
import type { KitchenPulse } from './KitchenEffects';
import { applyCookingAction, getCookingRequirements, initialKitchenProgress, isReadyToPlate, type CookingAction } from '../lib/cooking';
import { playCookingCue, cookingHaptic } from '../lib/cooking-sound';
import KitchenScene from './KitchenScene';
import SceneErrorBoundary, { SupportsWebGL } from './SceneErrorBoundary';
import type { Recipe } from '../data/recipes';
import { recipes } from '../data/recipes';

type Props = { recipe: Recipe; onRecipeChange: (id: string) => void };
const formatTime = (seconds: number) => [Math.floor(seconds / 60), seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
const formatAmount = (amount: number) => Number.isInteger(amount) ? String(amount) : amount.toFixed(1).replace(/\.0$/, '');

export default function KitchenStudio({ recipe, onRecipeChange }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [added, setAdded] = useState<string[]>([]);
  const [heat, setHeat] = useState(.35);
  const [servings, setServings] = useState(2);
  const [seconds, setSeconds] = useState(recipe.steps[0].minutes * 60);
  const [running, setRunning] = useState(false);
  const timerDeadline = useRef<number | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const [time, setTime] = useState(() => new Date());
  const [timerNotice, setTimerNotice] = useState('');
  const [progress, setProgress] = useState(initialKitchenProgress);
  const [pulse, setPulse] = useState<KitchenPulse>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('Try chopping an ingredient to begin.');

  useEffect(() => {
    setStepIndex(0);
    setAdded([]);
    setHeat(.35);
    setServings(2);
    setProgress(initialKitchenProgress());
    setPulse(null);
    setActionFeedback('Try chopping an ingredient to begin.');
    setResetCount(count => count + 1);
  }, [recipe.id]);

  useEffect(() => {
    setSeconds(recipe.steps[stepIndex].minutes * 60);
    setRunning(false);
    setTimerNotice('');
  }, [recipe.id, stepIndex, recipe.steps]);

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
    if (seconds === 0 && running) {
      setRunning(false);
      setTimerNotice('Time is up. Check your food!');
    }
  }, [seconds, running]);

  useEffect(() => {
    const interval = window.setInterval(() => setTime(new Date()), 15000);
    return () => window.clearInterval(interval);
  }, []);

  const addIngredient = useCallback((id: string) => setAdded(current => current.includes(id) ? current : [...current, id]), []);
  const requirements = getCookingRequirements(progress, added.length, recipe.ingredients.length, heat, stepIndex, recipe.steps.length);
  const cookingAction = useCallback((action: CookingAction) => {
    if (progress.plated) return;
    if (action === 'plate' && !isReadyToPlate(getCookingRequirements(progress, added.length, recipe.ingredients.length, heat, stepIndex, recipe.steps.length))) return;
    if (action === 'stir' && (heat <= 0 || added.length === 0)) {
      setActionFeedback('Turn up the heat and add ingredients before stirring.');
      return;
    }
    const next = applyCookingAction(progress, action);
    if (next === progress || (action !== 'plate' && next.chops === progress.chops && next.pours === progress.pours && next.stirs === progress.stirs)) return;
    setProgress(next);
    setPulse(previous => ({ action, id: (previous?.id || 0) + 1 }));
    if (action === 'plate') { setRunning(false); setHeat(0); }
    setActionFeedback({
      chop: 'Freshly chopped! Your ingredients are ready for the pan.',
      pour: 'A silky pour. Watch the pan come alive.',
      stir: 'Beautifully stirred. Keep the flavor moving.',
      plate: 'Bon appétit! Your virtual creation is served.',
    }[action]);
    playCookingCue(action, soundEnabled);
    cookingHaptic();
  }, [progress, added.length, recipe.ingredients.length, recipe.steps.length, heat, stepIndex, soundEnabled]);
  const resetKitchen = () => {
    setAdded([]);
    setHeat(.35);
    setProgress(initialKitchenProgress());
    setPulse(null);
    setStepIndex(0);
    setRunning(false);
    setSeconds(recipe.steps[0].minutes * 60);
    setActionFeedback('A fresh start. Pick an ingredient and get cooking.');
    setResetCount(count => count + 1);
  };
  const step = recipe.steps[stepIndex];
  const stepProgress = (stepIndex + 1) / recipe.steps.length;
  const timerTotal = Math.max(1, step.minutes * 60);
  const timerProgress = Math.max(0, Math.min(1, seconds / timerTotal));
  const clockText = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return <section className="studio-section" id="cooking-studio">
    <div className="section-head studio-heading">
      <div>
        <p className="eyebrow"><span className="eyebrow-dot" /> YOUR CREATIVE SPACE</p>
        <h2>Come on in.<br /><em>The kitchen's yours.</em></h2>
      </div>
      <p>Turn a recipe into a little adventure. Pick up an ingredient, drop it in the pan, and find your own rhythm.</p>
    </div>

    <div className="studio-shell">
      <div className="studio-visual">
        <div className="scene-topbar">
          <span className="scene-live"><span /> LIVE INTERACTIVE KITCHEN</span>
          <div className="scene-actions">
            <span className="local-clock"><Clock3 size={15} strokeWidth={1.8} /> {clockText}</span>
            <button className="scene-icon-button" type="button" onClick={resetKitchen} aria-label="Reset 3D kitchen" title="Reset 3D kitchen"><RotateCcw size={16} /></button>
          </div>
        </div>
        <SceneErrorBoundary><SupportsWebGL><KitchenScene ingredients={recipe.ingredients} added={added} heat={heat} onAdd={addIngredient} resetKey={recipe.id + '-' + resetCount} progress={progress} pulse={pulse} onAction={cookingAction} /></SupportsWebGL></SceneErrorBoundary>
        <div className="scene-bottom">
          <div className="scene-hint">
            <span className="gesture-symbol"><UtensilsCrossed size={17} strokeWidth={1.6} /></span>
            <div><strong>Get hands-on</strong><small>Drag ingredients into the pan · Tap utensils · Orbit to explore · Pinch to zoom</small></div>
          </div>
          <div className="heat-control">
            <label htmlFor="burner-heat"><Flame size={16} strokeWidth={1.7} /> Heat <strong>{heat < .05 ? 'Off' : heat < .4 ? 'Low' : heat < .75 ? 'Medium' : 'High'}</strong></label>
            <input id="burner-heat" aria-label="Burner heat" type="range" min="0" max="1" step=".05" value={heat} onChange={e => setHeat(Number(e.target.value))} style={{ '--heat': (heat * 100) + '%' } as React.CSSProperties} />
          </div>
        </div>
        <div className="scene-footnote"><span>01 / PLAY WITH YOUR FOOD</span><span>Built with WebGL + real-time physics</span></div>
      </div>

      <aside className="studio-panel" aria-label="Guided recipe and cooking controls">
        <div className="panel-menu-label">
          <span>WHAT'S COOKING</span>
          <ChefHat size={18} strokeWidth={1.6} />
        </div>
        <label className="visually-hidden" htmlFor="recipe-switch">Choose recipe</label>
        <select id="recipe-switch" className="recipe-switch" value={recipe.id} onChange={e => onRecipeChange(e.target.value)}>
          {recipes.map(item => <option key={item.id} value={item.id}>{item.name} — {item.country}</option>)}
        </select>
        <h3>{recipe.name}</h3>
        <p className="panel-story">{recipe.story}</p>
        <div className="panel-facts"><span><Clock3 size={14} /> {recipe.minutes} min</span><span>{recipe.country}</span><span>{recipe.difficulty}</span></div>
        <div className="panel-rule" />

        <div className="method-topline"><span>LET'S MAKE IT</span><span>{String(stepIndex + 1).padStart(2, '0')} / {String(recipe.steps.length).padStart(2, '0')}</span></div>
        <div className="step-progress" aria-label={'Step ' + (stepIndex + 1) + ' of ' + recipe.steps.length}>
          {recipe.steps.map((_, i) => <button key={i} type="button" aria-label={'Go to step ' + (i + 1)} aria-current={i === stepIndex ? 'step' : undefined} className={i <= stepIndex ? 'is-complete' : ''} onClick={() => setStepIndex(i)} />)}
        </div>
        <div className="method-card" key={recipe.id + stepIndex}>
          <span className="step-number">STEP {String(stepIndex + 1).padStart(2, '0')}</span>
          <h4>{step.title}</h4>
          <p>{step.instruction}</p>
          <div className="chef-tip"><span>CHEF'S NOTE</span><p>{step.tip}</p></div>
        </div>
        <div className="step-navigation">
          <button type="button" className="round-outline" aria-label="Previous step" onClick={() => setStepIndex(i => Math.max(0, i - 1))} disabled={stepIndex === 0}><ArrowLeft size={19} /></button>
          <span>{Math.round(stepProgress * 100)}% of the way there</span>
          <button type="button" className="round-dark" aria-label="Next step" onClick={() => setStepIndex(i => Math.min(recipe.steps.length - 1, i + 1))} disabled={stepIndex === recipe.steps.length - 1}><ArrowRight size={19} /></button>
        </div>

        <div className="timer-card">
          <div className="timer-face" style={{ '--timer-progress': (timerProgress * 100) + '%' } as React.CSSProperties}>
            <div><Timer size={15} strokeWidth={1.7} /><strong>{formatTime(seconds)}</strong></div>
          </div>
          <div className="timer-info">
            <span>STEP TIMER</span>
            <strong>Good things take time.</strong>
            <small aria-live="polite">{timerNotice || (running ? 'Counting down...' : 'Ready when you are')}</small>
            <div className="timer-buttons">
              <button type="button" className="timer-play" onClick={() => { if (seconds === 0) setSeconds(timerTotal); setTimerNotice(''); setRunning(value => !value); }} aria-label={running ? 'Pause timer' : 'Start timer'}>{running ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}{running ? 'Pause' : 'Start'}</button>
              <button type="button" className="timer-small" onClick={() => { setRunning(false); setSeconds(timerTotal); setTimerNotice(''); }} aria-label="Reset timer"><RotateCcw size={15} /></button>
              <button type="button" className="timer-small" onClick={() => { if (timerDeadline.current !== null) timerDeadline.current += 60000; setSeconds(value => value + 60); }} aria-label="Add one minute"><Plus size={15} /></button>
            </div>
          </div>
        </div>

        <div className="ingredients-heading">
          <div><span>YOUR INGREDIENTS</span><small>{added.length} of {recipe.ingredients.length} in the pan</small></div>
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
              <button type="button" className="ingredient-check" aria-label={(isAdded ? 'Added ' : 'Add ') + ingredient.name + ' to pan'} onClick={() => addIngredient(ingredient.id)} aria-pressed={isAdded}><Check size={14} strokeWidth={2.4} /></button>
              <span className="ingredient-name">{ingredient.name}</span>
              <span className="ingredient-amount">{formatAmount(ingredient.amount * servings / recipe.servings)} {ingredient.unit}</span>
            </div>;
          })}
        </div>
        <CookingControls progress={progress} requirements={requirements} ingredientCount={recipe.ingredients.length} addedCount={added.length} heat={heat} sound={soundEnabled} onSoundChange={setSoundEnabled} onAction={cookingAction} />
        <p className="cooking-action-feedback" role="status" aria-live="polite">{actionFeedback}</p>
        <p className="ingredient-disclaimer">The 3D ingredients are playful representations. Follow the written recipe and cook food safely in your real kitchen.</p>
      </aside>
    </div>
  </section>;
}
