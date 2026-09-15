import { ScrollTrigger } from '../core/scroll.js';
import { env } from '../core/env.js';
import { buildingQuantities, levelFeatures, levelById } from '../webgl/levels.js';
import { referenceFacts, REF_UID } from '../webgl/reference.js';
import { fmtNum, t } from '../i18n/t.js';

/* ============================================================
   THE DATA FIELD — the end of the descent, kept.

   Phase 11's journey was one continuous fall through a building, and its
   last frame was the only one that had to survive: the drawing, and over
   it the numbers that were read OUT of the drawing. That frame is the
   whole argument of this company in one image — a plan is a picture
   until somebody counts it — and it is now the page's crossing from
   "this is what you receive" into the three services in detail.

   Everything here is DERIVED. There is not one typed quantity: the eight
   figures are counted from the same room rectangles the plan behind them
   is drawn from (webgl/levels.js), so the drawing and the numbers cannot
   disagree. That is the claim the block is making, made structurally.

   AND THE PLAN IS THE LIVE ONE. Over the last viewport of the third
   chapter the scene resolves into a single storey's drawing — everything
   that is not the plan fades out, the projected callouts go with it, and
   what is left is the line network the numbers were read off. The block
   draws no plan of its own: it is the same object the reader has been
   looking at since the hero, arriving at the state the page has been
   arguing towards. A flat copy of it here would be a picture of the
   claim instead of the claim.

   The static drawing below is the fallback, and only that: it is drawn
   when there is no renderer to resolve.

   `--t` across the crossing is written by modules/seams.js; each figure
   carries an `--i` and resolves from it in CSS, so the set arrives in
   reading order — largest first — without a tween per element.
   ============================================================ */

const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}) => {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};

/**
 * The eight values, and where each one sits on the block's own 12 x 12
 * field.
 *
 * THEY GO AROUND THE DRAWING, NOT ON IT. Every figure was read OFF the
 * plan, and a number printed over the linework it was counted from hides
 * its own evidence — the drawing stops being the thing the claim rests on
 * and becomes a texture behind it. So the plan keeps the middle of the
 * frame, the figures take the margin, and the camera steps back far
 * enough to open that margin (PULL_BACK).
 *
 * The order is the ring, clockwise from the top left, because that is the
 * order the eye can follow; the largest claim still comes first because
 * the ring starts where reading starts.
 */
const FIGURES = () => {
  const Q = buildingQuantities();
  const R = referenceFacts();
  return [
    { n: fmtNum(Q.total.area, 1), k: t('M² · HASZNOS ALAPTERÜLET'),
      a: '2 / 1 / 4 / 7', am: '2 / 1 / 4 / 5', fz: 'clamp(1.7rem, 4.6vw, 4.6rem)' },
    { n: String(Q.total.windows), k: t('ABLAK · ÖSSZESEN'),
      a: '2 / 9 / 4 / 13', am: '2 / 5 / 4 / 9', fz: 'clamp(1.7rem, 4.4vw, 4.4rem)', j: 'end' },
    { n: String(Q.total.doors), k: t('AJTÓ · ÖSSZESEN'),
      a: '5 / 11 / 7 / 13', am: '4 / 5 / 6 / 9', fz: 'clamp(1.5rem, 3.6vw, 3.6rem)', j: 'end' },
    { n: fmtNum(R.area, 1), k: `M² · ${R.uid}`,
      a: '8 / 11 / 10 / 13', am: '4 / 1 / 6 / 5', fz: 'clamp(1.3rem, 3vw, 3rem)', j: 'end' },
    { n: String(Q.total.windowTypes.W03), k: t('W03 · TELJES BELMAGASSÁGÚ'),
      a: '10 / 9 / 12 / 13', am: '9 / 5 / 11 / 9', fz: 'clamp(1.2rem, 2.6vw, 2.6rem)', j: 'end' },
    { n: String(Q.total.doorTypes.D01), k: t('D01 · EGYSZÁRNYÚ AJTÓ'),
      a: '10 / 2 / 12 / 8', am: '9 / 1 / 11 / 5', fz: 'clamp(1.2rem, 2.6vw, 2.6rem)' },
    { n: `+${fmtNum(Q.total.height, 2)}`, k: t('M · ÉPÜLETMAGASSÁG'),
      a: '8 / 1 / 10 / 4', am: '11 / 1 / 13 / 5', fz: 'clamp(1.2rem, 2.8vw, 2.8rem)' },
    { n: String(Q.total.rooms), k: t('HELYISÉG · 3 SZINTEN'),
      a: '5 / 1 / 7 / 4', am: '11 / 5 / 13 / 9', fz: 'clamp(1.3rem, 3vw, 3rem)' },
  ];
};

/** Which storey the block resolves the scene to, and captions. */
const LEVEL = 'L01';

