import { COMPANY } from '../data/company.js';

/* ============================================================
   Contact and legal strings come from data/company.js.

   The markup carries the current value so the page is complete without
   JavaScript and so crawlers see it; this pass makes the config the
   authority and, in development, says loudly when the two have drifted.
   That is the whole mechanism preventing a placeholder address from
   surviving in one corner of the site after the real one is set.

   PHASE 12 — the impressum fields. A `[data-company="field"]` element
   receives the value if there is one and is hidden if there is not; a
   `[data-company="field-ph"]` element is the visible "kitöltendő" note
   and is shown ONLY while the field is still a placeholder.
   ============================================================ */
export function applyCompany(root = document) {
  const email = COMPANY.email.value;

  const set = (key, apply) => {
    root.querySelectorAll(`[data-company="${key}"]`).forEach(apply);
  };

  set('email', (el) => {
    warnDrift(el.textContent.trim(), email, 'email');
    el.textContent = email;
    el.setAttribute('href', `mailto:${email}`);
  });
  set('email-href', (el) => {
    el.setAttribute('href', `mailto:${email}`);
    if (!el.textContent.trim()) el.textContent = email;
  });
  set('email-note', (el) => {
    el.hidden = !COMPANY.email.placeholder;
  });
  set('legal-company', (el) => {
    const n = COMPANY.legalName.value;
    const r = COMPANY.registration.value;
    const a = COMPANY.address.value;
    const v = COMPANY.vat.value;
    el.textContent = n || r || a
      ? [n || COMPANY.name, a, r && `Cg. ${r}`, v && `Adószám: ${v}`].filter(Boolean).join(' · ')
      : COMPANY.legal.company;
  });
  set('phone', (el) => {
    const p = COMPANY.phone.value;
    if (!p) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = p;
    el.setAttribute('href', `tel:${p.replace(/[^\d+]/g, '')}`);
  });
  set('cookies', (el) => { el.textContent = COMPANY.legal.cookies; });

  /* impressum-style fields, one attribute each */
  for (const k of ['legalName', 'address', 'registration', 'vat', 'representative', 'hosting']) {
    const f = COMPANY[k];
    set(k, (el) => {
      if (f.value) { el.textContent = f.value; el.hidden = false; }
      else el.hidden = true;
    });
    set(`${k}-ph`, (el) => { el.hidden = Boolean(f.value) && !f.placeholder; });
  }
  set('impressum-href', (el) => el.setAttribute('href', COMPANY.routes.impressum));
  set('privacy-href', (el) => el.setAttribute('href', COMPANY.routes.privacy));
}

function warnDrift(inMarkup, inConfig, label) {
  if (!import.meta.env.DEV) return;
  if (inMarkup && inConfig && inMarkup !== inConfig) {
    console.warn(`[gdf:company] the markup says "${inMarkup}" for ${label} but `
      + `data/company.js says "${inConfig}". Update the markup — the config wins at runtime.`);
  }
}
