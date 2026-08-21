/**
 * Vertical course composition — the mountain.
 *
 * The shelf chapter is a sentence read left to right: the camera scrolls, the
 * question is always "can I reach that", and after thirty levels the player has
 * a complete answer. So the mountain asks a different question, and it needs a
 * different composer to ask it.
 *
 * A tower is built bottom to top. The cursor carries a height and a position
 * across the shaft, and each segment places ledges and ice walls and hands the
 * cursor up. Two things make it a climb rather than a rotated shelf:
 *
 *   1. Walls are grippable. A `wall` is terrain marked `climb`, and the penguin
 *      can hang on it, creep up it and kick off it — on a stamina bar that only
 *      refills on solid ground. So a shaft with no ledges in it is not an
 *      impossible jump, it is a *route*, and the route costs something.
 *
 *   2. A jump that gains height has almost no horizontal travel left. The
 *      composer places every ledge through `reachAt`, which couples the two
 *      instead of budgeting them separately, so a ledge is never signed off on
 *      arithmetic that a real trajectory would not survive.
 *
 * Everything a segment places is recorded on `this.route` with *how* it is
 * meant to be reached — `jump`, `kick` or `creep`. The validator checks the
 * geometry actually supports the declared move, which is what keeps "the
 * designer meant you to wall-jump here" from quietly becoming "nobody can pass".
 */

import { reachFor, reachAt, climbBudget, kickGain, openingWidth, CLIMB, PENGUIN } from './config.js';

/** Thickness of an ice wall. Thick enough to read as the mountain, not a line. */
const WALL_T = 44;
/** Sky above the summit — the camera needs somewhere to look. */
const TOP_MARGIN = 210;
/** Water below the base. Falling all the way down is a disaster, not a death. */
const BASE_MARGIN = 150;
/** How far into a ledge the penguin realistically lands. Same as the shelf. */
const FOOTING = 0.72;

/**
 * How much of the theoretical budget a segment is allowed to spend.
 *
 * A climb has no margin of the kind a shelf has — you cannot walk back three
 * steps and take the jump again — so these are deliberately meaner than the
 * shelf's 0.86.
 */
const BUDGET = {
  /** Fraction of the coupled reach a plain jump between ledges may use. */
  jump: 0.78,
  /** Fraction of a full stamina bar a single kick-chain may cost. */
  kick: 0.62,
  /** Fraction of a full bar a single creep may cost. */
  creep: 0.6,
};

/**
 * How hard this particular climb leans on the bar.
 *
 * The three numbers above were the whole chapter's difficulty, which is to say
 * the chapter had none: fifteen climbs all allowed to spend the same fraction
 * of the same arms. Measured, the chapter sloped at a third of what it should.
 *
 * `effort` multiplies them per level. One is the old chapter. Past one the
 * shafts get taller for the same pair of arms, which is the only thing this
 * chapter can make harder without changing what it is about.
 *
 * The ceiling is the fairness line: a climb allowed the *whole* bar is a climb
 * that has to be done without one wasted grab, and a chapter of those is not
 * difficult, it is a stopwatch.
 */
const EFFORT_CEILING = 1.6;

/**
 * The most of one bar a single shaft may ever ask for, whatever its effort.
 *
 * Deliberately a little under the line the validator holds, so the validator
 * stays an independent check rather than an echo: if these two ever meet, the
 * second one has stopped being able to disagree with the first.
 */
const LEAN_CAP = 0.9;
const leanOn = (base, effort) => Math.min(LEAN_CAP, base * effort);

export class Tower {
  /**
   * @param {{scale?:number, width?:number}} opts inner span of the shaft
   */
  constructor({ scale = 1, width = 520, effort = 1 } = {}) {
    this.effort = Math.min(EFFORT_CEILING, Math.max(0.6, effort));
    this.scale = scale;
    this.reach = reachFor(scale);
    this.penguinW = PENGUIN.w * scale;
    /** Inner span of the mountain: walls stand just outside it. */
    this.width = width;

    /** Cursor: where the last ledge was, in tower coordinates (y grows down). */
    this.cx = width / 2;
    this.y = 0;
    this.top = 0;

    this.floes = [];
    this.terrain = [];
    this.hazards = [];
    this.fish = [];
    this.speedFish = [];
    this.rotFish = [];
    this.checkpoints = [];
    this.zones = [];
    /** The intended route: every ledge in order, with how it is reached. */
    this.route = [];
    /** Wall columns, kept separately so the validator can ask "is ice here?". */
    this.walls = [];
  }

  /* --------------------------------------------------------- geometry */

  /** Narrowest a ledge may be: anything less is not somewhere to stand. */
  get minWidth() {
    return this.penguinW * 1.7;
  }

  /** How far sideways a jump reaches if it also has to gain `rise` pixels. */
  reachRising(rise) {
    return reachAt(this.scale, Math.max(0, rise)) * BUDGET.jump;
  }

  /** Highest a plain jump between ledges is allowed to climb. */
  get maxRise() {
    return this.reach.height * 0.84;
  }

