/**
 * Can anybody actually walk the shelf?
 *
 * The mountain, the sea and the arena each have a solver that drives the real
 * `Player` against the real level data and searches for inputs that work. The
 * first chapter never had one: it had `validate-levels.mjs`, which proves every
 * gap is inside the penguin's reach and is a claim about arithmetic.
 *
 * Arithmetic is not enough, and the thing that proved it was a bug report. The
 * spawn was placed a hard-coded eighty pixels into the first floe. That was
 * fine while first floes were two hundred and fifty pixels wide; after they
 * were narrowed the opening became a third of a second of reaction time, on a
 * level that starts from rest with nothing on screen yet. Every gap was inside
 * reach and the level still killed you before you had read it. No amount of
 * checking distances finds that, because the distance was never wrong.
 *
 * So this walks the route. From the real spawn, with the real physics, hop by
 * hop, searching where to leave from, when to jump and how long to hold. A step
 * that survives no attempt is a step nobody can do.
 *
 * What it deliberately does not simulate: hazard timing. Whether a geyser is
 * mid-blast or an orca is mid-leap is a question about clocks, and the clocks
 * are checked in `validate-levels.mjs`. This is about whether the ground is
 * reachable at all.
 */

import { Player } from '../src/game/player.js';
import { WIND, windAt, scaleForLevel, PHYS, PENGUIN, hushAt} from '../src/game/config.js';
import { LEVELS } from '../src/game/levels.js';
import { generateLevel } from '../src/game/generator.js';

const STEP = 1 / 120;
const TUNING = { coyote: 1 };

/**
 * How long the opening has to last.
 *
 * The player starts from rest, looking at a screen they have not read yet, and
 * the first thing they do is press a direction. Anything under half a second
 * before the ground runs out is not a difficulty, it is an ambush by geometry.
 */
const OPENING_BEAT = 0.55;

function solidsOf(def) {
  const floes = def.floes
    .filter((f) => f.type !== 'snap')
    .map((f) => ({ ...f, h: f.h ?? 20, solid: true, dx: 0, dy: 0, slippery: f.type === 'slip' }));
  const rock = (def.terrain ?? []).map((t) => ({ ...t, solid: true, dx: 0, dy: 0, type: 'rock' }));
  return [...floes, ...rock];
}

function makePlayer(def, x, surfaceY, { centred = false } = {}) {
  const p = new Player();
  p.setScale(def.scale ?? scaleForLevel(def.id));
  p.boost = { jump: 0, speed: 0, grip: 0, wind: 0 };
  p.gear = { wings: 0, rocket: 0 };
  p.glideBonus = 0;
  // `reset` centres the body on x, which is what the game does with a spawn.
  p.reset(centred ? x : x + p.w / 2, surfaceY);
  p.onGround = true;
  return p;
}

function landedOn(p, target) {
  if (!p.onGround) return false;
  if (Math.abs(p.y + p.h - target.y) > 4) return false;
  const overlap = Math.min(p.x + p.w, target.x + target.w) - Math.max(p.x, target.x);
  return overlap > 2;
}

/**
 * Everything the world would be doing to the penguin at this instant.
 *
 * This is a second implementation of what `World.update` works out for real,
 * which is a duplication worth being nervous about — and the hush proved it.
 * A pocket where gravity halves was added, every level containing one was
 * declared uncrossable, and the levels were fine: the solver had simply never
 * been told gravity could be anything but one number. The gravity term now
 * comes from `hushAt` in the config, which is the same function the world
 * itself calls, so that particular drift cannot happen twice.
 */
function forcesAt(def, p, t, dir) {
  let push = 0;
  let lift = 0;
  const gravity = hushAt(def.zones, p.x + p.w / 2, p.y + p.h / 2);
  const box = { x: p.x, y: p.y, w: p.w, h: p.h };
  for (const h of def.hazards ?? []) {
    if (h.kind !== 'storm' && h.kind !== 'gust') continue;
    const inside =
      box.x + box.w > h.x && box.x < h.x + h.w && box.y + box.h > h.y && box.y < h.y + h.h;
    if (!inside) continue;
    if (h.kind === 'gust') {
      if (!p.onGround) lift += h.power ?? WIND.lift;
      continue;
    }
    const signed = windAt(t / (h.period ?? WIND.period) + (h.phase ?? 0));
    const still = p.onGround && Math.abs(dir) < 0.01;
    const factor = p.onGround ? (still ? WIND.dugIn : WIND.ground) : 1;
    push += (h.power ?? WIND.power) * signed * (h.dir ?? 1) * factor;
  }
  return { push, lift, gravity };
}

