/* ============================================================
   DEVELOPMENT FIXTURES — never shipped.

   These exist so the evidence component can be built, reviewed and
   regression-tested before any real project exists. They are reached
   only from a branch guarded by `import.meta.env.DEV`, which Rollup
   folds out of the production build entirely — the chunk is not emitted
   and this file's bytes are not in `dist/`.

   Every entry is marked `demo: true`, so even if this module were somehow
   imported in production, `isPublishable` would still reject it. Two
   independent guards, because "it must never appear publicly" is the one
   requirement here that cannot be allowed to fail quietly.

   No invented client. No invented brand. No invented measurements
   presented as a result — the numbers below are the same interface-demo
   figures the rest of the site already labels as such.
   ============================================================ */

/* An inline SVG data URI, so the fixtures need no binary asset and cannot
   be mistaken for a photograph of a real site. */
const PLATE = (label) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
     <rect width="1600" height="900" fill="#0C0F10"/>
     <g fill="none" stroke="#F1F0EB" stroke-opacity=".14">
       <path d="M80 80h1440v740H80z"/><path d="M80 450h1440M800 80v740"/>
     </g>
     <text x="800" y="470" fill="#F1F0EB" fill-opacity=".38" font-family="monospace"
       font-size="46" letter-spacing="10" text-anchor="middle">${label}</text>
   </svg>`);

/** @type {import('./evidence.js').EvidenceProject[]} */
export const FIXTURES = [
  {
    id: 'demo-capture',
    service: 'capture',
    type: 'DEMO PROJECT',
    location: '—',
    title: 'DEMO — 360° HELYSZÍNI ÁLLAPOTFELVÉTEL',
    summary: 'Fejlesztői minta az evidence komponens teszteléséhez. Nem valós projekt.',
    facts: [
      { k: 'SERVICE', v: 'CAPTURE' },
      { k: 'INPUT', v: '360° SITE RECORD' },
      { k: 'OUTPUT', v: 'VIRTUAL SITE RECORD' },
      { k: 'STATUS', v: 'DEMO FIXTURE' },
    ],
    visual: { kind: 'panorama', src: PLATE('DEMO PANORAMA'), width: 1600, height: 900,
      alt: 'Fejlesztői helyőrző ábra a 360° panoráma helyén.' },
    steps: [
      { k: 'CONTEXT', c: 'Helyőrző szöveg — a valós projektnél ide kerül a helyszín és a feladat leírása.' },
      { k: 'INPUT', c: 'Helyőrző szöveg — mit kaptunk kézhez.' },
      { k: 'PROCESS', c: 'Helyőrző szöveg — hogyan dolgoztuk fel.' },
      { k: 'OUTPUT', c: 'Helyőrző szöveg — mit adtunk át.' },
      { k: 'RESULT', c: 'Helyőrző szöveg — mire használható az eredmény.' },
    ],
    status: 'published',
    demo: true,
  },
  {
    id: 'demo-mixed',
    service: 'mixed',
    type: 'DEMO PROJECT',
    title: 'DEMO — CAPTURE + MEASURE',
    summary: 'Fejlesztői minta a több szolgáltatást érintő projekt elrendezéséhez.',
    facts: [
      { k: 'SERVICE', v: 'CAPTURE · MEASURE' },
      { k: 'INPUT', v: '360° + TERRAIN SURVEY' },
      { k: 'OUTPUT', v: 'SITE RECORD + CONTOURS' },
      { k: 'STATUS', v: 'DEMO FIXTURE' },
    ],
    visual: { kind: 'terrain', src: PLATE('DEMO TERRAIN'), width: 1600, height: 900,
      alt: 'Fejlesztői helyőrző ábra a terepmodell helyén.' },
    status: 'published',
    demo: true,
  },
];
