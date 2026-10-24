/**
 * Ağırlığa cevap veren buz — the only ice in the game the penguin changes by
 * standing on it, in both of the places it exists.
 *
 * Every other piece of ice here is a clock or a shape. Cracking ice counts
 * down, melting ice counts around, a geyser throws, a slab swings on somebody
 * else's timing: all of them happen *to* the penguin, and until this one the
 * penguin was the one thing that never changed the world by being in it.
 *
 * So what this pack proves is not that a rectangle moves. It is the four
 * claims the piece is built on, each of which was wrong in some earlier draft:
 *
 *   1. it goes down under weight and comes back up without it, at the two
 *      different rates that make a second visit cost more than the first;
 *   2. leaving promptly is an ordinary jump — the promise the composer makes
 *      when it asks for its gaps at `BUOY.safe` rather than from flat ground;
 *   3. staying is not survivable, or the whole thing is an animation;
 *   4. and a player can see which ice this is *before* standing on it.
 */

import { World } from '../src/game/world.js';
import { ALL_LEVELS } from '../src/game/chapters.js';
import { Course } from '../src/game/terrain.js';
import { BUOY, SAG, PENGUIN, scaleForLevel, reachFor } from '../src/game/config.js';
import { generateLevel } from '../src/game/generator.js';

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

const buoysOf = (def) => (def.floes ?? []).filter((f) => f.type === 'buoy');
const levels = ALL_LEVELS.filter((d) => buoysOf(d).length);

console.log('Yüzen buz — ağırlığa cevap veren tek zemin\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) Bölümlerde var, ve bir tanesinde kaybolmuyor');
check(levels.length >= 3, `${levels.length} el yapımı bölümde yüzen buz var`);
const generated = Array.from({ length: 40 }, (_, i) => generateLevel(120 + i * 3))
  .filter((d) => buoysOf(d).length).length;
check(generated > 0, `kırk üretilmiş bölümün ${generated} tanesinde de var`);

/* 2 --------------------------------------------------------------------- */
console.log('\n2) Ağırlık altında batıyor, boşken geri çıkıyor');
{
  const def = levels[0];
  const w = new World(def, deps());
  const pan = w.floes.find((f) => f.type === 'buoy');
  const base = pan.baseY;

  // One second of carrying a penguin.
  for (let i = 0; i < 120; i++) pan.update(STEP, 0, {}, true);
  const sank = pan.y - base;
  check(
    Math.abs(sank - BUOY.sink) < 2,
    `bir saniye taşıdı, ${Math.round(sank)}px battı (beklenen ${BUOY.sink})`,
  );
  check(pan.load > 0 && pan.load < 1, `yük ${pan.load.toFixed(2)} — ne boş ne tamamen batmış`);

  // And one second free.
  for (let i = 0; i < 120; i++) pan.update(STEP, 0, {}, false);
  const back = sank - (pan.y - base);
  check(
    Math.abs(back - BUOY.rise) < 2,
    `bir saniye boş kaldı, ${Math.round(back)}px çıktı (beklenen ${BUOY.rise})`,
  );
  /*
   * The asymmetry is the design, not a rounding error: if the rise matched the
   * sink, hopping on and off would cost nothing and a run of pans would be a
   * flat corridor with an animation on it.
   */
  check(BUOY.rise < BUOY.sink, `çıkış batıştan yavaş — ${BUOY.rise} < ${BUOY.sink}`);

  // It stops; a floating thing has a draft rather than a hole under it.
  for (let i = 0; i < 1200; i++) pan.update(STEP, 0, {}, true);
  check(
    Math.abs(pan.y - (base + pan.draft)) < 1 && pan.load === 1,
    `sonunda duruyor: ${Math.round(pan.y - base)}px, draft ${pan.draft}`,
  );
}

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Vaktinde kalkan için sıradan bir sıçrayış');
/*
 * The composer's promise, checked from the outside: the jump off a pan that
 * has already settled by `BUOY.safe` has to be inside what a jump can do.
 * This is the one rule that makes the piece fair rather than merely cruel,
 * and it is the rule `validate-levels` now measures every level against — so
 * what is asked here is the arithmetic behind it, once, in plain sight.
 */
