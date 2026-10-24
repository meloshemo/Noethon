/**
 * Girdap — does the ring bite, and does it leave a way out?
 *
 * Written to the standard the current taught this project the hard way: a
 * hazard can be declared, composed into levels, drawn, and still do nothing,
 * and every other check in the repo will pass while it does. So none of these
 * ask whether an eddy exists. They ask whether the water turns, whether a
 * swimmer in it goes somewhere they did not choose, whether the composer pays
 * for that, and whether the still eye that makes it fair is really there.
 *
 * The last section is the one this piece needed most. An eddy is the first
 * water in the chapter whose route line and whose *swim* are different things:
 * a route runs through the eye, where nothing is happening, so the validator
 * can price a cell at almost nothing while a real swimmer is thrown around the
 * ring for four hundred pixels. That is the current's failure in mirror image
 * — the two proof layers disagreeing — and it cost a level before it was
 * caught, so it is nailed down here.
 */

import { Player } from '../src/game/player.js';
import { World } from '../src/game/world.js';
import { DIVE_LEVELS } from '../src/game/dive.js';
import { EDDY, SWIM, CURRENT, flowAt, flumeAt, spinLoad, swimCost, swimSpeed } from '../src/game/config.js';

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

/** A cell on its own, for the arithmetic. */
const cell = (spin) => ({ kind: 'eddy', x: 0, y: 0, w: 400, h: 400, spin });

console.log('Girdap ısırıyor mu?\n');

console.log('1) Su gerçekten dönüyor');
{
  const z = cell(0.5);
  const at = (x, y) => ({ flow: flowAt([z], x, y), flume: flumeAt([z], x, y) });
  const top = at(200, 100);
  const right = at(300, 200);
  const bottom = at(200, 300);
  const left = at(100, 200);
  // Clockwise for a positive spin: right along the top, down the right side.
  check(top.flow > 0.4 && Math.abs(top.flume) < 1, `tepede sağa ${top.flow.toFixed(2)}`);
  check(right.flume > 100 && Math.abs(right.flow) < 0.01, `sağda aşağı ${right.flume.toFixed(0)}px/sn`);
  check(bottom.flow < -0.4, `dipte sola ${bottom.flow.toFixed(2)}`);
  check(left.flume < -100, `solda yukarı ${left.flume.toFixed(0)}px/sn`);
  const anti = cell(-0.5);
  check(flowAt([anti], 200, 100) < -0.4, 'işaret dönüş yönünü çeviriyor');
}

console.log('\n2) Göz sakin, kenar sakin, arası değil');
{
  const z = cell(0.6);
  const eye = Math.abs(flowAt([z], 200, 200)) + Math.abs(flumeAt([z], 200, 200)) / SWIM.riseMax;
  const ring = Math.abs(flowAt([z], 200, 200 - 200 * EDDY.peak));
  const rim = Math.abs(flowAt([z], 200, 4));
  check(eye < 0.02, `gözde su duruyor (${eye.toFixed(3)})`);
  check(ring > 0.5, `halkada ${ring.toFixed(2)} — en güçlü yer`);
  check(rim < ring * 0.35, `kenarda ${rim.toFixed(2)} — dışarısı var`);
  check(Math.abs(flowAt([z], 640, 200)) === 0, 'hücrenin dışında hiçbir şey yok');
}

