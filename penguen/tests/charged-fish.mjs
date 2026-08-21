/**
 * The charged fish, the fourth curse, and the bird you can fight.
 *
 * Everything added here is a new meaning for the jump button, and a button
 * that means four things depending on what you ate is exactly the kind of
 * feature that works in the level it was written for and quietly stops working
 * everywhere else. So none of this is checked by reading the code: each claim
 * is made by driving the real `Player` and the real `World` and looking at
 * where the penguin ended up.
 *
 * The claims, in the order a player meets them:
 *
 *   · a coil makes one jump much bigger, and only one;
 *   · a coil left unspent goes off by itself;
 *   · a blink moves you across, never up, once per stretch in the air;
 *   · a blink cannot put you inside a wall;
 *   · slack slows the world only while you are airborne, and never below water;
 *   · slick takes the grip off ordinary ice;
 *   · the bird can be fought off, and ignoring it still kills you;
 *   · and none of the fish sits on the running line.
 *
 * That last one is the important one. Every level in this game is proved
 * passable by a penguin that picks nothing up, and a pickup that happened to
 * land in the middle of a route would make that proof a lie the moment someone
 * ate it and got the reversed controls instead.
 */

import { Player } from '../src/game/player.js';
import { World } from '../src/game/world.js';
import { ALL_LEVELS } from '../src/game/chapters.js';
import { COIL, QUANTUM, SLACK, ROT, CHARGED, AMBUSH, PHYS } from '../src/game/config.js';
import { rectsOverlap } from '../src/core/util.js';

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
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fails++;
  }
}

/** A flat, endless floe to stand a test penguin on. */
function ground(y = 400, x = -2000, w = 8000) {
  return [{ x, y, w, h: 400, solid: true, climb: false, slippery: false, dx: 0, dy: 0 }];
}

const TUNING = { coyote: 1 };
const NONE = { axis: 0, jumpHeld: false, jumpPressed: false };

/** Run a penguin for `seconds`, with the intent produced per frame. */
function run(p, floes, seconds, intentAt = () => NONE) {
  let peak = p.y;
  const frames = Math.round(seconds / STEP);
  for (let i = 0; i < frames; i++) {
    p.update(STEP, intentAt(i * STEP, p), floes, TUNING, {});
    peak = Math.min(peak, p.y);
  }
  return peak;
}

/** A penguin standing still on flat ice, ready to be told to jump. */
function standing() {
  const p = new Player();
  p.setScale(1);
  p.reset(0, 400);
  run(p, ground(), 0.4);
  return p;
}

/** Hold the jump button for `hold` seconds starting at t = 0, then let go. */
const jumpFor = (hold) => (t) => ({ axis: 0, jumpHeld: t < hold, jumpPressed: t < STEP / 2 });

console.log('Yüklü balıklar ve kuşla boğuşma\n');

/* --- the coil ------------------------------------------------------------ */

const plainTop = 400 - run(standing(), ground(), 1.6, jumpFor(0.5)) * -1;
const plainRise = 400 - run(standing(), ground(), 1.6, jumpFor(0.5));

const wound = standing();
wound.chargeFish('coil');
const coilRise = 400 - run(wound, ground(), 1.6, jumpFor(0.5));

check(
  'kurulu yay sıçrayışı çok daha yükseğe atıyor',
  coilRise > plainRise * 1.8,
  `düz ${plainRise.toFixed(0)} px, kurulu ${coilRise.toFixed(0)} px`,
);

// And only once: the second jump is an ordinary jump again.
const spent = standing();
spent.chargeFish('coil');
run(spent, ground(), 1.6, jumpFor(0.5));
const secondRise = 400 - run(spent, ground(), 1.6, jumpFor(0.5));
check(
  'yay bir kez harcanıyor, ikinci sıçrayış normal',
  Math.abs(secondRise - plainRise) < plainRise * 0.12,
  `ikinci ${secondRise.toFixed(0)} px, düz ${plainRise.toFixed(0)} px`,
);

// Left alone, it fires on its own — which is the threat the ring draws.
const idle = standing();
idle.chargeFish('coil');
const idleRise = 400 - run(idle, ground(), COIL.duration + 1.2);
check(
  'harcanmayan yay kendiliğinden boşalıyor',
  idleRise > plainRise * 1.5,
  `kendiliğinden ${idleRise.toFixed(0)} px`,
);

