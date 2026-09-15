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

  /* ---- PHASE 12.1 — the header takes the tone of the section under it.
     Light sections carry `data-tone="light"`; the rest are dark. The bar
     reads whichever section its own midline is over, so it turns with the
     ground exactly at the edge, the way the tracker rail does. The drawer
     follows the bar. ---- */
  if (nav) {
    const drawerEl = document.getElementById('navLinksMobile');
    const mid = () => `${Math.round(nav.offsetHeight / 2)}px`;
    /* PHASE 13 — a CROSSING is not a section, and the bar still has to
       stand on it. The bridge and the data field are the page's two dark
       crossings; they carry `data-nav-tone` and are read the same way a
       section's `data-tone` is. */
    document.querySelectorAll('main > section, main > [data-nav-tone]').forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec,
        start: () => `top ${mid()}`,
        end: () => `bottom ${mid()}`,
        onToggle: (self) => {
          if (!self.isActive) return;
          const tone = sec.dataset.navTone || sec.dataset.tone || 'dark';
          nav.dataset.tone = tone;
          if (drawerEl) drawerEl.dataset.tone = tone;
        },
      });
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

  /* ---- PHASE 13 — the services disclosure ----
     The three services are three documents, so the header offers them as
     three links behind one control rather than as a section anchor. A
     pointer opens it on hover because that is what a person expects of a
     menu bar; a keyboard opens it on Enter and closes it on Escape,
     because hover is not an input everyone has. The panel is `hidden`
     when closed, so it is out of the tab order rather than merely
     invisible. ---- */
  const menu = document.getElementById('navServices');
  if (menu) {
    const btn = menu.querySelector('.navmenu__btn');
    const panel = menu.querySelector('.navmenu__panel');
    const items = [...panel.querySelectorAll('a')];
    let leaveT = null;

    const setOpen = (on) => {
      if (btn.getAttribute('aria-expanded') === String(on)) return;
      btn.setAttribute('aria-expanded', String(on));
      panel.hidden = !on;
      menu.classList.toggle('is-open', on);
    };

    btn.addEventListener('click', () => {
      setOpen(btn.getAttribute('aria-expanded') !== 'true');
      if (!panel.hidden) items[0]?.focus({ preventScroll: true });
    });

    menu.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(leaveT);
      setOpen(true);
    });
    /* A short grace period: the pointer has to cross a few pixels of gap
       between the control and the panel, and closing on that is the
       classic menu that cannot be used. */
    menu.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      leaveT = setTimeout(() => setOpen(false), 140);
    });

    menu.addEventListener('focusout', (e) => {
      if (!menu.contains(e.relatedTarget)) setOpen(false);
    });

    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (btn.getAttribute('aria-expanded') !== 'true') return;
        setOpen(false);
        btn.focus();
        return;
      }
      const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      setOpen(true);
      const i = items.indexOf(document.activeElement);
      const next = i === -1 ? (step > 0 ? 0 : items.length - 1)
        : (i + step + items.length) % items.length;
      items[next]?.focus({ preventScroll: true });
    });

    document.addEventListener('pointerdown', (e) => {
      if (!menu.contains(e.target)) setOpen(false);
    });
  }

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