  /**
   * The rise a step needs so it does not become a roof.
   *
   * A shaft is narrow, and once a wide ledge is clamped away from the wall the
   * next one often sits partly over it. That is fine — ledges overlap on a real
   * mountain — as long as there is a penguin's worth of air in between. When
   * there is not, the step climbs higher instead, and if the jump cannot climb
   * that high the plan is wrong and says so.
   */
  /**
   * Where the next ledge actually goes.
   *
   * Two ledges that overlap each other horizontally make a bad step even when
   * there is technically room to stand between them: the upper one roofs the
   * spot you have to jump from, so the move becomes "leave the ground, clear
   * the edge above you, then drift back over it" — which is a trick, not a
   * jump, and no honest reach calculation describes it.
   *
   * So a step always lands clear of the one below. It shifts to make room,
   * narrows if the shaft is tight, and turns around if that side is full.
   */
  /**
   * Where a wall column may start.
   *
   * A wall stops at the ledge it grows from, which sounds sufficient and is
   * not: the ledges *before* that one are usually at nearly the same height,
   * and a jump between them arches a hundred pixels up — straight through the
   * column. The route reads as fine on paper, every landing is inside the
   * budget, and the level is impassable because the penguin keeps flying into
   * something the plan never mentioned.
   *
   * Nothing catches that except asking. So this asks: is there ice under this
   * column that somebody has to jump over? If there is, the column starts
   * above the top of that jump, and the shaft gets a mouth you leap into
   * rather than a base you step into.
   */
  _wallFoot(columns, floor, soft = false) {
    // Two different clearances, because two different things happen under a
    // column. Over a ledge the penguin is *standing*, and it only needs room
    // for its head — pushing the column a full jump higher there just puts the
    // mouth of the shaft out of reach. Over the gap between two ledges it is
    // *flying*, and the column has to clear the top of that arc.
    const standing = PENGUIN.h * this.scale * 1.5;
    // The apex of the jump plus the penguin *itself*: what has to clear the
    // column is the top of its head, not the soles of its feet, and forgetting
    // the body is a fifty-five pixel error that puts a column exactly where
    // the penguin's head goes.
    const flying = this.reach.height + PENGUIN.h * this.scale + 10;
    let foot = floor;
    const blocking = this.floes.map((f) => ({ ...f, need: standing }));
    // Every jump on the route so far is airspace too, not just the last one.
    // A column dropped into the middle of any of their corridors is something
    // the player flies into — or, worse, grabs by accident halfway across a
    // traverse — and only the most recent one used to be checked, which let a
    // wall sit squarely in the arc of the jump two steps back.
    for (let i = 1; i < this.route.length; i++) {
      const a = this.route[i - 1];
      const b = this.route[i];
      // Only the gap between them: over the ledges themselves the airspace is
      // already accounted for by the ledges, and taking the full span would
      // reserve half the mountain every time.
      const left = Math.min(a.x + a.w, b.x + b.w);
      const right = Math.max(a.x, b.x);
      if (right > left) {
        blocking.push({ x: left, w: right - left, y: Math.max(a.y, b.y), need: flying });
      }
    }

    for (const col of columns) {
      for (const f of blocking) {
        if (f.x + f.w <= col.x || f.x >= col.x + col.w) continue;
        if (f.y < foot) continue;
        foot = Math.min(foot, f.y - f.need);
      }
    }
    // The mouth still has to be grabbable from the ledge below it: the apex of
    // a jump plus most of a body length is as high as a grip can start.
    const lift = this.y - foot;
    if (lift > this.grabCeiling && !soft) {
      throw new Error(
        `baca ağzı ${Math.round(lift)}px yukarıda, tutunma sınırı ${Math.round(this.grabCeiling)}px`,
      );
    }
    return Math.round(foot);
  }

  /**
   * How far above a ledge the foot of a wall may hang and still be caught.
   *
   * At the top of a jump the penguin's feet are a jump-height up and its body
   * is above that, so the grip can start higher than the feet ever reach.
   */
  get grabCeiling() {
    return this.reach.height + PENGUIN.h * this.scale * 0.8;
  }

  /**
   * Climb until the mouth of the shaft is within reach.
   *
   * Lifting a column clear of the jumps beneath it can put its foot further up
   * than anybody can jump to. The answer is not to drop the column back into
   * the flight path — it is to start the shaft from higher ground, so the
   * segment adds the steps it needs.
   */
  _approach(columns) {
    // Aim for a foot that all but touches the ledge below it.
    //
    // "Within reach" is not the bar. A mouth eighty pixels up is reachable and
    // still awful: the penguin has to travel sideways to the face *and* rise to
    // the foot in the same arc, and if it arrives early it hits the underside,
    // late it has already passed. A foot at the ledge is simply a wall you step
    // onto.
    const comfortable = 30;
    for (let tries = 0; tries < 3; tries++) {
      const foot = this._wallFoot(columns, this.y - 6, true);
      if (this.y - foot <= comfortable) return foot;
      this._step(this.cx > this.width / 2 ? -1 : 1, 140, Math.round(this.maxRise), 'solid');
    }
    return this._wallFoot(columns, this.y - 6);
  }