/* How far the camera steps back to open the margin the figures stand in.
   Measured against the ring rather than chosen: the plan is wider than it
   is tall, so the SIDE bands are the tight ones, and at 1.13 the drawing
   still reached under the left-hand figures. Measured again at 1.26: the
   headline figure — the widest number in the set — still crossed the
   top-left corner of the outline, so the margin opens once more and that
   figure now sits in the corner instead of across it. Small enough that
   the drawing is plainly still the subject; large enough that not one
   number sits on a line it was counted from. */
const PULL_BACK = 1.4;

/* How present the drawing is once the closing sentence is on it. Faint
   enough that the sentence is never read against linework, present enough
   that it is still a drawing rather than a texture. */
const PLAN_UNDER_TEXT = 0.34;

/**
 * The drawing the numbers were read out of — one storey, rooms and
 * outline, nothing else. Drawn ONLY where there is no WebGL: with a
 * renderer the live scene is the drawing, and two of them would be one
 * too many. Quiet on purpose, and the reference room is marked, because
 * it is the one room the rest of the site keeps coming back to.
 */
function drawPlan(fig) {
  const levelId = fig.dataset.dfieldPlan || 'L01';
  const F = levelFeatures(levelId);
  const lv = F.level;
  const PAD = 0.3;
  const x0 = lv.x0 - PAD, z0 = lv.z0 - PAD;
  const w = (lv.x1 - lv.x0) + PAD * 2, h = (lv.z1 - lv.z0) + PAD * 2;
  const S = 100;
  const X = (x) => ((x - x0) * S).toFixed(1);
  const Z = (z) => ((z - z0) * S).toFixed(1);

  const svg = el('svg', {
    viewBox: `0 0 ${(w * S).toFixed(1)} ${(h * S).toFixed(1)}`,
    preserveAspectRatio: 'xMidYMid meet',
    'aria-hidden': 'true', focusable: 'false',
  });
  for (const r of F.rooms) {
    svg.append(el('rect', {
      x: X(r.x0), y: Z(r.z0),
      width: ((r.x1 - r.x0) * S).toFixed(1), height: ((r.z1 - r.z0) * S).toFixed(1),
      class: r.uid === REF_UID ? 'df-room df-room--ref' : 'df-room',
    }));
  }
  svg.append(el('rect', {
    x: X(lv.x0), y: Z(lv.z0),
    width: ((lv.x1 - lv.x0) * S).toFixed(1), height: ((lv.z1 - lv.z0) * S).toFixed(1),
    class: 'df-out',
  }));
  /* Two dimension lines, so it reads as a drawing rather than a diagram. */
  const y = (h * S) - 14;
  svg.append(el('path', { d: `M${X(lv.x0)},${y}H${X(lv.x1)}`, class: 'df-dim' }));
  svg.append(el('path', { d: `M${X(lv.x0)},${y - 6}v12M${X(lv.x1)},${y - 6}v12`, class: 'df-dim' }));

  fig.querySelector('svg')?.remove();
  fig.prepend(svg);

  const cap = fig.querySelector('[data-dfield-cap]');
  if (cap) cap.textContent = `${levelId} · ${t(levelById(levelId).label)}`;
}

