import { describe, expect, it } from 'vitest';
import { getMotionIntent, type MiseMotionIntent } from '../src/motion/intents';

describe('Phase 3 shared motion intentions', () => {
  const intents: MiseMotionIntent[] = ['hero', 'recipe', 'step'];

  it('does not animate any surface when reduced motion is requested', () => {
    for (const intent of intents) {
      expect(getMotionIntent(intent, true)).toEqual({ duration: 0, distance: 0, stagger: 0 });
    }
  });

  it('keeps cooking steps short and visual motion modest', () => {
    expect(getMotionIntent('step', false)).toEqual({ duration: 0.22, distance: 8, stagger: 0 });
    expect(getMotionIntent('recipe', false).duration).toBeLessThan(0.3);
    expect(getMotionIntent('hero', false).distance).toBeLessThanOrEqual(16);
  });
});
