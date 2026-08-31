import { store, MODES } from '../core/store.js';
import { env } from '../core/env.js';

/**
 * The service selector. Three operating modes of one instrument.
 * Hover (or focus) previews a mode; click commits it. Everything else
 * on the page is a subscriber — this module owns no visual state itself.
 */
export function initModes({ onEnter } = {}) {
  const rail = document.querySelector('.modes__rail');
  if (!rail) return;

  const tabs = [...rail.querySelectorAll('[data-mode]')];
  const panels = new Map(
    Object.keys(MODES).map((id) => [id, document.getElementById(`panel-${id}`)]),
  );
  const idle = document.getElementById('readoutIdle');

  /* Track the input modality ourselves. Keyboard focus should preview a mode;
     the focus a mouse click leaves behind must not, or clicking the active
     mode again could never release it. (:focus-visible is a browser
     heuristic — this is the same intent, made explicit.) */
  const NAV_KEYS = ['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
  let viaKeyboard = false;
  window.addEventListener('keydown', (e) => {
    if (NAV_KEYS.includes(e.key)) viaKeyboard = true;
  }, true);
  window.addEventListener('pointerdown', () => { viaKeyboard = false; }, true);

  /* ---- input ---- */
  tabs.forEach((tab, i) => {
    const id = tab.dataset.mode;

    tab.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      store.setHover(id);
    });
    tab.addEventListener('focus', () => {
      if (viaKeyboard) store.setHover(id);
    });
    tab.addEventListener('blur', () => store.setHover(null));

    tab.addEventListener('click', () => {
      store.setHover(null);
      store.setLock(id);
      roving(i);
    });

    tab.addEventListener('keydown', (e) => {
      const map = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (e.key in map) {
        e.preventDefault();
        focusTab((i + map[e.key] + tabs.length) % tabs.length);
      } else if (e.key === 'Home') {
        e.preventDefault(); focusTab(0);
      } else if (e.key === 'End') {
        e.preventDefault(); focusTab(tabs.length - 1);
      }
    });
  });

  rail.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    store.setHover(null);
  });

  function roving(i) {
    tabs.forEach((t, k) => { t.tabIndex = k === i ? 0 : -1; });
  }
  function focusTab(i) {
    viaKeyboard = true;
    roving(i);
    tabs[i].focus();
  }

  /* ---- render ---- */
  let prev;
  store.subscribe((id) => {
    tabs.forEach((t) => {
      const on = t.dataset.mode === id;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });

    panels.forEach((el, key) => {
      if (!el) return;
      el.hidden = key !== id;
    });
    if (idle) idle.hidden = Boolean(id);

    document.body.dataset.mode = id || 'idle';
    if (id && id !== prev) onEnter?.(id);
    prev = id;
  });

  // Touch devices get an explicit affordance instead of a hover hint.
  if (env.touch) {
    const hint = document.querySelector('[data-hint="hover"]');
    if (hint) hint.textContent = 'Koppintson egy üzemmódra — a teljes felület átvált.';
  }
}
