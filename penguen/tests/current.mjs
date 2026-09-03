/**
 * Akıntı — proof that the water moves.
 *
 * This pack exists because of what it found. The sea has had a current since
 * the chapter was written, five levels are built on one and two are named
 * after it, and it did nothing at all: the swim branch fed it into `vx`, which
 * is re-clamped to the cruise speed at the top of every frame before the push
 * was added, so a current never kept more than one frame's worth. Measured,
 * the strongest water in the game moved the penguin two pixels a second out of
 * four hundred and eighty.
 *
 * Nothing caught it, and it is worth being precise about why, because the gap
 * is the lesson. `validate-dive` proved the corridor was shaped correctly and
 * the corridor was. `dive-run` proved a swimmer could finish and a swimmer
 * could — more easily than intended, which is not a failure a solver can see.
 * The renderer never drew it and no pack ever asked it to. Every check the
 * chapter had was a check that something was *possible*, and an inert hazard
 * passes all of those trivially.
 *
 * So this one asks the opposite question: does the mechanic *bite*. Four ways.
 *   1. The physics carries a swimmer who is not swimming.
 *   2. Upstream really costs what the number says it costs.
 *   3. `swimCost` — the one function the composer, the validator and the world
 *      all price a leg with — charges for it, so a corridor laid across moving
 *      water is paid for in air.
 *   4. It is bounded, and it stops at the water's edge.
 */

import { Player } from '../src/game/player.js';
import { World } from '../src/game/world.js';
import { DIVE_LEVELS } from '../src/game/dive.js';
import { CURRENT, flowAt, swimCost, swimSpeed } from '../src/game/config.js';

const STEP = 1 / 120;
let fails = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => {
  console.log(`  ✗ ${msg}`);
  fails++;
};
const check = (cond, msg) => (cond ? ok(msg) : bad(msg));

/** Swim for `secs` in water flowing at `flow`, steering `axis`. Returns px/s. */
function drift(flow, axis, secs = 4) {
  const p = new Player(0, 100, 1);
  p.submerged = true;
  p.breath = 999;
  const speed = flow * p.swimSpeed;
  for (let i = 0; i < Math.round(secs / STEP); i++) {
    p.update(STEP, { axis, jumpHeld: false, flow: speed }, [], {}, {});
  }
  return p.x / secs;
}

console.log('Akıntı gerçekten var mı?\n');

/* ------------------------------------------------------- 1. it carries */

console.log('1) Duran yüzücüyü su taşıyor');
{
  const still = drift(0, 0);
  const swept = drift(-0.42, 0);
  const cruise = new Player(0, 0, 1).swimSpeed;
  check(Math.abs(still) < 8, `durgun suda kimse gitmiyor — ${still.toFixed(0)}px/sn`);
  // The bug this pack was written for produced 2px/s here. Anything under a
  // third of the specified speed means the channel is being eaten again.
  const want = 0.42 * cruise;
  check(
    swept < -want * 0.9,
    `0.42 akıntı ${(-swept).toFixed(0)}px/sn sürüklüyor — beklenen ${want.toFixed(0)}px/sn`,
  );
}

/* ------------------------------------------- 2. upstream costs the number */

console.log('\n2) Akıntıya karşı yüzmek sayının söylediği kadar yavaş');
for (const flow of [0.3, 0.42, 0.52]) {
  const cruise = new Player(0, 0, 1).swimSpeed;
  // Water going left, swimmer going right: upstream is the two of them
  // disagreeing, which is the only case the levels are built on.
  const up = drift(-flow, 1);
  const want = cruise * (1 - flow);
  const err = Math.abs(up - want) / want;
  check(
    err < 0.06,
    `${flow} akıntıya karşı ${up.toFixed(0)}px/sn (cruise×${(1 - flow).toFixed(2)} = ${want.toFixed(0)})`,
  );
  // And with it, which is the reward half of the same rule.
  const down = drift(flow, 1);
  check(
    down > cruise * (1 + flow) * 0.94,
    `${flow} akıntıyla birlikte ${down.toFixed(0)}px/sn — cruise'un üstünde`,
  );
}

/* --------------------------------------------------- 3. the air is charged */

