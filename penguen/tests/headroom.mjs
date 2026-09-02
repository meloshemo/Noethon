/**
 * Bir sıçrayışın üstünde tavan var mı?
 *
 * This pack exists because of a screenshot. The penguin was standing on top of
 * a column on level 41, and the report was: "it cannot get past this gap, and
 * even when it does it is thrown straight back."
 *
 * It was not the gap. The step lands on a ledge at 348–498 and the *next* one
 * sits at 517–652, seventy pixels higher. Those two spans do not overlap by a
 * single pixel, so the composer's stacking rule — which compares a ledge with
 * whatever is directly above its own footprint — never compared them. But a
 * jump does not travel straight up: the arc out of the column head passes
 * right under that higher ledge, and the penguin puts its head into it at the
 * top of the arc, drops short, and lands back down the shaft.
 *
 * Measured, the step landed for **twenty-seven of seven hundred and two** swept
 * inputs — under four per cent, the worst jump in the chapter, and only
 * reachable with a precisely clipped tap that nobody would think to try.
 *
 * The rule this checks is therefore not about ledges but about arcs: a jump
 * that has to *climb* must be held, a held jump rises the better part of a
 * body-and-a-half above its target, and anything in that space is a ceiling.
 * Level jumps are excluded on purpose — a flat hop is naturally a short tap,
 * and a roof it never reaches is not in the way.
 */

import { Player } from '../src/game/player.js';
import { scaleForLevel, hushAt, glazeAt, sapAt, swingAt } from '../src/game/config.js';
import { CLIMB_LEVELS } from '../src/game/climb.js';

const STEP = 1 / 120;
const HOLDS = [1.1, 0.6, 0.45, 0.34, 0.26, 0.2, 0.15, 0.1];
const FROMS = [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95];
const DELAYS = [0, 0.06, 0.14, 0.24, 0.36, 0.5];
/** A jump that has to climb this much cannot be a short tap. */
const RISING = 45;
/** Below this a step is a wall with a gap drawn on it. */
const FLOOR = 0.08;

let fails = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  console.log(`  ✗ ${m}`);
  fails++;
};

function solidsOf(def) {
  return [
    ...def.floes.map((f) => ({
      ...f,
      h: f.h ?? 20,
      solid: true,
      dx: 0,
      dy: 0,
      slippery: f.type === 'slip',
    })),
    ...(def.terrain ?? []).map((t) => ({ ...t, solid: true, dx: 0, dy: 0 })),
  ];
}

/**
 * The hanging slabs actually swing.
 *
 * Frozen at their rest position they sit over the approach to five levels'
 * worth of steps and report them as blocked, which is the measurement being
 * wrong rather than the level: by the time the penguin is up there the rope
 * has carried the slab somewhere else. Moved the same way the solver moves it.
 */
function swingTo(solids, t) {
  for (const f of solids) {
    if (f.type !== 'swing') continue;
    const prevX = f.x;
    const prevY = f.y;
    const at = swingAt(f.ropeLen, f.ropeAngle, f.phase ?? 0, t);
    f.x = f.pivotX - f.w / 2 + at.dx;
    f.y = f.pivotY + at.dy;
    f.dx = f.x - prevX;
    f.dy = f.y - prevY;
  }
}

console.log('Sıçrayışların üstünde tavan var mı?\n');

let scanned = 0;
let worst = null;
for (const def of CLIMB_LEVELS) {
  const solids = solidsOf(def);
  const scale = def.scale ?? scaleForLevel(def.id);
  const intent = (p, keys) => ({
    ...keys,
    push: 0,
    gravity: hushAt(def.zones, p.x + p.w / 2, p.y + p.h / 2),
    grip: glazeAt(def.zones, p.x + p.w / 2, p.y + p.h * 0.4) ? 0 : 1,
    sap: sapAt(def.zones, p.x + p.w / 2, p.y + p.h * 0.4),
  });
  for (let i = 1; i < def.route.length; i++) {
    const a = def.route[i - 1];
    const b = def.route[i];
    if (b.via !== 'jump') continue;
    if (a.y - b.y < RISING) continue;
    scanned++;
    let hit = 0;
    let tried = 0;
    for (const from of FROMS) {
      for (const delay of DELAYS) {
        for (const hold of HOLDS) {
          tried++;
          const p = new Player();
          p.setScale(scale);
          p.boost = { jump: 0, speed: 0, grip: 0, wind: 0 };
          p.gear = { wings: 0, rocket: 0 };
          p.glideBonus = 0;
          p.reset(a.x + a.w * from, a.y);
          p.onGround = true;
          let t = 0;
          let jumped = false;
          for (let k = 0; k < 500; k++) {
            const press = !jumped && t >= delay;
            if (press) jumped = true;
            swingTo(solids, t);
            const dir = Math.sign(b.x + b.w / 2 - (p.x + p.w / 2)) || 1;
            p.update(
              STEP,
              intent(p, { axis: dir, jumpHeld: jumped && t - delay < hold, jumpPressed: press }),
              solids,
              { coyote: 1 },
              {},
            );
            t += STEP;
            if (jumped && p.onGround && Math.abs(p.y + p.h - b.y) < 4) {
              const over = Math.min(p.x + p.w, b.x + b.w) - Math.max(p.x, b.x);
              if (over > 2) {
                hit++;
                break;
              }
            }
            if (p.y > a.y + 500) break;
          }
        }
      }
    }
    const rate = hit / tried;
    if (!worst || rate < worst.rate) worst = { id: def.id, name: def.name, i, rate };
    if (rate < FLOOR) {
      bad(
        `L${def.id} ${def.name}: ${i}. adım (${a.y - b.y}px yükseliş) yalnızca ` +
          `%${(rate * 100).toFixed(1)} girdiyle iniyor — üstünde tavan var`,
      );
    }
  }
}

ok(`${scanned} yükselen sıçrayış tarandı`);
if (worst) {
  ok(`en dar: L${worst.id} ${worst.name} ${worst.i}. adım — %${(worst.rate * 100).toFixed(1)}`);
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Hiçbir yükselen sıçrayış tavana çarpmıyor.');
