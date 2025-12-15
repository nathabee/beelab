import { prefersReducedMotion } from '../shared/a11y/reducedMotion';
import { createRafLoop } from '../shared/dom/raf';
import { readNumberDataset, readBoolDataset, clamp } from '../shared/dom/dataset';

function setupTilt(root) {
  const card = root.querySelector('.beeseen-tilt__card');
  const glareEl = root.querySelector('.beeseen-tilt__glare');
  const img = root.querySelector('.beeseen-tilt__img');
  if (!card || !img) return;

  const reduced = prefersReducedMotion();

  const maxTilt = clamp(readNumberDataset(root, 'maxTilt', 10), 0, 35);
  const perspective = clamp(readNumberDataset(root, 'perspective', 800), 200, 4000);
  const glare = readBoolDataset(root, 'glare', true) && !reduced;
  const glareStrength = clamp(readNumberDataset(root, 'glareStrength', 0.25), 0, 0.9);

  card.style.transformStyle = 'preserve-3d';
  card.style.willChange = 'transform';
  card.style.perspective = `${perspective}px`;

  // Current and target
  let rx = 0, ry = 0, g = 0;
  let trx = 0, try_ = 0, tg = 0;
  let active = false;

  function setTargetsFromPointer(e) {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;  // 0..1
    const py = (e.clientY - r.top) / r.height;  // 0..1

    // map to [-1..1]
    const nx = (px - 0.5) * 2;
    const ny = (py - 0.5) * 2;

    // rotateX reacts to vertical movement (invert for “natural” feel)
    trx = -ny * maxTilt;
    try_ = nx * maxTilt;

    if (glare && glareEl) {
      // glare intensity peaks near top-left-ish; keep subtle
      const d = Math.sqrt(nx * nx + ny * ny); // 0..~1.4
      tg = clamp((1 - d / 1.2) * glareStrength, 0, glareStrength);
      // store glare position
      glareEl.style.setProperty('--beeseen-glare-x', `${px * 100}%`);
      glareEl.style.setProperty('--beeseen-glare-y', `${py * 100}%`);
    }
  }

  function resetTargets() {
    trx = 0;
    try_ = 0;
    tg = 0;
  }

  const loop = createRafLoop(() => {
    // smooth towards targets
    const k = 0.14;
    rx += (trx - rx) * k;
    ry += (try_ - ry) * k;
    g += (tg - g) * k;

    card.style.transform = `perspective(${perspective}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;

    if (glare && glareEl) {
      glareEl.style.opacity = String(g);
    }
  });

  function onEnter() {
    if (reduced) return;
    active = true;
    if (!loop.isRunning()) loop.start();
  }

  function onMove(e) {
    if (!active || reduced) return;
    setTargetsFromPointer(e);
  }

  function onLeave() {
    active = false;
    resetTargets();
    // let it ease back a bit, then stop loop
    window.setTimeout(() => {
      if (!active) loop.stop();
    }, 220);
  }

  card.addEventListener('pointerenter', onEnter, { passive: true });
  card.addEventListener('pointermove', onMove, { passive: true });
  card.addEventListener('pointerleave', onLeave, { passive: true });
  card.addEventListener('pointercancel', onLeave, { passive: true });

  // initial
  if (glare && glareEl) glareEl.style.opacity = '0';

  root.__beeseenCleanup = () => {
    loop.stop();
    card.removeEventListener('pointerenter', onEnter);
    card.removeEventListener('pointermove', onMove);
    card.removeEventListener('pointerleave', onLeave);
    card.removeEventListener('pointercancel', onLeave);
  };
}

function init() {
  document.querySelectorAll('.wp-block-beeseen-bee-tilt').forEach(setupTilt);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
