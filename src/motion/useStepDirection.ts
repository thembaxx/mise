import { useState } from 'react';

/** Retain direction through timer rerenders; only a different step starts a new entrance. */
export function useStepDirection(step: number) {
  const [transition, setTransition] = useState<{ step: number; direction: 'backward' | 'forward' }>({ step, direction: 'forward' });
  if (step !== transition.step) {
    const direction = step < transition.step ? 'backward' : 'forward';
    setTransition({ step, direction });
    return direction;
  }
  return transition.direction;
}
