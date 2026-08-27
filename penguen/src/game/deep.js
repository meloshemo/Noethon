/**
 * Under-ice composition — the sea.
 *
 * The shelf asked "can I reach that". The mountain asked "how long can I hold
 * on". Neither question survives being asked a third time, so the sea asks the
 * one thing that has been true of this bird the whole game and never mattered
 * yet: **it cannot breathe down here.**
 *
 * Which is the inversion the chapter is built on. On the ice a penguin is a
 * comedian — short legs, no grip, every move an effort. In the water it is the
 * fastest thing for a hundred miles, and this chapter finally lets it go. It
 * does not take the speed away to make a level hard. It takes the air.
 *
 * A level is a corridor: sea ice overhead, seabed below, and a passable slot
 * between them that moves up and down. Two rules shape everything:
 *
 *   1. **Rising is slow and free, diving is quick and costs the button.** So
 *      distance and height are one budget, not two — `swimReach(scale, dy)`,
 *      the sea's version of the mountain's `reachAt`. A slot that is easy to
 *      hit from above is often impossible from below.
 *
 *   2. **A lungful is a distance.** `breathRange` turns the clock into
 *      pixels, and the composer refuses to put two holes in the ice further
 *      apart than a lungful can carry you, with margin.
 */

import {
  PENGUIN, SWIM, swimReach, breathRange, breathFor, swimCost, TRENCH, CHARGED,
  VENT, ventWait, swimSpeed, CURRENT, flowAt,
} from './config.js';
import { nudgeClear } from '../core/util.js';

/**
 * How much of a lungful a stretch between two air holes may spend.
 *
 * This used to be one number for the whole chapter, and one number for a whole
 * chapter is one level played fifteen times. Measured, it meant the lungs never
 * dropped below a third on any dive in the game and the finale finished with
 * nearly half a breath left — in the chapter whose entire subject is running
 * out of air.
 *
 * It is a per-level dial now. The plans set it, and it is the chapter's
 * difficulty curve written down in one column of numbers.
 *
 * The ceiling does not move. Past it there is no margin left for a player who
 * takes a wrong line, and a dive with no margin has to be swum perfectly rather
 * than well.
 */
const BREATH_DEFAULT = 0.72;
const BREATH_CEILING = 0.96;
/**
 * Margin on the coupled swim reach.
 *
 * `swimReach` is a *floor*, not a ceiling: it is how much water goes past
 * while the depth change happens at full speed, and a swimmer who cannot stop
 * needs at least that much room. So the margin multiplies it up rather than
 * down — which is the opposite of what it did at first, and the validator
 * caught the level where those eight pixels mattered.
 */
const REACH_MARGIN = 1.12;
/** Ice and rock are drawn thick enough to read as the world, not as a line. */
const SHELL = 260;

export class Deep {
  /**
   * @param {{scale?:number, depth?:number}} opts depth = the water column
   */
  constructor({ scale = 1, depth = 560, breath = BREATH_DEFAULT } = {}) {
    this.scale = scale;
    this.budget = Math.min(BREATH_CEILING, breath);
    /**
     * When the safety net cuts a hole, as a fraction of the budget.
     *
     * Late rather than early. It exists so a plan cannot forget the chapter's
     * one promise, not so a plan cannot ask a hard question — and at 0.45 it
     * was quietly doing the second, which is why raising the budget used to
     * change nothing at all.
     */
    this.hold = 0.88;
    /** A stretch has been laid and not yet paid for with a breath. */
    this.owedBreath = false;
    this.penguinH = PENGUIN.h * scale;
    this.penguinW = PENGUIN.w * scale;
    /** Water column: surface at 0, seabed at `depth`. */
    this.depth = depth;

    /** Cursor: how far along the corridor, and where the route currently is. */
    this.x = 0;
    this.lane = Math.round(depth * 0.5);

    this.terrain = [];
    this.air = [];
    this.hazards = [];
    this.fish = [];
    this.speedFish = [];
    /** Coil, quantum and slack. Always off the running line, never required. */
    this.chargedFish = [];
    this.rotFish = [];
    this.checkpoints = [];
    this.zones = [];
    /** The intended line: one node per slot, in order. */
    this.route = [];
    /** Where the last breath was taken, so the composer can price the next one. */
    this.lastAir = 0;
    /** Cracks in the seabed that breathe. */
    this.vents = [];
    /** Bands of moving water still growing with the corridor. */
    this._flows = [];
  }

  /* --------------------------------------------------------- geometry */

  /** Narrowest slot worth calling a slot. A squeeze, but a passable one. */
  get minGap() {
    return Math.round(this.penguinH * 2.1 + 16);
  }

