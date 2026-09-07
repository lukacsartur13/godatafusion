import gsap from 'gsap';
import { ScrollTrigger } from '../core/scroll.js';
import { env } from '../core/env.js';
import { store } from '../core/store.js';
import {
  SERVICES, SERVICE_IDS, UPLOAD, LIMITS, ENDPOINT,
  MEASURE_OUTPUTS, QUANTIFY_TASKS, serviceFromQuery, taskFromQuery,
} from '../data/services.js';
import { COMPANY } from '../data/company.js';
import { glyph } from '../glyphs/glyphs.js';

/* ============================================================
   PROJEKT INDÍTÁSA — one component, four pages.

   Phase 2 had this markup inline in index.html and its behaviour in
   project.js. A service page needs the identical experience with its own
   service pre-selected, so the markup is now generated from
   data/services.js and mounted wherever a page puts `#projectMount`.
   Three pages cannot drift from the homepage because there is only one
   of it.

   PHASE 12 — the form is SERVICE-SHAPED, not generic. Picking a service
   rewrites the field set:

     360° KAMERA        helyszín · feladat · kb. terület / épületméret ·
                        alaprajz (opcionális) · kapcsolat
     TERÜLETFELMÉRÉS    helyszín · feladat · szükséges eredmény
                        (m² / m³ / fm / szintvonal / 3D) · terv (ha van) ·
                        kapcsolat
     MENNYISÉGSZÁMÍTÁS  feladat típusa (konszignáció / helyiségkönyv /
                        rétegrend / padlóburkolat / egyéb) · PDF mintarajz
                        (kötelező) · feladatleírás · kapcsolat

   It submits. `POST multipart/form-data` to the endpoint in
   data/services.js, which is the same handler in dev, preview and
   production. SUBMITTING / SUCCESS / ERROR are real states read from the
   real response — there is no simulated success anywhere in this file.
   ============================================================ */

const MB = 1024 * 1024;
const RE_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const fmtSize = (b) => (b >= MB
  ? `${(b / MB).toFixed(1).replace('.', ',')} MB`
  : `${Math.max(1, Math.round(b / 1024))} KB`);

const ext = (n) => (n.split('.').pop() || '').toLowerCase();

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/* The first question a project intake asks is not "which product would you
   like": it is WHAT ARE WE WORKING WITH. So each selector leads with the
   OBJECT — a site, a terrain, a drawing — and names the service second. */
const PICK_OBJ = {
  capture: 'Egy meglévő helyszín',
  measure: 'Egy felmérendő terep',
  quantify: 'Egy meglévő tervrajz',
};

