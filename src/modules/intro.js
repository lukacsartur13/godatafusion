import gsap from 'gsap';
import { env } from '../core/env.js';

/**
 * Opening choreography.
 * Order matters: grid → scan pass → the object resolves out of point data →
 * headline → controls → telemetry. Nothing here blocks interaction; the
 * page is clickable from the first frame.
 */
export function playIntro({ scene, scanPlane, telemetry, heroWindow }) {
  const root = document.documentElement;

  const content = [...document.querySelectorAll('.hero__content > *:not(.hero__title)')];
  const lines = [...document.querySelectorAll('.hero__title .line__in')];
  const rules = [...document.querySelectorAll('.frame__rule')];
  const marks = [...document.querySelectorAll('.frame__mark')];
  const telem = [...document.querySelectorAll('.telemetry__row')];
  const modes = document.querySelector('.modes');
  const rail = document.querySelector('.modes__rail');
  const strip = document.querySelector('.strip');

  if (env.reducedMotion) {
    root.classList.remove('is-preload');   // CSS alone restores the final state
    scene?.intro();
    telemetry?.boot();
    /* The phone window's REALITY → DATA rule is a STATE, not an animation:
       reduced motion still gets the statement, drawn immediately. */
    heroWindow?.measure();
    heroWindow?.reveal();
    return gsap.timeline();
  }

  // Seed the start state, then release the CSS pre-boot guard.
  const hwin = document.querySelector('.hwin');
  gsap.set([content, modes, strip, '.telemetry'], { opacity: 0 });
  if (hwin) gsap.set(hwin, { opacity: 0 });
  gsap.set(content, { y: 14 });
  gsap.set(rules, { scaleY: 0, transformOrigin: 'top' });
  gsap.set(marks, { opacity: 0 });
  gsap.set(telem, { opacity: 0, x: 10 });
  root.classList.remove('is-preload');

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.to(rules, { scaleY: 1, duration: 1.0, stagger: 0.06, ease: 'power2.inOut' }, 0)
    .to(marks, { opacity: 1, duration: 0.5, stagger: 0.05 }, 0.18)
    .add(scanPlane.pass({ duration: 1.55, peak: 1 }), 0.2)
    .add(scene ? scene.intro() : gsap.timeline(), 0.2)
    .to(content[0], { opacity: 1, y: 0, duration: 0.7 }, 0.55)
    .fromTo(lines, { yPercent: 135 }, { yPercent: 0, duration: 1.15, stagger: 0.085, ease: 'expo.out' }, 0.68)
    .to(content.slice(1), { opacity: 1, y: 0, duration: 0.85, stagger: 0.1 }, 1.15)
    .to('.telemetry', { opacity: 1, duration: 0.3 }, 1.3)
    .to(telem, { opacity: 1, x: 0, duration: 0.6, stagger: 0.08 }, 1.32)
    .to(modes, { opacity: 1, duration: 0.75 }, 1.42)
    .to(strip, { opacity: 1, duration: 0.6 }, 1.62)
    .add(() => {
      telemetry?.boot();
      rail?.classList.add('is-hinted');
      setTimeout(() => rail?.classList.remove('is-hinted'), 2200);
    }, 1.45);

  /* PHASE 5 — the phone's first-contact transformation. The window has to be
     measured after the headline has settled (its height is a grid remainder),
     so the measure and the beat are sequenced into the same timeline rather
     than fired on a guessed delay. Above the phone breakpoint both no-op. */
  if (hwin) {
    tl.to(hwin, { opacity: 1, duration: 0.7 }, 1.05)
      .add(() => {
        heroWindow?.measure();
        heroWindow?.reveal();
      }, 1.5);
  }

  /* PHASE 5 / §14 — end on the stylesheet's own state, not on the inline
     values this timeline wrote. Once the opening has played there is
     nothing inline left for a later kill, refresh or overwrite to strand. */
  tl.set([...content, ...lines, ...rules, ...marks, ...telem, modes, strip,
    ...(hwin ? [hwin] : []), '.telemetry'].filter(Boolean),
  { clearProps: 'opacity,transform,scaleY,transformOrigin,x,y' });

  // Safety net: a tab backgrounded during boot gets no animation frames, so
  // the sequence can sit at 0 with the content still held at opacity 0.
  // Never leave the hero hidden for longer than this.
  const guard = setTimeout(() => { if (tl.progress() < 1) tl.progress(1); }, 5000);
  tl.eventCallback('onComplete', () => clearTimeout(guard));

  return tl;
}
