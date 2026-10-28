import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

describe('focused cooking mode', () => {
  it('is loaded on demand and uses the existing kitchen state and timer', () => {
    const studio = read('src/components/KitchenStudio.tsx');
    expect(studio).toContain("lazy(() => import('./CookMode'))");
    expect(studio).toContain('onTimerToggle={toggleTimer}');
    expect(studio).toContain('onTimerAdd={addMinute}');
    expect(studio).toContain('onStep={changeStep}');
    expect(studio).toContain('stepIndex={stepIndex}');
    expect(studio).toContain('onAction={cookingAction}');
    expect(studio).toContain("get('view') === 'cook'");
  });
  it('has accessible dialogue, escape/focus management and opt-in wake lock', () => {
    const mode=read('src/components/CookMode.tsx');
    expect(mode).toContain('role="dialog" aria-modal="true"');
    expect(mode).toContain("event.key === 'Escape'");
    expect(mode).toContain("event.key !== 'Tab'");
    expect(mode).toContain("navigator.wakeLock.request('screen')");
    expect(mode).toContain('speechSynthesis.speak(speech)');
    expect(mode).toContain('progressbar');
    expect(mode).toContain('aria-label="Cook mode burner heat"');
    expect(mode).toContain('Timers and animations are guides, not measures of food safety');
  });
  it('uses optional low-power graphics and reduced-motion styling', () => {
    const studio=read('src/components/KitchenStudio.tsx');
    expect(studio).toContain("'mise:graphics'");
    expect(studio).toContain('Graphics quality');
    for(const path of ['src/components/LiteKitchenScene.tsx','src/components/KitchenScene.tsx']){
      const content=read(path);
      expect(content).toContain("quality === 'eco'");
      expect(content).toContain("shadows={quality !== 'eco'}");
    }
    expect(read('src/styles.css')).toContain('@media(prefers-reduced-motion:reduce)');
  });
  it('keeps optional audio local, gesture-triggered and avoids portal effects', () => {
    const audio=read('src/lib/cooking-sound.ts');
    expect(audio).toContain('createBuffer');
    expect(audio).toContain("if (!enabled || typeof window === 'undefined') return;");
    expect(read('src/components/KitchenEffects.tsx')).not.toContain('<Html');
  });
});
