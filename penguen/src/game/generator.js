/**
 * Endless mode: procedural levels beyond the handcrafted set.
 *
 * The generator is seeded by level number, so level 42 always looks the same
 * for everyone — it plays like an authored level, not like a lottery.
 *
 * It writes in exactly the same vocabulary the handcrafted levels do: it picks
 * segments — a shelf, a climb, a crevasse, a tunnel, a cliff — and lets the
 * composer place the geometry from the penguin's real reach at that level's
 * growth scale. That is what makes solvability structural rather than something
 * checked afterwards, and it is also why an endless level has the same kind of
 * variety a written one has: it is choosing sentences, not pixels.
 */

import { makeRng, clamp, lerp } from '../core/util.js';
import { scaleForLevel, CRAFTED_LEVELS, menaceFor, MENACE_CEILING } from './config.js';
import { Course } from './terrain.js';

const NAMES = [
  'Kırılma Hattı', 'Beyaz Gürültü', 'Soğuk Akıntı', 'Kutup Kuşağı', 'Donmuş Sessizlik',
  'Uzun Gece', 'Buz Denizi', 'Ayrılan Kıta', 'Son Işık', 'Rüzgâr Koridoru',
  'Derin Mavi', 'Çatlak Sesi', 'Kayan Raf', 'Buzul Kapısı', 'Yeni Kıyı',
  'Kırık Sırt', 'Karanlık Geçit', 'Yüksek Yamaç', 'Dipsiz Yarık', 'Buz Kapanı',
];

const NAMES_EN = [
  'Fracture Line', 'White Noise', 'Cold Current', 'The Polar Belt', 'Frozen Silence',
  'The Long Night', 'Ice Sea', 'The Parting Continent', 'Last Light', 'Wind Corridor',
  'Deep Blue', 'The Sound of Cracking', 'Sliding Shelf', 'Glacier Gate', 'New Shore',
  'Broken Ridge', 'Dark Passage', 'High Slope', 'Bottomless Rift', 'Ice Trap',
];

/** Weighted pick. A weight of zero removes an option entirely. */
function weighted(rng, table) {
  const total = table.reduce((n, [, w]) => n + w, 0);
  let r = rng() * total;
  for (const [value, w] of table) {
    if (w <= 0) continue;
    r -= w;
    if (r <= 0) return value;
  }
  return table[0][0];
}

/**
 * The ice mix for one shelf.
 *
 * Solid ice never leaves the table, and two givers-way never come back to back:
 * a level made entirely of things that vanish is not difficult, it is a slot
 * machine, and the player cannot learn anything from losing to it.
 */
function iceTypes(rng, d, n) {
  const table = [
    ['solid', lerp(1, 0.45, d)],
    ['crack', lerp(0.18, 0.4, d)],
    ['slip', lerp(0.12, 0.22, d)],
    ['melt', lerp(0.05, 0.14, d)],
    ['fall', lerp(0.03, 0.18, d)],
    ['trap', lerp(0.02, 0.22, d)],
    // Ice that looks solid and is not. Only in the back half: it is the one
    // type a player cannot read, so it has to arrive after they have learned
    // that reading the ice normally works.
    ['fake', d > 0.35 ? lerp(0, 0.26, d) : 0],
  ];
  const risky = (x) => ['crack', 'trap', 'fall', 'melt', 'fake'].includes(x);
  // Timing ice needs somewhere to wait out its cycle, and you cannot hold a
  // position on polished ice — so melting ice may only follow ice you can
  // stand still on.
  const waitable = (x) => x === 'solid' || x === undefined;
  const out = [];
  for (let i = 0; i < n; i++) {
    let t = weighted(rng, table);
    const prev = out[out.length - 1];
    if (risky(prev) && risky(t)) t = 'solid';
    if (t === 'melt' && !waitable(prev)) t = 'solid';
    out.push(t);
  }
  // The first floe of a shelf is reached from whatever came before, which the
  // shelf itself cannot see.
  if (out[0] === 'melt') out[0] = 'solid';
  return out;
}