export function initDataField(root = document, { getScene } = {}) {
  const block = root.querySelector('[data-dfield]');
  if (!block) return;

  const list = block.querySelector('[data-dfield-set]');
  if (list) {
    const items = FIGURES();
    const narrow = window.matchMedia('(max-width: 900px)');
    list.textContent = '';
    items.forEach((it, i) => {
      const li = document.createElement('li');
      li.style.setProperty('--a', narrow.matches ? it.am : it.a);
      li.style.setProperty('--fz', it.fz);
      li.style.setProperty('--i', String(i));
      if (it.j) li.style.setProperty('--j', it.j);
      const b = document.createElement('b'); b.textContent = it.n;
      const k = document.createElement('i'); k.textContent = it.k;
      li.append(b, k);
      list.append(li);
    });
    /* The field is a composition, and a phone is a different frame — so the
       placement is re-read rather than reflowed. */
    narrow.addEventListener?.('change', () => {
      [...list.children].forEach((li, n) => {
        li.style.setProperty('--a', narrow.matches ? items[n].am : items[n].a);
      });
    });
  }

  /* The caption names the storey whichever way the drawing arrives. */
  for (const fig of block.querySelectorAll('[data-dfield-plan]')) {
    const cap = fig.querySelector('[data-dfield-cap]');
    if (cap) cap.textContent = `${LEVEL} · ${t(levelById(LEVEL).label)}`;
    if (!env.webgl || document.body.classList.contains('no-webgl')) drawPlan(fig);
  }

  /* ------------------------------------------------------------------
     THE RESOLUTION — the last viewport of the third chapter.

     Not the block's own crossing: by the time the block's top reaches the
     top of the viewport the frame has to BE the drawing already, because
     that is when the first figure lands on it. So this runs over the
     viewport before that, which is the chapter's closing screen, and the
     reader watches the scene it has been reading all along put its
     materials down and become a sheet.

     Scrubbed, and the scene's two controls take values rather than
     durations — the scroll is the clock and a tween would be a second
     one. On the way back up it is undone in the same movement.
     ------------------------------------------------------------------ */
  const S = () => getScene?.() ?? null;
  if (env.reducedMotion) {
    /* One frame, resolved: the drawing, without the journey to it. The
       renderer is a lazy chunk and is usually not here yet at boot, so
       this waits for it — briefly, and then gives up, because a reader
       with no WebGL has the drawn fallback and needs nothing from here. */
    let tries = 0;
    const settle = () => {
      const sc = S();
      if (sc) {
        sc.setDrawingOnly(1); sc.setCallouts(0); sc.setFloorLabels(0, 0);
        sc.setLevel(LEVEL); sc.setFocusSide(0, 0); sc.setPullBack(PULL_BACK);
        return;
      }
      if (++tries < 40) requestAnimationFrame(settle);
    };
    settle();
    return;
  }

  /* The trigger spans the WHOLE block, not just the resolution, and the
     resolution is mapped onto its first viewport of travel. Ending it at
     `top top` looked equivalent and is not: the narrative runs a scrubbed
     0.35s tail past its own end, and its last write — three storeys, the
     object pushed to one side — landed after this one had stopped. The
     authority over a frame has to outlast the authority it took it from. */
  const resolveSpan = () => {
    const vh = window.innerHeight;
    return vh / Math.max(1, block.offsetHeight + vh);
  };

  /* Once the eight are gone the frame belongs to one sentence, and the
     drawing under it steps back to being the ground it is read against.
     By this point the canvas holds NOTHING but the plan, so fading the
     canvas is fading the drawing — there is no second thing on it to
     lose. The narrative owns this property inside its own range and has
     long since finished; on the way back up it takes it again. */
  const stage = document.getElementById('stage');
  const planFade = (q) => {
    if (!stage) return;
    const k = Math.max(0, Math.min(1, (q - 0.55) / 0.16));
    stage.style.opacity = (1 - (1 - PLAN_UNDER_TEXT) * k).toFixed(3);
  };

  ScrollTrigger.create({
    trigger: block,
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => {
      /* EVERY value, on EVERY update. There was a guard here that skipped
         the work when the resolution had stopped changing, and it made
         the block's state depend on the ORDER its own callbacks happened
         to fire in: a leave-backwards that landed after the last update
         reset the scene and nothing wrote it again, so the reader got the
         callouts and three storeys back under a sentence. The setters
         each ignore a value they already hold, so saying it every time
         costs nothing and cannot go stale. */
      planFade(self.progress);
      const p = Math.min(1, self.progress / resolveSpan());
      const sc = S();
      if (!sc) return;
      sc.setDrawingOnly(p);
      /* Faster than the drawing resolves: the captions have to be gone
         before the block's own figures arrive, or two label systems share
         one frame — which is the thing this whole sequence is removing. */
      sc.setCallouts(1 - Math.min(1, p * 1.7));
      /* The world-space floor indicator goes with them. It is set by the
         MODE rather than by the narrative — QUANTIFY asks for it — so it
         survives everything else fading, and it would be the one caption
         left standing on a sheet that is about to carry eight of its own.
         The block names the storey in its own type anyway. */
      sc.setFloorLabels(1 - Math.min(1, p * 1.7), 0);
      /* One storey, from the moment the resolution starts — the numbers
         are a reading of ONE sheet, and three stacked drawings under them
         would be three readings. */
      sc.setLevel(p > 0.02 ? LEVEL : null);
      /* The margin the ring stands in. */
      sc.setPullBack(1 + (PULL_BACK - 1) * p);
      /* The chapters hold the object off to one side to leave the reading
         column clear. Nothing is beside it here — the figures are ON it —
         so it comes back to the middle of the frame as it resolves. The
         narrative's own trigger ends exactly where this one begins, so
         there are never two authorities writing this. */
      sc.setFocusSide(-0.9 * (1 - p), 0);
    },
    onLeaveBack: () => {
      const sc = S();
      if (!sc) return;
      sc.setDrawingOnly(0);
      sc.setCallouts(1);
      sc.setLevel(null);
      sc.setFocusSide(-0.9, 0);
      sc.setPullBack(1);
      stage.style.opacity = '';
      /* Back into QUANTIFY, which is a mode that wants its floor marks. */
      sc.setFloorLabels(1, 0);
    },
  });
}
