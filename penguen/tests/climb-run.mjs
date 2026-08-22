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
import { scaleForLevel, hushAt, swingAt} from '../src/game/config.js';
import { CLIMB_LEVELS, CLIMB_DRAFTS } from '../src/game/climb.js';

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

/**
 * Move every hanging slab to where it would be at time `t`.
 *
 * The solvers model the world's forces rather than instantiating a `World`,
 * and until now they modelled its *geometry* as a photograph: floes sat where
 * the composer put them and never moved. A pendulum is the first thing in the
 * game whose position is the mechanic, so the photograph had to become a film.
 *
 * Done by mutating the same objects the player is colliding against, which is
 * what makes riding work: the player reads `dx`/`dy` off the floe it is
 * standing on and adds them to its own position, exactly as it does in the
 * real game. Set those to zero and the slab would slide out from under the
 * penguin instead of carrying it.
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
  // Real overlap, not containment. A penguin that has just pulled over the
  // head of a column stands with one foot on the ledge and one on the column,
  // and demanding its whole body be inside the ledge fails that by a pixel.
  const overlap =
    Math.min(p.x + p.w, target.x + target.w) - Math.max(p.x, target.x);
  return overlap > 2;
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
  // The top of the shaft is the exit ledge's own height: the route's node for a
  // chimney *is* a column head.
  const topY = b.y;
  let t = 0;
  let jumpedAt = null;
  let held = false;
  let hops = 0;
  // Landing somewhere that is not the target is not a failed attempt. The head
  // of an ice column is solid ground and a player will happily stand on one on
  // the way past; a solver that gives up the moment it touches down anywhere
  // else reports a perfectly walkable route as impossible. So it hops on — up
  // to three times, and only while it is not losing height.
  const MAX_HOPS = 3;
  let floor = a.y;

  for (let i = 0; i < 1000; i++) {
    const cx = p.x + p.w / 2;
    const dir = Math.sign(targetX - cx) || 1;
    const wantJump = jumpedAt === null && t >= delay;
    const pressed = wantJump;
    if (wantJump) {
      jumpedAt = t;
      held = true;
    }
    if (held && jumpedAt !== null && t - jumpedAt > hold) held = false;

    const axis = p.onGround ? dir : Math.sign(targetX - cx) || 0;
    swingTo(solids, t);
    p.update(STEP, { axis, jumpHeld: held, jumpPressed: pressed, push: 0, gravity: hushAt(def.zones, p.x + p.w / 2, p.y + p.h / 2) }, solids, TUNING);
    t += STEP;

    if (drowned(p, def)) return false;
    if (landedOn(p, b)) return true;

    if (jumpedAt !== null && t - jumpedAt > 0.3 && p.onGround) {
      const feet = p.y + p.h;
      if (feet > floor + 4 || hops >= MAX_HOPS) return false;
      floor = feet;
      hops++;
      jumpedAt = null;
      held = false;
    }
    if (t > 6) return false;
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
/**
 * One attempt at riding a slab that hangs on a rope.
 *
 * Deliberately the dullest possible way to do it, because that is what is
 * being proved. The penguin walks to the edge nearest the arc, waits for the
 * slab to swing over and *stop*, steps on, and then stands still while the
 * rope carries it. No timing through the fast middle, no jumping between
 * moving things — if this passes, a player who simply waits can cross.
 *
 * `wait` is how long it loiters before stepping on, swept across a whole
 * period so that every phase of the swing gets tried. `hold` is the length of
 * the hop onto the slab.
 */
