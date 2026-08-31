import { env } from '../core/env.js';

/* ============================================================
   THE PHONE HERO WINDOW

   On a phone the hero is a vertical composition: headline, then a framed
   window where the object is the subject, then the service rail. This
   module is the join between the three systems that have to agree about
   where that window is —

     the LAYOUT   #heroWindow, a flexible grid row in the hero
     the VEIL     styles/hero.css opens between --win-a and --win-b
     the CAMERA   scene.setFrameCenter() aims the object at the same band

   Nothing here is hardcoded. The window is measured, and the other two
   follow it, so a 932px frame and an 800px frame are both composed rather
   than one being the other with a different amount of slack.

   Above the phone breakpoint the module publishes nothing and the Phase 4
   desktop hero is untouched.
   ============================================================ */

/* Must agree with styles/hero.css and webgl/scene.js. */
const PHONE_W = 700;

export function initHeroWindow({ getScene } = {}) {
  const win = document.getElementById('heroWindow');
  const hero = document.getElementById('intro');
  const stage = document.getElementById('stage');
  if (!win || !hero || !stage) return { measure() {}, reveal() {} };

  let lastA = null;

  function measure() {
    if (window.innerWidth > PHONE_W) {
      if (lastA !== null) {
        stage.style.removeProperty('--win-a');
        stage.style.removeProperty('--win-b');
        lastA = null;
      }
      return;
    }

    /* Measured against the HERO, not against the live viewport: the stage is
       fixed, the hero starts at the top of the document, and reading the raw
       rect would move the band every time the page is reloaded part-scrolled. */
    const h = window.innerHeight;
    const heroTop = hero.getBoundingClientRect().top + window.scrollY;
    const r = win.getBoundingClientRect();
    const top = r.top + window.scrollY - heroTop;
    const bottom = top + r.height;
    if (r.height < 40) return;

    const a = Math.max(0, Math.min(100, (top / h) * 100));
    const b = Math.max(a + 6, Math.min(100, (bottom / h) * 100));

    stage.style.setProperty('--win-a', `${a.toFixed(2)}%`);
    stage.style.setProperty('--win-b', `${b.toFixed(2)}%`);
    lastA = a;

    /* Where the object should sit in the frame. Biased slightly BELOW the
       window's geometric centre: the object is an oblique view whose visual
       mass sits above its base, so centring it geometrically leaves the top
       of the core touching the actions row above the window. */
    getScene?.()?.setFrameCenter?.(((a + b) / 2 + 1.6) / 100, (b - a) / 100);
  }

  /**
   * First contact. One restrained transformation — solid mass, one scan
   * pass, then the extracted data — and then the object goes quiet. This is
   * NOT the desktop ambient sequence started early: it is that same cycle's
   * one meaningful arc, played once at reading speed, so the phone teaches
   * the idea in the first four seconds and then stops performing.
   */
  function reveal({ delay = 0 } = {}) {
    if (window.innerWidth > PHONE_W) return null;
    win.classList.add('is-run');            // REALITY → DATA draws itself
    if (env.reducedMotion) return null;
    return getScene?.()?.heroBeat?.({ from: 0.02, to: 0.80, duration: 3.1, delay });
  }

  measure();
  window.addEventListener('resize', measure, { passive: true });
  /* The window's height is a grid remainder, so it is only final once the
     display font has swapped and the headline has settled. */
  document.fonts?.ready.then(measure);

  return { measure, reveal };
}
