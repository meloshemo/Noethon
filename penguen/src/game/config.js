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

/** Physics. Asymmetric gravity (floaty rise, snappy fall) reads better. */
export const PHYS = {
  gravityUp: 1750,
  gravityDown: 2350,
  maxFall: 1250,
  moveSpeed: 262,
  groundAccel: 2800,
  airAccel: 1900,
  groundFriction: 2600,
  airFriction: 620,
  jumpVelocity: -740,
  /** Multiplier applied to upward velocity when jump is released early. */
  jumpCut: 0.42,
  /** Grace period to still jump after walking off a ledge. */
  coyoteTime: 0.14,
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
export const CRAFTED_LEVELS = 18;

/** Growth curve: how big the penguin is on a given level. */
export function scaleForLevel(level) {
  if (level <= 3) return 1;
  const t = Math.min(1, (level - 3) / 21);
  return +(1 + 0.62 * t).toFixed(3);
}

/** Star thresholds are per level; these are the fallbacks. */
export const STAR_RULES = {
  /** 2nd star: collect every fish. 3rd star: finish under target time. */
  defaultTarget: 30,
};