  /**
   * Place one step, sized for the rise it actually ends up taking.
   *
   * The order matters and used to be wrong. The horizontal span was worked out
   * from the rise the plan asked for, and only then did the clearance rule push
   * the step higher to clear whatever was under it — leaving a jump sized for a
   * flat hop that now has to climb ninety pixels. A jump cannot do both, so the
   * span is re-derived once the real rise is known.
   */
  _step(dir, w, dy, type, via = 'jump') {
    let rise = dy;
    let slot = null;
    // Iterate until the two agree: the span is derived from the rise, and the
    // rise can be pushed up by whatever the step has to clear, which then makes
    // the span wrong again. Two passes was not always enough — the last one
    // could place a ledge sized for a rise it no longer had.
    for (let pass = 0; pass < 5; pass++) {
      slot = this._stepSlot(dir, this.reachRising(rise) * 0.9, w, rise);
      const needed = this._clearRise(slot.cx, slot.w, slot.dy ?? rise);
      if (needed <= rise + 0.5) break;
      rise = needed;
    }
    this._place(slot.cx, this.y - rise, slot.w, type, via);
    return slot.dir;
  }

  _stepSlot(dir, across, w, dy) {
    // A gap has to be at least a body wide.
    //
    // Twelve pixels is the worst possible spacing: too far apart to be a step
    // up, too close together for the penguin to stand clear of the upper
    // ledge's edge — so the only take-off point is directly underneath it, and
    // the jump ends against its underside. A body's width means there is
    // always somewhere to leave from.
    const MIN_GAP = 14;
    const prev = this.floes[this.floes.length - 1];
    for (const d of [dir, -dir]) {
      let width = w;
      for (let attempt = 0; attempt < 2; attempt++) {
        // The span is re-derived per candidate width. Narrowing a ledge without
        // re-deriving it leaves the gap sized for the ledge that did not fit,
        // which is how a summit ends up a hundred and sixty pixels away.
        const want = this.cx + d * (across + (prev ? prev.w * FOOTING : 0) / 2 + width / 2);
        const pad = width / 2 + 8;
        let cx = d > 0
          ? Math.max(want, prev.x + prev.w + MIN_GAP + width / 2)
          : Math.min(want, prev.x - MIN_GAP - width / 2);
        cx = Math.max(pad, Math.min(this.width - pad, cx));
        const clears = d > 0
          ? cx - width / 2 >= prev.x + prev.w + MIN_GAP - 0.5
          : cx + width / 2 <= prev.x - MIN_GAP + 0.5;
        if (clears) return { cx, w: width, dir: d, dy };
        width = this.minWidth;
        if (width >= w) break;
      }
    }
    // Nowhere on this level: the only honest answer left is to climb straight
    // up, which needs the roof clearance the stacking rule asks for.
    return { cx: Math.max(w / 2 + 8, Math.min(this.width - w / 2 - 8, this.cx)), w, dir, dy: null };
  }

  /**
   * The rise a step needs so it does not become a roof.
   *
   * A shaft is narrow, and once a wide ledge is clamped away from the wall the
   * next one often sits partly over it. That is fine — ledges overlap on a real
   * mountain — as long as there is a penguin's worth of air in between. When
   * there is not, the step climbs higher instead, and if the jump cannot climb
   * that high the plan is wrong and says so.
   */
  _clearRise(cx, w, dy) {
    // Head-room, not a squeeze. A quarter of a body over the penguin's head
    // sounds like clearance and is not: the arc of the jump *onto* a ledge
    // rises far above the ledge itself, so anything within about two thirds of
    // a jump above it gets clipped on the way in.
    const clearance = PENGUIN.h * this.scale * 1.45 + 20;
    const left = cx - w / 2;
    const right = cx + w / 2;
    let need = dy;
    for (const other of [...this.floes, ...this.walls]) {
      if (other.x + other.w <= left || other.x >= right) continue;
      // Negative means the two boxes actually intersect — the same clash, and
      // the one that used to slip through: "is something too close above me"
      // has nothing to say about "am I inside something".
      const gapTo = other.y - (this.y - dy) - 20;
      // A column head is not something you can stand under at all: the ledge
      // has to clear it outright, not merely leave headroom over it.
      if (other.climb && gapTo > -34 && gapTo < clearance - 20) {
        need = Math.max(need, this.y - other.y + clearance);
        continue;
      }
      if (gapTo > -34 && gapTo < clearance - 20) {
        need = Math.max(need, this.y - other.y + clearance);
      }
    }
    if (need > this.maxRise + 0.5) {
      throw new Error(
        `basamak ${Math.round(need)}px yükselmeli ama zıplama ${Math.round(this.maxRise)}px`,
      );
    }
    return Math.round(need);
  }