  /** How far a lungful is allowed to carry the route between two holes. */
  get breathReach() {
    return breathRange(this.scale) * this.budget;
  }

  /** How far sideways the swimmer travels while changing depth by `dy`. */
  reachFor(dy) {
    return swimReach(this.scale, dy) * REACH_MARGIN;
  }

  /* --------------------------------------------------------- pieces */

  /**
   * One stretch of corridor.
   *
   * Ceiling and seabed are placed together, always, and always as a matched
   * pair — a corridor with a hole in its floor is not a harder corridor, it is
   * an ocean, and an ocean has no shape to read.
   */
  _span(len, top, bottom) {
    this.terrain.push({
      x: Math.round(this.x),
      y: -SHELL,
      w: Math.round(len),
      h: Math.round(SHELL + top),
      kind: 'roof',
    });
    this.terrain.push({
      x: Math.round(this.x),
      y: Math.round(bottom),
      w: Math.round(len),
      h: Math.round(this.depth - bottom + SHELL),
      kind: 'bed',
    });
    this.x += len;
    this._growFlow();
  }

  /**
   * Stretch the open band of moving water over the corridor just laid.
   *
   * A current has to be as long as the swim it is supposed to make hard. Given
   * a fixed width it was 320 pixels of a six thousand pixel level — a shove on
   * the way past rather than a passage — which is a large part of why two
   * levels named after the sea moving felt like the levels where it does not.
   *
   * It matters that this happens *as* the corridor is laid rather than after.
   * `swimSince` prices the route by reading the zones underneath it, and it is
   * consulted after every piece to decide whether another one fits; a band
   * whose width arrived at the end would be measured by nothing.
   */
  _growFlow() {
    for (const z of this._flows ?? []) z.w = Math.max(0, Math.round(this.x - z.x));
  }

  /**
   * Moving water stops where the air is.
   *
   * A hole in the ice is the one thing this chapter promises, and a breath you
   * have to fight the sea for is not a promise. A vent is deliberately *not*
   * on this list: its air is on the seabed, and standing still over it while a
   * current tries to take you off it is the entire point of the one level that
   * does it.
   */
  _closeFlow() {
    this._growFlow();
    this._flows = [];
  }

  /**
   * The lid over a hole in the ice.
   *
   * A hole is a gap in the ceiling, and without something over it the penguin
   * simply keeps floating up and out of the level. Real sea ice has a top: you
   * come up through the hole, your head is in the air, and there you stop.
   */
  _lid(x, w) {
    this._closeFlow();
    this.terrain.push({
      x: Math.round(x),
      y: -SHELL - 24,
      w: Math.round(w),
      h: SHELL,
      kind: 'roof',
    });
  }

  /**
   * Record where the route passes, and check the move that gets it there.
   *
   * Every node is a promise that a swimmer can be at this height at this x.
   * The check is the sea's whole fairness argument in one line: the horizontal
   * distance from the last node has to be at least as long as the depth change
   * takes, because under the ice you cannot stop and you cannot hover.
   */
  _node(x, y, gap, tag = 'slot') {
    const prev = this.route[this.route.length - 1];
    if (prev) {
      const dy = y - prev.y;
      const need = Math.abs(dy) > 4 ? this.reachFor(dy) : 0;
      const have = x - prev.x;
      if (have + 0.5 < need) {
        throw new Error(
          `${tag}: ${Math.round(dy)}px derinlik değişimi için ${Math.round(need)}px ` +
            `gerekiyor, ${Math.round(have)}px var`,
        );
      }
    }
    this.route.push({ x: Math.round(x), y: Math.round(y), gap: Math.round(gap), tag });
    this.lane = y;
    return this;
  }

  /**
   * Cut a hole if the swim since the last one is getting long.
   *
   * The chapter's one promise is that there is always another breath within
   * reach, and a promise a plan has to remember to keep is a promise that gets
   * broken. So the composer keeps it: after every piece it asks how far it has
   * been, and puts a hole in the ice when the answer starts to matter. A plan
   * writes `hole()` where a breath is *dramatic* — before the long stretch,
   * after the seal — and the composer fills in the ones that are merely
   * necessary.
   */
  _keepBreathing() {
    if (this.swimSince > this.breathReach * this.hold) this.hole({ lead: 140 });
    return this;
  }