function trySwing(def, solids, a, b, { wait, hold }) {
  const slab = solids.find((f) => f.type === 'swing' && Math.abs(f.pivotX - (b.swingPivot ?? f.pivotX)) < 1);
  if (!slab) return false;
  const nearX = b.swing.nearX;
  const farX = b.swing.farX;
  const side = Math.sign(farX - nearX) || 1;
  // Start at the end of the launch ledge the arc comes to.
  const p = makePlayer(def, side > 0 ? a.x + a.w * 0.72 : a.x + a.w * 0.28, a.y);
  let t = 0;
  let jumped = false;

  for (let i = 0; i < 1600; i++) {
    swingTo(solids, t);
    const onSlab = p.groundFloe === slab;
    // Ride: once aboard, do nothing at all and let the rope work.
    const axis = onSlab ? 0 : Math.sign(nearX - (p.x + p.w / 2)) || 0;
    const press = !jumped && !onSlab && t >= wait;
    if (press) jumped = true;
    const held = jumped && !onSlab && t - wait < hold;
    p.update(
      STEP,
      { axis, jumpHeld: held, jumpPressed: press, push: 0, gravity: hushAt(def.zones, p.x + p.w / 2, p.y + p.h / 2) },
      solids,
      TUNING,
    );
    t += STEP;
    if (drowned(p, def)) return false;
    // Arrived: standing on the slab with the slab at the far end of its arc.
    if (onSlab && Math.abs(slab.x + slab.w / 2 - farX) < 10) return true;
    // Fell off and landed back where it started: that attempt is spent.
    if (jumped && !onSlab && p.onGround && t - wait > 1.2) return false;
    if (t > 12) return false;
  }
  return false;
}

