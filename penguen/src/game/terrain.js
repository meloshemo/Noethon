/**
 * Course composition.
 *
 * Antarctica is not a flat line of ice floes, and neither should a level be.
 * This is the vocabulary levels are written in: a cursor walks left to right
 * carrying a surface height, and each segment — a shelf, a climb, a crevasse,
 * a tunnel, a cliff — places its geometry and hands the cursor on.
 *
 * The point of doing it this way is that every gap is placed *from the reach
 * number*, not from a guess. A segment cannot ask for a jump the penguin does
 * not have, because it never gets to name a distance in pixels: it names a
 * fraction of the reach and the composer does the arithmetic at the level's own
 * growth scale. The validator still checks the result — belt and braces — but
 * by construction there is very little left for it to find.
 *
 * Two kinds of solid exist:
 *   floes    — the route. Everything the player lands on, and the only thing
 *              the path checks in the validator walk.
 *   terrain  — the continent. Cliff faces, tunnel roofs, the rock the route is
 *              carved through. Solid to the physics, invisible to the path.
 *
 * Coordinates: y grows downward, a floe's y is its top surface, and the sea is
 * at the bottom of the world.
 */

import {
  reachFor, reachWithWind, riseWithLift, crossableGap, openingWidth,
  OPENING, PHYS, PENGUIN, ICE, STORM, WIND, CHARGED,
} from './config.js';
import { nudgeClear } from '../core/util.js';

/** Sea-level ice, near the bottom of a tall world. */
export const SEA_LEVEL = 700;
/** The water line. Everything walkable lives above it. */
export const WATER = 790;
/** Default world height — the sky above the shelf is most of it. */
export const SKY = 900;
/** Nothing is ever placed above this: it is the top of the weather. */
export const CEILING = 120;

/**
 * The back of every shelf level.
 *
 * `WALL` is the rock face the penguin came down from, at the world's left edge.
 * `BACK` is how much shore there is between that face and where the penguin is
 * standing when the level starts, so pressing left is a walk rather than a
 * drowning.
 */
const WALL = 80;
const BACK = 150;

/** Roof thickness, and how much rock is drawn above a tunnel. */
const ROOF = 46;
/** No floe may sit closer than this to the sea — it would be standing in it. */
const SHORE = 90;
/**
 * How far into a floe the penguin realistically lands — the same near-worst
 * case the validator uses, so the two agree on what "crossable" means.
 */
const LANDING = 0.75;

/** Keep a surface between the top of the weather and the water line. */
function clampY(y) {
  return Math.max(CEILING, Math.min(WATER - SHORE, Math.round(y)));
}

export class Course {
  /**
   * @param {{x?:number, y?:number, scale?:number, seed?:number}} opts
   */
  constructor({ x = WALL + BACK, y = SEA_LEVEL, scale = 1, tight = 1 } = {}) {
    this.scale = scale;
    /**
     * How much of the penguin's reach this level's gaps are allowed to use,
     * relative to what the plan asked for.
     *
     * The plans write gaps as fractions of reach, which is what makes an
     * impossible one impossible to write. What it does not do is give the
     * chapter a curve: measured, chapter one sloped at *minus* fifty-three
     * percent — levels one to eleven were harder than twenty-seven to
     * thirty-one, and the most forgiving level in the chapter was the twenty
     * eighth. This multiplies every gap a plan asks for, so one number per
     * level is the whole ramp.
     *
     * The hard cap stays where it was: past `budget.distance` in the validator
     * a jump stops being a jump you can miss and make again.
     */
    this.tight = Math.min(1.45, Math.max(0.7, tight));
    this.reach = reachFor(scale);
    /** Right edge of the last thing placed, and its surface height. */
    this.x = x;
    this.y = y;
    this.startX = x;
    /** Decided when the first floe is placed, before the back is built. */
    this.spawnX = null;

    this.floes = [];
    this.terrain = [];
    this.hazards = [];
    this.fish = [];
    this.speedFish = [];
    /** Coil, quantum and slack. Always off the running line, never required. */
    this.chargedFish = [];
    this.rotFish = [];
    this.checkpoints = [];
    /** Rendering hints: shaded bands, tunnel interiors, cliff masses. */
    this.zones = [];
    this.top = y;
    this.bottom = y;
  }

  /* --------------------------------------------------------- helpers */

