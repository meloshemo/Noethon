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
import { scaleForLevel, CRAFTED_LEVELS } from './config.js';
import { Course } from './terrain.js';

const NAMES = [
  'Kırılma Hattı', 'Beyaz Gürültü', 'Soğuk Akıntı', 'Kutup Kuşağı', 'Donmuş Sessizlik',
  'Uzun Gece', 'Buz Denizi', 'Ayrılan Kıta', 'Son Işık', 'Rüzgâr Koridoru',
  'Derin Mavi', 'Çatlak Sesi', 'Kayan Raf', 'Buzul Kapısı', 'Yeni Kıyı',
  'Kırık Sırt', 'Karanlık Geçit', 'Yüksek Yamaç', 'Dipsiz Yarık', 'Buz Kapanı',
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

  const c = new Course({ scale });

  // Always open on safe, level ice. Whatever the seed does afterwards, the
  // first seconds are somewhere to stand and read the course ahead.
  c.shelf({ n: 2, gap: 0.3, w: 200 });

  const segments = Math.round(lerp(5, 9, d));
  let storms = 0;
  let tunnels = 0;

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
    ]);

    switch (kind) {
      case 'shelf': {
        const n = 2 + Math.floor(rng() * 3);
        const from = c.x;
        c.shelf({
          n,
          gap: lerp(0.36, 0.5, d) + rng() * 0.05,
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
          gap: lerp(0.34, 0.44, d),
          w: lerp(175, 140, d),
        });
        break;
      case 'descend':
        c.slope({ n: 2 + Math.floor(rng() * 2), rise: -0.34, gap: 0.34, w: lerp(185, 150, d) });
        break;
      case 'cliff':
        c.cliff({ drop: lerp(240, 400, d), ledges: 3 + Math.floor(rng() * 2), gap: 0.3 });
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
          gap: lerp(0.4, 0.46, d),
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
  const kinds = ['heavy', 'dizzy', 'blind'];
  const baits = Math.round(lerp(0, 2.6, d));
  for (let i = 0; i < baits; i++) {
    c.temptation(0.25 + (i + rng() * 0.5) * 0.26, kinds[Math.floor(rng() * kinds.length)]);
  }
  // Checkpoints thin out as levels get harder: the point of a hard level is
  // that losing it costs something.
  const cps = d > 0.55 ? 1 : 2;
  for (let i = 0; i < cps; i++) c.checkpoint(c.at((i + 1) / (cps + 1)));

  const def = c.build({
    id,
    name: opts.name ?? NAMES[Math.abs(id - CRAFTED_LEVELS - 1) % NAMES.length],
    subtitle: opts.subtitle ?? `Sonsuz kaçış — bölüm ${id}`,
    intro: null,
    generated: true,
    daily: opts.daily ?? false,
    /** Explicit growth size — the daily has no place on the campaign curve. */
    scale,
    target: Math.round(lerp(55, 95, d)),
    fog: d > 0.55 && id % 4 === 0 ? 0.45 : 0,
  });
  def.signs = [];
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
    scale: scaleForLevel(CRAFTED_LEVELS),
    name: 'Günün Bölümü',
    subtitle: dateKey,
    daily: true,
  });
}
