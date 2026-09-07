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

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting) {
        attach(v);
        v.play?.().catch(() => { v.controls = true; });
      } else if (!v.paused) {
        v.pause();
      }
    }
  }, { rootMargin: '25% 0px' });

  videos.forEach((v) => {
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    io.observe(v);
  });
}
