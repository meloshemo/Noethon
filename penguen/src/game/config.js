/**
 * Global tuning constants.
 *
 * Everything that affects "game feel" lives here so it can be tuned in one
 * place. Units are pixels and seconds unless stated otherwise.
 */

/**
 * Logical render resolution.
 *
 * Mutable on purpose: the renderer rewrites w/h on every resize so the view
 * matches the device's aspect ratio exactly. That means no black bars — a wide
 * screen simply sees more of the level, a tall one sees more sky.
 * `h` stays the anchor, so the penguin is the same size on every device.
 */
export const VIEW = { w: 960, h: 540 };

/** Bounds the adaptive viewport so no device gets an unfair field of view. */
export const VIEW_LIMITS = { minW: 720, maxW: 1440, minH: 440, maxH: 900, baseH: 540 };

/**
 * Physics.
 *
 * Tuned for a *snappy* game: high speed, hard gravity, short airtime. The
 * penguin covers more ground per jump than before while spending noticeably
 * less time floating, which is what makes the game feel fast rather than
 * merely quick. Gravity is asymmetric (lighter on the way up, heavy on the way
 * down) — the classic platformer trick that makes a jump feel decisive.
 */
export const PHYS = {
  gravityUp: 2150,
  gravityDown: 3100,
  maxFall: 1500,
  moveSpeed: 320,
  groundAccel: 4200,
  airAccel: 2700,
  groundFriction: 3600,
  airFriction: 780,
  jumpVelocity: -780,
  /** Multiplier applied to upward velocity when jump is released early. */
  jumpCut: 0.34,
  /** Grace period to still jump after walking off a ledge. */
  coyoteTime: 0.13,
  /** Jump presses are remembered this long before touching ground. */
  jumpBuffer: 0.15,
  /** Friction multiplier while standing on slippery ice. */
  slipFriction: 0.12,
};

/** Base penguin size at growth scale 1.0. */
export const PENGUIN = {
  w: 30,
  h: 34,
  /** Growth makes the bird heavier: jump and speed shrink slightly. */
  jumpPenaltyPerScale: 0.11,
  speedPenaltyPerScale: 0.08,
};

/** Water line offset from the bottom of a level's world height. */
export const WATER_MARGIN = 70;

/** Timings for the different ice behaviours (seconds). */
export const ICE = {
  /** "crack": time between first touch and collapse. */
  crackDelay: 0.85,
  /** "trap": looks solid, gives way almost immediately. */
  trapDelay: 0.22,
  /** How long a broken floe stays gone before drifting back. */
  respawn: 2.6,
  /** Shake amplitude while a floe is cracking. */
  shake: 2.2,
  /** "burst": warning time before the geyser fires. */
  burstWarn: 0.5,
  /** "burst": how hard it throws the penguin. */
  burstUp: -1180,
  burstSide: 210,
  /** "snap": how close to landing the ice waits before vanishing. */
  snapTrigger: 0.26,
  /** "snap": stays gone this long, so the retry is a fair one. */
  snapRespawn: 1.5,
};

/** Assist mode is offered after this many deaths on the same level. */
export const ASSIST_AFTER_DEATHS = 4;

/** Multipliers applied when assist mode is on. */
export const ASSIST = {
  crackDelay: 1.9,
  coyoteTime: 1.8,
  hazardSpeed: 0.72,
};

/** Handcrafted levels end here; beyond this the generator takes over. */
export const CRAFTED_LEVELS = 30;

/** Growth curve: how big the penguin is on a given level. */
export function scaleForLevel(level) {
  if (level <= 3) return 1;
  const t = Math.min(1, (level - 3) / 30);
  return +(1 + 0.62 * t).toFixed(3);
}

/** Star thresholds are per level; these are the fallbacks. */
export const STAR_RULES = {
  /** 2nd star: collect every fish. 3rd star: finish under target time. */
  defaultTarget: 30,
};

/* ------------------------------------------------------------------ */
/* Economy                                                             */
/* ------------------------------------------------------------------ */

/**
 * Fish are the currency. They come from three places, and the split matters:
 * levels pay for playing, stars pay for playing *well*, and missions pay for
 * coming back. A shop with only one income source stops mattering fast.
 */
export const REWARDS = {
  /** Per fish picked up in a level. */
  perFish: 3,
  /** First time a level is cleared. */
  firstClear: 12,
  /** Per new star earned (never paid twice for the same star). */
  perStar: 8,
  /** Clearing without a single death. */
  flawless: 15,
  /** Daily challenge completion. */
  daily: 40,
  /** Bonus per consecutive day, capped. */
  streakStep: 5,
  streakCap: 50,
};

/**
 * Shop upgrades.
 *
 * Every one of these makes the penguin better, never the level easier — the
 * level validator runs against *base* stats, so no level is ever gated behind
 * a purchase. Upgrades buy comfort and speed, not access.
 */
export const UPGRADES = [
  {
    id: 'boots',
    name: 'Kar Botu',
    blurb: 'Daha yükseğe ve daha uzağa zıpla.',
    icon: 'boot',
    levels: [
      { cost: 60, effect: 0.05, label: '+%5 zıplama' },
      { cost: 150, effect: 0.1, label: '+%10 zıplama' },
      { cost: 320, effect: 0.16, label: '+%16 zıplama' },
    ],
  },
  {
    id: 'speed',
    name: 'Hızlı Ayak',
    blurb: 'Buz üstünde daha çevik koş.',
    icon: 'bolt',
    levels: [
      { cost: 55, effect: 0.05, label: '+%5 hız' },
      { cost: 140, effect: 0.1, label: '+%10 hız' },
      { cost: 300, effect: 0.15, label: '+%15 hız' },
    ],
  },
  {
    id: 'crampons',
    name: 'Krampon',
    blurb: 'Cilalı buzda kayma azalır.',
    icon: 'spike',
    levels: [
      { cost: 90, effect: 0.45, label: 'Kayma %45 az' },
      { cost: 220, effect: 0.75, label: 'Kayma %75 az' },
    ],
  },
  {
    id: 'down',
    name: 'Kalın Tüy',
    blurb: 'Her denemede bir kez ölümden kurtarır.',
    icon: 'shield',
    levels: [{ cost: 260, effect: 1, label: 'Denemede 1 can' }],
  },
  {
    id: 'magnet',
    name: 'Balık Mıknatısı',
    blurb: 'Balıklar sana doğru gelir.',
    icon: 'magnet',
    levels: [
      { cost: 110, effect: 90, label: '90px çekim' },
      { cost: 240, effect: 165, label: '165px çekim' },
    ],
  },
  {
    id: 'vest',
    name: 'Rüzgar Yeleği',
    blurb: 'Kutup rüzgarı seni daha az savurur.',
    icon: 'wind',
    levels: [{ cost: 180, effect: 0.55, label: 'Rüzgar %55 az' }],
  },
];

/** Look up the numeric effect of an owned upgrade level (0 when unowned). */
export function upgradeEffect(owned, id) {
  const spec = UPGRADES.find((u) => u.id === id);
  const lvl = owned?.[id] ?? 0;
  if (!spec || lvl <= 0) return 0;
  return spec.levels[Math.min(lvl, spec.levels.length) - 1].effect;
}
