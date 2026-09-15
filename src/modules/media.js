import { ScrollTrigger } from '../core/scroll.js';
import { env } from '../core/env.js';

/* ============================================================
   SAMPLE MEDIA — PHASE 12

   The site now carries video: sample footage today, real project footage
   later, in the same slots. Three rules, so the footage never costs the
   page what the brief forbids it to cost:

     1. Nothing downloads until the frame is near the viewport.
        `preload="none"` in the markup; the source is attached here.
     2. Nothing plays while it is off screen. Playback is paused the
        moment the element leaves, so a page with four videos never has
        four decoders running.
     3. Reduced motion, Save-Data and a 2G-class connection get no
        autoplay at all — the poster frame stands in and the control bar
        is shown so the reader can still choose to play.
   ============================================================ */

export function initMedia(root = document) {
  const videos = [...root.querySelectorAll('video[data-autoplay]')];
  if (!videos.length) return;

  const conn = navigator.connection;
  const frugal = env.reducedMotion
    || conn?.saveData
    || /(^|-)2g$/.test(conn?.effectiveType || '');

  if (frugal) {
    videos.forEach((v) => {
      v.removeAttribute('autoplay');
      v.controls = true;
      v.preload = 'none';
    });
    return;
  }

  /** Is any part of this element inside the viewport right now? */
  function onScreen(v) {
    const r = v.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0 && r.height > 0;
  }

  /** Start playback, retrying once the element has data. */
  function play(v, retry) {
    v.play?.().catch(() => {
      if (!retry) { v.controls = true; return; }
      v.addEventListener('canplay', () => {
        v.play?.().catch(() => { v.controls = true; });
      }, { once: true });
    });
  }

  const attach = (v) => {
    if (v.dataset.attached) return;
    const src = v.dataset.src;
    if (src) {
      const s = document.createElement('source');
      s.src = src;
      s.type = v.dataset.type || 'video/mp4';
      v.appendChild(s);
      v.load();
    }
    v.dataset.attached = '1';
  };

  /* PHASE 13 — GATED ON THE SCROLL AUTHORITY, NOT ON GEOMETRY EVENTS.

     This was an IntersectionObserver, and for a figure sitting in normal
     flow that was the right primitive. The bridge's footage is not: it is
     `position: absolute` inside a `position: sticky` frame, and a sticky
     box STOPS MOVING the moment it sticks — which is precisely when the
     reader is looking at it. An observer then gets one geometry change on
     the way in and nothing after, and a scroll that teleports (a restored
     position, an in-page link, a reduced-motion jump) can miss even that:
     the frame arrives holding a black first frame and never starts.

     ScrollTrigger is already this page's scroll authority, it is driven by
     the same clock as everything else here, and it re-evaluates on refresh
     rather than only on change — so it cannot miss an arrival. A video may
     name the element whose position actually tracks the page with
     `[data-media-gate]`; everything else gates on itself, which is still
     correct for a figure in normal flow. */
  for (const v of videos) {
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    const gate = v.closest('[data-media-gate]') || v;
    ScrollTrigger.create({
      trigger: gate,
      start: 'top bottom+=25%',
      end: 'bottom top-=25%',
      onToggle: (self) => {
        /* A refresh re-evaluates every trigger, and a trigger that
           re-evaluates can report a crossing the reader never made. The
           element's own box is the arbiter of whether it is on screen, so
           a pause is only ever issued to something that genuinely is not:
           this used to stop the bridge's footage two seconds in, while it
           filled the viewport. */
        if (!self.isActive) { if (!v.paused && !onScreen(v)) v.pause(); return; }
        const first = !v.dataset.attached;
        attach(v);
        /* The first `play()` after `load()` is made against an element
           that has no data yet, and the browser rejects it — which is not
           a refusal to autoplay, it is "not ready". Handing the visitor a
           control bar at that point would be answering the wrong
           question, so the attempt is repeated once the element can
           actually play, and only a failure THERE is a real refusal. */
        play(v, first);
      },
    });
  }
}
