/**
 * Does the wind actually carry anybody across?
 *
 * `validate-levels.mjs` proves the arithmetic: the gap is longer than an
 * unassisted jump and shorter than an assisted one. That is a claim about two
 * formulas, and formulas are exactly the kind of thing that can agree with each
 * other and disagree with the game.
 *
 * So this runs the real `Player` — the same class the game steps a hundred and
 * twenty times a second, with the same gravity, the same air control — against
 * the real level data, with the wind computed from the same `windAt` curve the
 * physics reads, and it searches for a way across.
 *
 * It asserts both halves, because either one alone is worthless:
 *
 *   · with the wind, some attempt lands. Otherwise the level is a wall.
 *   · without it, no attempt lands. Otherwise the storm is scenery and the
 *     whole mechanic is a lighting effect.
 *
 * The penguin owns nothing: no boots, no wings, no vest. Everything the shop
 * sells can only make this easier.
 */

import { Player } from '../src/game/player.js';
import { WIND, windAt, scaleForLevel, hushAt} from '../src/game/config.js';
import { LEVELS } from '../src/game/levels.js';

const STEP = 1 / 120;
const TUNING = { coyote: 1 };

function solidsOf(def) {
  return def.floes
    .filter((f) => f.type !== 'snap')
    .map((f) => ({ ...f, h: f.h ?? 20, solid: true, dx: 0, dy: 0, slippery: f.type === 'slip' }));
}

function makePlayer(def, x, surfaceY) {
  const p = new Player();
  p.setScale(def.scale ?? scaleForLevel(def.id));
  p.boost = { jump: 0, speed: 0, grip: 0, wind: 0 };
  p.gear = { wings: 0, rocket: 0 };
  p.glideBonus = 0;
  p.reset(x, surfaceY);
  p.onGround = true;
  return p;
}

function landedOn(p, target) {
  if (!p.onGround) return false;
  if (Math.abs(p.y + p.h - target.y) > 3) return false;
  const overlap = Math.min(p.x + p.w, target.x + target.w) - Math.max(p.x, target.x);
  return overlap > 2;
}

/**
 * One attempt.
 *
 * `phase` is where in the storm's breath the penguin is standing when the clock
 * starts, which is the one thing a player controls by waiting. `delay` is how
 * long it runs before jumping, `hold` how long the button stays down.
 */
function tryCross(def, solids, storm, a, b, { phase, from, delay, hold }, windy) {
  const p = makePlayer(def, a.x + a.w * from, a.y);
  const targetX = b.x + b.w / 2;
  const period = storm.period ?? WIND.period;
  let t = 0;
  let jumpedAt = null;
  let held = false;

  for (let i = 0; i < 1200; i++) {
    const cx = p.x + p.w / 2;
    const dir = Math.sign(targetX - cx) || 1;
    const wantJump = jumpedAt === null && t >= delay;
    if (wantJump) {
      jumpedAt = t;
      held = true;
    }
    if (held && jumpedAt !== null && t - jumpedAt > hold) held = false;

    // The same computation `world.js` does, in the same order.
    let push = 0;
    if (windy && p.x + p.w > storm.x && p.x < storm.x + storm.w) {
      const signed = windAt(t / period + phase);
      const still = p.onGround && Math.abs(dir) < 0.01;
      const factor = p.onGround ? (still ? WIND.dugIn : WIND.ground) : 1;
      push = (storm.power ?? WIND.power) * signed * (storm.dir ?? 1) * factor;
    }

    // Gravity comes from the same shared function the world uses, so a wind
    // level that ever gains a hush pocket cannot be silently mismodelled here.
    const gravity = hushAt(def.zones, p.x + p.w / 2, p.y + p.h / 2);
    p.update(
      STEP,
      { axis: dir, jumpHeld: held, jumpPressed: wantJump, push, gravity },
      solids,
      TUNING,
    );
    t += STEP;

    if (p.y > def.waterY - p.h * 0.35) return false;
    if (landedOn(p, b)) return true;
    // Landed back where it started, or short: that attempt is over.
    if (jumpedAt !== null && t - jumpedAt > 0.3 && p.onGround) return false;
    if (t > 8) return false;
  }
  return false;
}

/** Sweep the things a player can vary, and report the first crossing found. */
function search(def, solids, storm, a, b, windy) {
  for (let phase = 0; phase < 1; phase += 1 / 24) {
    for (const from of [0.25, 0.5, 0.7, 0.85, 0.95]) {
      for (let delay = 0; delay <= 1.2; delay += 0.05) {
        for (const hold of [0.08, 0.16, 0.24, 0.4, 1]) {
          if (tryCross(def, solids, storm, a, b, { phase, from, delay, hold }, windy)) {
            return { phase: +phase.toFixed(2), from, delay: +delay.toFixed(2), hold };
          }
        }
      }
    }
  }
  return null;
}

/**
 * One attempt at an updraft.
 *
 * The column is not a lift: it subtracts from gravity while the penguin is
 * inside it, so the height it buys is proportional to the jump already made.
 * Which means the same two questions apply, and the same two answers matter:
 * with the column somebody gets up, and without it nobody does.
 */
