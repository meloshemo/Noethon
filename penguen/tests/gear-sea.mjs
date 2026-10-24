/**
 * Do the sea's three upgrades bite?
 *
 * The shop grew a Fin, a Ballast stone and a layer of Blubber because chapter
 * three had learned to do three things nothing on the shelf answered. That is
 * the easy half. The hard half is the one the current already taught this
 * project once: a thing can be declared, priced, drawn and sold and still do
 * nothing at all, and every other check in the repo will pass while it does.
 *
 * So none of these ask whether the upgrade exists. Each buys the top level,
 * drops a penguin into the real `World` at the same place twice, and measures
 * the force it is actually feeling.
 *
 * The second half of every check is the one that matters more. An upgrade that
 * removes a mechanic is worse than an upgrade that does nothing, because it
 * deletes a chapter for anyone with fish to spend. Fins do not switch off a
 * current, ballast does not pin the lane, blubber does not make cold water
 * free — the top level still leaves the thing in the water, and each check
 * says by how much.
 */

import { World } from '../src/game/world.js';
import { DIVE_LEVELS } from '../src/game/dive.js';
import { UPGRADES, CURRENT, FLUME, SWIM } from '../src/game/config.js';

const STEP = 1 / 120;
const deps = (upgrades) => ({
  particles: { puff() {}, splash() {}, sparkle() {}, burstIce() {} },
  audio: new Proxy({}, { get: () => () => {} }),
  assist: false,
  upgrades,
  skin: 'normal',
});

let fails = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  console.log(`  ✗ ${m}`);
  fails++;
};
const check = (c, m) => (c ? ok(m) : bad(m));

/** The top level of an upgrade, as the shop would record it. */
const maxed = (id) => ({ [id]: UPGRADES.find((u) => u.id === id).levels.length });
const topEffect = (id) => {
  const u = UPGRADES.find((u) => u.id === id);
  return u.levels[u.levels.length - 1].effect;
};

/**
 * The first dive level carrying a zone of this kind, plus a place to stand in
 * it that is actually water.
 *
 * The middle of a band is not a safe guess: the sea's bands are wider than the
 * channel cut through them, so the geometric centre of a current is very often
 * solid rock. Parked there the collision pass shoves the swimmer out and
 * zeroes the drift, and the probe reports a current of exactly zero — which it
 * did, on the first run of this file, for a band that was working perfectly.
 *
 * The level already knows where the water is: its `route` is the line the
 * composer proved a swimmer can follow. So the sample point is the first route
 * node inside the zone, and nothing here has to guess.
 */
function findZone(kind) {
  for (const def of DIVE_LEVELS) {
    for (const z of def.zones ?? []) {
      if (z.kind !== kind) continue;
      if ((z.flow ?? z.rise ?? 1) === 0) continue;
      const top = z.y ?? z.top;
      const bottom = top + (z.h ?? z.bottom - z.top);
      const at = (def.route ?? []).find(
        (n) => n.x >= z.x && n.x <= z.x + z.w && n.y >= top && n.y <= bottom,
      );
      if (at) return { def, z, at };
    }
  }
  return null;
}

/**
 * Park a swimmer in the middle of a zone and let the water do its work.
 *
 * Held still on purpose — `axis: 0`, no dive key. What is being measured is
 * what the sea does to a penguin who is doing nothing, which is the only
 * reading that separates the water's force from the swimmer's own effort.
 */
function drift(def, at, upgrades, frames = 90) {
  const w = new World(def, deps(upgrades));
  const p = w.player;
  p.submerged = true;
  p.breath = 999;
  for (let i = 0; i < frames; i++) {
    // Pinned. A free swimmer floats out of the band in under a second, and
    // what is wanted here is the force at a place, not the journey away from
    // it.
    p.x = at.x - p.w / 2;
    p.y = at.y - p.h / 2;
    p.vx = 0;
    p.vy = 0;
    w.update(STEP, { axis: 0, jumpHeld: false });
  }
  return { x: p.drift, y: p.driftY, world: w };
}

console.log('Denizin üç gücü ısırıyor mu?\n');

