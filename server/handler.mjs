/* ============================================================
   POST /api/project-request

   One portable Web-standard handler: Request in, Response out. The
   Netlify function is a two-line wrapper around it and the Vite dev
   middleware adapts Node's req/res onto it, so development and
   production run the SAME validator — there is no dev-only success path.

   Field rules, upload rules and the service list come from
   src/data/services.js, the same module the browser validates against.
   ============================================================ */

import { SERVICES, UPLOAD, LIMITS } from '../src/data/services.js';
import { sendMail, MailError } from './mail.mjs';

/* Every field the endpoint will look at. Anything else in the body is a
   rejection, not a silent ignore — an unexpected field means either a
   stale client or someone probing. */
const ALLOWED = new Set([
  'service', 'name', 'email', 'phone', 'site', 'brief',
  'files', 'company', 'started',
]);

const RE_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Control characters, except tab / newline which belong in a brief. */
const RE_CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/* -------------------------------------------------- abuse mitigation */
/* Two sliding windows, because they defend against different things and a
   single counter cannot do both.
     BURST — every request that reaches the handler. Generous, and its job is
             only to stop one client hammering a warm instance.
     SEND  — requests that actually reach the mail provider. Strict, because
             that is the expensive, outbound, abusable half.
   A validation failure must NOT consume the strict budget: a person fixing
   three fields would otherwise lock themselves out of their own inquiry.
   Per-instance, so it is a speed bump rather than a guarantee — serverless
   instances are ephemeral and horizontally scaled. The durable layer is the
   platform's own edge rate limiting; see README. */
const RATE = {
  burst: { windowMs: 10 * 60 * 1000, max: 40 },
  send: { windowMs: 10 * 60 * 1000, max: 5 },
};
const hits = { burst: new Map(), send: new Map() };

function rateLimited(kind, ip, now = Date.now()) {
  if (!ip) return false;
  const { windowMs, max } = RATE[kind];
  const map = hits[kind];
  const win = (map.get(ip) || []).filter((t) => now - t < windowMs);
  if (win.length >= max) { map.set(ip, win); return true; }
  win.push(now);
  map.set(ip, win);
  if (map.size > 5000) map.clear();            // unbounded-growth guard
  return false;
}

/* ----------------------------------------------------------- helpers */
const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  },
});

/** Strip control characters and collapse runaway whitespace. */
function clean(v, max) {
  if (typeof v !== 'string') return '';
  return v
    .replace(/\r\n/g, '\n')
    .replace(RE_CTRL, '')
    .replace(/[ \t]{4,}/g, '   ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, max);
}

/** A filename safe to put in a header, a log line and an attachment. */
function safeName(name) {
  const base = String(name || 'file').split(/[/\\]/).pop();
  const dot = base.lastIndexOf('.');
  const stem = (dot > 0 ? base.slice(0, dot) : base)
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 60) || 'file';
  const ext = (dot > 0 ? base.slice(dot + 1) : '')
    .toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  return ext ? `${stem}.${ext}` : stem;
}

const extOf = (name) => (String(name).split('.').pop() || '').toLowerCase();

/** Does the body actually start with the signature its extension claims? */
function magicOk(ext, bytes) {
  const sigs = UPLOAD.types[ext]?.magic;
  if (!sigs) return false;
  return sigs.some((sig) => sig.every((b, i) => bytes[i] === b));
}

