/**
 * Can anybody actually win these?
 *
 * Same standard as the mountain and the sea, and the same method as the sea:
 * drive the **real `World`**, not a model of it. The rivals' throw cycle, the
 * aim lock, the flight, what a snowball stops on, the locked exit and the
 * death rules are all the ones the game runs — in this chapter especially,
 * because every one of those *is* the puzzle.
 *
 * The player it drives is deliberately literal. It walks to the spot the level
 * says the shot lines up from, stands there until somebody aims at it, gets
 * off the line, and waits to see the guard fall. It does not lead its target,
 * it does not read the arena, it does not improvise. If that is enough, then a
 * person who can see the dotted line can do it too.
 */

import { World } from '../src/game/world.js';
import { BRAWL } from '../src/game/config.js';
import { BRAWL_LEVELS, BRAWL_DRAFTS } from '../src/game/brawl.js';

const STEP = 1 / 120;
const noop = () => {};
const deps = () => ({
  particles: { puff: noop, splash: noop, sparkle: noop, burstIce: noop },
  audio: new Proxy({}, { get: () => noop }),
  assist: false,
  upgrades: {},
  skin: 'normal',
});

/**
 * Will this ball reach us inside `horizon` seconds, if we do `move`?
 *
 * The prediction of our own body is crude on purpose — constant speed
 * sideways, a parabola upward — because it is not simulating the game, it is
 * standing in for the half-second of foresight a player has while watching a
 * snowball cross the arena. If the level needs better than that, it is not a
 * level about lines any more.
 */
function inbound(ball, p, move = { axis: 0, jump: false }, horizon = 0.95) {
  const SPEED = 300;
  const V0 = 700;
  const G = 2400;
  // A lobbed ball falls, and predicting it as a straight line predicts it
  // arriving somewhere it never goes. This solver called two arenas
  // unwinnable on exactly that mistake: it watched an arc sail over its head,
  // decided nothing was coming, and stood there while it came down.
  //
  // A lob also hangs in the air for well over a second, so the horizon has to
  // stretch to match or the ball is invisible until it is already falling on
  // the penguin's head, which is far too late to walk out from under.
  const arc = ball.lobbed ? BRAWL.lobGravity : 0;
  const look = ball.lobbed ? Math.max(horizon, 1.9) : horizon;
  const steps = ball.lobbed ? 24 : 12;
  for (let i = 1; i <= steps; i++) {
    const t = (look * i) / steps;
    const bx = ball.x + ball.vx * t;
    const by = ball.y + ball.vy * t + 0.5 * arc * t * t;
    const px = p.x + move.axis * SPEED * t;
    const lift = move.jump ? Math.max(0, V0 * t - 0.5 * G * t * t) : 0;
    const py = p.y - lift;
    if (
      bx + ball.r > px - 4 &&
      bx - ball.r < px + p.w + 4 &&
      by + ball.r > py - 4 &&
      by - ball.r < py + p.h + 4
    ) {
      return true;
    }
  }
  return false;
}

/** The move that gets us out of the way, or null if nothing is coming. */
function dodge(world, p, worldW) {
  const live = world.snowballs;
  if (!live.length) return null;
  const cx = p.x + p.w / 2;
  const still = { axis: 0, jump: false };
  if (!live.some((b) => inbound(b, p, still))) return null;
  // Ordered by how little they cost: sidestep first, jump only if the ground
  // has run out. Standing still is not on the list — it is what just failed.
  const options = [
    { axis: 1, jump: false },
    { axis: -1, jump: false },
    { axis: 1, jump: true },
    { axis: -1, jump: true },
    { axis: 0, jump: true },
  ];
  for (const move of options) {
    const ahead = cx + move.axis * 220;
    if (move.axis !== 0 && (ahead < 60 || ahead > worldW - 60)) continue;
    if (!live.some((b) => inbound(b, p, move))) return move;
  }
  return { axis: 0, jump: true };
}

/**
 * One attempt.
 *
 * @param {number} park how close to the marked spot counts as standing on it
 * @param {number} flee how far to run once the aim is locked
 */
