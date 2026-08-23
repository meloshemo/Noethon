/**
 * Global tuning constants.
 *
 * Everything that affects "game feel" lives here so it can be tuned in one
 * place. Units are pixels and seconds unless stated otherwise.
 */

import { clamp } from '../core/util.js';

/**
 * Logical render resolution.
 *
 * Mutable on purpose: the renderer rewrites w/h on every resize so the view
 * matches the device's aspect ratio exactly. That means no black bars — a wide
 * screen simply sees more of the level, a tall one sees more sky. What stays
 * constant is not a dimension but the scale it is drawn at, which is what
 * decides how big the penguin looks. `viewFor` below is where that is decided.
 */
export const VIEW = {
  w: 960,
  h: 540,
  /**
   * The strips of the view the interface is sitting on, in logical pixels.
   *
   * The heads-up display and the touch pads are drawn over the canvas, not
   * beside it, so the top and bottom of the view are not really the player's
   * to use. The camera reads these so it can keep the penguin out from under
   * them; the renderer measures them from the real elements, which is the only
   * way to get a number that already includes the phone's own safe areas.
   *
   * Zero off a screen — a test running in node has no interface to measure.
   */
  padTop: 0,
  padBottom: 0,
};

/**
 * Bounds the adaptive viewport so no device gets an unfair field of view.
 *
 * minW is what a portrait phone falls back to. Lower is a narrower view of the
 * level but a bigger picture, and in portrait the width is what limits the
 * scale — at 720 the game only filled about two thirds of the screen.
 */
export const VIEW_LIMITS = {
  minW: 600,
  maxW: 1900,
  minH: 440,
  /**
   * A target, not a ceiling. A phone held upright hits `minW` first, and the
   * sky it is then really showing is taller than this — see `viewFor`.
   */
  maxH: 900,
  baseH: 540,
  /** The shape the game is framed for. */
  wide: 16 / 9,
  /** How much of a wider-than-framed screen is spent on seeing further. */
  wideGain: 1,
  /** Past this much extra width the trade stops. */
  wideCap: 1.35,
};

/**
 * The logical view a stage of this size should show.
 *
 * The old rule fixed the height at 540 and let the width follow the aspect,
 * which is right up to 16:9 and wrong past it. A phone held sideways is
 * 2.16:1, so every one of those extra pixels went into width — width that a
 * climbing level, already narrower than the screen, cannot use. The margins
 * filled with empty sky while the ledge you were jumping to sat above the top
 * edge of the screen. Sideways you saw two platforms; upright, holding the
 * same phone, you saw six.
 *
 * So past 16:9 the extra width buys height as well, up to a third more of the
 * world. That is roughly the point where the penguin is the same size on
 * screen sideways as it is upright, which is the property a player actually
 * notices when they rotate the phone.
 *
 * Returns logical pixels. Exported rather than inlined in the renderer so a
 * test can check the framing without a browser.
 */
export function viewFor(cw, ch) {
  const L = VIEW_LIMITS;
  const aspect = cw / ch;
  if (!Number.isFinite(aspect) || aspect <= 0) return { w: VIEW.w, h: VIEW.h };

  const wide = clamp(aspect / L.wide, 1, L.wideCap);
  const want = L.baseH * (1 + L.wideGain * (wide - 1));

  // Height first, width from the aspect, then height again — because the width
  // clamp can bind on an extreme screen, and when it does the height has to
  // follow it.
  let h = clamp(want, L.minH, L.maxH);
  const w = clamp(h * aspect, L.minW, L.maxW);
  h = clamp(w / aspect, L.minH, L.maxH);

  // A clamp that bound leaves a box that is no longer the shape of the screen
  // — a portrait phone asks for 249 units of width and is given 600. The
  // canvas is not letterboxed, though: it is drawn edge to edge at one uniform
  // scale, so those extra units are on the screen whether or not the box
  // admits them. Grow the box back out to what is genuinely visible.
  //
  // This is not cosmetic. VIEW is what the camera clamps against, and a view
  // that under-reported its own height by four hundred units let the camera
  // scroll a phone held upright well past the bottom of the level, into water
  // with nothing in it.
  const scale = Math.min(cw / w, ch / h);
  return { w: Math.round(cw / scale), h: Math.round(ch / scale) };
}

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

/**
 * How far the penguin can jump, from the physics rather than from playtesting.
 *
 * This is the number every level in the game is measured against — the
 * composer places floes with it, the generator sizes its gaps with it and the
 * validator fails the build when a level asks for more than it. One definition,
 * so those three can never drift apart.
 *
 * `maxHeight` caps the apex, which is what a ceiling does: under a low roof the
 * penguin cannot take the full arc, so it cannot jump as far either. Passing it
 * is how a tunnel gets measured honestly.
 */
export function reachFor(scale, maxHeight = Infinity) {
  const v = Math.abs(PHYS.jumpVelocity) * (1 - PENGUIN.jumpPenaltyPerScale * (scale - 1));
  const speed = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
  const full = (v * v) / (2 * PHYS.gravityUp);
  const height = Math.max(0, Math.min(full, maxHeight));
  const tUp = Math.sqrt((2 * height) / PHYS.gravityUp);
  const tDown = Math.sqrt((2 * height) / PHYS.gravityDown);
  return { distance: speed * (tUp + tDown), height, full };
}

/**
 * The hush.
 *
 * A pocket of still, dense, freezing air trapped in a hollow, and the only
 * thing in the game that changes the number every other number is measured
 * against. Inside it gravity is less than half what it is outside, so the
 * penguin does not jump higher because it is stronger — it jumps higher
 * because the world stopped pulling so hard.
 *
 * This is a bigger idea than it looks. Wind changes where a jump lands; a
 * geyser changes how a jump starts; the hush changes *what a jump is*. Reach
 * roughly doubles in both directions at once, which means a hush can hold a
 * gap no penguin can cross and a shelf no penguin can reach, in the same
 * hollow, and both are fair because both are visible from outside.
 *
 * Why it is not simply "easy mode in a box": you have to be *inside* it for it
 * to work, its edge is drawn, and the arc it gives you is long enough that
 * committing to one is a decision you cannot take back halfway. A jump that
 * takes a second and a half to land is a jump you have to aim.
 *
 * The floor is a real limit and not taste. Below about a third, the fall back
 * down takes so long that the level stops being a platformer and starts being
 * a slow descent through a room, and every hazard in it becomes trivial
 * because you are simply never where it is.
 */
export const HUSH = {
  /** What gravity runs at inside the pocket. */
  gravity: 0.42,
  /** Nothing under this: below it the game stops being a platformer. */
  floor: 0.34,
  /**
   * Terminal velocity is scaled too.
   *
   * Without this a penguin that entered the pocket already falling fast kept
   * that speed all the way through, and the hush read as broken exactly when
   * the player most needed it: on the way in from above.
   */
  fall: 0.55,
};

/**
 * Reach inside a hush pocket.
 *
 * The same derivation as `reachFor`, with gravity scaled. Written as its own
 * function rather than a parameter with a default, because every call site
 * that measures a level has to say out loud which physics it is measuring in.
 */