/* ---------------------------------------------------------------- markup */
function markup() {
  const picks = SERVICE_IDS.map((id) => {
    const s = SERVICES[id];
    return `
        <label class="pick hv-glyph" data-service="${id}" data-svc="${id}">
          <input type="radio" name="service" value="${id}" class="sr-only" />
          <span class="pick__top">
            <span class="pick__idx">${s.index}</span>
            ${glyph(id, { cls: 'pick__gl gl--24 gl--anim' })}
          </span>
          <span class="pick__obj">${esc(PICK_OBJ[id])}</span>
          <span class="pick__key">${esc(s.key)}</span>
          <span class="pick__hu">${esc(s.sub)}</span>
          <span class="pick__bar" aria-hidden="true"></span>
        </label>`;
  }).join('');

  const outputs = Object.entries(MEASURE_OUTPUTS).map(([k, v]) => `
            <label class="chip"><input type="checkbox" name="outputs" value="${k}" /><span>${esc(v)}</span></label>`).join('');
  const tasks = Object.entries(QUANTIFY_TASKS).map(([k, v]) => `
            <label class="chip"><input type="radio" name="task" value="${k}" /><span>${esc(v)}</span></label>`).join('');

  return `
    <form class="pf" id="projectForm" novalidate enctype="multipart/form-data">
      <fieldset class="pf__pick">
        <legend class="pf__legend pf__legend--entry">
          <span class="pf__step">01</span>
          <span class="pf__q">MIVEL<br>DOLGOZUNK?</span>
        </legend>
        <div class="picks" role="radiogroup" aria-labelledby="pickLabel">
          <span class="sr-only" id="pickLabel">Szolgáltatás kiválasztása</span>${picks}
        </div>
        <p class="pf__hint" id="pfHint">Válasszon szolgáltatást — az űrlap mezői ehhez igazodnak.</p>
      </fieldset>

      <div class="pf__body" id="pfBody" hidden>
       <div class="pf__grid">
        <div class="pf__main">
        <fieldset class="pf__fields">
          <legend class="pf__legend"><span class="pf__step">02</span> <span id="pfFieldsTitle">A FELADAT</span></legend>

          <div class="fld fld--group" data-field="task">
            <label id="lblTask">${glyph('quantify', { cls: 'fld__gl gl--16' })}Mit szeretne? <b aria-hidden="true">*</b><i>opcionális</i></label>
            <div class="chips" role="radiogroup" aria-labelledby="lblTask">${tasks}
            </div>
            <p class="fld__help">Egy kimutatás egy kérésben. Több típusnál írja a leírásba, melyeket kéri.</p>
            <p class="fld__err" id="errTask" hidden></p>
          </div>

          <div class="fld" data-field="site">
            <label for="fSite">${glyph('location', { cls: 'fld__gl gl--16' })}Projekt helyszíne <b aria-hidden="true">*</b><i>opcionális</i></label>
            <input id="fSite" name="site" type="text" maxlength="${LIMITS.site}" placeholder="Település, cím vagy megnevezés" />
            <p class="fld__err" id="errSite" hidden></p>
          </div>

          <div class="fld" data-field="size">
            <label for="fSize">${glyph('area', { cls: 'fld__gl gl--16' })}Kb. terület / épületméret <b aria-hidden="true">*</b><i>opcionális</i></label>
            <input id="fSize" name="size" type="text" maxlength="${LIMITS.size}" placeholder="pl. 1 200 m², 3 szint" />
            <p class="fld__err" id="errSize" hidden></p>
          </div>

          <div class="fld fld--group" data-field="outputs">
            <label id="lblOutputs">${glyph('measure', { cls: 'fld__gl gl--16' })}Szükséges eredmény <b aria-hidden="true">*</b><i>opcionális</i></label>
            <div class="chips" role="group" aria-labelledby="lblOutputs">${outputs}
            </div>
            <p class="fld__help">Több is jelölhető. Ha nem biztos benne, hagyja üresen — a feladatleírásból kiderül.</p>
            <p class="fld__err" id="errOutputs" hidden></p>
          </div>

          <div class="fld fld--wide" data-field="brief">
            <label for="fBrief">${glyph('data', { cls: 'fld__gl gl--16' })}A feladat rövid leírása <b aria-hidden="true">*</b><i>opcionális</i></label>
            <textarea id="fBrief" name="brief" rows="4" maxlength="${LIMITS.brief}" placeholder="Mit kell elkészíteni, és mire fogja használni?"></textarea>
            <p class="fld__err" id="errBrief" hidden></p>
          </div>
        </fieldset>

        <fieldset class="pf__files">
          <legend class="pf__legend"><span class="pf__step">03</span> <span id="upTitle">DOKUMENTÁCIÓ</span></legend>
          <p class="pf__uphint" id="upHint"></p>

          <div class="drop hv-glyph" id="drop" tabindex="0" role="button"
               aria-describedby="upHint upLimits" aria-label="Fájl hozzáadása — tallózás vagy húzza ide">
            ${glyph('upload', { cls: 'drop__gl gl--32 gl--anim' })}
            <span class="drop__k" id="dropTitle">FÁJL HOZZÁADÁSA</span>
            <span class="drop__c">Húzza ide, vagy kattintson a tallózáshoz</span>
            <span class="drop__f" id="dropFormats">PDF</span>
            <input type="file" id="fileInput" class="sr-only" multiple />
          </div>

          <p class="pf__limits" id="upLimits">Legfeljebb ${UPLOAD.maxFiles} fájl, fájlonként ${Math.round(UPLOAD.maxFileBytes / MB)} MB, összesen ${Math.round(UPLOAD.maxTotalBytes / MB)} MB.</p>
          <ul class="files" id="fileList"></ul>
          <p class="fld__err" id="errFiles" hidden></p>

          <p class="pf__large" id="pfLarge" hidden>
            Nagyobb projekt esetén első körben elegendő egy reprezentatív mintarajz.
            Az árajánlat elfogadása után dedikált Drive projektmappát biztosítunk a
            teljes dokumentáció feltöltéséhez — a nyilvános űrlap nem dokumentumtár.
          </p>
        </fieldset>

        <fieldset class="pf__fields">
          <legend class="pf__legend"><span class="pf__step">04</span> KAPCSOLAT</legend>

          <div class="fld" data-field="name">
            <label for="fName">Név / cég <b aria-hidden="true">*</b><i>opcionális</i></label>
            <input id="fName" name="name" type="text" autocomplete="organization" maxlength="${LIMITS.name}" required />
            <p class="fld__err" id="errName" hidden></p>
          </div>

          <div class="fld" data-field="email">
            <label for="fEmail">Email <b aria-hidden="true">*</b><i>opcionális</i></label>
            <input id="fEmail" name="email" type="email" autocomplete="email" inputmode="email" maxlength="${LIMITS.email}" required />
            <p class="fld__err" id="errEmail" hidden></p>
          </div>

          <div class="fld" data-field="phone">
            <label for="fPhone">Telefonszám <b aria-hidden="true">*</b><i>opcionális</i></label>
            <input id="fPhone" name="phone" type="tel" autocomplete="tel" maxlength="${LIMITS.phone}" />
            <p class="fld__err" id="errPhone" hidden></p>
          </div>
        </fieldset>

        <div class="pf__foot">
          <button class="btn btn--solid btn--primary hv-scan pf__send" type="submit" data-cursor="start">
            <span class="pf__sendl">AJÁNLATKÉRÉS ELKÜLDÉSE</span>
            ${glyph('delivery', { cls: 'gl--16' })}
            <i class="pf__spin" aria-hidden="true"></i>
          </button>
          <p class="pf__backend" id="pfBackend">
            A kérés titkosított kapcsolaton keresztül érkezik hozzánk. A megadott
            adatokat és a csatolt anyagot bizalmas projektadatként kezeljük, és
            kizárólag az ajánlatadáshoz használjuk. <a data-company="privacy-href" href="/adatkezeles/">Adatkezelési tájékoztató</a>
          </p>
        </div>
        </div>

        <aside class="pf__side">
          <p class="pf__sk">${glyph('project-space', { cls: 'gl--16' })}MI TÖRTÉNIK EZUTÁN</p>
          <ol class="pf__next">
            <li><span>01</span> Átnézzük a beküldött anyagot és a feladat terjedelmét.</li>
            <li><span>02</span> Egyedi árajánlatot küldünk — a ténylegesen elvégzendő munkára.</li>
            <li><span>03</span> Elfogadás után dedikált Drive projektmappát kap a teljes dokumentációhoz.</li>
            <li><span>04</span> Feldolgozás, emberi ellenőrzéssel — majd a strukturált eredmény átadása.</li>
          </ol>
          <p class="pf__sn">
            Nem kell mindent egyszerre feltölteni. Nagyobb munkánál egyetlen
            reprezentatív mintarajz is elég az induláshoz.
          </p>
        </aside>
       </div>

       <!-- Abuse mitigation. Neither of these is ever seen or touched by a
            person; the server treats a filled honeypot as a discard and an
            impossibly fast submission as a rejection. -->
       <div class="pf__trap" aria-hidden="true">
         <label for="fCompany">Company</label>
         <input id="fCompany" name="company" type="text" tabindex="-1" autocomplete="off" />
       </div>
      </div>

      <p class="pf__status sr-only" id="pfStatus" role="status" aria-live="polite"></p>

      <div class="pfout" id="pfOut" hidden tabindex="-1"></div>
    </form>`;
}

