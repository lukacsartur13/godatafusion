import gsap from 'gsap';
import { ScrollTrigger, lenis } from '../core/scroll.js';
import { env } from '../core/env.js';
import { store } from '../core/store.js';
import { readTrack, readScalar } from './track.js';
import { buildStops, chapterBounds, reportStops } from './stops.js';

/* ============================================================
   THE NARRATIVE

   One scroll authority for the whole Reality → Data thread, from the
   hero to the end of the service chapters. A single measured track, so
   there is never a gap where nobody owns the scene and never two
   triggers fighting over the same frame — which is what would turn the
   morphs back into crossfades.

   Every stop is a weight map over the scene presets plus the scalars
   that travel with it: who owns the scene (mix), which side the object
   sits on (side), how present the canvas is (op / blur), and which
   service currently owns the page accent (mode).
   ============================================================ */

const CH = [
  { id: 'capture',  el: '#chapter-capture',  enter: { capture: 1 },  close: { captureClose: 1 },  side: -1 },
  { id: 'measure',  el: '#chapter-measure',  enter: { measure: 1 },  close: { measureClose: 1 },  side: 1 },
  { id: 'quantify', el: '#chapter-quantify', enter: { quantify: 1 }, close: { planTight: 1 },     side: -0.9 },
];

export function initNarrative({ getScene, scanPlane }) {
  /* A live getter, not a value: the renderer is a lazy chunk and may land
     after this is wired. Everything below then simply starts taking effect
     instead of needing the whole narrative to be torn down and rebuilt. */
  const S = () => getScene?.() ?? null;
  const stage = document.getElementById('stage');
  const hero = document.getElementById('intro');
  const manifesto = document.getElementById('manifesto');
  const services = document.getElementById('services');
  /* PHASE 11 — the journey sits between the manifesto and the chapters and
     owns the scene for its whole length. The narrative measures it so its
     own table has the right shape, and then stays out of it. */
  const descent = document.getElementById('descent');
  if (!stage || !hero || !services) return;

  const chapters = CH.map((c) => ({ ...c, node: document.querySelector(c.el) }))
                     .filter((c) => c.node);

  /* ------------------------------------------------------------------
     PHASE 12.1 / 13 — THE GROUND SWITCHES WHERE IT CANNOT BE SEEN.

     The hero stands on a light canvas (styles/hero.css); the service
     chapters stand on the dark one. Between them are the bridge — one
     viewport of held footage — and the results block, which is an opaque
     light section. From the moment the results block's top edge reaches
     the top of the viewport until the chapters have finished, the canvas
     is entirely covered by one or the other. That is where the stage,
     the atmosphere behind it, the scan plane and the renderer's palettes
     turn dark — and turn light again on the way back up, at the same
     edge. No scrub, no tween: a cut nobody can watch is cleaner than a
     fade someone might.

     PHASE 13 re-keyed it from the old section 02 to the results block,
     which is the first opaque thing under the hero now. The markup boots
     light; the scene reads the stage's tone when it lands, so a lazy
     renderer arriving after this trigger has already fired sees the
     right ground. Runs under reduced motion too.
     ------------------------------------------------------------------ */
  const ovw = document.getElementById('eredmeny');
  const groundEls = [stage, document.querySelector('.atmos'), document.getElementById('scanplane')]
    .filter(Boolean);
  const setGround = (light) => {
    const tone = light ? 'light' : 'dark';
    for (const el of groundEls) if (el.dataset.tone !== tone) el.dataset.tone = tone;
    S()?.setGround(light);
  };
  /* The dark run does not end with the chapters: the data field that
     closes them is transparent, and the canvas it stands on is the one
     the reader has been reading. Ending the ground here handed the field
     a LIGHT canvas under a dark block's worth of white type. */
  const darkEnd = document.getElementById('adat') || services;
  if (ovw) {
    ScrollTrigger.create({
      trigger: ovw, start: 'top top',
      endTrigger: darkEnd, end: 'bottom bottom',
      onToggle: (self) => setGround(!self.isActive),
    });
  }

  /* ---------- reduced motion: resolve everything, drive nothing ---------- */
  if (env.reducedMotion) {
    S()?.setNarrative({ decision: 1 });
    S()?.setNarrativeMix(0, 0);
    stage.style.opacity = '0.30';
    document.body.classList.add('rm-static');
    ScrollTrigger.create({
      trigger: '#process', start: 'top 90%',
      onEnter: () => S()?.setActive(false),
      onLeaveBack: () => S()?.setActive(true),
    });
    return;
  }

  /* ---------- measured stops ---------- */
  let STOPS = [];
  let LAYOUT = null;
  let startY = 0, range = 1;

  const topOf = (el) => el.getBoundingClientRect().top + window.scrollY;

  function measure() {
    startY = topOf(hero);
    /* The trigger runs `start: top top` → `end: bottom bottom`, so it finishes
       when the LAST viewport of #services is on screen, not when its bottom
       edge passes the top. Normalising by the raw element span instead of the
       real trigger distance skews every stop by a viewport height — roughly
       7% of the page, which is enough to fire a chapter a screen early. */
    const endY = topOf(services) + services.offsetHeight - window.innerHeight;
    range = Math.max(1, endY - startY);

    /* Subpixel on BOTH axes. `offsetHeight` is rounded to an integer while
       getBoundingClientRect() is not, so a chapter's computed bottom and its
       next sibling's measured top disagree by up to a pixel — which is
       enough to sort one chapter's closing stop AFTER the next chapter's
       opening stop and snap the scene back a whole state at the boundary. */
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top + window.scrollY, height: r.height };
    };

    const layout = {
      startY,
      range,
      viewportH: window.innerHeight,
      hero: box(hero),
      manifesto: box(manifesto),
      descent: box(descent),
      chapters: chapters.map((c) => ({
        id: c.id, side: c.side, enter: c.enter, close: c.close,
        ...box(c.node),
      })),
    };

    STOPS = buildStops(layout);
    /* The extraction sequence has to read the same boundaries the scene
       does, or the recognition steps run against a different chapter range
       than the state they belong to. */
    LAYOUT = layout;

    /* Development assertions. A live-measured track is the single most
       fragile thing on the page: one element that has not laid out yet
       produces a table that still "works" and reads completely wrong. */
    if (import.meta.env.DEV) reportStops(STOPS, layout);
  }

  /* ---------- per-frame application ---------- */
  let lastMode = null, lastF = -1, lastCh = -1, lastSP = -1;
  let wasBlurred = false;

  function apply(p) {
    if (!STOPS.length) return;
    /* ------------------------------------------------------------------
       PHASE 11 — ONE OWNER AT A TIME.

       While the reader is inside THE DESCENT the camera, the layers, the
       fog and the accent all belong to modules/descent.js, and two
       authorities writing the same frame is the defect this codebase has
       spent three phases removing. The narrative's trigger still runs —
       it has to, because it spans the hero to the end of the chapters —
       but it writes nothing until the journey has handed the scene back.
       ------------------------------------------------------------------ */
    if (S()?.journeyActive) return;
    const { weights } = readTrack(STOPS, p);
    S()?.setNarrative(weights);
    S()?.setNarrativeMix(readScalar(STOPS, p, 'mix', 0), 0);

    /* ------------------------------------------------------------------
       PHASE 8 Part 14 — REALITY → PLAN, scrubbed by the reader.

       The five narrative states are now a DISASSEMBLY. Nothing new is
       added to the scene to make it happen: the same `setExplode` the hero
       and the QUANTIFY page use is driven off the weights that are already
       being blended, so the building comes apart at exactly the reading
       speed of whoever is scrolling.

         PHYSICAL   whole
         CLOUD      whole, sampled
         PROCESSING the levels begin to separate
         DATA       fully separated — three plan layers where a building was
         DECISION   closed again onto ONE sheet, because the end of the
                    story is a deliverable and a deliverable is a drawing

       The labels follow the separation rather than the state, so they only
       appear once there is something for them to be labels OF.
       ------------------------------------------------------------------ */
    /* DATA alone. PROCESSING used to contribute 0.35, which separated the
       levels while the contents were still on screen at 34% — furniture
       standing in mid-air under a floor that had risen away from it. The
       disassembly starts where the contents stop: at DATA. */
    const explode = (weights.data || 0) * 0.95;
    S()?.setExplode(explode, 0);
    S()?.setFloorLabels(Math.min(1, explode * 2.0), 0);
    S()?.setLevel((weights.decision || 0) > 0.6 ? 'L00' : null);

    const side = readScalar(STOPS, p, 'side', 1);
    S()?.setFocusSide(side, 0);

    /* On a phone there is no left/right split to hide behind: the type runs
       the full width, so the object has to step back to being atmosphere
       once the hero hands over. The hero itself keeps its full presence. */
    const mixNow = readScalar(STOPS, p, 'mix', 0);
    /* The journey is the one place a phone does NOT dim the canvas, and it
       is exempt because it never reaches this line: modules/descent.js owns
       the stage's opacity for its whole length and sets it to 1. */
    const narrow = window.innerWidth <= 900;
    const op = readScalar(STOPS, p, 'op', 1) *
      (narrow ? 1 - 0.58 * Math.min(1, mixNow) : 1);
    const blur = readScalar(STOPS, p, 'blur', 0);
    stage.style.opacity = op.toFixed(3);
    /* PHASE 8.3 — the blur hint lives exactly as long as the blur does.
       `will-change: filter` in the stylesheet gave the full-viewport
       canvas a permanent render surface and cost the hero half its
       presented frames; see styles/hero.css. A blur is real for a few
       seconds of the narrative scroll and nowhere else, so the promise
       is made when it starts and withdrawn when it ends. */
    const blurred = blur > 0.02;
    if (blurred !== wasBlurred) {
      stage.style.willChange = blurred ? 'filter' : '';
      wasBlurred = blurred;
    }
    stage.style.filter = blurred ? `blur(${blur.toFixed(2)}px)` : '';
    stage.style.setProperty('--veil-l', Math.max(0, Math.min(1, side)).toFixed(3));
    stage.style.setProperty('--veil-r', Math.max(0, Math.min(1, -side)).toFixed(3));

    /* The accent follows the reader: scrolling into a chapter turns the
       whole page that service's colour, through the same store the hero
       rail writes to — so the two can never disagree. */
    const mode = stepValue(p, 'mode');
    if (mode !== lastMode) { store.setScroll(mode); lastMode = mode; }

    /* Chapter A/B/C highlight + the QUANTIFY recognition sequence. */
    const ch = Math.round(readScalar(STOPS, p, 'chapter', -1));
    if (ch !== lastCh) {
      chapters.forEach((c, i) => c.node.classList.toggle('is-reading', i === ch));
      lastCh = ch;
    }
    const qc = chapters[2];
    if (qc && LAYOUT) {
      const bounds = chapterBounds(LAYOUT, 0);
      const { a, b } = bounds[2];
      const f2 = (p - a) / Math.max(1e-6, b - a);
      const step = f2 < 0.34 || f2 > 1.05 ? -1 : Math.min(4, Math.floor(((f2 - 0.34) / 0.62) * 5));
      S()?.setExtractStep(step);
    }
  }

  /**
   * Discrete values are a STEP function along the track: the value of the
   * last stop at or before p. Picking the *nearest* stop instead lags by a
   * whole chapter, because one chapter's closing stop and the next one's
   * opening stop sit at the same scroll position — a tie that resolves
   * backwards, so MEASURE would still be wearing CAPTURE's cyan.
   */
  function stepValue(p, key) {
    let v = null;
    for (const s of STOPS) {
      if (s.at > p) break;
      if (key in s) v = s[key];
    }
    return v ?? null;
  }

  measure();
  // Establish the opening state explicitly. Without this the scene holds
  // its constructor defaults until the visitor happens to scroll.
  apply(0);

  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    endTrigger: services,
    end: 'bottom bottom',
    scrub: 0.35,
    onRefresh: (self) => { measure(); apply(self.progress); },
    onUpdate: (self) => apply(self.progress),
  });

  /* ---------- suspend the renderer behind the opaque half of the page ---- */
  /* PHASE 13 — the data field that ends the chapters is the LAST thing
     the renderer draws: its numbers stand on the live plan, not on a
     picture of one. So the suspension waits for WHY, which is the first
     opaque thing under it. */
  ScrollTrigger.create({
    trigger: '#why',
    // Not 'top 92%': at that point the section is still below the fold and
    // the canvas is very much on screen. Suspend once it genuinely covers it.
    start: 'top 30%',
    onEnter: () => {
      S()?.setActive(false);
      stage.classList.add('is-off');
      // The chapters handed the accent to the reader; give it back on exit.
      store.setScroll(null);
      lastMode = null;
    },
    onLeaveBack: () => { S()?.setActive(true); stage.classList.remove('is-off'); },
  });

  /* ---------- the callouts must dodge whichever column is live ---------- */
  /* PHASE 13 — the hero's callouts must clear the headline column until
     the hero has actually been left behind. The manifesto used to be the
     thing that said so; the bridge says it now. */
  ScrollTrigger.create({
    trigger: document.getElementById('bridge') || manifesto || hero,
    start: 'top 60%',
    onEnter: () => S()?.setAvoid(null, { top: 90 }),
    onLeaveBack: () => S()?.setAvoid(document.querySelector('.hero__content'), { top: 132 }),
  });
  chapters.forEach((c) => {
    ScrollTrigger.create({
      trigger: c.node, start: 'top 70%', end: 'bottom 30%',
      onToggle: (self) => S()?.setAvoid(self.isActive ? c.node.querySelector('.chapter__rail') : null, { top: 90 }),
    });
  });
  window.addEventListener('resize', () => gsap.delayedCall(0.2, measure));
}