/* ------------------------------------------------------------ handler */
export async function handleProjectRequest(request, { env = {}, ip = null } = {}) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { allow: 'POST, OPTIONS' } });
  }
  if (request.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed', message: 'POST szükséges.' });
  }

  /* ---- parse ---- */
  let form;
  try {
    const ct = request.headers.get('content-type') || '';
    if (!ct.includes('multipart/form-data') && !ct.includes('application/x-www-form-urlencoded')) {
      return json(415, { ok: false, error: 'unsupported_media_type', message: 'Érvénytelen kérésformátum.' });
    }
    form = await request.formData();
  } catch {
    return json(400, {
      ok: false,
      error: 'bad_request',
      message: 'A kérés nem volt feldolgozható. Lehet, hogy a csatolmány túl nagy.',
    });
  }

  /* ---- reject unexpected fields ---- */
  const unknown = [...new Set([...form.keys()])].filter((k) => !ALLOWED.has(k));
  if (unknown.length) {
    return json(400, {
      ok: false,
      error: 'unexpected_fields',
      message: 'Ismeretlen mező a kérésben.',
      fields: unknown.slice(0, 8),
    });
  }

  /* ---- honeypot: a field no human can see and no human fills ---- */
  if (clean(form.get('company'), 200)) {
    // Answer exactly as a success looks, so a bot learns nothing.
    return json(200, { ok: true, transport: 'discarded', reference: null });
  }

  /* ---- time-based check: a real form takes seconds to fill ---- */
  const started = Number(form.get('started'));
  if (Number.isFinite(started) && started > 0 && Date.now() - started < 2500) {
    return json(429, {
      ok: false,
      error: 'too_fast',
      message: 'Túl gyors beküldés. Próbálja újra néhány másodperc múlva.',
    });
  }

  /* ---- burst limit ---- */
  if (rateLimited('burst', ip)) {
    return json(429, {
      ok: false,
      error: 'rate_limited',
      message: 'Túl sok kérés érkezett erről a címről. Próbálja újra később, vagy írjon közvetlenül emailben.',
    });
  }

  /* ---- service ---- */
  const service = String(form.get('service') || '');
  const cfg = SERVICES[service];
  if (!cfg) {
    return json(400, { ok: false, error: 'invalid_service', message: 'Ismeretlen szolgáltatás.' });
  }

  /* ---- text fields ---- */
  const values = {};
  const errors = {};
  for (const key of ['name', 'email', 'phone', 'site', 'brief']) {
    const rule = cfg.fields[key];
    const raw = clean(form.get(key), LIMITS[key]);
    if (!rule) {
      // Field does not belong to this service — must be empty.
      if (raw) errors[key] = 'Ez a mező nem tartozik a kiválasztott szolgáltatáshoz.';
      continue;
    }
    values[key] = raw;
    if (rule === 'req' && !raw) errors[key] = 'Kötelező mező.';
    else if (key === 'email' && raw && !RE_MAIL.test(raw)) errors[key] = 'Érvényes email címet adjon meg.';
    else if (key === 'brief' && raw && raw.length < LIMITS.briefMin) errors[key] = 'Néhány szóval írja le a feladatot.';
    else if (raw.length >= LIMITS[key]) errors[key] = `Legfeljebb ${LIMITS[key]} karakter.`;
  }

  /* ---- files ---- */
  const incoming = form.getAll('files')
    .filter((f) => f && typeof f === 'object' && typeof f.arrayBuffer === 'function' && f.size > 0);
  const attachments = [];
  let fileError = '';
  let total = 0;

  if (incoming.length > UPLOAD.maxFiles) {
    fileError = `Legfeljebb ${UPLOAD.maxFiles} fájl csatolható.`;
  } else {
    for (const f of incoming) {
      const name = safeName(f.name);
      const ext = extOf(name);
      if (!cfg.upload.accept.includes(ext)) {
        fileError = `Nem támogatott formátum: ${name}. Elfogadott: ${cfg.upload.formats}.`;
        break;
      }
      if (f.size > UPLOAD.maxFileBytes) {
        fileError = `${name} túl nagy. Fájlonként legfeljebb ${Math.round(UPLOAD.maxFileBytes / 1048576)} MB.`;
        break;
      }
      total += f.size;
      if (total > UPLOAD.maxTotalBytes) {
        fileError = `A csatolmányok összmérete legfeljebb ${Math.round(UPLOAD.maxTotalBytes / 1048576)} MB lehet.`;
        break;
      }
      const bytes = new Uint8Array(await f.arrayBuffer());
      if (!magicOk(ext, bytes)) {
        fileError = `${name} tartalma nem egyezik a kiterjesztésével. Töltse fel valódi ${ext.toUpperCase()} fájlként.`;
        break;
      }
      attachments.push({ filename: name, contentType: UPLOAD.types[ext].mime, bytes });
    }
  }

  if (!fileError && cfg.upload.required && !attachments.length) {
    fileError = 'Ehhez a szolgáltatáshoz egy reprezentatív mintarajz szükséges.';
  }
  if (fileError) errors.files = fileError;

  if (Object.keys(errors).length) {
    return json(422, {
      ok: false,
      error: 'validation_failed',
      message: 'Néhány mezőt javítani kell.',
      fields: errors,
    });
  }

  /* ---- send limit ---- */
  /* Only now, once the submission is known to be well formed. */
  if (rateLimited('send', ip)) {
    return json(429, {
      ok: false,
      error: 'rate_limited',
      message: 'Túl sok kérés érkezett erről a címről. Próbálja újra később, vagy írjon közvetlenül emailben.',
    });
  }

  /* ---- deliver ---- */
  const reference = refFor(service);
  const text = compose({ cfg, values, attachments, reference, ip });

  try {
    const { transport } = await sendMail({
      subject: `GoDataFusion — ${cfg.key} kérés — ${reference}`,
      text,
      replyTo: values.email,
      attachments,
    }, env);

    return json(200, { ok: true, transport, reference });
  } catch (err) {
    const isMail = err instanceof MailError;
    if (isMail) console.error('[gdf:api] mail failure —', err.detail || err.message);
    else console.error('[gdf:api] unexpected failure', err);

    // Provider detail stays in the server log; the browser gets the honest
    // category and a message the visitor can act on.
    return json(isMail ? err.status : 500, {
      ok: false,
      error: isMail && err.status === 503 ? 'transport_unconfigured' : 'delivery_failed',
      message: isMail ? err.message : 'Váratlan hiba történt a feldolgozás közben.',
    });
  }
}