/* --- the blink ----------------------------------------------------------- */

const blinkFloes = ground();
const b = standing();
b.chargeFish('quantum');
b.facing = 1;
// Jump, then press again in mid-air.
let vyBefore = 0;
let vyAfter = 0;
let xBefore = 0;
let xAfter = 0;
{
  const frames = Math.round(1.4 / STEP);
  for (let i = 0; i < frames; i++) {
    const t = i * STEP;
    const press = t < STEP / 2 || (t >= 0.4 && t < 0.4 + STEP / 2);
    if (t >= 0.4 && t < 0.4 + STEP / 2) {
      vyBefore = b.vy;
      xBefore = b.x;
    }
    b.update(STEP, { axis: 0, jumpHeld: t < 0.5, jumpPressed: press }, blinkFloes, TUNING, {});
    if (t >= 0.4 && t < 0.4 + STEP / 2) {
      vyAfter = b.vy;
      xAfter = b.x;
    }
  }
}
const want = QUANTUM.bodies * b.w;
check(
  'ışınlanma yatayda tam mesafeyi taşıyor',
  Math.abs(xAfter - xBefore - want) < 2,
  `${(xAfter - xBefore).toFixed(1)} px, beklenen ${want.toFixed(1)} px`,
);
// One frame of falling is allowed, because one frame of falling happened —
// what is being checked is that the blink itself adds nothing vertical.
check(
  'ışınlanma dikey hızı değiştirmiyor',
  Math.abs(vyAfter - vyBefore) < Math.max(PHYS.gravityUp, PHYS.gravityDown) * STEP + 1,
  `${vyBefore.toFixed(1)} → ${vyAfter.toFixed(1)}`,
);

// Once per stretch in the air.
const twice = standing();
twice.chargeFish('quantum');
twice.facing = 1;
const startX = twice.x;
{
  const frames = Math.round(1.0 / STEP);
  for (let i = 0; i < frames; i++) {
    const t = i * STEP;
    const press =
      t < STEP / 2 ||
      (t >= 0.3 && t < 0.3 + STEP / 2) ||
      (t >= 0.5 && t < 0.5 + STEP / 2) ||
      (t >= 0.7 && t < 0.7 + STEP / 2);
    twice.update(STEP, { axis: 0, jumpHeld: t < 0.4, jumpPressed: press }, blinkFloes, TUNING, {});
  }
}
check(
  'havada tek ışınlanma — üç basış bir kez taşıyor',
  Math.abs(twice.x - startX - want) < 6,
  `${(twice.x - startX).toFixed(1)} px`,
);

// Landing re-arms it.
run(twice, blinkFloes, 0.6);
const rearmedFrom = twice.x;
run(twice, blinkFloes, 1.0, (t) => ({
  axis: 0,
  jumpHeld: t < 0.3,
  jumpPressed: t < STEP / 2 || (t >= 0.25 && t < 0.25 + STEP / 2),
}));
check(
  'yere basınca ışınlanma yeniden doluyor',
  twice.x - rearmedFrom > want * 0.8,
  `${(twice.x - rearmedFrom).toFixed(1)} px`,
);

// And it cannot post a penguin through a wall.
const walled = new Player();
walled.setScale(1);
walled.reset(0, 400);
const wall = { x: 40, y: 0, w: 60, h: 800, solid: true, climb: false, slippery: false, dx: 0, dy: 0 };
const withWall = [...ground(), wall];
run(walled, withWall, 0.4);
walled.chargeFish('quantum');
walled.facing = 1;
run(walled, withWall, 0.8, (t) => ({
  axis: 0,
  jumpHeld: t < 0.3,
  jumpPressed: t < STEP / 2 || (t >= 0.2 && t < 0.2 + STEP / 2),
}));
check(
  'ışınlanma duvarın içine sokmuyor',
  !rectsOverlap(walled.box, wall),
  `x ${walled.x.toFixed(1)}, duvar ${wall.x}`,
);

/* --- slack --------------------------------------------------------------- */

const sl = standing();
sl.chargeFish('slack');
check('yerdeyken dünya normal hızda', sl.worldRate === 1, String(sl.worldRate));
sl.onGround = false;
check('havadayken dünya yavaşlıyor', sl.worldRate === SLACK.rate, String(sl.worldRate));
sl.submerged = true;
check('su altında yavaşlatma çalışmıyor', sl.worldRate === 1, String(sl.worldRate));

