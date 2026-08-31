import { env } from '../core/env.js';

/**
 * Restrained cursor: a ring and a dot. It gains a word only over the
 * service modes, and it never carries information that is not also on screen.
 */
export function initCursor() {
  if (!env.finePointer || env.reducedMotion) return;

  const el = document.getElementById('cursor');
  const label = document.getElementById('cursorLabel');
  if (!el) return;

  document.body.classList.add('cursor-on');

  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const target = { ...pos };
  let raf = 0;

  /* ------------------------------------------------------------------
     PHASE 8.3 — the follow loop STOPS when the cursor has arrived.

     It used to run for the whole session, writing a transform on a
     promoted layer on every frame whether or not the pointer had moved.
     On a page whose hero is otherwise a single WebGL draw that is one
     unnecessary style write and one unnecessary layer invalidation per
     frame, for a ring that is standing still. It restarts on the next
     pointer event, which is the only thing that can make it wrong.
     ------------------------------------------------------------------ */
  const tick = () => {
    const dx = target.x - pos.x, dy = target.y - pos.y;
    pos.x += dx * 0.22;
    pos.y += dy * 0.22;
    el.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
    // Under a tenth of a pixel is not a movement anyone can see.
    if (Math.abs(dx) < 0.08 && Math.abs(dy) < 0.08) { raf = 0; return; }
    raf = requestAnimationFrame(tick);
  };
  const run = () => { if (!raf) raf = requestAnimationFrame(tick); };
  run();

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    target.x = e.clientX; target.y = e.clientY;
    el.style.opacity = '1';
    run();
  }, { passive: true });

  const setLabel = (text) => {
    document.body.classList.toggle('cursor-labelled', Boolean(text));
    if (text) label.textContent = text;
  };

  /* PHASE 10 §17 — two states, not one.

     LABELLED is the loud one: a service mode, or the primary action. It
     opens the cross and resolves a sensor ring around it, and it carries a
     word. LINK is the quiet one: any other link or button, which gets the
     system's 45 degree arrow and NOTHING else. The brief's warning about
     text-heavy cursor states is answered by the split — the great majority
     of what a pointer crosses on this site now falls in the silent state. */
  const LINKS = 'a[href], button, [role="button"], summary, label.pick, .sv-floor, .sv-state';

  document.addEventListener('pointerover', (e) => {
    const t = e.target;
    const host = t.closest?.('[data-cursor]');
    if (host) {
      const v = host.dataset.cursor;
      setLabel(v === 'start' ? 'START' : v === 'down' ? 'SCROLL' : v.toUpperCase());
      document.body.classList.remove('cursor-link');
      return;
    }
    setLabel('');
    document.body.classList.toggle('cursor-link', Boolean(t.closest?.(LINKS)));
  });

  document.addEventListener('pointerdown', () => document.body.classList.add('cursor-pressed'));
  document.addEventListener('pointerup', () => document.body.classList.remove('cursor-pressed'));
  document.addEventListener('pointerleave', () => { el.style.opacity = '0'; });

  // Keyboard users never see it; hide it the moment tabbing starts.
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') el.style.opacity = '0';
  });

  return () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
}
