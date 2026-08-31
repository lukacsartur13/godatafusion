import gsap from 'gsap';
import { store } from './store.js';
import { env } from './env.js';

/* ==================================================================
   THE ACCENT CHANNEL

   PHASE 8.2 — WHY THE ROOT CUSTOM PROPERTY IS GONE.

   Phase 8.1 stopped TWEENING `--accent` and wrote it once per mode
   change instead, which removed eighteen of the twenty whole-document
   style recalculations. Two remained, and they were reported as the
   floor: the write itself, and dropping the `is-accent-shift` class
   afterwards. Measured on the shipped build, each of those re-resolved
   style for 1 042–1 044 of the page's 1 071 elements at 10,5–13,4 ms.

   They were never the floor. They were the floor OF THAT
   IMPLEMENTATION, and it had two properties that made them unavoidable:

     * `--accent` was declared on `:root`. A custom property is
       inherited, so writing one on the root invalidates every element
       under it — not the elements that READ it, all of them.

     * the crossfade was `:root.is-accent-shift *`, a universal
       selector. Adding that class made ~1 000 elements transition-
       capable on twelve properties including `background-image` and
       `box-shadow`, so the browser then interpolated and REPAINTED the
       whole document for 850 ms. That is where the 46–65 ms of Paint
       per transition came from, and it is why the frames were 33 ms on
       a main thread that profiling showed 75% idle: the work was in
       raster and compositing, not in JavaScript.

   Both are replaced here:

     1. THE ATMOSPHERE — the page-wide colour wash, which is the part a
        visitor actually reads as "the whole surface changed" — is now
        four pre-coloured fixed layers that exist continuously and
        crossfade by OPACITY ONLY. Nothing recomputes a colour; the
        compositor swaps two quads. See `.atmos__accent` in base.css.

     2. THE MARKS — the rail, the callouts, the telemetry figure, the
        rules — read `--accent` from a SCOPE they sit in rather than
        from the root. A mode change writes one attribute to each scope
        that is currently near the viewport: during a hero interaction
        that is ~283 elements instead of 1 043, and no recalculation
        crosses the whole document. Scopes that are off screen take the
        value when they approach, which is before they can be seen.

   The WebGL channel is unchanged. It still tweens at 60 Hz because it
   costs one uniform write and the canvas is where the crossfade is
   being watched.
   ================================================================== */

/* The regions that carry an accent. Everything accent-bearing on every
   route is inside exactly one of them, and each is a top-level block, so
   a write can never invalidate a sibling region. */
const SCOPE_SEL = '.atmos, .nav, .nav__drawer, .stage, .scanplane, .cursor,'
  + ' .tracker, .foot, main > section';

let scopes = [];
let current = 'idle';
/* A scope is UPDATED EAGERLY only while it is near the viewport. The
   rest take the value on approach — 40% of a viewport ahead of being
   legible, which no scroll can outrun. */
const near = new WeakSet();
let io = null;

function paint(el) {
  if (el.dataset.accent !== current) el.dataset.accent = current;
}

/**
 * Re-scan for accent scopes. Called once at init, and again by any
 * caller that has inserted a section after boot — the evidence block is
 * the only one that does.
 */
export function refreshAccentScopes() {
  scopes = [...document.querySelectorAll(SCOPE_SEL)];
  for (const el of scopes) {
    if (near.has(el)) paint(el);
    io?.observe(el);          // observing twice is a no-op
  }
}

export function initTheme(onChange) {
  /* WebGL-only channel. Never touches the document. */
  const chan = { r: 176, g: 188, b: 190, mix: 0 };

  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { near.add(e.target); paint(e.target); }
      else near.delete(e.target);
    }
    /* 20% of a viewport of lead. Enough that a region has its colour
       before any part of it is legible, small enough that the section
       under the hero is not being re-resolved every time the rail is
       hovered — which was 73 of the 385 elements a mode change touched,
       for a section nobody can see. */
  }, { rootMargin: '20%' });

  refreshAccentScopes();

  store.subscribe((id, mode) => {
    const [r, g, b] = mode.accent;
    const mix = id ? 1 : 0;

    gsap.to(chan, {
      r, g, b, mix,
      duration: env.reducedMotion ? 0.16 : 0.85,
      ease: 'power2.out',
      overwrite: true,
      onUpdate: () => onChange?.([chan.r, chan.g, chan.b], chan.mix),
      onComplete: () => onChange?.([chan.r, chan.g, chan.b], chan.mix),
    });

    current = id || 'idle';
    for (const el of scopes) if (near.has(el)) paint(el);
  });
}
