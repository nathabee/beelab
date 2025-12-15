// src/shared/motion/inertia.js

export function createInertia({
  // velocity in "units per second" (you decide what a unit is, e.g. radians/sec)
  initialVelocity = 0,
  // exponential decay factor: higher = stops faster (typical 6..14)
  friction = 10,
  // stop threshold
  minVelocity = 0.001,
} = {}) {
  let v = initialVelocity;
  let active = false;

  return {
    start(velocity) {
      v = velocity;
      active = Math.abs(v) > minVelocity;
    },
    stop() {
      active = false;
      v = 0;
    },
    isActive() {
      return active;
    },
    // dt in ms
    step(dtMs) {
      if (!active) return { v: 0, delta: 0 };

      const dt = dtMs / 1000;

      // Exponential decay: v(t) = v0 * e^(-friction * t)
      const decay = Math.exp(-friction * dt);
      const vNew = v * decay;

      // Integrate velocity over dt (approx using average)
      const vAvg = (v + vNew) / 2;
      const delta = vAvg * dt;

      v = vNew;

      if (Math.abs(v) < minVelocity) {
        active = false;
        v = 0;
      }

      return { v, delta };
    },
  };
}