  /**
   * How far the swimmer actually swims for the current breath.
   *
   * Along the route, not along the level. A budget counted in x-distance is a
   * budget nobody pays: a corridor of slots at alternating depths makes the
   * penguin travel half as far again as the level is wide, and two dives were
   * composed inside their budget and drowned two hundred pixels from the exit
   * because of it. Diagonals cost what diagonals cost.
   */
  get swimSince() {
    let total = 0;
    for (let i = this.route.length - 1; i > 0; i--) {
      const here = this.route[i];
      const prev = this.route[i - 1];
      /**
       * A trench is longer than it looks, and that is the whole accounting.
       *
       * Everything in this chapter measures a lungful in *distance* — the
       * budget, the automatic air holes, the validator's stretch check, all of
       * it. Rather than teaching four separate pieces of code about a second
       * currency, a leg through cold water is charged as the longer swim it
       * really is. Every existing rule then works untouched, and it reads
       * correctly too: a trench does not merely hurt, it is *further*.
       */
      total += swimCost(this.zones, prev, here);
      if (prev.tag === 'air' || prev.tag === 'start') break;
    }
    // Whatever corridor has been laid past the last node counts too.
    const last = this.route[this.route.length - 1];
    if (last) total += Math.max(0, this.x - last.x);
    return total;
  }

  /** A stretch spends a whole breath, so only a breath may follow it. */
  _breathOwed() {
    if (this.owedBreath) throw new Error('stretch() sonrası hole() ya da surfaceOut() gelmeli');
  }

  /**
   * How much corridor a surfacing piece needs, starting from depth `lane`.
   *
   * `hole` and `surfaceOut` both build the same approach — drop to just under
   * the ice, then rise through it — so the length they will add is knowable
   * before they are called, which is what lets `stretch` leave room for it.
   */
  surfaceRunFrom(lane) {
    const surface = 74;
    const under = surface + this.penguinH * 1.3;
    const drop = Math.max(0, this.reachFor(under - lane));
    const rise = Math.max(0, this.reachFor(40 - under));
    // The mouth of the hole counts: it is sized from the swimmer, not from the
    // 250px a doorway would be, and the difference is what put one stretch
    // eighteen pixels over its budget.
    return Math.max(220, drop + rise + 90) + Math.max(250, this.penguinW * 7);
  }

  /**
   * The reserve a stretch must leave.
   *
   * Measured from the *deepest* the line could be when the stretch ends rather
   * than from where it is now: the loop decides to add one more slot while the
   * line is shallow, the slot puts it on the bed, and the climb out is suddenly
   * longer than the room left for it.
   */
  get surfaceRun() {
    return this.surfaceRunFrom(this.depth - 74);
  }

  /**
   * What a vent will cost from depth `lane`: the dive, the ridge, and the wait.
   *
   * `stretch` has to know this before it lays anything, for exactly the reason
   * it already has to know `surfaceRunFrom`: it fills the corridor up to the
   * budget and then hands over to whatever ends the stretch, and if it does not
   * keep back enough for that piece the piece is refused. A vent ends a stretch
   * the same way a hole does — but it ends it *downwards*, and it also charges
   * for standing still, so the reserve is a different number.
   */
  ventRunFrom(lane, { dip = 170, period = VENT.period } = {}) {
    const floor = this.depth - 74;
    const top = Math.min(floor - 8, lane + this.penguinH + dip);
    const stand = top - this.penguinH;
    const drop = Math.max(0, this.reachFor(stand - lane));
    return drop + VENT.width * 2 + 160 + ventWait(period, VENT.blow) * swimSpeed(this.scale);
  }

  /**
   * What a pixel of corridor costs in air right here, as a multiple of one.
   *
   * `swimSince` prices the route through `swimCost`, which reads the zones
   * under it, so everything compared against `swimSince` has to be in the same
   * currency. The reserves were not: they are lengths of corridor a surfacing
   * piece will need, worked out from geometry, and geometry does not know the
   * water is moving. So a stretch inside an upstream band kept back the right
   * number of *pixels* and the wrong number of *seconds*, and the piece that
   * ended it came in ninety pixels over a lungful.
   *
   * The route is laid left to right, so the heading is always downstream-positive
   * and the sign of the band is the sign of the trouble.
   */
  get flowDrag() {
    return this.flowDragTo(this.lane, 40);
  }

