import { prefersReducedMotion } from '../shared/a11y/reducedMotion';
import { createRafLoop } from '../shared/dom/raf';
import { readNumberDataset, clamp } from '../shared/dom/dataset';

function setupMagnetic(root) {
  const frame = root.querySelector('.beeseen-magnetic__frame');
  const img = root.querySelector('.beeseen-magnetic__img');
  if (!frame || !img) return;

  const reduced = prefersReducedMotion();
  if (reduced) return;

  const strength = clamp(readNumberDataset(root, 'strength', 18), 0, 200);
  const maxOffset = clamp(readNumberDataset(root, 'maxOffset', 28), 0, 300);
  const ease = clamp(readNumberDataset(root, 'ease', 0.14), 0.02, 0.5);
  const lift = clamp(readNumberDataset(root, 'lift', 0), 0, 80);

  let tx = 0, ty = 0;
  let x = 0, y = 0;
  let hovering = false;

  function computeTarget(e) {
    const r = frame.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;   // 0..1
    const py = (e.clientY - r.top) / r.height;  // 0..1

    const nx = (px - 0.5) * 2; // -1..1
    const ny = (py - 0.5) * 2;

    // “Strength” scales pull; clamp to maxOffset
    tx = clamp(nx * strength, -maxOffset, maxOffset);
    ty = clamp(ny * strength, -maxOffset, maxOffset);
  }

  function resetTarget() {
    tx = 0;
    ty = 0;
  }

  const loop = createRafLoop(() => {
    x += (tx - x) * ease;
    y += (ty - y) * ease;

    const z = hovering ? -lift : 0;
    frame.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z}px)`;
    frame.style.willChange = 'transform';
  });

  function onEnter() {
    hovering = true;
    if (!loop.isRunning()) loop.start();
  }

  function onMove(e) {
    if (!hovering) return;
    computeTarget(e);
  }

  function onLeave() {
    hovering = false;
    resetTarget();

    // stop when near rest
    window.setTimeout(() => {
      loop.stop();
      frame.style.transform = '';
    }, 260);
  }

  frame.addEventListener('pointerenter', onEnter, { passive: true });
  frame.addEventListener('pointermove', onMove, { passive: true });
  frame.addEventListener('pointerleave', onLeave, { passive: true });
  frame.addEventListener('pointercancel', onLeave, { passive: true });

  root.__beeseenCleanup = () => {
    loop.stop();
  };
}

function init() {
  document.querySelectorAll('.wp-block-beeseen-bee-magnetic').forEach(setupMagnetic);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
