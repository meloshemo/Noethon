/**
 * Endless mode: procedural levels beyond the handcrafted set.
 *
 * The generator is seeded by level number, so level 42 always looks the same
 * for everyone — it plays like an authored level, not like a lottery.
 *
 * Solvability is guaranteed by construction: every gap and every height change
 * is derived from the penguin's actual jump reach at that level's growth scale,
 * never from a raw random number.
 */

import { makeRng, clamp, lerp } from '../core/util.js';
import { PHYS, PENGUIN, ICE, scaleForLevel, CRAFTED_LEVELS } from './config.js';
import { GROUND_Y, WATER_Y } from './levels.js';

/** Analytical jump reach for a given growth scale. */
function jumpReach(scale) {
  const v = Math.abs(PHYS.jumpVelocity) * (1 - PENGUIN.jumpPenaltyPerScale * (scale - 1));
  const speed = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
  const tUp = v / PHYS.gravityUp;
  const height = (v * v) / (2 * PHYS.gravityUp);
  const tDown = Math.sqrt((2 * height) / PHYS.gravityDown);
  return { distance: speed * (tUp + tDown), height };
}

const NAMES = [
  'Kırılma Hattı', 'Beyaz Gürültü', 'Soğuk Akıntı', 'Kutup Kuşağı', 'Donmuş Sessizlik',
  'Uzun Gece', 'Buz Denizi', 'Ayrılan Kıta', 'Son Işık', 'Rüzgar Koridoru',
  'Derin Mavi', 'Çatlak Sesi', 'Kayan Raf', 'Buzul Kapısı', 'Yeni Kıyı',
];

/**
 * @param {number} id level number, also the seed
 * @param {{seed?:number, difficulty?:number, scale?:number, name?:string,
 *          subtitle?:string, daily?:boolean}} [opts]
 */
