// src/shared/dom/dataset.js

export function readNumberDataset(el, key, fallback) {
  const v = el?.dataset?.[key];
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function readBoolDataset(el, key, fallback) {
  const v = el?.dataset?.[key];
  if (v == null || v === '') return fallback;
  return v === '1' || v === 'true' || v === 'yes';
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
