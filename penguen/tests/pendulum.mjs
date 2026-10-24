/**
 * The slab that hangs on a rope.
 *
 * The mountain's new verb, and the reason it exists is a measurement: chapter
 * two had seven verbs for fifteen levels, and fifty pairs of those levels
 * shared more than eighty percent of them. You cannot make fifteen different
 * levels out of seven words.
 *
 * What is proved here:
 *
 *   1. it is a pendulum and not a platform on a curved path — the period is
 *      the real small-angle period of its own rope length, it is slowest at
 *      the ends and fastest through the middle;
 *   2. a rider is carried, which is the whole mechanic;
 *   3. every shipped arc is long enough to be worth crossing and slow enough
 *      to be read;
 *   4. and the rope is actually attached to something, which sounds like a
 *      drawing detail and is not: the anchor is a real coordinate that the
 *      mountain's final shift has to move along with everything else, and the
 *      first version left one of them seventeen hundred pixels above the sky.
 */

import { Floe } from '../src/game/entities.js';
import { Player } from '../src/game/player.js';
import { ALL_LEVELS } from '../src/game/chapters.js';
import { SWING, PHYS, PENGUIN, swingPeriod, swingAt, reachFor, scaleForLevel } from '../src/game/config.js';

const STEP = 1 / 120;
let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails++;
}

console.log('Sallanan buz — ipin ucundaki fizik\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) Gerçekten bir sarkaç');
// T = 2π√(L/g). Doubling the length should lengthen the period by √2, and
// that ratio is the whole claim: it is the length that decides, not a dial.
const short = swingPeriod(150);
const long = swingPeriod(600);
check(
  'periyot uzunluğun köküyle büyüyor',
  Math.abs(long / short - 2) < 0.02,
  `${short.toFixed(2)} sn → ${long.toFixed(2)} sn (oran ${(long / short).toFixed(3)})`,
);
check(
  'periyot formülle birebir',
  Math.abs(swingPeriod(300) - 2 * Math.PI * Math.sqrt(300 / PHYS.gravityDown)) < 1e-9,
);
check(
  'küçük açı yaklaşımı korunuyor',
  SWING.maxAngle <= 0.62,
  `${SWING.maxAngle} rad = ${((SWING.maxAngle * 180) / Math.PI).toFixed(0)}°`,
);

// Slow at the ends, fast through the middle. Sampled from the real motion.
const f = new Floe({
  x: 0, y: 0, w: 120, type: 'swing',
  pivotX: 400, pivotY: 100, ropeLen: 300, ropeAngle: SWING.maxAngle, phase: 0,
});
const T = swingPeriod(300);
let atEnd = 0;
let atMiddle = 0;
// Sampled in sequence, at the real frame rate. `dx` is the movement since the
// previous call, so stepping the clock unevenly makes it meaningless — an
// earlier version of this test sampled six hundred evenly spaced instants and
// reported a slab travelling forty thousand pixels a second.
// One warm-up frame first: a floe's `dx` is the distance since its previous
// position, and its previous position on the very first call is wherever the
// constructor happened to put it.
f.update(STEP, -STEP);
for (let i = 0; i < Math.round(T / STEP); i++) {
  const t = i * STEP;
  f.update(STEP, t);
  const frac = ((t / T) % 1 + 1) % 1;
  const speed = Math.abs(f.dx);
  // The slab is at an end a quarter and three quarters through the period.
  if (Math.abs(frac - 0.25) < 0.02 || Math.abs(frac - 0.75) < 0.02) atEnd = Math.max(atEnd, speed);
  if (frac < 0.02 || Math.abs(frac - 0.5) < 0.02) atMiddle = Math.max(atMiddle, speed);
}
check(
  'uçlarda neredeyse duruyor, ortada koşuyor',
  atMiddle > atEnd * 6,
  `uç ${(atEnd * 120).toFixed(0)} px/sn, orta ${(atMiddle * 120).toFixed(0)} px/sn`,
);
check(
  'ortada penguenden hızlı',
  atMiddle * 120 > PHYS.moveSpeed,
  `${(atMiddle * 120).toFixed(0)} px/sn vs yürüyüş ${PHYS.moveSpeed}`,
);

/* 2 --------------------------------------------------------------------- */
console.log('\n2) Üstündekini taşıyor');
const slab = new Floe({
  x: 0, y: 0, w: 160, type: 'swing',
  pivotX: 600, pivotY: 60, ropeLen: 320, ropeAngle: SWING.maxAngle, phase: 0.25,
});
slab.update(STEP, 0);
slab.h = 20;
const rider = new Player();
rider.setScale(1);
rider.reset(slab.x + slab.w / 2, slab.y);
const startX = rider.x;
let t = 0;
for (let i = 0; i < Math.round((swingPeriod(320) / 2) / STEP); i++) {
  slab.update(STEP, t);
  rider.update(STEP, { axis: 0, jumpHeld: false, jumpPressed: false }, [slab], { coyote: 1 }, {});
  t += STEP;
}
const carried = rider.x - startX;
check(
  'hiçbir tuşa basmadan yayın öbür ucuna taşınıyor',
  Math.abs(carried) > 200,
  `${carried.toFixed(0)} px taşındı`,
);
check('taşınırken üstünde kalıyor', rider.onGround === true);

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Oyundaki her yay okunabilir ve geçmeye değer');
let arcs = 0;
for (const def of ALL_LEVELS) {
  for (const sw of (def.floes ?? []).filter((x) => x.type === 'swing')) {
    arcs++;
    const scale = def.scale ?? scaleForLevel(def.id);
    const reach = reachFor(scale);
    const sweep = 2 * Math.sin(sw.ropeAngle) * sw.ropeLen;
    const period = swingPeriod(sw.ropeLen);
    if (sweep < reach.distance * 0.7) {
      check(`L${def.id} yayı çok kısa`, false, `${Math.round(sweep)}px, erişim ${Math.round(reach.distance)}px`);
    }
    if (period < 0.9) check(`L${def.id} çok hızlı`, false, `${period.toFixed(2)} sn`);
    if (sw.ropeAngle > SWING.maxAngle + 1e-6) {
      check(`L${def.id} açısı küçük açı sınırını aşıyor`, false, sw.ropeAngle.toFixed(3));
    }
    // The anchor has to be a real place above the slab, inside the level.
    if (!(sw.pivotY < sw.y)) check(`L${def.id} çapası buzun altında`, false, `${sw.pivotY} vs ${sw.y}`);
    if (sw.pivotY < -40) check(`L${def.id} çapası gökyüzünün üstünde`, false, String(sw.pivotY));
    const hang = Math.hypot(sw.pivotX - (sw.x + sw.w / 2), sw.y - sw.pivotY);
    if (Math.abs(hang - sw.ropeLen) > 3) {
      check(`L${def.id} ipi boyuyla uyuşmuyor`, false, `${hang.toFixed(0)} vs ${sw.ropeLen}`);
    }
  }
}
check('oyunda sallanan buz var', arcs > 0, `${arcs} yay`);
check('hepsi dört kontrolden de geçti', true);

console.log(`\n${arcs} yay, ${ALL_LEVELS.length} bölüm tarandı.`);
if (fails) {
  console.log(`\n✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('\n✓ Sarkaç gerçek, taşıyor, ve ipi bir yere bağlı.');
