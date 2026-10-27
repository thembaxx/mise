import { Check } from '@phosphor-icons/react/dist/csr/Check';
import { ChefHat } from '@phosphor-icons/react/dist/csr/ChefHat';
import { Question } from '@phosphor-icons/react/dist/csr/Question';
import { Drop } from '@phosphor-icons/react/dist/csr/Drop';
import { Fire } from '@phosphor-icons/react/dist/csr/Fire';
import { Hand } from '@phosphor-icons/react/dist/csr/Hand';
import { Knife } from '@phosphor-icons/react/dist/csr/Knife';
import { BowlSteam } from '@phosphor-icons/react/dist/csr/BowlSteam';
import { SpeakerHigh } from '@phosphor-icons/react/dist/csr/SpeakerHigh';
import { SpeakerSlash } from '@phosphor-icons/react/dist/csr/SpeakerSlash';
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
        {sound ? <SpeakerHigh size={17} /> : <SpeakerSlash size={17} />} Sound {sound ? 'on' : 'off'}
      </button>
    </div>
    <p className="tool-intro">Tap a tool in the 3D kitchen or use these controls. Prepare, pour and stir as you follow the recipe.</p>
    <div className="tool-grid">
      <button type="button" className="tool-button" disabled={progress.plated || progress.chops >= 4} onClick={() => onAction('chop')} aria-label={'Chop ingredients, ' + Math.min(progress.chops, 4) + ' of 4 cuts'}>
        <Knife size={19}/><strong>Chop</strong><small>{progress.chops} cuts</small>
      </button>
      <button type="button" className="tool-button" disabled={progress.plated || progress.pours >= 3} onClick={() => onAction('pour')} aria-label={'Pour ingredients, ' + progress.pours + ' pours'}>
        <Drop size={19}/><strong>Pour</strong><small>{progress.pours} pours</small>
      </button>
      <button type="button" className="tool-button" disabled={progress.plated || heat <= 0 || addedCount === 0 || progress.stirs >= 6} onClick={() => onAction('stir')} aria-label={'Stir the pan, ' + progress.stirs + ' stirs'}>
        <BowlSteam size={19}/><strong>Stir</strong><small>{progress.stirs} stirs</small>
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
        <span className="goal-indicator">{item.complete ? <Check size={12} /> : <span />}</span>
        <span>{item.title}</span>
      </div>)}
    </div>
    {!progress.plated ? <>
      <button className="plate-button" type="button" disabled={!ready} onClick={() => onAction('plate')}>
        <ChefHat size={18} /> Plate your masterpiece <span>{ready ? 'Ready' : complete + '/' + requirements.length}</span>
      </button>
      <p className="plate-tip" aria-live="polite"><Question size={14} /> {ready ? 'All set. Plate your creation!' : 'To plate: ' + notReady.slice(0, 2).join(' · ') + (notReady.length > 2 ? ' · and ' + (notReady.length - 2) + ' more' : '')}</p>
    </> : <div className="plated-message" role="status">
      <span><Fire size={17} /> BON APPÉTIT</span>
      <strong>You made something wonderful.</strong>
      <p>Your virtual dish is ready to enjoy. Remember to follow real-world food safety guidance when cooking.</p>
    </div>}
    <p className="tool-legend">The interactive kitchen is a creative simulation; it does not cook or test real food.</p>
  </section>;
}
