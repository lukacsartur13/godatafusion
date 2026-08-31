/* ============================================================
   PHASE 8.1 — THE 360 VIEWER MAY NOT BE LEFT BY ACCIDENT.

   The defect these tests exist for: opening the viewer, using it normally,
   and finding the page had scrolled out from under it — the viewer gone from
   the screen and the reader dropped towards PROJECT REQUEST. The viewer was
   never closed. Lenis was reading the same wheel deltas the viewer's own
   handler had already called preventDefault on, and scrolling the page.

   Every test below therefore asserts TWO things: the viewer is still open,
   and the page has not moved.

   Run: npm run test:browser   (needs a built dist and `npm run preview`)
   ============================================================ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, chromePath, serverUp } from './support/chrome.mjs';

const BASE = process.env.QA_URL || 'http://localhost:4173';
const PAGE = `${BASE}/360-camera/`;

const reason = !chromePath() ? 'no Chrome on this machine'
  : !(await serverUp(BASE)) ? `no preview server at ${BASE} (npm run build && npm run preview)`
  : null;

/** Open the viewer and hand back the driver plus the state reader. */
async function openViewer(opts) {
  const b = await launch(opts);
  await b.goto(PAGE);
  await b.sleep(2200);
  await b.eval(`document.getElementById('pano').scrollIntoView({block:'start'})`);
  await b.sleep(1200);
  const before = await b.eval('Math.round(scrollY)');
  assert.ok(await b.click('[data-pano-open]'), 'the 360 open control exists');
  await b.sleep(4200);
  return { b, before };
}

const state = (b) => b.json(`(()=>{
  const shell = document.getElementById('panoShell');
  const frame = document.querySelector('.pano__frame').getBoundingClientRect();
  const project = document.getElementById('project').getBoundingClientRect();
  return {
    open: shell.classList.contains('is-open'),
    onScreen: frame.bottom > 0 && frame.top < innerHeight,
    y: Math.round(scrollY),
    station: document.getElementById('panoId').textContent,
    floor: document.getElementById('panoFloor').textContent,
    projectInView: project.top < innerHeight && project.bottom > 0,
    active: document.activeElement.id || document.activeElement.tagName,
  };})()`);

/** Click the station chip after the active one; returns its id. */
const nextStation = (b) => b.eval(`(()=>{
  const all=[...document.querySelectorAll('#panoStations button')];
  const on=all.findIndex(x=>x.classList.contains('is-on'));
  const n=all[(on+1)%all.length];
  return n ? n.dataset.viewerStation : null;})()`);
const nextFloor = (b) => b.eval(`(()=>{
  const all=[...document.querySelectorAll('#panoFloors button')];
  const on=all.findIndex(x=>x.classList.contains('is-on'));
  const n=all[(on+1)%all.length];
  return n ? n.dataset.viewerFloor : null;})()`);

