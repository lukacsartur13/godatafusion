import gsap from 'gsap';
import { ScrollTrigger } from '../core/scroll.js';
import { env } from '../core/env.js';
import { createScene } from '../webgl/scene.js';

/* ============================================================
   The service-page stage.

   The homepage renderer, driven by a small state machine instead of a
   scroll narrative. `createScene` already accepts an arbitrary weight map
   over the presets, so a service page state is just a preset name — the
   morph between two of them is the same single blend pass the homepage
   uses, which is why the three pages cannot drift into looking like a
   different product.

   State can be changed three ways, and all three go through one path:
   scroll position, a real <button>, or a keyboard user on those buttons.
   ============================================================ */

export async function createStage({ states, callouts, initial, onState } = {}) {
  const canvas = document.getElementById('gl');
  const stageEl = document.getElementById('stage');
  const annoEl = document.getElementById('annos');
  if (!canvas || !stageEl) return null;

  /* Which architectural payload this route needs is a property of the
     SERVICE, not of the renderer: MEASURE and QUANTIFY strip the contents
     away, so they must never download them. */
  const route = document.documentElement.dataset.service || 'home';
  const scene = createScene({ canvas, stage: stageEl, annoContainer: annoEl, callouts, route });
  if (!scene) {
    document.body.classList.add('no-webgl');
    return null;
  }

  // The scroll owns this scene from the first frame; there is no hero rail.
  scene.setNarrativeMix(1, 0);

  /* The DOM veil and the camera offset are two halves of one decision: which
     side of the frame the type owns. narrative.js keeps them together on the
     homepage; this does the same for a service page. */
  function setSide(v) {
    scene.setFocusSide(v, env.reducedMotion ? 0 : 0.9);
    gsap.to(stageEl, {
      '--veil-l': Math.max(0, Math.min(1, v)),
      '--veil-r': Math.max(0, Math.min(1, -v)),
      duration: env.reducedMotion ? 0 : 0.9,
      ease: 'power2.inOut',
      overwrite: 'auto',
    });
  }
  setSide(1);

  /* Which side the object is held on is a STACK, not a switch.

     Two blocks can ask for the same side over overlapping scroll ranges —
     on QUANTIFY the analysis block and the OUTPUT block both want the
     drawing on the left, and their ranges meet. With a plain
     `onToggle: setSide(active ? side : 1)` on each, the outgoing block's
     release fires after the incoming block's claim on the same update and
     the object snaps back to the wrong half of the frame for the whole of
     the next section. A claim is only released when nothing else holds it. */
  const holds = [];
  function claim(el, side, on) {
    const i = holds.findIndex((h) => h.el === el);
    if (on && i < 0) holds.push({ el, side });
    else if (!on && i >= 0) holds.splice(i, 1);
    setSide(holds.length ? holds[holds.length - 1].side : 1);
  }
  function hold(el, side, avoidEl) {
    if (!el) return;
    ScrollTrigger.create({
      trigger: el, start: 'top 72%', end: 'bottom 20%',
      onToggle: (self) => {
        claim(el, side, self.isActive);
        // Callouts dodge whichever column is live, and that column changes
        // when the reading moves from one block to the next.
        if (avoidEl) scene.setAvoid(self.isActive ? avoidEl : defaultAvoid);
      },
    });
  }
  let defaultAvoid = null;

  const W = {};
  states.forEach((s) => { W[s] = 0; });
  let current = initial ?? states[0];
  W[current] = 1;
  scene.setNarrative(W);

  const push = () => scene.setNarrative(W);

  function setState(name, { duration } = {}) {
    if (!states.includes(name) || name === current) return;
    current = name;
    const to = {};
    states.forEach((s) => { to[s] = s === name ? 1 : 0; });
    gsap.to(W, {
      ...to,
      duration: duration ?? (env.reducedMotion ? 0.001 : 1.05),
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: push,
      onComplete: push,
    });
    onState?.(name);
  }

  onState?.(current);
  scene.intro();

  if (import.meta.env.DEV && window.__gdf) {
    window.__gdf.scene = scene;
    window.__gdf.setState = (n) => setState(n);
  }

  /* ---- suspend the renderer once the stage is behind opaque sections ---- */
  const opaque = document.querySelector('[data-stage-end]');
  if (opaque) {
    ScrollTrigger.create({
      trigger: opaque,
      start: 'top 40%',
      onEnter: () => { scene.setActive(false); stageEl.classList.add('is-off'); },
      onLeaveBack: () => { scene.setActive(true); stageEl.classList.remove('is-off'); },
    });
  }

  return {
    scene,
    get state() { return current; },
    setState,

    /** Which half of the frame the object should occupy. +1 right, −1 left. */
    setSide,

    /** Hold the object on one side for as long as `el` is being read. */
    holdSide: hold,

    /** Wire a group of real buttons plus their scroll positions to one state.
        `side` is which half of the frame the object should occupy while this
        block is being read: +1 right, −1 left, 0 centred. The hero always
        keeps the object right of its headline; a steps column that sits on
        the right has to push it back the other way. */
    bindSteps(root, { scrub = true, side = 1 } = {}) {
      if (side !== 1) hold(root, side);

      const steps = [...root.querySelectorAll('[data-state]')];
      const buttons = [...root.querySelectorAll('button[data-state]')];

      const mark = (name) => {
        steps.forEach((s) => s.classList.toggle('is-on', s.dataset.state === name));
        buttons.forEach((b) => {
          const on = b.dataset.state === name;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', String(on));
        });
      };
      mark(current);

      buttons.forEach((b) => {
        b.addEventListener('click', () => {
          setState(b.dataset.state);
          mark(b.dataset.state);
        });
      });

      /* Scroll drives the same setter. Reduced motion opts out of automatic
         camera travel entirely: the buttons still work, and the copy under
         each state already explains it without any of this. */
      if (scrub && !env.reducedMotion) {
        steps.filter((s) => s.tagName !== 'BUTTON').forEach((s) => {
          ScrollTrigger.create({
            trigger: s,
            start: 'top 62%',
            end: 'bottom 40%',
            onToggle: (self) => {
              if (!self.isActive) return;
              setState(s.dataset.state);
              mark(s.dataset.state);
            },
          });
        });
      }

      return { mark };
    },

    /** Keep the canvas clear of whichever column is currently being read. */
    avoid(el, opts) { defaultAvoid = el; scene.setAvoid(el, opts); },

    dispose() { scene.dispose(); },
  };
}
