import { ScrollTrigger } from '../core/scroll.js';

/* ============================================================
   SECTION TRACKER
   A row of numbers. The active one earns its label — nothing else does,
   so the rail stays instrument furniture instead of a second navigation.
   Driven by real scroll state, not by clicks.
   ============================================================ */
export function initTracker() {
  const rail = document.getElementById('tracker');
  const index = document.getElementById('sectionIndex');
  const sections = [...document.querySelectorAll('[data-track]')]
    .filter((el) => el.tagName === 'SECTION');
  if (!sections.length) return;

  const links = new Map(
    [...(rail?.querySelectorAll('.tk') || [])].map((a) => [a.dataset.track, a]),
  );

  let active = null;
  const set = (el) => {
    const id = el?.dataset.track;
    if (id === active) return;
    active = id;
    links.forEach((a, key) => a.classList.toggle('is-on', key === id));
    if (index && el) {
      index.textContent = `${el.dataset.section} / ${el.dataset.sectionName}`;
    }
  };

  /* The last section whose top has crossed the reading line.
     "The section covering the middle of the viewport" fails for any section
     shorter than the viewport — ABOUT is 386px tall and would never win. */
  const pick = () => {
    const line = window.innerHeight * 0.42;
    let current = sections[0];
    for (const el of sections) {
      if (el.getBoundingClientRect().top <= line) current = el;
      else break;
    }
    set(current);
  };

  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: pick, onRefresh: pick });
  pick();
}