function tryWall(def, solids, a, b, { from, delay, mode, first }, probe = {}) {
  // The lowest the arms ever got on a step that worked.
  //
  // This is the chapter's real difficulty, the way breath is the sea's: how
  // precise one kick was is dominated by how coarsely this file happens to
  // sweep, but how much bar a shaft eats is the thing the player feels and the
  // thing `effort` moves.
  let floor = 1;
  const p = makePlayer(def, a.x + a.w * from, a.y);
  const chimney = Boolean(b.chimney);
  const targetX = b.x + b.w / 2;
  // The top of the shaft is the exit ledge's own height: the route's node for a
  // chimney *is* a column head.
  const topY = b.y;
  // Which wall to reach for first: for a face it is the wall's own side, for a
  // chimney it is whichever one the cornice is not resting on.
  // Reach for the column you are going to top out on. Its inner face is right
  // beside the exit, so the whole ascent can happen on one wall — and when the
  // mouth of the shaft hangs high, entering beside a face is the only way to
  // get a hand on it at all: from the middle of the shaft the grip is 85px
  // away and the apex has passed long before you drift that far.
  const headSide = b.chimney ? (b.chimney.climbSide < 0 ? 1 : -1) : 1;
  const firstSide = b.wallSide ?? (b.chimney ? (first > 0 ? headSide : -headSide) : 1);
  // Where to be standing when you leave the ground. A shaft is entered from
  // underneath its *opening*, not from beside a wall: jump up next to a column
  // and you hit the bottom of it, which is exactly as solid as the rest.
  // The shaft is entered from underneath its middle. The exit is the head of
  // one of its columns, so the middle sits one column-width inside the target.
  // The exit is now the shoulder, out beyond the columns, so the shaft has to
  // be located from the column itself rather than from the target.
  const shaftX = b.chimney
    ? (headSide > 0 ? b.chimney.headX - 30 : b.chimney.headX + 44 + 30)
    : null;
  // For a single face the wall stands just past the edge of the launch ledge,
  // so the take-off point is that edge — not the exit, which is on the far
  // side of the wall and walking toward it means walking off into the sea.
  // Far enough back that the whole body clears the column's footprint on the
  // way up: a wall whose foot hangs above the ledge still has an underside,
  // and launching from directly beneath it is a head-bump, not a climb.
  const approachX =
    shaftX ?? (firstSide > 0 ? a.x + a.w - (p.w + 18) : a.x + p.w + 18);
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
  // Rest ledges inside the shaft, lowest first.
  //
  // A nub is not scenery, it is a floor: it cuts one long hold into two short
  // ones, and that is the only reason a four-hundred-pixel shaft is fair. But
  // a chain of kicks aimed at the top of the shaft flies straight past it —
  // or, more often, into its underside, because a nub juts from the same face
  // the penguin is climbing. So the ascent is staged. The goal is the next
  // nub up until the penguin is standing on it, and only then the exit.
  const nubs = solids
    .filter((o) => o.nub && o.y < a.y - 20 && o.y > topY + 20)
    .sort((m, n) => n.y - m.y);
  // Where the current stage is aiming, kept out here so the airborne branch
  // steers at the same thing the cling branch decided on.
  let goalX = targetX;

  for (let i = 0; i < 16000; i++) {
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
      const stage = nubs.find((n) => n.y < feet - 24);
      const goalY = stage ? stage.y : topY;
      goalX = stage ? stage.x + stage.w / 2 : targetX;
      // How close to the exit the policy stops bouncing and starts creeping.
      // Wide, because the last kick has to *arrive* at cornice height: taken
      // from a body length too low it lands under the cornice's lip and the
      // whole ascent is thrown away.
      const nearTop = feet <= goalY + 150;
      // Is there anything to kick *to*? Columns in a shaft do not always start
      // at the same height — the one the corridor below crosses begins higher —
      // so the bottom of a chimney is often a single face, and kicking off it
      // there just throws the penguin into the void.
      const opposite = solids.some(
        (o) =>
          o.climb &&
          o.y < feet - 10 &&
          o.y + o.h > feet - p.h &&
          (p.wallSide > 0 ? o.x + o.w < p.x + 8 : o.x > p.x + p.w - 8) &&
          Math.abs(o.x + o.w / 2 - (p.x + p.w / 2)) < 260,
      );
      // Already on the column you are topping out on, with the head in
      // sight: kicking off it now throws away the one hold that ends the
      // climb. Pull over instead. Without this the search happily bounced two
      // hundred pixels above the exit and reported the shaft impossible —
      // it had been *at* the exit, on the right wall, and let go of it.
      const onHead = chimney && !stage && p.wallSide === headSide;
      if (chimney && opposite && !(nearTop && (mode === 'creep' || onHead))) {
        // Kick. Off it goes toward the other wall, so that is where to steer —
        // unless the cornice is now the thing within reach.
        jumpPressed = true;
        seek = -p.wallSide;
        finishing = feet <= goalY + 110;
      } else {
        jumpHeld = true; // creep, or pull over the top of a single face
      }
    } else if (p.onGround) {
      if (landedOn(p, b)) {
          probe.stepFloor = floor;
          return true;
        }
      // Breathe first. Standing on ice refills the bar, and setting off again
      // half-charged is how a climb that is comfortably inside the budget
      // fails: the wall is reachable, the arms are not.
      if (p.stamina < p.staminaMax * 0.92) {
        axis = 0;
        swingTo(solids, t);
        p.update(STEP, { axis: 0, jumpHeld: false, jumpPressed: false, push: 0, gravity: hushAt(def.zones, p.x + p.w / 2, p.y + p.h / 2) }, solids, TUNING);
        t += STEP;
        continue;
      }
      // Standing on the head of the wall it just pulled over. The exit is at
      // the same height — but with the mouth of the shaft in between, so this
      // is a jump across, not a stroll. Walking is only right when already
      // over the thing being aimed at.
      if (p.y + p.h <= topY + 4) {
        axis = Math.sign(targetX - (p.x + p.w / 2)) || seek;
        const over = p.x + p.w > b.x - 4 && p.x < b.x + b.w + 4;
        if (!over) {
          jumpPressed = true;
          holdUntil = t + 0.4;
        }
      } else {
        // A rest ledge inside the shaft: breathe, then go again — but leave
        // from under the opening, the way the shaft was entered in the first
        // place. Launching straight up beside a column just bumps its face.
        const cx = p.x + p.w / 2;
        if (Math.abs(approachX - cx) > 14) {
          axis = Math.sign(approachX - cx);
        } else {
          jumpPressed = true;
          holdUntil = t + 0.5;
          axis = seek;
        }
      }
    } else {
      // Airborne between two walls: keep holding toward the one being reached
      // for, the whole way. Steering back toward the exit halfway across the
      // shaft is how you miss the far wall and fall down the middle of it.
      const cx = p.x + p.w / 2;
      axis = finishing ? Math.sign(goalX - cx) || seek : seek;
      jumpHeld = t < holdUntil;
    }

    swingTo(solids, t);
    p.update(STEP, { axis, jumpHeld, jumpPressed, push: 0, gravity: hushAt(def.zones, p.x + p.w / 2, p.y + p.h / 2) }, solids, TUNING);
    floor = Math.min(floor, p.staminaFrac);
    t += STEP;

    if (p.y < (probe.best ?? Infinity)) probe.best = Math.round(p.y);
    if (probe.trace && i % 4 === 0) {
      probe.log.push(
        `${t.toFixed(2)} cx${Math.round(p.x + p.w / 2)} y${Math.round(p.y)} vy${Math.round(p.vy)} ` +
          `g${p.onGround ? 1 : 0} c${p.clinging ? p.wallSide : 0} m${p.mantling ? 1 : 0} s${p.stamina.toFixed(1)} ` +
          `on${p.groundFloe ? Math.round(p.groundFloe.x) + '..' + Math.round(p.groundFloe.x + p.groundFloe.w) : '-'}`,
      );
    }
    if (drowned(p, def)) return false;
    if (landedOn(p, b)) {
      probe.stepFloor = floor;
      return true;
    }
    // Generous, because an attempt is a whole session on one wall: fall, land,
    // get the bar back, go again. Simulated seconds are almost free — the whole
    // suite runs in a few real ones — and a cap that cuts a climb two pixels
    // from the top reports a passable route as impossible.
    // Generous: an attempt is a whole session on one wall — fall, land, get the
    // bar back, go again — and a cap that cuts a climb two pixels from the top
    // reports a passable route as impossible.
    if (t > 60) return false;
  }
  return gripped && landedOn(p, b);
}

