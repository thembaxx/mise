/** Shared motion settings for the existing GSAP and CSS interactions. */
export type MiseMotionIntent = 'hero' | 'recipe' | 'step';

type MotionSettings = Readonly<{
  duration: number;
  distance: number;
  stagger: number;
}>;

const presets: Record<MiseMotionIntent, MotionSettings> = {
  hero: { duration: 0.65, distance: 16, stagger: 0.055 },
  recipe: { duration: 0.24, distance: 16, stagger: 0.04 },
  step: { duration: 0.22, distance: 8, stagger: 0 },
};

/** Learners using reduced motion receive an immediately visible state. */
export function getMotionIntent(intent: MiseMotionIntent, reducedMotion: boolean): MotionSettings {
  if (reducedMotion) return { duration: 0, distance: 0, stagger: 0 };
  return presets[intent];
}