export function reachInHush(scale, maxHeight = Infinity, factor = HUSH.gravity) {
  const g = Math.max(HUSH.floor, factor);
  const v = Math.abs(PHYS.jumpVelocity) * (1 - PENGUIN.jumpPenaltyPerScale * (scale - 1));
  const speed = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
  const full = (v * v) / (2 * PHYS.gravityUp * g);
  const height = Math.max(0, Math.min(full, maxHeight));
  const tUp = Math.sqrt((2 * height) / (PHYS.gravityUp * g));
  const tDown = Math.sqrt((2 * height) / (PHYS.gravityDown * g));
  return { distance: speed * (tUp + tDown), height, full, hang: tUp + tDown };
}

/**
 * Is this point inside a hush pocket, and how strong is it?
 *
 * Lives here, next to the physics it changes, because three separate pieces of
 * code need the answer and they must never disagree: the world that runs the
 * game, and the two solvers that prove the levels can be finished. Those
 * solvers model the world's forces themselves rather than instantiating it,
 * which is fast and which is exactly the kind of duplication that rots — the
 * first hush level was declared uncrossable by a solver that had simply never
 * been told gravity could change.
 *
 * Measured at the middle of the body rather than by overlap. A pocket that
 * switched on the instant a wingtip crossed the line would stutter at the
 * boundary, and a player aiming a jump with two different gravities in it has
 * been handed a coin flip.
 */
export function hushAt(zones, cx, cy) {
  if (!zones) return 1;
  for (const z of zones) {
    if (z.kind !== 'hush') continue;
    if (cx < z.x || cx > z.x + z.w || cy < z.top || cy > z.bottom) continue;
    return Math.max(HUSH.floor, z.gravity ?? HUSH.gravity);
  }
  return 1;
}

/**
 * A hanging slab of ice, and how long it takes to swing.
 *
 * The period is not a dial. It is `2π√(L/g)`, the actual small-angle period of
 * a pendulum, worked out from the length of the rope and the gravity this game
 * already uses — so a level author chooses how long the rope is and the timing
 * follows from that, the way `reachFor` makes a gap either possible or not
 * rather than either fun or not.
 *
 * This matters more than it sounds. A swinging platform whose speed is a typed
 * constant is a moving platform with a curved path; one whose speed comes from
 * its length is a *pendulum*, and players read pendulums correctly on sight
 * because they have been watching them their whole lives. A long rope is slow
 * and a short rope is quick, and nobody has to be told.
 *
 * Small-angle is a real approximation and it is kept honest by capping the
 * swing at thirty-five degrees, where the true period is under two percent
 * longer than this formula says. Past that the two drift apart, and a
 * platform that arrives late by a tenth of a second is a platform that lies.
 */
export const SWING = {
  /** Widest the arc may be, in radians, for the small-angle period to hold. */
  maxAngle: 0.61,
  /** Shortest rope worth drawing: below this it reads as a wobble. */
  minLength: 110,
};

export function swingPeriod(len) {
  return 2 * Math.PI * Math.sqrt(Math.max(SWING.minLength, len) / PHYS.gravityDown);
}

/**
 * Where a hanging slab is, and how fast, at a given moment.
 *
 * One definition, called by the entity that draws it, the composer that places
 * it and the validator that proves you can ride it — the same discipline that
 * `windAt` and `hushAt` are under, and for the same reason: three pieces of
 * code that each work out a moving platform's position separately will
 * eventually disagree about where it is.
 */
export function swingAt(len, angle, phase, time) {
  const t = (time / swingPeriod(len) + phase) * Math.PI * 2;
  const th = Math.min(SWING.maxAngle, angle) * Math.sin(t);
  return { dx: Math.sin(th) * len, dy: Math.cos(th) * len, angle: th };
}

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
  /**
   * "burst": warning time before the geyser fires.
   *
   * Unlike cracking ice — where being caught on it is survivable if you were
   * heading off anyway — a geyser throws you, so the window has to cover the
   * worst case: landing on the very near edge and running the whole width.
   */
  burstWarn: 0.6,
  /** "burst": how hard it throws the penguin. */
  burstUp: -1180,
  burstSide: 210,
  /**
   * "fake": ice that is drawn exactly like solid ice and is not.
   *
   * The fuse is long enough to run off if you keep moving and short enough to
   * drown anybody who stops to look around. That is the whole design: it does
   * not punish you for not knowing, it punishes you for hesitating.
   */
  fakeDelay: 0.46,
  /** "snap": how close to landing the ice waits before vanishing. */
  snapTrigger: 0.26,
  /** "snap": stays gone this long, so the retry is a fair one. */
  snapRespawn: 1.5,
};

/**
 * Antarctic storm zones.
 *
 * Unlike a gust — a narrow column you cross — a storm is a stretch of coast
 * where the wind is simply against you. It pulses rather than blowing flat,
 * because a constant headwind is just a slower walk, while a pulsing one is a
 * decision: push through the lull, or wait out the surge on solid ice.
 */
/**
 * Wind.
 *
 * It used to be scenery with a physics component: a sideways nudge, capped by
 * the validator at a level where it provably could not change what the penguin
 * could reach. That cap was there for a good reason and it had one very bad
 * consequence — wind that cannot change anything is wind you can ignore, and a
 * mechanic you can ignore is not a mechanic. It blew, snow moved, nothing
 * happened.
 *
 * So the cap is gone and a *shape* replaces it. The storm breathes: it pushes
 * against you, drops to nothing, then pushes with you, and drops again. Four
 * beats, the same every time, and the whole of it visible on screen before it
 * arrives.
 *
 *   · **Headwind** — a jump taken into it falls short. Wait, or lose the gap.
 *   · **Lull** — the neutral window. Everything the level asks is possible here.
 *   · **Tailwind** — a jump taken with it goes *further than the penguin can
 *     jump*. Some gaps in this game can only be crossed on that beat.
 *
 * The last one is the point. Wind is no longer a tax on the level, it is a
 * tool the level is built around — and because the composer can now place a
 * gap that needs it, the validator has to prove the tailwind actually makes it,
 * the same way it proves everything else.
 *
 * The counterplay on the ground is a small, quiet one, and it needs no button:
 * a penguin that stops and stands still digs in and is pushed about half as
 * hard as one that is running. Fighting the wind is a decision, not a fee.
 */
export const WIND = {
  /** One full breath: against, lull, with, lull. */
  period: 4.6,
  /** Peak acceleration in px/s². Everything else is a fraction of this. */
  power: 900,
  /** Felt on the ground while moving, and while standing still. */
  ground: 0.55,
  /**
   * Almost nothing. Standing still is the counterplay to a headwind, and a
   * counterplay that still loses you ground is not one: at this fraction a
   * penguin holding position drifts about a finger's width a second, which is
   * a lean rather than a slide.
   */
  dugIn: 0.08,
  /**
   * How fast wind-given speed bleeds away, per second.
   *
   * This is what stops a tailwind becoming an accelerating slide into the sea:
   * drift approaches `push / drag` and no further. It is much higher on the
   * ground than in the air because feet grip and air does not, which is the
   * same sentence as "the wind moves you most while you are jumping".
   */
  dragAir: 2,
  dragGround: 6,
  /**
   * Upward acceleration inside a rising column, in px/s². Kept well under
   * gravity on purpose: an updraft lightens the penguin, it never flies it.
   */
  lift: 900,
  /** Warning before each peak, in seconds. */
  warn: 0.6,
};

