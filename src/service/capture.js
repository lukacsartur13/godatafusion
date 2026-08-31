import { heightAt } from '../webgl/field.js';
import { STATIONS, LEVELS, levelById } from '../webgl/geometry.js';
import { createStage } from './stage.js';
import { createFloorMap } from '../modules/floorMap.js';
import { isReferenceStation, REF_UID } from '../webgl/reference.js';
import { env } from '../core/env.js';
import { lockPageScroll, unlockPageScroll, lenis } from '../core/scroll.js';

/* ============================================================
   /360-camera/ — CAPTURE

   Three states of one site, and one thing the homepage cannot do:
   stand inside it. The panorama viewer is a separate lazy chunk, so a
   visitor who never opens the demo never downloads it.
   ============================================================ */

/* Callouts anchored to the site's real capture stations — the same twelve
   coordinates the homepage scene has always drawn tripods at. */
/* Only the stations on the half of the frame the headline does not occupy:
   a callout under the type is dodged and never seen, so one placed there is
   a label that does not exist. */
/* PHASE 8 — the callouts name the LEVEL each station belongs to, because a
   capture round through a three-storey building is organised by floor and a
   station id on its own no longer says where you would be standing. The
   level cycles through the real level table rather than being a string. */
const anchors = STATIONS
  .map(([x, z], i) => ({ x, z, i }))
  .filter(({ x }) => x > -1)
  .slice(0, 6)
  .map(({ x, z }, n) => ({
    set: 'capture',
    p: [x, heightAt(x, z) + 0.74, z],
    k: `CP-${String(n + 1).padStart(2, '0')}`,
    v: n === 0 ? 'CAPTURED' : LEVELS[n % LEVELS.length].id,
  }));

const STATES = ['capSite', 'capStation', 'capReturn'];

export async function init() {
  const stage = await createStage({
    states: STATES,
    initial: 'capSite',
    callouts: { anchors, extracts: [] },
  });

  const story = document.getElementById('story');
  if (stage && story) {
    stage.bindSteps(story);
    stage.avoid(document.querySelector('.sv-hero__content'), { top: 120 });
  }

  initPanorama(stage);
  return stage;
}

