/** Small maths / helper toolbox shared by every module. */

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inverseLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));

/** Frame-rate independent exponential smoothing. */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
export const randInt = (a, b) => Math.floor(rand(b + 1, a));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t) => t * t * t;
export const easeOutBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

/** Axis-aligned rectangle overlap. */
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Deterministic pseudo-random generator (mulberry32).
 * Used by the level generator so a given level number always looks the same.
 */
/**
 * A short, stable fingerprint of a string.
 *
 * FNV-1a, 32 bits, printed in base 36. Not a security hash and not trying to
 * be: it exists so a saved coordinate can be told apart from a coordinate that
 * belonged to a level shaped differently.
 */
export function fingerprint(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** mm:ss.cs — used for the timer and best-time display. */
export function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds * 100) % 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/**
 * A time for reading rather than for racing.
 *
 * The running clock is `formatTime` and stays `00:21.00` — it is a stopwatch
 * and a stopwatch has a fixed width, otherwise the digits jump about while you
 * are trying to play. A *record*, in a list of eighty of them, is different:
 * the leading `00:` is two characters of noise on every row, and nobody has
 * ever needed to be told that twenty-one seconds is under a minute.
 */
export function formatRecord(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const rest = seconds - m * 60;
  const s = Math.floor(rest);
  const cs = Math.floor((rest * 100) % 100);
  const tail = `${String(s).padStart(m ? 2 : 1, '0')}.${String(cs).padStart(2, '0')}`;
  return m ? `${m}:${tail}` : `${tail} sn`;
}