  /**
   * The worst water anywhere between two depths, as a cost multiplier.
   *
   * Read at a single point this was wrong in the way that matters. A band
   * fills part of the column, and a stretch can be running along below it
   * while the piece it is reserving for — the rise to the ice — goes straight
   * up through it. The line was in still water, the reserve said so, and the
   * swim out was charged one and three quarter times. So the reserve is taken
   * over the whole column the surfacing will cross, at its worst point.
   */
  flowDragTo(from, to) {
    const a = Math.min(from, to);
    const b = Math.max(from, to);
    const cost = (along) => 1 / Math.max(1 - CURRENT.max, 1 + along);
    let worst = 1;
    /**
     * An open band is asked directly, never by a point test.
     *
     * It grows with the corridor, so anything laid from here on is inside it
     * by construction — but its right edge is `this.x` rounded to a whole
     * pixel, and `this.x` is not whole. Sampling the geometry at the cursor
     * therefore asks the question exactly *on* the edge, and the answer flips
     * with the fractional part: at .6 the cursor is inside the band and the
     * reserve is charged, at .4 it is outside and the reserve is free. Same
     * level, same code, two different corridors depending on a rounding that
     * nothing else in the chapter can see.
     *
     * That is not a tolerance to widen. The composer already knows whether it
     * is inside a band, because it is holding the band, so it asks itself.
     */
    for (const z of this._flows ?? []) {
      if (b >= z.y && a <= z.y + z.h) worst = Math.max(worst, cost(z.flow ?? 0));
    }
    for (let i = 0; i <= 8; i++) {
      worst = Math.max(worst, cost(flowAt(this.zones, this.x, a + ((b - a) * i) / 8)));
    }
    return worst;
  }

  /**
   * Swim until the lungs are `of` of the way down, then come up.
   *
   * The budget is a ceiling, and a ceiling nobody reaches is decoration. A plan
   * can ask for the spend directly here: `of` is the fraction of one lungful
   * this stretch costs, the composer fills the corridor until it costs that,
   * and the piece that ends it is a breath. This is where the tension of the
   * chapter actually lives.
   */
  stretch({ of = null, gap = null, len = 280, from = 0.3, next = 'air' } = {}) {
    // Spending the whole budget is the default, because the budget *is* the
    // level's difficulty and a stretch that quietly asks for less than it was
    // given is a dial wired to nothing. A plan says `of` only to ask for less.
    const lung = breathRange(this.scale);
    const target = lung * Math.min(of ?? this.budget, this.budget);
    // Off while the stretch is being laid, or the net cuts a hole in the middle
    // of the very thing being measured.
    const net = this.hold;
    this.hold = Infinity;
    let n = 0;
    // What has to be kept back for the piece that ends this stretch. A hole is
    // a rise and a vent is a dive with a wait on the end of it; they are not
    // the same reserve, and using the hole's for both put every vent in the
    // chapter over its budget by about the length of one wait.
    const reserve = () =>
      (next === 'vent' ? this.ventRunFrom(this.lane) : this.surfaceRun) * this.flowDrag;
    while (this.swimSince + len + reserve() < target && n < 20) {
      // Alternating open water and slots, and the slots wander up and down the
      // column so the cost is depth as well as distance.
      if (n % 2 === 1) this.gate({ at: from + ((n * 0.19) % 0.46), gap });
      else this.open({ len });
      n++;
    }
    // Top up with the real cost of getting out from where the line actually
    // ended. The loop above reserves for the deepest it *could* have ended,
    // which is the only safe assumption while it is still adding slots and is
    // far too pessimistic once it has stopped: without this, a stretch asked
    // for nine tenths of a lung and spent three quarters.
    let fill = 0;
    // The slack is the diagonal the surfacing piece itself swims: it drops to
    // just under the ice and then rises through it, and neither leg is
    // horizontal. Cheaper to keep a little back than to be eighteen pixels over
    // and refused.
    const tail = () =>
      (next === 'vent' ? this.ventRunFrom(this.lane) : this.surfaceRunFrom(this.lane))
      * this.flowDrag;
    while (this.swimSince + 150 + tail() + 90 < target && fill++ < 12) {
      this.open({ len: 150 });
    }
    this.hold = net;
    this.owedBreath = true;
    return this;
  }