/**
 * One attempt at one hop.
 *
 * `start` is where the body's left edge begins. Everything after take-off is
 * steering toward the target, which is what a player does.
 */
function tryHop(def, solids, a, b, { start, phase, delay, hold }, centred = false) {
  const p = makePlayer(def, start, a.y, { centred });
  const targetX = b.x + b.w / 2;
  let t = phase;
  let jumpedAt = null;
  let held = false;
  let elapsed = 0;

  for (let i = 0; i < 1400; i++) {
    const cx = p.x + p.w / 2;
    const dir = Math.sign(targetX - cx) || 1;
    const wantJump = jumpedAt === null && elapsed >= delay;
    if (wantJump) {
      jumpedAt = elapsed;
      held = true;
    }
    if (held && jumpedAt !== null && elapsed - jumpedAt > hold) held = false;

    const { push, lift, gravity } = forcesAt(def, p, t, dir);
    p.update(
      STEP,
      { axis: dir, jumpHeld: held, jumpPressed: wantJump, push, lift, gravity },
      solids,
      TUNING,
    );
    t += STEP;
    elapsed += STEP;

    if (p.y > def.waterY - p.h * 0.35) return false;
    if (landedOn(p, b)) return true;
    // Back on the ground short of the target: that attempt is spent.
    if (jumpedAt !== null && elapsed - jumpedAt > 0.35 && p.onGround) return false;
    if (elapsed > 9) return false;
  }
  return false;
}

/**
 * Sweep what a player can vary. Storm phase only matters where there is one,
 * and it has to cover a whole breath: sweeping a fraction of the cycle reports
 * a gap as impossible when the player only had to wait a second longer, which
 * is the solver being wrong about the level rather than the other way round.
 */
function search(def, solids, a, b, fixedStart = null) {
  const storm = (def.hazards ?? []).find((h) => h.kind === 'storm');
  const period = storm?.period ?? WIND.period;
  const phases = storm ? Array.from({ length: 16 }, (_, i) => (period * i) / 16) : [0];
  const starts =
    fixedStart != null ? [fixedStart] : [0.1, 0.3, 0.5, 0.7, 0.88, 0.97].map((f) => a.x + a.w * f);
  const step = MEASURE ? 0.1 : 0.05;
  let ok = 0;
  let tried = 0;
  let first = null;
  for (const phase of phases) {
    for (const start of starts) {
      for (let delay = 0; delay <= 1.3; delay += step) {
        for (const hold of [0.06, 0.12, 0.2, 0.3, 0.5, 1]) {
          tried++;
          if (tryHop(def, solids, a, b, { start, phase, delay, hold }, fixedStart != null)) {
            first ??= { start: Math.round(start), delay: +delay.toFixed(2), hold, phase };
            if (!MEASURE) return first;
            ok++;
          }
        }
      }
    }
  }
  return first ? { ...first, ok, tried } : null;
}

/**
 * Measure mode (`--measure`).
 *
 * The solver's job is to answer "is there a way". Run it without letting it
 * stop at the first one and it answers something more useful: *how many* ways
 * there are. That fraction is the closest thing this project has to a number
 * for difficulty, and unlike a gap width it means the same thing in every
 * chapter — a step a hundred inputs can do is generous, a step two can do is
 * a wall, and both are equally passable.
 *
 * Printed as machine-readable lines for `tools/difficulty.mjs` to collect.
 */
const MEASURE = process.argv.includes('--measure');

if (!MEASURE) console.log('Sahanlık rotası çözülüyor...\n');

let fails = 0;
let hops = 0;

/*
 * The handcrafted shelf, and a sample of the endless one behind it.
 *
 * Only the crafted levels used to be walked. Past seventy-six the game keeps
 * going for ever on generated levels, and those had the arithmetic proof and
 * nothing else — which is the wrong way round: a level nobody has ever looked
 * at is the one that most needs somebody to try walking it.
 *
 * Sampled by walking straight along the ids, not by striding through them.
 * The generator's names repeat every twenty, and the first version of this
 * sampled every fifth id — which is to say it aliased with that cycle exactly
 * and tested four of the twenty shapes forty times over while reporting a
 * spread from seventy-seven to two hundred and seventy-two.
 *
 * Two full cycles at the shallow end, and one more from past the far end of
 * the endless ramp, where the clocks are at their tightest.
 */