export function generateLevel(id, opts = {}) {
  const rng = makeRng(opts.seed ?? id * 7919 + 13);
  const scale = opts.scale ?? scaleForLevel(id);
  const reach = jumpReach(scale);

  // Difficulty ramps over 20 generated levels, then plateaus.
  const d = opts.difficulty ?? clamp((id - CRAFTED_LEVELS) / 20, 0, 1);

  // Capped well short of the theoretical maximum jump: a gap that only clears
  // with a perfect full-hold launch from the exact edge is not difficulty, it
  // is a tax on everyone. Late-game pressure comes from narrow floes, traps and
  // hazards instead.
  const maxGap = lerp(reach.distance * 0.6, reach.distance * 0.74, d);
  const minGap = lerp(reach.distance * 0.34, reach.distance * 0.5, d);
  const maxRise = reach.height * 0.5;
  const platCount = Math.round(lerp(9, 16, d));
  const minW = lerp(160, 105, d);
  const maxW = lerp(240, 150, d);

  const floes = [];
  const hazards = [];
  const fish = [];
  const checkpoints = [];

  // Always start on a big, safe floe.
  let x = 30;
  let y = GROUND_Y;
  floes.push({ x, y, w: 210, type: 'solid' });
  x += 210;

  let sinceSafe = 0;
  let lastRisky = null;

  const speed = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
  /**
   * Widest a floe with the given fuse can be before it becomes a death trap.
   * LANDING is how far in the player realistically touches down; they have to
   * be able to cross the rest before the ice goes.
   */
  const LANDING = 0.75;
  const walkable = (fuse) => (fuse * speed) / LANDING;

  for (let i = 0; i < platCount; i++) {
    let gap = lerp(minGap, maxGap, rng());
    // A short-fuse floe behind us means we took off from where we landed, so
    // the gap has to be shorter by the part of the floe we never got to use.
    const prev = floes[floes.length - 1];
    const prevFuse = prev.type === 'trap' ? ICE.trapDelay : prev.type === 'fall' ? 0.35 : null;
    if (prevFuse != null) gap = Math.min(gap, reach.distance * 0.8 - prev.w * LANDING);

    let w = Math.round(lerp(minW, maxW, rng()));
    x += gap;

    // Height change stays inside the jump arc, with a bias back toward ground.
    const drift = (rng() - 0.5) * 2 * maxRise;
    const pullBack = (GROUND_Y - y) * 0.35;
    y = clamp(Math.round(y + drift * 0.6 + pullBack), GROUND_Y - 150, GROUND_Y + 14);

    // A floe you can stand on indefinitely — needed before anything that has
    // to be timed, so the player has somewhere to wait for the right moment.
    const prevWaitable = prev.type === 'solid' || prev.type === 'move';
    const type = pickType(rng, d, sinceSafe, lastRisky, prevWaitable, prev.type === 'slip');
    // Traps and falling floes are stepping stones, never walkways.
    if (type === 'trap') w = Math.min(w, Math.floor(walkable(ICE.trapDelay)));
    else if (type === 'fall') w = Math.min(w, Math.floor(walkable(0.35)));
    // A geyser must be crossable end to end inside its warning, with margin.
    else if (type === 'burst') w = Math.min(w, Math.floor(ICE.burstWarn * speed * 0.82));

    // Landing on a narrow short-fuse floe needs precision, so never ask for a
    // maximum-distance jump to reach one.
    if (type === 'trap' || type === 'fall') {
      const comfortable = reach.distance * 0.6;
      if (gap > comfortable) x -= gap - comfortable;
    }

    const floe = { x: Math.round(x), y, w, type };

    if (type === 'move') {
      // A sideways-drifting floe changes the size of the gap, so it needs a
      // safe floe behind it to time the jump from; a bobbing one never does.
      const vertical = !prevWaitable || rng() < 0.5;
      floe.ax = vertical ? 0 : Math.round(lerp(70, 120, rng()));
      floe.ay = vertical ? Math.round(lerp(45, 80, rng())) : 0;
      floe.period = +lerp(2.6, 4.2, rng()).toFixed(2);
      floe.phase = +rng().toFixed(2);
      // A bobbing floe is at its highest at baseY - ay; keep even that within
      // the jump arc, so arriving at the wrong moment is never fatal. Re-clamp
      // afterwards — pushing it down must not sink it toward the water.
      if (floe.ay) {
        floe.y = Math.round(
          clamp(Math.max(floe.y, prev.y - maxRise + floe.ay), GROUND_Y - 150, GROUND_Y + 10),
        );
      }
    } else if (type === 'melt') {
      floe.meltPeriod = +lerp(2.6, 3.8, rng()).toFixed(2);
      floe.meltPhase = +rng().toFixed(2);
    } else if (type === 'burst') {
      // Half of them run on their own clock, which needs a safe floe to time
      // the approach from; the rest only fire when stepped on.
      if (prevWaitable && w >= 150 && rng() < 0.5) {
        floe.burstPeriod = +lerp(2.6, 3.6, rng()).toFixed(2);
        floe.burstPhase = +rng().toFixed(2);
      }
    } else if (type === 'crack') {
      // Long enough to walk the width of the widest floe the generator makes:
      // pressure should come from the layout, not from an uncrossable fuse.
      floe.delay = +lerp(1.2, 0.7, d).toFixed(2);
    }

    floes.push(floe);

    const risky = type !== 'solid' && type !== 'slip';
    sinceSafe = risky ? sinceSafe + 1 : 0;
    lastRisky = risky ? type : null;

    // Hazards: never on the first two floes, never stacked on a trap, and
    // never on a drifting floe — a seal does not ride the ice it stands on.
    if (i > 1 && type !== 'trap' && type !== 'move' && rng() < lerp(0.12, 0.4, d)) {
      hazards.push(makeHazard(rng, floe, d));
    }

    // Three fish per level, spread evenly across the run.
    const wantFish = Math.floor((i / platCount) * 3);
    if (fish.length === wantFish && wantFish < 3 && rng() < 0.55) {
      fish.push({ x: Math.round(floe.x - gap / 2), y: floe.y - Math.round(lerp(60, 110, rng())) });
    }

    // A checkpoint on a solid floe roughly every third of the way.
    if (type === 'solid' && checkpoints.length < 2 && i > platCount * (checkpoints.length + 1) * 0.33) {
      checkpoints.push({ x: Math.round(floe.x + w / 2), y: floe.y });
    }

    x += w;
  }

  // --- snapping bait ---------------------------------------------------
  // Dropped into gaps that are already jumpable, low and to the side, so it
  // reads as a helpful stepping stone and is never the actual route. The
  // validator enforces exactly that, so this only ever adds temptation.
  if (d > 0.25) {
    const baitCount = Math.round(lerp(0, 3, d));
    // Bait has to sit clearly below both neighbours (so it reads as a low
    // shortcut) and still clear of the sea. Gaps too near the water simply
    // don't get one.
    const BAIT_DROP = 42;
    const BAIT_FLOOR = WATER_Y - 30;
    const candidates = [];
    for (let i = 1; i < floes.length - 1; i++) {
      const a = floes[i];
      const b = floes[i + 1];
      const gap = b.x - (a.x + a.w);
      const y = Math.max(a.y, b.y) + BAIT_DROP;
      if (gap >= 110 && y <= BAIT_FLOOR) candidates.push({ a, b, gap, y });
    }
    for (let n = 0; n < baitCount && candidates.length; n++) {
      const pick = candidates.splice(Math.floor(rng() * candidates.length), 1)[0];
      const w = 70;
      const mid = pick.a.x + pick.a.w + (pick.gap - w) / 2;
      floes.push({ x: Math.round(mid), y: pick.y, w, type: 'snap' });
    }
    floes.sort((p, q) => p.x - q.x);
  }

  // Finish on a wide, safe floe so the last jump is never a coin flip.
  const tail = floes[floes.length - 1];
  const tailFuse = tail.type === 'trap' ? ICE.trapDelay : tail.type === 'fall' ? 0.35 : null;
  let finalGap = lerp(minGap, maxGap * 0.8, 0.4);
  if (tailFuse != null) finalGap = Math.min(finalGap, reach.distance * 0.8 - tail.w * LANDING);
  x += finalGap;
  y = clamp(y, GROUND_Y - 120, GROUND_Y);
  floes.push({ x: Math.round(x), y, w: 240, type: 'solid' });

  while (fish.length < 3) {
    const f = floes[Math.max(2, Math.floor(rng() * floes.length))];
    fish.push({ x: f.x + f.w / 2, y: f.y - 80 });
  }

  // --- orcas ------------------------------------------------------------
  if (d > 0.3) {
    const orcaCount = Math.round(lerp(0, 2.4, d));
    const solidFloes = floes.filter((f) => f.type !== 'snap');
    for (let n = 0; n < orcaCount; n++) {
      const i = 2 + Math.floor(rng() * Math.max(1, solidFloes.length - 4));
      const a = solidFloes[i];
      const b = solidFloes[i + 1];
      if (!a || !b) continue;
      const gap = b.x - (a.x + a.w);
      if (gap < 90) continue;
      const cx = a.x + a.w + gap / 2;
      if (hazards.some((h) => Math.abs((h.x ?? 0) - cx) < 200)) continue;
      hazards.push({
        kind: 'orca',
        x: Math.round(cx - 28),
        y: WATER_Y,
        w: 56,
        h: 120,
        height: Math.round(lerp(225, 255, rng())),
        period: +lerp(2.7, 3.6, rng()).toFixed(2),
        phase: +rng().toFixed(2),
      });
    }
  }

  // --- storms -----------------------------------------------------------
  // One at most, and only over a long enough stretch that there is somewhere
  // to stand and wait out a surge.
  if (d > 0.35 && rng() < 0.45) {
    const start = 2 + Math.floor(rng() * Math.max(1, floes.length - 6));
    const a = floes[start];
    const bIdx = Math.min(floes.length - 2, start + 3);
    const b = floes[bIdx];
    if (a && b && b.x + b.w - a.x > 380) {
      hazards.push({
        kind: 'storm',
        x: Math.round(a.x - 40),
        y: 110,
        w: Math.round(b.x + b.w - a.x + 80),
        h: 410,
        power: -Math.round(lerp(280, 340, rng())),
        period: +lerp(3.2, 3.8, rng()).toFixed(2),
        phase: +rng().toFixed(2),
      });
    }
  }

  // --- the speed fish ---------------------------------------------------
  // Always a detour: parked high over a floe, never on the running line.
  const speedFish = [];
  if (floes.length > 5) {
    const pool = floes.filter((f) => f.type !== 'snap' && f.w >= 120).slice(2, -1);
    if (pool.length) {
      const host = pool[Math.floor(rng() * pool.length)];
      speedFish.push({
        x: Math.round(host.x + host.w / 2 - 15),
        y: Math.round(host.y - lerp(78, 100, rng())),
      });
    }
  }

  return {
    id,
    speedFish,
    name: opts.name ?? NAMES[Math.abs(id - CRAFTED_LEVELS - 1) % NAMES.length],
    subtitle: opts.subtitle ?? `Sonsuz kaçış — bölüm ${id}`,
    intro: null,
    generated: true,
    daily: opts.daily ?? false,
    /** Explicit growth size — the daily has no place on the campaign curve. */
    scale,
    target: Math.round(lerp(45, 75, d)),
    worldW: Math.round(x + 300),
    fog: d > 0.55 && id % 4 === 0 ? 0.45 : 0,
    spawn: { x: 110, y: GROUND_Y },
    goal: { x: Math.round(x + 120), y },
    floes,
    hazards,
    fish,
    checkpoints,
  };
}