for (const def of levels) {
  const scale = def.scale ?? scaleForLevel(def.id);
  const reach = reachFor(scale, BUOY.safe);
  const full = reachFor(scale);
  const bad = [];
  const floes = [...def.floes].sort((a, b) => a.x - b.x);
  for (let i = 0; i < floes.length - 1; i++) {
    if (floes[i].type !== 'buoy') continue;
    const gap = floes[i + 1].x - (floes[i].x + floes[i].w);
    const rise = floes[i].y + BUOY.safe - floes[i + 1].y;
    if (gap > reach.distance * 0.86 || rise > full.height * 0.8) {
      bad.push(`L${def.id} ${Math.round(gap)}px/${Math.round(rise)}px`);
    }
  }
  check(bad.length === 0, `L${def.id}: ${bad.join(' ') || 'doksan piksel batmışken de geçiliyor'}`);
}
check(
  BUOY.safe < reachFor(1).height,
  `söz verilen batış (${BUOY.safe}px) bir zıplamanın altında (${Math.round(reachFor(1).height)}px)`,
);

/* 4 --------------------------------------------------------------------- */
console.log('\n4) Durup bekleyen denize giriyor');
/*
 * The teeth. A pan that settles and then holds you at a safe depth is an
 * animation; the reason the clock means anything is that the far end of it is
 * the sea. Checked as the game checks it — the same drowning line the world
 * uses — rather than by trusting the two constants to stay in the right order.
 */
for (const def of levels) {
  const w = new World(def, deps());
  const scale = def.scale ?? scaleForLevel(def.id);
  const h = PENGUIN.h * scale;
  const pan = w.floes.find((f) => f.type === 'buoy');
  const deepest = pan.baseY + pan.draft;
  // Standing on it, the penguin's own y is a body above the ice.
  const drowns = deepest - h > w.waterY - h * 0.35;
  check(drowns, `L${def.id}: tamamen battığında su alıyor (${Math.round(deepest)} / ${w.waterY})`);
}

/* 5 --------------------------------------------------------------------- */
console.log('\n5) Ve gerçek dünyada: durursan ölürsün, kalkarsan ölmezsin');
{
  /*
   * On a course built here rather than on a shipped level.
   *
   * The first version used level twenty, and it failed two runs in three for
   * reasons that had nothing to do with floating ice: that level has a rotten
   * fish, a coil and three orcas on it, and a penguin walked across it in a
   * straight line meets whichever of them the frame count happens to put in
   * the way. The pieces carry `Math.random()` seeds, so "whichever" is not the
   * same twice. A mechanic test that can be failed by a fish is not a test of
   * the mechanic.
   */
  const course = new Course({ scale: 1 });
  course.shelf({ n: 2, gap: 0.3, w: 220 });
  course.buoys({ n: 3, gap: 0.32, w: 160 });
  course.landing({ w: 220 });
  /*
   * Numbered low on purpose, and that is the second thing this check learned.
   *
   * Even with the fish and the orcas gone it still failed one run in five, and
   * the two reasons are both the game being deliberately unrepeatable: past
   * level twelve the shelf may collapse behind you on a coin flip, and past
   * level eight a bird may come for the chick at a random moment. Both are
   * good; neither is floating ice. A level numbered six has neither, so what
   * is left in the run is the pan and the penguin.
   */
  const def = course.build({ id: 6, name: 'yüzen buz denemesi' });

  const run = (leave) => {
    const w = new World(def, deps());
    const pan = w.floes.find((f) => f.type === 'buoy');
    w.player.x = pan.x + 8;
    w.player.y = pan.y - w.player.h;
    w.player.vx = 0;
    w.player.vy = 0;
    let airborne = false;
    for (let i = 0; i < 120 * 10; i++) {
      const going = leave && i > 90;
      // At the lip of whatever is underfoot — there are three pans in a row
      // and the run has to leave each of them, not only the first.
      const on = w.player.groundFloe;
      const press = going && w.player.onGround && on
        && w.player.x + w.player.w > on.x + on.w - 46;
      if (press) airborne = true;
      if (w.player.onGround && !press) airborne = false;
      w.update(STEP, {
        axis: going ? 1 : 0,
        jumpHeld: airborne && w.player.vy < 0,
        jumpPressed: press,
      });
      if (w.status !== 'playing') break;
    }
    return w.status;
  };
  const stayed = run(false);
  const left = run(true);
  check(stayed !== 'playing', `durup bekleyen: ${stayed}`);
  check(left === 'playing' || left === 'won', `vaktinde kalkıp atlayan: ${left}`);
}

