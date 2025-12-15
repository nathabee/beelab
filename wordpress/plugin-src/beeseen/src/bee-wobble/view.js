import { prefersReducedMotion } from '../shared/a11y/reducedMotion';
import { createRafLoop } from '../shared/dom/raf';
import { readNumberDataset, readBoolDataset, clamp } from '../shared/dom/dataset';

function setupWobble(root) {
  const grid = root.querySelector('.beeseen-wobble__grid');
  if (!grid) return;

  const items = Array.from(root.querySelectorAll('.beeseen-wobble__item'));
  if (!items.length) return;

  const reduced = prefersReducedMotion();

  const enableWobble = readBoolDataset(root, 'enableWobble', true) && !reduced;
  const intensity = clamp(readNumberDataset(root, 'intensity', 16), 0, 80);
  const lift = clamp(readNumberDataset(root, 'lift', 6), 0, 40);

  // Bail early if disabled
  if (!enableWobble || intensity === 0) {
    return;
  }

  // State per item
  const state = items.map(() => ({
    // current
    x: 0,
    y: 0,
    s: 1,
    // target
    tx: 0,
    ty: 0,
    ts: 1,
  }));

  let hoverIndex = -1;

  function getCenter(rect) {
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
  }

  function computeTargets() {
    if (hoverIndex < 0) {
      for (const st of state) {
        st.tx = 0;
        st.ty = 0;
        st.ts = 1;
      }
      return;
    }

    const hoverRect = items[hoverIndex].getBoundingClientRect();
    const H = getCenter(hoverRect);

    for (let i = 0; i < items.length; i++) {
      const st = state[i];

      if (i === hoverIndex) {
        st.tx = 0;
        st.ty = -lift;
        st.ts = 1.02;
        continue;
      }

      const r = items[i].getBoundingClientRect();
      const C = getCenter(r);

      let vx = C.cx - H.cx;
      let vy = C.cy - H.cy;

      const dist = Math.hypot(vx, vy) || 1;
      vx /= dist;
      vy /= dist;

      // Falloff: only neighbors in a reasonable radius get pushed
      const falloffRadius = 320; // px, tweak later
      const w = clamp(1 - dist / falloffRadius, 0, 1);

      const push = intensity * (w * w);

      st.tx = vx * push;
      st.ty = vy * push;
      st.ts = 1;
    }
  }

  function applyTransforms() {
    for (let i = 0; i < items.length; i++) {
      const st = state[i];
      const el = items[i];

      // Smoothly approach targets (lerp)
      const k = 0.18; // smoothing factor
      st.x += (st.tx - st.x) * k;
      st.y += (st.ty - st.y) * k;
      st.s += (st.ts - st.s) * k;

      el.style.transform = `translate(${st.x.toFixed(2)}px, ${st.y.toFixed(2)}px) scale(${st.s.toFixed(3)})`;
      el.style.willChange = 'transform';
      el.style.zIndex = i === hoverIndex ? '2' : '1';
    }
  }

  const loop = createRafLoop(({ dt }) => {
    // dt not used yet; keeping signature consistent
    applyTransforms();
  });

  function reset() {
    hoverIndex = -1;
    computeTargets();
    if (!loop.isRunning()) loop.start();
    // Stop loop once settled: cheap heuristic
    window.setTimeout(() => {
      loop.stop();
      for (let i = 0; i < items.length; i++) {
        items[i].style.transform = '';
        items[i].style.zIndex = '';
      }
      // restore to neutral state explicitly (avoids lingering rounding)
      for (const st of state) {
        st.x = st.y = 0;
        st.tx = st.ty = 0;
        st.s = st.ts = 1;
      }
    }, 220);
  }

  items.forEach((el, idx) => {
    el.addEventListener('pointerenter', () => {
      hoverIndex = idx;
      computeTargets();
      if (!loop.isRunning()) loop.start();
    });

    el.addEventListener('pointerleave', () => {
      reset();
    });
  });

  // If mouse moves inside the grid while hovering, recompute (layout may shift)
  grid.addEventListener('pointermove', () => {
    if (hoverIndex < 0) return;
    computeTargets();
  }, { passive: true });

  root.__beeseenCleanup = () => {
    loop.stop();
  };
}

function init() {
  const roots = document.querySelectorAll('.wp-block-beeseen-bee-wobble');
  roots.forEach(setupWobble);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
