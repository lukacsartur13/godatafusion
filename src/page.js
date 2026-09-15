import './styles/main.css';

import { env } from './core/env.js';
import { initScroll, ScrollTrigger } from './core/scroll.js';
import { initNav } from './modules/nav.js';
import { initCursor } from './modules/cursor.js';
import { initTransition } from './modules/transition.js';
import { initSections } from './modules/sections.js';
import { initSeams } from './modules/seams.js';
import { initExamples } from './modules/examples.js';
import { initMedia } from './modules/media.js';
import { mountRequest } from './modules/request.js';
import { applyCompany } from './modules/company.js';

/* ============================================================
   THE FLAT PAGES — /rolunk/, /kapcsolat/, /impresszum/,
   /adatkezeles/ and the 404.

   Everything the site shares and nothing it does not: navigation, the
   company record, smooth scrolling, the page-transition field, the
   section reveals and the seams between them. No WebGL, no narrative,
   no scene — these documents argue in words and the renderer would be
   weight spent on nothing.

   The request form mounts only where a page asks for it by putting
   `#projectMount` in its markup, which today is /kapcsolat/ alone.
   ============================================================ */

initNav();
applyCompany();
initTransition();
initScroll();
initCursor();

initExamples();
initMedia();
initSections();
initSeams();

const mount = document.getElementById('projectMount');
if (mount) mountRequest(mount);

const year = document.getElementById('footYear');
if (year) year.textContent = String(new Date().getFullYear());

if (!env.webgl) document.body.classList.add('no-webgl');

document.fonts?.ready.then(() => ScrollTrigger.refresh());
