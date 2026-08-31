import gsap from 'gsap';
import { env } from '../core/env.js';
import { SERVICES } from '../data/services.js';

/* ============================================================
   PAGE TRANSITION FIELD

   Native navigation, with continuity laid over it. No SPA router: the
   three service routes are real documents, so back/forward, direct URL
   entry, view-source and crawling all behave exactly as they would
   without JavaScript. What this adds is the half second between them —
   a scan pass in the destination's accent, so leaving the CAPTURE
   chapter and arriving on the CAPTURE page reads as one movement
   instead of a white flash.

   The overlay is created here rather than in markup so a page that
   never loads this module cannot be left with a stuck black square.
   ============================================================ */

/* Timing, measured from the click:
     0–120ms   the interface responds — the field starts to close
     120–460ms the band crosses and names the destination mode
     460ms     navigation commits
     arrival   the band clears in one pass and the hero resolves under it
   Deliberately short. A transition that reads as cinematic reads as slow
   the second time somebody uses it. */
const OUT = 0.46;     // how long the field takes to close over the page
const IN = 0.58;      // and to clear on arrival

export function initTransition() {
  if (typeof document === 'undefined') return null;

  const el = document.createElement('div');
  el.className = 'xfield';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<i class="xfield__band"></i><span class="xfield__k"></span>';
  document.body.appendChild(el);

  const band = el.querySelector('.xfield__band');
  const key = el.querySelector('.xfield__k');

  const setAccent = (id) => {
    const s = SERVICES[id];
    el.style.setProperty('--x-accent', s ? s.accent.join(' ') : 'var(--accent-idle)');
    key.textContent = s ? s.label : '';
    // Which reading the band performs on the way across.
    if (id) el.dataset.mode = id; else delete el.dataset.mode;
  };

  /* ---------- arrival ---------- */
  function open() {
    if (env.reducedMotion) { el.style.display = 'none'; return; }
    el.classList.add('is-on');
    gsap.timeline({ onComplete: () => { el.classList.remove('is-on'); el.style.display = ''; } })
      .set(el, { opacity: 1 })
      .set(band, { yPercent: -100, opacity: 0.9 })
      .to(band, { yPercent: 130, duration: IN, ease: 'power2.inOut' }, 0)
      .to(key, { opacity: 0, duration: IN * 0.5, ease: 'power1.in' }, 0)
      .to(el, { opacity: 0, duration: IN * 0.55, ease: 'power2.in' }, IN * 0.42);
  }

  /* ---------- departure ---------- */
  let leaving = false;
  function leave(href, service) {
    if (leaving) return;
    leaving = true;
    setAccent(service);
    el.classList.add('is-on');
    gsap.timeline({ onComplete: () => { window.location.href = href; } })
      .set(el, { opacity: 0, display: 'block' })
      .set(band, { yPercent: 130, opacity: 0.9 })
      .set(key, { opacity: 0 })
      .to(el, { opacity: 1, duration: OUT * 0.55, ease: 'power2.out' }, 0)
      .to(band, { yPercent: -110, duration: OUT, ease: 'power2.inOut' }, 0)
      .to(key, { opacity: 1, duration: OUT * 0.5 }, OUT * 0.3);

    /* If navigation is blocked for any reason, do not strand the visitor
       behind an opaque overlay. */
    setTimeout(() => { if (leaving) { el.classList.remove('is-on'); leaving = false; } }, 4000);
  }

  /* Only plain left clicks on same-origin document links are intercepted;
     everything a browser would normally do differently still does. */
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    if (a.dataset.noTransition !== undefined) return;

    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    // Same document (an in-page anchor) — the scroll system owns that.
    if (url.pathname === window.location.pathname && url.hash) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return;

    if (env.reducedMotion) return;             // let the browser navigate plainly

    e.preventDefault();
    leave(url.href, a.dataset.service || routeService(url.pathname));
  });

  /* Restoring from bfcache re-runs neither DOMContentLoaded nor the module,
     so the overlay has to be cleared explicitly or a back button lands on a
     covered page. */
  window.addEventListener('pageshow', (ev) => {
    leaving = false;
    gsap.killTweensOf([el, band, key]);
    el.classList.remove('is-on');
    el.style.opacity = '';
    el.style.display = '';
    if (ev.persisted) el.style.display = 'none';
  });

  setAccent(document.documentElement.dataset.service || null);
  open();

  return { leave };
}

/** Which service a pathname belongs to, so a plain link still tints. */
function routeService(pathname) {
  for (const id in SERVICES) {
    if (pathname.replace(/\/?$/, '/') === SERVICES[id].route) return id;
  }
  return null;
}