const FROMS = [0.15, 0.3, 0.5, 0.7, 0.85];
const DELAYS = [0, 0.06, 0.12, 0.2, 0.3, 0.42, 0.6, 0.8];
// Including some very short ones: a clipped jump has a much lower arc, and
// under a ledge that is the only jump that fits.
// The long one is for the hush. Every other jump in this chapter is over in
// two thirds of a second, so half a second of hold was effectively "all the
// way up"; inside a band of dead air the same jump lasts a second and a half,
// and half a second of hold is a jump cut two thirds of the way through the
// climb. The first hush tower was declared unsolvable by thirteen pixels for
// exactly that reason — the search could not express the input a player would
// obviously use, which is to keep holding it.
const HOLDS = [1.1, 0.5, 0.34, 0.22, 0.15, 0.1];
const MODES = ['kick', 'creep'];

/**
 * Measure mode (`--measure`).
 *
 * Run the search without letting it stop at the first answer and it reports
 * *how many* answers there are. That fraction is the closest thing this project
 * has to a number for difficulty, and it means the same thing in every chapter:
 * a step a hundred inputs can do is generous, a step two can do is a wall, and
 * both are equally passable. Collected by `tools/difficulty.mjs`.
 */
const MEASURE = process.argv.includes('--measure');

function solveStep(def, solids, a, b, probe = {}) {
  let ok = 0;
  let tried = 0;
  let hit = null;
  if (b.via === 'swing') {
    // A whole period of waits, so no phase of the swing is assumed.
    const period = b.swing?.period ?? 1.8;
    for (let k = 0; k < 24; k++) {
      for (const hold of [0.16, 0.26, 0.4]) {
        tried++;
        const wait = (k / 24) * period * 2;
        if (trySwing(def, solids, a, b, { wait, hold })) {
          hit ??= { wait, hold };
          if (!MEASURE) return hit;
          ok++;
        }
      }
    }
    probe.width = tried ? ok / tried : 0;
    return hit;
  }
  if (b.via === 'jump') {
    for (const from of FROMS) {
      for (const delay of DELAYS) {
        for (const hold of HOLDS) {
          tried++;
          if (tryJump(def, solids, a, b, { from, delay, hold })) {
            hit ??= { from, delay, hold };
            if (!MEASURE) return hit;
            ok++;
          }
        }
      }
    }
    probe.width = tried ? ok / tried : 0;
    return hit;
  }
  for (const from of FROMS) {
    for (const delay of DELAYS) {
      for (const mode of MODES) {
        for (const first of [1, -1]) {
          tried++;
          if (tryWall(def, solids, a, b, { from, delay, mode, first }, probe)) {
            hit ??= { from, delay, mode, first };
            probe.spare = Math.min(probe.spare ?? 1, probe.stepFloor ?? 1);
            if (!MEASURE) return hit;
            ok++;
          }
        }
      }
    }
  }
  probe.width = tried ? ok / tried : 0;
  return hit;
}

