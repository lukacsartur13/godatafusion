import gsap from 'gsap';
import { env } from '../core/env.js';

/**
 * THE SCAN PLANE — DOM half of the motif.
 *
 * It crosses the *layout*: type, cards, a file token, the wordmark. One
 * fixed element, re-aimed at whatever is being read, so the brand gesture
 * is the same physical object everywhere on the page rather than an effect
 * that gets reimplemented per section.
 *
 * It is deliberately rare. Every call site is a narrative beat, never
 * decoration.
 *
 * ------------------------------------------------------------------
 * PHASE 8.2 — WHERE IT NO LONGER RUNS, AND HOW IT MOVES NOW.
 *
 * It no longer runs in the HERO. The hero has a Scan Plane already — the
 * one the scene draws, on the single phase in webgl/scene.js — and a
 * second, independently-timed band crossing the same viewport on every
 * mode change could not be kept in step with it, because the two shared
 * no state. Two implementations of one motif is what made it look like
 * the plane was jumping. The remaining call sites are the opening
 * sequence and the service pages' section transitions, where it is the
 * only thing animating and there is nothing to disagree with.
 *
 * Its MOTION model changed too. `run()` used to write `left`, `top`,
 * `width` and `height` in pixels on every activation — four layout
 * properties, so every pass began with a forced layout, and then `gsap.set`
 * teleported the band to the top of its travel whether or not one was
 * already in flight. Geometry is now written ONCE per aim and only when it
 * has actually changed; the pass itself is `transform` and `opacity` only.
 * ------------------------------------------------------------------
 */
export function createScanPlane(el) {
  let tween = null;
  /* The last geometry written, so re-aiming at the same box — which is
     what the full-viewport hero pass always did — costs no layout. */
  const at = { left: null, top: null, width: null, height: null };

  function aim(box, h) {
    const left = Math.round(box.left);
    const top = Math.round(box.top);
    const width = Math.round(box.width);
    const height = Math.round(h);
    if (at.left === left && at.top === top && at.width === width && at.height === height) return;
    at.left = left; at.top = top; at.width = width; at.height = height;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
  }

  function run(box, { duration = 1.4, delay = 0, peak = 1, ease = 'power2.inOut', band } = {}) {
    if (env.reducedMotion || !el) return gsap.timeline();

    /* A pass already in flight is not restarted. Re-triggering mid-travel
       is what produced two bands a third of a second apart, and the
       gesture is a single deliberate reading — there is nothing for a
       second simultaneous one to mean. */
    if (tween?.isActive()) return tween;

    const h = band ?? Math.max(90, Math.min(240, box.height * 0.30));
    aim(box, h);

    const tl = gsap.timeline({ delay, onComplete: () => { if (tween === tl) tween = null; } });
    tl.set(el, { y: -h, opacity: 0 })
      .to(el, { opacity: peak, duration: duration * 0.18, ease: 'power1.out' }, 0)
      .to(el, { y: box.height, duration, ease }, 0)
      .to(el, { opacity: 0, duration: duration * 0.3, ease: 'power1.in' }, duration * 0.7);
    tween = tl;
    return tl;
  }

  return {
    /** Full-viewport pass — the opening gesture. */
    pass(opts = {}) {
      return run({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }, opts);
    },

    /** Aim the plane at one element and read it. */
    passOver(target, opts = {}) {
      if (!target) return gsap.timeline();
      const r = target.getBoundingClientRect();
      if (r.height < 8 || r.bottom < 0 || r.top > window.innerHeight) return gsap.timeline();
      const pad = opts.pad ?? 0;
      return run(
        { left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 },
        { band: Math.max(48, Math.min(160, r.height * 0.55)), ...opts },
      );
    },
  };
}
