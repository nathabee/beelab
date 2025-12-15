// src/shared/dom/raf.js


export function createRafLoop(tick) {
  let rafId = null;
  let running = false;
  let last = 0;

  function frame(ts) {
    if (!running) return;
    const dt = last ? (ts - last) : 16.7;
    last = ts;

    tick({ ts, dt });

    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = 0;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    },
    isRunning() {
      return running;
    },
  };
}
