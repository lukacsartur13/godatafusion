/* ============================================================
   NARRATIVE STOP CONSTRUCTION — pure, DOM-free.

   Phase 2 built these inline from live `getBoundingClientRect()` reads,
   which made the most load-bearing calculation on the site the one thing
   that could not be tested or checked. The measuring still happens in
   narrative.js; the ARITHMETIC lives here, takes plain numbers, and is
   validated on every refresh.

   A bad stop table does not throw — a broken scroll narrative is still a
   readable page — but in development it says exactly what is wrong.
   ============================================================ */

/* PHASE 11 — THE PIPELINE AND THE FOUR READINGS ARE GONE FROM THIS TABLE.

   Two blocks used to be built here: the FUSION's five sticky states and
   the same-place section's four. Both described in a rail of headings what
   THE DESCENT now performs as one continuous movement through one
   building, and the whole point of Phase 11 is that the page stops
   restating the argument beside the object that is already making it.

   What is left in this file is the thread that still belongs to the
   narrative: the hero handing over to the manifesto, and the three service
   chapters. Between them the journey owns the scene outright — see
   modules/descent.js — and this table simply holds the state the reader
   comes back to.

   `buildStops` is unchanged in shape: a layout without a `fusion` or a
   `sameplace` box produces no stops for them, which is exactly what the
   markup now measures. */

/* Where a chapter's state begins, as a fraction of a viewport above its own
   top edge. A chapter box opens with padding, so its type is being read well
   before its box edge arrives; this is the difference between the object
   changing WITH the reader and changing a third of a screen after them. */
const READ_LINE = 0.32;

/* How much scroll a hand-over between two chapters gets, as a fraction of
   the shorter chapter. Zero is a cut; this is a morph. */
const MORPH = 0.24;

/**
 * The scroll range each chapter owns, in track coordinates. Contiguous by
 * construction — one chapter's end IS the next one's start — so no
 * measurement noise can put two of them in the wrong order.
 * Exported because the QUANTIFY extraction sequence has to read the same
 * boundaries the scene does.
 */
export function chapterBounds(L, floor = 0) {
  const { startY, range, viewportH } = L;
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  /* The reading line pulls every chapter earlier, which can pull the first
     one back over the section that hands into it. A chapter may start early;
     it may not start before the thing it takes over from has finished. */
  const startOf = (c, i) => Math.max(i === 0 ? floor : 0,
    clamp01((c.top - viewportH * READ_LINE - startY) / range));
  return L.chapters.map((c, i) => ({
    id: c.id,
    a: startOf(c, i),
    b: i + 1 < L.chapters.length
      ? startOf(L.chapters[i + 1], i + 1)
      : clamp01((c.top + c.height - startY) / range),
  }));
}

/**
 * @param {object} L layout measurements, all in document pixels
 * @param {number} L.startY   top of the hero
 * @param {number} L.range    the trigger's real scroll distance
 * @param {number} L.viewportH
 * @param {{top:number,height:number}} L.hero
 * @param {{top:number,height:number}|null} L.manifesto
 * @param {{top:number,height:number}|null} L.descent
 * @param {Array<{id:string,top:number,height:number,side:number,enter:object,close:object}>} L.chapters
 */