/**
 * @param {number} id level number, also the seed
 * @param {{seed?:number, difficulty?:number, scale?:number, name?:string,
 *          subtitle?:string, daily?:boolean}} [opts]
 */
export function generateLevel(id, opts = {}) {
  const rng = makeRng(opts.seed ?? id * 7919 + 13);
  const scale = opts.scale ?? scaleForLevel(id);
  /** Ramps over 20 generated levels, then plateaus. */
  const d = opts.difficulty ?? clamp((id - CRAFTED_LEVELS) / 20, 0, 1);
  /**
   * And what happens after the plateau.
   *
   * Measured over full cycles of the generator: from level ninety-seven
   * onwards every dial was flat. Hazard count, ice count, gap width, clock —
   * level nine hundred and seventy-seven was exactly level one hundred and
   * seventeen. The endless run stopped being a run after twenty levels.
   *
   * Geometry cannot be the answer; the widest gap out here is already exactly
   * what a running jump clears, which is the whole reason `menace` exists. So
   * the second ramp spends the two things that change no distance: the clock
   * a hazard runs on, up to the ceiling `validate-levels.mjs` proves hazard by
   * hazard, and the time a third star costs, which is a score and can tighten
   * for ever without any level becoming impossible.
   *
   * Slow on purpose — a hundred and eighty levels to walk from one end of it
   * to the other. It is the part of the game somebody is still playing in a
   * month, and it should still have somewhere to go when they get there.
   */
  const depth = opts.depth ?? clamp((id - CRAFTED_LEVELS - 20) / 180, 0, 1);

  /**
   * Raising the *floor* of a jump, which is the dial nobody had tried.
   *
   * Measured, the endless run is easier than the crafted chapter it comes
   * after — every one of sixty sampled levels, level three hundred and fifteen
   * included, landed looser than level thirty-one, and the average generated
   * level gives a jump more than twice the input tolerance the end of the
   * shelf does. That is not a contradiction of the note above: the widest gap
   * out here really is at the ceiling a running jump clears, and it cannot go
   * further.
   *
   * But a level is not its widest gap. The generator draws from a range, and
   * while the top of that range was pinned at the ceiling the *bottom* of it
   * never moved — so a deep endless level is a handful of hard jumps in a
   * field of trivial ones, and the mean says so. This closes the range from
   * below as the run goes on: the easiest jump on the course stops being easy,
   * and the hardest one does not move at all, so nothing gets closer to
   * impossible than the validator has already proved passable.
   *
   * Spent over the same hundred and eighty levels as the clock, and never past
   * `top`, which is a width the crafted chapter already uses.
   */
  const floorGap = (base, top) => lerp(base, top, depth);

  const c = new Course({ scale });

  // Always open on safe, level ice. Whatever the seed does afterwards, the
  // first seconds are somewhere to stand and read the course ahead.
  c.shelf({ n: 2, gap: 0.3, w: 200 });

  const segments = Math.round(lerp(5, 9, d));
  let storms = 0;
  let tunnels = 0;
  let hushes = 0;
  let lifts = 0;
  let baits = 0;

  for (let i = 0; i < segments; i++) {
    const kind = weighted(rng, [
      ['shelf', 1],
      ['climb', 0.8],
      ['descend', 0.5],
      ['cliff', lerp(0.25, 0.6, d)],
      ['crevasse', lerp(0.2, 0.55, d)],
      ['tunnel', tunnels < 2 ? lerp(0.25, 0.6, d) : 0],
      ['summit', lerp(0.15, 0.35, d)],
      ['geysers', lerp(0.05, 0.5, d)],
      ['orca', lerp(0.05, 0.45, d)],
      /**
       * The pieces the crafted shelf learned after this generator was written.
       *
       * Endless mode is where the player who finished all seventy-six actually
       * lives, and it had none of them: no dead air, no bait, no wind gate, no
       * rising column. That is the most loyal player in the game being handed
       * the poorest version of it — and the economy was just slowed down, so
       * they are going to be out here longer than before.
       *
       * Weighted low and rising with depth, and capped at one each per level:
       * these are events, and a course made of nothing but events is a course
       * with no rhythm to break.
       */
      ['hush', hushes < 1 ? lerp(0, 0.34, d) : 0],
      ['windGap', storms < 2 ? lerp(0, 0.3, d) : 0],
      ['updraft', lifts < 1 ? lerp(0, 0.28, d) : 0],
      ['bait', baits < 2 ? lerp(0.05, 0.4, d) : 0],
    ]);

    switch (kind) {
      case 'shelf': {
        const n = 2 + Math.floor(rng() * 3);
        const from = c.x;
        c.shelf({
          n,
          gap: floorGap(lerp(0.36, 0.5, d), 0.54) + rng() * 0.05,
          w: lerp(200, 145, d),
          types: iceTypes(rng, d, n),
        });
        // A storm needs a stretch of coast with shelter on it, which is exactly
        // what a shelf is — so it is the only segment one gets hung on.
        if (storms < 1 && d > 0.25 && rng() < 0.45) {
          c.storm(from, { period: 3.6 + rng() * 1.2 });
          storms++;
        }
        break;
      }
      case 'climb':
        c.slope({
          n: 3 + Math.floor(rng() * 2),
          rise: lerp(0.36, 0.5, d),
          gap: floorGap(lerp(0.34, 0.44, d), 0.5),
          w: lerp(175, 140, d),
        });
        break;
      case 'descend':
        c.slope({ n: 2 + Math.floor(rng() * 2), rise: -0.34, gap: floorGap(0.34, 0.48), w: lerp(185, 150, d) });
        break;
      case 'cliff':
        c.cliff({ drop: lerp(240, 400, d), ledges: 3 + Math.floor(rng() * 2), gap: floorGap(0.3, 0.46) });
        break;
      case 'crevasse':
        c.crevasse({
          pillars: 2 + Math.floor(rng() * 2),
          gap: lerp(0.5, 0.6, d),
          depth: 220 + Math.floor(rng() * 80),
        });
        break;
      case 'tunnel':
        c.tunnel({
          n: 4 + Math.floor(rng() * 3),
          headroom: lerp(126, 110, d),
          gap: floorGap(lerp(0.4, 0.46, d), 0.52),
          w: lerp(160, 140, d),
          icicles: d > 0.35 ? 2 + Math.floor(rng() * 2) : 0,
          types: d > 0.4 ? ['solid', 'crack'] : null,
        });
        tunnels++;
        break;
      case 'summit':
        c.summit({ height: lerp(180, 260, d), steps: 3, w: lerp(200, 165, d) });
        break;
      case 'geysers':
        c.geysers({ n: 2 + Math.floor(rng() * 2), rise: rng() < 0.5 ? 0.34 : 0, timed: d > 0.5 });
        break;
      case 'orca':
        c.orcaGap({ gap: lerp(0.5, 0.58, d), period: 3.4 - d * 0.6 });
        break;
      case 'hush':
        // The hollow sizes itself and finds its own altitude, so the generator
        // does not have to know how tall the arc is — which is the whole
        // reason that logic lives in the verb rather than in the plans.
        c.hush({});
        hushes++;
        break;
      case 'windGap':
        c.windGap({ w: lerp(220, 190, d) });
        storms++;
        break;
      case 'updraft':
        c.updraft({ w: lerp(200, 175, d) });
        lifts++;
        break;
      case 'bait':
        c.bait();
        baits++;
        break;
      default:
        break;
    }

    // Seals patrol solid ice, so one goes on whatever was just laid down.
    if (d > 0.2 && rng() < lerp(0.12, 0.4, d)) c.seal(undefined, { speed: 62 + d * 30 });
  }

  c.landing({ w: 220 });

  // Pickups last, once the shape of the course is known.
  c.scatterFish(3, 62);
  if (rng() < lerp(0.4, 0.85, d)) c.sprint(0.3 + rng() * 0.4);
  /*
   * The curses that mean something on open ice, and only those.
   *
   * Written out rather than taken from `ROT`, and this is the one place where
   * a hand-kept list is right: the newer curses are aimed at the answers other
   * chapters have — a wall to hold, lungs to count, cover to stand behind —
   * and none of those exist out here. A bait that costs nothing where it is
   * dropped is worse than no bait, because the player learns the fish is
   * harmless and then eats one in a chapter where it is not.
   *
   * `stiff` makes the cut because the wings and the motor are used everywhere,
   * and taking them away is a real problem on the shelf's longest gaps.
   */
  const kinds = ['heavy', 'slick', 'dizzy', 'blind', 'stiff'];
  const rots = Math.round(lerp(0, 2.6, d));
  for (let i = 0; i < rots; i++) {
    c.temptation(0.25 + (i + rng() * 0.5) * 0.26, kinds[Math.floor(rng() * kinds.length)]);
  }

  /**
   * And one charged fish, off the line, from halfway up the difficulty band.
   *
   * The same rule as everywhere else: never on the running line, never
   * required, and priced by which one it is. A generated level that could not
   * offer the game's most interesting pickup was a generated level pretending
   * to be an easier game than the one it came from.
   */
  if (d > 0.35 && rng() < lerp(0.2, 0.6, d)) {
    const colours = ['coil', 'quantum', 'slack'];
    c.charged(0.3 + rng() * 0.45, colours[Math.floor(rng() * colours.length)]);
  }
  // Checkpoints thin out as levels get harder: the point of a hard level is
  // that losing it costs something.
  const cps = d > 0.55 ? 1 : 2;
  for (let i = 0; i < cps; i++) c.checkpoint(c.at((i + 1) / (cps + 1)));

  const def = c.build({
    id,
    name: opts.name ?? NAMES[Math.abs(id - CRAFTED_LEVELS - 1) % NAMES.length],
    subtitle: opts.subtitle ?? `Sonsuz kaçış, bölüm ${id}`,
    en: opts.en ?? {
      name: NAMES_EN[Math.abs(id - CRAFTED_LEVELS - 1) % NAMES_EN.length],
      subtitle: `Endless escape, level ${id}`,
    },
    intro: null,
    generated: true,
    daily: opts.daily ?? false,
    /** Explicit growth size — the daily has no place on the campaign curve. */
    scale,
    target: Math.round(lerp(55, 95, d) * lerp(1, 0.82, depth)),
    fog: d > 0.55 && id % 4 === 0 ? 0.45 : 0,
  });
  def.signs = [];
  /**
   * Endless levels run on the same clock ramp as the crafted ones.
   *
   * Tied to the generator's own difficulty rather than to a level number,
   * because there is no last level out here to ramp toward — `d` is already
   * the curve, climbing with depth and flattening off. A generated level was
   * running at the pace of level one while sitting past level seventy-six,
   * which made the endless mode a step *down* from the level the player had
   * just finished.
   */
  def.menace = Math.min(
    MENACE_CEILING,
    +(menaceFor(d) + (MENACE_CEILING - menaceFor(1)) * depth).toFixed(3),
  );
  return def;
}

/**
 * The daily challenge: one level a day, the same for everybody, seeded from the
 * date rather than from a level number.
 */
export function generateDailyLevel(dateKey) {
  const seed = [...dateKey].reduce((n, c) => (n * 33 + c.charCodeAt(0)) >>> 0, 5381);
  // The date also nudges the difficulty a little, so days aren't identical in
  // feel — but only within a narrow band.
  const wobble = ((seed % 100) / 100) * 0.25;
  return generateLevel(-1, {
    seed,
    difficulty: 0.55 + wobble,
    // The endless run's second ramp is about how deep *you* are into it. The
    // daily is one level that everybody plays on the same day, so it sits
    // where the wobble puts it and nowhere else.
    depth: 0,
    scale: scaleForLevel(CRAFTED_LEVELS),
    name: 'Günün Bölümü',
    subtitle: dateKey,
    en: { name: 'Level of the Day', subtitle: dateKey },
    daily: true,
  });
}
