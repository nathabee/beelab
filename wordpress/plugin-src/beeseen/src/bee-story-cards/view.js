import { prefersReducedMotion } from '../shared/a11y/reducedMotion';
import { readNumberDataset, clamp } from '../shared/dom/dataset';

function readBoolDataset(el, key, fallback = false) {
  const v = el?.dataset?.[key];
  if (v == null || v === '') return fallback;
  return v === '1' || v === 'true' || v === 'yes';
}

function setupStoryCards(root) {
  // NEW: two slide lists (media + caption)
  const mediaSlides = Array.from(root.querySelectorAll('.beeseen-sc__slide--media'));
  const capSlides = Array.from(root.querySelectorAll('.beeseen-sc__slide--caption'));

  const count = mediaSlides.length || capSlides.length;
  if (!count) return;

  // If one list exists and the other doesn't, still work, but keep indices safe.
  const hasMedia = mediaSlides.length === count;
  const hasCaps = capSlides.length === count;

  const ui = root.querySelector('.beeseen-sc__ui');
  const dotsWrap = root.querySelector('.beeseen-sc__dots');
  const prevBtn = root.querySelector('.beeseen-sc__prev');
  const nextBtn = root.querySelector('.beeseen-sc__next');

  const autoplay = readBoolDataset(root, 'autoplay', true);
  const pauseOnHover = readBoolDataset(root, 'pauseOnHover', true);
  const showControls = readBoolDataset(root, 'showControls', true);

  const durationMs = clamp(readNumberDataset(root, 'durationMs', 4500), 800, 20000);
  const transitionMs = clamp(readNumberDataset(root, 'transitionMs', 380), 0, 2000);
  const transition = root.dataset.transition || 'fade';

  const reduced = prefersReducedMotion();
  const effAutoplay = reduced ? false : autoplay;
  const effTransitionMs = reduced ? 0 : transitionMs;

  // apply transition style as a class (affects media stage visuals)
  root.classList.remove('is-trans-fade', 'is-trans-fade-up', 'is-trans-fade-left');
  root.classList.add(`is-trans-${transition}`);

  // transition duration ONLY on media slides (caption is swapped via display)
  if (hasMedia) {
    mediaSlides.forEach((s) => {
      s.style.transition = effTransitionMs
        ? `opacity ${effTransitionMs}ms ease, transform ${effTransitionMs}ms ease`
        : 'none';
    });
  }

  let idx = 0;
  let timer = null;
  let playing = false;
  let hoveredOrFocused = false;
  let inView = true;

  function setActive(nextIdx, { user = false } = {}) {
    idx = (nextIdx + count) % count;

    if (hasMedia) {
      mediaSlides.forEach((s, i) => {
        s.classList.toggle('is-active', i === idx);
      });
    }

    if (hasCaps) {
      capSlides.forEach((s, i) => {
        s.classList.toggle('is-active', i === idx);
      });
    }

    if (dotsWrap) {
      dotsWrap.querySelectorAll('.beeseen-sc__dot').forEach((d, i) => {
        d.classList.toggle('is-active', i === idx);
      });
    }

    // if user interacts, restart autoplay cleanly
    if (user) {
      stop();
      if (effAutoplay) start();
    }
  }

  function stop() {
    playing = false;
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function scheduleNext() {
    if (!playing) return;
    if (!effAutoplay) return;
    if (!inView) return;
    if (hoveredOrFocused) return;

    timer = setTimeout(() => {
      setActive(idx + 1);
      scheduleNext();
    }, durationMs);
  }

  function start() {
    if (playing) return;
    playing = true;
    scheduleNext();
  }

  function buildDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'beeseen-sc__dot';
      b.setAttribute('aria-label', `Show card ${i + 1}`);
      b.addEventListener('click', () => setActive(i, { user: true }));
      dotsWrap.appendChild(b);
    }
  }

  if (showControls && ui) {
    buildDots();
    if (prevBtn) prevBtn.addEventListener('click', () => setActive(idx - 1, { user: true }));
    if (nextBtn) nextBtn.addEventListener('click', () => setActive(idx + 1, { user: true }));
  } else {
    if (ui) ui.style.display = 'none';
  }

  function setHoverFocus(v) {
    hoveredOrFocused = v;
    if (hoveredOrFocused) stop();
    else if (effAutoplay && inView) start();
  }

  if (pauseOnHover) {
    root.addEventListener('mouseenter', () => setHoverFocus(true));
    root.addEventListener('mouseleave', () => setHoverFocus(false));
    root.addEventListener('focusin', () => setHoverFocus(true));
    root.addEventListener('focusout', () => setHoverFocus(false));
  }

  let io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        inView = !!entry?.isIntersecting;
        if (!inView) stop();
        else if (effAutoplay && !hoveredOrFocused) start();
      },
      { threshold: 0.15 }
    );
    io.observe(root);
  }

  // init
  setActive(0);
  if (effAutoplay) start();

  root.__beeseenCleanup = () => {
    stop();
    if (io) io.disconnect();
  };
}

function init() {
  document.querySelectorAll('.wp-block-beeseen-bee-story-cards').forEach(setupStoryCards);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
