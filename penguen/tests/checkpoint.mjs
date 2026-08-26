/**
 * What a checkpoint promises.
 *
 * It promises one thing: die, and you come back *here*. Four ways it was
 * lying, none of which threw, failed a test, or looked wrong on screen.
 *
 *   · **The diving chapter threw every flag away.** The guard against death
 *     loops asks `standable()` — is there a floe top within six pixels — and
 *     under the ice there is nothing to stand on, because the penguin swims.
 *     So it failed for all fifteen dive levels: you crossed a long, hard
 *     tunnel, took the flag, heard the chime, drowned, and restarted at the
 *     mouth of it with nothing to say why.
 *   · **The arenas threw theirs away too**, for a different reason: their
 *     flags were planted forty-six pixels above the floor — the height of the
 *     flag's own pole — so the flag hovered and there was no ground under the
 *     point.
 *   · **Twenty flags stood on ice that breaks.** Crack, burst, melt, fake. You
 *     respawn on ground that is already counting down.
 *   · **Seven put you on top of a patrolling seal.** Not near it, on it: the
 *     respawn killed you in the same frame it happened, and then did it again.
 *     No input escapes that. The level is over and the player must quit it.
 *
 * The test is the promise, stated as a simulation: put the penguin on every
 * respawn point in the game, press nothing for two seconds, and see what
 * happens to it.
 */

import { World } from '../src/game/world.js';
import { ALL_LEVELS } from '../src/game/chapters.js';
import { generateLevel } from '../src/game/generator.js';
import { FIRM_ICE, OPENING } from '../src/game/config.js';

const STEP = 1 / 120;
const noop = () => {};
const deps = () => ({
  particles: new Proxy({}, { get: () => noop }),
  audio: new Proxy({}, { get: () => noop }),
  assist: false,
  upgrades: {},
  skin: 'normal',
});
const NOTHING = { axis: 0, jumpHeld: false, jumpPressed: false };

/**
 * How long a respawned penguin must live while doing nothing.
 *
 * Not "for ever": an arena is five rivals throwing at you and standing still
 * is losing, which is the level, not a bug. But long enough to see where you
 * are and decide — twice the opening beat the game already uses as the
 * shortest fair warning anywhere else.
 */
const GRACE = OPENING.beat * 2;

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails++;
}

const LEVELS = [...ALL_LEVELS, ...Array.from({ length: 40 }, (_, i) => generateLevel(77 + i))];

console.log('Kontrol noktası sözünü tutuyor mu\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) Bayrak kalıcı buzda duruyor');
const soft = [];
for (const def of LEVELS) {
  const w = new World(def, deps());
  if (w.diving) continue;
  const p = w.player;
  for (const [i, c] of w.checkpoints.entries()) {
    const x = c.x + c.w / 2;
    const under = w.solids
      .filter((f) => Math.min(x + p.w / 2, f.x + f.w) - Math.max(x - p.w / 2, f.x) > 2
        && Math.abs(f.y - c.y) <= 6)
      .map((f) => f.type ?? 'solid');
    if (!under.some((t) => FIRM_ICE.has(t))) soft.push(`L${def.id}#${i}[${under.join(',') || 'boşluk'}]`);
  }
}
check('kırılan, eriyen, patlayan buzda bayrak yok', soft.length === 0,
  soft.slice(0, 6).join(' ') || `${LEVELS.length} bölüm`);

/* 2 --------------------------------------------------------------------- */
console.log('\n2) Bayrak geri dönüldüğünde kabul ediliyor');
// The guard exists for a real reason and must keep working; what it must not
// do is refuse a point that is perfectly fine because it is under water.
const dropped = [];
let kept = 0;
for (const def of LEVELS) {
  const w = new World(def, deps());
  for (const c of w.checkpoints) {
    const at = { x: c.x + c.w / 2, y: c.y };
    if (w.standable(at.x, at.y)) kept++;
    else dropped.push(`L${def.id}@${at.x.toFixed(0)},${at.y.toFixed(0)}`);
  }
}
check(`${kept} bayrağın hepsi ölümden sonra korunuyor`, dropped.length === 0,
  dropped.slice(0, 6).join(' '));

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Bir taşın içinde uyandırmıyor');
const inside = [];
for (const def of LEVELS) {
  const w = new World(def, deps());
  const p = w.player;
  for (const c of w.checkpoints) {
    const px = c.x + c.w / 2 - p.w / 2;
    const py = c.y - p.h;
    for (const f of w.solids) {
      if (!f.solid) continue;
      const ox = Math.min(px + p.w, f.x + f.w) - Math.max(px, f.x);
      const oy = Math.min(py + p.h, f.y + f.h) - Math.max(py, f.y);
      if (ox > 1 && oy > 1) inside.push(`L${def.id} ${f.type} ${ox.toFixed(0)}×${oy.toFixed(0)}`);
    }
  }
}
check('hiçbir bayrak buzun içinde değil', inside.length === 0, inside.slice(0, 6).join(' '));

/* 4 --------------------------------------------------------------------- */
console.log(`\n4) Hiçbir şeye basmadan ${GRACE.toFixed(1)} saniye yaşıyor`);
// The one that matters. Everything above is a proxy for this.
const killed = [];
for (const def of LEVELS) {
  const w = new World(def, deps());
  // An arena is five rivals throwing at you; standing still there is losing on
  // purpose, and that is the level rather than a broken promise.
  if (w.brawl) continue;
  const points = [
    { x: w.spawn.x, y: w.spawn.y, label: 'doğuş' },
    ...w.checkpoints.map((c, i) => ({ x: c.x + c.w / 2, y: c.y, label: `bayrak${i}` })),
  ];
  for (const pt of points) {
    w.respawn = { x: pt.x, y: pt.y };
    w.status = 'playing';
    w._respawn();
    let cause = '';
    const die = w.die.bind(w);
    w.die = (c = 'water') => { if (w.status === 'playing' && w.shields <= 0) cause ||= c; return die(c); };
    let died = 0;
    for (let i = 0; i < Math.ceil(GRACE / STEP); i++) {
      w.update(STEP, NOTHING);
      if (w.status === 'dying' || w.status === 'dead') { died = i * STEP; break; }
    }
    w.die = die;
    if (died || w.status === 'dying' || w.status === 'dead') {
      killed.push(`L${def.id} ${pt.label} ${died.toFixed(2)}sn ${cause}`);
    }
  }
}
check('hiçbir diriliş oyuncuyu öldürmüyor', killed.length === 0, killed.slice(0, 8).join(' | '));

console.log(`\n${LEVELS.length} bölüm tarandı.`);
if (fails) {
  console.log(`\n✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('\n✓ Ölünce geri dönülen yer, geri dönmeye değer bir yer.');
