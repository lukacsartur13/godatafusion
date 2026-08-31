/**
 * Single source of truth for the active service mode.
 * DOM, CSS custom properties and WebGL uniforms all read from here,
 * which is why hovering a service changes the whole atmosphere at once.
 */

export const MODES = {
  capture: {
    id: 'capture', index: '01', label: 'CAPTURE',
    accent: [66, 232, 255], cursor: 'EXPLORE', hu: '360° kamera',
  },
  measure: {
    id: 'measure', index: '02', label: 'MEASURE',
    accent: [184, 255, 61], cursor: 'SCAN', hu: 'Területfelmérés',
  },
  quantify: {
    id: 'quantify', index: '03', label: 'QUANTIFY',
    accent: [255, 104, 70], cursor: 'ANALYZE', hu: 'Mennyiségszámítás',
  },
};

export const IDLE = {
  id: null, index: '—', label: 'IDLE',
  accent: [176, 188, 190], cursor: '', hu: '',
};

const listeners = new Set();

const state = {
  hovered: null,   // transient (pointer / focus)
  locked: null,    // committed (click / tap / Enter)
  scroll: null,    // ambient (which service chapter the reader is inside)
};

/* Priority: what the pointer is doing beats what was clicked, which beats
   where the page has been scrolled to. That ordering is why scrolling into
   the MEASURE chapter turns the whole page lime without ever fighting a
   visitor who is actively hovering the hero rail. */

export const store = {
  get active() { return state.hovered ?? state.locked ?? state.scroll; },
  get locked() { return state.locked; },
  get activeMode() { return this.active ? MODES[this.active] : IDLE; },

  setHover(id) {
    if (state.hovered === id) return;
    state.hovered = id;
    emit();
  },
  setLock(id) {
    const next = state.locked === id ? null : id; // clicking the active one releases it
    if (state.locked === next) return;
    state.locked = next;
    emit();
  },
  setScroll(id) {
    if (state.scroll === id) return;
    state.scroll = id;
    emit();
  },
  subscribe(fn) {
    listeners.add(fn);
    fn(this.active, this.activeMode);
    return () => listeners.delete(fn);
  },
};

let last = null;
function emit() {
  const a = store.active;
  if (a === last) return;
  last = a;
  const mode = store.activeMode;
  listeners.forEach((fn) => fn(a, mode));
}
