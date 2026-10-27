import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { ArrowRight } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { Check } from '@phosphor-icons/react/dist/csr/Check';
import { ChefHat } from '@phosphor-icons/react/dist/csr/ChefHat';
import { Knife } from '@phosphor-icons/react/dist/csr/Knife';
import { Drop } from '@phosphor-icons/react/dist/csr/Drop';
import { BowlSteam } from '@phosphor-icons/react/dist/csr/BowlSteam';
import { Clock } from '@phosphor-icons/react/dist/csr/Clock';
import { Fire } from '@phosphor-icons/react/dist/csr/Fire';
import { Pause } from '@phosphor-icons/react/dist/csr/Pause';
import { Play } from '@phosphor-icons/react/dist/csr/Play';
import { Plus } from '@phosphor-icons/react/dist/csr/Plus';
import { SpeakerHigh } from '@phosphor-icons/react/dist/csr/SpeakerHigh';
import { SpeakerSlash } from '@phosphor-icons/react/dist/csr/SpeakerSlash';
import { X } from '@phosphor-icons/react/dist/csr/X';
import { Sun } from '@phosphor-icons/react/dist/csr/Sun';
import { Moon } from '@phosphor-icons/react/dist/csr/Moon';
import type { Recipe } from '../data/recipes';
import { IngredientGuide, PrepChecklist, RecipeTimers } from './SmartCompanion';
import { getCookingRequirements, isReadyToPlate, type CookingAction, type KitchenProgress } from '../lib/cooking';

type Props = {
  recipe: Recipe;
  stepIndex: number;
  onStep: (step: number) => void;
  added: string[];
  onAdd: (id: string) => void;
  servings: number;
  seconds: number;
  running: boolean;
  onTimerToggle: () => void;
  onTimerReset: () => void;
  onTimerAdd: () => void;
  heat: number;
  onHeat: (value: number) => void;
  progress: KitchenProgress;
  onAction: (action: CookingAction) => void;
  close: () => void;
};

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return [Math.floor(safe / 60), safe % 60].map(value => String(value).padStart(2, '0')).join(':');
}

