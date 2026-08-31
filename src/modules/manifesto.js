import gsap from 'gsap';
import { ScrollTrigger } from '../core/scroll.js';
import { env } from '../core/env.js';

/* ============================================================
   02 — MANIFESTO

   One typographic grammar, applied six times:

       outline  →  structure  →  solid  →  data

   The word arrives as hairline outline. The scan band crosses it and
   whatever it has passed becomes solid — the same conversion the Scan
   Plane performs on the geometry, done to type. A dimension rule draws
   underneath as the word resolves. On the way out the solid fill is
   replaced by a grid of measurement lines clipped to the glyphs: the
   word does not fade, it becomes data.

   Two scroll-linked custom properties do all of it, so the browser
   interpolates and nothing is animated per frame from JS.
     --reveal  0 → 1   outline becoming solid
     --data    0 → 1   solid becoming grid
   ============================================================ */
export function initManifesto() {
  const words = [...document.querySelectorAll('.mword')];
  if (!words.length) return;

  if (env.reducedMotion) {
    words.forEach((w) => {
      w.style.setProperty('--reveal', '1');
      w.style.setProperty('--data', '0');
      w.classList.add('is-lit');
    });
    return;
  }

  words.forEach((w) => {
    w.style.setProperty('--reveal', '0');
    w.style.setProperty('--data', '0');

    /* Arrival: only the block, never the letters — the reveal is the scan.
       fromTo with an explicit visible end and clearProps: a bare `from`
       leaves its START state inline if it is ever killed, and a manifesto
       word stranded at opacity 0 is a blank screen. */
    gsap.fromTo(w,
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', clearProps: 'opacity,transform',
        scrollTrigger: { trigger: w, start: 'top 96%', once: true } });

    ScrollTrigger.create({
      trigger: w, start: 'top 86%', end: 'top 34%', scrub: 0.4,
      onUpdate: (s) => w.style.setProperty('--reveal', s.progress.toFixed(3)),
    });

    ScrollTrigger.create({
      trigger: w, start: 'top 30%', end: 'bottom 6%', scrub: 0.4,
      onUpdate: (s) => w.style.setProperty('--data', s.progress.toFixed(3)),
      onToggle: (s) => w.classList.toggle('is-lit', s.progress > 0.02),
    });
  });

  /* Exactly one word carries an accent at a time — whichever sits closest
     to the reading line, and only the three that are assigned one. Keeps
     the manifesto from turning into a colour chart. */
  const accented = words.filter((w) => w.dataset.accent && w.dataset.accent !== 'none');
  let focused = null;
  const setFocus = (el) => {
    if (el === focused) return;
    focused?.classList.remove('is-focus');
    el?.classList.add('is-focus');
    focused = el;
  };
  const pick = () => {
    const mid = window.innerHeight * 0.46;
    let best = null, bestD = window.innerHeight * 0.30;
    for (const w of accented) {
      const r = w.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) { bestD = d; best = w; }
    }
    setFocus(best);
  };
  ScrollTrigger.create({
    trigger: '.mwords', start: 'top bottom', end: 'bottom top',
    onUpdate: pick,
    onLeave: () => setFocus(null),
    onLeaveBack: () => setFocus(null),
  });
}