  /**
   * A trench: cold black water, and air that runs out in it.
   *
   * The sea's new verb, and it exists because of something the other seven do
   * not do. `open` and `gate` decide where the swimmer may go; the clock counts
   * seconds; and until now it cost precisely the same to spend one of them on
   * the seabed as under the roof. Fifteen levels about a lungful, and depth
   * itself was free.
   *
   * Here it is not. The seabed drops away, the corridor's only line runs down
   * into the dark, and every metre below the lip empties the lungs faster —
   * smoothly, the way pressure works, so the top of the trench is nearly free
   * and the floor is ruinous. The corridor decides how deep the swimmer *must*
   * go and everything below that is a choice, which is the first real choice
   * this chapter has offered about the vertical.
   *
   * `dip` is how far down the line is driven as a fraction of the trench's own
   * depth. At the default the swimmer is charged about twice; a plan that wants
   * cruelty asks for more and pays for it in corridor, because the budget
   * charges the trench as the longer swim it really is.
   */
  trench({ len = 380, at = 0.62, dip = 0.62, drain = TRENCH.drain } = {}) {
    this._breathOwed();
    const top = 74;
    const bed = this.depth - 74;

    /**
     * The cold band is the bottom of the water the corridor already has, not a
     * hole cut below it.
     *
     * The first version dug a trench into the seabed, and the arithmetic threw
     * it straight out: a swimmer coming through at roof height had five
     * hundred pixels to descend, which under this chapter's own fairness rule
     * needs seven hundred pixels of run to make — so a three-hundred-pixel
     * piece became a four-thousand-pixel one and ate three lungfuls.
     *
     * Which was the right answer to the wrong question. The sea already has a
     * bottom and the corridor already spans the whole column; the cold does not
     * need new geometry, it needs a *line* across the one that exists. So the
     * band starts partway down and everything below it costs air, and the
     * swimmer's descent into it is an ordinary change of depth the composer
     * already knows how to make room for.
     */
    const lip = Math.round(top + (bed - top) * at);
    const floor = Math.round(lip + (bed - lip) * dip);
    const down = Math.max(0, this.reachFor(floor - this.lane));
    const flat = Math.max(this.penguinW * 3, len - down - 100);
    len = Math.round(down + flat + 100);
    const x0 = this.x;

    this._span(len, top, bed);
    this.zones.push({
      kind: 'trench',
      x: Math.round(x0),
      w: Math.round(len),
      top: lip,
      bottom: Math.round(bed),
      drain,
    });

    // Down into the cold, then along it. Coming back up is the next piece's
    // business, which is exactly the tension: a plan that follows a trench with
    // another deep piece has asked for something very hard.
    const cost = 1 + dip * (drain - 1);
    this._node(x0 + down, floor, bed - top, 'trench');
    this._node(x0 + down + flat, floor, bed - top, 'trench');

    this.trenches = this.trenches ?? [];
    this.trenches.push({
      from: Math.round(x0),
      to: Math.round(x0 + len),
      lip,
      floor,
      bed: Math.round(bed),
      dip,
      drain,
      cost: +cost.toFixed(2),
    });
    return this._keepBreathing();
  }

  /** Open water: no obstacle, just corridor. The rests between the questions. */
  open({ len = 300, margin = 74 } = {}) {
    this._breathOwed();
    const top = margin;
    const bottom = this.depth - margin;
    const mid = this.x + len / 2;
    this._span(len, top, bottom);
    // The line has to be inside the corridor, not merely near it. Coming out
    // of a hole the route is up at the surface, and carrying that height into
    // the next stretch puts the node inside the ceiling — an aim point in
    // solid ice, which a swimmer heads for and never reaches.
    const y = Math.max(top + this.penguinH, Math.min(bottom - this.penguinH, this.lane));
    this._node(mid, y, bottom - top, 'open');
    return this._keepBreathing();
  }

  /**
   * A slot: ice reaching down and seabed reaching up, with a gap between them.
   *
   * `at` is where in the water column the gap sits, 0 at the surface and 1 at
   * the bed. That is the only number a plan needs to write, because everything
   * else — how long the approach has to be for the depth change to be
   * survivable — the composer works out and refuses when it does not fit.
   */
  gate({ at = 0.5, gap = null, len = 120, lead = null } = {}) {
    this._breathOwed();
    const slot = Math.max(this.minGap, gap ?? this.minGap + 40);
    // The slot narrows the corridor; it never reaches past it.
    //
    // Ceiling and seabed are at the same height in every other piece, so a
    // gate that hangs lower than the seabed — or opens higher than the ceiling
    // — leaves a step in the floor at the seam where the next piece begins,
    // and a step in the floor is a wall. The penguin swam a perfect line
    // through the slot and then stopped dead against the join. Clamping the
    // slot inside the corridor costs a little of the range a plan can ask for
    // and buys a level with no walls in it that nobody drew.
    const margin = 74;
    const centre = Math.round(
      Math.max(margin + slot / 2, Math.min(this.depth - margin - slot / 2, this.depth * at)),
    );
    const top = centre - slot / 2;
    const bottom = centre + slot / 2;
    // The approach: long enough that the depth change actually fits in it.
    const need = Math.max(0, this.reachFor(centre - this.lane) - len / 2);
    const run = Math.round(lead ?? Math.max(90, need + 40));
    this._span(run, 74, this.depth - 74);
    const mid = this.x + len / 2;
    this._span(len, top, bottom);
    this._node(mid, centre, bottom - top, 'gate');
    return this._keepBreathing();
  }

