import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { env } from './env.js';

gsap.registerPlugin(ScrollTrigger);

// Lazy rendering defers a tween's first write to the following tick. In a
// backgrounded tab rAF may never deliver that tick, which can leave an
// intro element stuck at its start value. The cost here is negligible.
gsap.defaults({ lazy: false });

export let lenis = null;

/**
 * Smooth scrolling, driven by GSAP's ticker so scroll-linked animation and
 * momentum share one clock. Skipped entirely for reduced motion and touch,
 * where the platform's own scrolling is better than anything we can fake.
 */
export function initScroll() {
  if (env.reducedMotion || env.touch) {
    ScrollTrigger.refresh();
    return null;
  }

  lenis = new Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.95,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Anchor links go through Lenis so they inherit the same easing.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    // Clear the fixed header, or every anchor lands under it.
    const nav = document.getElementById('nav');
    lenis.scrollTo(el, { offset: -((nav?.offsetHeight || 0) + 2) });
  });

  return lenis;
}

/* ==================================================================
   PHASE 8.1 — THE PAGE SCROLL LOCK

   The 360 viewer's wheel handler calls `preventDefault`, and the page
   scrolled anyway. Lenis installs its OWN non-passive wheel listener on the
   window and does not consult `defaultPrevented`, so the same wheel deltas
   the viewer was reading as a field-of-view change were ALSO being turned
   into a smooth page scroll underneath it.

   Measured against the production build, viewer open, three ordinary
   trackpad zoom gestures over the canvas:

     gesture 1   scrollY 2430 → 2810   viewer top  344 → −36
     gesture 2   scrollY 2810 → 3190   viewer top  −36 → −416
     gesture 3   scrollY 3190 → 3570   viewer top −416 → −796,  OFF SCREEN

   The viewer never closed — `is-open` was true the whole way — the page
   simply scrolled out from under it, towards the sibling services block and
   PROJECT REQUEST below. That is the "the viewer disappears and I am
   suddenly at the form" report, and it is a scroll bug, not a lifecycle bug.

   So an immersive surface takes the page scroll away while it is open, and
   gives it back — at the same offset — when it closes. Reference-counted,
   because two overlays could in principle be open at once, and safe when
   there is no Lenis at all (touch and reduced motion never construct one).
   ================================================================== */
let lockDepth = 0;
let lockedAt = 0;
/* Only the triggers WE suspended are resumed; one disabled for another
   reason stays disabled. */
let suspended = [];

/**
 * @param {object} [o]
 * @param {number} [o.restoreTo] where `unlockPageScroll` should put the page.
 *   Defaults to wherever it is now. An overlay that deliberately scrolls
 *   itself into view before locking passes the offset the visitor came from,
 *   so closing returns them there rather than to the framing scroll.
 */
export function lockPageScroll({ restoreTo } = {}) {
  if (lockDepth++) return;
  lockedAt = restoreTo ?? window.scrollY;
  lenis?.stop();
  /* ScrollTrigger must not read anything that happens while the page is
     frozen as narrative progress. */
  suspended = ScrollTrigger.getAll().filter((t) => t.enabled !== false);
  suspended.forEach((t) => t.disable(false));
  document.documentElement.classList.add('is-scroll-locked');
}

export function unlockPageScroll() {
  if (!lockDepth || --lockDepth) return;
  document.documentElement.classList.remove('is-scroll-locked');
  /* Exactly where the visitor was. Native first, so the position is right
     even if Lenis was never built. */
  window.scrollTo(0, lockedAt);
  lenis?.scrollTo(lockedAt, { immediate: true, force: true });
  lenis?.start();
  suspended.forEach((t) => t.enable(false));
  suspended = [];
  ScrollTrigger.refresh();
}

/** True while any overlay owns the page scroll. */
export const isScrollLocked = () => lockDepth > 0;

export { ScrollTrigger, gsap };