console.log('\n3) Besteci, doğrulayıcı ve dünya aynı bedeli ödüyor');
{
  const a = { x: 0, y: 100 };
  const b = { x: 1000, y: 100 };
  const still = swimCost([], a, b);
  const band = (flow) => [{ kind: 'current', x: -50, y: 0, w: 1200, h: 400, flow }];
  const up = swimCost(band(-0.42), a, b);
  const down = swimCost(band(0.42), a, b);
  check(Math.abs(still - 1000) < 1, `durgun su: 1000px yol 1000px hava — ${still.toFixed(0)}`);
  check(
    Math.abs(up - 1000 / 0.58) < 12,
    `karşıdan: ${up.toFixed(0)}px hava (1000/0.58 = ${(1000 / 0.58).toFixed(0)})`,
  );
  check(
    Math.abs(down - 1000 / 1.42) < 12,
    `arkadan: ${down.toFixed(0)}px hava (1000/1.42 = ${(1000 / 1.42).toFixed(0)})`,
  );
  check(up > still * 1.4, 'akıntıya karşı bir ciğer belirgin biçimde daha az yol gidiyor');
}

/* ------------------------------------------------------ 4. bounds and edges */

console.log('\n4) Sınırlar');
{
  const wild = [{ kind: 'current', x: 0, y: 0, w: 100, h: 100, flow: -9 }];
  check(flowAt(wild, 50, 50) === -CURRENT.max, `deli bir sayı ${CURRENT.max}'e kırpılıyor`);
  check(flowAt(wild, 500, 50) === 0, 'bandın sağında su durgun');
  check(flowAt(wild, 50, 500) === 0, 'bandın altında su durgun');
  check(flowAt(null, 0, 0) === 0, 'bölgesiz dünyada akıntı yok');
  // Out of the water the channel is cleared, so a current cannot follow the
  // penguin onto the ice. The land branch owns `drift` for the wind.
  const p = new Player(0, 100, 1);
  p.submerged = true;
  for (let i = 0; i < 200; i++) p.update(STEP, { axis: 0, flow: -300 }, [], {}, {});
  const carried = p.drift;
  p.submerged = false;
  for (let i = 0; i < 200; i++) p.update(STEP, { axis: 0 }, [], {}, {});
  check(carried < -50 && Math.abs(p.drift) < Math.abs(carried) * 0.2,
    `sudan çıkınca akıntı bırakıyor — ${carried.toFixed(0)} → ${p.drift.toFixed(0)}`);
}

/* -------------------------------------------- 5. the levels actually have it */

console.log('\n5) Bölümlerde akıntı var ve penguen onu hissediyor');
{
  const withFlow = DIVE_LEVELS.filter((d) => (d.zones ?? []).some((z) => z.kind === 'current'));
  check(withFlow.length >= 5, `${withFlow.length} bölümde akıntı bandı var`);

  let widest = 0;
  let strongest = 0;
  for (const def of withFlow) {
    for (const z of def.zones) {
      if (z.kind !== 'current') continue;
      widest = Math.max(widest, z.w);
      strongest = Math.max(strongest, Math.abs(z.flow));
      if (Math.abs(z.flow) > CURRENT.max) bad(`${def.id}: ${z.flow} sınırın üstünde`);
      if (z.w < 200) bad(`${def.id}: ${z.w}px bant, itiş bile sayılmaz`);
    }
  }
  check(widest > 1200, `en uzun bant ${widest}px — geçilen bir yer, itiş değil`);
  check(strongest >= 0.4, `en güçlü akıntı ${strongest} — cruise'un ${(strongest * 100).toFixed(0)}%'i`);

  // And the running game agrees: drop the real World's penguin into a real
  // band, let go of everything, and it must be carried.
  const def = withFlow[0];
  const zone = def.zones.find((z) => z.kind === 'current');
  const world = new World(def, {
    particles: { puff() {}, splash() {}, sparkle() {}, burstIce() {} },
    audio: new Proxy({}, { get: () => () => {} }),
    assist: false,
    upgrades: {},
    skin: 'normal',
  });
  world.player.submerged = true;
  world.player.breath = 999;
  world.player.x = zone.x + zone.w / 2;
  world.player.y = zone.y + zone.h / 2;
  const x0 = world.player.x;
  for (let i = 0; i < 120; i++) world.update(STEP, { axis: 0, jumpHeld: false });
  const moved = world.player.x - x0;
  const want = Math.sign(zone.flow) * swimSpeed(def.scale) * Math.abs(zone.flow);
  check(
    Math.abs(moved) > 20 && Math.sign(moved) === Math.sign(zone.flow),
    `${def.id}. ${def.name}: eller boşta 1 sn'de ${moved.toFixed(0)}px sürüklendi ` +
      `(${want.toFixed(0)}px/sn suda)`,
  );
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Su artık gerçekten akıyor — ve havadan ödeniyor.');