  /**
   * A hole in the ice. The only place in the chapter the clock stops.
   *
   * The ceiling is cut clean through, and the cut is wide enough to swim up
   * into without threading — a breath is a beat, not a test. What is tested is
   * getting *to* it, which is why the composer prices the swim since the last
   * one and refuses a stretch a lungful cannot cover.
   */
  hole({ len = 190, lead = 200 } = {}) {
    // Come up to the ceiling first: the hole is at the top of the water, so
    // the approach is a rise, and a rise is the slow direction.
    const surface = 74;
    // The approach happens in two moves, so it is measured as two: get to the
    // line just under the ice, then rise through the hole. Sizing the run from
    // the total misses that the second half has to fit *after* the first.
    const under = surface + this.penguinH * 1.3;
    const dropNeed = Math.max(0, this.reachFor(under - this.lane));
    const riseNeed = Math.max(0, this.reachFor(40 - under));
    const run = Math.round(Math.max(lead, dropNeed + riseNeed + 90));
    const dipX = this.x + dropNeed + 40;
    this._span(run, 74, this.depth - 74);
    // A node in the approach, just under the ice.
    //
    // Without it two holes in a row leave the route running surface to
    // surface, and anything following that line swims straight into the side
    // of the far hole — because between two holes there is ice, and the only
    // way along is *under* it. The route has to say so.
    this._node(dipX, under, this.depth - surface * 2, 'under');

    const x = this.x;
    // Wide enough to actually breathe in.
    //
    // A hole the width of a doorway is a hole you swim *past*: at cruising
    // speed you are through it in a third of a second, which buys a sip of air
    // rather than a lungful, and four levels drowned with the exit in sight
    // because of it. So it is sized from the swimmer — long enough to slow up,
    // put your head out and go again.
    const w = Math.max(len, Math.round(this.penguinW * 7));
    // Ceiling either side of the cut, and none across it.
    this.terrain.push({
      x: Math.round(x),
      y: Math.round(this.depth - 74),
      w,
      h: Math.round(74 + SHELL),
      kind: 'bed',
    });
    this._lid(x, w);
    this.air.push({ x: Math.round(x + 8), y: -40, w: w - 16, h: 110 });
    this.x += w;

    const swum = this.swimSince;
    if (swum > this.breathReach) {
      throw new Error(
        `nefes arası çok uzun: ${Math.round(swum)}px, bir ciğer ${Math.round(this.breathReach)}px`,
      );
    }
    this.lastAir = this.x;
    this.owedBreath = false;
    this._node(x + w / 2, 40, 148, 'air');
    return this;
  }

  /**
   * A crack in the seabed that breathes.
   *
   * The chapter's one new question: not *how fast*, but *when*. See `VENT`.
   *
   * It lays its own approach, the way `hole` does, and for the mirrored
   * reason. A hole is at the ceiling and the approach to it is a rise; a vent
   * is on the floor and the approach is a dive, which in this chapter is the
   * direction that costs. Assuming the swimmer is already down there priced
   * the descent twice — once in the route the corridor makes them swim, and
   * again as a "detour" added on top — and refused every placement in the
   * game, including the ones that were fine.
   *
   * Two things have to be true, and both are arithmetic:
   *
   *   · the swim down and the longest possible wait together fit inside the
   *     lungful you arrived with — worst case being one frame after a blow
   *     ends;
   *   · the wait itself is less than a lungful, or hanging over it is not a
   *     decision, it is a drowning with a countdown.
   */
  vent({ dip = 170, period = VENT.period, phase = 0 } = {}) {
    const floor = this.depth - 74;
    /*
     * On a ridge, not on the seabed.
     *
     * The seabed is the obvious place for a crack that breathes and it is the
     * wrong one: from the line just under the ice it is a four-hundred-pixel
     * descent, and priced honestly — this chapter prices every dive as the
     * horizontal distance it really costs — that is most of a lungful before
     * the waiting even starts. Every placement in the game was refused.
     *
     * So the crack is in a rock ridge standing off the floor. Still a dive,
     * still the direction that costs, still air in the last place this chapter
     * has ever put it; just a dive a breath can pay for.
     */
    const top = Math.round(Math.min(floor - 8, this.lane + this.penguinH + dip));
    const stand = top - this.penguinH;
    if (top - 74 < this.minGap) {
      throw new Error(`baca sırtı tavana çok yakın: ${Math.round(top - 74)}px`);
    }

    const dropNeed = Math.max(0, this.reachFor(stand - this.lane));
    const run = Math.round(Math.max(dropNeed + VENT.width * 2 + 160, 300));

    const x = this.x;
    this._span(run, 74, floor);
    const cx = x + dropNeed + VENT.width + 40;

    // The ridge the crack is in.
    this.terrain.push({
      x: Math.round(cx - VENT.width),
      y: top,
      w: VENT.width * 2,
      h: Math.round(floor - top + 8),
      kind: 'rock',
    });

    // One leg down to it. There is no ice between here and the ridge — the
    // corridor is open — so the line down is the line the swimmer takes, and
    // an intermediate node would only be a shorter leg asked for the same drop.
    // Tagged as air, because it *is* air. Every rule in this chapter that
    // resets a lungful at a breathing point — `swimSince` here, the stretch
    // check in `validate-dive` — then covers the vent without being told about
    // it, which is the same trick the trench used and for the same reason.
    // The tag it deserves for its own sake is carried alongside.
    this._node(cx, stand, this.minGap, 'air');
    this.route[this.route.length - 1].vent = true;
    this.lane = stand;

    const wait = ventWait(period, VENT.blow);
    const waitAsDistance = wait * swimSpeed(this.scale);
    const owed = this.swimSince + waitAsDistance;
    if (owed > this.breathReach) {
      throw new Error(
        `bacaya inip beklemek ciğere sığmıyor: ${Math.round(owed)}px ` +
          `(${Math.round(waitAsDistance)}px'i bekleme), bir ciğer ${Math.round(this.breathReach)}px`,
      );
    }
    if (wait >= breathFor(this.scale) * 0.5) {
      throw new Error(`baca döngüsü çok uzun: ${wait.toFixed(1)} sn bekleme`);
    }

    this.vents.push({
      x: Math.round(cx - VENT.width / 2),
      y: Math.round(top - VENT.height),
      w: VENT.width,
      h: VENT.height,
      period,
      phase,
    });

    // Breathing at the vent resets the budget exactly as a hole in the ice does.
    this.lastAir = cx;
    this.owedBreath = false;
    return this;
  }

