import gsap from 'gsap';
import { ScrollTrigger } from '../core/scroll.js';
import { env } from '../core/env.js';

/* ============================================================
   Section reveals for the three service pages.

   The same grammar as the homepage — masked line-in for headlines, a
   short rise for supporting text, and the Scan Plane used exactly once
   per page, on the output block. Nothing springs, nothing parallaxes.
   ============================================================ */

const LINE = { duration: 1.0, stagger: 0.08, ease: 'expo.out' };
const RISE = { opacity: 0, y: 22 };
const RISE_TO = { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' };

export function initServiceSections({ scanPlane } = {}) {
  if (env.reducedMotion) {
    document.querySelectorAll('.sv-hero__title .line__in').forEach((el) => { el.style.transform = 'none'; });
    document.body.classList.add('rm-static');
    return;
  }

  /* PATCH 9.1 — 135, not 105.

     The reveal masks gained .12 em of headroom at each end so they stop
     cropping the accents off the Hungarian headlines (see the note on
     `.sv-h .line` in styles/service.css). A taller mask needs the words
     parked further below it: at 105 % of its own height a line came to rest
     .07 em INSIDE the mask, so the top of every headline was faintly
     visible before it played. 135 % clears the deepest case — the hero, at
     .94 leading — with room to spare. Same duration, same ease, same
     grammar. */
  document.querySelectorAll('.sv-h .line__in, .sv-hero__title .line__in').forEach((el) => {
    gsap.fromTo(el, { yPercent: 135 }, {
      ...LINE, yPercent: 0, clearProps: 'transform',
      scrollTrigger: { trigger: el.closest('.sv-h, .sv-hero__title'), start: 'top 86%', once: true },
    });
  });

  /* fromTo, never from.

     `gsap.from` records the element's CURRENT value as the tween's end and
     applies the start immediately. If that tween is then killed before it
     runs — which `once: true` does when a ScrollTrigger start is crossed in
     one jump, and which a refresh can do too — the element is left holding
     the START state as an inline style that outranks every class on it.
     Measured on /teruletfelmeres/ with real wheel input: all four `.sv-step`
     blocks — the copy for SURFACE / CONTOURS / VOLUME / EXPORT, every derived
     figure and the whole cut/fill instrument — stayed at `opacity: 0` for the
     entire page. `fromTo` states both ends explicitly, so there is no
     recorded value to lose and no state a kill can strand.

     PHASE 5 adds the other half of the rule: `overwrite: 'auto'` is gone
     too. On a STAGGERED fromTo it kills the tween during its own first
     render and strands the start state permanently — measured on the
     homepage, where it had been silently swallowing the MANIFESTO, FUSION
     and SERVICES headlines. Every reveal now also ends with `clearProps`,
     so the resolved state is the stylesheet's own and there is no inline
     value left for anything to strand. */
  const rise = (sel, opts = {}) => {
    const { stagger, ...tween } = opts;
    const els = [...document.querySelectorAll(sel)];
    els.forEach((el, i) => {
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
  const pick = (o, keys) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));
  rise('.sv-lede');
  rise('.sv-note');
  rise('.sv-legal');
  rise('.uses__v', { stagger: 0.09 });
  rise('.site__fig', { y: 16 });
  rise('.sib__a', { stagger: 0.08 });
  rise('.qsheet', { y: 16 });
  rise('.sv-req__row', { stagger: 0.07 });
  rise('.sv-step', { stagger: 0.09 });
  rise('.sv-cap', { stagger: 0.05, y: 14 });

  /* The rules draw before the words arrive — the homepage WHY grammar,
     reused so the two pages read as one system. */
  document.querySelectorAll('.sv-row').forEach((row) => {
    gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 86%', once: true } })
      .fromTo(row, { '--rule': 0 }, { '--rule': 1, duration: 0.7, ease: 'power2.inOut', clearProps: '--rule' }, 0)
      .fromTo(row.querySelectorAll('.sv-row__k, .sv-row__c'),
        { opacity: 0, y: 18 }, { ...RISE_TO, y: 0, stagger: 0.08, clearProps: 'opacity,transform' }, 0.12);
  });

  /* One pass, once, over the block that states what the visitor receives. */
  const out = document.querySelector('[data-scan-target]');
  if (out && scanPlane) {
    ScrollTrigger.create({
      trigger: out, start: 'top 72%', once: true,
      onEnter: () => scanPlane.passOver(out, { duration: 1.4, peak: 0.8, pad: 20 }),
    });
  }
}
