import { SITE, heightAt } from '../webgl/field.js';
import { createStage } from './stage.js';
import { metrics, cutFillAt, bounds, SCALE, fmt } from '../data/terrain-metrics.js';

/* ============================================================
   /teruletfelmeres/ — MEASURE

   Four readings of one piece of ground. The numbers beside them are not
   captions: `terrain-metrics.js` integrates them over the same height
   field the canvas renders, so moving the cut level moves the volume
   because it IS the volume.
   ============================================================ */

const STATES = ['mSurface', 'mContours', 'mVolume', 'mExport'];

const M = metrics();

/* Elevation callouts placed on genuine high, low and mid points of the
   parcel, labelled with what the field actually reads there.
   All of them sit on the half of the parcel the type does NOT occupy: a
   callout that lands under the headline is dodged and simply vanishes, so
   placing one there wastes it. */
function elevationAnchors() {
  const pts = [[-6, -7], [-3, -4], [3, 1], [6, 4]];
  return pts.map(([x, z]) => {
    const h = heightAt(x, z);
    return {
      set: 'measure',
      p: [x, h + 0.24, z],
      k: 'SZINT',
      v: `${fmt(h * SCALE)} m`,
    };
  });
}

/* Every anchor is a real point on the parcel, and each one is placed in the
   band of frame the headline leaves clear — a dodged callout is an invisible
   one, so an anchor under the type is a label that does not exist. */
const anchors = [
  { set: 'measure', p: [2, heightAt(2, 0) + 0.10, 0], k: 'TERÜLET', v: M.areaText },
  { set: 'measure', p: [-4, heightAt(-4, -6) + 0.10, -6], k: 'SZINTKÜLÖNBSÉG', v: M.reliefText },
  { set: 'measure', p: [4, heightAt(4, 3) + 0.10, 3], k: 'SZINTKÖZ', v: M.intervalText },
  ...elevationAnchors(),
];

export async function init() {
  const stage = await createStage({
    states: STATES,
    initial: 'mSurface',
    callouts: { anchors, extracts: [] },
  });

  const panel = document.getElementById('terrain');
  if (stage && panel) {
    stage.bindSteps(panel, { side: -1 });
    stage.avoid(document.querySelector('.sv-hero__content'), { top: 120 });
  }

  fillStatic();
  initCut(stage);
  return stage;
}

/** Every measured figure in the markup, filled from the real field. */
function fillStatic() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('mArea', M.areaText);
  set('mRelief', M.reliefText);
  set('mMin', M.minText);
  set('mMax', M.maxText);
  set('mInterval', M.intervalText);
  set('mLines', String(M.lines));
  set('mPerimeter', M.perimeterText);
  set('mScale', M.scaleText);
}

/* ---------------------------------------------------------------- cut level */
/**
 * The one control on the page: a real range input that moves the cut level
 * through the terrain. Cut and fill are recomputed from the field on every
 * change — which is the whole claim of the service, made checkable.
 */
function initCut(stage) {
  const input = document.getElementById('cutLevel');
  const inst = document.getElementById('cutInst');
  const outCut = document.getElementById('cutV');
  const outFill = document.getElementById('fillV');
  const outLvl = document.getElementById('cutL');
  const status = document.getElementById('cutStatus');
  if (!input) return;

  const B = bounds();
  let raf = 0;
  const paint = () => {
    const t = Number(input.value) / 100;
    const r = cutFillAt(t);
    // The blade and the graduated fill ride the same number the field is
    // integrated at, so the instrument and the reading cannot disagree.
    inst?.style.setProperty('--t', String(t));
    // The prism the visitor sees is cut at exactly the level just integrated.
    stage?.scene.setVolumeLevel(r.worldY, B.min - 0.02);
    if (outLvl) outLvl.textContent = `${fmt(r.level)} m`;
    if (outCut) outCut.textContent = `${fmt(r.cut, 1)} m³`;
    if (outFill) outFill.textContent = `${fmt(r.fill, 1)} m³`;
    input.setAttribute('aria-valuetext',
      `Metszési szint ${fmt(r.level)} méter, kitermelés ${fmt(r.cut, 1)} köbméter, feltöltés ${fmt(r.fill, 1)} köbméter.`);
  };

  input.addEventListener('input', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(paint);
    // Touching the cut is a statement about volume; show that state.
    if (stage && stage.state !== 'mVolume') stage.setState('mVolume', { duration: 0.7 });
  });
  input.addEventListener('change', () => {
    if (status) status.textContent = input.getAttribute('aria-valuetext') || '';
  });

  paint();
}