  /** Where the penguin goes in. Open water, and the surface right above it. */
  mouth({ len = 260 } = {}) {
    const x = this.x;
    this.terrain.push({
      x: Math.round(x),
      y: Math.round(this.depth - 74),
      w: len,
      h: Math.round(74 + SHELL),
      kind: 'bed',
    });
    this._lid(x, len);
    this.air.push({ x: Math.round(x + 10), y: -40, w: len - 20, h: 110 });
    this.x += len;
    this.spawn = { x: Math.round(x + len * 0.35), y: 60 };
    this.lastAir = this.x;
    this.route.push({ x: Math.round(x + len * 0.5), y: 40, gap: 148, tag: 'start' });
    this.lane = 40;
    return this;
  }

  /** The way out: a hole with daylight over it. */
  surfaceOut({ len = 240 } = {}) {
    this.owedBreath = false;
    const surface = 74;
    const under = surface + this.penguinH * 1.3;
    const dropNeed = Math.max(0, this.reachFor(under - this.lane));
    const riseNeed = Math.max(0, this.reachFor(40 - under));
    const run = Math.round(Math.max(220, dropNeed + riseNeed + 90));
    const dipX = this.x + dropNeed + 40;
    this._span(run, 74, this.depth - 74);
    this._node(dipX, under, this.depth - surface * 2, 'under');

    const x = this.x;
    this.terrain.push({
      x: Math.round(x),
      y: Math.round(this.depth - 74),
      w: len,
      h: Math.round(74 + SHELL),
      kind: 'bed',
    });
    this._lid(x, len);
    this.air.push({ x: Math.round(x + 10), y: -40, w: len - 20, h: 110 });
    this.x += len;
    const swum = this.swimSince;
    if (swum > this.breathReach) {
      throw new Error(
        `çıkışa nefes yetmiyor: ${Math.round(swum)}px, bir ciğer ${Math.round(this.breathReach)}px`,
      );
    }
    this.goal = { x: Math.round(x + len * 0.5), y: 46 };
    this._node(x + len * 0.5, 40, 148, 'exit');
    return this;
  }

  /* --------------------------------------------------------- dressing */

  /**
   * A leopard seal, patrolling a stretch of corridor it gets to itself.
   *
   * It builds its own water rather than being dropped into whatever happens to
   * be there. A seal squeezed into a slot is not a hazard, it is a wall; a seal
   * that materialises next to the entry hole is not a hazard either, it is an
   * ambush with no room to react. Given a corridor twice its own patrol, there
   * is always somewhere to wait and somewhere to run — which is the only shape
   * in which "wait for it to turn, then go" is a real decision.
   */
  seal({ span = 220, at = null, speed = 128 } = {}) {
    this._breathOwed();
    const top = 74;
    const bottom = this.depth - top;
    const len = Math.round(span * 2 + 220);
    const cx = this.x + len / 2;
    const y = Math.round(
      at != null
        ? this.depth * at
        : Math.max(top + this.penguinH, Math.min(bottom - this.penguinH, this.lane)),
    );
    this._span(len, top, bottom);
    this._node(cx, y, bottom - top, 'open');
    this.hazards.push({
      kind: 'seal',
      x: Math.round(cx - 24),
      y: Math.round(y - 15),
      w: 48,
      h: 30,
      range: span,
      speed,
      water: true,
    });
    return this._keepBreathing();
  }

