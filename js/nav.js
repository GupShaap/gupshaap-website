// Mobile menu: on small screens the nav links collapse behind a "Menu" button.
// Without JavaScript the button stays hidden and the links remain visible.
(() => {
  const header = document.querySelector('body > header');
  const toggle = header?.querySelector('.menu-toggle');
  const nav = header?.querySelector('#site-nav');
  if (!toggle || !nav) return;

  const label = toggle.querySelector('.menu-label');
  const mobile = window.matchMedia('(max-width: 680px)');

  function setOpen(open) {
    header.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Close' : 'Menu';
  }

  toggle.hidden = false;
  header.classList.add('menu-ready');

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  // Close after choosing a link, on Escape, on tapping outside, or when leaving mobile width.
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('menu-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) setOpen(false);
  });
  mobile.addEventListener('change', () => setOpen(false));
})();
