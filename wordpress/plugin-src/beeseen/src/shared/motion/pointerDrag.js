// src/shared/motion/pointerDrag.js

export function attachPointerDrag(target, handlers) {
  const {
    onStart,
    onMove,
    onEnd,
    cursor = 'grabbing',
  } = handlers;

  let active = false;
  let pointerId = null;

  let startX = 0;
  let lastX = 0;

  let lastT = 0;
  let vx = 0; // px/ms

  function setCursor(isOn) {
    if (!target) return;
    target.style.cursor = isOn ? cursor : '';
  }

  function onPointerDown(e) {
    // Only primary button for mouse
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    active = true;
    pointerId = e.pointerId;

    startX = e.clientX;
    lastX = e.clientX;

    lastT = performance.now();
    vx = 0;

    try {
      target.setPointerCapture(pointerId);
    } catch (_) {}

    setCursor(true);
    onStart?.({ x: startX });

    // Prevent text selection/scroll weirdness on drag
    e.preventDefault?.();
  }

  function onPointerMove(e) {
    if (!active || e.pointerId !== pointerId) return;

    const now = performance.now();
    const dx = e.clientX - lastX;
    const dt = Math.max(1, now - lastT);

    vx = dx / dt;

    lastX = e.clientX;
    lastT = now;

    onMove?.({
      x: e.clientX,
      dxFromStart: e.clientX - startX,
      dx,
      vx, // px/ms
    });
  }

  function endDrag(e) {
    if (!active) return;
    if (e.pointerId != null && e.pointerId !== pointerId) return;

    active = false;

    try {
      target.releasePointerCapture(pointerId);
    } catch (_) {}

    setCursor(false);

    onEnd?.({ vx });

    pointerId = null;
  }

  target.addEventListener('pointerdown', onPointerDown, { passive: false });
  target.addEventListener('pointermove', onPointerMove, { passive: true });
  target.addEventListener('pointerup', endDrag, { passive: true });
  target.addEventListener('pointercancel', endDrag, { passive: true });
  target.addEventListener('pointerleave', endDrag, { passive: true });

  return () => {
    target.removeEventListener('pointerdown', onPointerDown);
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointerup', endDrag);
    target.removeEventListener('pointercancel', endDrag);
    target.removeEventListener('pointerleave', endDrag);
  };
}
