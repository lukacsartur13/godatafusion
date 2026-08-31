import gsap from 'gsap';
import { ScrollTrigger } from '../core/scroll.js';
import { env } from '../core/env.js';

/* ============================================================
   05 — THE JOURNEY OF PROJECT INFORMATION

   One project token is held in a stable reading field while the six stages
   pass it, and at each stage the token itself changes state:

     SAMPLE_01.PDF  SUBMITTED  → REVIEWED → SCOPED
     PROJECT_001    ALLOCATED  → PROCESSING → DATA READY

   The scroll is not scrubbed. Each stage is a discrete state that commits
   when the reader reaches it, which is a section that moves at reading
   speed rather than one that moves at scroll speed. Below 900px, and under
   reduced motion at any width, there is no field and no pinning at all:
   every stage carries its own figure, already in its own state.
   ============================================================ */

const FIELD_W = 900;

export function initProcess({ scanPlane } = {}) {
  const pj = document.getElementById('pj');
  const field = document.getElementById('pjField');
  const token = document.getElementById('pjToken');
  const state = document.getElementById('pjState');
  const stages = [...document.querySelectorAll('.pstage')];
  const fig = field?.querySelector('.pf');
  if (!pj || !stages.length) return;

  /* ---------- the static sequence ----------
     Cloning rather than authoring six copies in the document: the drawing
     has one source, so a change to it cannot land in five places and miss
     the sixth. Done for BOTH the phone and reduced motion, which is why the
     static sequence is a real layout rather than a fallback. */
  let cloned = false;
  function ensureFigures() {
    if (cloned || !fig) return;
    if (window.innerWidth >= FIELD_W && !env.reducedMotion) return;
    stages.forEach((li) => {
      const f = document.createElement('figure');
      f.className = 'pstage__fig';
      const svg = fig.cloneNode(true);
      svg.setAttribute('data-stage', li.dataset.stage);
      f.appendChild(svg);
      li.insertBefore(f, li.firstElementChild);
    });
    cloned = true;
  }
  ensureFigures();
  window.addEventListener('resize', () => ensureFigures(), { passive: true });

  /* ---------- reduced motion: every state resolved, nothing driven ------ */
  if (env.reducedMotion) {
    stages.forEach((s) => s.classList.add('is-on'));
    return;
  }

  /* Position only — never opacity. A stage's opacity is CSS state (.30
     dimmed, 1 reached), and a GSAP `from` would leave an inline opacity
     that outranks the class for the rest of the page's life. Explicit
     fromTo with a defined visible end state, so nothing can be stranded. */
  gsap.fromTo(stages,
    { y: 22 },
    {
      y: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', clearProps: 'transform',
      scrollTrigger: { trigger: pj, start: 'top 80%', once: true },
    });

  let current = -1;
  let scanned = false;

  function show(i) {
    if (i === current) return;
    current = i;
    stages.forEach((s, k) => {
      s.classList.toggle('is-on', k <= i);
      s.classList.toggle('is-now', k === i);
    });
    const li = stages[i];
    if (!li) return;
    if (fig) fig.setAttribute('data-stage', li.dataset.stage);
    if (token) token.textContent = li.dataset.token || '';
    if (state) state.textContent = li.dataset.state || '';

    /* ONE pass, at the one step that is literally a processing step. The
       drawing runs its own scan inside the figure; this is the DOM half of
       the same plane crossing the field it sits in. Latched only once the
       field is actually on screen — passOver no-ops on an off-screen
       target, and latching regardless would spend the single pass on
       nothing. */
    if (i === 4 && !scanned && field && window.innerWidth >= FIELD_W) {
      const r = field.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        scanned = true;
        scanPlane?.passOver(field, { duration: 1.0, peak: 0.8, pad: 22 });
      }
    }
    if (i < 4) scanned = false;
  }

  /* One trigger per stage. A stage commits when its own reading line
     crosses, which is what makes the field change WITH the copy instead of
     a third of a screen after it. */
  stages.forEach((li, i) => {
    ScrollTrigger.create({
      trigger: li,
      start: 'top 62%',
      end: 'bottom 42%',
      onEnter: () => show(i),
      onEnterBack: () => show(i),
    });
  });

  // Establish the opening state explicitly rather than waiting for a scroll.
  show(0);
}
