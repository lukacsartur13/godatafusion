import { buildingQuantities, levelFeatures, levelById } from '../webgl/levels.js';
import { referenceFacts, REF_UID } from '../webgl/reference.js';
import { fmtNum } from '../i18n/t.js';
import { t } from '../i18n/t.js';

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
 * field. Both are authored here rather than in CSS because they belong to
 * the composition of THIS set of numbers: the floor area is the largest
 * thing on the page because it is the largest claim, and the identifiers
 * are small because they are evidence rather than headline.
 */
function figures() {
  const Q = buildingQuantities();
  const R = referenceFacts();
  return [
    { n: fmtNum(Q.total.area, 1), k: t('M² · HASZNOS ALAPTERÜLET'),
      a: '2 / 2 / 5 / 10', am: '2 / 2 / 4 / 9', fz: 'clamp(2.8rem, 10.5vw, 11rem)' },
    { n: String(Q.total.windows), k: t('ABLAK · ÖSSZESEN'),
      a: '5 / 8 / 8 / 13', am: '4 / 4 / 6 / 9', fz: 'clamp(2.4rem, 8.5vw, 9rem)', j: 'end' },
    { n: String(Q.total.doors), k: t('AJTÓ · ÖSSZESEN'),
      a: '2 / 10 / 4 / 13', am: '2 / 6 / 4 / 9', fz: 'clamp(1.8rem, 5.4vw, 5.4rem)', j: 'end' },
    { n: fmtNum(R.area, 1), k: `M² · ${R.uid}`,
      a: '8 / 2 / 11 / 7', am: '6 / 2 / 8 / 7', fz: 'clamp(2.4rem, 8.5vw, 9rem)' },
    { n: String(Q.total.windowTypes.W03), k: t('W03 · TELJES BELMAGASSÁGÚ'),
      a: '6 / 2 / 8 / 6', am: '8 / 2 / 10 / 6', fz: 'clamp(1.5rem, 4.2vw, 4.2rem)' },
    { n: String(Q.total.doorTypes.D01), k: t('D01 · EGYSZÁRNYÚ AJTÓ'),
      a: '5 / 5 / 7 / 8', am: '8 / 5 / 10 / 9', fz: 'clamp(1.3rem, 3.4vw, 3.4rem)', j: 'end' },
    { n: `+${fmtNum(Q.total.height, 2)}`, k: t('M · ÉPÜLETMAGASSÁG'),
      a: '11 / 8 / 13 / 13', am: '10 / 4 / 12 / 9', fz: 'clamp(1.3rem, 3.8vw, 3.8rem)', j: 'end' },
    { n: String(Q.total.rooms), k: t('HELYISÉG · 3 SZINTEN'),
      a: '11 / 2 / 13 / 5', am: '10 / 2 / 12 / 4', fz: 'clamp(1.3rem, 3.4vw, 3.4rem)' },
  ];
}

/**
 * The drawing the numbers were read out of — one storey, rooms and
 * outline, nothing else. Quiet on purpose: this is the evidence under the
 * argument, not the subject. The reference room is marked, because it is
 * the one room the rest of the site keeps coming back to.
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

export function initDataField(root = document) {
  const block = root.querySelector('[data-dfield]');
  if (!block) return;

  const list = block.querySelector('[data-dfield-set]');
  if (list) {
    const items = figures();
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

  block.querySelectorAll('[data-dfield-plan]').forEach(drawPlan);
}
