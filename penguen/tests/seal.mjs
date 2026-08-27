/**
 * The leopard seal — the last mechanic in the game without a pack of its own.
 *
 * It gets one because of what the audit after the current found. A mechanic
 * can be missing from the running game in a way that no solver and no
 * validator will ever report: the levels still compose, somebody still
 * finishes them, and the only symptom is that a chapter feels flat. The
 * current sat inert for the whole life of the project, and the one thing that
 * distinguished it from every other verb in the sea was that nothing tested
 * whether it *did* anything.
 *
 * So the rule this pack encodes is the general one: every hazard must be
 * measurably dangerous, and every rule written down about it must be true of
 * the running `World`. For the seal there are three such rules, and the third
 * is the one that is easy to lose:
 *
 *   1. it patrols — a hazard that does not move is scenery with a hitbox;
 *   2. it is lethal on contact under the ice;
 *   3. and it cannot be stomped down there. On land, jumping on a hazard is
 *      the game's reward for nerve. In the water the penguin is the small one,
 *      and `world.js` says so in a comment — a comment is not a test.
 */

import { World } from '../src/game/world.js';
import { DIVE_LEVELS } from '../src/game/dive.js';
import { ALL_LEVELS } from '../src/game/chapters.js';

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

/** Drop the penguin exactly on a seal and run until something happens. */
function meet(def, { dive = true, from = 'inside' } = {}) {
  const world = new World(def, deps());
  const seal = world.hazards.find((h) => h.kind === 'seal');
  if (!seal) return null;
  const p = world.player;
  p.submerged = dive;
  p.breath = 999;
  p.x = seal.x + seal.w / 2 - p.w / 2;
  // From above, falling hard: on land this is a stomp. Under the ice it must
  // not be, and that is the whole of check 3.
  p.y = from === 'above' ? seal.y - p.h + 2 : seal.y + seal.h / 2;
  if (from === 'above') p.vy = 320;
  let frames = 0;
  while (frames < 600 && world.status === 'playing') {
    world.update(STEP, { axis: 0, jumpHeld: false });
    frames++;
  }
  return { status: world.status, seconds: frames * STEP };
}

console.log('Deniz leoparı gerçekten tehlikeli mi?\n');

const withSeals = DIVE_LEVELS.filter((d) => (d.hazards ?? []).some((h) => h.kind === 'seal'));

console.log('1) Devriye geziyor');
check(withSeals.length >= 4, `${withSeals.length} dalışta deniz leoparı var`);
for (const def of withSeals) {
  const world = new World(def, deps());
  const seal = world.hazards.find((h) => h.kind === 'seal');
  const x0 = seal.x;
  let far = 0;
  for (let i = 0; i < 480; i++) {
    world.update(STEP, { axis: 0, jumpHeld: false });
    far = Math.max(far, Math.abs(world.hazards.find((h) => h.kind === 'seal').x - x0));
  }
  check(far > 60, `${def.id}. ${def.name}: 4 sn'de ${far.toFixed(0)}px devriye`);
}

console.log('\n2) Değdiği yerde öldürüyor');
for (const def of withSeals) {
  const met = meet(def);
  check(met && met.status !== 'playing', `${def.id}. ${def.name}: temas ölümcül (${met?.status})`);
}

console.log('\n3) Suyun altında üstüne basılamıyor');
{
  // The land rule and the water rule are opposites, and both have to hold.
  const dive = meet(withSeals[0], { from: 'above' });
  check(dive && dive.status !== 'playing', `dalışta yukarıdan gelmek de öldürüyor — ${dive?.status}`);

  const onIce = ALL_LEVELS.find(
    (d) => d.axis !== 'dive' && (d.hazards ?? []).some((h) => h.kind === 'seal'),
  );
  if (!onIce) {
    check(false, 'buzun üstünde deniz leoparı olan bölüm bulunamadı');
  } else {
    const world = new World(onIce, deps());
    const seal = world.hazards.find((h) => h.kind === 'seal');
    const p = world.player;
    p.x = seal.x + seal.w / 2 - p.w / 2;
    p.y = seal.y - p.h - 2;
    p.vy = 300;
    p.onGround = false;
    let bounced = false;
    for (let i = 0; i < 30 && world.status === 'playing'; i++) {
      world.update(STEP, { axis: 0, jumpHeld: false });
      if (world.player.vy < -50) bounced = true;
    }
    check(
      bounced && world.status === 'playing',
      `buzda üstüne basmak zıplatıyor — ${onIce.id}. ${onIce.name}`,
    );
  }
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Leopar hem yüzüyor hem öldürüyor — ve suyun altında ondan kaçmaktan başka yol yok.');
