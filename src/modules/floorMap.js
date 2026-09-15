import {
  levelFeatures, levelById, elevationLabel,
} from '../webgl/levels.js';
import { t } from '../i18n/t.js';
import { REF_UID } from '../webgl/reference.js';

/* ============================================================
   THE 360 FLOOR MAP — PHASE 9 Part 12

   Where you are standing, on the floor you are standing on.

   The brief is careful about this one: add it "only if it remains
   elegant", and "not a Google Maps-style UI". So it is four things and
   nothing else — the floor's outline, its room boundaries, its capture
   points, and a cone showing which way the camera in the frame above is
   currently pointing. No zoom, no pan, no scale bar, no north arrow that
   nobody reads, no second set of labels.

   And it is DERIVED. Every rectangle here comes out of `levelFeatures()`,
   which is the same call the QUANTIFY drawing is generated from and the
   same rectangles the walls in the 360 view were extruded from. There is no
   hand-authored mini-map anywhere in this project and this is the file that
   would have contained it.

   Plan coordinates are the site's world units, x to the right and z
   downward, so the map is oriented exactly as the QUANTIFY sheet is: what
   is at the top of one is at the top of the other.
   ============================================================ */

const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}) => {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};

/** Padding around the footprint, in plan units. Room for the dots' halo. */
const PAD = 0.22;

/**
 * @param {HTMLElement} root       where the map lives
 * @param {(id:string)=>void} onPick  a station id was chosen
 */
export function createFloorMap(root, onPick) {
  if (!root) return null;

  const svg = el('svg', { class: 'pmap__svg', 'aria-hidden': 'true' });
  root.appendChild(svg);

  let level = null;
  let stations = [];
  let current = null;
  /** station id → its dot, so a station change is two class writes. */
  const dots = new Map();
  let cone = null;
  let here = null;

  /* One click listener on the map rather than one per dot: the dots are
     rebuilt on every floor change and the listener is not. */
  root.addEventListener('click', (e) => {
    const dot = e.target.closest?.('[data-map-station]');
    if (dot) onPick?.(dot.dataset.mapStation);
  });

  /** Rebuild for a level. Cheap enough to do on every floor change. */
  function build(levelId, list) {
    level = levelId;
    stations = list.filter((s) => s.floor === levelId);
    dots.clear();
    svg.textContent = '';

    const F = levelFeatures(levelId);
    const lv = F.level;
    const x0 = lv.x0 - PAD, x1 = lv.x1 + PAD;
    const z0 = lv.z0 - PAD, z1 = lv.z1 + PAD;
    svg.setAttribute('viewBox', `${x0} ${z0} ${x1 - x0} ${z1 - z0}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    /* Rooms first, as a light grid; the reference room carries a fill so
       the one room the site follows everywhere is findable here too. */
    const g = el('g', { class: 'pmap__rooms' });
    for (const r of F.rooms) {
      const rect = el('rect', {
        x: r.x0, y: r.z0, width: r.x1 - r.x0, height: r.z1 - r.z0,
        class: r.uid === REF_UID ? 'pmap__r pmap__r--ref' : 'pmap__r',
      });
      g.appendChild(rect);
    }
    svg.appendChild(g);

    /* The outline last of the linework, so it sits over the partitions —
       three line weights, exactly as the drawing has (§20). */
    svg.appendChild(el('rect', {
      x: lv.x0, y: lv.z0, width: lv.x1 - lv.x0, height: lv.z1 - lv.z0,
      class: 'pmap__outline',
    }));
    if (lv.terrace) {
      svg.appendChild(el('rect', {
        x: lv.terrace.x0, y: lv.terrace.z0,
        width: lv.terrace.x1 - lv.terrace.x0,
        height: lv.terrace.z1 - lv.terrace.z0,
        class: 'pmap__terrace',
      }));
    }

    /* The view cone goes UNDER the dots: it belongs to the station it
       leaves, not over the station you are about to choose. */
    cone = el('path', { class: 'pmap__cone', d: '' });
    svg.appendChild(cone);

    for (const st of stations) {
      const d = el('circle', {
        cx: st.x, cy: st.z, r: 0.085, class: 'pmap__d',
        'data-map-station': st.id,
      });
      d.appendChild(el('title')).textContent = `${st.id} — ${t(st.room)}`;
      svg.appendChild(d);
      dots.set(st.id, d);
    }
    here = el('circle', { cx: 0, cy: 0, r: 0.13, class: 'pmap__here' });
    svg.appendChild(here);

    root.dataset.level = levelId;
    const cap = root.querySelector('.pmap__cap');
    if (cap) {
      cap.textContent = `${levelId} · ${t(levelById(levelId).label)} · `
        + `${elevationLabel(levelId)}`;
    }
  }

  /** Which station is live, and which way it is looking. */
  function setStation(st) {
    if (!st) return;
    if (st.floor !== level) return;
    current = st;
    for (const [id, d] of dots) d.classList.toggle('is-on', id === st.id);
    here?.setAttribute('cx', st.x);
    here?.setAttribute('cy', st.z);
    setHeading(st.yaw ?? 0);
  }

  /**
   * The cone. The viewer's yaw is measured so that direction is
   * (sin yaw, cos yaw) in (x, z) — the same convention `panorama.js`
   * builds its look vector with, which is why this needs no second
   * table of angles.
   */
  const SPREAD = 0.62;          // ≈ the viewer's own 74° lens, in radians
  const REACH = 1.25;           // plan units; long enough to read, short
  //                               enough never to leave the footprint
  function setHeading(yaw) {
    if (!cone || !current) return;
    const a0 = yaw - SPREAD / 2;
    const a1 = yaw + SPREAD / 2;
    const p = (a) => `${(current.x + Math.sin(a) * REACH).toFixed(3)},`
      + `${(current.z + Math.cos(a) * REACH).toFixed(3)}`;
    cone.setAttribute('d',
      `M${current.x.toFixed(3)},${current.z.toFixed(3)} L${p(a0)} L${p(a1)} Z`);
  }

  return { build, setStation, setHeading, get level() { return level; } };
}