  _place(cx, y, w, type = 'solid', via = 'jump', extra = {}) {
    // A cornice is allowed to be narrower than a general ledge: it is a landing
    // pinned to a wall, not somewhere to walk about, and widening it to the
    // usual minimum pushes it into the column it is resting against.
    const { minW, ...rest } = extra;
    extra = rest;
    w = Math.max(minW ?? this.minWidth, w);
    const floe = {
      x: Math.round(cx - w / 2),
      y: Math.round(y),
      w: Math.round(w),
      type,
      ...extra,
    };
    // Two ledges stacked less than a body apart is a ledge you cannot stand
    // on: the one above is a ceiling. Easy to write by accident — a gentle
    // rise plus a wide platform is enough — and impossible to see in a plan,
    // so it fails the build here rather than trapping a player later.
    const clearance = PENGUIN.h * this.scale * 1.45;
    for (const other of [...this.floes, ...this.walls]) {
      if (other.x + other.w <= floe.x || other.x >= floe.x + floe.w) continue;
      // A cornice is *meant* to sit level with the head of the column it rests
      // against — that is what makes the last kick out of a shaft a flat one.
      // Nothing else is: a ledge placed at wall-top height anywhere else is a
      // ledge with a column running through it.
      if (other.climb && extra.rim) continue;
      const head = other.y - (floe.y + 20);
      if (head <= 0 && other.y + 20 > floe.y) {
        throw new Error(
          `buz ${Math.round(floe.x)},${Math.round(floe.y)} bir başkasının içinde`,
        );
      }
      if (head > 0 && head < clearance) {
        throw new Error(
          `buzun üstünde ${Math.round(head)}px kalıyor, penguen ${Math.round(clearance)}px istiyor`,
        );
      }
    }
    this.floes.push(floe);
    this.route.push({ ...floe, via, i: this.floes.length - 1 });
    this.cx = cx;
    this.y = floe.y;
    this.top = Math.min(this.top, floe.y);
    return floe;
  }

  /**
   * A column of climbable ice.
   *
   * `side` is which face is grippable, which is only used to decide where the
   * column is drawn: a wall on the left of the shaft has its face pointing
   * right. The physics probe does not care — it finds whichever face the
   * penguin is pressed against.
   */
  wall(x, yTop, height, kind = 'wall') {
    const block = {
      x: Math.round(x),
      y: Math.round(yTop),
      w: WALL_T,
      h: Math.round(height),
      kind,
      climb: true,
    };
    this.terrain.push(block);
    this.walls.push(block);
    this.top = Math.min(this.top, block.y);
    return block;
  }

