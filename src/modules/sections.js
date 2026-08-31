import gsap from 'gsap';
import { ScrollTrigger } from '../core/scroll.js';
import { env } from '../core/env.js';

/* ============================================================
   Section-level reveals.
   One grammar for the whole page: masked line-in for headlines,
   a short rise for supporting text. Nothing springs, nothing bounces,
   nothing parallaxes for decoration.
   ============================================================ */

/* PHASE 5 / §14 — `overwrite: 'auto'` is gone from every reveal in this file.

   On a STAGGERED fromTo it was killing the tween during its own first
   render, which left the element holding the tween's START state as an
   inline style for the rest of the page's life. That is exactly the class
   of defect Phase 4 was hunting, and it was live on the MANIFESTO, THE
   FUSION and SERVICES headlines: those three titles never appeared at all.
   Nothing on this page has a competing animation on these targets, so the
   overwrite bought nothing and cost the three biggest words on the page.

   Every reveal now ends with `clearProps`, so the finished state is the
   stylesheet's own — there is no inline value left to be stranded by
   anything, ever. */
const LINE = { duration: 1.0, stagger: 0.08, ease: 'expo.out' };
const RISE = { opacity: 0, y: 22 };
const RISE_TO = { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' };
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));

export function initSections({ scanPlane } = {}) {
  const year = document.getElementById('footYear');
  if (year) year.textContent = String(new Date().getFullYear());

  if (env.reducedMotion) {
    document.querySelectorAll('.foot__word').forEach((w) => w.classList.add('is-on'));
    document.getElementById('footMark')?.classList.add('is-lit');
    return;
  }

  /* ---- headlines: everything except the hero, which intro.js owns ---- */
  document.querySelectorAll(
    '.manifesto__title, .output__title, .services__title, .process__title, .why__title, .project__title',
  ).forEach((h) => {
    gsap.fromTo(h.querySelectorAll('.line__in'), { yPercent: 105 }, {
      ...LINE, yPercent: 0, clearProps: 'transform',
      scrollTrigger: { trigger: h, start: 'top 84%', once: true },
    });
  });

  /* ---- supporting copy ---- */
  /* fromTo, never from — see the note in modules/serviceSections.js. A
     `from` tween that is killed before it runs leaves its START state on the
     element as an inline style, permanently. */
  const rise = (sel, opts = {}) => {
    const { stagger, ...tween } = opts;
    [...document.querySelectorAll(sel)].forEach((el, i) => {
      gsap.fromTo(el,
        { ...RISE, ...pick(tween, ['opacity', 'y']) },
        {
          ...RISE_TO, ...tween,
          delay: stagger ? Math.min(i, 6) * stagger : 0,
          clearProps: 'opacity,transform',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
    });
  };
  rise('.manifesto__lede');
  rise('.output__lede');
  rise('.services__lede');
  rise('.process__lede');
  rise('.about__lede');
  rise('.about__end');
  rise('.about__sys a', { stagger: 0.08 });
  rise('.about__idx div', { stagger: 0.06 });
  rise('.about__fig', { y: 16, duration: 1.0 });
  rise('.alt');

  document.querySelectorAll('.about__title').forEach((h) => {
    gsap.fromTo(h.querySelectorAll('.line__in'), { yPercent: 105 }, {
      ...LINE, yPercent: 0, clearProps: 'transform',
      scrollTrigger: { trigger: h, start: 'top 86%', once: true },
    });
  });

  /* ---- chapters: rail, then the specification block ---- */
  document.querySelectorAll('.chapter').forEach((ch) => {
    gsap.fromTo(ch.querySelectorAll('.chapter__hold > *'),
      { opacity: 0, y: 26 },
      { ...RISE_TO, stagger: 0.07, clearProps: 'opacity,transform',
        scrollTrigger: { trigger: ch, start: 'top 72%', once: true } });
    gsap.fromTo(ch.querySelectorAll('.spec, .spec__legal, .spec__note, .chapter__acts'),
      { ...RISE },
      { ...RISE_TO, stagger: 0.09, clearProps: 'opacity,transform',
        scrollTrigger: { trigger: ch.querySelector('.chapter__spec'), start: 'top 82%', once: true } });
  });

  /* ---- why: the chain draws itself, stage by stage ----
     The connector grows first and the words arrive behind it, so the
     section reads as one transformation rather than four blocks. */
  document.querySelectorAll('.chain__s').forEach((step, i) => {
    gsap.timeline({ scrollTrigger: { trigger: step, start: 'top 84%', once: true } })
      /* fromTo with a defined visible end state, never `from`: a `from`
         tween that is killed before it completes leaves its start value
         inline — here that would be a chain stage with no rule at all. */
      .fromTo(step, { '--rule': 0 }, { '--rule': 1, duration: 0.7, ease: 'power2.inOut', clearProps: '--rule' }, 0)
      .fromTo(step.querySelectorAll('.chain__t, .chain__k, .chain__c, .chain__m'),
        { opacity: 0, y: 18 }, { ...RISE_TO, stagger: 0.07, clearProps: 'opacity,transform' }, 0.14 + i * 0.02)
      /* The figure resolves a beat after its own words, so the reader has
         already been told what is being drawn. */
      .fromTo(step.querySelectorAll('.chain__f'),
        { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out', clearProps: 'opacity' }, 0.34);
  });

  /* ============================================================
     FOOTER — the last pass.
     The Scan Plane crosses the wordmark once, and that is the last time
     it is seen on the page. Rarity is what keeps it meaningful.
     ============================================================ */
  const mark = document.getElementById('footMark');
  if (mark) {
    const words = [...mark.querySelectorAll('.foot__word')];
    ScrollTrigger.create({
      trigger: mark,
      start: 'top 78%',
      once: true,
      onEnter: () => {
        gsap.timeline()
          .to(words, {
            onStart() {
              mark.classList.add('is-lit');
              words.forEach((w) => w.classList.add('is-on'));
            },
            duration: 0.01,
          })
          .add(scanPlane?.passOver(mark, { duration: 1.5, peak: 0.9, pad: 18 }) ?? gsap.timeline(), 0.35);
      },
    });
  }
}
