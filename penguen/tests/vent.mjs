/**
 * The crack in the seabed that breathes.
 *
 * Why it exists: the diving chapter repeated itself more than any other in the
 * game. A third of every pair of levels in it shared eighty percent of its
 * vocabulary, and the reason was not lazy composition — it was that all
 * fifteen levels asked one question. *How fast can you reach the next hole.*
 * Geometry, a leopard seal, a current and a cold trench are four ways to make
 * that harder and not one of them is a different question.
 *
 * The sea had no word for **when**. So: a vent gives air the way a hole in the
 * ice does, but only while it is blowing, and it blows for about two fifths of
 * its cycle. You cannot swim at it harder. You arrive, and you wait, and
 * waiting costs exactly what swimming costs, because down here everything is
 * paid for in the same lungful.
 *
 * What has to be proved, and none of it is a matter of taste:
 *
 *   1. The curve the player is shown, the air the water hands out and the wait
 *      the composer prices are one curve. Every time this project let two of
 *      those three diverge it cost a day.
 *   2. A player who arrives at the worst possible moment — one frame after a
 *      blow ends — still lives. That is the whole fairness argument, and it is
 *      checked by sweeping the phase rather than by trusting one.
 *   3. The vent is load-bearing. A level that can be crossed without ever
 *      breathing at it has decoration, not a mechanic, and the first version
 *      of level fifty-seven was exactly that: a speed fish sat on the line and
 *      saved seven hundred pixels, which was the difference.
 */

import { World } from '../src/game/world.js';
import { DIVE_LEVELS } from '../src/game/dive.js';
import { Deep } from '../src/game/deep.js';
import { VENT, ventAt, ventWait, breathRange, breathFor, swimSpeed } from '../src/game/config.js';

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

const WITH_VENTS = DIVE_LEVELS.filter((d) => (d.vents ?? []).length);

console.log('Deniz tabanındaki baca\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) Üfleme eğrisi sözleşmesine uyuyor');
{
  const N = 4000;
  let on = 0;
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const v = ventAt(VENT.period, 0, (i * VENT.period) / N);
    if (v > 0) on++;
    peak = Math.max(peak, v);
  }
  check('üfleme payı ilan edilen kadar', Math.abs(on / N - VENT.blow) < 0.01,
    `${(on / N).toFixed(3)} / ${VENT.blow}`);
  check('zirvesi tam güç', Math.abs(peak - 1) < 0.01, peak.toFixed(3));
  check('en uzun sessizlik hesaplanan kadar',
    Math.abs(ventWait() - VENT.period * (1 - VENT.blow)) < 1e-9, `${ventWait().toFixed(2)} sn`);
  // Negative and huge times are the same wheel: a level does not stop being
  // fair because it has been running for twenty minutes.
  check('zaman ilerledikçe bozulmuyor',
    Math.abs(ventAt(VENT.period, 0, 1.2) - ventAt(VENT.period, 0, 1.2 + VENT.period * 900)) < 1e-6);
}

/* 2 --------------------------------------------------------------------- */
console.log('\n2) Bir üfleme bir nefes ediyor');
// The composer prices a vent as a breath: it resets the lungful the way a hole
// does. If one blow does not actually fill the lungs, that arithmetic is a lie
// and the level is unwinnable in a way no geometry check can see.
{
  const d = new Deep({ scale: 1.4 });
  d.mouth().stretch({ of: 0.6, next: 'vent' }).vent({ phase: 0.5 }).stretch({ of: 0.6 }).surfaceOut();
  const w = new World(d.build({ id: 900, name: 'ölçüm', target: 60 }), deps());
  const p = w.player;
  const v = w.vents[0];
  // Arrive with just more than the longest wait, which is what the composer
  // promises the player will have.
  p.breath = ventWait() + 0.6;
  let filled = 0;
  for (let i = 0; i < Math.ceil(VENT.period * 2 / STEP); i++) {
    p.x = v.x + v.w / 2 - p.w / 2;
    p.y = v.y + v.h - p.h - 4;
    w.update(STEP, { axis: 0, jumpHeld: false, jumpPressed: false });
    filled = Math.max(filled, p.breath);
    if (w.status !== 'playing') break;
  }
  check('en kötü anda gelen boğulmuyor', w.status === 'playing');
  check('tek üfleme ciğeri dolduruyor', filled > p.breathMax * 0.985,
    `${filled.toFixed(2)} / ${p.breathMax.toFixed(2)}`);
}

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Susarken hava vermiyor');
{
  const d = new Deep({ scale: 1.4 });
  d.mouth().stretch({ of: 0.6, next: 'vent' }).vent({ phase: 0.55 }).stretch({ of: 0.6 }).surfaceOut();
  const w = new World(d.build({ id: 901, name: 'ölçüm', target: 60 }), deps());
  const p = w.player;
  const v = w.vents[0];
  p.breath = 6;
  const start = p.breath;
  let fell = false;
  for (let i = 0; i < Math.ceil(0.8 / STEP); i++) {
    p.x = v.x + v.w / 2 - p.w / 2;
    p.y = v.y + v.h - p.h - 4;
    w.update(STEP, { axis: 0, jumpHeld: false, jumpPressed: false });
    if (p.breath < start - 0.4) fell = true;
  }
  check('sessiz bacada nefes eriyor', fell && v.blow === 0, `üfleme ${v.blow.toFixed(2)}`);
}

