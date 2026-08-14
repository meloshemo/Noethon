/**
 * Does anybody actually get up these?
 *
 * `validate-climb.mjs` proves the geometry is inside the budget. This proves
 * something stronger and much less arguable: it runs the *real* `Player` — the
 * same class the game steps sixty times a second, with the same gravity, the
 * same air control, the same grip and the same stamina — against the real level
 * data, and searches for an input sequence that gets from each ledge to the
 * next one.
 *
 * It is a search rather than a single scripted attempt, because a jump taken at
 * exactly one moment either works or it never works, and a player who misses
 * simply tries again from slightly further back. So does this: it sweeps where
 * the penguin starts, when it leaves the ground and how long it holds the
 * button, and a step passes if *some* attempt lands. A step that survives none
 * of them is a step nobody can do.
 *
 * The penguin it drives owns nothing: no boots, no wings, no motor, no diamond
 * perk. Everything the shop sells can only make this easier.
 */

import { Player } from '../src/game/player.js';
import { scaleForLevel } from '../src/game/config.js';
import { CLIMB_LEVELS } from '../src/game/climb.js';

const STEP = 1 / 120;
const TUNING = { coyote: 1 };

/** Level data → the collision list the player expects. */
function solidsOf(def) {
  const floes = def.floes.map((f) => ({
    ...f,
    h: f.h ?? 20,
    solid: true,
    dx: 0,
    dy: 0,
    slippery: f.type === 'slip',
  }));
  const rock = def.terrain.map((t) => ({
    ...t,
    solid: true,
    dx: 0,
    dy: 0,
    type: 'rock',
  }));
  return [...floes, ...rock];
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

/** Standing on `floe`, has the penguin arrived on `target`? */
function landedOn(p, target) {
  if (!p.onGround) return false;
  const feet = p.y + p.h;
  if (Math.abs(feet - target.y) > 3) return false;
  return p.x + p.w > target.x + 2 && p.x < target.x + target.w - 2;
}

function drowned(p, def) {
  return p.y > def.waterY - p.h * 0.35;
}

/**
 * One attempt at a plain jump between two ledges.
 *
 * `from` is where on the launch ledge the penguin starts, as a fraction of its
 * width; `delay` is how long it runs before jumping; `hold` is how long the
 * button stays down. Everything after take-off is steering toward the target,
 * which is what a player does.
 */
function tryJump(def, solids, a, b, { from, delay, hold }) {
  const p = makePlayer(def, a.x + a.w * from, a.y);
  const targetX = b.x + b.w / 2;
  const dir = Math.sign(targetX - (p.x + p.w / 2)) || 1;
  let t = 0;
  let jumpedAt = null;
  let held = false;

  for (let i = 0; i < 480; i++) {
    const cx = p.x + p.w / 2;
    const wantJump = jumpedAt === null && t >= delay;
    const pressed = wantJump;
    if (wantJump) {
      jumpedAt = t;
      held = true;
    }
    if (held && jumpedAt !== null && t - jumpedAt > hold) held = false;

    // Steer toward the target once airborne; run toward it on the ground.
    const axis = p.onGround ? dir : Math.sign(targetX - cx) || 0;
    p.update(STEP, { axis, jumpHeld: held, jumpPressed: pressed, push: 0 }, solids, TUNING);
    t += STEP;

    if (drowned(p, def)) return false;
    if (jumpedAt !== null && landedOn(p, b)) return true;
    // Fell back onto something lower and settled: this attempt is over.
    if (jumpedAt !== null && t - jumpedAt > 0.3 && p.onGround && !landedOn(p, b)) return false;
  }
  return false;
}

/**
 * One attempt at a wall step.
 *
 * A chimney is not climbed, it is *bounced*: grab a wall, kick, catch the other
 * one, kick again. Creeping is the bail-out — it costs more than twice as much
 * per pixel — so the policy here is the one a player would use, and if that
 * policy cannot get up a shaft then the shaft is not climbable by anybody.
 *
 * A single face has no second wall to bounce off, so it is creeping all the way
 * and then pulling over the top.
 */
function tryWall(def, solids, a, b, { from, delay, mode, first }) {
  const p = makePlayer(def, a.x + a.w * from, a.y);
  const chimney = Boolean(b.chimney);
  const targetX = b.x + b.w / 2;
  // Which wall to reach for first: for a face it is the wall's own side, for a
  // chimney it is whichever one the cornice is not resting on.
  const firstSide = b.wallSide ?? (b.chimney ? first * b.chimney.climbSide : 1);
  // Where to be standing when you leave the ground. A shaft is entered from
  // underneath its *opening*, not from beside a wall: jump up next to a column
  // and you hit the bottom of it, which is exactly as solid as the rest.
  const shaftX = b.chimney
    ? (b.chimney.climbSide < 0
        ? b.x + b.w - b.chimney.inner / 2
        : b.x + b.chimney.inner / 2)
    : null;
  // For a single face the wall stands just past the edge of the launch ledge,
  // so the take-off point is that edge — not the exit, which is on the far
  // side of the wall and walking toward it means walking off into the sea.
  const approachX =
    shaftX ?? (firstSide > 0 ? a.x + a.w - 24 : a.x + 24);
  let t = 0;
  let launched = false;
  let seek = firstSide;
  let gripped = false;
  // Set once the climb is high enough that the next kick should aim for the
  // cornice instead of the far wall. Without it the penguin bounces past the
  // exit forever, which is a real way to lose a chimney and a silly way to
  // fail a test.
  let finishing = false;
  // How long the button stays down after each take-off. Letting go of it in
  // mid-air is the jump-cut, and a cut jump does not reach the mouth of a
  // shaft — the whole attempt then looks like an unclimbable chimney when it
  // is really just a button released too early.
  let holdUntil = 0;

  for (let i = 0; i < 1400; i++) {
    let axis = seek;
    let jumpHeld = false;
    let jumpPressed = false;

    if (!launched) {
      const cx = p.x + p.w / 2;
      axis = Math.abs(approachX - cx) > 10 ? Math.sign(approachX - cx) : 0;
      if (t >= delay && Math.abs(approachX - cx) < 26) {
        jumpPressed = true;
        launched = true;
        holdUntil = t + 0.5;
      }
      jumpHeld = launched;
    } else if (p.clinging) {
      gripped = true;
      const feet = p.y + p.h;
      const nearTop = feet <= b.y + 60;
      if (chimney && !(nearTop && mode === 'creep')) {
        // Kick. Off it goes toward the other wall, so that is where to steer —
        // unless the cornice is now the thing within reach.
        jumpPressed = true;
        seek = -p.wallSide;
        finishing = feet <= b.y + 110;
      } else {
        jumpHeld = true; // creep, or pull over the top of a single face
      }
    } else if (p.onGround) {
      if (landedOn(p, b)) return true;
      // Standing on the head of the wall it just pulled over: the exit is
      // beside it at the same height, so walk, do not jump.
      if (p.y + p.h <= b.y + 4) {
        axis = Math.sign(targetX - (p.x + p.w / 2)) || seek;
      } else {
        // A rest ledge inside the shaft: breathe, then go again.
        jumpPressed = true;
        holdUntil = t + 0.5;
        axis = seek;
      }
    } else {
      // Airborne between two walls: keep holding toward the one being reached
      // for, the whole way. Steering back toward the exit halfway across the
      // shaft is how you miss the far wall and fall down the middle of it.
      const cx = p.x + p.w / 2;
      axis = finishing ? Math.sign(targetX - cx) || seek : seek;
      jumpHeld = t < holdUntil;
    }

    p.update(STEP, { axis, jumpHeld, jumpPressed, push: 0 }, solids, TUNING);
    t += STEP;

    if (drowned(p, def)) return false;
    if (landedOn(p, b)) return true;
    if (t > 11) return false;
  }
  return gripped && landedOn(p, b);
}

const FROMS = [0.15, 0.3, 0.5, 0.7, 0.85];
const DELAYS = [0, 0.06, 0.12, 0.2, 0.3, 0.42, 0.6, 0.8];
const HOLDS = [0.5, 0.34, 0.22];
const MODES = ['kick', 'creep'];

function solveStep(def, solids, a, b) {
  if (b.via === 'jump') {
    for (const from of FROMS) {
      for (const delay of DELAYS) {
        for (const hold of HOLDS) {
          if (tryJump(def, solids, a, b, { from, delay, hold })) {
            return { from, delay, hold };
          }
        }
      }
    }
    return null;
  }
  for (const from of FROMS) {
    for (const delay of DELAYS) {
      for (const mode of MODES) {
        for (const first of [1, -1]) {
          if (tryWall(def, solids, a, b, { from, delay, mode, first })) {
            return { from, delay, mode, first };
          }
        }
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */

console.log('Tırmanışlar gerçek fizikle deneniyor...\n');
console.log('(Sadece yayındaki bölümler. climb.js\'te ship:false olanlar,');
console.log(' bu çözücü bir yol bulana kadar oyuna girmiyor.)\n');

let failed = 0;
let steps = 0;
const t0 = Date.now();

for (const def of CLIMB_LEVELS) {
  const solids = solidsOf(def);
  const route = def.route;
  const bad = [];
  for (let i = 1; i < route.length; i++) {
    steps++;
    const found = solveStep(def, solids, route[i - 1], route[i]);
    if (!found) bad.push(`${i}. adım (${route[i].via}) yapılamıyor: y ${route[i - 1].y} → ${route[i].y}`);
  }
  if (bad.length) {
    failed += bad.length;
    console.log(`✗ ${def.id}. ${def.name}`);
    for (const line of bad) console.log(`    ${line}`);
  }
}

console.log(`\n${steps} adım denendi, ${((Date.now() - t0) / 1000).toFixed(1)} sn`);
if (failed) {
  console.log(`✗ ${failed} adım geçilemedi.`);
  process.exit(1);
}
console.log('✓ Her adım gerçek fizikle geçildi — eşyasız, yeteneksiz penguenle.');