/* ------------------------------------------------------------------ */

if (!MEASURE) {
  console.log('Tırmanışlar gerçek fizikle deneniyor...\n');
  console.log('(Sadece yayındaki bölümler. climb.js\'te ship:false olanlar,');
  console.log(' bu çözücü bir yol bulana kadar oyuna girmiyor.)\n');
}

let failed = 0;
let held = 0;
let steps = 0;
const t0 = Date.now();

// `--all` also runs the plans that are still held back, so they can be worked
// on. Their failures are reported but do not fail the build: they are not in
// the game, and the whole point of holding them back is that they are known to
// be unfinished.
const draft = process.argv.includes('--all');
const suite = draft ? CLIMB_DRAFTS : CLIMB_LEVELS;

for (const def of suite) {
  const solids = solidsOf(def);
  const route = def.route;
  const bad = [];
  const widths = [];
  const bars = [];
  
  for (let i = 1; i < route.length; i++) {
    steps++;
    const probe = {};
    const trace = process.argv.find((a) => a.startsWith('--trace='));
    if (trace && trace.slice(8) === `${def.id},${i}`) {
      probe.trace = true;
      probe.log = [];
    }
    const found = solveStep(def, solids, route[i - 1], route[i], probe);
    if (MEASURE && found) {
      widths.push(probe.width ?? 1);
      if (probe.spare != null) bars.push(probe.spare);
    }
    if (probe.trace) console.log(probe.log.slice(-60).join('\n'));
    if (!found) bad.push(`${i}. adım (${route[i].via}) yapılamıyor: y ${route[i - 1].y} → ${route[i].y} (en yüksek ${probe.best ?? '-'})`);
  }
  if (MEASURE) {
    const tight = widths.length ? Math.min(...widths) : 0;
    // The lowest the bar got on any step of this climb, which is the chapter's
    // own resource reading and the number `effort` actually moves.
    const spare = bars.length ? Math.min(...bars) : 1;
    console.log(`MEASURE ${def.id} ${tight.toFixed(4)} ${spare.toFixed(4)} ${widths.length}`);
    continue;
  }
  if (!bad.length && process.argv.includes('--list')) console.log(`GECTI ${def.id} ${def.name}`);
  if (bad.length) {
    if (def.ship !== false) failed += bad.length;
    else held += bad.length;
    console.log(`${def.ship === false ? '·' : '✗'} ${def.id}. ${def.name}${def.ship === false ? ' (yayında değil)' : ''}`);
    for (const line of bad) console.log(`    ${line}`);
  }
}

if (MEASURE) process.exit(0);

console.log(`\n${steps} adım denendi, ${((Date.now() - t0) / 1000).toFixed(1)} sn`);
if (held) console.log(`${held} adım, henüz yayına girmemiş planlarda.`);
if (failed) {
  console.log(`✗ ${failed} adım geçilemedi.`);
  process.exit(1);
}
console.log('✓ Her adım gerçek fizikle geçildi — eşyasız, yeteneksiz penguenle.');