/* --- slick --------------------------------------------------------------- */

function stopDistance(cursed) {
  const p = standing();
  if (cursed) p.afflict('slick');
  // Get up to speed, then let go and see how far the ice carries.
  run(p, ground(), 1.2, () => ({ axis: 1, jumpHeld: false, jumpPressed: false }));
  const from = p.x;
  run(p, ground(), 1.2);
  return p.x - from;
}
const gripped = stopDistance(false);
const slick = stopDistance(true);
check(
  'cilalı lanet duruşu alıp götürüyor',
  slick > gripped + 40,
  `tutuşlu ${gripped.toFixed(0)} px, cilalı ${slick.toFixed(0)} px`,
);
check('cilalı lanet süresi tanımlı', ROT.slick?.duration > 0, String(ROT.slick?.duration));

/* --- the bird you can fight --------------------------------------------- */

function carried(mash) {
  const def = ALL_LEVELS.find((d) => d.id === 20);
  const w = new World(def, deps());
  w.ambushes = true;
  w.skuaCooldown = 0;
  // Put the bird straight into the grab rather than waiting for a dice roll.
  w._launchSkua();
  // Straight into the grab, from where the penguin actually is. Dropping the
  // bird in at the origin instead would start the carry with the chick inside
  // the back wall of the level, and the collision solver would eject it into
  // the sea before the struggle had a chance to happen — a fault in the test,
  // not in the bird.
  w.skua.state = 'carry';
  w.skua.t = 0;
  w.skua.x = w.player.centerX;
  w.skua.y = w.player.y;
  w.player.alive = false;
  const frames = Math.round((AMBUSH.carry + 0.4) / STEP);
  let freed = false;
  for (let i = 0; i < frames; i++) {
    // Mashing is a press every eighth of a second, which is a person hitting a
    // button hard rather than a machine holding it down.
    const press = mash && i % 15 === 0;
    w.update(STEP, { axis: 0, jumpHeld: false, jumpPressed: press });
    if (!w.skua && w.player.alive && w.status === 'playing') freed = true;
    if (w.status === 'dying' || w.status === 'dead') break;
  }
  return { freed, deaths: w.deaths, escaped: w.skuasEscaped };
}

const fought = carried(true);
check('düğmeye basarak kuşun elinden kurtulmak mümkün', fought.freed && fought.escaped === 1);
const limp = carried(false);
check('hiçbir şey yapmazsan kuş seni götürüyor', !limp.freed && limp.deaths === 1);

/* --- nothing is on the running line -------------------------------------- */

let placed = 0;
let inside = 0;
let onRoute = 0;
for (const def of ALL_LEVELS) {
  const solids = [...(def.floes ?? []), ...(def.terrain ?? [])].filter((f) => f.solid !== false);
  for (const f of def.chargedFish ?? []) {
    placed++;
    const box = { x: f.x - 4, y: f.y - 4, w: 38, h: 30 };
    if (solids.some((sd) => rectsOverlap(box, sd))) inside++;
    // "On the running line" means low enough over a floe that a penguin
    // crossing normally would swallow it without deciding to. A body height
    // of clearance is the bar.
    const under = solids.find((sd) => f.x + 15 > sd.x && f.x + 15 < sd.x + sd.w && sd.y > f.y);
    if (under && under.y - (f.y + 22) < 40) onRoute++;
  }
}
check('yüklü balıklar bölümlere dağıtılmış', placed >= 12, `${placed} adet`);
check('hiçbiri buzun içinde değil', inside === 0, `${inside} adet`);
check('hiçbiri koşu hattının üstünde değil', onRoute === 0, `${onRoute} adet`);

const kinds = new Set();
for (const def of ALL_LEVELS) for (const f of def.chargedFish ?? []) kinds.add(f.kind);
check(
  'üç rengin üçü de oyunda var',
  ['coil', 'quantum', 'slack'].every((k) => kinds.has(k)),
  [...kinds].join(', '),
);
check(
  'her rengin ayarı ve rengi tanımlı',
  ['coil', 'quantum', 'slack'].every((k) => CHARGED[k]?.tint && CHARGED[k]?.reward > 0),
);

console.log(`\n${placed} yüklü balık, ${ALL_LEVELS.length} bölüm tarandı.`);
if (fails) {
  console.log(`\n✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('\n✓ Yüklü balıklar, cilalı lanet ve boğuşma çalışıyor.');
