import { useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isKeyboardInteraction } from './preferences';

gsap.registerPlugin(ScrollTrigger);

export function usePageMotion(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      // Deep links should arrive at an immediately usable kitchen or recipe list.
      if (!new URLSearchParams(window.location.search).has('view') && window.scrollY < 100) {
        gsap.timeline({ defaults: { ease: 'power3.out', clearProps: 'transform,opacity' } })
          .fromTo('.hero-copy > *', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .65, stagger: .055 })
          .fromTo('.hero-visual', { y: 18, scale: .98, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: .8 }, .08);
      }
    }, root);
    media.add('(prefers-reduced-motion: no-preference) and (min-width: 1100px) and (hover: hover) and (pointer: fine)', () => {
      const section = root.current?.querySelector<HTMLElement>('#discover');
      const intro = root.current?.querySelector<HTMLElement>('#discover-intro');
      if (!section || !intro) return;
      let pin: ScrollTrigger | undefined;
      let frame = 0;
      const refresh = () => {
        frame = 0;
        // All filters must remain reachable, including on short laptop displays.
        const canPin = intro.clientHeight < window.innerHeight - 140
          && section.clientHeight > intro.clientHeight + 310;
        if (!canPin && pin) { pin.kill(true); pin = undefined; }
        if (canPin && !pin) {
          pin = ScrollTrigger.create({
            trigger: section, start: 'top top+=115',
            end: () => '+=' + Math.max(0, section.clientHeight - intro.clientHeight - 310),
            pin: intro, pinSpacing: false, invalidateOnRefresh: true,
          });
        }
        ScrollTrigger.refresh();
      };
      const scheduleRefresh = () => {
        if (!frame) frame = requestAnimationFrame(refresh);
      };
      gsap.fromTo('.feature-photo img', { scale: 1.08 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: '.feature-photo', start: 'top bottom', end: 'bottom top', scrub: true },
      });
      // Filtering and lazy kitchen content both change downstream trigger positions.
      const observer = new ResizeObserver(scheduleRefresh);
      observer.observe(root.current!);
      observer.observe(intro);
      window.addEventListener('resize', scheduleRefresh);
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', scheduleRefresh);
        cancelAnimationFrame(frame);
        pin?.kill(true);
      };
    }, root);
    return () => media.revert();
  }, [root]);
}

/** Rebind only when the result set changes, never on save/timer updates. */
export function useRecipeReveal(root: RefObject<HTMLElement | null>, resultKey: string) {
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      // Searching and keyboard filtering should produce instant, legible results.
      if (isKeyboardInteraction()) return;
      const cards = gsap.utils.toArray<HTMLElement>('.recipe-card', root.current!);
      if (!cards.length) return;
      let active = true;
      const triggers = ScrollTrigger.batch(cards, {
        start: 'top 96%', once: true, interval: .05,
        onEnter: batch => {
          if (!active || isKeyboardInteraction()) return;
          // Start on entry rather than leaving offscreen or focused content faded.
          gsap.fromTo(batch, { y: 16, opacity: .7 }, {
            y: 0, opacity: 1, duration: .24, stagger: .04, ease: 'power3.out',
            clearProps: 'transform,opacity', overwrite: true,
          });
        },
      });
      // batch callbacks run after setup; explicitly clean their tweens on refilter/unmount.
      return () => {
        active = false;
        triggers.forEach(trigger => trigger.kill());
        gsap.killTweensOf(cards);
        gsap.set(cards, { clearProps: 'transform,opacity' });
      };
    }, root);
    return () => media.revert();
  }, [root, resultKey]);
}
