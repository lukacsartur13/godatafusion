/* ============================================================
   THE THREE SERVICES — one definition, four consumers.

   The homepage chapters, the three service pages, the shared request
   form and the server-side validator all read this. Adding a service
   means editing this file and writing one page; it never means
   duplicating a route table, an accent or an upload rule.

   `accent` mirrors core/store.js MODES on purpose: the store owns the
   live channel, this owns the static per-route facts.
   ============================================================ */

const MB = 1024 * 1024;

export const SERVICES = {
  capture: {
    id: 'capture',
    index: '01',
    label: 'CAPTURE',
    hu: '360° kamera',
    route: '/360-camera/',
    accent: [66, 232, 255],
    key: '360° CAMERA',
    sub: 'Vizuális dokumentáció',
    /* Which fields the request form shows, and whether they are required. */
    fields: { name: 'req', email: 'req', phone: 'opt', site: 'req', brief: 'req' },
    upload: {
      title: 'ALAPRAJZ — OPCIONÁLIS',
      drop: 'DROP FLOOR PLAN',
      formats: 'PDF · JPG · PNG',
      accept: ['pdf', 'jpg', 'jpeg', 'png'],
      required: false,
      hint: 'Kisebb helyszínhez nem szükséges. Nagyobb épületnél az alaprajz segít megbecsülni a bejárás terjedelmét.',
    },
    large: false,
  },

  measure: {
    id: 'measure',
    index: '02',
    label: 'MEASURE',
    hu: 'Területfelmérés',
    route: '/teruletfelmeres/',
    accent: [184, 255, 61],
    key: 'TERÜLETFELMÉRÉS',
    sub: 'Terepmodell és mennyiségek',
    fields: { name: 'req', email: 'req', site: 'req', brief: 'req' },
    upload: {
      /* DWG/DXF was offered in Phase 2 but the endpoint cannot validate a
         DWG container, so it is not accepted. Vector drawings come as PDF. */
      title: 'HELYSZÍNRAJZ / KERTTERV / ÚTTERV',
      drop: 'DROP SITE DRAWINGS',
      formats: 'PDF · JPG · PNG',
      accept: ['pdf', 'jpg', 'jpeg', 'png'],
      required: false,
      hint: 'Amelyik megvan, az is elég — nem kell mindhárom. Dokumentáció nélkül is tudunk indulni, csak a becslés lesz tágabb.',
    },
    large: false,
  },

  quantify: {
    id: 'quantify',
    index: '03',
    label: 'QUANTIFY',
    hu: 'Mennyiségszámítás',
    route: '/mennyisegszamitas/',
    accent: [255, 104, 70],
    key: 'MENNYISÉGSZÁMÍTÁS',
    sub: 'Tervalapú kimutatás',
    fields: { name: 'req', email: 'req', brief: 'req' },
    upload: {
      title: 'PDF MINTARAJZ',
      drop: 'DROP SAMPLE DRAWING',
      formats: 'PDF',
      accept: ['pdf'],
      required: true,
      hint: 'Egyetlen reprezentatív mintarajz elég az induláshoz.',
    },
    large: true,
  },
};

export const SERVICE_IDS = Object.keys(SERVICES);

/** Shared upload constraints. The server enforces the same numbers. */
export const UPLOAD = {
  maxFiles: 3,
  maxFileBytes: 4 * MB,
  maxTotalBytes: 5 * MB,
  /* Extension → the magic bytes the server checks the body against, so a
     .pdf that is really a .zip is rejected instead of forwarded. */
  types: {
    pdf: { mime: 'application/pdf', magic: [[0x25, 0x50, 0x44, 0x46]] },
    jpg: { mime: 'image/jpeg', magic: [[0xff, 0xd8, 0xff]] },
    jpeg: { mime: 'image/jpeg', magic: [[0xff, 0xd8, 0xff]] },
    png: { mime: 'image/png', magic: [[0x89, 0x50, 0x4e, 0x47]] },
  },
};

/** Text limits, mirrored server-side. */
export const LIMITS = {
  name: 120, email: 160, phone: 40, site: 200, brief: 4000,
  briefMin: 12,
};

export const ENDPOINT = '/api/project-request';

/** `?service=measure` → 'measure'. Anything else → null. */
export function serviceFromQuery(search = window.location.search) {
  const v = new URLSearchParams(search).get('service');
  return v && SERVICES[v] ? v : null;
}