/* 6 --------------------------------------------------------------------- */
console.log('\n6) Basmadan önce hangi buz olduğu görülüyor');
/*
 * Not a drawing test — nothing here can see a canvas. What it checks is the
 * thing the drawing needs in order to be honest: that a pan carries its own
 * state as a number anybody can read, and that the state starts at zero. A
 * piece of ice that was already half under when the level loaded would be a
 * trap rather than a clock.
 */
for (const def of levels) {
  const w = new World(def, deps());
  const pans = w.floes.filter((f) => f.type === 'buoy');
  check(
    pans.every((f) => f.load === 0 && f.y === f.baseY && f.draft > 0),
    `L${def.id}: ${pans.length} buz, hepsi su hattında başlıyor`,
  );
}

/* 7 --------------------------------------------------------------------- */
console.log('\n7) Ve dağda aynı kural, dağın parasıyla');
/*
 * The mountain's sibling. Same physics, two differences that are both about
 * what the chapter does when it goes wrong.
 *
 * The sea's version is allowed a draft far past what the composer promises,
 * because the end of that is drowning: clean, instant, and the level starts
 * again. A mountain does not drown anybody — a climber who rested too long on
 * a ledge that kept going would be *stranded*, and a mechanic whose worst case
 * is "jump off and die to continue" is a bug with a story. So up there the
 * ledge stops exactly where the promise ends, and every step in a run is sized
 * for it fully given.
 */
{
  const climbs = ALL_LEVELS.filter((d) => (d.floes ?? []).some((f) => f.type === 'sag'));
  check(climbs.length >= 2, `${climbs.length} tırmanışta çöken taş var`);
  check(
    SAG.rise < SAG.sink && SAG.sink < BUOY.sink,
    `dağ denizden daha isteksiz veriyor: ${SAG.sink} < ${BUOY.sink} px/sn`,
  );
  for (const def of climbs) {
    const w = new World(def, deps());
    const hold = w.floes.find((f) => f.type === 'sag');
    for (let i = 0; i < 1200; i++) hold.update(STEP, 0, {}, true);
    check(
      Math.abs(hold.y - (hold.baseY + SAG.drop)) < 1,
      `L${def.id}: sonuna kadar ${Math.round(hold.y - hold.baseY)}px çöküyor, sözün tamamı`,
    );
    /*
     * The promise itself, from outside the composer: the step out of a fully
     * given ledge is still inside a jump. Measured against the ledge above it
     * in the route, which is the one the climber is actually reaching for.
     */
    const route = def.route ?? [];
    const at = route.findIndex((r) => r.type === 'sag');
    const next = route[at + 1];
    if (next) {
      const rise = hold.baseY + SAG.drop - next.y;
      check(
        rise <= reachFor(def.scale ?? scaleForLevel(def.id)).height,
        `L${def.id}: tamamen çökmüşken sonraki tutamak ${Math.round(rise)}px yukarıda`,
      );
    }
  }
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Zemin ağırlığa cevap veriyor, ve cevabı adil.');
