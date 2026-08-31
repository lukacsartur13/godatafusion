import { ScrollTrigger } from '../core/scroll.js';

export function initNav() {
  const nav = document.getElementById('nav');
  const burger = document.getElementById('navBurger');
  const drawer = document.getElementById('navLinksMobile');

  /* ---- header condenses once the hero is behind you ---- */
  if (nav) {
    ScrollTrigger.create({
      start: 'top -60',
      onToggle: (self) => nav.classList.toggle('is-solid', self.isActive),
    });
  }

  /* ---- current section marked in both navigations ---- */
  /* Only same-document hashes are trackable. A service page's header links
     read `/#services`, which is a URL and not a selector — passing one to
     querySelector throws and takes the rest of the page's boot with it. */
  const links = [...document.querySelectorAll('.nav__links a, .nav__drawer a')]
    .filter((a) => (a.getAttribute('href') || '').startsWith('#'));
  const byHash = new Map();
  links.forEach((a) => {
    const h = a.getAttribute('href');
    if (h.length < 2) return;
    if (!byHash.has(h)) byHash.set(h, []);
    byHash.get(h).push(a);
  });
  byHash.forEach((els, hash) => {
    const target = document.querySelector(hash);
    if (!target) return;
    ScrollTrigger.create({
      trigger: target, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => els.forEach((a) => {
        a.classList.toggle('is-here', self.isActive);
        if (self.isActive) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      }),
    });
  });

  if (!burger || !drawer) return;

  const close = () => {
    burger.setAttribute('aria-expanded', 'false');
    drawer.hidden = true;
    document.body.classList.remove('drawer-open');
  };

  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    drawer.hidden = open;
    document.body.classList.toggle('drawer-open', !open);
    if (!open) drawer.querySelector('a')?.focus({ preventScroll: true });
  });

  drawer.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      close(); burger.focus();
    }
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 860) close(); });
}