  /** A current: a band of water that pushes, so a line has to be fought for. */
  /**
   * A band of moving water.
   *
   * `flow` is a fraction of the swimmer's own cruise and its sign is the
   * direction the water goes: negative is upstream, against the level, which
   * is the interesting one. `band` is how much of the water column it fills,
   * centred on the line — a current that fills the whole column is weather and
   * a current that fills a third of it is a *choice*, because the way past it
   * is to be somewhere else.
   *
   * The piece charges for itself. Everything else in this chapter is paid for
   * by `swimCost` reading the zones under a leg of the route, and a current is
   * no different — which is the entire reason the zone is pushed before the
   * corridor that crosses it is laid, rather than after. Laid the other way
   * round the composer measures still water and the player swims through
   * moving water, and that gap is the shape of every bug this chapter has had.
   */
  current({ flow = -0.34, band = 0.5, len = null, at = null, keep = false } = {}) {
    this._breathOwed();
    if (!keep) this._closeFlow();
    const node = this.route[this.route.length - 1];
    const height = Math.round(this.depth * band);
    const strength = Math.max(-CURRENT.max, Math.min(CURRENT.max, flow));
    // `at` puts the band at a fixed place in the water column, 0 at the ice and
    // 1 at the bed, the way `gate` does — which is what lets a level stack two
    // of them running opposite ways. Without it a band is centred on wherever
    // the line happens to be, and two bands would sit on top of each other.
    const mid = at === null ? node.y : this.depth * at;
    const zone = {
      kind: 'current',
      x: Math.round(node.x - 140),
      y: Math.round(Math.max(0, Math.min(this.depth - height, mid - height / 2))),
      w: Math.round(len ?? 0),
      h: height,
      flow: +strength.toFixed(3),
    };
    this.zones.push(zone);
    // A plan that names a length wants a shove — a band you cross, with still
    // water the other side. A plan that names none wants a passage, and the
    // band runs from here to the next breath, however long that turns out to
    // be. The second is what the levels named after the sea moving were always
    // describing, so it is the default.
    if (len === null) (this._flows = this._flows ?? []).push(zone);
    return this;
  }

  /** Fish, on the line or a little off it. */
  /**
   * A fish, off the line by `dy` — but never further off it than the water
   * goes. A fish inside the ice is not a detour, it is a taunt.
   */
  fishAt(index, dy = 0, kind = 'normal') {
    const f = this.route[Math.max(0, Math.min(this.route.length - 1, index))];
    if (!f) return this;
    const room = Math.max(0, f.gap / 2 - this.penguinH);
    const item = {
      x: Math.round(f.x - 11),
      y: Math.round(f.y + Math.max(-room, Math.min(room, dy))),
    };
    if (kind === 'speed') this.speedFish.push(item);
    else if (kind === 'normal') this.fish.push(item);
    else if (CHARGED[kind]) this.chargedFish.push({ ...item, kind });
    else this.rotFish.push({ ...item, kind });
    return this;
  }

  scatterFish(n = 3, dy = 0) {
    const slots = this.route.filter((r) => r.tag === 'gate' || r.tag === 'open');
    for (let i = 0; i < n; i++) {
      const r = slots[Math.round(((i + 0.7) / n) * (slots.length - 1))];
      if (!r) continue;
      const room = Math.max(0, r.gap / 2 - this.penguinH);
      this.fish.push({
        x: Math.round(r.x - 11),
        y: Math.round(r.y + Math.max(-room, Math.min(room, dy))),
      });
    }
    return this;
  }

  checkpointAt(index) {
    const r = this.route[Math.max(0, Math.min(this.route.length - 1, index))];
    if (r) this.checkpoints.push({ x: Math.round(r.x), y: Math.round(r.y) });
    return this;
  }

  /* --------------------------------------------------------- output */

  build(meta) {
    if (!this.spawn) throw new Error('dalışın ağzı yok');
    if (!this.goal) throw new Error('dalışın çıkışı yok');
    return {
      ...meta,
      axis: 'dive',
      scale: this.scale,
      worldW: Math.round(this.x),
      worldH: Math.round(this.depth),
      // The surface *is* the top of the world here, so nothing drowns by
      // falling: the only way down is the seabed, and the seabed is solid.
      waterY: -60,
      spawn: this.spawn,
      goal: this.goal,
      floes: [],
      terrain: this.terrain,
      air: this.air,
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
      zones: this.zones,
      vents: this.vents,
      /** Cold bands, for the validator to charge the lungs properly. */
      trenches: this.trenches ?? [],
      route: this.route,
    };
  }
}