/* ------------------------------------------------------------- component */
/**
 * @param {HTMLElement} mount
 * @param {object} [opts]
 * @param {string} [opts.service] pre-selected service (a service page passes its own)
 * @param {boolean} [opts.lockAccent] keep the page accent on `service` regardless of scroll
 */
export function mountRequest(mount, opts = {}) {
  if (!mount) return null;
  mount.innerHTML = markup();

  const form = mount.querySelector('#projectForm');
  const picks = [...form.querySelectorAll('.pick')];
  const body = form.querySelector('#pfBody');
  const hint = form.querySelector('#pfHint');
  const out = form.querySelector('#pfOut');
  const status = form.querySelector('#pfStatus');
  const drop = form.querySelector('#drop');
  const input = form.querySelector('#fileInput');
  const list = form.querySelector('#fileList');
  const errFiles = form.querySelector('#errFiles');
  const largeNote = form.querySelector('#pfLarge');
  const upTitle = form.querySelector('#upTitle');
  const upHint = form.querySelector('#upHint');
  const dropTitle = form.querySelector('#dropTitle');
  const dropFormats = form.querySelector('#dropFormats');
  const sendBtn = form.querySelector('.pf__send');
  const sendLabel = form.querySelector('.pf__sendl');
  const trap = form.querySelector('#fCompany');
  const privacy = form.querySelector('[data-company="privacy-href"]');
  if (privacy) privacy.setAttribute('href', COMPANY.routes.privacy);

  /* Single-value fields. The two structured groups are read separately. */
  const F = {
    name: form.querySelector('#fName'),
    email: form.querySelector('#fEmail'),
    phone: form.querySelector('#fPhone'),
    site: form.querySelector('#fSite'),
    size: form.querySelector('#fSize'),
    brief: form.querySelector('#fBrief'),
  };
  const GROUPS = {
    outputs: () => [...form.querySelectorAll('input[name="outputs"]')],
    task: () => [...form.querySelectorAll('input[name="task"]')],
  };
  const ALL = [...Object.keys(F), ...Object.keys(GROUPS)];
  const wrap = (k) => form.querySelector(`.fld[data-field="${k}"]`);
  const errOf = (k) => form.querySelector(`#err${k[0].toUpperCase()}${k.slice(1)}`);

  let service = null;
  let files = [];
  let sending = false;
  const openedAt = Date.now();

  /* ---------------- service selection ---------------- */
  function select(id, { scroll = false, focus = false } = {}) {
    if (!SERVICES[id]) return;
    service = id;
    const cfg = SERVICES[id];

    picks.forEach((p) => {
      const on = p.dataset.service === id;
      p.classList.toggle('is-on', on);
      const r = p.querySelector('input');
      if (r) r.checked = on;
    });

    form.dataset.service = id;
    form.dataset.svc = id;
    if (!opts.lockAccent) store.setScroll(id);

    for (const k of ALL) {
      const rule = cfg.fields[k];
      const w = wrap(k);
      if (!w) continue;
      w.hidden = !rule;
      w.dataset.req = rule === 'req' ? '1' : '0';
      const opt = w.querySelector('label i');
      if (opt) opt.hidden = rule !== 'opt';
      const star = w.querySelector('label b');
      if (star) star.hidden = rule !== 'req';
      if (F[k]) F[k].required = rule === 'req';
      if (!rule) {
        clearErr(k);
        if (F[k]) F[k].value = '';
        if (GROUPS[k]) GROUPS[k]().forEach((i) => { i.checked = false; });
      }
    }

    upTitle.textContent = cfg.upload.title;
    upHint.textContent = cfg.upload.hint;
    dropTitle.textContent = cfg.upload.drop;
    dropFormats.textContent = cfg.upload.formats;
    input.setAttribute('accept', cfg.upload.accept.map((e) => `.${e}`).join(','));
    largeNote.hidden = !cfg.large;

    // Drop anything the new service will not accept, and say so.
    const before = files.length;
    files = files.filter((f) => cfg.upload.accept.includes(ext(f.name)));
    setFileErr(files.length !== before
      ? `Néhány fájl formátuma nem támogatott ehhez a szolgáltatáshoz (${cfg.upload.formats}).`
      : '');
    paintFiles();

    if (body.hidden) {
      body.hidden = false;
      if (!env.reducedMotion) {
        gsap.fromTo(body, { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', clearProps: 'opacity,transform' });
      }
    }
    hint.textContent = `${cfg.key} — ${cfg.sub}. Az űrlap ehhez a szolgáltatáshoz igazodott.`;
    out.hidden = true;
    out.innerHTML = '';

    /* Keep the address bar honest: a refresh, a bookmark or a shared link
       must reopen the same request context. */
    const url = new URL(window.location.href);
    if (url.searchParams.get('service') !== id) {
      url.searchParams.set('service', id);
      history.replaceState(history.state, '', url);
    }

    if (scroll) body.scrollIntoView({ behavior: env.reducedMotion ? 'auto' : 'smooth', block: 'start' });
    if (focus) {
      const first = service === 'quantify'
        ? GROUPS.task()[0]
        : F.site;
      setTimeout(() => first?.focus({ preventScroll: true }), env.reducedMotion ? 0 : 620);
    }
  }

  /** Preset the QUANTIFY task from a deep link or a CTA. */
  function setTask(t) {
    if (!QUANTIFY_TASKS[t]) return;
    GROUPS.task().forEach((i) => { i.checked = i.value === t; });
  }

  picks.forEach((p) => {
    const r = p.querySelector('input');
    p.addEventListener('click', () => select(p.dataset.service));
    r?.addEventListener('change', () => select(p.dataset.service));
    p.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(p.dataset.service); }
    });
  });

  /* Any CTA that stays on THIS document can preselect the form. A
     `data-service` link that navigates somewhere else is tagged with the
     service so the transition field can borrow its accent, and must not
     also rewrite this page's URL on the way out.

     Only real CONTROLS: `[data-service]` on its own also matches the
     document element on every service page. */
  document.querySelectorAll('a[data-service], button[data-service]').forEach((el) => {
    if (el.classList.contains('pick')) return;
    const href = el.getAttribute('href');
    if (href) {
      const u = new URL(href, window.location.href);
      if (u.pathname !== window.location.pathname) return;   // it leaves; not ours
    }
    el.addEventListener('click', () => {
      select(el.dataset.service, { focus: true });
      if (el.dataset.task) setTask(el.dataset.task);
    });
  });

  /* ---------------- files ---------------- */
  function setFileErr(msg) {
    errFiles.textContent = msg;
    errFiles.hidden = !msg;
    drop.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function paintFiles() {
    list.innerHTML = '';
    files.forEach((f, i) => {
      const li = document.createElement('li');
      li.className = 'file';
      li.innerHTML =
        `<span class="file__t">${ext(f.name).toUpperCase()}</span>`
        + `<span class="file__n">${esc(f.name)}</span>`
        + `<span class="file__s">${fmtSize(f.size)}</span>`
        + '<span class="file__st">KÉSZ</span>'
        + `<button class="file__x" type="button" aria-label="${esc(f.name)} eltávolítása">×</button>`;
      li.querySelector('.file__x').addEventListener('click', () => {
        files.splice(i, 1);
        paintFiles();
        setFileErr('');
        announce(`${f.name} eltávolítva.`);
        drop.focus();
      });
      list.appendChild(li);
    });
    drop.classList.toggle('has-files', files.length > 0);
  }

  function addFiles(fileList) {
    if (!service) select('quantify');
    const cfg = SERVICES[service];
    const bad = [];
    let msg = '';
    for (const f of fileList) {
      if (!cfg.upload.accept.includes(ext(f.name))) { bad.push(f.name); continue; }
      if (files.some((x) => x.name === f.name && x.size === f.size)) continue;
      if (files.length >= UPLOAD.maxFiles) {
        msg = `Legfeljebb ${UPLOAD.maxFiles} fájl csatolható. ${f.name} kimaradt.`;
        break;
      }
      if (f.size > UPLOAD.maxFileBytes) {
        msg = `${f.name} túl nagy (${fmtSize(f.size)}). Fájlonként legfeljebb ${Math.round(UPLOAD.maxFileBytes / MB)} MB.`;
        continue;
      }
      const total = files.reduce((a, x) => a + x.size, 0) + f.size;
      if (total > UPLOAD.maxTotalBytes) {
        msg = `A csatolmányok összmérete legfeljebb ${Math.round(UPLOAD.maxTotalBytes / MB)} MB lehet.`;
        continue;
      }
      files.push(f);
    }
    paintFiles();
    setFileErr(msg || (bad.length
      ? `Nem támogatott formátum: ${bad.join(', ')}. Elfogadott: ${cfg.upload.formats}.`
      : ''));
    if (files.length) announce(`${files.length} fájl kiválasztva.`);
  }

  drop.addEventListener('click', () => input.click());
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });

  ['dragenter', 'dragover'].forEach((t) =>
    drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((t) =>
    drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', (e) => { if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  /* ---------------- validation ---------------- */
  function setErr(k, msg) {
    const e = errOf(k), w = wrap(k);
    if (!e) return;
    e.textContent = msg;
    e.hidden = !msg;
    w?.classList.toggle('is-bad', Boolean(msg));
    const el = F[k];
    if (el) {
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg) el.setAttribute('aria-describedby', e.id);
      else el.removeAttribute('aria-describedby');
    }
  }
  const clearErr = (k) => setErr(k, '');

  const groupValue = (k) => GROUPS[k]().filter((i) => i.checked).map((i) => i.value);

  function validate() {
    const cfg = SERVICES[service];
    const bad = [];
    for (const k of ALL) {
      const rule = cfg.fields[k];
      if (!rule) { clearErr(k); continue; }
      let msg = '';
      if (GROUPS[k]) {
        const v = groupValue(k);
        if (rule === 'req' && !v.length) msg = k === 'task' ? 'Válassza ki, milyen kimutatást kér.' : 'Kötelező mező.';
        setErr(k, msg);
        if (msg) bad.push(GROUPS[k]()[0]);
        continue;
      }
      const v = (F[k].value || '').trim();
      if (rule === 'req' && !v) msg = 'Kötelező mező.';
      else if (k === 'email' && v && !RE_MAIL.test(v)) msg = 'Érvényes email címet adjon meg.';
      else if (k === 'brief' && v && v.length < LIMITS.briefMin) msg = 'Néhány szóval írja le a feladatot.';
      setErr(k, msg);
      if (msg) bad.push(F[k]);
    }
    if (cfg.upload.required && !files.length) {
      setFileErr('Ehhez a szolgáltatáshoz egy reprezentatív PDF mintarajz szükséges. Ha most nincs kéznél, írjon inkább közvetlenül emailben.');
      bad.push(drop);
    } else if (!errFiles.textContent) setFileErr('');
    return bad;
  }

  Object.entries(F).forEach(([k, el]) => {
    el?.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') clearErr(k); });
  });
  Object.keys(GROUPS).forEach((k) => {
    GROUPS[k]().forEach((i) => i.addEventListener('change', () => clearErr(k)));
  });

  /* ---------------- states ---------------- */
  function announce(msg) { status.textContent = msg; }

  function setSending(on) {
    sending = on;
    form.classList.toggle('is-sending', on);
    sendBtn.disabled = on;                    // one submission at a time
    sendBtn.setAttribute('aria-busy', String(on));
    sendLabel.textContent = on ? 'KÜLDÉS…' : 'AJÁNLATKÉRÉS ELKÜLDÉSE';
  }

  const mailHref = (subject, bodyText) =>
    `mailto:${COMPANY.email.value}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

  function showSuccess({ reference, transport }) {
    const dev = transport === 'console';
    out.className = 'pfout is-ok';
    out.innerHTML = `
      <p class="pfout__k">A KÉRÉS MEGÉRKEZETT</p>
      <p class="pfout__lede">Köszönjük. Átnézzük az anyagot, és munkanapon belül válaszolunk a megadott email címre — nagyobb projektnél a következő lépés az árajánlat, majd a dedikált projektmappa.</p>
      ${reference ? `<p class="pfout__ref"><span>AZONOSÍTÓ</span><b>${esc(reference)}</b></p>` : ''}
      ${dev ? '<p class="pfout__dev">DEV TRANSPORT — a beküldés a szerver naplójába került, email nem ment ki. Éles környezetben ez az állapot nem fordulhat elő.</p>' : ''}
      <div class="pfout__acts">
        <button class="btn btn--ghost" type="button" data-act="again">ÚJ KÉRÉS INDÍTÁSA</button>
      </div>`;
    out.hidden = false;
    out.querySelector('[data-act="again"]').addEventListener('click', reset);
    announce('A kérés elküldve.');
    reveal();
  }

  function showError({ message, retryable = true, fields }) {
    if (fields) {
      Object.entries(fields).forEach(([k, msg]) => {
        if (k === 'files') setFileErr(msg);
        else setErr(k, msg);
      });
    }
    const summary = plainSummary();
    out.className = 'pfout is-bad';
    out.innerHTML = `
      <p class="pfout__k">A KÉRÉST NEM SIKERÜLT ELKÜLDENI</p>
      <p class="pfout__lede">${esc(message)}</p>
      <div class="pfout__acts">
        ${retryable ? '<button class="btn" type="button" data-act="retry">ÚJRAPRÓBÁLÁS</button>' : ''}
        <a class="btn btn--ghost" href="${mailHref('GoDataFusion — ajánlatkérés', summary)}">KÜLDÉS EMAILBEN HELYETTE</a>
      </div>
      <p class="pfout__note">A beírt adatok megmaradtak — az email gomb ezekkel nyitja meg a levelezőt. A csatolmányokat kézzel kell mellékelni.</p>`;
    out.hidden = false;
    out.querySelector('[data-act="retry"]')?.addEventListener('click', () => {
      out.hidden = true;
      sendBtn.focus();
    });
    announce(`Hiba: ${message}`);
    reveal();
  }

  function reveal() {
    if (!env.reducedMotion) {
      gsap.fromTo(out, { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'opacity,transform' });
    }
    out.focus({ preventScroll: true });
    out.scrollIntoView({ behavior: env.reducedMotion ? 'auto' : 'smooth', block: 'center' });
  }

  function reset() {
    out.hidden = true;
    out.innerHTML = '';
    files = [];
    paintFiles();
    setFileErr('');
    Object.keys(F).forEach((k) => { F[k].value = ''; clearErr(k); });
    Object.keys(GROUPS).forEach((k) => { GROUPS[k]().forEach((i) => { i.checked = false; }); clearErr(k); });
    (F.site.closest('.fld').hidden ? F.brief : F.site).focus();
  }

  /** Plain-text fallback body, used only when delivery failed. */
  function plainSummary() {
    const cfg = SERVICES[service] || {};
    const L = [`SZOLGÁLTATÁS: ${cfg.key || '—'}`];
    if (cfg.fields?.task) {
      const t = groupValue('task')[0];
      if (t) L.push(`KIMUTATÁS: ${QUANTIFY_TASKS[t]}`);
    }
    if (cfg.fields?.outputs) {
      const o = groupValue('outputs');
      if (o.length) L.push(`SZÜKSÉGES EREDMÉNY: ${o.map((k) => MEASURE_OUTPUTS[k]).join(', ')}`);
    }
    [['Név / cég', 'name'], ['Email', 'email'], ['Telefon', 'phone'], ['Helyszín', 'site'], ['Kb. méret', 'size']]
      .forEach(([label, k]) => { if (cfg.fields?.[k] && F[k]?.value.trim()) L.push(`${label}: ${F[k].value.trim()}`); });
    L.push('', 'FELADAT:', F.brief?.value.trim() || '—');
    if (files.length) L.push('', `Csatolmány (kézzel mellékelendő): ${files.map((f) => f.name).join(', ')}`);
    return L.join('\n');
  }

  /* ---------------- submit ---------------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;                       // no double submission

    if (!service) {
      hint.textContent = 'Előbb válasszon szolgáltatást.';
      announce('Előbb válasszon szolgáltatást.');
      picks[0]?.focus();
      return;
    }
    const bad = validate();
    if (bad.length) {
      announce(`${bad.length} mezőt javítani kell.`);
      bad[0].focus({ preventScroll: false });
      return;
    }

    out.hidden = true;
    setSending(true);
    announce('A kérés küldése folyamatban.');

    const fd = new FormData();
    fd.set('service', service);
    const cfg = SERVICES[service];
    for (const k in F) {
      if (cfg.fields[k]) fd.set(k, F[k].value.trim());
    }
    if (cfg.fields.task) { const t = groupValue('task')[0]; if (t) fd.set('task', t); }
    if (cfg.fields.outputs) groupValue('outputs').forEach((v) => fd.append('outputs', v));
    fd.set('company', trap.value);
    fd.set('started', String(openedAt));
    files.forEach((f) => fd.append('files', f, f.name));

    /* A stalled upload must not leave the button spinning forever. */
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 45000);

    try {
      const res = await fetch(ENDPOINT, { method: 'POST', body: fd, signal: ctl.signal });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        showSuccess(data);
      } else if (res.status === 422 && data?.fields) {
        showError({ message: data.message || 'Néhány mezőt javítani kell.', fields: data.fields });
        const firstKey = Object.keys(data.fields)[0];
        (firstKey === 'files' ? drop : (F[firstKey] || GROUPS[firstKey]?.()[0]))?.focus();
      } else if (res.status === 503) {
        showError({
          message: data?.message || 'Az üzenetküldés jelenleg nem elérhető.',
          retryable: false,
        });
      } else {
        showError({
          message: data?.message
            || `A kiszolgáló ${res.status} hibával válaszolt. Kérjük próbálja újra.`,
        });
      }
    } catch (err) {
      showError({
        message: err?.name === 'AbortError'
          ? 'A küldés túl sokáig tartott. Ellenőrizze a kapcsolatot, vagy küldje emailben.'
          : 'Nem sikerült elérni a kiszolgálót. Ellenőrizze az internetkapcsolatot.',
      });
    } finally {
      clearTimeout(timer);
      setSending(false);
    }
  });

  /* ---------------- entry state ---------------- */
  const initial = opts.service || serviceFromQuery();
  if (initial) select(initial);
  const task = taskFromQuery();
  if (task) { if (!service) select('quantify'); setTask(task); }

  if (!opts.lockAccent) {
    ScrollTrigger.create({
      trigger: form.closest('section') || form,
      start: 'top 90%',
      onLeaveBack: () => store.setScroll(null),
    });
  }

  if (!env.reducedMotion) {
    gsap.fromTo(picks,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out',
        clearProps: 'opacity,transform',
        scrollTrigger: { trigger: form.querySelector('.picks'), start: 'top 82%', once: true } });
  }

  return { select, setTask, get service() { return service; } };
}