  /** Plain rock: an overhang, a buttress. Solid, and emphatically not grippable. */
  rock(x, y, w, h, kind = 'rock') {
    const block = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), kind };
    this.terrain.push(block);
    this.top = Math.min(this.top, block.y);
    return block;
  }

  zone(y, height, kind) {
    this.zones.push({
      x: -WALL_T,
      w: this.width + WALL_T * 2,
      top: Math.round(y),
      bottom: Math.round(y + height),
      kind,
    });
  }

  hazard(def) {
    this.hazards.push(def);
    return def;
  }

  checkpoint(floe = this.floes[this.floes.length - 1]) {
    this.checkpoints.push({ x: Math.round(floe.x + floe.w / 2 - 12), y: floe.y });
    return this;
  }

  /* --------------------------------------------------------- segments */

  /** The foot of the mountain: a wide ledge you start from. */
  base({ w = 260 } = {}) {
    this._place(this.width / 2, 0, w, 'solid', 'start');
    return this;
  }

  /**
   * Ledges up the shaft, alternating sides.
   *
   * Each step asks for a rise as a fraction of the jump height, and the
   * sideways travel is then whatever is *left* at that rise — which is why a
   * steep staircase is automatically a narrow one.
   */
  steps({ n = 3, rise = 0.66, w = 128, sway = 0.9, type = 'solid', start = 1 } = {}) {
    let dir = start;
    for (let i = 0; i < n; i++) {
      const dy = Math.round(Math.min(this.maxRise, this.reach.height * rise));
      dir = -this._step(dir, w, dy, type);
    }
    return this;
  }

  /**
   * A chimney: two facing ice walls and nothing to stand on between them.
   *
   * This is the chapter's whole argument. There is no jump that crosses it —
   * the only way up is to hold on, and holding on runs out. The composer
   * refuses any shaft a full stamina bar cannot clear with margin, and refuses
   * any shaft so wide that a kick would lose height crossing it.
   */
  chimney({ height = 380, span = null, rests = 0, hazard = null, lip = 0 } = {}) {
    let rim = 1;
    const inner = span ?? Math.round(this.reach.distance * 0.9);
    const gain = kickGain(this.scale, inner);
    const budget = climbBudget(this.scale, inner);
    // Both of these are build-time errors rather than validator findings: a
    // chimney that cannot be climbed is not a hard level, it is a wall, and it
    // should never reach a file the validator has to read.
    if (gain <= 12) {
      throw new Error(`baca çok geniş: ${inner}px, tekme ${Math.round(gain)}px kazandırıyor`);
    }
    const ceiling = (rests + 1) * Math.max(budget.kicked, budget.creep) * leanOn(BUDGET.kick, this.effort);
    // The plan says how tall this shaft is *for the chapter's easiest climb*;
    // the level's effort says how much taller it is here. A plan does not get
    // to write a number that means two different things in two levels, and a
    // dial that raises a ceiling nobody reaches raises nothing at all.
    height = Math.round(height * this.effort);
    // Below this a shaft stops being a shaft: the two faces are shorter than
    // the penguin's own jump, one of them degenerates, and what the level
    // contains is a step with decoration on it. An easy chimney is still a
    // chimney.
    height = Math.max(height, Math.round(this.reach.height * 1.35));
    if (height > ceiling) {
      throw new Error(`baca çok yüksek: ${height}px, ${rests} molayla sınır ${Math.round(ceiling)}px`);
    }

    // The top-out is the part that has to be got right, and the only geometry
    // that survives contact with the physics is this one:
    //
    //   · both walls stop at the same height
    //   · a cornice juts from *one* of them across most of the shaft
    //   · the gap left beside the other wall is the way through
    //
    // So the last move out of a chimney is the same move as every other move
    // in it — hold the far wall, kick, land. No special case, nothing to
    // learn twice, and nothing that depends on pixel-perfect mantling.
    // The shaft has to fit inside the mountain, walls included, so the centre
    // is pulled in rather than letting a wall hang off the edge of the world.
    const half = inner / 2 + WALL_T;
    // Shaft and launch ledge are decided *together*, and re-decided every time
    // the approach adds a step.
    //
    // This used to fix the shaft over wherever the cursor happened to be, then
    // climb toward the mouth if the mouth was too high — and the climbing moved
    // the cursor. So the ledge the player actually leaves from ended up beside
    // the shaft instead of under it, sometimes two hundred pixels beside it,
    // and the route cheerfully declared a wall step from a ledge with no shaft
    // above it. You cannot enter a chimney you are not standing under. The
    // shaft follows the ledge now, one pass per step, the same way `face` has
    // always placed its own launch ledge before committing to a column.
    const comfortable = 30;
    let cx = 0;
    let leftFace = 0;
    let rightFace = 0;
    let cols = [];
    // Wall bottoms stop just above the ledge the climb starts from. A column
    // that reaches down to the ledge's own height overlaps it, and a ledge
    // buried in a wall is a ledge the player falls through the side of.
    // Each column gets its own foot. A jump corridor almost always crosses
    // only one of them, and making both start as high as the worst case pushes
    // the mouth of the shaft out of reach for no reason — the penguin only
    // needs *one* hand-hold to get in.
    let feet = [];
    for (let tries = 0; tries < 5; tries++) {
      cx = Math.max(half, Math.min(this.width - half, this.cx));
      leftFace = cx - inner / 2;
      rightFace = cx + inner / 2;
      cols = [
        { x: leftFace - WALL_T, w: WALL_T },
        { x: rightFace, w: WALL_T },
      ];
      feet = cols.map((c) => this._wallFoot([c], this.y - 6, true));
      if (this.y - Math.max(...feet) <= comfortable) break;
      if (tries === 4) break;
      this._step(this.cx > this.width / 2 ? -1 : 1, 140, Math.round(this.maxRise), 'solid');
    }
    const lowest = Math.max(...feet);
    if (this.y - lowest > this.grabCeiling) {
      throw new Error(
        `baca ağzı ${Math.round(this.y - lowest)}px yukarıda, ` +
          `tutunma sınırı ${Math.round(this.grabCeiling)}px`,
      );
    }
    // Top out on whichever column reaches lower: that is the one the penguin
    // can get onto in the first place.
    if (feet[0] > feet[1]) rim = -1;
    else if (feet[1] > feet[0]) rim = 1;
    const wallBottom = lowest;
    // Same rule as a single face: `height` is how much shaft gets climbed, so
    // it is measured from the foot of the columns. When the foot has been
    // lifted clear of a corridor below, the shaft starts higher — it does not
    // silently become a shorter climb than the budget was checked against.
    const wallTop = wallBottom - height;
    // The cornice sits *level* with the heads of the columns, not above them.
    // Raised even a ledge's thickness, its underside becomes a lip exactly
    // where the last kick passes, and the climb dies five pixels from the top.
    const yTop = wallTop;
    this.zone(wallTop, wallBottom - wallTop, 'chimney');

    // Rest ledges: a break in one wall, with a shelf standing on it.
    //
    // A shelf bolted flat onto a wall face reads well in a drawing and does
    // not work. The face it hangs off is the same face the penguin climbs, so
    // the first thing the climb meets is the shelf's *underside* — and a rest
    // you cannot get onto is worse than no rest at all. That is not a theory:
    // every shaft with one died at exactly the shelf's height, in four
    // different levels, within twenty pixels.
    //
    // So the wall itself breaks. The lower stretch of the column ends at the
    // shelf, which is its head, and the penguin tops out onto it exactly the
    // way it tops out of the shaft: cling, pull over, stand up, breathe.
    // Above the shelf there is a body's worth of air and then the ice resumes,
    // close enough to jump straight back onto. Same verb three times a shaft,
    // nothing new to learn, and the rest is somewhere you arrive rather than
    // somewhere you hope to clip.
    const restGap = Math.round(PENGUIN.h * this.scale * 1.3);
    const restYs = [];
    const restSides = [];
    /** Where each column is cut, lowest first. Index 0 is the left column. */
    const cuts = [[], []];
    for (let i = 1; i <= rests; i++) {
      const y = Math.round(wallBottom - ((wallBottom - wallTop) * i) / (rests + 1));
      const side = i % 2 ? -1 : 1;
      cuts[side < 0 ? 0 : 1].push(y);
      restYs.push(y);
      restSides.push(side);
    }
    for (let k = 0; k < 2; k++) {
      const x = k === 0 ? leftFace - WALL_T : rightFace;
      let bottom = feet[k];
      for (const y of cuts[k].slice().sort((m, n) => n - m)) {
        if (y >= bottom - 40) continue;
        this.wall(x, y, bottom - y);
        this.floes.push({
          x: Math.round(x),
          y,
          w: WALL_T,
          type: 'solid',
          nub: true,
          rim: true,
          head: true,
        });
        bottom = y - restGap;
      }
      if (bottom - wallTop > 40) this.wall(x, wallTop, bottom - wallTop);
    }

    // A lip: rock jutting from a wall partway up, so one kick in the shaft has
    // to be taken under something. It cannot be gripped — a slab you could
    // hang off is a ladder, not an obstacle.
    //
    // Which wall it grows from is decided here rather than by the plan, and
    // the rule is: never the wall a rest ledge is on. Rock hanging over the
    // one place in a shaft where you can stand up and get your breath back is
    // not a hard obstacle, it is a ceiling you cannot get out from under.
    if (lip > 0) {
      const depth = Math.round(inner * 0.42);
      if (inner - depth < this.penguinW + 24) {
        throw new Error(`baca dudağı geçilmiyor: ${Math.round(inner - depth)}px kalıyor`);
      }
      let ly = Math.round(this.y - height * lip);
      // A shaft with rest shelves in it is really several short climbs stacked
      // up, and only the first of them starts from a full bar with the whole
      // shaft still ahead. That is the stretch that can afford an obstacle.
      // Above a shelf the penguin is committed — no ground under it, one
      // hold's worth of arm left and the exit to reach — and rock in *that*
      // stretch is not a hard move, it is a lid. Measured: a lip in the last
      // stretch was the single thing keeping the tallest climb in the chapter
      // out of the game.
      const floor = restYs.length ? Math.max(...restYs) : wallTop;
      ly = Math.max(floor + 70, Math.min(wallBottom - 48, ly));
      // Which wall: never the one the nearest shelf is on. Rock hanging over
      // the one place in a shaft where you can stand up and get your breath
      // back is not a hard obstacle either.
      let side = rim > 0 ? -1 : 1;
      if (restYs.length) {
        const near = restYs.reduce((best, y) => (Math.abs(y - ly) < Math.abs(best - ly) ? y : best));
        const nearSide = restSides[restYs.indexOf(near)];
        side = -nearSide;
      }
      this.rock(side < 0 ? leftFace : rightFace - depth, ly, depth, 30, 'lip');
    }

    if (hazard === 'shards') {
      this.hazard({
        kind: 'shard',
        x: Math.round(cx - 22),
        y: Math.round(wallTop + 30),
        w: 44,
        h: 34,
        fall: height,
        // The gap between falls is derived from the drop, not typed.
        //
        // A serac in a tall shaft spends longer in the air than one in a short
        // shaft, so a fixed four-second cycle quietly turned into "dangerous
        // two fifths of the time" the moment the shafts grew — and a hazard you
        // cannot wait out is not a hazard, it is a wall. The rule the validator
        // holds is that the dangerous share stays waitable; this is the
        // composer keeping it rather than being caught breaking it.
        period: Math.max(4.2, +(((Math.sqrt((2 * height) / 2000) + 0.4) / 0.3).toFixed(2))),
        warn: 0.4,
        // Asleep until the penguin is properly into the shaft. Below this it
        // is a shadow overhead, which is the warning that the shaft has one.
        arm: Math.round(wallBottom - height * 0.22),
      });
    }

    // Topping out.
    //
    // There used to be a cornice hanging inside the shaft, and the last kick
    // had to thread the gap beside it and land on a seventy-pixel shelf with a
    // column at each end. It worked on paper and missed by five pixels in
    // practice, over and over, because the one move in the chapter with no
    // margin was the one every chimney ended with.
    //
    // So the shaft simply ends. The heads of the columns are solid ground —
    // that is what you pull over onto, the way you top out of a real chimney —
    // and the route continues from there. Nothing to thread, nothing to clip.
    // The head is exactly the width of the column, and stays that way. A wider
    // landing looks like an obvious kindness and measurably is not: every extra
    // pixel pushes the steps above it around, and shafts that worked stop
    // working. Measured, not guessed — a seventy-pixel shelf cost two levels.
    const headX = rim > 0 ? rightFace : leftFace - WALL_T;
    this._place(headX + WALL_T / 2, wallTop, WALL_T, 'solid', 'kick', {
      minW: WALL_T,
      rim: true,
      head: true,
    });
    Object.assign(this.route[this.route.length - 1], {
      chimney: { inner, height, rests, climbSide: rim > 0 ? -1 : 1, headX },
    });

    // A shoulder: the step off the column head onto open mountain, placed by
    // the segment rather than left to whatever the plan writes next. It goes
    // *away* from the shaft, so nothing after a chimney has to work around the
    // hole the chimney just left behind.
    this._step(rim > 0 ? 1 : -1, 150, Math.round(this.reach.height * 0.62), 'solid');
    return this;
  }

  /**
   * A single wall you climb by creeping, with the exit on the far side.
   *
   * Slower and more expensive per pixel than a chimney, and the reason it
   * exists is that it cannot be rushed: there is no second wall to bounce off,
   * so the bar drains at the climbing rate the whole way.
   */
  face({ height = 200, side = null, exit = 160 } = {}) {
    const budget = climbBudget(this.scale, this.width);
    const ceiling = budget.creep * leanOn(BUDGET.creep, this.effort);
    height = Math.round(height * this.effort);
    if (height > ceiling) {
      throw new Error(`duvar çok yüksek: ${height}px, tırmanma sınırı ${Math.round(ceiling)}px`);
    }
    // A single wall needs three things in a row: somewhere to launch from, the
    // column itself, and ground beyond its head to pull onto. That is a lot of
    // width, and where the cursor happens to be sitting is rarely where it
    // fits — so the segment places its own launch ledge over on whichever side
    // of the mountain has the room, and builds outward from there.
    const need = WALL_T + Math.max(this.minWidth, exit) + 20;
    let dir = side ?? (this.cx <= this.width / 2 ? 1 : -1);
    if (dir > 0 ? this.width - need - 60 < this.minWidth : need + 60 > this.width - this.minWidth) {
      dir = -dir;
    }
    const dy = Math.round(this.reach.height * 0.5);
    const wantCx = dir > 0 ? this.width - need - 60 : need + 60;
    // Launch ledge, column and mouth are decided together, and re-decided if
    // the mouth ends up too high. Placing the ledge once and then letting the
    // approach add more steps underneath it left the column pinned beside a
    // ledge the penguin had already climbed past — two hundred pixels from
    // where it was actually standing.
    let ledge = null;
    let wallX = null;
    let foot = null;
    const comfortable = 30;
    for (let tries = 0; tries < 5; tries++) {
      this._step(dir, 132, tries === 0 ? dy : Math.round(this.maxRise), 'solid');
      ledge = this.floes[this.floes.length - 1];
      const fits = (d) => {
        const wx = d > 0 ? ledge.x + ledge.w + 6 : ledge.x - 6 - WALL_T;
        if (wx < 0 || wx + WALL_T > this.width) return null;
        const room = d > 0 ? this.width - (wx + WALL_T) : wx;
        return room >= this.minWidth + 8 ? wx : null;
      };
      wallX = fits(dir);
      if (wallX === null) {
        dir = -dir;
        wallX = fits(dir);
      }
      if (wallX === null) {
        throw new Error('duvara ve çıkışına yer yok — kalkış buzu kenara çok yakın');
      }
      foot = this._wallFoot([{ x: wallX, w: WALL_T }], this.y - 6, true);
      if (this.y - foot <= comfortable) break;
    }
    if (this.y - foot > this.grabCeiling) {
      throw new Error(
        `duvarın eteği ${Math.round(this.y - foot)}px yukarıda, ` +
          `tutunma sınırı ${Math.round(this.grabCeiling)}px`,
      );
    }
    // `height` is how much wall gets climbed, so it is measured from the foot.
    // Measuring it from the ledge instead quietly hands back every pixel the
    // foot was lifted by — and a 120px climb turns into a 49px stub with a
    // gap under it that the penguin walks straight off.
    const yTop = foot - height;
    this.wall(wallX, yTop, height);

    // The exit is the top of the wall itself, continued outward as a ledge.
    //
    // Anything else does not work, and the reason is worth writing down: a
    // ledge on the far side of the shaft has to be kicked to, and a kick from a
    // *single* wall has nothing to aim at. A ledge overhanging the wall roofs
    // the very column the penguin is climbing, and the climb dead-ends against
    // its underside about a body length from the top. So the wall ends where
    // the ground begins, and the last move is pulling over the edge.
    // The exit covers the head of the column rather than butting up against
    // it. Flush is a seam, and a penguin that has just pulled over the top
    // stands astride that seam — technically on the wall, technically not on
    // the ledge, and one pixel from either. Overlapping the two means topping
    // out *is* arriving.
    const room = dir > 0 ? this.width - (wallX + WALL_T) : wallX;
    const w = Math.max(this.minWidth, Math.min(exit, room - 8)) + WALL_T;
    const cx = dir > 0 ? wallX + w / 2 : wallX + WALL_T - w / 2;
    this._place(cx, yTop, w, 'solid', 'creep', { rim: true });
    Object.assign(this.route[this.route.length - 1], { climbHeight: height, wallSide: dir });
    return this;
  }

  /**
   * A horizontal traverse at height: ordinary platforming, deliberately.
   *
   * A chapter that is nothing but walls is as one-note as a chapter that is
   * nothing but jumps. The traverse is where the first thirty levels are still
   * worth something, and where the drop underneath does the talking.
   */
  traverse({ n = 3, w = 110, drift = 0.06, types = null } = {}) {
    for (let i = 0; i < n; i++) {
      const dy = Math.max(0, Math.round(this.reach.height * drift * (i % 2 ? -1 : 1)));
      const t = types ? types[i % types.length] : 'solid';
      this._step(this.cx > this.width / 2 ? -1 : 1, w, dy, t);
    }
    return this;
  }

  /** Wind funnelling through the shaft — it pushes sideways, never down. */
  gale({ height = 320, power = 190, period = 3.4 } = {}) {
    this.hazard({
      kind: 'storm',
      x: -WALL_T,
      y: Math.round(this.y - height),
      w: this.width + WALL_T * 2,
      h: Math.round(height + 40),
      power,
      period,
    });
    return this;
  }

  /** A fish worth a detour, off the line by half a jump. */
  fishAt(index, dy = 56, kind = 'normal', dx = 0) {
    const list = this.floes.filter((f) => !f.nub);
    const f = list[Math.max(0, Math.min(list.length - 1, index))];
    if (!f) return this;
    const item = { x: Math.round(f.x + f.w / 2 - 11 + dx), y: Math.round(f.y - dy) };
    if (kind === 'speed') this.speedFish.push(item);
    else if (kind === 'normal') this.fish.push(item);
    else this.rotFish.push({ ...item, kind });
    return this;
  }

  /** The three collectibles, spread up the climb. */
  scatterFish(n = 3, dy = 58) {
    const list = this.floes.filter((f) => !f.nub);
    for (let i = 0; i < n; i++) {
      this.fishAt(Math.round(((i + 0.8) / n) * (list.length - 1)), dy);
    }
    return this;
  }

  /** The summit. A wide, safe ledge — the last move is never the deciding one. */
  crown({ w = 250 } = {}) {
    // A wide summit sits over everything below it, so its rise is set by the
    // penguin's height rather than by taste: half a jump looks fine in a plan
    // and roofs the ledge it was launched from.
    const dy = Math.round(Math.min(this.maxRise, PENGUIN.h * this.scale * 1.6 + 20));
    // The summit is placed like any other step, clear of the ledge below it.
    // A wide platform directly overhead cannot be climbed onto at all: there
    // is room to stand under it and no room to jump, because the jump starts
    // by putting your head where the platform is.
    this._step(this.cx > this.width / 2 ? -1 : 1, w, dy, 'solid');
    return this;
  }

  /* ------------------------------------------------------------ build */

  /**
   * The ground the climb starts from, either side of the ledge.
   *
   * The base was narrow enough to walk off in a third of a second, in a chapter
   * that starts you standing on it from rest with the whole shaft above you.
   * Widening the ledge itself is not the fix: the ledge is route, the composer
   * lays the whole tower out relative to it, and a wider one silently swallowed
   * two steps and left a kick asking for four hundred pixels in one go.
   *
   * So this is rock, not ice. Physics treats it as solid, the route never sees
   * it, and it reads as what it is: the shoulder of the mountain the starting
   * ledge is attached to. Standing on it does nothing but keep you alive.
   */
  _standOn() {
    const floor = this.route[0] ?? this.floes[0];
    if (!floor) return;
    const body = PENGUIN.w * this.scale;
    const want = Math.max(0, openingWidth(this.scale) - body * 0.55);
    // Deep enough to reach the water, so the shoulders read as the mountain
    // holding the ledge up rather than as two slabs floating beside it. The
    // renderer clamps anything below the waterline.
    const depth = BASE_MARGIN;

    // A shoulder that grows into a ledge is a ledge buried in rock, which the
    // climb validator rightly refuses. So each side only reaches as far as the
    // nearest thing already standing there.
    const clear = (from, to) => {
      const box = { x: Math.min(from, to), y: floor.y, w: Math.abs(to - from), h: depth };
      for (const other of [...this.floes, ...this.walls]) {
        const oh = other.h ?? 20;
        if (other.y + oh <= box.y || other.y >= box.y + box.h) continue;
        if (other.x + other.w <= box.x || other.x >= box.x + box.w) continue;
        return false;
      }
      return true;
    };

    let leftSpan = want;
    while (leftSpan > 8 && !clear(floor.x - leftSpan, floor.x)) leftSpan -= 8;
    let rightSpan = want;
    const rightEdge = floor.x + floor.w;
    while (rightSpan > 8 && !clear(rightEdge, rightEdge + rightSpan)) rightSpan -= 8;

    if (leftSpan > 8) this.rock(floor.x - leftSpan, floor.y, leftSpan, depth, 'shoulder');
    if (rightSpan > 8) this.rock(rightEdge, floor.y, rightSpan, depth, 'shoulder');
  }

  build(meta) {
    // Before the shift, so the shoulders travel with everything else.
    this._standOn();

    // Everything was composed with the base at y=0 and the summit negative.
    // Shift it into a world box now that the height is known.
    const shift = -this.top + TOP_MARGIN;
    const move = (o) => {
      o.y += shift;
      return o;
    };
    for (const f of this.floes) move(f);
    for (const t of this.terrain) move(t);
    for (const h of this.hazards) move(h);
    for (const f of [...this.fish, ...this.speedFish, ...this.rotFish]) move(f);
    for (const c of this.checkpoints) move(c);
    for (const z of this.zones) {
      z.top += shift;
      z.bottom += shift;
    }
    for (const r of this.route) r.y += shift;

    const baseFloe = this.floes[0];
    const summit = this.route[this.route.length - 1];
    const worldH = baseFloe.y + BASE_MARGIN + 60;
    const waterY = baseFloe.y + BASE_MARGIN;

    return {
      ...meta,
      axis: 'up',
      /** How hard this climb leans on the bar, for the validator to allow for. */
      effort: this.effort,
      worldW: this.width + WALL_T * 2 + 40,
      worldH,
      waterY,
      spawn: { x: Math.round(this.width / 2), y: baseFloe.y },
      goal: { x: Math.round(summit.x + summit.w / 2), y: summit.y },
      floes: this.floes,
      terrain: this.terrain,
      zones: this.zones,
      hazards: this.hazards,
      fish: this.fish,
      speedFish: this.speedFish,
      rotFish: this.rotFish,
      checkpoints: this.checkpoints,
      route: this.route,
      /** Total climb, in metres, purely so the HUD can say something true. */
      metres: Math.round((baseFloe.y - summit.y) / 12),
    };
  }
}