/** An optional screen wake lock is never requested without an explicit tap. */
export default function CookMode({ recipe, stepIndex, onStep, added, onAdd, servings, seconds, running, onTimerToggle, onTimerReset, onTimerAdd, heat, onHeat, progress, onAction, close }: Props) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const lock = useRef<WakeLockSentinel | null>(null);
  const requestedWake = useRef(false);
  const [wakeEnabled, setWakeEnabled] = useState(false);
  const [wakeStatus, setWakeStatus] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('');
  const [reading, setReading] = useState(false);
  const step = recipe.steps[stepIndex];
  const complete = progress.plated;
  const requirements = getCookingRequirements(progress, added.length, recipe.ingredients.length, heat, stepIndex, recipe.steps.length);
  const readyToPlate = isReadyToPlate(requirements);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab' || !dialog.current) return;
      const focusables = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled)'));
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
      requestedWake.current = false;
      void lock.current?.release().catch(() => undefined);
      lock.current = null;
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    };
  }, [close]);

  useEffect(() => {
    const reacquire = () => {
      if (!requestedWake.current || document.visibilityState !== 'visible' || lock.current || !navigator.wakeLock?.request) return;
      void navigator.wakeLock.request('screen').then(sentinel => {
        if (!requestedWake.current) { void sentinel.release(); return; }
        lock.current = sentinel;
        setWakeEnabled(true);
        sentinel.addEventListener('release', () => {
          if (lock.current === sentinel) { lock.current = null; setWakeEnabled(false); }
        });
      }).catch(() => { setWakeEnabled(false); setWakeStatus('Keep awake is unavailable. Your screen may lock normally.'); });
    };
    document.addEventListener('visibilitychange', reacquire);
    return () => document.removeEventListener('visibilitychange', reacquire);
  }, []);

  const toggleWake = () => {
    if (requestedWake.current) {
      requestedWake.current = false;
      setWakeEnabled(false);
      setWakeStatus('Normal screen timeout restored.');
      void lock.current?.release().catch(() => undefined);
      lock.current = null;
      return;
    }
    if (!navigator.wakeLock?.request) {
      setWakeStatus('Keep awake is not supported on this device or browser.');
      return;
    }
    requestedWake.current = true;
    void navigator.wakeLock.request('screen').then(sentinel => {
      if (!requestedWake.current) { void sentinel.release(); return; }
      lock.current = sentinel;
      setWakeEnabled(true);
      setWakeStatus('Screen will stay awake while this page is visible.');
      sentinel.addEventListener('release', () => {
        if (lock.current === sentinel) { lock.current = null; setWakeEnabled(false); }
      });
    }).catch(() => {
      requestedWake.current = false;
      setWakeEnabled(false);
      setWakeStatus('Screen wake permission was unavailable.');
    });
  };

  const speakStep = () => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setVoiceStatus('Read aloud is unavailable in this browser.');
      return;
    }
    if (reading) {
      speechSynthesis.cancel();
      setReading(false);
      setVoiceStatus('Reading stopped.');
      return;
    }
    speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance('Step ' + (stepIndex + 1) + '. ' + step.title + '. ' + step.instruction + '. Chef note. ' + step.tip);
    speech.rate = 0.93;
    speech.onend = () => setReading(false);
    speech.onerror = () => { setReading(false); setVoiceStatus('Speech playback is unavailable.'); };
    setReading(true);
    setVoiceStatus('Reading the current step aloud.');
    speechSynthesis.speak(speech);
  };
  useEffect(() => {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    setReading(false);
  }, [stepIndex]);

  const changeStep = (value: number) => {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    setReading(false);
    setVoiceStatus('');
    onStep(Math.max(0, Math.min(recipe.steps.length - 1, value)));
  };

  const actionButtons: { action: CookingAction; label: string; icon: typeof Knife; disabled: boolean }[] = [
    { action: 'chop', label: 'Chop', icon: Knife, disabled: complete || progress.chops >= 4 },
    { action: 'pour', label: 'Pour', icon: Drop, disabled: complete || progress.pours >= 3 },
    { action: 'stir', label: 'Stir', icon: BowlSteam, disabled: complete || heat <= 0 || added.length === 0 || progress.stirs >= 6 },
    { action: 'plate', label: 'Plate', icon: ChefHat, disabled: complete || !readyToPlate },
  ];

  return <div className="cook-mode-backdrop">
    <section className="cook-mode" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="cook-mode-title" aria-describedby="cook-mode-description">
      <header className="cook-mode-header">
        <div className="cook-mode-brand"><img src="/brand/mise-mark.svg" width="32" height="32" alt="" /><span>MISE <b>/ COOK MODE</b></span></div>
        <div className="cook-mode-header-actions">
          <button type="button" aria-pressed={wakeEnabled} aria-label={'Keep awake ' + (wakeEnabled ? 'on' : 'off')} onClick={toggleWake} title="Optional screen wake lock"><Sun size={17} /> <span>Keep awake {wakeEnabled ? 'on' : 'off'}</span></button>
          <button type="button" onClick={speakStep} aria-pressed={reading} aria-label={reading ? 'Stop reading the step' : 'Read current step aloud'}>{reading ? <SpeakerSlash size={17}/> : <SpeakerHigh size={17}/>}<span>{reading ? 'Stop voice' : 'Read aloud'}</span></button>
          <button className="cook-mode-exit" ref={closeButton} type="button" onClick={close} aria-label="Close cook mode"><X size={20} /> <span>Exit</span></button>
        </div>
      </header>

      <div className="cook-mode-body">
        <main className="cook-mode-main">
          <p className="cook-mode-kicker">{recipe.country} · {recipe.name} · {servings} {servings === 1 ? 'serving' : 'servings'}</p>
          <div className="cook-mode-stepcount"><span>STEP {String(stepIndex + 1).padStart(2, '0')} / {String(recipe.steps.length).padStart(2, '0')}</span><span>{Math.round((stepIndex + 1) / recipe.steps.length * 100)}% through the recipe</span></div>
          <div className="cook-mode-progress" role="progressbar" aria-label="Recipe step progress" aria-valuemin={0} aria-valuemax={recipe.steps.length} aria-valuenow={stepIndex + 1}><span style={{width:((stepIndex+1)/recipe.steps.length * 100)+'%'}}/></div>
          <h2 id="cook-mode-title" key={recipe.id + ':' + stepIndex}>{step.title}</h2>
          <p id="cook-mode-description" className="cook-mode-instruction">{step.instruction}</p>
          <aside className="cook-mode-tip"><span>CHEF'S NOTE</span><p>{step.tip}</p></aside>
          <div className="cook-mode-step-actions">
            <button type="button" onClick={() => changeStep(stepIndex - 1)} disabled={stepIndex === 0}><ArrowLeft size={19}/> Previous</button>
            <button type="button" className="cook-mode-next" onClick={() => changeStep(stepIndex + 1)} disabled={stepIndex === recipe.steps.length - 1}>Next step <ArrowRight size={19}/></button>
          </div>
          <p className="cook-mode-safety">Timers and animations are guides, not measures of food safety. Always check food is cooked appropriately.</p>
        </main>

        <aside className="cook-mode-side" aria-label="Cooking timer, ingredients and interactive tools">
          <div className="cook-mode-timer">
            <p><Clock size={16} /> THIS STEP'S TIMER</p>
            <strong aria-label={'Timer remaining ' + formatTime(seconds)}>{formatTime(seconds)}</strong>
            <div className="cook-mode-timer-actions">
              <button type="button" onClick={onTimerToggle} aria-label={running ? 'Pause cook mode timer' : 'Start cook mode timer'}>{running ? <Pause size={19}/> : <Play size={19}/>} {running ? 'Pause' : 'Start'}</button>
              <button type="button" onClick={onTimerAdd} aria-label="Add one minute in cook mode"><Plus size={18}/> 1 min</button>
              <button type="button" onClick={onTimerReset} aria-label="Reset cook mode timer">Reset</button>
            </div>
            {seconds === 0 && !running && <p role="status">Timer finished. Check your food.</p>}
          </div>
          <RecipeTimers recipe={recipe} currentStep={stepIndex}/>
          <PrepChecklist recipe={recipe}/>
          <IngredientGuide recipe={recipe} servings={servings}/>
          <div className="cook-mode-ingredients">
            <h3>Ingredients <span>{added.length}/{recipe.ingredients.length} in the virtual pan</span></h3>
            <div className="cook-mode-ingredient-scroll">
              {recipe.ingredients.map(item => <button className={added.includes(item.id) ? 'done' : ''} type="button" key={item.id} aria-pressed={added.includes(item.id)} aria-label={(added.includes(item.id) ? 'Added ' : 'Add ') + item.name + ' to virtual pan'} onClick={() => onAdd(item.id)} disabled={added.includes(item.id)}>
                <span className="cook-mode-check">{added.includes(item.id) ? <Check size={14}/> : <Plus size={13}/>}</span>
                <span>{item.name}</span><small>{Number((item.amount*servings/recipe.servings).toFixed(1))} {item.unit}</small>
              </button>)}
            </div>
          </div>
          <div className="cook-mode-play">
            <div className="cook-mode-play-title"><span>INTERACTIVE KITCHEN</span><span><Fire size={13}/> {heat < .05 ? 'Off' : heat < .4 ? 'Low' : heat < .75 ? 'Medium' : 'High'}</span></div>
            <input type="range" aria-label="Cook mode burner heat" value={heat} min="0" max="1" step=".05" onChange={event => onHeat(Number(event.target.value))} />
            <div className="cook-mode-tool-actions">{actionButtons.map(({action,label,icon:Icon,disabled})=><button key={action} type="button" onClick={() => onAction(action)} disabled={disabled} aria-label={'Cook mode ' + label.toLowerCase()}><Icon size={18}/><span>{label}</span></button>)}</div>
          </div>
        </aside>
      </div>
      {(voiceStatus || wakeStatus) && <div className="cook-mode-status" role="status">{wakeStatus && <span><Moon size={13}/>{wakeStatus}</span>}{voiceStatus && <span><SpeakerHigh size={13}/>{voiceStatus}</span>}</div>}
    </section>
  </div>;
}