test('360 viewer', { skip: reason ?? false, concurrency: 1 }, async (t) => {
  await t.test('1 — a station click leaves the viewer open', async () => {
    const { b } = await openViewer();
    try {
      const id = await nextStation(b);
      assert.ok(id, 'the station rail is populated');
      await b.click(`#panoStations button[data-viewer-station="${id}"]`);
      const s = await state(b);
      assert.equal(s.open, true, 'still open');
      assert.equal(s.onScreen, true, 'still on screen');
      assert.equal(s.station, id, 'and it went to the station that was clicked');
    } finally { await b.close(); }
  });

  await t.test('2 — a floor click leaves the viewer open', async () => {
    const { b } = await openViewer();
    try {
      const f = await nextFloor(b);
      assert.ok(f, 'the floor rail is populated');
      await b.click(`#panoFloors button[data-viewer-floor="${f}"]`);
      const s = await state(b);
      assert.equal(s.open, true, 'still open');
      assert.equal(s.onScreen, true, 'still on screen');
      assert.equal(s.floor, f, 'and it went to the floor that was clicked');
    } finally { await b.close(); }
  });

  await t.test('3 — ten station changes leave the viewer open', async () => {
    const { b } = await openViewer();
    try {
      for (let i = 0; i < 10; i++) {
        const id = await nextStation(b);
        await b.click(`#panoStations button[data-viewer-station="${id}"]`);
        const s = await state(b);
        assert.equal(s.open, true, `still open after change ${i + 1}`);
      }
      assert.equal((await state(b)).onScreen, true);
    } finally { await b.close(); }
  });

  await t.test('4 — nothing the viewer does scrolls the page to the request form', async () => {
    const { b, before } = await openViewer();
    try {
      const opened = await state(b);
      for (let i = 0; i < 5; i++) {
        const id = await nextStation(b);
        await b.click(`#panoStations button[data-viewer-station="${id}"]`);
      }
      await b.wheel('#panoCanvas', 120, 30);       // the gesture that used to do it
      await b.drag('#panoCanvas');
      const f = await nextFloor(b);
      await b.click(`#panoFloors button[data-viewer-floor="${f}"]`);
      const s = await state(b);
      assert.equal(s.open, true, 'the viewer is still open');
      assert.equal(s.onScreen, true, 'the viewer is still on screen');
      assert.equal(s.projectInView, false, 'PROJECT REQUEST was never scrolled into view');
      assert.equal(s.y, opened.y, 'the page has not moved a pixel since it opened');
      /* Opening frames the viewer — one deliberate scroll, on an explicit
         act. After that the page is frozen, and closing puts it back. */
      assert.notEqual(before, undefined);
      assert.equal(await b.eval(`(()=>{const r=document.querySelector('.pano__frame').getBoundingClientRect();
        return r.top > -4 && r.bottom < innerHeight + 4;})()`), true,
        'and the whole viewer, controls included, is on screen');
    } finally { await b.close(); }
  });

  await t.test('5 — Escape closes, restores focus and restores the scroll', async () => {
    const { b, before } = await openViewer();
    try {
      await b.wheel('#panoCanvas', 120, 20);
      await b.key('Escape', 'Escape', 27);
      await b.sleep(500);
      const s = await state(b);
      assert.equal(s.open, false, 'Escape closed it');
      assert.equal(
        await b.eval(`document.activeElement.hasAttribute('data-pano-open')`), true,
        'focus went back to the control that opened it',
      );
      assert.ok(Math.abs(s.y - before) <= 2, `scroll restored (${s.y} vs ${before})`);
      assert.equal(s.projectInView, false, 'and it did not land on the request form');
    } finally { await b.close(); }
  });

  await t.test('6 — stress: 20 stations, 10 floors, 30 drags, 10 zooms, keys', async () => {
    const { b } = await openViewer();
    try {
      const opened = await state(b);
      for (let i = 0; i < 20; i++) {
        const id = await nextStation(b);
        await b.click(`#panoStations button[data-viewer-station="${id}"]`);
      }
      for (let i = 0; i < 10; i++) {
        const f = await nextFloor(b);
        await b.click(`#panoFloors button[data-viewer-floor="${f}"]`);
      }
      for (let i = 0; i < 30; i++) await b.drag('#panoCanvas', i % 2 ? -160 : 160, i % 3 ? 20 : -20);
      await b.wheel('#panoCanvas', 120, 10);
      await b.eval(`document.getElementById('panoCanvas').focus({preventScroll:true})`);
      for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) await b.key(k, k, 37);
      await b.key('+', 'Equal', 187);
      await b.key('-', 'Minus', 189);

      const s = await state(b);
      assert.equal(s.open, true, 'still open after the whole round');
      assert.equal(s.onScreen, true, 'still on screen');
      assert.equal(s.y, opened.y, 'the page never moved');
      assert.equal(s.projectInView, false, 'the request form was never reached');
      assert.equal(
        await b.eval(`!!document.getElementById('panoCanvas').getContext('webgl2')
          || document.body.classList.contains('no-webgl')`), true,
        'no WebGL context loss',
      );
      assert.deepEqual(b.consoleErrors, [], 'no console errors');

      await b.key('Escape', 'Escape', 27);
      await b.sleep(400);
      assert.equal((await state(b)).open, false, 'and Escape — only Escape — closed it');
    } finally { await b.close(); }
  });

  await t.test('7 — touch: the same round on a phone viewport', async () => {
    const { b } = await openViewer({ width: 390, height: 844, mobile: true });
    try {
      const opened = await state(b);
      for (let i = 0; i < 5; i++) {
        const id = await nextStation(b);
        await b.click(`#panoStations button[data-viewer-station="${id}"]`);
      }
      const c = await b.box('#panoCanvas');
      for (let g = 0; g < 4; g++) {
        await b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y, id: 1 }] });
        for (let i = 1; i <= 8; i++) {
          await b.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x - i * 12, y: c.y - i * 20, id: 1 }] });
        }
        await b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await b.sleep(150);
      }
      const s = await state(b);
      assert.equal(s.open, true, 'still open after five stations and four drags');
      assert.equal(s.y, opened.y, 'the page behind never scrolled');
      assert.equal(s.projectInView, false, 'the request form was never reached');
    } finally { await b.close(); }
  });
});
