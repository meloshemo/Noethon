/**
 * Is the same level the same level twice?
 *
 * It was not. Every hazard in the game — two hundred and sixty-eight orcas,
 * storms, gusts, shards, icicles and seals across sixty-one levels — took its
 * starting point in its own cycle from `Math.random()` at construction, and
 * not one level named a phase. The intent was right (hazards should not march
 * in lockstep) and the effect was not: the level was rebuilt on every attempt,
 * so it was a different level on every attempt.
 *
 * That matters here more than it would in most games, because this project's
 * whole claim to fairness is that a solver drives the real `World` and finds a
 * way through. A solver that tries three hundred parameter combinations was
 * drawing three hundred different levels and reporting success if any one of
 * them worked. "This is passable" had quietly become "this is passable on some
 * rolls" — and the player rolls their own.
 *
 * Two properties, and they are different:
 *
 *   1. The level a player is handed is built from the level, not from a die.
 *   2. Nothing *else* in the simulation is a die either. Pin the dice that are
 *      deliberate — the calving serac, the bird's choice of attack — and two
 *      identical runs have to agree down to the last pixel. If they don't,
 *      something is reading a clock or an object address, and no recording,
 *      ghost or proof can be trusted.
 */

import { World } from '../src/game/world.js';
import { ALL_LEVELS } from '../src/game/chapters.js';
import { generateLevel } from '../src/game/generator.js';

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

/** Everything about a level that decides whether it can be crossed. */
function fingerprint(w) {
  const n = (v) => (typeof v === 'number' ? +v.toFixed(4) : v);
  return JSON.stringify({
    floes: w.floes.map((f) => [f.type, n(f.baseX), n(f.baseY), f.w, f.h, n(f.phase), n(f.period)]),
    hazards: w.hazards.map((h) => [h.kind, n(h.baseX), n(h.baseY), n(h.phase), n(h.period), n(h.speed)]),
    fish: w.fish.map((f) => [n(f.x), n(f.y)]),
    charged: (w.charged ?? []).map((f) => [f.kind, n(f.x), n(f.y)]),
    checkpoints: w.checkpoints.map((c) => [n(c.x), n(c.y)]),
    goal: [n(w.goal.x), n(w.goal.y)],
    spawn: [n(w.player.x), n(w.player.y)],
  });
}

const LEVELS = [...ALL_LEVELS, ...[80, 97, 133].map(generateLevel)];

console.log('Aynı bölüm iki kere\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) Bölümün kendisi zar atmıyor');
const differs = [];
for (const def of LEVELS) {
  const a = fingerprint(new World(def, deps()));
  const b = fingerprint(new World(def, deps()));
  if (a !== b) differs.push(`L${def.id}`);
}
check(`${LEVELS.length} bölüm iki kez kuruldu`, differs.length === 0,
  differs.slice(0, 8).join(', ') || 'hepsi birebir aynı');

/* 2 --------------------------------------------------------------------- */
console.log('\n2) Tehlikeler yine de aynı anda çalışmıyor');
// The point of a random phase was that hazards should not march in step. That
// has to survive making them deterministic, or the fix has broken the design.
let flat = 0;
let checked = 0;
for (const def of LEVELS) {
  const w = new World(def, deps());
  const cyclic = w.hazards.filter((h) => ['orca', 'storm', 'gust', 'shard'].includes(h.kind));
  if (cyclic.length < 2) continue;
  checked++;
  const seen = new Set(cyclic.map((h) => Math.round(h.phase * 8)));
  if (seen.size === 1) flat++;
}
check(`${checked} bölümde faz dağılımı`, flat === 0, `${flat} bölümde hepsi aynı sekizde bir`);

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Aynı girdi, aynı koşu — piksel piksel');
// The deliberate dice (the calving serac, the bird's choice) are pinned so
// that what is left is anything unintentional: a clock, an object address, a
// Set iterated in insertion order that isn't.
const real = Math.random;
function pinned(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

function play(def, seed) {
  Math.random = pinned(seed);
  try {
    const w = new World(def, deps());
    const p = w.player;
    const marks = [];
    const r = pinned(seed ^ 0x5f3759df);
    let axis = 0;
    let hold = false;
    let until = 0;
    for (let i = 0; i < 1800; i++) {
      if (i >= until) {
        axis = [-1, 0, 1, 1][Math.floor(r() * 4)];
        hold = r() < 0.5;
        until = i + 8 + Math.floor(r() * 50);
      }
      w.update(STEP, { axis, jumpHeld: hold, jumpPressed: hold && r() < 0.25 });
      if (i % 90 === 0) {
        marks.push([+p.x.toFixed(5), +p.y.toFixed(5), +p.vx.toFixed(5), +p.vy.toFixed(5), w.status, w.deaths]);
      }
      if (w.status === 'won') break;
    }
    return JSON.stringify(marks);
  } finally {
    Math.random = real;
  }
}

const drift = [];
for (const def of LEVELS) {
  if (play(def, 20260826) !== play(def, 20260826)) drift.push(`L${def.id}`);
}
check(`${LEVELS.length} bölüm iki kez oynandı`, drift.length === 0,
  drift.slice(0, 8).join(', ') || '15 saniyelik koşular birebir aynı');

console.log(`\n${LEVELS.length} bölüm tarandı.`);
if (fails) {
  console.log(`\n✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('\n✓ Bölüm bir kere tasarlanıyor, her seferinde aynı oynanıyor.');