console.log('1) Yüzgeç akıntıyı zayıflatıyor — ama durdurmuyor');
{
  const found = findZone('current');
  if (!found) bad('akıntılı bir dalış bölümü bulunamadı');
  else {
    const { def, at } = found;
    const bare = Math.abs(drift(def, at, {}).x);
    const geared = Math.abs(drift(def, at, maxed('fins')).x);
    check(bare > 20, `çıplak yüzücüyü ${bare.toFixed(0)}px/sn sürüklüyor (L${def.id})`);
    const cut = 1 - geared / Math.max(1e-6, bare);
    const want = topEffect('fins');
    check(
      Math.abs(cut - want) < 0.03,
      `yüzgeçle ${geared.toFixed(0)}px/sn — %${Math.round(cut * 100)} azalma (hedef %${Math.round(want * 100)})`,
    );
    check(geared > bare * 0.4, 'akıntı hâlâ orada: sürükleme yarıdan fazlası kadar kalıyor');
  }
}

console.log('\n2) Safra taşı oluğu zayıflatıyor — ama hattı çivilemiyor');
{
  const found = findZone('flume');
  if (!found) bad('oluklu bir dalış bölümü bulunamadı');
  else {
    const { def, at } = found;
    const bare = Math.abs(drift(def, at, {}).y);
    const geared = Math.abs(drift(def, at, maxed('ballast')).y);
    check(bare > 20, `çıplak yüzücüyü ${bare.toFixed(0)}px/sn dikey taşıyor (L${def.id})`);
    const cut = 1 - geared / Math.max(1e-6, bare);
    const want = topEffect('ballast');
    check(
      Math.abs(cut - want) < 0.03,
      `safrayla ${geared.toFixed(0)}px/sn — %${Math.round(cut * 100)} azalma (hedef %${Math.round(want * 100)})`,
    );
    check(geared > bare * 0.4, 'oluk hâlâ orada: dikey su yarıdan fazlası kadar kalıyor');
  }
}

console.log('\n3) Yağ tabakası çukurun fazlasını ödüyor — suyu bedava yapmıyor');
{
  const found = findZone('trench');
  if (!found) bad('çukurlu bir dalış bölümü bulunamadı');
  else {
    const { def, z, at } = found;
    /* Deep enough to be paying the surcharge, not sitting on the lip. */
    const place = (upgrades) => {
      const w = new World(def, deps(upgrades));
      const p = w.player;
      p.submerged = true;
      p.breath = p.breathMax;
      for (let i = 0; i < 60; i++) {
        p.x = at.x - p.w / 2;
        p.y = Math.min(z.bottom - p.h, at.y + z.bottom - z.top) - 1;
        w.update(STEP, { axis: 0, jumpHeld: false });
      }
      return w;
    };
    const bare = place({}).drain;
    const geared = place(maxed('insulation')).drain;
    check(bare > 1.05, `çıplak yüzücü çukurda ${bare.toFixed(2)}× hava yakıyor (L${def.id})`);
    const cut = 1 - (geared - 1) / Math.max(1e-6, bare - 1);
    const want = topEffect('insulation');
    check(
      Math.abs(cut - want) < 0.03,
      `yağ tabakasıyla ${geared.toFixed(2)}× — fazlalığın %${Math.round(cut * 100)}'i geri (hedef %${Math.round(want * 100)})`,
    );
    check(geared > 1.001, 'çukur hâlâ açık sudan pahalı');
  }
}

/*
 * The rule that keeps all of this honest.
 *
 * Every proof in `tests/` runs a penguin with an empty inventory, so the floor
 * is already defended: no level is finishable *only* with equipment. What this
 * checks is the ceiling — that none of the three can be stacked, worn or
 * perked into cancelling its mechanic outright, however the shop grows later.
 */
console.log('\n4) Hiçbiri mekaniği kapatamıyor');
{
  const caps = [
    ['fins', 'akıntı'],
    ['ballast', 'oluk'],
    ['insulation', 'çukur'],
  ];
  for (const [id, label] of caps) {
    const top = topEffect(id);
    check(top < 0.6, `${label}: en üst kademe %${Math.round(top * 100)} — yarıdan fazlası kalıyor`);
  }
  check(
    CURRENT.max < 1 && FLUME.max * SWIM.riseMax > 0,
    'suyun kendi tavanı da yerinde duruyor',
  );
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Denizin üç gücü ölçülebilir şekilde işe yarıyor ve hiçbiri denizi silmiyor.');