/* ---------------------------------------------------------------- panorama */
function initPanorama(stage) {
  const root = document.getElementById('pano');
  const canvas = document.getElementById('panoCanvas');
  const openBtn = document.querySelectorAll('[data-pano-open]');
  const exitBtn = document.getElementById('panoExit');
  const prevBtn = document.getElementById('panoPrev');
  const nextBtn = document.getElementById('panoNext');
  const idEl = document.getElementById('panoId');
  const lvlEl = document.getElementById('panoLevel');
  const floorEl = document.getElementById('panoFloor');
  const cntEl = document.getElementById('panoCount');
  const headEl = document.getElementById('panoHeading');
  const shell = document.getElementById('panoShell');
  const statusEl = document.getElementById('panoStatus');
  const floorsEl = document.getElementById('panoFloors');
  const stationsEl = document.getElementById('panoStations');
  const openCountEl = document.getElementById('panoOpenCount');
  const mapEl = document.getElementById('panoMap');
  const mapBody = document.getElementById('panoMapBody');
  const mapToggle = document.getElementById('panoMapToggle');
  const toPlan = document.getElementById('panoToPlan');
  if (!root || !canvas || !shell) return;

  /* PHASE 9 Part 12 — the map is built once and told things; it never
     reaches back into the viewer except through this one callback. */
  let map = null;

  /* ------------------------------------------------------------------
     PHASE 8.1 — THE VIEWER LIFECYCLE IS ITS OWN STATE MACHINE.

       viewer.closed  ──open()──▶  viewer.open
       viewer.open    ──close()─▶  viewer.closed

     and NOTHING else moves it. Choosing a station, choosing a floor,
     dragging, wheeling, focusing, blurring and every keystroke that is not
     Escape change `station` and `floor` and leave `open` exactly where it
     was. `close()` has three callers and only three: the EXIT control, the
     Escape key, and leaving the page. Anything else that wants the viewer
     shut has to go through one of those.
     ------------------------------------------------------------------ */
  const viewerState = { open: false, floor: null, station: null };

  let viewer = null;
  let opening = null;
  let opener = null;                          // focus returns here on exit

  const COMPASS = ['É', 'ÉK', 'K', 'DK', 'D', 'DNy', 'Ny', 'ÉNy'];

  async function ensure() {
    if (viewer) return viewer;
    if (opening) return opening;
    shell.classList.add('is-loading');
    opening = import('../webgl/panorama.js')
      .then(({ createPanorama }) => {
        viewer = createPanorama({
          canvas,
          /* PHASE 9 Part 14 — the viewer opens IN THE REFERENCE ROOM. */
          entry: entryStation,
          onStation: (st, i, total) => {
            /* A station change writes STATION. It does not write `open`,
               it does not scroll, and it does not navigate. */
            viewerState.station = st.id;
            viewerState.floor = st.floor;
            idEl.textContent = st.id;
            floorEl.textContent = st.floor;
            lvlEl.textContent = st.room;
            cntEl.textContent = `${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
            const lv = levelById(st.floor);
            statusEl.textContent =
              `${st.id}, ${lv.label}, ${st.room}. Húzással nézhet körbe.`;
            paintRails(st);
            /* PHASE 9 Part 12 — the map follows the floor, then the point. */
            if (map) {
              if (map.level !== st.floor) map.build(st.floor, viewer.stations);
              map.setStation(st);
            }
            /* Part 36 — the cross-link exists for ONE room. Everywhere else
               it would be a control that means nothing. */
            if (toPlan) {
              const ref = isReferenceStation({ level: st.floor, room: st.roomId });
              toPlan.hidden = !ref;
              if (ref) toPlan.href = `/mennyisegszamitas/?room=${REF_UID}`;
            }
          },
          onReady: (list) => {
            buildRails(list);
            if (mapBody && !map) {
              map = createFloorMap(mapBody, (id) => {
                viewer?.goToStation(id);
                toCanvas();
              });
            }
          },
          onLook: (look) => {
            if (headEl) {
              const deg = ((look.yaw * 180) / Math.PI) % 360;
              const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
              headEl.textContent = COMPASS[idx];
            }
            map?.setHeading(look.yaw);
          },
        });
        if (import.meta.env.DEV && window.__gdf) window.__gdf.panorama = viewer;
        shell.classList.remove('is-loading');
        if (!viewer) {
          shell.classList.add('is-failed');
          statusEl.textContent = 'A 360°-os nézet ezen az eszközön nem indítható el.';
        }
        return viewer;
      })
      .catch(() => {
        shell.classList.remove('is-loading');
        shell.classList.add('is-failed');
        statusEl.textContent = 'A 360°-os nézet nem tölthető be.';
        return null;
      });
    return opening;
  }

  /**
   * Put the whole viewer on screen before freezing the page.
   *
   * On a desktop the viewer is INLINE, and its station and floor rails live
   * at the bottom of a tall frame. Entering from a page position that only
   * showed the top of that frame left the rails below the fold, where they
   * cannot be clicked — which the regression suite caught immediately.
   *
   * Until Phase 8.1 this was covered by accident: `canvas.focus()` without
   * `preventScroll` shoved the page down far enough to reveal them. That is
   * a scroll nobody asked for, in a viewer whose entire defect was scrolls
   * nobody asked for. So it is deliberate now: one framing scroll, on the
   * explicit act of opening, BEFORE the lock — and the offset the visitor
   * came from is what closing restores.
   */
  function frameIntoView() {
    const frame = shell.querySelector('.pano__frame');
    const nav = document.getElementById('nav');
    const pad = (nav?.offsetHeight || 0) + 14;
    const r = frame.getBoundingClientRect();
    /* Fixed and full-screen on a phone: already framed, nothing to do. */
    if (getComputedStyle(frame).position === 'fixed') return Promise.resolve();
    const view = window.innerHeight - pad;
    const delta = r.height <= view
      ? r.top - pad - (view - r.height) / 2      // centre it
      : r.top - pad;                             // taller than the viewport: top under the nav
    if (Math.abs(delta) < 2) return Promise.resolve();
    const to = Math.max(0, window.scrollY + delta);
    if (lenis) lenis.scrollTo(to, { immediate: true, force: true });
    window.scrollTo(0, to);
    return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
  }

  async function open(from) {
    if (viewerState.open) return;
    opener = from || document.activeElement;
    const v = await ensure();
    if (!v) return;
    viewerState.open = true;
    shell.classList.add('is-open');
    document.body.classList.add('pano-open');
    const cameFrom = window.scrollY;
    await frameIntoView();
    /* The page stops scrolling for as long as the visitor is inside the
       room. Without this the viewer's own wheel handler is fighting Lenis
       for the same gesture and losing — see core/scroll.js. */
    lockPageScroll({ restoreTo: cameFrom });
    /* Two live WebGL contexts is one too many on a phone; the site scene
       has nothing to say while the visitor is standing inside it. */
    stage?.scene.setActive(false);
    /* PHASE 9 Part 14 — THE VIEWER OPENS IN THE REFERENCE ROOM.
       Not at station one. The first thing a visitor sees inside the
       building has to be the room the rest of the site is going to keep
       showing them, and — reviewed frame by frame in qa/p9/heads-b.png —
       it is also the best interior frame the model produces. A `?station=`
       in the address wins over it, because a link into a specific point is
       a deliberate act and this is only a default. */
    v.start();
    v.resize();
    /* Never a bare focus(): on a desktop the viewer is inline in the page,
       and focusing an element the browser considers off-centre scrolls it
       into view — which is a page jump the visitor did not ask for. */
    canvas.focus({ preventScroll: true });
  }

  /**
   * The ONLY way out. Called by the exit control, by Escape, and by leaving
   * the page. Not by a station, not by a floor, not by a gesture.
   */
  function close() {
    if (!viewerState.open) return;
    viewerState.open = false;
    shell.classList.remove('is-open');
    document.body.classList.remove('pano-open');
    viewer?.stop();
    stage?.scene.setActive(true);
    statusEl.textContent = 'A 360°-os nézet bezárva.';
    /* Scroll first, focus second: the unlock puts the page back exactly
       where it was, and the opener is then already in view. */
    unlockPageScroll();
    opener?.focus({ preventScroll: true });
  }

  /* ---- the two rails ----
     Built from the viewer's own station table, so a station added in Blender
     appears here and nothing in this file or the markup changes. FLOOR
     first, then STATION: choosing a level and then a viewpoint inside it is
     how anyone navigates a building, and it is what keeps twenty capture
     points from arriving as a list of twenty. */
  let rails = null;

  let railsWired = false;
  function buildRails(list) {
    if (!floorsEl || !stationsEl || !list?.length) return;
    if (!railsWired) {
      railsWired = true;
      /* PHASE 8.1 — the viewer's controls carry attributes NOBODY else on
         the site selects on. `data-floor` is the quantify page's floor
         selector and `data-id` is generic enough to be anybody's; a single
         document-wide `querySelectorAll('[data-floor]')` somewhere else is
         all it takes for a station chip to start running another page's
         handler. These are `data-viewer-*` and they are the viewer's. */
      railKeys(floorsEl, (btn) => viewer?.goToLevel(btn.dataset.viewerFloor));
      railKeys(stationsEl, (btn) => {
        const i = viewer?.stations.findIndex((s) => s.id === btn.dataset.viewerStation);
        if (i >= 0) viewer.goTo(i);
      });
    }
    const levels = [];
    for (const st of list) {
      const at = levels.find((l) => l.id === st.floor);
      if (at) at.stations.push(st);
      else levels.push({ id: st.floor, stations: [st] });
    }
    floorsEl.innerHTML = '';
    for (const l of levels) {
      const lv = levelById(l.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pano__f';
      b.dataset.viewerFloor = l.id;
      /* `<i>` and `<em>` rather than spans: the mobile rail hides both, and
         a floor rail that keeps its labels overflows a 390 px screen. */
      b.innerHTML = `<b>${l.id}</b><i>${lv.label}</i>`
        + `<em>${String(l.stations.length).padStart(2, '0')}</em>`;
      b.setAttribute('aria-label',
        `${l.id} — ${lv.label}, ${l.stations.length} felvételi pont`);
      b.tabIndex = -1;
      b.addEventListener('click', () => { viewer?.goToLevel(l.id); toCanvas(); });
      floorsEl.appendChild(b);
    }
    if (openCountEl) {
      openCountEl.textContent =
        `${list.length} FELVÉTELI PONT · ${levels.length} SZINT`;
    }
    /* Every station of every floor, once. `paintRails` only decides
       which of them the rail is currently showing. */
    stationsEl.innerHTML = '';
    delete stationsEl.dataset.viewerFloor;
    for (const l of levels) {
      for (const st of l.stations) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pano__s is-off';
        b.dataset.viewerStation = st.id;
        b.dataset.viewerLevel = l.id;
        b.innerHTML = `<b>${st.id}</b>`;
        b.title = st.room;
        /* The visible label is the station number; the accessible name has
           to say what you would be standing in. */
        b.setAttribute('aria-label', `${st.id} — ${st.room}`);
        b.tabIndex = -1;
        b.addEventListener('click', () => {
          const i = viewer?.stations.indexOf(st);
          if (i >= 0) viewer.goTo(i);
          toCanvas();
        });
        stationsEl.appendChild(b);
      }
    }

    rails = levels;
    // one tab stop per rail; the arrows move inside it
    floorsEl.querySelector('button')?.setAttribute('tabindex', '0');
    paintRails(list[0]);
  }

  function paintRails(active) {
    if (!rails || !active) return;
    [...floorsEl.children].forEach((b) => {
      b.classList.toggle('is-on', b.dataset.viewerFloor === active.floor);
      b.setAttribute('aria-pressed', String(b.dataset.viewerFloor === active.floor));
    });
    const level = rails.find((l) => l.id === active.floor);
    if (!level) return;
    /* PHASE 8.2 — THE STATION RAIL IS BUILT ONCE.

       Changing floor used to clear `stationsEl` and construct six to
       eight buttons, each with an `innerHTML` parse and a listener, in
       the same frame as the camera moving to the new floor's first
       station. §10 asks for the floor groups to be pre-rendered and
       switched instead, and that is what happens now: every station on
       every floor is in the rail from the moment the building lands,
       and a floor change is a class on each button. No node is created,
       no markup is parsed and no listener is bound at click time. */
    if (stationsEl.dataset.viewerFloor !== active.floor) {
      stationsEl.dataset.viewerFloor = active.floor;
      for (const el of stationsEl.children) {
        el.classList.toggle('is-off', el.dataset.viewerLevel !== active.floor);
      }
    }
    const hadFocus = stationsEl.contains(document.activeElement);
    [...stationsEl.children].forEach((b) => {
      const on = b.dataset.viewerStation === active.id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
      /* Roving tabindex: the rail is ONE tab stop and the arrows move
         inside it, which is the standard pattern for a toolbar and the
         reason a keyboard user does not have to tab through twenty
         stations to reach the exit button. */
      b.tabIndex = on ? 0 : -1;
      if (on) {
        /* Centre the active station IN THE RAIL — never with
           `scrollIntoView`, which scrolls every scrollable ancestor
           including the document. On a desktop the viewer is inline in the
           page, so that quietly scrolled the whole page away from the
           viewer on the first station change and dropped the reader into
           the section below. That is the jump. */
        const want = b.offsetLeft - (stationsEl.clientWidth - b.offsetWidth) / 2;
        const max = stationsEl.scrollWidth - stationsEl.clientWidth;
        stationsEl.scrollLeft = Math.max(0, Math.min(max, want));
        if (hadFocus) b.focus({ preventScroll: true });
      }
    });
  }

  /* ------------------------------------------------------------------
     KEYBOARD NAVIGATION

     Everything inside the viewer answers the arrow keys, and everything
     that answers them calls preventDefault — so an arrow press can never
     fall through to the document and scroll the page out from under the
     view being looked at.

       canvas          ← →  look    ↑ ↓  tilt    shift + ← →  station
       floor rail      ← → ↑ ↓  change floor,  Home / End  first / last
       station rail    ← → ↑ ↓  change station, Home / End  first / last

     A pointer click on any control hands focus back to the canvas, because
     the next thing a visitor does after choosing a station is look around.
     ------------------------------------------------------------------ */
  function railKeys(el, activate) {
    el.addEventListener('keydown', (e) => {
      /* Only the buttons the rail is actually showing. Every floor's
         stations live in the rail now (see buildRails), so an arrow key
         would otherwise walk into another floor's hidden ones. */
      const items = [...el.querySelectorAll('button:not(.is-off)')];
      const i = items.indexOf(document.activeElement);
      if (i < 0 || !items.length) return;
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      let n = null;
      if (e.key in step) n = (i + step[e.key] + items.length) % items.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = items.length - 1;
      else return;
      e.preventDefault();
      e.stopPropagation();
      items[n].focus({ preventScroll: true });
      activate(items[n]);
    });
  }

  const toCanvas = () => canvas.focus({ preventScroll: true });

  /**
   * PHASE 9 Part 14 — which station the viewer opens on.
   *
   * The reference room, unless the address asked for a specific one. Not
   * station 01: the first thing a visitor sees inside this building should
   * be the room the rest of the site keeps showing them, and — reviewed
   * frame by frame, qa/p9/heads-b.png — it is also the best interior frame
   * the model produces.
   */
  function entryStation(list) {
    const q = new URLSearchParams(location.search);
    const want = q.get('station');
    const room = q.get('room');
    let asked = want
      ? list.findIndex((st) => st.id === want.toUpperCase()) : -1;
    /* Part 36's reverse link addresses a ROOM, not a station number: the
       plan knows which room it is showing and has no reason to know which
       CP number stands in it. */
    if (asked < 0 && room) {
      const uid = room.toUpperCase();
      asked = list.findIndex((st) => st.roomId === uid);
    }
    if (asked >= 0) return asked;
    const ref = list.findIndex(
      (st) => isReferenceStation({ level: st.floor, room: st.roomId }));
    return ref >= 0 ? ref : 0;
  }

  /* The map is an expandable on a phone and open on a desktop — Part 28
     asks for exactly that, and the button is the only difference. */
  if (mapToggle && mapEl) {
    mapToggle.addEventListener('click', () => {
      const on = mapEl.classList.toggle('is-open');
      mapToggle.setAttribute('aria-expanded', String(on));
    });
  }

  openBtn.forEach((b) => b.addEventListener('click', () => open(b)));
  exitBtn?.addEventListener('click', close);
  prevBtn?.addEventListener('click', () => { viewer?.prev(); toCanvas(); });
  nextBtn?.addEventListener('click', () => { viewer?.next(); toCanvas(); });

  /* Escape is one of the three valid exits. It only acts while the viewer is
     actually open, so it never steals the key from anything else. */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !viewerState.open) return;
    e.preventDefault();
    close();
  });

  /* The third valid exit: leaving the page. Without this a back/forward
     navigation would leave the document scroll-locked. */
  window.addEventListener('pagehide', () => { if (viewerState.open) close(); });

  window.addEventListener('resize', () => {
    if (viewerState.open) viewer?.resize();
  });

  /* PHASE 9 Part 36 — arriving from the plan's VIEW CAPTURE link.
     `?station=CP-11` is a deliberate act by the visitor, so it is allowed to
     open the viewer; nothing else on the page ever opens it by itself. */
  const q = new URLSearchParams(location.search);
  if (q.get('station') || q.get('room')) {
    open(document.querySelector('[data-pano-open]'));
  }

  /* The viewer never auto-starts under reduced motion, and it never
     auto-starts off-screen either — it is an explicit choice. */
  if (!env.reducedMotion) {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { ensure(); io.disconnect(); }   // warm the chunk only
    }, { rootMargin: '300px' });
    io.observe(root);
  }
}
