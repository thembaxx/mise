import { useSyncExternalStore } from 'react';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)');
const subscribe = (notify: () => void) => {
  const media = reducedMotion();
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};

/** Keep WebGL effects in sync with preference changes without reloading the kitchen. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => reducedMotion().matches, () => true);
}

export function isKeyboardInteraction() {
  return document.documentElement.dataset.input === 'keyboard';
}

/** Track modality outside React so a pointer event never rerenders the kitchen. */
export function trackInputModality() {
  const root = document.documentElement;
  const keyboard = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    root.dataset.input = 'keyboard';
  };
  const pointer = () => { root.dataset.input = 'pointer'; };
  document.addEventListener('keydown', keyboard, true);
  document.addEventListener('pointerdown', pointer, true);
  return () => {
    document.removeEventListener('keydown', keyboard, true);
    document.removeEventListener('pointerdown', pointer, true);
  };
}