/**
 * The opening beat: how long the player has before the first gap.
 *
 * A level starts from rest, on a screen nobody has read yet, and the first
 * thing anybody does is press a direction. This used to be a hard-coded eighty
 * pixels of spawn offset, which was fine while first floes were two hundred and
 * fifty pixels wide and became a third of a second of reaction time once they
 * were narrowed. A number in seconds cannot rot that way: it means the same
 * thing at every growth scale and after every change to how wide ice is.
 */
export const OPENING = {
  /** Seconds of running between the spawn and the edge. */
  beat: 0.6,
  /** How far in from the floe's left edge the body starts, in bodies. */
  inset: 0.55,
};

/** How wide the first floe has to be for the opening to last its beat. */
export function openingWidth(scale) {
  const speed = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
  return Math.ceil(PENGUIN.w * scale * OPENING.inset + speed * OPENING.beat);
}

/**
 * The longest gap a penguin can actually cross with no help.
 *
 * `reachFor().distance` is how far the *body* travels, and a gap is measured
 * edge to edge, so the true crossing is a whole penguin longer: it can leave
 * with its toes on the lip and land with its beak on the far side. Getting
 * this wrong is not academic — it is how a gap sized to need the wind turned
 * out to be jumpable without it.
 */
export function crossableGap(scale, maxHeight = Infinity) {
  return reachFor(scale, maxHeight).distance + PENGUIN.w * scale;
}

/**
 * Where the storm is in its breath, as a signed -1..+1.
 *
 * Negative is against the direction of travel, positive is with it. Written as
 * one function so the physics, the renderer, the HUD gauge and the validator
 * all read the same curve — a wind the player sees and a wind the player feels
 * disagreeing by a tenth of a second is worse than no gauge at all.
 */
export function windAt(cycle) {
  const t = ((cycle % 1) + 1) % 1;
  // 0.00 build against · 0.16 full against · 0.38 fall · 0.50 lull
  // 0.60 build with    · 0.72 full with    · 0.90 fall · 1.00 lull
  if (t < 0.16) return -(t / 0.16);
  if (t < 0.38) return -1;
  if (t < 0.5) return -(1 - (t - 0.38) / 0.12);
  if (t < 0.6) return 0;
  if (t < 0.72) return (t - 0.6) / 0.12;
  if (t < 0.9) return 1;
  return 1 - (t - 0.9) / 0.1;
}

/** True while the wind is in the window a jump can be launched on. */
export function tailWindow(cycle) {
  const t = ((cycle % 1) + 1) % 1;
  return t >= 0.66 && t < 0.9;
}

/**
 * True while the wind is neither helping nor hindering.
 *
 * Slightly wider than the flat part of the curve, because the edges of the
 * lull are a tenth of the wind's strength and a tenth of the wind is nothing.
 * What has to be true is that a player who sets off here lands before the
 * headwind returns — and the beat after the lull is the *tailwind*, so a
 * jump that runs long is helped rather than punished.
 */
export function lullWindow(cycle) {
  const t = ((cycle % 1) + 1) % 1;
  return t >= 0.42 && t < 0.64;
}

/**
 * How far a jump reaches with `accel` of wind behind it the whole way.
 *
 * The same trajectory as `reachFor`, with a constant horizontal acceleration
 * added — which is what a tailwind is. A negative `accel` gives the headwind
 * answer, and the difference between the two is the size of the decision the
 * player is being asked to make.
 */
export function reachWithWind(scale, accel) {
  const v = Math.abs(PHYS.jumpVelocity) * (1 - PENGUIN.jumpPenaltyPerScale * (scale - 1));
  const speed = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
  const apex = (v * v) / (2 * PHYS.gravityUp);
  const t = v / PHYS.gravityUp + Math.sqrt((2 * apex) / PHYS.gravityDown);
  // Integral of the drift channel the player runs: drift climbs toward
  // accel/drag and the distance it buys is the area under that curve. Written
  // out rather than approximated, because the whole point of the number is
  // that the proof and the physics agree.
  const k = WIND.dragAir;
  const carried = (accel / k) * (t - (1 - Math.exp(-k * t)) / k);
  return Math.max(0, speed * t + carried);
}

/**
 * How high the penguin gets inside a rising column.
 *
 * An updraft is not a lift and not a second jump: it subtracts from gravity
 * for as long as you are inside it, so it buys height in proportion to the
 * jump you already made. Jump badly into one and you go badly high.
 */
export function riseWithLift(scale, lift) {
  const v = Math.abs(PHYS.jumpVelocity) * (1 - PENGUIN.jumpPenaltyPerScale * (scale - 1));
  const g = Math.max(PHYS.gravityUp * 0.35, PHYS.gravityUp - lift);
  return (v * v) / (2 * g);
}

/** Kept for the storm's own visuals, which still think in surges. */
export const STORM = {
  period: WIND.period,
  surge: 0.34,
  lull: 0.22,
  groundFactor: WIND.ground,
  warn: WIND.warn,
};

/**
 * The speed fish.
 *
 * A single red-and-gold fish per level that turns the penguin into a streak of
 * lightning for a few seconds. It is never on the main line — always a detour —
 * so taking it is a bet: the boost saves far more time than the detour costs,
 * but only if you can still hit your landings at half again the speed.
 */
export const BOOST = {
  duration: 4.5,
  speed: 0.5,
  jump: 0.06,
  /** Extra coins for grabbing one. */
  reward: 10,
};

/**
 * The charged fish.
 *
 * One button. That is the whole control scheme, and it is why the speed fish
 * has been the only interesting pickup in the game: everything else you could
 * hand a player is a number, and a number is not a verb.
 *
 * These are. Each one changes what the jump button *means* for a few seconds,
 * which is the only way to add a verb to a game that has one button without
 * adding a second button. Three of them, and they are deliberately three
 * different kinds of answer to being stuck in the air:
 *
 *   · `COIL`    — bigger.   One jump, and it is enormous.
 *   · `QUANTUM` — elsewhere. Press it airborne and you are somewhere else.
 *   · `SLACK`   — slower.   Everything but you drops to a third speed.
 *
 * None of them is ever required. Every level in the game is proved passable by
 * a penguin that owns nothing and picks up nothing, and these live off the
 * running line the way the speed fish always has. They are what you take when
 * you want the level to be *yours* rather than merely finished.
 */
export const COIL = {
  /** How long the coil is held before it springs on its own. */
  duration: 7,
  /** Multiplier on the jump that spends it. */
  jump: 2.05,
  /** Extra coins for grabbing one. */
  reward: 14,
};

export const QUANTUM = {
  duration: 6.5,
  /** How far the blink carries, in penguin bodies. */
  bodies: 3.4,
  /**
   * One blink per stretch in the air.
   *
   * Without this the fish is flight, and flight is not a verb this game has.
   * With it, it is a second chance at a jump you have already made — which is
   * the thing a player actually wants at the moment they want it.
   */
  reward: 16,
};

export const SLACK = {
  duration: 5.5,
  /** What everything except the penguin runs at, while the penguin is airborne. */
  rate: 0.34,
  /**
   * On the ground the world runs normally, on purpose.
   *
   * A general slow-motion button makes every level easier and nothing more
   * interesting. Tied to being airborne it is a tool for one moment: the jump
   * where the geyser and the seal and the gap all arrive together.
   */
  reward: 16,
};

