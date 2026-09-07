/* ============================================================
   COMPANY / CONTACT / LEGAL — the single place these strings exist.

   Anything here marked `placeholder: true` is NOT verified company
   data. It is a clearly named stand-in so the layout is complete and
   the copy reads honestly. Replace the value and flip the flag; the
   footer, the service pages, the request form, the legal pages and the
   JSON-LD all read from here, so nothing has to be hunted through
   markup.

   BEFORE GO-LIVE — every `placeholder: true` below must be false and
   every `null` must be a real value:

     email          the inbox inquiries are answered from
     phone          optional; leave null to show nothing
     legalName      the registered company name (Kft. / Bt. / e.v.)
     address        the registered seat, as on the company register
     registration   cégjegyzékszám (or nyilvántartási szám for e.v.)
     vat            adószám
     representative the person named on the impressum
     hosting        the hosting provider named on the impressum

   `npm run check:live` fails while any placeholder is still set, so a
   deploy cannot quietly ship a stand-in.
   ============================================================ */

export const COMPANY = {
  name: 'GoDataFusion',
  tagline: 'Turn reality into data.',

  /** Destination for every inquiry. Server-side the real target is
      CONTACT_TO in the environment; this is what the UI shows. */
  email: { value: 'hello@godatafusion.hu', placeholder: true },

  /* Not yet supplied. `null` renders nothing rather than a fake value. */
  phone: { value: null, placeholder: true },

  /* ---- the impressum ---- */
  legalName: { value: null, placeholder: true },        // pl. "GoDataFusion Kft."
  address: { value: null, placeholder: true },          // székhely
  registration: { value: null, placeholder: true },     // cégjegyzékszám
  vat: { value: null, placeholder: true },              // adószám
  representative: { value: null, placeholder: true },   // képviselő
  hosting: { value: null, placeholder: true },          // tárhelyszolgáltató neve, címe

  /** Absolute origin, used for canonical + og:url. Overridden at build
      time by VITE_SITE_ORIGIN when the real domain is known. */
  origin: import.meta.env?.VITE_SITE_ORIGIN || 'https://godatafusion.hu',

  routes: {
    impressum: '/impresszum/',
    privacy: '/adatkezeles/',
  },

  legal: {
    survey: 'A felmérés nem minősül hivatalos földmérésnek.',
    demo: 'Az oldalon látható mérési értékek egy demonstrációs projektből származnak.',
    company: 'Cégadatok, székhely és adószám: élesítés előtt kitöltendő.',
    /* The site sets no analytics, no advertising and no third-party
       cookies. If that changes, a consent layer has to be added. */
    cookies: 'Az oldal nem használ követő sütiket és nem futtat külső analitikát.',
  },
};

/** Everything the site is allowed to state as fact about the company. */
export const hasRealContact = () => !COMPANY.email.placeholder;

/** Every field that still carries a stand-in. Empty means go-live ready. */
export function placeholders() {
  return Object.entries(COMPANY)
    .filter(([, v]) => v && typeof v === 'object' && 'placeholder' in v && v.placeholder)
    .map(([k]) => k);
}