function pickType(rng, d, sinceSafe, lastRisky, prevWaitable, prevSlippery) {
  // Two risky floes in a row is the cap at low difficulty, three later.
  if (sinceSafe >= (d > 0.5 ? 3 : 2)) return rng() < 0.25 ? 'slip' : 'solid';
  const r = rng();
  const weights = [
    ['solid', lerp(0.42, 0.2, d)],
    ['crack', lerp(0.3, 0.3, d)],
    // Melting ice has to be timed, so it only ever follows a safe floe.
    ['melt', prevWaitable ? lerp(0.1, 0.16, d) : 0],
    ['move', lerp(0.1, 0.15, d)],
    ['slip', lerp(0.08, 0.08, d)],
    ['fall', lerp(0.0, 0.06, d)],
    // Geysers arrive late and stay rare — one per level is a threat, three is
    // a slot machine.
    ['burst', lerp(0.0, 0.1, d)],
    // Traps only appear once the player has met them, and never twice running.
    ['trap', lastRisky === 'trap' || prevSlippery ? 0 : lerp(0.0, 0.09, d)],
  ];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let acc = 0;
  for (const [type, w] of weights) {
    acc += w / total;
    if (r <= acc) return type;
  }
  return 'solid';
}

function makeHazard(rng, floe, d) {
  const roll = rng();
  // A seal blocks the floe it stands on, so it may only stand on ice that
  // isn't already counting down — dodging a patrol on breaking ice is not a
  // skill check, it's a stopwatch. Icicles and gusts act over the gap, so they
  // are fair anywhere.
  const standable = floe.type === 'solid' || floe.type === 'slip';
  if (roll < 0.42 || !standable) {
    return { kind: 'icicle', x: Math.round(floe.x + floe.w / 2), y: 130, w: 24, h: 46 };
  }
  if (roll < 0.74 && floe.w > 200) {
    // Patrol the left side only: the right-hand strip has to stay free so the
    // player can line up and launch the next jump without being swept.
    const left = floe.x + 30;
    const right = floe.x + floe.w - 80 - 44;
    if (right - left >= 60) {
      return {
        kind: 'seal',
        x: Math.round((left + right) / 2),
        y: floe.y - 30,
        w: 44,
        h: 30,
        range: Math.round((right - left) / 2),
        speed: Math.round(lerp(60, 105, d)),
      };
    }
  }
  return {
    kind: 'gust',
    x: Math.round(floe.x - 90),
    y: 150,
    w: 120,
    h: 360,
    power: Math.round(lerp(260, 360, rng())) * (rng() < 0.5 ? -1 : 1),
  };
}


/**
 * The daily challenge.
 *
 * Same generator, seeded by the calendar date, so every player gets exactly
 * the same level on the same day — which is what makes comparing times mean
 * anything. Difficulty sits at a fixed mid-high point rather than following
 * the campaign curve, so day one and day two are the same kind of test.
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