/**
 * The three of them by kind, for the code that has to treat them alike.
 *
 * `tint` is the one colour that carries the whole idea — the fish, its sparkle,
 * its afterimage and the ring the effect draws are all this colour, because a
 * pickup with three seconds of consequence has to be recognisable at a glance
 * from across a level and never explained twice.
 */
export const CHARGED = {
  coil: {
    ...COIL,
    tint: '#ffb03a',
    label: 'Yay kuruldu!',
    en: { label: 'Wound up!' },
  },
  quantum: {
    ...QUANTUM,
    tint: '#b06cff',
    label: 'Işınlanma hazır!',
    en: { label: 'Blink ready!' },
  },
  slack: {
    ...SLACK,
    tint: '#4fe3c8',
    label: 'Dünya yavaşladı!',
    en: { label: 'The world slowed!' },
  },
};

/**
 * Rotten fish.
 *
 * The counterweight to the speed fish, and the reason "grab everything" stops
 * being a free strategy. These sit *on* the running line rather than off it, so
 * avoiding one costs a jump or a swerve — the player has to decide, at speed,
 * whether that costs less than the debuff.
 *
 * Each is survivable on its own. None is survivable if you were already in
 * trouble, which is the point.
 */
export const ROT = {
  /** Lead in the belly: heavier, shorter jump. */
  heavy: { duration: 5, jump: -0.22, speed: -0.18, label: 'Ağırlaştın!', en: { label: 'You got heavy!' } },
  /** Every floe is polished ice. You keep what you had and cannot get more. */
  slick: { duration: 4.2, label: 'Ayağın tutmuyor!', en: { label: 'No grip!' } },
  /** Left is right. Short, because it is the nastiest. */
  dizzy: { duration: 3.2, label: 'Kontroller ters!', en: { label: 'Controls reversed!' } },
  /** Frost on the eyes: the view closes in. */
  blind: { duration: 4, label: 'Göremiyorsun!', en: { label: 'You cannot see!' } },
};

/**
 * Active gear.
 *
 * The rest of the shop makes numbers bigger. These change what the penguin can
 * *do*, on the same jump button:
 *
 *   hold in mid-air   → wings out, the fall slows to a glide
 *   tap in mid-air    → the back motor fires once, straight up
 *
 * Both run on a meter that only refills on the ground, so neither turns the
 * game into flying: they turn a jump you already committed to into a jump you
 * can still argue with. Every level is validated against a penguin with none of
 * this, so gear can only ever make a course easier — never unlock one.
 */
export const GEAR = {
  wings: {
    /** Seconds of glide per landing, at level 1. */
    stamina: 1.1,
    /** Downward speed while gliding, as a fraction of terminal velocity. */
    fallFactor: 0.22,
    /** Forward drift the spread wings give you. */
    lift: 46,
  },
  rocket: {
    /** Bursts per landing, at level 1. */
    charges: 1,
    /** Upward velocity a burst sets. */
    power: -560,
    /** Seconds of thrust visual + a floor on vertical speed. */
    burn: 0.22,
    /** Minimum time between two bursts, so a double tap is not a rocket ride. */
    cooldown: 0.28,
  },
};

/**
 * Ambushes.
 *
 * A skua is a big polar gull that will genuinely take a chick. It is not part
 * of the level: it comes out of nothing, at a moment the level did not choose,
 * which is the whole point — a course you have memorised should still be able
 * to surprise you on the ninth run.
 *
 * It gets a shadow on the ice before it strikes, and that is deliberate. A
 * zero-warning instant kill is a coin flip and people quit; a warning you have
 * to *notice while doing something else* is the thing that makes people say one
 * more go. The window is short enough to be genuinely nasty.
 */
export const AMBUSH = {
  /** Seconds of shadow before the dive lands. */
  warn: 0.72,
  /** How long the dive itself takes, from off-screen to the strike point. */
  dive: 0.42,
  /** Never twice inside this window. */
  cooldown: 3.8,
  /** Grace after a spawn or respawn — never ambushed while getting your bearings. */
  grace: 2.2,
  /** Chance per second of an attack, once everything else allows it. */
  rate: 0.4,
  /** The earliest level an ambush can happen at all. */
  fromLevel: 12,

  /**
   * The bird learned to hunt.
   *
   * One dive, one fixed strike point, one dodge — that is what a skua was, and
   * it is a coin flip you win by walking. Real skuas do not work like that:
   * they come in, look, pull out, and come back from a direction you are no
   * longer watching. So this one has three ways of arriving, and which one is
   * coming is readable before it commits.
   *
   *   `lock`  — the original. Aim locked when the shadow appears; move and it
   *             misses. Still the most common, because it is the one that
   *             teaches the shadow means something.
   *   `feint` — comes in, pulls up at the last moment, wheels round and dives
   *             again from the other side. The first pass is free and the
   *             second one is not, and the player who relaxed after dodging is
   *             the one it takes.
   *   `hunt`  — re-aims all the way down. Dodging does not work on this one at
   *             all, and it is not supposed to: the answer to a hunter is the
   *             struggle, not the sidestep. It gets a longer warning and a
   *             different shadow, because a thing you cannot dodge has to be a
   *             thing you can *see coming*.
   *
   * The mix shifts with the level. Early on it is almost always a plain lock;
   * by the end of the shelf a third of them are hunters and pairs are routine.
   */
  feintChance: 0.3,
  huntChance: 0.26,
  /** A hunter's warning is longer, because there is no dodging it. */
  huntWarn: 1.15,
  /** How hard a hunter can steer while diving, in pixels per second. */
  huntTurn: 620,
  /** Seconds between a feint's pull-out and its second, committed dive. */
  wheel: 0.85,
  /** Two birds at once, from this level on, and this often. */
  pairFrom: 24,
  pairChance: 0.3,
  /** The second bird of a pair comes this long after the first. */
  pairGap: 0.55,
  /**
   * Being carried.
   *
   * The bird used to grab you and that was the end of it: a fixed second of
   * being flown away, then dead, with nothing to do but watch. An ambush you
   * cannot answer is a coin flip with a long animation on it.
   *
   * Now it is a struggle. `carry` is how long you have before it gets you clear
   * of the level, and `shakes` is how many presses it takes to twist free. Get
   * loose and you are dropped — alive, with whatever the bird's own momentum
   * gave you, over whatever happens to be underneath. That last part is the
   * drama: escaping is not the same as being safe.
   */
  carry: 2.1,
  shakes: 5,
  /** How fast the grip tightens back up between presses. */
  regrip: 1.4,
};

/**
 * The collapse at the flag.
 *
 * A serac calves off the cliff above the raft just as you arrive. It is the
 * nastiest thing in the game and it is deliberate: the last four seconds of a
 * level are where attention drops, and a level that can still take you there is
 * a level you do not sleepwalk through.
 *
 * What stops it being a coin flip: it only fires on a fraction of arrivals, it
 * throws a shadow before it lands, and it falls *short of the raft* — the ice
 * it smashes is ground you have to cross, not the goal itself. Somebody who
 * knows it exists gets past it every time. Somebody who does not, finds out.
 */
