import type { CookingAction } from './cooking';

/** Short synthesized interaction cues; no external sound files, permissions or downloads. */
let context: AudioContext | null = null;

export function playCookingCue(action: CookingAction, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    if (!context) context = new AudioContextClass();
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    const pairs: Record<CookingAction, [number, number]> = {
      chop: [315, 160],
      pour: [610, 420],
      stir: [255, 310],
      plate: [523, 784],
    };
    const [start, end] = pairs[action];
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = action === 'pour' ? 'sine' : 'triangle';
    tone.frequency.setValueAtTime(start, now);
    tone.frequency.exponentialRampToValueAtTime(end, now + (action === 'plate' ? .3 : .11));
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.07, now + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, now + (action === 'plate' ? .36 : .15));
    tone.connect(gain);
    gain.connect(context.destination);
    tone.start(now);
    tone.stop(now + (action === 'plate' ? .38 : .17));
  } catch {
    // Audio must never prevent completing a cooking action.
  }
}

export function cookingHaptic() {
  try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(8); } catch { /* Unsupported device. */ }
}
