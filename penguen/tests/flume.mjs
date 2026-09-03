/**
 * The flume — the sea's fifth verb, and its first pure control test.
 *
 * Written to the standard the current taught this project the hard way. A pack
 * that asks whether a mechanic is *possible* proves nothing, because an inert
 * hazard passes that trivially: the levels still compose, a solver still
 * finishes them, and the only symptom is a chapter that feels flat. So every
 * check here asks whether it bites.
 *
 * Two of them are the ones that would have caught the current — the physics
 * moves the swimmer, and the composer pays for it. The third is the rule that
 * keeps a flume fair: it must never close a direction. The sea charges; it does
 * not forbid.
 */

import { Player } from '../src/game/player.js';
import { World } from '../src/game/world.js';
import { DIVE_LEVELS } from '../src/game/dive.js';
import { FLUME, SWIM, PENGUIN, flumeAt, swimCost } from '../src/game/config.js';

const STEP = 1 / 120;
const deps = () => ({
  particles: { puff() {}, splash() {}, sparkle() {}, burstIce() {} },
  audio: new Proxy({}, { get: () => () => {} }),
  assist: false,
  upgrades: {},
  skin: 'normal',
});

let fails = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  console.log(`  ✗ ${m}`);
  fails++;
};
const check = (c, m) => (c ? ok(m) : bad(m));

/**
 * Settled vertical speed in water moving at `flume` px/s.
 *
 * The body's own swimming plus the water it is sitting in. Reading `vy` alone
 * would report how hard the penguin is trying, which is a different question
 * from how fast it is going.
 */
function settle(flume, dive) {
  const p = new Player(0, 400, 1);
  p.submerged = true;
  p.breath = 999;
  for (let i = 0; i < 600; i++) {
    p.update(STEP, { axis: 0, jumpHeld: dive, flume }, [], {}, {});
  }
  return p.vy + p.driftY;
}

console.log('Oluk ısırıyor mu?\n');

console.log('1) Su yüzücüyü dikey taşıyor');
{
  const up = FLUME.max * SWIM.riseMax;
  check(Math.abs(settle(0, false) + SWIM.riseMax) < 2, `durgun suda yükseliş ${SWIM.riseMax}px/sn`);
  check(Math.abs(settle(0, true) - SWIM.sinkMax) < 2, `durgun suda dalış ${SWIM.sinkMax}px/sn`);
  check(
    Math.abs(settle(-up, false) + SWIM.riseMax + up) < 4,
    `yukarı akan suda yükseliş ${(-settle(-up, false)).toFixed(0)}px/sn — su hızı ekleniyor`,
  );
  check(
    Math.abs(settle(up, true) - SWIM.sinkMax - up) < 4,
    `aşağı akan suda dalış ${settle(up, true).toFixed(0)}px/sn`,
  );
}

console.log('\n2) Ucuz yön pahalı, pahalı yön pahalı');
{
  const up = FLUME.max * SWIM.riseMax;
  const dive = settle(-up, true);
  const float = settle(up, false);
  check(dive > 0 && dive < SWIM.sinkMax * 0.5, `yukarı akıntıda dalış ${dive.toFixed(0)}px/sn — yarıdan az`);
  check(
    float < 0 && -float < SWIM.riseMax * 0.2,
    `aşağı akıntıda yükseliş ${(-float).toFixed(0)}px/sn — beşte birden az`,
  );
}

console.log('\n3) Ama hiçbir yön kapanmıyor');
{
  const up = FLUME.max * SWIM.riseMax;
  check(settle(-up, true) > 0, 'en güçlü yukarı akıntıda bile penguen batabiliyor');
  check(settle(up, false) < 0, 'en güçlü aşağı akıntıda bile penguen yükselebiliyor');
  check(FLUME.max < 1, `sınır ${FLUME.max} — birin altında, ki bu kuralın kendisi`);
  const wild = [{ kind: 'flume', x: 0, y: 0, w: 100, h: 100, rise: -9 }];
  check(flumeAt(wild, 50, 50) === -FLUME.max * SWIM.riseMax, 'deli bir sayı kırpılıyor');
  check(flumeAt(wild, 500, 50) === 0 && flumeAt(wild, 50, 500) === 0, 'oluğun dışında su durgun');
  check(flumeAt(null, 0, 0) === 0, 'bölgesiz dünyada oluk yok');
}

console.log('\n4) Besteci hattı tutmanın bedelini ödüyor');
{
  const a = { x: 0, y: 300 };
  const b = { x: 1000, y: 300 };
  const still = swimCost([], a, b);
  const wet = swimCost([{ kind: 'flume', x: -50, y: 0, w: 1200, h: 600, rise: -FLUME.max }], a, b);
  check(Math.abs(still - 1000) < 1, 'durgun su: 1000px yol 1000px hava');
  check(wet > still * 1.25, `oluk ${wet.toFixed(0)}px hava — ${(wet / still).toFixed(2)}x`);
}

console.log('\n5) Bölümlerde var, ve tuşu bırakma payını değiştiriyor');
{
  const withFlume = DIVE_LEVELS.filter((d) => (d.zones ?? []).some((z) => z.kind === 'flume'));
  check(withFlume.length >= 2, `${withFlume.length} bölümde oluk var`);

  for (const def of withFlume) {
    const node = def.route.find((r) => r.tag === 'flume');
    const bodyH = PENGUIN.h * def.scale;
    // Room to be wrong in, or it is not a control test, it is a coin toss.
    check(
      node.gap > bodyH * 2.4,
      `${def.id}. ${def.name}: oluk ${node.gap}px = ${(node.gap / bodyH).toFixed(1)} boy`,
    );
    // And the lane has to be inside its own channel. The first version of this
    // piece cut the channel around a lane at the surface, clamped it, and left
    // the route line above its own roof.
    check(
      flumeAt(def.zones, node.x, node.y) !== 0,
      `${def.id}. ${def.name}: hat gerçekten suyun içinde`,
    );

    /**
     * The A/B a player would actually notice: how long you have off the button
     * before the channel catches you.
     *
     * Terminal speed is the right quantity for the physics and the wrong one
     * here — the channel is three and a bit body heights tall, so a swimmer
     * hits the wall long before settling and the reading is whatever the
     * collision left behind. Displacement over a short window is no better,
     * because buoyancy is fierce and a quarter of a second is nearly all
     * acceleration ramp: still water and the strongest flume differ by five
     * pixels there. So the same level is run twice, once with its water and
     * once with the zone taken out, and what is compared is the seconds of
     * grace. Upward water shortens it, downward water lengthens it, and the
     * direction of the change is the assertion.
     */
    const grace = (zones) => {
      const w = new World({ ...def, zones }, deps());
      w.player.submerged = true;
      w.player.breath = 999;
      w.player.x = node.x;
      w.player.y = node.y - bodyH * 0.5;
      const y0 = w.player.y;
      for (let i = 0; i < 240; i++) {
        w.update(STEP, { axis: 0, jumpHeld: false });
        if (Math.abs(w.player.y - y0) > node.gap / 2 - bodyH) return i / 120;
      }
      return 2;
    };
    const wet = grace(def.zones);
    const dry = grace(def.zones.filter((z) => z.kind !== 'flume'));
    const rise = def.zones.find((z) => z.kind === 'flume').rise;
    check(
      rise < 0 ? wet < dry * 0.85 : wet > dry * 1.15,
      `${def.id}. ${def.name}: tuşu bırakma payı ${dry.toFixed(2)}sn → ${wet.toFixed(2)}sn`,
    );
  }
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Oluk denizin ilk saf kontrol sınavı — ve hiçbir yönü kapatmıyor.');
