/**
 * Buzlu zemin — the arena's first statement about *getting* somewhere.
 *
 * Chapter four's vocabulary is an argument about lines. A pillar eats one, a
 * bank puts a clock on the eating, a lobber goes over the top, an icefall says
 * the square itself is wrong. All of those are statements about a place, and
 * the chapter had nothing at all to say about the walk to it — every duel is
 * solved by standing on one patch of floor at one moment, and arriving there
 * was free in all fifteen arenas.
 *
 * Glare ice is that missing sentence: the stand-spot does not move, the line
 * through the guard stays as clean as it was, and the penguin slides past the
 * answer. It is the shelf's slip ice, unchanged — same floe type, same
 * friction, same drawing — so what needs proving is not the mechanic but the
 * four things that are new about putting it *here*:
 *
 *   1. it reaches the arenas that asked for it,
 *   2. it never takes every stand-spot at once, which is the chapter's one
 *      promise withdrawn,
 *   3. it is not standing between a thrower and a guard,
 *   4. and the running game agrees it is slippery.
 */

import { World } from '../src/game/world.js';
import { ALL_LEVELS } from '../src/game/chapters.js';
import { BRAWL, PENGUIN, PHYS, FIRM_ICE, scaleForLevel } from '../src/game/config.js';

const STEP = 1 / 120;
const deps = () => ({
  particles: { puff() {}, splash() {}, sparkle() {}, burstIce() {} },
  audio: new Proxy({}, { get: () => () => {} }),
  assist: false,
  upgrades: {},
  skin: 'normal',
});

let fails = 0;
const check = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) fails++;
};

const arenas = ALL_LEVELS.filter((d) => d.brawl);
const slippery = (def) => (def.floes ?? []).filter((f) => f.type === 'slip');
const iced = arenas.filter((d) => slippery(d).length);

console.log('Arenada buzlu zemin\n');

console.log('1) İstenen arenalara ulaştı');
check(iced.length >= 3, `${iced.length} arenada buzlu zemin var`);
check(
  iced.some((d) => d.id === 76),
  `son arena da buzlu — ${iced.map((d) => d.id).join(', ')}`,
);

console.log('\n2) Kırılan bir zemin değil, kaygan bir zemin');
for (const def of iced) {
  for (const f of slippery(def)) {
    // A patch you fall through would be thin ice with another name, and the
    // chapter already has thin ice. This one holds.
    check(FIRM_ICE.has(f.type), `${def.id}. ${def.name}: ${f.w}px yama sağlam buz`);
  }
}

console.log('\n3) Her arenada sağlam buzda durulacak bir yer kaldı');
for (const def of iced) {
  const body = PENGUIN.w * (def.scale ?? scaleForLevel(def.id));
  const patches = slippery(def);
  /*
   * The composer's one rule, re-checked from the outside.
   *
   * It is deferred to `build` precisely so it can be checked against the
   * finished plan, and a rule enforced only where it is written is a rule
   * nobody will notice breaking. `def.plan` carries the stand-spots the
   * arena was built backwards from, so the question can be asked here in the
   * same words: is there one the glare ice did not take?
   */
  const firm = (def.plan ?? []).filter(
    (p) => !patches.some((f) => p.stand.x > f.x - body * 0.5 && p.stand.x < f.x + f.w + body * 0.5),
  );
  check(firm.length > 0, `${def.id}. ${def.name}: ${firm.length}/${def.plan.length} durak sağlam buzda`);
  // And the level does not start on it. A level already sliding as it fades
  // in has not told the player anything yet.
  const onSpawn = patches.some((f) => def.spawn.x > f.x - body && def.spawn.x < f.x + f.w + body);
  check(!onSpawn, `${def.id}. ${def.name}: başlangıç sağlam buzda`);
}

console.log('\n4) Her bayraktan bir gövde uzakta');
for (const def of iced) {
  const body = PENGUIN.w * (def.scale ?? scaleForLevel(def.id));
  for (const f of slippery(def)) {
    /*
     * Nothing to do with slipperiness — a flag on glare ice is allowed, and
     * `tests/checkpoint.mjs` says so, because slip ice is firm ice. It is the
     * one pixel the patch stands proud of the floor: the respawn guard puts
     * the penguin's whole box down and refuses a point that is inside anything
     * solid, so an edge landing half a body from a flag makes that flag
     * unusable on every death while the level still looks perfect.
     */
    const flags = (def.checkpoints ?? []).filter(
      (c) => c.x > f.x - body && c.x < f.x + f.w + body,
    );
    check(flags.length === 0, `${def.id}. ${def.name}: yamanın yanında bayrak yok`);
  }
}

console.log('\n5) Hiçbir atış hattının önünde durmuyor');
for (const def of iced) {
  const scale = def.scale ?? scaleForLevel(def.id);
  const eye = def.floes[0].y - PENGUIN.h * scale * 0.5;
  for (const f of slippery(def)) {
    /*
     * Not a line walk — `arena.js` already re-walks every line against every
     * blocker, and this would only repeat it. The thing worth asserting is
     * the reason that walk cannot be troubled by a patch: the whole patch
     * lies below the lowest point any line reaches, which is the standing
     * penguin's middle, by more than a snowball's radius.
     */
    check(
      f.y > eye + BRAWL.radius,
      `${def.id}. ${def.name}: yama y ${f.y}, en alçak hat ${Math.round(eye)}`,
    );
  }
}

console.log('\n6) Ve oyun onu kaygan sayıyor');
{
  const def = iced[0];
  const patch = slippery(def)[0];
  /*
   * Given a speed and then let go of, on the patch and off it.
   *
   * The first version walked the penguin up to speed with the keys and then
   * released — which measured the wrong thing: three quarters of a second of
   * walking carries it clean off a two-hundred-pixel patch, so both runs ended
   * up braking on solid ice and the difference came out at eighteen pixels
   * against twelve. The speed is set directly now, so the brake happens where
   * the penguin is standing.
   */
  const run = (x0) => {
    const world = new World(def, deps());
    world.player.x = x0;
    world.player.y = def.floes[0].y - world.player.h;
    world.update(STEP, { axis: 0, jumpHeld: false });
    world.player.vx = 200;
    const from = world.player.x;
    for (let i = 0; i < 60; i++) world.update(STEP, { axis: 0, jumpHeld: false });
    return { glide: world.player.x - from };
  };
  const onIce = run(patch.x + 10);
  const onSolid = run(Math.max(60, patch.x - 320));
  check(
    onIce.glide > onSolid.glide * 2,
    `buzda ${onIce.glide.toFixed(0)}px kayıyor, sağlam buzda ${onSolid.glide.toFixed(0)}px`,
  );
  /*
   * And the slide is a slide rather than a launch. `PHYS.slipFriction` is a
   * twelfth of normal grip, which would carry a penguin the width of the
   * arena if nothing else bled the speed off; what stops it is the same
   * damping the shelf's slip ice has always used. The number here is the one
   * the shelf plays with, so if it ever changes this pack says so.
   */
  check(
    onIce.glide < def.worldW * 0.2,
    `kayma ${onIce.glide.toFixed(0)}px — arenanın %${Math.round((onIce.glide / def.worldW) * 100)}'i`,
  );
  check(
    PHYS.slipFriction < 0.3,
    `sürtünme sağlam buzun %${Math.round(PHYS.slipFriction * 100)}'i`,
  );
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Arenanın zemini kayıyor — ve her arenada durulacak bir yer kaldı.');
