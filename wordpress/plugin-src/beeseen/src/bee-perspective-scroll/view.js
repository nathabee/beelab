import { prefersReducedMotion } from '../shared/a11y/reducedMotion';
import { createRafLoop } from '../shared/dom/raf';
import { readNumberDataset, clamp } from '../shared/dom/dataset';

function setup(root) {
  const cards = Array.from(root.querySelectorAll('.beeseen-persp__card'));
  if (!cards.length) return;

  if (prefersReducedMotion()) {
    root.classList.add('beeseen-persp--reduced');
    return;
  }

  const rotateMax = clamp(readNumberDataset(root, 'rotateMax', 10), 0, 35);
  const scaleMin = clamp(readNumberDataset(root, 'scaleMin', 0.94), 0.7, 1);
  const liftMax = clamp(readNumberDataset(root, 'liftMax', 18), 0, 120);
  const fade = (root.dataset.fade ?? '1') === '1';

  let needs = true;

  function update() {
    if (!needs) return;
    needs = false;

    const vh = window.innerHeight || 800;
    const centerY = vh * 0.52; // slightly below top feels nicer

    for (const card of cards) {
      const r = card.getBoundingClientRect();

      // progress: 0 at center, 1 at far
      const dist = Math.abs((r.top + r.height * 0.5) - centerY);
      const t = clamp(dist / (vh * 0.75), 0, 1);

      // ease: keep effect subtle near center
      const ease = 1 - t;              // 1 near center
      const eased = ease * ease;       // smoother falloff

      const rot = (1 - eased) * rotateMax; // more rotate when far
      const sign = (r.top + r.height * 0.5) < centerY ? 1 : -1; // above vs below
      const rotateX = rot * sign;

      const scale = scaleMin + (1 - scaleMin) * eased;
      const lift = liftMax * eased;

      card.style.transform =
        `perspective(1200px) translate3d(0, ${(-lift).toFixed(2)}px, 0) rotateX(${rotateX.toFixed(2)}deg) scale(${scale.toFixed(4)})`;

      if (fade) {
        const op = 0.55 + 0.45 * eased; // 0.55..1
        card.style.opacity = `${op.toFixed(3)}`;
      } else {
        card.style.opacity = '';
      }
    }
  }

  const loop = createRafLoop(update);

  function requestUpdate() {
    needs = true;
    if (!loop.isRunning()) loop.start();
  }

  // initial
  requestUpdate();

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });

  // stop RAF when it settles (cheap)
  let stopTimer = null;
  function settleStop() {
    if (stopTimer) window.clearTimeout(stopTimer);
    stopTimer = window.setTimeout(() => loop.stop(), 140);
  }
  window.addEventListener('scroll', settleStop, { passive: true });
  window.addEventListener('resize', settleStop, { passive: true });

  root.__beeseenCleanup = () => {
    loop.stop();
    window.removeEventListener('scroll', requestUpdate);
    window.removeEventListener('resize', requestUpdate);
  };
}

function init() {
  document.querySelectorAll('.wp-block-beeseen-bee-perspective-scroll').forEach(setup);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
