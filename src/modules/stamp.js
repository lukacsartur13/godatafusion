import { SERVICES } from '../data/services.js';
import { t, lang } from '../i18n/t.js';

/* ============================================================
   THE TITLE BLOCK — /kapcsolat/

   The stamp in the contact hero is an UNFILLED REQUEST. Three of its
   five fields are blank on load and this is what writes them:

     DÁTUM        today, in the page's own locale
     TÁRGY        the service the reader picks, in that service's ink
     MEGRENDELŐ   the name they type, as they type it

   The subject reads the form's own `data-service`, watched. Two other
   channels look right and are not:

     the radio's `change`   the form checks its inputs in CODE when a
                            service is picked, and assigning `checked`
                            fires no event at all
     the accent store       that channel is AMBIENT — it says which
                            chapter the reader is inside, and the form
                            clears it on the way back up. Scrolling to
                            the top would have wiped the subject line
                            off a request the reader had already made.

   `data-service` is the only one of the three that means COMMITTED, and
   it survives everything the reader does afterwards.

   Both this and the name listener are bound without touching the form
   itself, which is generated and mounted after this file runs.

   Nothing here is required for the page to make sense: with no script
   at all the stamp is a blank form, which is exactly what it claims to
   be.
   ============================================================ */

/* The page's locale, for the one date this file writes. `lang` is the
   document's language; the BCP 47 tag is what Intl wants. */
const DATE_LOCALE = { hu: 'hu-HU', en: 'en-GB', de: 'de-DE' };

/* A stamp field is one line. Past this a company name is not a title
   block entry any more, it is a paragraph in a box — CSS still clips it,
   this keeps the DOM honest about what was taken. */
const CLIENT_MAX = 38;

export function initStamp(root = document) {
  const stamp = root.querySelector('#contactStamp');
  if (!stamp) return;

  const cell = (k) => stamp.querySelector(`[data-stamp="${k}"]`);
  const client = cell('client');
  const subject = cell('subject');
  const date = cell('date');

  if (date) {
    date.textContent = new Intl.DateTimeFormat(DATE_LOCALE[lang] || DATE_LOCALE.hu, {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
  }

  const setSubject = (id) => {
    if (!subject) return;
    const svc = id && SERVICES[id];
    if (!svc) { subject.textContent = ''; delete subject.dataset.svc; return; }
    subject.textContent = t(svc.key);
    subject.dataset.svc = id;
  };

  const setClient = (v) => {
    if (!client) return;
    client.textContent = String(v).trim().slice(0, CLIENT_MAX);
  };

  /* The form does not exist yet — it is mounted into this container by
     modules/request.js. Watching the container's subtree rather than the
     form means there is no moment to wait for and nothing to re-bind if
     the form is ever replaced. */
  const mount = document.getElementById('projectMount');
  if (mount) {
    const read = () => setSubject(mount.querySelector('#projectForm')?.dataset.service);
    new MutationObserver(read).observe(mount, {
      subtree: true, childList: true, attributes: true, attributeFilter: ['data-service'],
    });
    read();
  }

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el && el.id === 'fName') setClient(el.value);
  });
}