export const COLLAPSE = {
  /** Chance of a collapse on any given approach to the goal. */
  chance: 0.55,
  /** How close to the goal, as a fraction of the level, it arms. */
  from: 0.82,
  /** Shadow time before impact. */
  warn: 0.5,
  /** How long the debris stays lethal on the ice. */
  linger: 1.6,
  /** Never in the first levels: the player has to have somewhere to fall from. */
  fromLevel: 8,
};

/**
 * Climbing: the second verb.
 *
 * Thirty-one levels of a running game teach the player exactly one question —
 * "can I reach that?" — and no amount of new ice changes the question. So the
 * mountain chapter adds a different one: "can I hold on long enough?"
 *
 * A penguin pressed into an ice wall digs in and hangs there. Hanging costs
 * stamina; creeping upward costs more; kicking off the wall costs a chunk in
 * one go. Stamina only comes back on solid ground. That single rule turns a
 * vertical shaft from a stack of jumps into a route you have to plan a rest
 * into — which is what climbing actually is.
 *
 * No new button. Hold *toward* the wall to cling, hold jump to climb, tap jump
 * to kick off. Same three inputs the game has always had, so it works on a
 * phone with no extra thumb.
 */
export const CLIMB = {
  /** Seconds of hanging on a full bar. */
  stamina: 4.4,
  /** Upward creep while clinging and holding jump, px/s. */
  climbSpeed: 96,
  /** Downward slide while merely hanging on, px/s. */
  slideSpeed: 54,
  /** Stamina per second: hanging, climbing. */
  drainHold: 0.55,
  drainClimb: 1.25,
  /** One kick off the wall, in stamina. */
  kickCost: 0.5,
  /** Back on the ground, the bar refills this fast. */
  regen: 3.2,
  /** Kick-off velocity: sideways in px/s, upward as a fraction of a jump. */
  kickX: 292,
  kickY: 0.9,
  /**
   * How long the wall you just left refuses to be grabbed again. Short enough
   * that a chimney can be chained, long enough that one wall alone cannot be
   * ridden to the top for free.
   */
  regrab: 0.22,
  /** Below this fraction the penguin visibly shakes — the only warning given. */
  tired: 0.3,
  /** Grip upgrades and crampons buy extra hang time, up to this many seconds. */
  gripBonus: 1.6,
};

/**
 * What one kick off an ice wall is actually worth.
 *
 * A chimney is crossed by bouncing between two faces, so the question that
 * decides whether a shaft is climbable is not "how high can it jump" but "does
 * a kick still gain height by the time it reaches the far wall". Cross a narrow
 * chimney and you arrive near the apex with most of the height kept; cross a
 * wide one and you arrive on the way down having gained nothing.
 *
 * `width` is the inner span of the shaft. Returns the net height gained per
 * kick — zero or negative means that shaft cannot be climbed by kicking, and
 * the composer refuses to place it.
 */
export function kickGain(scale, width) {
  const v = Math.abs(PHYS.jumpVelocity) * (1 - PENGUIN.jumpPenaltyPerScale * (scale - 1)) * CLIMB.kickY;
  const speed = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
  const penguinW = PENGUIN.w * scale;
  // Only the span the body has to actually travel counts.
  const travel = Math.max(0, width - penguinW);
  const t = travel / speed;
  const tUp = v / PHYS.gravityUp;
  const apex = (v * v) / (2 * PHYS.gravityUp);
  if (t <= tUp) return v * t - 0.5 * PHYS.gravityUp * t * t;
  return apex - 0.5 * PHYS.gravityDown * (t - tUp) ** 2;
}

/**
 * How far a jump reaches *given that it also has to gain height*.
 *
 * `reachFor` answers the flat question and treats distance and rise as two
 * separate budgets, which is close enough on a shelf where climbs are gentle.
 * On a mountain it is not: a jump that spends its arc getting 110 px higher has
 * almost no horizontal travel left, and two independent budgets would happily
 * sign off on a ledge nobody can reach.
 *
 * So this couples them. Land `rise` pixels above where you left, and the answer
 * is how far sideways you got — exactly, from the trajectory.
 */
export function reachAt(scale, rise) {
  const v = Math.abs(PHYS.jumpVelocity) * (1 - PENGUIN.jumpPenaltyPerScale * (scale - 1));
  const speed = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
  const apex = (v * v) / (2 * PHYS.gravityUp);
  if (rise > apex) return 0; // simply cannot get that high
  const tUp = v / PHYS.gravityUp;
  const tDown = Math.sqrt((2 * (apex - rise)) / PHYS.gravityDown);
  return speed * (tUp + tDown);
}

/** How far a full stamina bar goes: creeping up, and kicking up. */
export function climbBudget(scale, width) {
  const creep = CLIMB.climbSpeed * (CLIMB.stamina / CLIMB.drainClimb);
  const kicks = Math.floor(CLIMB.stamina / CLIMB.kickCost);
  const gain = kickGain(scale, width);
  return { creep, kicks, perKick: gain, kicked: Math.max(0, gain) * kicks };
}

/**
 * Under the ice — the chapter's third verb.
 *
 * On the ice a penguin is a comedian: short legs, no grip, everything is an
 * effort. In the water it is the fastest thing for a hundred miles. So the
 * third chapter does not make the penguin work harder, it lets it *go* — and
 * takes away the one thing it needs instead. You can swim anywhere. You just
 * cannot breathe.
 *
 * The control is still one button and a direction, and it means the one thing
 * a swimming body has to decide:
 *
 *   · let go  → you float. A penguin is buoyant; up is free and constant.
 *   · hold    → you dive. Down costs effort, which is why it is the held one.
 *
 * Nothing else changed. Left and right are left and right, they are simply
 * quicker and they keep going, because water carries you and ice does not.
 */
export const SWIM = {
  /**
   * Constant upward drift with the button up, and the pull while it is held.
   *
   * Both are large and both terminal speeds are small, which is the whole
   * trick: the penguin reaches its cruising rise or sink in about a fifth of a
   * second and then simply holds it. Softer numbers gave a submarine — a full
   * second to turn a rise into a dive — and threading a gap in the ice with a
   * one-second lag is not a skill, it is a guess.
   */
  buoyancy: 1500,
  dive: 3400,
  /** Terminal speeds. Down is quicker than up: it is the one you work for. */
  riseMax: 250,
  sinkMax: 380,
  /** Horizontal cruise, as a multiple of the walking speed. */
  speed: 1.5,
  /** How hard the penguin accelerates sideways, and how fast it coasts down. */
  accel: 2100,
  drag: 620,
  /** Seconds of breath in a full lungful. */
  breath: 9,
  /** Breathing at a hole in the ice, in seconds of breath per second. */
  refill: 6,
  /**
   * Hitting the ceiling or the floor does not hurt — this is water, not a
   * fall — but it does cost you the momentum you had.
   */
  bump: 0.35,
};

/**
 * How far a swimmer travels in the time it takes to rise or sink `dy` pixels.
 *
 * The counterpart of `reachAt` for the mountain: distance and height are not
 * separate budgets under the ice either. Rising is slow and free, diving is
 * quick and costs nothing but the breath the whole level is costing you — so
 * the two directions have genuinely different geometry, and a gap that is easy
 * to reach from below is often impossible from above.
 *
 * @param {number} scale penguin growth
 * @param {number} dy    positive to sink, negative to rise
 */
