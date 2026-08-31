import '../../styles/evidence.css';

/* ============================================================
   THE EVIDENCE SHEET

   Not a portfolio gallery and not a case-study card. A project evidence
   sheet: one large visual, a factual rail beside it, and — when the
   project has them — five numbered readings of what happened.

       01 / CONTEXT   02 / INPUT   03 / PROCESS   04 / OUTPUT   05 / RESULT

   The structure works without a single financial claim. There is no slot
   for ROI, for percentage improvements or for lead counts, because a
   project of this kind is compelling through technical proof and the
   claim limits on this site have to keep meaning something.

   Colour: a sheet inherits the accent of the service it belongs to by
   overriding `--accent` on its own subtree. A mixed project stays on the
   neutral foreground and names its services in the rail instead — never a
   rainbow of all three at once.
   ============================================================ */

const ACCENT = {
  capture: 'var(--accent-capture)',
  measure: 'var(--accent-measure)',
  quantify: 'var(--accent-quantify)',
};

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

export function renderEvidence({ anchor, items, label = 'EVIDENCE', title = 'VALÓS PROJEKTEK' }) {
  const sec = el('section', 'ev');
  sec.id = 'evidence';
  sec.dataset.sectionName = 'EVIDENCE';

  const head = el('div', 'ev__head');
  const eyebrow = el('p', 'eyebrow eyebrow--section');
  eyebrow.append(el('span', 'eyebrow__rule'), el('span', null, label));
  eyebrow.querySelector('.eyebrow__rule').setAttribute('aria-hidden', 'true');
  const h2 = el('h2', 'ev__title', title);
  head.append(eyebrow, h2);
  sec.append(head);

  items.forEach((p) => sec.append(sheet(p)));
  anchor.parentNode.insertBefore(sec, anchor);
  return sec;
}

function sheet(p) {
  const art = el('article', 'ev__sheet');
  art.dataset.service = p.service;
  art.dataset.kind = p.visual.kind;
  if (ACCENT[p.service]) art.style.setProperty('--accent', ACCENT[p.service]);

  /* ---- the visual: the only part that is actually the evidence ---- */
  const fig = el('figure', 'ev__vis');
  const img = new Image();
  img.src = p.visual.src;
  if (p.visual.srcset) img.srcset = p.visual.srcset;
  img.width = p.visual.width;
  img.height = p.visual.height;
  img.alt = p.visual.alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  fig.append(img);
  /* What kind of record this is, stated on the sheet — a real panorama and
     a real drawing are different claims and must not look interchangeable. */
  fig.append(el('figcaption', 'ev__kind', KIND[p.visual.kind] || ''));
  if (p.visual.credit) fig.append(el('p', 'ev__credit', p.visual.credit));

  /* ---- the factual rail ---- */
  const rail = el('dl', 'ev__rail');
  const facts = [{ k: 'PROJECT TYPE', v: p.type }]
    .concat(p.location ? [{ k: 'LOCATION', v: p.location }] : [])
    .concat(p.facts || []);
  facts.forEach(({ k, v }) => {
    const row = el('div');
    row.append(el('dt', null, k), el('dd', null, v));
    rail.append(row);
  });

  const body = el('div', 'ev__body');
  body.append(el('h3', 'ev__k', p.title));
  if (p.summary) body.append(el('p', 'ev__c', p.summary));
  body.append(rail);

  art.append(fig, body);

  /* ---- 01 CONTEXT … 05 RESULT ---- */
  if (p.steps?.length) {
    const ol = el('ol', 'ev__steps');
    p.steps.forEach((s, i) => {
      const li = el('li');
      const k = el('p', 'ev__step-k');
      k.append(el('span', 'ev__step-i', String(i + 1).padStart(2, '0')),
        el('span', 'ev__step-s', '/'), el('span', null, s.k));
      k.querySelector('.ev__step-s').setAttribute('aria-hidden', 'true');
      li.append(k, el('p', 'ev__step-c', s.c));
      ol.append(li);
    });
    art.append(ol);
  }
  return art;
}

/* What the reader is looking at. Kept as fixed technical microcopy so a
   future editor cannot accidentally describe a render as a survey. */
const KIND = {
  panorama: '360° SITE RECORD',
  terrain: 'TERRAIN / SITE DATA',
  drawing: 'DRAWING / QUANTITIES',
  image: 'PROJECT IMAGE',
};