/*
 * `--sample=N` shortens the endless sample.
 *
 * The full sweep in `--measure` mode takes about forty minutes, which in
 * practice means the generator's difficulty gets argued about from memory
 * rather than re-measured after a change. A short sample is not a proof and is
 * not allowed to be one — the build always runs the whole thing — but it turns
 * "did that tighten anything?" into a question with an answer in seconds.
 */
const SAMPLE_ARG = process.argv.find((a) => a.startsWith('--sample='));
const SAMPLE_N = SAMPLE_ARG ? Number(SAMPLE_ARG.slice(9)) : null;
const SAMPLE = SAMPLE_N
  ? [
      ...Array.from({ length: Math.ceil(SAMPLE_N / 2) }, (_, i) => generateLevel(77 + i * 3)),
      ...Array.from({ length: Math.floor(SAMPLE_N / 2) }, (_, i) => generateLevel(296 + i * 3)),
    ]
  : [
      ...Array.from({ length: 40 }, (_, i) => generateLevel(77 + i)),
      ...Array.from({ length: 20 }, (_, i) => generateLevel(296 + i)),
    ];
const SUITE = [...LEVELS, ...SAMPLE.filter((d) => d.axis !== 'up' && !d.diving && !d.brawl)];

for (const def of SUITE) {
  const solids = solidsOf(def);
  const route = [...def.floes]
    .filter((f) => f.type !== 'snap')
    .sort((x, y) => x.x - y.x);
  const scale = def.scale ?? scaleForLevel(def.id);
  const body = PENGUIN.w * scale;
  const speed = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));

  const first = route.find((f) => def.spawn.x >= f.x && def.spawn.x <= f.x + f.w) ?? route[0];
  const problems = [];
  let tightest = 1;
  const widths = [];

  /* The opening. Measured from where the body's left edge starts, because that
     is the edge that decides when the penguin walks off. */
  const runway = first.x + first.w - (def.spawn.x - body / 2);
  const beat = runway / speed;
  if (beat < OPENING_BEAT) {
    problems.push(
      `açılış çok kısa: ${beat.toFixed(2)} sn (${Math.round(runway)}px), en az ${OPENING_BEAT} sn olmalı`,
    );
  }

  /* The route, hop by hop. The first hop starts from the real spawn, because
     that is the one hop the player does not get to choose a run-up for. */
  for (let i = route.indexOf(first); i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    if (b.x < a.x + a.w) continue; // overlapping pieces are one surface
    hops++;
    const fixedStart = i === route.indexOf(first) ? def.spawn.x : null;
    const found = search(def, solids, a, b, fixedStart);
    if (MEASURE && found) {
      tightest = Math.min(tightest, found.ok / found.tried);
      widths.push(found.ok / found.tried);
    }
    if (!found) {
      problems.push(
        `${i}→${i + 1} geçilemiyor (${Math.round(b.x - (a.x + a.w))}px boşluk, ` +
          `${Math.round(a.y - b.y)}px yükseliş, ${a.type}→${b.type})`,
      );
      // One impossible hop is enough; the rest of the level is unreachable.
      break;
    }
  }

  if (MEASURE) {
    const mean = widths.length ? widths.reduce((n, v) => n + v, 0) / widths.length : 1;
    console.log(`MEASURE ${def.id} ${tightest.toFixed(4)} ${mean.toFixed(4)} ${widths.length}`);
    continue;
  }
  if (problems.length) {
    fails += problems.length;
    console.log(`  ✗ L${def.id} (${def.name})`);
    for (const m of problems) console.log(`      ${m}`);
  } else {
    console.log(`  ✓ L${def.id} (${def.name})`);
  }
}

if (MEASURE) process.exit(0);

console.log(`\n${SUITE.length} bölüm (${LEVELS.length} el yapımı + ${SUITE.length - LEVELS.length} üretilmiş), ${hops} sıçrayış denendi.`);
if (fails) {
  console.log(`\n✗ ${fails} sorun.`);
  process.exit(1);
}
console.log('\n✓ Sahanlık baştan sona yürünebiliyor.');