export function swimReach(scale, dy) {
  const speed = PHYS.moveSpeed * SWIM.speed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
  const up = dy < 0;
  const accel = up ? SWIM.buoyancy : SWIM.dive - SWIM.buoyancy;
  const top = up ? SWIM.riseMax : SWIM.sinkMax;
  const dist = Math.abs(dy);
  // Accelerate to terminal, then coast.
  const rampT = top / accel;
  const rampY = (top * rampT) / 2;
  const t = dist <= rampY ? Math.sqrt((2 * dist) / accel) : rampT + (dist - rampY) / top;
  return speed * t;
}

/**
 * How far a single lungful goes, swimming flat out.
 *
 * Both halves are scale-dependent and they pull opposite ways: a bigger bird
 * is slightly slower and has noticeably bigger lungs. Keeping the lung term
 * here identical to `Player.breathMax` is what makes the composer's refusals
 * mean anything — a budget computed from a different number than the one the
 * game runs is not a budget, it is a decoration.
 */
export function breathRange(scale) {
  const speed = PHYS.moveSpeed * SWIM.speed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
  return speed * breathFor(scale);
}

/** Seconds in a lungful at a given growth. `Player.breathMax` reads this too. */
export function breathFor(scale) {
  return SWIM.breath * (0.86 + 0.14 * scale);
}

/**
 * The trench.
 *
 * Under the ice, depth is free. The corridor decides where the swimmer goes
 * and the clock counts seconds, and it costs exactly the same to spend one of
 * them scraping the seabed as hugging the roof — which means fifteen levels
 * built around a lungful have never once made depth itself a decision.
 *
 * A trench charges for it. It is a band of cold black water at the bottom of
 * the level, and inside it a lungful runs out more than twice as fast. The
 * drain is not flat: it grows with how far below the lip you are, the way
 * pressure does, so hugging the top of a trench costs a little and lying on
 * its floor costs everything. That gradient is the whole skill — the corridor
 * decides how deep you *must* go, and everything below that line is a choice.
 *
 * It is a pacing instrument as much as a hazard. A stretch through a trench is
 * the same distance and a third of the air, so the composer's budget treats a
 * trench as *longer than it looks* — which is exactly what it feels like.
 */
export const TRENCH = {
  /** What a lungful costs at the very bottom, as a multiple. */
  drain: 2.6,
  /** How dark and cold it looks. Read only by the renderer. */
  tint: '#04121f',
  /**
   * How far below its own line a real swimmer sits, as a fraction of the band.
   *
   * The route is a drawing of the best possible swim: it hugs the lip of the
   * trench, holds a perfect depth and never overshoots. Nobody swims like
   * that. Under the ice you cannot stop and cannot hover, so a penguin
   * crossing a cold band is always a little deeper than the line through it,
   * and a little deeper is not a little more expensive — the drain is a
   * gradient, so it compounds over the whole crossing.
   *
   * Two levels validated clean and drowned in the solver before this existed.
   * Both were tuned by hand and both would have gone wrong again the next time
   * anything moved, because the fault was never in those levels: planning was
   * pricing an ideal swim and the sea was charging for a real one.
   *
   * So every price the composer and the validator quote is for a swimmer
   * sagging this far below their own plan. It is the same near-worst-case
   * discipline the shelf uses when it assumes a landing three quarters of the
   * way into a floe rather than dead centre.
   */
  sag: 0.2,
};

/**
 * How fast the lungs are emptying at this point, as a multiple of one.
 *
 * One definition, called by the world that runs the game, the composer that
 * budgets the corridor and the validator that proves a lungful is enough — the
 * same discipline `windAt` and `hushAt` are under, and for the same reason.
 * Three pieces of code that each work out a drain rate separately will
 * eventually disagree, and the one that disagrees quietly is the one that
 * ships a level nobody can finish.
 */
/**
 * What one leg of a swim really costs in air.
 *
 * The obvious cheap version — tag each route node with the rate in force where
 * it sits — is what was written first, and it is wrong in a way that passes
 * every check and then drowns somebody. A trench is a *place*, and a leg of the
 * route enters it, crosses it and leaves it; charging the whole leg at the rate
 * measured at one end either overcharges the approach or, far worse,
 * undercharges the swim out. Level sixty passed its validator and could not be
 * finished.
 *
 * So the leg is sampled. Same function the world calls every frame, evaluated
 * along the line rather than at a point, which makes the composer's budget, the
 * validator's proof and the running game agree by construction instead of by
 * everybody being careful.
 */
export function swimCost(zones, a, b, samples = 12) {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  if (!dist) return 0;
  let total = 0;
  for (let i = 0; i < samples; i++) {
    const t = (i + 0.5) / samples;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    total += (dist / samples) * trenchDrainAt(zones, x, y + sagAt(zones, x));
  }
  return total;
}

/** How far a real swimmer sits below the plan here, in pixels. */
function sagAt(zones, cx) {
  if (!zones) return 0;
  for (const z of zones) {
    if (z.kind !== 'trench') continue;
    if (cx < z.x || cx > z.x + z.w) continue;
    return (z.bottom - z.top) * TRENCH.sag;
  }
  return 0;
}

export function trenchDrainAt(zones, cx, cy) {
  if (!zones) return 1;
  let worst = 1;
  for (const z of zones) {
    if (z.kind !== 'trench') continue;
    if (cx < z.x || cx > z.x + z.w) continue;
    if (cy < z.top) continue;
    const depth = Math.min(1, (cy - z.top) / Math.max(1, z.bottom - z.top));
    worst = Math.max(worst, 1 + depth * ((z.drain ?? TRENCH.drain) - 1));
  }
  return worst;
}

/**
 * Kar topu — the chapter's fourth verb, and the only one you do not perform.
 *
 * Every other chapter gave the penguin something to do: jump, hold on, dive.
 * This one gives it nothing at all. The rival penguins throw; you cannot throw
 * back, you cannot pick anything up, you have no button for it. What you have
 * is where you stand — and a thrown snowball goes where it was aimed, which is
 * wherever *you* were when the thrower wound up.
 *
 * So the whole chapter is one idea: **stand behind somebody.** Line yourself up
 * so the rival you want gone is on the line between you and the one throwing,
 * and the throw does the work. Then get off that line before it arrives.
 *
 * Two consequences worth stating, because both of them are the point:
 *
 *   · The throw is flat and fast — a hard, straight snowball, not a lob. An arc
 *     cannot be lined up by eye; a straight line can, and a chapter about
 *     aiming has to be a chapter you can *see* the aim in.
 *   · The aim is locked when the wind-up starts, not when the ball leaves. That
 *     is what makes baiting possible at all: you choose the line, then you are
 *     no longer on it.
 */