export function buildStops(L) {
  const { startY, range, viewportH } = L;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  const at = (b, f = 0) => (b.top + b.height * f - startY) / range;
  // A sticky block's state range ends one viewport before its container does.
  const atSticky = (b, f) => (b.top + Math.max(0, b.height - viewportH) * f - startY) / range;

  const S = [];
  const push = (a, o) => S.push({ at: clamp(a), ...o });

  /* --- hero: the mode system owns the scene until the reader leaves --- */
  push(0, { w: { idle: 1 }, mix: 0, side: 1, op: 1, blur: 0, mode: null });
  push(at(L.hero, 0.30), { w: { idle: 1 }, mix: 0, side: 1, op: 1, blur: 0, mode: null });
  /* --- hero → manifesto: geometry decomposes into data points --------- */
  push(at(L.hero, 0.72), { w: { cloud: 1 }, mix: 0.75, side: 1, op: 0.62, blur: 0.6, mode: null });
  push(at(L.hero, 1), { w: { cloud: 1 }, mix: 1, side: 1, op: 0.30, blur: 1.6, mode: null });

  if (L.manifesto) {
    push(at(L.manifesto, 0.15), { w: { cloud: 0.4, data: 0.6 }, mix: 1, side: 1, op: 0.11, blur: 2.4, mode: null });
    push(at(L.manifesto, 0.92), { w: { data: 1 }, mix: 1, side: 1, op: 0.09, blur: 2.4, mode: null });
  }


  /* --- the journey ---------------------------------------------------

     THE DESCENT owns the scene for its whole length, so this table must
     not try to. What it does own is the two SEAMS: the state the journey
     is entered from, and the state it is left in.

     Entering, the manifesto has already dissolved the object into data
     points at 9% presence — which is the correct frame to begin a journey
     that opens on the building at distance, because the first thing the
     journey does is resolve it.

     Leaving, the last frame of the path is `dResolve`: the building
     standing at distance in material reality. This stop puts the
     narrative's own idea of the scene at the same place, so the moment
     modules/descent.js hands the camera back there is nothing to catch up
     with. Without it the reader would come out of the journey into the
     manifesto's 9% ghost, which is the frame from BEFORE they went in.
     ------------------------------------------------------------------- */
  if (L.descent) {
    push(at(L.descent, 0.02), { w: { cloud: 0.3, data: 0.7 }, mix: 1, side: 0, op: 0.10, blur: 2.2, mode: null });
    push(at(L.descent, 0.99), { w: { dResolve: 1 }, mix: 1, side: 0, op: 1, blur: 0, mode: null });
    push(at(L.descent, 1), { w: { dResolve: 1 }, mix: 1, side: 0, op: 0.62, blur: 0, mode: null });
  }

  /* --- three chapters of one system -----------------------------------

     Two things decide whether a chapter change reads as a MORPH or as a cut,
     and Phase 2 got both wrong.

     WHERE it happens. A chapter's state used to begin when its box top
     crossed the top of the document flow. But a chapter's box starts 16vh
     of padding above its headline, so by the time that edge passes, the
     reader has been looking at the new headline for a third of a viewport.
     Measured: with "MEASURE THE SITE." at the reading line the scene was
     still 100% captureClose. States are now keyed to a READING LINE — the
     scroll position at which a chapter's opening type is actually being
     read — so the object changes when the reader changes chapter.

     HOW LONG it takes. Adjacent chapters shared one scroll position, so the
     blend between them had zero distance: captureClose at 0.8005 and
     measure at 0.8005 is a hard cut, however smoothly each state is built.
     Every boundary now owns a real span, centred on it — the previous
     state holds, dissolves through an explicit half-and-half frame, and
     resolves into the next. The accent crosses at that midpoint, so colour
     and geometry turn together rather than one chasing the other.
     ------------------------------------------------------------------ */
  // Everything pushed so far belongs to the hero / manifesto / fusion thread.
  const preEnd = S.length ? Math.max(...S.map((x) => x.at)) : 0;
  const bounds = chapterBounds(L, preEnd);

  L.chapters.forEach((c, i) => {
    const { a, b } = bounds[i];
    const span = b - a;
    const prev = i > 0 ? L.chapters[i - 1] : null;
    const prevSide = prev ? prev.side : 1;
    // The morph is sized against the SHORTER of the two chapters it joins,
    // so a short chapter is never swallowed by its neighbour's hand-over.
    const inM = prev ? MORPH * Math.min(span, bounds[i - 1].b - bounds[i - 1].a) : 0;
    const outM = i + 1 < bounds.length
      ? MORPH * Math.min(span, bounds[i + 1].b - bounds[i + 1].a)
      : 0;

    if (prev) {
      // Halfway through the hand-over: half of each state, and the accent
      // changes hands here rather than at either end of the morph.
      const half = {};
      for (const k in prev.close) half[k] = (half[k] || 0) + prev.close[k] * 0.5;
      for (const k in c.enter) half[k] = (half[k] || 0) + c.enter[k] * 0.5;
      push(a, { w: half, mix: 1, side: prevSide, op: 0.95, blur: 0, mode: c.id });
      push(a + inM / 2, { w: c.enter, mix: 1, side: prevSide, op: 1, blur: 0, mode: c.id });
    } else {
      // Nothing to hand over from; the fusion close resolves straight in.
      push(a, { w: c.enter, mix: 1, side: prevSide, op: 0.95, blur: 0, mode: c.id });
    }

    // The object crosses to this chapter's half of the frame.
    push(a + span * 0.22, { w: c.enter, mix: 1, side: c.side, op: 1, blur: 0, mode: c.id });
    // …and resolves into the chapter's close state, which it then holds.
    push(a + span * 0.58, { w: c.close, mix: 1, side: c.side, op: 1, blur: 0, mode: c.id, chapter: i });
    push(b - outM / 2, { w: c.close, mix: 1, side: c.side, op: 1, blur: 0, mode: c.id, chapter: i });
  });

  push(1, { w: { planTight: 1 }, mix: 1, side: -0.9, op: 0.9, blur: 0, mode: 'quantify' });

  S.sort((a, b) => a.at - b.at);
  return S;
}

