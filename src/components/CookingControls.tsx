import { Check, ChefHat, CircleHelp, Droplets, Flame, Hand, Scissors, Soup, Volume2, VolumeX } from 'lucide-react';
import type { CookingAction, CookingRequirement, KitchenProgress } from '../lib/cooking';
import { isReadyToPlate } from '../lib/cooking';

interface Props {
  progress: KitchenProgress;
  requirements: CookingRequirement[];
  ingredientCount: number;
  addedCount: number;
  heat: number;
  sound: boolean;
  onSoundChange: (enabled: boolean) => void;
  onAction: (action: CookingAction) => void;
}

export default function CookingControls({ progress, requirements, ingredientCount, addedCount, heat, sound, onSoundChange, onAction }: Props) {
  const complete = requirements.filter(item => item.complete).length;
  const ready = isReadyToPlate(requirements);
  const notReady = requirements.filter(item => !item.complete).map(item => item.title);

  return <section className="cooking-tools" aria-label="Interactive cooking tools">
    <div className="cooking-tools-top">
      <div>
        <span className="tool-kicker">THE PLAYABLE WORKTOP</span>
        <h4>Make it your own.</h4>
      </div>
      <button className="sound-toggle" type="button" aria-pressed={sound} onClick={() => onSoundChange(!sound)}>
        {sound ? <Volume2 size={17} /> : <VolumeX size={17} />} Sound {sound ? 'on' : 'off'}
      </button>
    </div>
    <p className="tool-intro">Tap a tool in the 3D kitchen or use these controls. Prepare, pour and stir as you follow the recipe.</p>
    <div className="tool-grid">
      <button type="button" className="tool-button" disabled={progress.plated || progress.chops >= 4} onClick={() => onAction('chop')} aria-label={'Chop ingredients, ' + Math.min(progress.chops, 4) + ' of 4 cuts'}>
        <Scissors size={19} strokeWidth={1.7}/><strong>Chop</strong><small>{progress.chops} cuts</small>
      </button>
      <button type="button" className="tool-button" disabled={progress.plated || progress.pours >= 3} onClick={() => onAction('pour')} aria-label={'Pour ingredients, ' + progress.pours + ' pours'}>
        <Droplets size={19} strokeWidth={1.7}/><strong>Pour</strong><small>{progress.pours} pours</small>
      </button>
      <button type="button" className="tool-button" disabled={progress.plated || heat <= 0 || addedCount === 0 || progress.stirs >= 6} onClick={() => onAction('stir')} aria-label={'Stir the pan, ' + progress.stirs + ' stirs'}>
        <Soup size={19} strokeWidth={1.7}/><strong>Stir</strong><small>{progress.stirs} stirs</small>
      </button>
    </div>
    <div className="cooking-checklist-top">
      <span><Hand size={16} /> COOKING JOURNEY</span><strong>{complete} / {requirements.length}</strong>
    </div>
    <div className="cooking-meter" role="progressbar" aria-label="Cooking activity progress" aria-valuenow={complete} aria-valuemax={requirements.length} aria-valuemin={0}>
      <span style={{ width: (complete / requirements.length * 100) + '%' }} />
    </div>
    <div className="cooking-goals">
      {requirements.map(item => <div className={'cooking-goal ' + (item.complete ? 'met' : '')} key={item.id}>
        <span className="goal-indicator">{item.complete ? <Check size={12} strokeWidth={3} /> : <span />}</span>
        <span>{item.title}</span>
      </div>)}
    </div>
    {!progress.plated ? <>
      <button className="plate-button" type="button" disabled={!ready} onClick={() => onAction('plate')}>
        <ChefHat size={18} /> Plate your masterpiece <span>{ready ? 'Ready' : complete + '/' + requirements.length}</span>
      </button>
      <p className="plate-tip" aria-live="polite"><CircleHelp size={14} /> {ready ? 'All set. Plate your creation!' : 'To plate: ' + notReady.slice(0, 2).join(' · ') + (notReady.length > 2 ? ' · and ' + (notReady.length - 2) + ' more' : '')}</p>
    </> : <div className="plated-message" role="status">
      <span><Flame size={17} /> BON APPÉTIT</span>
      <strong>You made something wonderful.</strong>
      <p>Your virtual dish is ready to enjoy. Remember to follow real-world food safety guidance when cooking.</p>
    </div>}
    <p className="tool-legend">The interactive kitchen is a creative simulation; it does not cook or test real food.</p>
  </section>;
}
