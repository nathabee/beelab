import { prefersReducedMotion } from '../shared/a11y/reducedMotion';
import { createRafLoop } from '../shared/dom/raf';
import { readNumberDataset, clamp } from '../shared/dom/dataset';

function normalizeAspectRatio(v) {
  if (!v || v === 'auto') return 'auto';
  // accept forms like "4/3", "16/9"
  if (/^\d+(\.\d+)?\/\d+(\.\d+)?$/.test(v)) return v;
  return 'auto';
}

function setupParallax(root) {
  const lanes = Array.from(root.querySelectorAll('.beeseen-parallax__lane'));
  if (!lanes.length) return;

  const reduced = prefersReducedMotion();
  if (reduced) return;

  const maxShift = clamp(readNumberDataset(root, 'maxShift', 140), 0, 1200);

  const cropMode = root.dataset.cropMode || 'cover';
  const aspectRatio = normalizeAspectRatio(root.dataset.aspectRatio || '4/3');
  const focusX = clamp(readNumberDataset(root, 'focusX', 50), 0, 100);
  const focusY = clamp(readNumberDataset(root, 'focusY', 40), 0, 100);

  // Apply CSS vars once (cheap and keeps CSS in control)
  root.style.setProperty('--beeseen-crop', cropMode);
  root.style.setProperty('--beeseen-aspect-ratio', aspectRatio);
  root.style.setProperty('--beeseen-focus-x', `${focusX}%`);
  root.style.setProperty('--beeseen-focus-y', `${focusY}%`);

  let rect = null;

  function computeProgress(r) {
    const vh = window.innerHeight || 1;
    const total = r.height + vh;
    const traveled = vh - r.top;
    return clamp(traveled / total, 0, 1);
  }

  function apply() {
    rect = root.getBoundingClientRect();
    const p = computeProgress(rect);
    const centered = (p - 0.5) * 2; // -1..1

    for (const lane of lanes) {
      const speed = clamp(Number(lane.dataset.speed ?? 0), -2, 2);
      const y = centered * maxShift * speed;
      lane.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    }
  }

  const loop = createRafLoop(() => {
    apply();
  });

  // Run on scroll/resize; loop keeps it smooth if scrolling is continuous
  function onScroll() {
    if (!loop.isRunning()) loop.start();
  }
  function onResize() {
    apply();
    if (!loop.isRunning()) loop.start();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  // initial
  apply();

  // Stop the loop shortly after scroll ends (simple idle timeout)
  let idleTimer = null;
  function scheduleStop() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      loop.stop();
    }, 160);
  }

  window.addEventListener('scroll', scheduleStop, { passive: true });

  root.__beeseenCleanup = () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('scroll', scheduleStop);
    window.removeEventListener('resize', onResize);
    if (idleTimer) clearTimeout(idleTimer);
    loop.stop();
  };
}

function init() {
  document
    .querySelectorAll('.wp-block-beeseen-bee-parallax-lanes')
    .forEach(setupParallax);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