export const BRAWL = {
  /** Telegraph before a throw. The aim is locked for all of it. */
  windup: 0.62,
  /** Seconds between one throw and the next wind-up. */
  period: 2.6,
  /** Flight speed. Flat and fast enough that the line reads as a line. */
  speed: 540,
  /** Snowball radius. */
  radius: 9,
  /** Nobody throws at something further away than this. */
  range: 1250,
  /** How much of a body a shot must cover to count as lined up. */
  hitFrac: 0.55,
  /**
   * The lob.
   *
   * Every snowball in this chapter travels in a straight line, and that one
   * fact hands the arena a single static answer: stand behind something. A
   * pillar is a hard counter to a mechanic built entirely out of sight-lines,
   * and once a player finds that out, four of the fifteen levels stop being
   * about anything.
   *
   * A lobbed shot goes over it. Same thrower, same wind-up, same tell — it
   * simply leaves the hand at an angle and comes down under gravity, so cover
   * that was a wall is now a thing you have to *leave*.
   *
   * The trade is deliberate and it is what keeps it fair: an arc is much
   * slower than a line, so a lob gives the player far more time to react than
   * a flat shot ever does. It takes away the free answer and pays for it in
   * seconds. `dodgeWindow` measures the real flight either way, so a level's
   * fairness proof does not need to know which kind it is looking at.
   */
  lobGravity: 900,
  /** How high over the straight line the arc peaks, as a fraction of range. */
  lobArc: 0.42,
};

/**
 * How long the player has to leave the line once the aim is locked.
 *
 * The wind-up plus the flight, minus nothing: this is the real number, and a
 * level is only fair if a standing start can clear a body's width inside it.
 */
export function dodgeWindow(distance) {
  return BRAWL.windup + distance / BRAWL.speed;
}

/**
 * The opening velocity of a lobbed snowball, and how long it stays up.
 *
 * Given where it leaves the hand and where it has to arrive, there is one free
 * choice — how high to throw it — and that is `lobArc`, an apex set as a
 * fraction of the range so a long lob is a high one and a short lob is a
 * gentle toss. Everything else follows from wanting it to land on the target:
 * pick the flight time from the rise, and the horizontal speed is the distance
 * divided by it.
 *
 * Returned with the flight time, because a lob's fairness lives there. A flat
 * shot is over in a fifth of a second and this takes the best part of two, so
 * a level containing one is measured against the number this hands back rather
 * than against `BRAWL.speed`.
 */
export function lobShot(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const range = Math.max(1, Math.abs(dx));
  const g = BRAWL.lobGravity;
  // Apex measured above the higher of the two ends, so the arc always clears
  // whatever is between them even when the throw is uphill.
  const rise = Math.max(60, range * BRAWL.lobArc) + Math.max(0, -dy);
  const up = Math.sqrt(2 * g * rise);
  // Time to come back down to the target's height, from the apex.
  const time = up / g + Math.sqrt((2 * (rise + dy)) / g);
  return { vx: dx / time, vy: -up, time, rise };
}

/** Assist mode is offered after this many deaths on the same level. */
export const ASSIST_AFTER_DEATHS = 4;

/** Multipliers applied when assist mode is on. */
export const ASSIST = {
  crackDelay: 1.9,
  coyoteTime: 1.8,
  hazardSpeed: 0.72,
};

/** Handcrafted levels end here; beyond this the generator takes over. */
/**
 * How many handcrafted levels there are, across every chapter. chapters.js
 * must add up to exactly this many — the validator fails the build if the two
 * ever disagree, which is the only way a number in one file and a list of
 * plans in another stay honest.
 */
export const CRAFTED_LEVELS = 76;

/** Growth curve: how big the penguin is on a given level. */
export function scaleForLevel(level) {
  if (level <= 3) return 1;
  const t = Math.min(1, (level - 3) / 30);
  return +(1 + 0.62 * t).toFixed(3);
}

/**
 * The endless sink.
 *
 * Raising prices only ever *delays* the moment a player owns everything. The
 * moment still arrives, and when it does the currency dies and with it the
 * reason to pick up another fish.
 *
 * So there is one thing that never runs out. The monument is a pile of ice you
 * fund a block at a time; each block costs more than the last, and all you get
 * is a rank and a taller monument. It buys nothing and affects nothing — which
 * is exactly why it can be infinite without breaking the game.
 */
export const MONUMENT = {
  /** First block. */
  base: 500,
  /** Each block costs this much more than the last. */
  growth: 1.35,
  /** Rank names, in order. Past the end the number just keeps going. */
  ranks: [
    'Buz Parçası', 'Kar Yığını', 'Buz Sütunu', 'Sarkıt', 'Buz Kemeri',
    'Donmuş Şelale', 'Buzul Dili', 'Buz Kalesi', 'Kutup Kulesi', 'Ebedi Buzul',
  ],
  en: {
    ranks: [
      'Ice Chip', 'Snow Heap', 'Ice Pillar', 'Icicle', 'Ice Arch',
      'Frozen Falls', 'Glacier Tongue', 'Ice Keep', 'Polar Tower', 'Eternal Glacier',
    ],
  },
};