/** Human-readable reference, so a visitor can quote it in a follow-up. */
function refFor(service) {
  const d = new Date();
  const stamp = `${String(d.getUTCFullYear()).slice(2)}`
    + `${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    + `${String(d.getUTCDate()).padStart(2, '0')}`;
  const rnd = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
  return `${service.slice(0, 3).toUpperCase()}-${stamp}-${rnd}`;
}

const RULE = '—'.repeat(52);
const pad = (s, n) => String(s).padEnd(n, ' ');

function compose({ cfg, values, attachments, reference, ip }) {
  const L = [];
  L.push('GODATAFUSION — PROJEKT KÉRÉS');
  L.push(RULE);
  L.push(`${pad('AZONOSÍTÓ', 16)}${reference}`);
  L.push(`${pad('SZOLGÁLTATÁS', 16)}${cfg.key} — ${cfg.sub}`);
  L.push(`${pad('BEÉRKEZETT', 16)}${new Date().toISOString()}`);
  L.push(RULE);
  const rows = [['NÉV / CÉG', 'name'], ['EMAIL', 'email'], ['TELEFON', 'phone'], ['HELYSZÍN', 'site']];
  rows.forEach(([label, key]) => {
    if (values[key]) L.push(`${pad(label, 16)}${values[key]}`);
  });
  L.push(RULE);
  L.push('FELADAT');
  L.push(values.brief || '—');
  L.push(RULE);
  if (attachments.length) {
    L.push(`CSATOLMÁNY (${attachments.length}) — ellenőrizve, csatolva`);
    attachments.forEach((a) => L.push(`  ${pad(a.filename, 40)}${(a.bytes.length / 1024).toFixed(0)} KB`));
  } else {
    L.push('CSATOLMÁNY — nincs');
  }
  if (cfg.large) {
    L.push(RULE);
    L.push('Nagyobb projekt: a teljes dokumentáció az elfogadott ajánlat után,');
    L.push('a dedikált Drive projektfelületen.');
  }
  L.push(RULE);
  L.push(`forrás IP: ${ip || 'ismeretlen'}`);
  return L.join('\n');
}

export const _internals = { clean, safeName, magicOk, rateLimited, hits, RATE };