/**
 * Every invariant the track depends on. Returns a list of problem strings;
 * empty means the table is usable.
 *
 * @param {Array} stops
 * @param {object} [ctx] the raw layout, so a problem can name its cause
 */
export function validateStops(stops, ctx = {}) {
  const bad = [];

  if (!Array.isArray(stops) || stops.length < 4) {
    bad.push(`only ${stops?.length ?? 0} stops were produced — the narrative cannot interpolate`);
    return bad;
  }

  stops.forEach((s, i) => {
    if (!Number.isFinite(s.at)) bad.push(`stop ${i} has a non-finite position (${s.at})`);
    if (s.at < 0 || s.at > 1) bad.push(`stop ${i} at ${s.at} falls outside [0,1]`);
    if (!s.w || typeof s.w !== 'object' || !Object.keys(s.w).length) {
      bad.push(`stop ${i} carries no weight map`);
    } else {
      for (const k in s.w) {
        if (!Number.isFinite(s.w[k])) bad.push(`stop ${i} weight "${k}" is not finite`);
      }
    }
    for (const key of ['mix', 'side', 'op', 'blur']) {
      if (key in s && !Number.isFinite(s[key])) bad.push(`stop ${i} scalar "${key}" is not finite`);
    }
  });

  for (let i = 1; i < stops.length; i++) {
    if (stops[i].at < stops[i - 1].at) {
      bad.push(`stops ${i - 1}→${i} are out of order (${stops[i - 1].at} > ${stops[i].at})`);
    }
  }

  /* Every chapter must own a real span, or its state is unreachable — the
     failure mode that silently turns a chapter into a single frame. */
  const spans = new Map();
  stops.forEach((s) => {
    if (typeof s.mode !== 'string') return;
    const cur = spans.get(s.mode) || [s.at, s.at];
    spans.set(s.mode, [Math.min(cur[0], s.at), Math.max(cur[1], s.at)]);
  });
  const expected = ctx.chapters?.map((c) => c.id) ?? [];
  expected.forEach((id) => {
    const sp = spans.get(id);
    if (!sp) bad.push(`chapter "${id}" produced no stop at all`);
    else if (sp[1] - sp[0] <= 1e-4) bad.push(`chapter "${id}" has a zero-length range at ${sp[0].toFixed(4)}`);
  });

  /* Chapter ranges are contiguous now, so a chapter that has not laid out
     still gets a slot in the track and no longer shows up as a zero-length
     range. Catch it where it actually goes wrong — in the measurement. */
  (ctx.chapters || []).forEach((c) => {
    if (!Number.isFinite(c.height) || c.height <= 1) {
      bad.push(`chapter "${c.id}" measured ${c.height}px tall — it has not laid out yet`);
    }
    if (!Number.isFinite(c.top)) bad.push(`chapter "${c.id}" has a non-finite top`);
  });

  /* Two chapters landing on the same span means the page collapsed — usually
     a chapter element that measured 0 tall because it was still hidden. */
  const ids = [...spans.keys()].filter(Boolean);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = spans.get(ids[i]), b = spans.get(ids[j]);
      const overlap = Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
      const shorter = Math.min(a[1] - a[0], b[1] - b[0]);
      if (shorter > 1e-4 && overlap > shorter * 0.5) {
        bad.push(`chapters "${ids[i]}" and "${ids[j]}" overlap by ${(overlap * 100).toFixed(1)}% of the track`);
      }
    }
  }

  /* The accent, and with it the whole page's colour, is a STEP along this
     table. It must never run backwards: a single stop out of order shows the
     reader the previous chapter's state and its colour after they have
     already arrived in the next one. */
  const seenOrder = expected.length ? expected : [...spans.keys()].filter(Boolean);
  let high = -1;
  for (const s of stops) {
    if (typeof s.mode !== 'string') continue;
    const idx = seenOrder.indexOf(s.mode);
    if (idx === -1) continue;
    if (idx < high) {
      bad.push(`the mode step runs backwards to "${s.mode}" at ${s.at.toFixed(4)} — `
        + `a later chapter has already started`);
      break;
    }
    high = idx;
  }

  if (ctx.range !== undefined && !(ctx.range > 1)) {
    bad.push(`the trigger range measured ${ctx.range}px — the page is shorter than one viewport`);
  }

  return bad;
}

/** DEV-only reporter. Silent in production; `import.meta.env.DEV` folds it out. */
export function reportStops(stops, ctx) {
  const bad = validateStops(stops, ctx);
  if (!bad.length) return true;
  console.warn(
    `[gdf:narrative] ${bad.length} problem(s) in the measured stop table — the ` +
    'scroll narrative will not read correctly:\n  • ' + bad.join('\n  • '),
    { stops, ctx },
  );
  return false;
}
