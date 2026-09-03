/**
 * The snow bank: cover with a lifespan.
 *
 * Chapter four had five words for fifteen levels — the thinnest vocabulary in
 * the game — and all five were arrangements of one idea: *where can you stand
 * so nothing has a line on you*. A pillar is the answer to that question, and
 * once a player has found a pillar the level is over except for the walking.
 *
 * A bank is a pillar with a clock on it, and the clock is wound by the people
 * shooting at you. Three hits and it is snow on the ground. The safest place on
 * the level is the place that is running out.
 *
 * Three things have to hold, and two of them were broken on the way here:
 *
 *   · **It can only ever give the player time.** Made solid it was also a
 *     wall, and on a level where the walk between two stand-spots is already
 *     timed against the dodge window, a wall in the middle of that walk turned
 *     a winnable arena into an unwinnable one. It is loose snow now: a
 *     snowball buries itself in it, a penguin bellies through it.
 *   · **It is never on the answer.** This chapter's puzzle is that the player
 *     throws nothing — you stand where a rival's shot at *you* passes through
 *     another rival. A bank on one of those lines means the shot hits snow and
 *     nobody falls over. The first version checked for that against a plan
 *     that had not been built yet, and dropped a bank exactly onto a
 *     stand-spot on two levels while passing every rule in the composer.
 *   · **It comes back on a respawn**, or dying behind one hands the player a
 *     level with less cover than the one they were given.
 */

import { World } from '../src/game/world.js';
import { BRAWL_LEVELS } from '../src/game/brawl.js';
import { Arena } from '../src/game/arena.js';
import { BANK, PENGUIN } from '../src/game/config.js';
import { Snowball } from '../src/game/entities.js';

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

const WITH_BANKS = BRAWL_LEVELS.filter((d) => (d.banks ?? []).length);

console.log('Kar siperi — süresi olan siper\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) Kar topunu yiyor, sayarak');
{
  const def = WITH_BANKS[0];
  const w = new World(def, deps());
  const b = w.banks[0];
  const before = b.left;
  const mid = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  /** One real snowball, thrown flat into the middle of it. */
  const lob = () => {
    w.snowballs.push(new Snowball({ x: b.x - 260, y: mid.y }, mid, false));
    for (let i = 0; i < Math.ceil(1.4 / STEP) && w.snowballs.length; i++) {
      w.update(STEP, { axis: 0, jumpHeld: false, jumpPressed: false });
    }
  };
  const seen = [];
  for (let n = 0; n < before + 1; n++) {
    lob();
    seen.push(b.left);
  }
  check('siper sayarak eriyor', seen.slice(0, before).every((v, i) => v === before - 1 - i),
    seen.join(' → '));
  check(`${before} atıştan sonra gidiyor`, b.gone);
  // And once it is gone it is gone: a ball thrown at the same spot flies past
  // the far edge instead of being swallowed at a face that is no longer there.
  {
    const ball = new Snowball({ x: b.x - 260, y: mid.y }, mid, false);
    w.snowballs.push(ball);
    let past = false;
    for (let i = 0; i < Math.ceil(1.2 / STEP); i++) {
      w.update(STEP, { axis: 0, jumpHeld: false, jumpPressed: false });
      if (ball.x > b.x + b.w + 8) { past = true; break; }
      if (!w.snowballs.includes(ball)) break;
    }
    check('gittikten sonra kar topunu durdurmuyor', past, `x=${Math.round(ball.x)}`);
  }
}

/* 2 --------------------------------------------------------------------- */
console.log('\n2) Duvar değil: pengu içinden geçiyor');
// The property the whole thing rests on. A bank must never be able to stop a
// penguin, or adding cover to an arena can take the arena away.
for (const def of WITH_BANKS) {
  const w = new World(def, deps());
  const inSolids = w.solids.filter((f) => f.bank).length;
  check(`L${def.id} siperler katı cisim değil`, inSolids === 0, `${inSolids} tanesi katı`);
}
{
  const def = WITH_BANKS[0];
  const w = new World(def, deps());
  const b = w.banks[0];
  const p = w.player;
  // Walk straight at it from the left and see whether the far side is reached.
  p.x = b.x - 140;
  p.y = b.y + b.h - p.h;
  const target = b.x + b.w + 40;
  let arrived = false;
  for (let i = 0; i < Math.ceil(3 / STEP); i++) {
    w.update(STEP, { axis: 1, jumpHeld: false, jumpPressed: false });
    if (p.x > target) { arrived = true; break; }
    if (w.status !== 'playing') break;
  }
  check('yürüyerek öbür tarafa geçiliyor', arrived, `x=${Math.round(p.x)} hedef ${target}`);
}

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Cevabın üstünde durmuyor');
// Neither on a line the puzzle needs nor on a spot the player has to stand on.
for (const def of WITH_BANKS) {
  const room = PENGUIN.w * (def.scale ?? 1) * 1.4;
  const clashes = [];
  for (const b of def.banks) {
    for (const pl of def.plan ?? []) {
      if (pl.stand.x + room > b.x && pl.stand.x - room < b.x + b.w) {
        clashes.push(`duruş ${Math.round(pl.stand.x)} ↔ siper ${b.x}`);
      }
    }
  }
  check(`L${def.id} hiçbir duruş noktasını kapatmıyor`, clashes.length === 0,
    clashes.slice(0, 2).join(', '));
}

/* 4 --------------------------------------------------------------------- */
console.log('\n4) Ölünce geri geliyor');
{
  const def = WITH_BANKS[0];
  const w = new World(def, deps());
  const b = w.banks[0];
  b.left = 0;
  b.gone = true;
  w.status = 'playing';
  w._respawn();
  check('diriliş siperleri yeniliyor', !b.gone && b.left === (b.hits ?? BANK.hits),
    `${b.left} atışlık`);
}

/* 5 --------------------------------------------------------------------- */
console.log('\n5) Yerleştirilemiyorsa reddediliyor');
{
  let refused = false;
  try {
    const a = new Arena({ scale: 1.6 });
    a.ground();
    // A wall of banks across the whole floor: some of them have nowhere legal.
    for (let i = 0; i < 14; i++) a.duel({ guardAt: 0.2 + i * 0.05, standAt: 0.1 + i * 0.06 });
    for (let i = 0; i < 14; i++) a.bank({ at: 0.1 + i * 0.06 });
    a.build({ id: 999, name: 'olmaz' });
  } catch {
    refused = true;
  }
  check('sığmayan siper sessizce yutulmuyor', refused);
}

console.log(`\n${WITH_BANKS.length} arenada siper, her biri ${BANK.hits} atışlık.`);
if (fails) {
  console.log(`\n✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('\n✓ Saklanmak artık bir çözüm değil, tükenen bir kaynak.');