  /** Running speed at this level's growth scale. */
  get runSpeed() {
    return PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (this.scale - 1));
  }

  /**
   * The widest a floe of this type may be.
   *
   * Short-fuse ice is a stepping stone: the penguin has to get from where it
   * lands to the far edge before the fuse runs out, so the fuse and the running
   * speed decide the width — not the level designer. A geyser is stricter
   * still, because being caught on one is a launch into the sea rather than a
   * near miss, so it has to be crossable from its very near edge.
   */
  widthCap(type) {
    const run = this.runSpeed;
    switch (type) {
      case 'trap': return (ICE.trapDelay * run) / LANDING;
      case 'fake': return (ICE.fakeDelay * run) / LANDING;
      case 'fall': return (0.35 * run) / LANDING;
      case 'burst': return ICE.burstWarn * run * 0.85;
      default: return Infinity;
    }
  }

  /** Narrowest a floe may be: anything less is not somewhere to stand. */
  get minWidth() {
    return PENGUIN.w * this.scale * 1.7;
  }

  /** A gap as a fraction of the penguin's real reach. */
  gapOf(fraction, maxHeight = Infinity) {
    return Math.round(reachFor(this.scale, maxHeight).distance * fraction * this.tight);
  }

  /** A rise as a fraction of the penguin's real jump height. */
  riseOf(fraction) {
    return Math.round(this.reach.height * fraction);
  }

  _track(y, h = 20) {
    this.top = Math.min(this.top, y);
    this.bottom = Math.max(this.bottom, y + h);
  }

  /**
   * Place one floe `gap` pixels past the last, with its surface at `y`.
   * Everything else in this file goes through here.
   */
  put(gap, w, y, type = 'solid', extra = {}) {
    // Widths are the composer's business, not the plan's: a plan asking for a
    // 160px geyser is asking for something the fuse cannot deliver, so the cap
    // is applied here where the physics are known.
    w = Math.max(this.minWidth, Math.min(w, this.widthCap(type) * 0.94));

    // The first floe is the opening, and the opening is a promise: whoever
    // presses a direction gets a beat to read the screen before the ground runs
    // out. A plan can ask for a narrow one and will not get it, because the
    // width that keeps that promise is arithmetic, not taste.
    if (!this.floes.length) w = Math.max(w, openingWidth(this.scale));

    // Leaving a stepping stone starts from where you landed on it, not from
    // its far edge — so the gap after one has to be paid for out of the same
    // jump. Shortening it here means no plan can accidentally ask for a jump
    // and a sprint in the time of a jump.
    const prev = this.floes[this.floes.length - 1];
    if (prev && (prev.type === 'trap' || prev.type === 'fall' || prev.type === 'fake')) {
      const budget = this.reach.distance * 0.8 - prev.w * LANDING;
      gap = Math.max(this.gapOf(0.16), Math.min(gap, budget));
    }
    const x = Math.round(this.x + gap);
    const floe = { x, y: Math.round(y), w: Math.round(w), type, ...extra };
    // Where the penguin stands, decided from the floe as first placed. The back
    // is carved out behind it afterwards and must not move it.
    if (!this.floes.length) {
      this.spawnX = Math.round(x + PENGUIN.w * this.scale * (OPENING.inset + 0.5));
    }
    this.floes.push(floe);
    this.x = floe.x + floe.w;
    this.y = floe.y;
    this._track(floe.y, floe.h ?? 20);
    return floe;
  }

  /** A block of continent: cliff face, tunnel roof, buttress. */
  rock(x, y, w, h, kind = 'rock') {
    const block = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), kind };
    this.terrain.push(block);
    this._track(block.y, block.h);
    return block;
  }

  zone(x, w, top, bottom, kind) {
    this.zones.push({ x: Math.round(x), w: Math.round(w), top: Math.round(top), bottom: Math.round(bottom), kind });
  }

  /** A fish floating above the last floe placed, at a height worth a detour. */
  fishAbove(floe, dy = 58, kind = 'normal') {
    const item = { x: Math.round(floe.x + floe.w / 2 - 11), y: Math.round(floe.y - dy) };
    if (kind === 'speed') this.speedFish.push(item);
    else if (kind === 'normal') this.fish.push(item);
    else if (CHARGED[kind]) this.chargedFish.push({ ...item, kind });
    else this.rotFish.push({ ...item, kind });
    return item;
  }

  /** A fish hanging in a gap, which is always a decision rather than a pickup. */
  fishInGap(dy = 46, kind = 'normal') {
    const last = this.floes[this.floes.length - 1];
    const item = { x: Math.round(last.x - 34), y: Math.round(last.y - dy) };
    if (kind === 'speed') this.speedFish.push(item);
    else if (kind === 'normal') this.fish.push(item);
    else if (CHARGED[kind]) this.chargedFish.push({ ...item, kind });
    else this.rotFish.push({ ...item, kind });
    return item;
  }

  /** The floe at a fraction along the course — how plans point at a place. */
  at(fraction) {
    const usable = this.floes.filter((f) => !['trap', 'snap', 'fall', 'fake'].includes(f.type));
    const list = usable.length ? usable : this.floes;
    return list[Math.max(0, Math.min(list.length - 1, Math.round(fraction * (list.length - 1))))];
  }

  /**
   * The three collectible fish, spread along the course. Placed high enough to
   * be a small detour and never so high that they cannot be had.
   */
  scatterFish(n = 3, dy = 64) {
    for (let i = 0; i < n; i++) this.fishAbove(this.at((i + 0.75) / n), dy);
    return this;
  }

  /** A speed fish: deliberately off the running line, so taking it costs a jump. */
  sprint(at = 0.45, dy = 98) {
    this.fishAbove(this.at(at), dy, 'speed');
    return this;
  }

  /** Bait. In the way at chest height, where it has to be actively dodged. */
  temptation(at = 0.5, kind = 'heavy', dy = 40) {
    this.fishAbove(this.at(at), dy, kind);
    return this;
  }

  /**
   * A charged fish, hung above the running line.
   *
   * The default height is most of a jump above a floe you were going to stand
   * on anyway, which is the whole shape of the offer: it costs you a jump you
   * did not need and a moment of not looking where you are going. Nothing in
   * the level is behind it and nothing in the level needs it.
   */
  charged(at = 0.5, kind = 'coil', dy = 104) {
    this.fishAbove(this.at(at), dy, kind);
    return this;
  }

  checkpoint(floe = this.floes[this.floes.length - 1]) {
    this.checkpoints.push({ x: Math.round(floe.x + floe.w / 2 - 12), y: floe.y });
  }

  hazard(def) {
    this.hazards.push(def);
    return def;
  }

  /**
   * A seal patrolling a floe.
   *
   * Its beat is fitted to the floe: it must never sweep the right-hand strip,
   * because that strip is where the player stands to line up the next jump,
   * and a patrol across it turns every departure into a coin flip.
   */
  seal(floe = this.floes[this.floes.length - 1], { speed = 70 } = {}) {
    const LAUNCH_STRIP = 74;
    const w = 40;
    const right = floe.x + floe.w - LAUNCH_STRIP - w;
    const x = Math.min(floe.x + 26, right);
    const range = Math.max(0, right - x);
    if (range < 16) return null;
    return this.hazard({ kind: 'seal', x, y: floe.y - 26, w, h: 26, range, speed });
  }

  /**
   * A storm over the stretch just built.
   *
   * No longer capped into irrelevance. The old rule was that the wind must
   * never change what the penguin can reach, which made it weather you could
   * ignore; the rule now is that the wind must never make the *level* harder
   * than it looks — every gap under a storm is crossable in the lull, and the
   * lull comes round every few seconds and is visible before it arrives.
   *
   * What the wind buys instead is `windGap`: a gap that is only crossable on
   * the tailwind. That is a real mechanic and it is proved rather than assumed.
   */
  /**
   * @param {number} fromX
   * @param {{period?:number, dir?:number}} opts `dir` is which way the level
   *   runs, so a tailwind pushes forward wherever the level happens to face.
   */
  storm(fromX, { period = WIND.period, dir = 1 } = {}) {
    return this.hazard({
      kind: 'storm',
      x: fromX - 40,
      y: CEILING,
      w: this.x - fromX + 80,
      h: WATER - CEILING,
      power: WIND.power,
      dir,
      period: Math.max(3.2, period),
    });
  }

  /**
   * A gap that only the tailwind crosses.
   *
   * Sized deliberately past what the penguin can jump, and comfortably inside
   * what it can jump with the wind behind it. The ledge before it is wide, on
   * purpose: the answer to this gap is to stand still and wait, and a level
   * that asks you to wait somewhere had better give you somewhere to wait.
   *
   * The storm over it is placed here rather than by the plan, because the gap
   * and the wind that crosses it are one object — a `windGap` with no storm on
   * it is a wall, and that is exactly the kind of mistake worth making
   * impossible rather than checking for.
   */
  windGap({ w = 210, type = 'solid' } = {}) {
    const from = this.x - 60;
    const body = PENGUIN.w * this.scale;
    // Wide, flat, and nothing that gives way: the answer to this gap is to
    // stand still and wait, and a level that asks you to wait somewhere had
    // better give you somewhere to wait.
    const perch = this.put(this.gapOf(0.34), Math.max(w, body * 3.6), this.y, 'solid');
    // Both numbers are edge-to-edge, which is the only way a gap is ever
    // measured. `crossableGap` is what a running jump really clears; the
    // assisted one is the same jump with the tailwind's drift under it.
    const plain = crossableGap(this.scale);
    const withWind = reachWithWind(this.scale, WIND.power) + body;
    const gap = Math.round(Math.min(plain * 1.2, withWind * 0.82));
    const landing = this.put(gap, Math.max(w, body * 3.2), this.y, type);
    this.storm(from, { period: WIND.period });
    this.windGaps = this.windGaps ?? [];
    this.windGaps.push({
      from: perch.x + perch.w,
      to: landing.x,
      gap,
      plain: Math.round(plain),
      withWind: Math.round(withWind),
    });
    return this;
  }


  /**
   * A shelf too high to jump to, and a column of rising air under it.
   *
   * The sibling of `windGap`: one buys distance, this one buys height. The
   * column is drawn as a column and it is drawn where it acts, so the answer
   * — jump into the rising air, not beside it — is visible before it is
   * explained, which is the only way anything gets explained in this game.
   */
  updraft({ w = 190, gap = 0.3, rise: over = 1.32 } = {}) {
    const body = PENGUIN.w * this.scale;
    const launch = this.put(this.gapOf(0.32), Math.max(w, body * 3), this.y, 'solid');
    const plain = this.reach.height;
    const lifted = riseWithLift(this.scale, WIND.lift);
    const rise = Math.round(Math.min(plain * over, lifted * 0.76));
    const across = this.gapOf(gap);
    const ledge = this.put(across, Math.max(w, body * 3), clampY(this.y - rise), 'solid');
    this.hazard({
      kind: 'gust',
      x: launch.x + launch.w - 12,
      y: ledge.y - 70,
      w: ledge.x - (launch.x + launch.w) + 24,
      h: launch.y - ledge.y + 140,
      power: WIND.lift,
      period: 2.8,
    });
    this.updrafts = this.updrafts ?? [];
    this.updrafts.push({
      from: launch.x + launch.w,
      to: ledge.x,
      rise,
      plain: Math.round(plain),
      lifted: Math.round(lifted),
    });
    return this;
  }

  /* -------------------------------------------------------- segments */

  /**
   * Level ice: the shelf. The plain reading of the game, and the thing every
   * other segment is a departure from.
   */
  shelf({ n = 3, gap = 0.4, w = 190, type = 'solid', wave = 0, types = null } = {}) {
    for (let i = 0; i < n; i++) {
      const t = types ? types[i % types.length] : type;
      const y = clampY(this.y + (wave ? Math.round(Math.sin(i * 1.7) * wave) : 0));
      this.put(i === 0 && this.floes.length === 0 ? 0 : this.gapOf(gap), w, y, t);
    }
    return this;
  }

  /**
   * A slope. Positive `rise` climbs, negative descends — and descending is
   * free, which is why a course can drop much faster than it can climb.
   */
  slope({ n = 4, rise = 0.5, gap = 0.42, w = 130, type = 'solid' } = {}) {
    for (let i = 0; i < n; i++) {
      const step = rise >= 0 ? this.riseOf(rise) : Math.round(this.reach.height * -rise * 2.2);
      const y = rise >= 0 ? this.y - step : this.y + step;
      this.put(this.gapOf(gap), w, clampY(y), type);
    }
    return this;
  }

  /**
   * A cliff. A sheer face of rock with ledges stepping down it — the descent
   * is a controlled fall past something enormous, which is the whole feeling.
   */
  cliff({ drop = 260, ledges = 3, w = 96, gap = 0.3, face = 150 } = {}) {
    const topY = this.y;
    const startX = this.x;
    const per = drop / ledges;
    for (let i = 0; i < ledges; i++) {
      const f = this.put(this.gapOf(gap), w, clampY(this.y + per));
      // The face is drawn behind and below each ledge, so the ledges read as
      // cut into a wall rather than as floating ice.
      this.rock(f.x + 4, f.y + 26, f.w - 8, Math.max(face, WATER - f.y), 'cliff');
    }
    this.zone(startX, this.x - startX, topY - 10, this.y + face, 'cliff');
    return this;
  }

  /**
   * A crevasse: a wide chasm crossed on small pillars of ice, with nothing
   * underneath them for a very long way.
   */
  crevasse({ pillars = 2, w = 74, gap = 0.62, depth = 200, dip = 0.34 } = {}) {
    const startX = this.x;
    const rim = this.y;
    for (let i = 0; i < pillars; i++) {
      // The pillars sit below the rim: crossing a chasm is a drop and a climb,
      // not a walk at the same height with scenery underneath.
      const f = this.put(this.gapOf(gap), Math.max(w, this.minWidth + 6), clampY(rim + this.riseOf(dip)));
      this.rock(f.x + 8, f.y + 26, f.w - 16, Math.max(depth, WATER - f.y), 'pillar');
    }
    this.put(this.gapOf(gap * 0.85), 170, clampY(rim));
    this.zone(startX, this.x - startX, this.y - 40, this.y + depth, 'crevasse');
    return this;
  }

  /**
   * A tunnel through the ice.
   *
   * The roof is real: the penguin bonks it. So every gap in here is sized
   * against the reach *under that ceiling*, which is shorter than the reach in
   * open air — a tunnel is genuinely a different way of moving, not a decal.
   */
  tunnel({ n = 5, headroom = 108, gap = 0.5, w = 150, drop = 0, icicles = 0, types = null, mouth: lift = 0.5 } = {}) {
    // The mouth is a step up into the shelf, so a tunnel is somewhere you go
    // rather than a roof that appears over the route you were already on.
    if (lift) this.put(this.gapOf(0.34), 120, clampY(this.y - this.riseOf(lift)));
    const startX = this.x;
    // Apex available under the roof once the penguin's own height is taken out.
    const apex = Math.max(24, headroom - 44);
    const mouth = this.y;
    const panels = [];
    let roofY = Infinity;

    for (let i = 0; i < n; i++) {
      const t = types ? types[i % types.length] : 'solid';
      const y = clampY(this.y + (drop ? Math.round(drop / n) : 0));
      const f = this.put(this.gapOf(gap, apex), w, y, t);
      roofY = Math.min(roofY, f.y - headroom - ROOF);
      panels.push(f);
    }
    // One unbroken ceiling across the whole run. Panelling it per floe left a
    // hole over every gap, which is not a tunnel, it is a colonnade.
    const firstIn = panels[0];
    const lastIn = panels[panels.length - 1];
    this.rock(firstIn.x - 30, roofY, lastIn.x + lastIn.w - firstIn.x + 30, ROOF, 'roof');
    // Step back into daylight at the tunnel's own height, so whatever comes
    // next starts from open air.
    const exit = this.put(this.gapOf(0.34, apex), 170, this.y);
    // Close the entrance lip. Flush with the roof, never below it: a block
    // that hangs lower than the ceiling sits exactly where the jump into the
    // tunnel goes, and quietly costs the whole headroom budget.
    this.rock(startX - 26, roofY, 26, ROOF, 'roof');
    this.zone(startX - 26, exit.x - startX + 26, this.y - headroom - ROOF, this.y + 40, 'tunnel');

    for (let i = 0; i < icicles; i++) {
      const f = this.floes[this.floes.length - 1 - n + Math.min(n - 1, i + 1)];
      if (f) this.hazard({ kind: 'icicle', x: f.x + f.w * 0.5, y: f.y - headroom, drop: headroom - 20 });
    }
    this._apex = apex;
    return this;
  }

  /**
   * A summit: a hard climb onto a high plateau. Expensive in vertical space,
   * which is exactly why it feels like somewhere.
   */
  summit({ height = 220, w = 240, steps = 3 } = {}) {
    const per = height / steps;
    for (let i = 0; i < steps; i++) {
      const rise = Math.min(this.riseOf(0.62), per);
      this.put(this.gapOf(0.36), i === steps - 1 ? w : 118, clampY(this.y - rise));
    }
    const last = this.floes[this.floes.length - 1];
    this.rock(last.x + 4, last.y + 26, last.w - 8, WATER - last.y, 'cliff');
    return this;
  }

  /**
   * A gap with an orca in it. The jump is wide enough that it cannot be
   * shortcut, and the whale is in open water rather than under the ice, so it
   * is always something you cross rather than something that finds you.
   */
  orcaGap({ gap = 0.55, w = 170, period = 3.2 } = {}) {
    const from = this.x;
    // The whale needs open water to breach into, so the gap is widened until
    // it has some. A whale tucked under the ice is not a hazard, it is a bug.
    const ORCA_W = 76;
    const span = Math.max(this.gapOf(gap), ORCA_W + 60);
    const f = this.put(span, w, this.y);
    // Measured from where the floe actually landed, not from the gap that was
    // asked for: `put` is allowed to shorten a gap (leaving a stepping stone
    // costs part of the jump), and a whale positioned from the request instead
    // of the result ends up under the ice.
    this.hazard({
      kind: 'orca',
      x: Math.round(from + (f.x - from - ORCA_W) / 2),
      y: WATER - 30,
      w: ORCA_W,
      h: 60,
      period: Math.max(2.6, period),
      height: 250,
    });
    return f;
  }

  /** A run of geysers with safe ice between them. */
  geysers({ n = 3, gap = 0.36, rise = 0, timed = false } = {}) {
    for (let i = 0; i < n; i++) {
      const extra = timed ? { burstPeriod: 3.4 + i * 0.4, burstPhase: i * 0.6 } : {};
      this.put(this.gapOf(gap), 200, this.y, 'burst', extra);
      this.put(this.gapOf(gap), 175, clampY(this.y - this.riseOf(rise)));
    }
    return this;
  }

  /** Finish: a wide, safe shelf, so the last jump is never the deciding one. */
  landing({ w = 240 } = {}) {
    return this.put(this.gapOf(0.34), w, this.y);
  }

  /* ------------------------------------------------------------ build */

  /**
   * Close the course into a level definition. The world is sized from what was
   * actually placed rather than declared up front, so a course cannot end up
   * with the sea in the wrong place or a summit off the top of the screen.
   */
  /**
   * The back of the level.
   *
   * Walking *left* off the spawn used to drown you. The shelf simply stopped a
   * body's width behind where the penguin started, and on level one, whose only
   * sign reads "Yürü: ← →", pressing the left half of that instruction killed
   * you in under half a second. Falling in the sea is the game; falling in the
   * sea for obeying the tutorial is not.
   *
   * A level has a front, so it needs a back. The first floe is carried out to
   * the world's edge and a wall of rock is put behind it: the coast the penguin
   * came down from. Nothing about the route changes, because the route only
   * ever reads the floe's *right* edge.
   */
  _closeTheBack() {
    const first = this.floes[0];
    if (!first || first.x <= WALL) return;
    const grew = first.x - WALL;
    first.x = WALL;
    first.w += grew;
    // From the very top of the world, not from the ceiling: a wall that starts
    // partway down reads as a floating slab on a tall camera.
    this.rock(0, 0, WALL, WATER, 'back');
  }

  build(meta) {
    this._closeTheBack();

    const last = this.floes[this.floes.length - 1];
    const goalX = last.x + last.w - 70;
    const worldW = Math.round(last.x + last.w + 120);
    // The sea is always at the bottom; height varies at the top, which is
    // where cliffs and summits actually use it.
    const worldH = SKY;

    return {
      ...meta,
      worldW,
      worldH,
      waterY: WATER,
      // Measured from the first floe rather than from where the composer
      // happened to start, and in bodies rather than in pixels, so it means the
      // same thing at every growth scale. `_closeTheBack` has already made sure
      // there is ground on the other side of it.
      spawn: { x: this.spawnX ?? this.floes[0].x + 80, y: this.floes[0].y },
      goal: { x: goalX, y: last.y },
      floes: this.floes,
      terrain: this.terrain,
      zones: this.zones,
      hazards: this.hazards,
      fish: this.fish,
      speedFish: this.speedFish,
      /**
       * Moved clear of the ice as the very last thing the composer does.
       *
       * Not at the moment each one is placed, which is where this lived first
       * and where it did not work: a chapter that builds its perches or its
       * ceilings after the pickups would have the fish checked against a level
       * that was not finished yet. Level seventy-six put a slack fish exactly
       * on a rival's perch that way. Done here, every block that will ever
       * exist already does.
       */
      chargedFish: this.chargedFish.map((f) =>
        nudgeClear(f, [...this.floes, ...(this.terrain ?? [])]),
      ),
      rotFish: this.rotFish,
      checkpoints: this.checkpoints,
      /** Gaps that only the tailwind crosses, for the validator to prove. */
      windGaps: this.windGaps ?? [],
      updrafts: this.updrafts ?? [],
    };
  }
}
