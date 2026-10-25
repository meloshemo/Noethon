/**
 * Does the first second of a level kill you?
 *
 * A player who has just pressed Play is standing still on a screen they have
 * not read, and the only two things anybody does next are press a direction or
 * press nothing. Neither should be fatal. Falling in the sea is the game;
 * falling in the sea for obeying the tutorial sign is not, and level one's only
 * sign reads "Yürü: ← →".
 *
 * That is exactly what was happening. Two separate faults, and both of them
 * were invisible to every check that existed:
 *
 *   · The spawn sat a hard-coded eighty pixels into the first floe. Fine while
 *     first floes were two hundred and fifty pixels wide; after they were
 *     narrowed for difficulty, level thirty-one gave you a third of a second
 *     before the ground ran out.
 *   · There was nothing behind the spawn at all. Walking *left* off the start
 *     drowned you in under half a second on every level up to twenty-three.
 *
 * Neither shows up in `validate-levels.mjs`, because no distance was wrong. So
 * this runs the real `World` from the real spawn and simply holds a button.
 */

import { World } from '../src/game/world.js';
import { ALL_LEVELS } from '../src/game/chapters.js';
import { OPENING } from '../src/game/config.js';

const STEP = 1 / 120;
const noop = () => {};
const deps = () => ({
  particles: new Proxy({}, { get: () => noop }),
  audio: new Proxy({}, { get: () => noop }),
  assist: false,
  upgrades: {},
  skin: 'normal',
});

/**
 * The three things a player does in the first moment, and nothing else. No
 * jumping: a level that needs a jump inside the first beat is a level that
 * killed you before you decided anything.
 */
const MOVES = [
  ['hiçbir şey', 0],
  ['sağa', 1],
  ['sola', -1],
];

console.log(`Açılışlar deneniyor (ilk ${OPENING.beat} sn)...\n`);

const frames = Math.ceil(OPENING.beat / STEP);
let fails = 0;

for (const def of ALL_LEVELS) {
  const bad = [];
  for (const [label, axis] of MOVES) {
    const w = new World(def, deps());
    for (let i = 0; i < frames; i++) {
      w.update(STEP, { axis, jumpHeld: false, jumpPressed: false });
      if (w.status === 'dying' || w.status === 'dead') {
        bad.push(`${label} → ${((i + 1) * STEP).toFixed(2)} sn`);
        break;
      }
    }
  }
  if (bad.length) {
    console.log(`  ✗ L${def.id} (${def.name}): ${bad.join(' · ')}`);
    fails += bad.length;
  }
}

console.log(`\n${ALL_LEVELS.length} bölüm × ${MOVES.length} hareket denendi.`);
if (fails) {
  console.log(`\n✗ ${fails} açılış öldürüyor.`);
  process.exit(1);
}
console.log('\n✓ Hiçbir bölüm ilk saliseler içinde öldürmüyor.');
