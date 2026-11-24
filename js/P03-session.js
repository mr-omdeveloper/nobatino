// Shared browser-only identity for the preview; it does not authorize access to server data.
(() => {
  'use strict';

  const PREFIX = 'nobatino_p03_demo_v1:';
  const ACTIVE = PREFIX + 'signed-in';
  const root = new URL('../', document.currentScript.src);
  const pages = {
    home: new URL('html/P01-landing.html', root),
    doctor: new URL('html/P02-doctor-details.html', root),
    auth: new URL('html/P03-auth.html', root),
    panel: new URL('html/P04-user-panel.html', root),
    staff: new URL('html/P05-doctor-panel.html', root)
  };
  const allowedPaths = new Set([root.pathname, new URL('index.html', root).pathname,
    pages.home.pathname, pages.doctor.pathname, pages.panel.pathname, pages.staff.pathname]);
  const route = (url) => url.protocol === 'file:' ? url.href : url.pathname + url.search + url.hash;
  const fa = (number) => number.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[digit]);
  const valid = (number) => typeof number === 'string' && /^09\d{9}$/.test(number)
    && localStorage.getItem(PREFIX + 'account:' + number) !== null;

  function safeReturn(value) {
    try {
      const url = new URL(value, root);
      if (value && url.protocol === root.protocol && url.host === root.host &&
        !url.username && !url.password && allowedPaths.has(url.pathname)) {
        return route(url);
      }
    } catch { /* Treat malformed destinations like a direct visit. */ }
    return route(pages.home);
  }

  function authUrl(mode, destination) {
    const url = new URL(pages.auth);
    if (mode && mode !== 'login') url.searchParams.set('mode', mode);
    url.searchParams.set('next', safeReturn(destination));
    return route(url);
  }

  function readCurrent() {
    try {
      let stored = localStorage.getItem(ACTIVE);
      const old = sessionStorage.getItem(ACTIVE);
      if (old !== null) {
        const legacy = JSON.parse(old);
        if (stored === null && valid(legacy)) {
          stored = old;
          localStorage.setItem(ACTIVE, old);
        }
        sessionStorage.removeItem(ACTIVE);
      }
      const number = JSON.parse(stored);
      return valid(number) ? number : null;
    } catch { return null; }
  }

  function currentDoctor(number = readCurrent()) {
    if (!number) return null;
    try {
      const entry = JSON.parse(localStorage.getItem(PREFIX + 'account:' + number));
      if (entry?.role !== 'doctor' || !entry.doctor?.id) return null;
      const { id, firstName, lastName, medicalLicenseNumber } = entry.doctor;
      return { id, name: [firstName, lastName].join(' '), medicalLicenseNumber };
    } catch { return null; }
  }

  function accountDestination(destination) {
    return currentDoctor() ? route(pages.staff) : safeReturn(destination);
  }

  function setCurrent(number) {
    localStorage.setItem(ACTIVE, JSON.stringify(number));
    sessionStorage.removeItem(ACTIVE);
    window.dispatchEvent(new Event('nobatino:account-change'));
  }

  function profileKey(number = readCurrent()) {
    return number ? PREFIX + 'profile:' + number : 'nobatino_user_profile';
  }

  function profile(number) {
    try { return JSON.parse(localStorage.getItem(profileKey(number))) || {}; }
    catch { return {}; }
  }

  window.NobatinoAccount = Object.freeze({
    PREFIX, safeReturn, authUrl, accountDestination, current: readCurrent, currentDoctor,
    signIn: setCurrent, signOut: () => setCurrent(null), profileKey
  });

  const icons = {
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    panel: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-10 5h4"/>',
    home: '<path d="m3 10 9-7 9 7m-16-1v11h14V9m-9 11v-6h4v6"/>',
    exit: '<path d="M10 4H5v16h5m-1-8h12m-4-4 4 4-4 4"/>'
  };
  const icon = (name) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + '</svg>';

  function initHeader() {
    const guests = [...document.querySelectorAll('[data-p03-guest]')];
    const links = [...document.querySelectorAll('a[data-p03-auth]')];
    const host = document.querySelector('[data-p03-account]');
    if (!host && !links.length) return;

    function updateLinks() {
      const here = route(new URL(location.href));
      for (const link of links) link.href = authUrl(link.dataset.p03Auth, here);
    }
    updateLinks();
    window.addEventListener('hashchange', updateLinks);
    for (const link of links) {
      link.addEventListener('pointerdown', updateLinks);
      link.addEventListener('click', updateLinks);
      link.addEventListener('focus', updateLinks);
    }
    if (!host) return;

    host.innerHTML = '<button type="button" class="p03-account-toggle" aria-label="منوی حساب کاربری" ' +
      'aria-expanded="false" aria-controls="p03-account-menu">' +
      '<span class="p03-account-avatar">' + icon('user') + '</span>' + icon('menu') + '</button>' +
      '<nav id="p03-account-menu" class="p03-account-menu" aria-label="حساب کاربری" hidden>' +
      '<div class="p03-account-summary"><strong></strong><bdi dir="ltr"></bdi></div>' +
      '<a class="p03-account-action" data-destination="home">' + icon('home') + 'صفحهٔ اصلی</a>' +
      '<a class="p03-account-action" data-account-panel hidden></a>' +
      '<button type="button" class="p03-account-action p03-account-exit">' + icon('exit') + 'خروج از حساب</button></nav>';
    for (const link of host.querySelectorAll('[data-destination]')) link.href = pages[link.dataset.destination].href;
    const toggle = host.querySelector('.p03-account-toggle');
    const avatar = host.querySelector('.p03-account-avatar');
    const menu = host.querySelector('.p03-account-menu');
    const panelLink = host.querySelector('[data-account-panel]');

    function setOpen(open) {
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    }

    toggle.addEventListener('click', () => setOpen(menu.hidden));
    host.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
    host.addEventListener('focusout', (event) => {
      if (event.relatedTarget && !host.contains(event.relatedTarget)) setOpen(false);
    });
    document.addEventListener('click', (event) => {
      if (!host.contains(event.target)) setOpen(false);
    });
    host.querySelector('.p03-account-exit').addEventListener('click', () => {
      setCurrent(null);
      const first = guests[0];
      (first?.matches('a') ? first : first?.querySelector('a[data-p03-auth]'))?.focus();
    });

    let shown;
    function sync() {
      const number = readCurrent();
      if (number !== shown) setOpen(false);
      shown = number;
      host.hidden = !number;
      for (const guest of guests) guest.hidden = Boolean(number);
      if (!number) return;
      const doctor = currentDoctor(number);
      const details = doctor ? {} : profile(number);
      const name = doctor ? doctor.name : typeof details.fullName === 'string' ? details.fullName.trim() : '';
      const panel = doctor ? pages.staff : pages.panel;
      panelLink.hidden = location.pathname === panel.pathname || (!doctor && host.dataset.p03Account === 'staff');
      panelLink.href = panel.href;
      panelLink.innerHTML = icon('panel') + (doctor ? 'پنل پزشک' : 'پنل کاربر');
      menu.querySelector('strong').textContent = name || 'حساب کاربری';
      menu.querySelector('bdi').textContent = fa(number);
      if (typeof details.photo === 'string' && /^data:image\/[\w.+-]+;base64,/i.test(details.photo)) {
        const image = new Image();
        image.alt = '';
        image.addEventListener('error', () => { if (avatar.contains(image)) avatar.innerHTML = icon('user'); });
        image.src = details.photo;
        avatar.replaceChildren(image);
      } else if (name && name !== 'کاربر نوبتینو') {
        avatar.textContent = Array.from(name)[0];
      } else {
        avatar.innerHTML = icon('user');
      }
    }
    sync();
    window.addEventListener('pageshow', () => { updateLinks(); sync(); });
    window.addEventListener('nobatino:account-change', sync);
    window.addEventListener('nobatino:profile-change', sync);
    window.addEventListener('storage', (event) => {
      if (!event.key || event.key === ACTIVE || event.key === profileKey(shown)) sync();
    });
  }

  document.addEventListener('DOMContentLoaded', initHeader);
})();