console.log('\n3) Gerçek dünyada yüzücüyü taşıyor');
{
  const def = DIVE_LEVELS.find((d) => (d.zones ?? []).some((z) => z.kind === 'eddy'));
  if (!def) bad('girdaplı bir dalış bölümü bulunamadı');
  else {
    const z = def.zones.find((zz) => zz.kind === 'eddy');
    const w = new World(def, deps());
    const p = w.player;
    p.submerged = true;
    p.breath = 999;
    // Parked on the ring, where the water is fastest, and held there: what is
    // wanted is the force at a place, not the journey away from it.
    const x = z.x + z.w / 2;
    const y = z.y + z.h / 2 - (z.h / 2) * EDDY.peak;
    for (let i = 0; i < 90; i++) {
      p.x = x - p.w / 2;
      p.y = y - p.h / 2;
      p.vx = 0;
      p.vy = 0;
      w.update(STEP, { axis: 0, jumpHeld: false });
    }
    const carried = Math.abs(p.drift) + Math.abs(p.driftY);
    check(carried > 60, `L${def.id}: halkada eller boşta ${carried.toFixed(0)}px/sn taşınıyor`);

    // And the eye, on the same level, in the same world.
    const w2 = new World(def, deps());
    const q = w2.player;
    q.submerged = true;
    q.breath = 999;
    for (let i = 0; i < 90; i++) {
      q.x = z.x + z.w / 2 - q.w / 2;
      q.y = z.y + z.h / 2 - q.h / 2;
      q.vx = 0;
      q.vy = 0;
      w2.update(STEP, { axis: 0, jumpHeld: false });
    }
    const still = Math.abs(q.drift) + Math.abs(q.driftY);
    check(still < carried * 0.15, `gözde ${still.toFixed(0)}px/sn — durulacak bir yer var`);
  }
}

console.log('\n4) Besteci halkanın parasını ödüyor');
{
  const z = cell(0.6);
  const a = { x: 0, y: 200 };
  const b = { x: 400, y: 200 };
  const across = swimCost([z], a, b);
  const still = swimCost([], a, b);
  check(across > still * 1.15, `hücreyi geçmek ${(across / still).toFixed(2)}× fiyatlanıyor`);
  check(spinLoad([z], 200, 100) > 0.7, 'halkanın yükü besteciye görünüyor');
  check(spinLoad([z], 200, 200) < 0.05, 'gözün yükü yok');
  /*
   * The one that would have caught the level that got away.
   *
   * A route line runs through the eye, so an eddy priced *only* along the line
   * is nearly free — which is exactly what happened: a finale validated and
   * then drowned the solver four hundred pixels short, every attempt. The
   * charge has to be big enough that a cell shows up in the budget even when
   * the line through it is calm.
   */
  const eye = swimCost([z], { x: 0, y: 200 }, { x: 400, y: 200 });
  check(eye > still * 1.15, `gözden geçen hat bile ${(eye / still).toFixed(2)}× ödüyor`);
}

console.log('\n5) Hiçbir yönü kapatmıyor');
{
  const top = EDDY.max;
  check(top < 1, `en güçlü halka cruise'un %${Math.round(top * 100)}'i — karşı yüzülebilir`);
  check(
    top * SWIM.riseMax < SWIM.sinkMax,
    `en güçlü dikey bileşen ${(top * SWIM.riseMax).toFixed(0)}px/sn < dalış ${SWIM.sinkMax}px/sn`,
  );
  // Every shipped cell, at its own strength, with a real swimmer's numbers.
  const cruise = swimSpeed(1);
  for (const def of DIVE_LEVELS) {
    for (const z of def.zones ?? []) {
      if (z.kind !== 'eddy') continue;
      const spin = Math.abs(z.spin ?? 0);
      if (spin * cruise >= cruise) bad(`L${def.id}: girdap yatayda yüzücüyü yeniyor`);
      if (spin * SWIM.riseMax >= SWIM.riseMax) bad(`L${def.id}: girdap dikeyde yüzücüyü yeniyor`);
      if (z.w !== z.h) bad(`L${def.id}: girdap dairesel değil (${z.w}×${z.h})`);
    }
  }
  const cells = DIVE_LEVELS.flatMap((d) => (d.zones ?? []).filter((z) => z.kind === 'eddy'));
  check(cells.length > 0, `${cells.length} girdap yayında, hepsi yüzülebilir`);
  check(
    CURRENT.max < 1 && EDDY.charge > 0 && EDDY.peak > 0 && EDDY.peak < 1,
    'ayarlar kendi sınırlarının içinde',
  );
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Girdap dönüyor, ısırıyor, fiyatlanıyor — ve ortasında durulacak bir yer var.');