function tryWin(def, { park, flee }, probe = {}) {
  const world = new World(def, deps());
  const plan = def.plan;
  let step = 0;
  let phase = 'walk';
  let fleeFrom = 0;
  let t = 0;
  let waited = 0;
  let lastX = 0;
  let stuckFor = 0;
  let nearest = 999;

  /**
   * Which way to run, given a preference and the walls.
   *
   * Running away from the thrower is the right answer right up until there is
   * a wall behind you, and then it is the worst one: the arena has edges, and
   * a penguin backed into one is a penguin standing still on a line somebody
   * has already aimed along.
   */
  const room = (cx, prefer) => {
    const ahead = cx + prefer * 200;
    if (ahead > 70 && ahead < def.worldW - 70) return prefer;
    return -prefer;
  };

  for (let i = 0; i < 60000; i++) {
    const p = world.player;
    const cx = p.x + p.w / 2;
    let axis = 0;
    let jump = false;

    // Everything yields to a snowball with your name on it. This runs first
    // because it is the only thing in the chapter that cannot wait a frame.
    const danger = dodge(world, p, def.worldW);

    const entry = plan[step];
    const guard = entry ? world.rivals[entry.guard] : null;
    const shooter = entry ? world.rivals[entry.shooter] : null;

    if (danger && phase !== 'flee') {
      // Suspended while fleeing, because fleeing *is* the dodge and the two
      // rules disagree — one is getting off a line that was just locked, the
      // other is getting out of the way of a ball already in the air.
      axis = danger.axis;
      jump = danger.jump && p.onGround;
    } else if (!entry) {
      axis = Math.sign(world.goal.x - cx) || 1;
    } else if (guard.out) {
      step++;
      phase = 'walk';
      waited = 0;
      continue;
    } else if (phase === 'walk') {
      const gap = entry.stand.x - cx;
      if (Math.abs(gap) > park) axis = Math.sign(gap);
      else phase = 'park';
    } else if (phase === 'park') {
      axis = 0;
      waited += STEP;
      // Aimed at, by the one that matters, from where we are standing.
      if (shooter.aim && Math.abs(shooter.aim.x - cx) < 46) {
        phase = 'flee';
        fleeFrom = cx;
      } else if (waited > 26) {
        return false; // nobody ever aimed: the duel is not real
      }
    } else {
      // Toward the thrower, always.
      //
      // Both directions work on paper — the shot passes over your head one way
      // and into the ice the other — but only one of them has somewhere to go.
      // A stand-spot is usually near an edge of the arena, so running from the
      // thrower runs out of arena, and a penguin in a corner is a penguin
      // standing exactly where the aim was locked.
      const run = Math.sign(shooter.x + shooter.w / 2 - cx) || 1;
      axis = Math.abs(cx - fleeFrom) < flee ? run : 0;
    }

    // Walking into rock. The arenas have pillars in them and a penguin that
    // never jumps simply leans on one until its lungs — or the level's clock —
    // run out. Detected rather than planned: if the feet are moving and the
    // penguin is not, jump.
    if (axis !== 0 && Math.abs(p.x - lastX) < 0.4 && p.onGround) stuckFor += STEP;
    else stuckFor = 0;
    lastX = p.x;
    if (stuckFor > 0.14) {
      jump = true;
      stuckFor = 0;
    }

    world.update(STEP, { axis, jumpHeld: jump, jumpPressed: jump });
    t += STEP;
    probe.knockouts = world.brawlKnockouts;
    // The nearest a snowball ever got. An arena nothing came close in is an
    // arena that never asked anything.
    for (const ball of world.snowballs) {
      const dx = ball.x - (p.x + p.w / 2);
      const dy = ball.y - (p.y + p.h / 2);
      nearest = Math.min(nearest, Math.hypot(dx, dy));
    }
    // Recorded as it happens rather than only on the attempt that won. How
    // dangerous an arena is does not depend on which try came good, and an
    // arena solved on the first pass used to report that nothing came near it
    // simply because nothing had been thrown yet.
    probe.closest = Math.min(probe.closest ?? 999, nearest);
    if (probe.trace && i % 20 === 0) {
      probe.log.push(
        `${t.toFixed(1)} x${Math.round(cx)} ${phase}${step} hedef${entry ? entry.stand.x : '-'} ` +
          `düşen${world.brawlKnockouts} top${world.snowballs.length} ${world.status}`,
      );
    }
    if (world.status === 'won') {
      probe.time = Math.min(probe.time ?? Infinity, t);
      return true;
    }
    if (world.status === 'dying') {
      probe.death = { x: Math.round(cx), step, phase };
      return false;
    }
    if (t > 260) return false;
  }
  return false;
}

const PARKS = [8, 20, 4];
const FLEES = [230, 320, 160];

function solve(def, probe = {}) {
  for (const park of PARKS) {
    for (const flee of FLEES) {
      if (tryWin(def, { park, flee }, probe)) return { park, flee };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */

console.log('Kar topu arenaları gerçek dünyayla deneniyor...\n');
console.log("(World sınıfının kendisi çalışıyor: nişan kilidi, uçuş, kapalı");
console.log(' çıkış ve ölüm kuralları oyundaki halleriyle.)\n');

const draft = process.argv.includes('--all');
const suite = draft ? BRAWL_DRAFTS : BRAWL_LEVELS;
const trace = process.argv.find((a) => a.startsWith('--trace='));

let failed = 0;
let held = 0;
const t0 = Date.now();

for (const def of suite) {
  const probe = {};
  if (trace && trace.slice(8) === String(def.id)) {
    probe.trace = true;
    probe.log = [];
  }
  const found = solve(def, probe);
  if (process.argv.includes('--measure')) {
    console.log(
      `MEASURE ${def.id} ${(probe.closest ?? 999).toFixed(1)} ${(probe.time ?? 0).toFixed(1)} ${found ? 1 : 0}`,
    );
    continue;
  }
  if (probe.trace) console.log(probe.log.slice(-70).join('\n'));
  if (found) {
    if (process.argv.includes('--list')) console.log(`GECTI ${def.id} ${def.name}`);
    continue;
  }
  const guards = def.rivals.filter((r) => r.guard).length;
  const where = probe.death
    ? `${probe.death.step + 1}. düelloda vuruldu (x ${probe.death.x}, ${probe.death.phase})`
    : `${probe.knockouts ?? 0}/${guards} kapıcı düştü`;
  if (def.ship !== false) failed++;
  else held++;
  console.log(`${def.ship === false ? '·' : '✗'} ${def.id}. ${def.name} — ${where}`);
}

console.log(`\n${suite.length} arena denendi, ${((Date.now() - t0) / 1000).toFixed(1)} sn`);
if (held) console.log(`${held} arena, henüz yayına girmemiş planlarda.`);
if (failed) {
  console.log(`✗ ${failed} arena kazanılamadı.`);
  process.exit(1);
}
console.log('✓ Her arena gerçek fizikle kazanıldı — eşyasız, yeteneksiz penguenle.');