/** What the next monument block costs at a given size. */
export function monumentCost(blocks) {
  return Math.round((MONUMENT.base * MONUMENT.growth ** blocks) / 10) * 10;
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
/**
 * How fast a level's hazards run, from where it sits in its chapter.
 *
 * It lives here rather than in one chapter's file because it belongs to all
 * four. It was written for the shelf, where the geometric dial had run out:
 * `tight` widens gaps until the widest is exactly what a running jump clears,
 * and pushed further the composer produces a gap the penguin physically cannot
 * cross, which is not a hard level but a broken one. The mountain is in the
 * same position — three percent more `effort` and two climb steps stop being
 * solvable — and it kept the flat clock for a while afterwards purely because
 * the ramp had been written in the shelf's own file.
 *
 * Speeding up what *moves* costs no distance at all, so every geometric proof
 * in `tests/` stays exactly as true as it was. Flat through the two thirds
 * that teach, then climbing by a quarter to the last level of the chapter.
 */
export function menaceFor(at) {
  const from = 0.62;
  if (at <= from) return 1;
  return +(1 + 0.25 * Math.min(1, (at - from) / (1 - from))).toFixed(3);
}

export const REWARDS = {
  /**
   * What a fish is worth, and why it is worth less than it was.
   *
   * A currency is only interesting while there is something left to want, and
   * measured against the shop this one was paying out far too quickly: a good
   * player owned half the shop inside a long weekend. That is not generosity,
   * it is the economy ending — from that point every fish picked up is worth
   * nothing and the shop stops being a reason to play.
   *
   * So the routine income is roughly halved. Nothing is *removed*: clearing,
   * starring, going deathless and the dailies all still pay, and the first
   * purchase still lands inside the first ten minutes, because a currency you
   * cannot spend early never becomes real either. What changed is the slope
   * after that — a costume is now a week rather than an afternoon.
   *
   * The floor under all of it is `tests/economy.mjs`, which plays the campaign
   * on paper and fails the build if the first purchase drifts out of reach or
   * the last one drifts into a single sitting.
   */
  /** Per fish picked up in a level. */
  perFish: 2,
  /** The speed fish pays extra — it is harder to reach and easy to skip. */
  perBoost: 6,
  /** First time a level is cleared. */
  firstClear: 8,
  /** Per new star earned (never paid twice for the same star). */
  perStar: 5,
  /** Clearing without a single death. */
  flawless: 9,
  /** Daily challenge completion. */
  daily: 26,
  /** Bonus per consecutive day, capped. */
  streakStep: 4,
  streakCap: 36,
  /** Each of the day's objectives, the first time it is ticked off. */
  dailyObjective: 16,
};

/**
 * Shop upgrades.
 *
 * Every one of these makes the penguin better, never the level easier — the
 * level validator runs against *base* stats, so no level is ever gated behind
 * a purchase. Upgrades buy comfort and speed, not access.
 */
/**
 * The shop.
 *
 * Prices come from the economy simulator (`tests/economy.mjs`), not from feel.
 * The shape they encode: the first purchase inside five minutes so the currency
 * means something immediately, and the active gear — the only items that change
 * what the penguin can *do* — deliberately far enough away that owning one is
 * something you saved for rather than something that happened on the way past.
 */
/**
 * How the shop is laid out.
 *
 * Eight upgrades in one flat grid is a wall: everything is equally loud, so
 * nothing is, and a player scrolling past on a phone has no idea whether the
 * next card is another boot or something that changes how they play. Three
 * headings do more for that than any amount of card polish.
 *
 * The order is the order they matter in for somebody who has just arrived:
 * move better, survive longer, then the two things that add a button.
 */
export const SHOP_GROUPS = [
  {
    id: 'hareket',
    name: 'Hareket',
    note: 'Daha hızlı, daha uzağa, daha sağlam bas',
    en: { name: 'Movement', note: 'Faster, further, surer underfoot' },
  },
  {
    id: 'dayanma',
    name: 'Dayanma',
    note: 'Hata payı ve balık toplama',
    en: { name: 'Endurance', note: 'Room for a mistake, and reach for the fish' },
  },
  {
    id: 'ekipman',
    name: 'Ekipman',
    note: 'Havadayken bir şansın daha olsun',
    en: { name: 'Gear', note: 'One more chance while you are still in the air' },
  },
];

export const UPGRADES = [
  {
    id: 'boots',
    group: 'hareket',
    name: 'Kar Botu',
    blurb: 'Daha yükseğe ve daha uzağa zıpla.',
    en: { name: 'Snow Boots', blurb: 'Jump higher and further.' },
    icon: 'boot',
    levels: [
      { cost: 90, effect: 0.05, label: '+%5 zıplama', en: { label: '+5% jump' } },
      { cost: 320, effect: 0.1, label: '+%10 zıplama', en: { label: '+10% jump' } },
      { cost: 850, effect: 0.16, label: '+%16 zıplama', en: { label: '+16% jump' } },
    ],
  },
  {
    id: 'speed',
    group: 'hareket',
    name: 'Hızlı Ayak',
    blurb: 'Buz üstünde daha çevik koş.',
    en: { name: 'Quick Feet', blurb: 'Run nimbler on the ice.' },
    icon: 'bolt',
    levels: [
      { cost: 85, effect: 0.05, label: '+%5 hız', en: { label: '+5% speed' } },
      { cost: 300, effect: 0.1, label: '+%10 hız', en: { label: '+10% speed' } },
      { cost: 800, effect: 0.15, label: '+%15 hız', en: { label: '+15% speed' } },
    ],
  },
  {
    id: 'crampons',
    group: 'hareket',
    name: 'Krampon',
    blurb: 'Cilalı buzda kayma azalır.',
    en: { name: 'Crampons', blurb: 'Less sliding on polished ice.' },
    icon: 'spike',
    levels: [
      { cost: 220, effect: 0.45, label: 'Kayma %45 az', en: { label: '45% less slide' } },
      { cost: 620, effect: 0.75, label: 'Kayma %75 az', en: { label: '75% less slide' } },
    ],
  },
  {
    id: 'down',
    group: 'dayanma',
    name: 'Kalın Tüy',
    blurb: 'Her denemede bir kez ölümden kurtarır.',
    en: { name: 'Thick Down', blurb: 'Saves you from death once per attempt.' },
    icon: 'shield',
    levels: [{ cost: 900, effect: 1, label: 'Denemede 1 can', en: { label: '1 life per attempt' } }],
  },
  {
    id: 'magnet',
    group: 'dayanma',
    name: 'Balık Mıknatısı',
    blurb: 'Balıklar sana doğru gelir.',
    en: { name: 'Fish Magnet', blurb: 'Fish come to you.' },
    icon: 'magnet',
    levels: [
      { cost: 260, effect: 90, label: '90px çekim', en: { label: '90px pull' } },
      { cost: 780, effect: 165, label: '165px çekim', en: { label: '165px pull' } },
    ],
  },
  {
    id: 'vest',
    group: 'dayanma',
    name: 'Rüzgâr Yeleği',
    blurb: 'Kutup rüzgârı seni daha az savurur. Kuyruk rüzgârının itişi de azalır.',
    en: {
      name: 'Wind Vest',
      blurb: 'The polar wind shoves you around less. It also pushes you less from behind.',
    },
    icon: 'wind',
    levels: [{ cost: 560, effect: 0.55, label: 'Rüzgâr %55 az', en: { label: '55% less wind' } }],
  },
  {
    id: 'wings',
    group: 'ekipman',
    name: 'Planör Kanat',
    blurb: 'Havada zıplamayı basılı tut, kanatlar açılır ve düşüş yavaşlar.',
    en: {
      name: 'Glider Wings',
      blurb: 'Hold jump in the air: the wings open and the fall slows down.',
    },
    icon: 'wings',
    levels: [
      { cost: 2400, effect: 1, label: '1.1 sn süzülme', en: { label: '1.1 s glide' } },
      { cost: 5200, effect: 1.7, label: '1.9 sn süzülme', en: { label: '1.9 s glide' } },
      { cost: 9500, effect: 2.6, label: '2.9 sn süzülme', en: { label: '2.9 s glide' } },
    ],
  },
  {
    id: 'rocket',
    group: 'ekipman',
    name: 'Sırt Motoru',
    blurb: 'Havadayken zıplamaya bas, motor bir kez ateşler.',
    en: { name: 'Back Motor', blurb: 'Press jump while airborne and the motor fires once.' },
    icon: 'rocket',
    levels: [
      { cost: 3400, effect: 1, label: 'Havada 1 ateşleme', en: { label: '1 burst in the air' } },
      { cost: 7000, effect: 2, label: 'Havada 2 ateşleme', en: { label: '2 bursts in the air' } },
    ],
  },
  {
    id: 'radar',
    group: 'dayanma',
    name: 'Kuş Radarı',
    blurb: 'Kuş dalışa geçmeden önce daha uzun uyarı verir.',
    en: { name: 'Bird Radar', blurb: 'Longer warning before a bird starts its dive.' },
    icon: 'radar',
    levels: [
      { cost: 1400, effect: 0.35, label: '+0.35 sn uyarı', en: { label: '+0.35 s warning' } },
      { cost: 3200, effect: 0.7, label: '+0.7 sn uyarı', en: { label: '+0.7 s warning' } },
    ],
  },
];

/** Look up the numeric effect of an owned upgrade level (0 when unowned). */
export function upgradeEffect(owned, id) {
  const spec = UPGRADES.find((u) => u.id === id);
  const lvl = owned?.[id] ?? 0;
  if (!spec || lvl <= 0) return 0;
  return spec.levels[Math.min(lvl, spec.levels.length) - 1].effect;
}