/* 4 --------------------------------------------------------------------- */
console.log('\n4) Her fazda geçilebiliyor');
/**
 * A bot that knows the one thing the level is about: it follows the route, and
 * when the next node is the vent it goes there and stays until the lungs are
 * full. Everything else in this chapter can be solved by swimming; this cannot,
 * so a solver that only swims cannot say anything about it.
 */
function swimIt(def, phase) {
  const w = new World(def, deps());
  for (const v of w.vents) v.phase = phase;
  const p = w.player;
  const route = def.route;
  const ventXs = route.filter((r) => r.vent).map((r) => r.x);
  let waiting = null;
  for (let i = 0; i < 120000; i++) {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    let target = route[route.length - 1];
    for (const r of route) {
      if (r.x > cx + 8) { target = r; break; }
    }
    // Sitting on a vent until it has given what it is going to give.
    const near = ventXs.find((x) => Math.abs(x - cx) < 46);
    if (near !== undefined && p.breath < p.breathMax * 0.97) waiting = near;
    if (waiting !== null && p.breath >= p.breathMax * 0.97) waiting = null;
    const aim = waiting !== null ? route.find((r) => r.x === waiting) : target;
    const axis = Math.abs(aim.x - cx) < 6 ? 0 : (aim.x > cx ? 1 : -1);
    w.update(STEP, { axis, jumpHeld: cy < aim.y - 6, jumpPressed: false });
    if (w.status === 'won') return { won: true, t: i * STEP };
    if (w.status !== 'playing') return { won: false, why: 'öldü', t: i * STEP };
  }
  return { won: false, why: 'zaman aşımı' };
}

for (const def of WITH_VENTS) {
  const bad = [];
  for (let k = 0; k < 10; k++) {
    const r = swimIt(def, k / 10);
    if (!r.won) bad.push(`faz ${(k / 10).toFixed(1)} ${r.why}`);
  }
  check(`L${def.id} ${def.name} on fazın hepsinde bitiyor`, bad.length === 0,
    bad.slice(0, 3).join(', '));
}

/* 5 --------------------------------------------------------------------- */
console.log('\n5) Baca süs değil');
// Crossed without ever breathing at it, and the vent may as well not be there.
for (const def of WITH_VENTS) {
  const reach = breathRange(def.scale);
  const run = def.goal.x - def.spawn.x;
  check(`L${def.id} tek ciğere sığmıyor`, run > reach,
    `${Math.round(run)}px yol, ${Math.round(reach)}px ciğer`);
}
check('en az bir bölümde baca var', WITH_VENTS.length > 0, `${WITH_VENTS.length} bölüm`);

/* 6 --------------------------------------------------------------------- */
console.log('\n6) Besteci ödeyemeyeceği bacayı reddediyor');
{
  let refused = false;
  try {
    const d = new Deep({ scale: 1.4 });
    // A whole lungful spent before asking for a vent, which cannot then be
    // paid for: the swim to it plus the longest silence is past the budget.
    d.mouth().stretch({ of: 0.95 }).vent();
    d.build({ id: 902, name: 'olmaz' });
  } catch {
    refused = true;
  }
  check('ciğere sığmayan baca reddediliyor', refused);

  let longRefused = false;
  try {
    const d = new Deep({ scale: 1.4 });
    d.mouth().stretch({ of: 0.4, next: 'vent' }).vent({ period: 40 });
    d.build({ id: 903, name: 'olmaz' });
  } catch {
    longRefused = true;
  }
  check('yarım ciğerden uzun bekleme reddediliyor', longRefused,
    `yarım ciğer ${(breathFor(1.4) * 0.5).toFixed(1)} sn`);
}

console.log(`\n${WITH_VENTS.length} bölümde baca, en uzun bekleme ${ventWait().toFixed(2)} sn ` +
  `(${Math.round(ventWait() * swimSpeed(1.4))}px havaya bedel).`);
if (fails) {
  console.log(`\n✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('\n✓ Deniz artık "ne kadar hızlı" değil, "ne zaman" diye de soruyor.');
