import { useEffect, useRef, useState } from 'react';
import { Check } from '@phosphor-icons/react/dist/csr/Check';
import { X } from '@phosphor-icons/react/dist/csr/X';
import { isKeyboardInteraction } from '../motion/preferences';

type Notice = { text: string; undo?: () => void; error?: boolean; origin: HTMLElement | null };

export function useActionFeedback() {
  const [notice, setNotice] = useState<Notice | null>(null);
  return {
    notice,
    show: (text: string, undo?: () => void, error = false) => setNotice({ text, undo, error, origin: document.activeElement instanceof HTMLElement ? document.activeElement : null }),
    dismiss: () => setNotice(null),
  };
}

/** Only the latest action is offered. Hover/focus keeps Undo available. */
export function ActionFeedback({ notice, dismiss }: { notice: Notice | null; dismiss: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const undo = useRef<HTMLButtonElement>(null);
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  useEffect(() => { if (!notice) { setHovered(false); setFocused(false); } }, [notice]);
  useEffect(() => {
    if (!notice || paused || notice.error) return;
    const timeout = window.setTimeout(() => dismissRef.current(), 6500);
    return () => window.clearTimeout(timeout);
  }, [notice, paused]);
  useEffect(() => {
    if (notice && isKeyboardInteraction() && document.activeElement === document.body) undo.current?.focus({ preventScroll: true });
  }, [notice]);
  const finish = (restore: boolean) => {
    if (!notice) return;
    dismiss();
    if (restore) notice.undo?.();
    requestAnimationFrame(() => {
      const origin = notice.origin;
      const target = origin?.isConnected ? origin : origin?.id ? document.getElementById(origin.id) : null;
      (target || (isKeyboardInteraction() ? document.getElementById('recipe-search') : null))?.focus({ preventScroll: true });
    });
  };
  return <div className="action-feedback-region" aria-live="polite" aria-atomic="true">
    {notice && <div className={'action-feedback' + (notice.error ? ' action-feedback-error' : '')}
      onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      {!notice.error && <Check size={18} aria-hidden="true"/>}<span>{notice.text}</span>
      {notice.undo && <button ref={undo} type="button" onClick={() => finish(true)}>Undo</button>}
      <button type="button" className="action-feedback-close" aria-label="Dismiss feedback" onClick={() => finish(false)}><X size={17}/></button>
    </div>}
  </div>;
}
