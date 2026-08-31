/* ============================================================
   COMPANY / CONTACT — the single place these strings exist.

   Anything here marked `placeholder: true` is NOT verified company
   data. It is a clearly named stand-in so the layout is complete and
   the copy reads honestly. Replace the value and flip the flag; the
   footer, the service pages, the request form and the JSON-LD all read
   from here, so nothing has to be hunted through markup.

   Do not add address, registration number, VAT id or phone until the
   real values exist — an empty field is honest, an invented one is not.
   ============================================================ */

export const COMPANY = {
  name: 'GoDataFusion',
  tagline: 'Turn reality into data.',

  /** Destination for every inquiry. Server-side the real target is
      CONTACT_TO in the environment; this is what the UI shows. */
  email: { value: 'hello@godatafusion.hu', placeholder: true },

  /* Not yet supplied. `null` renders nothing rather than a fake value. */
  phone: { value: null, placeholder: true },
  address: { value: null, placeholder: true },
  registration: { value: null, placeholder: true },
  vat: { value: null, placeholder: true },

  /** Absolute origin, used for canonical + og:url. Overridden at build
      time by VITE_SITE_ORIGIN when the real domain is known. */
  origin: import.meta.env?.VITE_SITE_ORIGIN || 'https://godatafusion.hu',

  legal: {
    survey: 'A felmérés nem minősül hivatalos földmérésnek.',
    demo: 'Az oldalon látható mérési értékek interfész-demó adatok.',
    company: 'Cégadatok, székhely és adószám: kitöltendő.',
  },
};

/** Everything the site is allowed to state as fact about the company. */
export const hasRealContact = () => !COMPANY.email.placeholder;
