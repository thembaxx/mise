import type { CookingAction } from './cooking';

/** Lightweight cooking cues are synthesized after an explicit user action, never autoplayed. */
let context: AudioContext | null = null;
let lastCue = 0;

function noiseBurst(ctx: AudioContext, start: number, duration: number, volume: number, cutoff: number) {
  const length = Math.max(1, Math.round(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** .4;
  const noise = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  noise.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(cutoff, start);
  filter.Q.value = .75;
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .012);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(start);
  noise.stop(start + duration + .01);
}

function tone(ctx: AudioContext, start: number, from: number, to: number, duration: number, volume: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(50, to), start + duration);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .012);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + .01);
}

export function playCookingCue(action: CookingAction, enabled: boolean, heat = .5): void {
  if (!enabled || typeof window === 'undefined') return;
  // Avoid noisy rapid-fire sounds when mobile touch events repeat.
  const nowMs = performance.now();
  if (nowMs - lastCue < 45) return;
  lastCue = nowMs;
  try {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    if (!context) context = new AudioContextClass();
    const ctx = context;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const now = ctx.currentTime + .012;
    switch (action) {
      case 'chop':
        noiseBurst(ctx, now, .075, .105, 930);
        tone(ctx, now, 190, 110, .065, .025);
        break;
      case 'pour':
        noiseBurst(ctx, now, .43, .09, 570);
        tone(ctx, now + .04, 420, 230, .32, .017);
        break;
      case 'stir':
        noiseBurst(ctx, now, .33, .035 + Math.max(0, Math.min(1, heat)) * .07, 1150);
        noiseBurst(ctx, now + .11, .13, .025, 2100);
        break;
      case 'plate':
        tone(ctx, now, 523, 659, .26, .045);
        tone(ctx, now + .15, 659, 784, .32, .037);
        break;
    }
  } catch {
    // Sound is optional: never fail an interaction when WebAudio is unavailable.
  }
}

export function cookingHaptic(action?: CookingAction): void {
  try {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    const feedback = action === 'plate' ? [14, 24, 24] : action === 'chop' ? 12 : action === 'pour' ? 9 : 7;
    navigator.vibrate?.(feedback);
  } catch { /* WebKit and other browsers may not support vibration. */ }
}
