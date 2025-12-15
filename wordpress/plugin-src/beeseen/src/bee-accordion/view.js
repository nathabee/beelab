import { prefersReducedMotion } from '../shared/a11y/reducedMotion';

function setup(root) {
  const track = root.querySelector('.beeseen-accordion__track');
  if (!track) return;

  // Reduce motion: keep transitions minimal
  if (prefersReducedMotion()) {
    root.classList.add('beeseen-accordion--reduced');
  }

  const panels = Array.from(root.querySelectorAll('.beeseen-accordion__panel'));
  if (!panels.length) return;

  function setActive(el) {
    panels.forEach((p) => p.classList.toggle('is-active', p === el));
  }

  // default active = first (for touch / keyboard)
  setActive(panels[0]);

  panels.forEach((panel) => {
    panel.addEventListener('click', () => setActive(panel));
    panel.addEventListener('focus', () => setActive(panel));
  });
}

function init() {
  document.querySelectorAll('.wp-block-beeseen-bee-accordion').forEach(setup);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
