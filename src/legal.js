import './styles/main.css';
import { applyCompany } from './modules/company.js';
import { initNav } from './modules/nav.js';

/* ============================================================
   THE LEGAL PAGES — /impresszum/ and /adatkezeles/

   No scene, no scroll system, no form. The company record is applied so
   every field on the impressum reads from data/company.js, and the
   "kitöltendő" notes disappear the moment a real value is set there.
   ============================================================ */
applyCompany();
initNav();

const year = document.getElementById('footYear');
if (year) year.textContent = String(new Date().getFullYear());
