/**
 * The expression layer, and the wall around it.
 *
 * The penguin was drawn correctly and was not alive. Everything on him moved
 * because the physics moved — the feet stepped because `walkPhase` turned, the
 * body squashed because a landing squashed it — and nothing about him ever
 * *reacted*. His face at the bottom of a four-hundred-pixel fall was the same
 * face as standing on a beach.
 *
 * `pose.js` is the fix and it is also a risk. Character animation wants to
 * read everything and touch everything, and this project's whole claim is that
 * a solver drives the real `World` and finds a way through. A cosmetic layer
 * that could nudge a velocity — even by a rounding error — would make every
 * proof in `tests/` a proof about a different game.
 *
 * So the rule is stated here rather than intended: **the expression layer
 * reads, and writes only to itself.** Three ways of checking the same thing,
 * because it is the only thing about this file that actually matters.
 */

import { World } from '../src/game/world.js';
import { ALL_LEVELS } from '../src/game/chapters.js';
import { Pose, MOODS } from '../src/game/pose.js';

const STEP = 1 / 120;
const noop = () => {};
const deps = () => ({
  particles: new Proxy({}, { get: () => noop }),
  audio: new Proxy({}, { get: () => noop }),
  assist: false,
  upgrades: {},
  skin: 'normal',
});

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails++;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

console.log('İfade katmanı — okur, yalnızca kendine yazar\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) İfade katmanı oyunu değiştirmiyor');
/**
 * Play a level, optionally driving an expression layer every frame.
 *
 * The deliberate dice are pinned first — the bird's choice of attack and the
 * calving serac are `Math.random()` on purpose, and from level twelve onward
 * every level has a bird. Without pinning them, two runs of the same level
 * differ for reasons that have nothing to do with the thing being measured,
 * which is exactly the false positive this check started life as.
 */
function play(def, seed, expressive) {
  const real = Math.random;
  let s = 20260827;
  Math.random = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  try {
    return _play(def, seed, expressive);
  } finally {
    Math.random = real;
  }
}

function _play(def, seed, expressive) {
  const w = new World(def, deps());
  const p = w.player;
  const pose = expressive ? new Pose() : null;
  const r = rng(seed);
  const marks = [];
  let axis = 0;
  let hold = false;
  let until = 0;
  for (let i = 0; i < 2400; i++) {
    if (i >= until) {
      axis = [-1, 0, 1, 1][Math.floor(r() * 4)];
      hold = r() < 0.5;
      until = i + 8 + Math.floor(r() * 50);
    }
    w.update(STEP, { axis, jumpHeld: hold, jumpPressed: hold && r() < 0.25 });
    // Frame rate is not step rate: a real session updates the pose on whatever
    // clock the browser hands it, so this drives it on a wobbly one.
    if (pose) pose.update(STEP * (1 + (i % 3) * 0.4), p, w);
    if (i % 120 === 0) {
      marks.push([+p.x.toFixed(6), +p.y.toFixed(6), +p.vx.toFixed(6), +p.vy.toFixed(6), w.status, w.deaths]);
    }
    if (w.status === 'won') break;
  }
  return JSON.stringify(marks);
}
const drift = [];
for (const def of ALL_LEVELS) {
  if (play(def, 424242, false) !== play(def, 424242, true)) drift.push(`L${def.id}`);
}
check(`${ALL_LEVELS.length} bölüm, ifadeli ve ifadesiz aynı`, drift.length === 0,
  drift.slice(0, 6).join(', ') || 'piksel piksel');

/* 2 --------------------------------------------------------------------- */
console.log('\n2) Dokunduğu şeyleri yazamıyor');
// The blunt version: hand it frozen objects. A single write throws, because
// modules are strict mode.
{
  const w = new World(ALL_LEVELS[12], deps());
  const p = w.player;
  const pose = new Pose();
  // Warm it up first, so the moods and springs are all doing something.
  for (let i = 0; i < 60; i++) {
    w.update(STEP, { axis: 1, jumpHeld: true, jumpPressed: i === 3 });
    pose.update(STEP, p, w);
  }
  Object.freeze(p);
  Object.freeze(w);
  let threw = null;
  try {
    for (let i = 0; i < 240; i++) pose.update(1 / 60, p, w);
  } catch (e) {
    threw = e.message;
  }
  check('donmuş bir pengu ve dünya ile çalışıyor', threw === null, threw ?? '');
}

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Her ruh hâli okunabiliyor');
{
  const base = () => ({
    x: 0, y: 0, w: 30, h: 34, vx: 0, vy: 0,
    onGround: true, clinging: false, climbing: false, gliding: false,
    submerged: false, breath: 9, breathMax: 9, charge: 0, quantum: 0,
  });
  const settle = (p, world) => {
    const pose = new Pose();
    for (let i = 0; i < 200; i++) pose.update(1 / 60, p, world);
    return pose;
  };
  const quiet = { skuas: [], status: 'playing' };
  const cases = {
    calm: [base(), quiet],
    fear: [{ ...base(), onGround: false, vy: 900 }, quiet],
    effort: [{ ...base(), onGround: false, clinging: true }, quiet],
    rush: [{ ...base(), charge: 0.5 }, quiet],
    gasp: [{ ...base(), submerged: true, breath: 1 }, quiet],
    joy: [base(), { skuas: [], status: 'won' }],
  };
  for (const [want, [p, world]] of Object.entries(cases)) {
    check(`${want} okunuyor`, settle(p, world).mood === want, settle(p, world).mood);
  }
  // A penguin who is drowning *and* being hunted is drowning. Ordering rather
  // than blending is what keeps one face readable.
  const both = settle({ ...base(), submerged: true, breath: 1 }, {
    skuas: [{ state: 'warn', x: 40, y: 0 }],
    status: 'playing',
  });
  check('boğulmak avlanmayı yeniyor', both.mood === 'gasp', both.mood);
  check('bütün ruh hâlleri listelenmiş',
    MOODS.length === 6 && MOODS.every((m) => typeof m === 'string'));
}

/* 4 --------------------------------------------------------------------- */
console.log('\n4) Hiçbir değer kaçmıyor');
// Springs chase targets, and a spring with a bad `dt` runs away. Frame times
// on a real phone are not a constant.
{
  const w = new World(ALL_LEVELS[40], deps());
  const p = w.player;
  const pose = new Pose();
  const r = rng(7);
  let worst = '';
  for (let i = 0; i < 6000; i++) {
    w.update(STEP, { axis: r() < 0.5 ? 1 : -1, jumpHeld: r() < 0.5, jumpPressed: r() < 0.2 });
    // Everything from a 240Hz monitor to a tab that was in the background.
    pose.update(r() < 0.03 ? 2.5 : r() * 0.03, p, w);
    for (const [k, v] of Object.entries(pose)) {
      if (typeof v !== 'number') continue;
      if (!Number.isFinite(v) || Math.abs(v) > 1e4) worst = `${k}=${v}`;
    }
  }
  check('altı bin karede sınırların içinde', worst === '', worst);
}

if (fails) {
  console.log(`\n✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('\n✓ Pengu yaşıyor, ve yaşaması oyunu değiştirmiyor.');
