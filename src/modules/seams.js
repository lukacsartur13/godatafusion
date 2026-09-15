import { ScrollTrigger } from '../core/scroll.js';
import { env } from '../core/env.js';

/* ============================================================
   THE SEAMS — PHASE 13

   Every `[data-seam]` on the page gets one number written to it: `--t`,
   0 → 1 across its own crossing. styles/seam.css does the rest, so the
   browser interpolates the gradients, the rules and the caption and this
   module writes one custom property per frame per seam and nothing else.

   The BRIDGE is measured differently from the bands, and deliberately:
   its crossing has to be FINISHED by the time its frame becomes sticky,
   because from that moment the frame is still and the only thing moving
   is the results ground rising over it. A band, which is never held, is
   measured across its whole passage.
   ============================================================ */
export function initSeams() {
  const seams = [...document.querySelectorAll('[data-seam]')];
  if (!seams.length) return;

  /* Reduced motion: every crossing is resolved, none of them is driven.
     The grounds still grade into each other — that is a static property
     of the page, not an animation. */
  if (env.reducedMotion) {
    seams.forEach((el) => el.style.setProperty('--t', '1'));
    return;
  }

  for (const el of seams) {
    const held = el.classList.contains('bridge');
    const write = (self) => el.style.setProperty('--t', self.progress.toFixed(3));
    ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: held ? 'top top' : 'bottom top',
      scrub: true,
      onUpdate: write,
      onRefresh: write,
    });
  }
}
