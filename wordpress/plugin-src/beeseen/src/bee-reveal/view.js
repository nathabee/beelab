import { prefersReducedMotion } from '../shared/a11y/reducedMotion';
import { createRafLoop } from '../shared/dom/raf';
import { readNumberDataset, clamp } from '../shared/dom/dataset';

function setupReveal(root) {
  const frame = root.querySelector('.beeseen-reveal__frame');
  const revealImg = root.querySelector('.beeseen-reveal__img--reveal');
  if (!frame || !revealImg) return;

  const reduced = prefersReducedMotion();
  if (reduced) {
    // On reduced motion: reveal disabled (show base only)
    revealImg.style.opacity = '0';
    return;
  }

  const radius = clamp(readNumberDataset(root, 'radius', 120), 20, 600);
  const feather = clamp(readNumberDataset(root, 'feather', 60), 0, 600);
  const ease = clamp(readNumberDataset(root, 'ease', 0.18), 0.03, 0.5);

  // current and target positions in %
  let x = 50, y = 50;
  let tx = 50, ty = 50;

  let active = false;

  function setMask(px, py) {
    // CSS vars used by mask gradients
    root.style.setProperty('--beeseen-reveal-x', `${px}%`);
    root.style.setProperty('--beeseen-reveal-y', `${py}%`);
    root.style.setProperty('--beeseen-reveal-radius', `${radius}px`);
    root.style.setProperty('--beeseen-reveal-feather', `${feather}px`);
  }

  setMask(x, y);

  const loop = createRafLoop(() => {
    x += (tx - x) * ease;
    y += (ty - y) * ease;
    setMask(x, y);
  });

  function onEnter() {
    active = true;
    revealImg.style.opacity = '1';
    if (!loop.isRunning()) loop.start();
  }

  function onMove(e) {
    if (!active) return;
    const r = frame.getBoundingClientRect();
    const px = clamp(((e.clientX - r.left) / r.width) * 100, 0, 100);
    const py = clamp(((e.clientY - r.top) / r.height) * 100, 0, 100);
    tx = px;
    ty = py;
  }

  function onLeave() {
    active = false;
    revealImg.style.opacity = '0';
    // ease back toward center
    tx = 50;
    ty = 50;
    window.setTimeout(() => loop.stop(), 260);
  }

  frame.addEventListener('pointerenter', onEnter, { passive: true });
  frame.addEventListener('pointermove', onMove, { passive: true });
  frame.addEventListener('pointerleave', onLeave, { passive: true });
  frame.addEventListener('pointercancel', onLeave, { passive: true });

  root.__beeseenCleanup = () => loop.stop();
}

function init() {
  document.querySelectorAll('.wp-block-beeseen-bee-reveal').forEach(setupReveal);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
