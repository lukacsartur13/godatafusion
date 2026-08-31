/**
 * Keyframed narrative state.
 *
 * A track is a list of stops along one scroll range; each stop is a weight
 * map over the scene's presets. Reading a track at progress p blends the two
 * surrounding stops, which is what makes CAPTURE → MEASURE → QUANTIFY a
 * continuous morph of one object instead of three sections crossfading.
 */
export function readTrack(frames, p) {
  const t = p <= 0 ? 0 : p >= 1 ? 1 : p;
  let i = 0;
  while (i < frames.length - 2 && frames[i + 1].at <= t) i++;
  const a = frames[i], b = frames[i + 1];
  const span = b.at - a.at;
  const k = span <= 0 ? 0 : Math.min(1, Math.max(0, (t - a.at) / span));

  const out = {};
  for (const key in a.w) out[key] = a.w[key] * (1 - k);
  for (const key in b.w) out[key] = (out[key] || 0) + b.w[key] * k;
  return { weights: out, k, from: a, to: b, index: k < 0.5 ? i : i + 1 };
}

/** Scalar keyframes on the same stops — camera side, opacity, whatever. */
export function readScalar(frames, p, key, fallback = 0) {
  const t = p <= 0 ? 0 : p >= 1 ? 1 : p;
  let i = 0;
  while (i < frames.length - 2 && frames[i + 1].at <= t) i++;
  const a = frames[i], b = frames[i + 1];
  const span = b.at - a.at;
  const k = span <= 0 ? 0 : Math.min(1, Math.max(0, (t - a.at) / span));
  const av = a[key] ?? fallback, bv = b[key] ?? fallback;
  return av + (bv - av) * k;
}