function tryRise(def, solids, column, a, b, { from, delay, hold }, windy) {
  const p = makePlayer(def, a.x + a.w * from, a.y);
  const targetX = b.x + b.w / 2;
  let t = 0;
  let jumpedAt = null;
  let held = false;

  for (let i = 0; i < 1200; i++) {
    const cx = p.x + p.w / 2;
    const dir = Math.sign(targetX - cx) || 1;
    const wantJump = jumpedAt === null && t >= delay;
    if (wantJump) {
      jumpedAt = t;
      held = true;
    }
    if (held && jumpedAt !== null && t - jumpedAt > hold) held = false;

    const box = { x: p.x, y: p.y, w: p.w, h: p.h };
    const inside =
      box.x + box.w > column.x &&
      box.x < column.x + column.w &&
      box.y + box.h > column.y &&
      box.y < column.y + column.h;
    const lift = windy && inside && !p.onGround ? (column.power ?? WIND.lift) : 0;

    const gravity = hushAt(def.zones, p.x + p.w / 2, p.y + p.h / 2);
    p.update(
      STEP,
      { axis: dir, jumpHeld: held, jumpPressed: wantJump, lift, gravity },
      solids,
      TUNING,
    );
    t += STEP;

    if (p.y > def.waterY - p.h * 0.35) return false;
    if (landedOn(p, b)) return true;
    if (jumpedAt !== null && t - jumpedAt > 0.3 && p.onGround) return false;
    if (t > 8) return false;
  }
  return false;
}

function searchRise(def, solids, column, a, b, windy) {
  for (const from of [0.2, 0.4, 0.6, 0.8, 0.95]) {
    for (let delay = 0; delay <= 1.2; delay += 0.05) {
      for (const hold of [0.08, 0.16, 0.24, 0.4, 1]) {
        if (tryRise(def, solids, column, a, b, { from, delay, hold }, windy)) {
          return { from, delay: +delay.toFixed(2), hold };
        }
      }
    }
  }
  return null;
}

console.log('Rüzgâr boşlukları çözülüyor...\n');

let fails = 0;
let checked = 0;
for (const def of LEVELS) {
  for (const g of def.windGaps ?? []) {
    checked++;
    const solids = solidsOf(def);
    const a = def.floes.find((f) => f.x + f.w === g.from);
    const b = def.floes.find((f) => f.x === g.to);
    const storm = (def.hazards ?? []).find(
      (h) => h.kind === 'storm' && h.x <= g.from && h.x + h.w >= g.to,
    );
    if (!a || !b || !storm) {
      console.log(`  ✗ L${def.id}: boşluğun parçaları eksik`);
      fails++;
      continue;
    }

    const withWind = search(def, solids, storm, a, b, true);
    if (!withWind) {
      console.log(`  ✗ L${def.id} (${def.name}): ${g.gap}px rüzgârla da geçilemiyor`);
      fails++;
    } else {
      console.log(
        `  ✓ L${def.id} (${def.name}): ${g.gap}px geçildi` +
          ` — vuruş ${withWind.phase}, kalkış +${withWind.delay} sn`,
      );
    }

    const withoutWind = search(def, solids, storm, a, b, false);
    if (withoutWind) {
      console.log(`  ✗ L${def.id}: rüzgârsız da geçiliyor, fırtına dekor demek`);
      fails++;
    } else {
      console.log(`  ✓ L${def.id}: rüzgârsız geçilemiyor, boşluk gerçek bir kapı`);
    }
  }
}

for (const def of LEVELS) {
  for (const g of def.updrafts ?? []) {
    checked++;
    const solids = solidsOf(def);
    const a = def.floes.find((f) => f.x + f.w === g.from);
    const b = def.floes.find((f) => f.x === g.to);
    const column = (def.hazards ?? []).find(
      (h) => h.kind === 'gust' && h.x <= g.from && h.x + h.w >= g.to,
    );
    if (!a || !b || !column) {
      console.log(`  ✗ L${def.id}: sütunun parçaları eksik`);
      fails++;
      continue;
    }

    if (searchRise(def, solids, column, a, b, true)) {
      console.log(`  ✓ L${def.id} (${def.name}): ${g.rise}px yükselen havayla çıkıldı`);
    } else {
      console.log(`  ✗ L${def.id} (${def.name}): ${g.rise}px yükselen havayla da çıkılamıyor`);
      fails++;
    }
    if (searchRise(def, solids, column, a, b, false)) {
      console.log(`  ✗ L${def.id}: havasız da çıkılıyor, sütun dekor demek`);
      fails++;
    } else {
      console.log(`  ✓ L${def.id}: havasız çıkılamıyor, raf gerçek bir kapı`);
    }
  }
}

console.log(`\n${checked} rüzgâr boşluğu denendi.`);
if (fails) {
  console.log(`\n✗ ${fails} sorun.`);
  process.exit(1);
}
console.log('\n✓ Rüzgâr işini yapıyor.');
