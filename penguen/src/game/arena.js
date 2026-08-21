/**
 * Arena composition — the snowball fight.
 *
 * The first three chapters each handed the penguin a verb. This one takes them
 * all away and hands it a *position*. There is no throw button, no pick-up, no
 * new key: the rivals throw, they always throw at where you were standing when
 * they wound up, and a snowball stops at the first thing it touches. Put a
 * rival between yourself and a thrower and the throw does your work for you.
 *
 * So a level here is not a route, it is a set of **lines**, and the composer
 * builds the level around them rather than placing scenery and hoping. Each
 * duel is constructed backwards from the answer: pick where the player will
 * stand, pick where the penguin blocking the way will stand, draw the line
 * through both, and put the thrower on it.
 *
 * ### The one piece of geometry that decides everything
 *
 * A snowball stops at the first ice it touches — including the ice the target
 * is standing on. So a line through somebody standing on a wide shelf ends in
 * that shelf a few pixels later, and the shot the player aimed perfectly bursts
 * against the floor. Three rules fall out of that, and between them they are
 * the whole shape of the chapter:
 *
 *   1. **Everyone who gets shot stands on a perch**, barely wider than they
 *      are. A narrow perch is one a steep line clears; a wide one blocks
 *      anything but a nearly flat shot.
 *   2. **The player stands on the ground.** A line arriving from above never
 *      dips below the head it is arriving at, so the floor can be as wide as
 *      it likes — and a stand-spot the player can simply walk to is a plan
 *      rather than a coincidence.
 *   3. **Lines are kept off the vertical.** Too steep and it bursts on the
 *      target's own perch; too flat and it never gets past the thrower's.
 */

import { PENGUIN, BRAWL, dodgeWindow, PHYS } from './config.js';

const RIVAL_W = 30;
const RIVAL_H = 40;
/**
 * A perch: somewhere for one penguin to stand and nothing more.
 *
 * Deliberately thinner than the penguin on it — an ice pinnacle, not a shelf.
 * The width is the single number that decides how steep a working line can be
 * (see `SLOPE_MAX`), and at anything shelf-like the answer was "barely off the
 * horizontal", which made every duel a five-hundred-pixel line across the
 * whole arena and made the duels block each other. Thin perches give short,
 * steep, local lines: three penguins and one shot, all in view at once.
 */
const PERCH_W = 14;
/** Keep everything this far from the edges of the world. */
const PAD = 46;
/**
 * Slope limits for a working line, derived rather than chosen.
 *
 * A snowball is a circle, not a point, so both the drop it has to make and the
 * perch it has to clear are inflated by its radius: below the target's centre
 * there are `RIVAL_H / 2` pixels before the perch begins and the ball's own
 * radius eats nine of them, while the perch is that much wider than it looks.
 * Above the thrower's hand the same sum runs the other way.
 *
 * The number that comes out is about a third, and it is the reason a snowball
 * in this game is a hard flat throw rather than a lob. Steeper than this and it
 * bursts on somebody's feet; flatter and the three penguins are simply standing
 * in a row, which is the shot the chapter opens with.
 */
const CLEAR_W = PERCH_W / 2 + BRAWL.radius;
const SLOPE_MAX =
  Math.min(
    (RIVAL_H / 2 - BRAWL.radius) / CLEAR_W,
    (RIVAL_H * 0.66 - BRAWL.radius) / CLEAR_W,
  ) * 0.9;
const SLOPE_MIN = 0.1;

export class Arena {
  constructor({ scale = 1, width = 1360, height = 560, heat = 1 } = {}) {
    /**
     * How fast this arena throws, as a multiple of the chapter's own cadence.
     *
     * Below one is quicker, because a period is the gap between throws. It is
     * the only honest dial this chapter has: everything else about an arena is
     * a *shape*, and a shape either has an answer or it does not. Cadence can
     * be turned up without turning an answer into a coin flip — the line is
     * still there, there is just less of it.
     *
     * The floor is a fairness line. `BRAWL.aim` is how long the wind-up lasts,
     * and a cadence shorter than that means the next ball is aimed before you
     * could possibly have left the last one's line.
     */
    this.heat = Math.max(0.62, heat);
    this.scale = scale;
    this.width = width;
    this.height = height;
    this.penguinW = PENGUIN.w * scale;
    this.penguinH = PENGUIN.h * scale;
    this.groundY = height - 92;

    this.floes = [];
    this.terrain = [];
    this.rivals = [];
    this.fish = [];
    this.speedFish = [];
    this.rotFish = [];
    this.checkpoints = [];
    this.signs = [];
    /** One entry per guard: which thrower, and where to stand. */
    this.plan = [];
    /** Duels waiting for a thrower — placed last, see `duel()`. */
    this._duels = [];
    /** Rock waiting for the lines to be drawn, so it can be kept off them. */
    this._pillars = [];
  }

  /* --------------------------------------------------------- pieces */

  /** The floor, and the raft at the end of it. Every arena has both. */
  ground({ goalAt = 0.94 } = {}) {
    this.floes.push({ x: 0, y: this.groundY, w: this.width, h: 92, type: 'solid' });
    this.spawn = { x: 84, y: this.groundY };
    this.goal = { x: Math.round(this.width * goalAt), y: this.groundY };
    return this;
  }

  /** A perch with one penguin on it. */
  _perch(cx, top, opts) {
    const x = Math.round(cx - PERCH_W / 2);
    this.floes.push({ x, y: Math.round(top), w: PERCH_W, h: 18, type: opts.ice ?? 'solid' });
    const rival = {
      x: Math.round(cx - RIVAL_W / 2),
      y: Math.round(top - RIVAL_H),
      w: RIVAL_W,
      h: RIVAL_H,
      guard: Boolean(opts.guard),
      period: (opts.period ?? BRAWL.period) * this.heat,
      phase: opts.phase ?? (this.rivals.length * 0.37) % 1,
    };
    this.rivals.push(rival);
    return rival;
  }

  /** Where a rival's hand is, given its box. */
  _hand(r) {
    return { x: r.x + r.w / 2, y: r.y + r.h * 0.34 };
  }

  /** Where a standing penguin's middle is, on the floor. */
  get _eyeY() {
    return this.groundY - this.penguinH / 2;
  }

  /**
   * One duel, built backwards from its answer.
   *
   * `guardAt`/`guardUp` place the penguin in the doorway; `standAt` is the
   * patch of floor the player has to find. Everything else — where the thrower
   * goes, how steep the shot is, whether it fits in the arena at all — follows
   * from those three numbers.
   *
   * The guard goes up now; the thrower waits until `build()`. Placement cannot
   * be decided one duel at a time, because the second duel's perches land in
   * the first duel's line of fire — which is a lovely thing to look at and a
   * broken level to play. So the arena is assembled in the order that lets
   * every line be checked against every obstacle: guards and scenery first,
   * throwers last, one at a time, each one re-checking the lines already drawn.
   */
  duel({ guardAt = 0.62, guardUp = 0.2, standAt = 0.3, shooterUp = 0.34, period = null, phase = null } = {}) {
    const gx = this.width * guardAt;
    const perchTop = this.groundY - this.height * guardUp;
    const guard = this._perch(gx, perchTop, {
      guard: true,
      period: (period ?? BRAWL.period * 1.15) * this.heat,
      phase,
    });
    this._duels.push({
      guard,
      guardUp,
      standAt,
      shooterUp,
      period: (period ?? BRAWL.period) * this.heat,
      phase,
    });
    return this;
  }

  /**
   * Put a thrower on the line, once everything else is standing.
   *
   * Searched rather than solved, over two things the plan does not care about:
   * exactly where on the floor the player stands, and exactly how high the
   * thrower is. Both are free within a hand's width, and between them there is
   * almost always a version of the shot that misses every perch in the arena.
   */
  _placeShooter(req) {
    const guard = req.guard;
    // Why a duel could not be built is the most useful thing this file knows,
    // and it is invisible from the outside: the failure is always "no clean
    // line", and the interesting part is *which* of six checks kept saying no.
    const why = (req.why = {});
    const no = (k) => {
      why[k] = (why[k] ?? 0) + 1;
      return false;
    };
    const target = { x: guard.x + guard.w / 2, y: guard.y + guard.h / 2 };
    const eye = this._eyeY;

    // Candidate stand-spots: the one the plan asked for, and its mirror on the
    // far side of the guard.
    //
    // The mirror matters more than it looks. An arena where every shot travels
    // the same way across the screen runs out of room on one side — the third
    // duel's thrower ends up standing on the second's head — and it also plays
    // the same way three times. Letting a duel flip means half the shots come
    // back the other way, which is both a better-looking arena and a much
    // easier one to fit inside the width of the world.
    const mirrored = 2 * req.guardAt - req.standAt;
    const bases = mirrored > 0.06 && mirrored < 0.94 ? [req.standAt, mirrored] : [req.standAt];
    const nudges = [0];
    for (let d = 0.02; d <= 0.22; d += 0.02) nudges.push(d, -d);
    const spots = [];
    for (const base of bases) for (const n of nudges) spots.push(base + n);
    for (const spot of spots) {
      const standX = this.width * spot;
      if (standX < PAD || standX > this.width - PAD) { no('kenar'); continue; }
      const stand = { x: standX, y: eye };
      const dx = target.x - stand.x;
      const dy = target.y - stand.y;
      if (dy > -60 || Math.abs(dx) < 60) { no('çok yakın'); continue; }
      const slope = Math.abs(dy / dx);
      if (slope < SLOPE_MIN || slope > SLOPE_MAX) { no('eğim'); continue; }
      if (!this._clear(target, stand)) { no('alt hat kapalı'); continue; }

      // The only real constraint on how high the thrower stands is that it end
      // up *beyond* the guard on the line — which `t` already says — so the
      // sweep runs the whole useful height of the arena rather than a band
      // around what the plan asked for. A floor of `guardUp + 0.08` looked
      // sensible and quietly ruled out the one perch that fitted.
      for (let up = 0.92; up >= req.guardUp + 0.02; up -= 0.02) {
        const perch = this.groundY - this.height * up;
        const handY = perch - RIVAL_H + RIVAL_H * 0.34;
        const t = (handY - stand.y) / dy;
        if (t <= 1.25) { no('atıcı geride'); continue; }
        const handX = stand.x + dx * t;
        if (handX < PAD || handX > this.width - PAD) { no('atıcı dışarıda'); continue; }
        const hand = { x: handX, y: handY };
        const flight = Math.hypot(stand.x - hand.x, stand.y - hand.y);
        if (flight > BRAWL.range * 0.92) { no('menzil'); continue; }
        if (PHYS.moveSpeed * dodgeWindow(flight) < this.penguinW * 2.4) { no('kaçış yok'); continue; }
        // Is there room for the perch itself, and is the shot clear of
        // everything already in the arena?
        if (this._crowded(handX, perch)) { no('yer yok'); continue; }
        if (!this._clear(hand, target)) { no('üst hat kapalı'); continue; }

        const rival = this._perch(handX, perch, { period: req.period, phase: req.phase });
        const entry = {
          guard: this.rivals.indexOf(guard),
          shooter: this.rivals.indexOf(rival),
          stand: { x: Math.round(standX), y: Math.round(this.groundY) },
          slope: +slope.toFixed(2),
          flight: Math.round(flight),
        };
        // The new perch must not have spoiled a line drawn earlier.
        if (!this._linesHold()) {
          this.floes.pop();
          this.rivals.pop();
          no('eski hattı bozuyor');
          continue;
        }
        this.plan.push(entry);
        return true;
      }
    }
    return false;
  }

  /** Is there already something where this perch wants to go? */
  _crowded(cx, top) {
    const box = { x: cx - PERCH_W / 2 - 22, y: top - RIVAL_H - 14, w: PERCH_W + 44, h: RIVAL_H + 34 };
    for (const f of [...this.floes, ...this.terrain]) {
      if (
        box.x < f.x + f.w &&
        box.x + box.w > f.x &&
        box.y < f.y + (f.h ?? 20) &&
        box.y + box.h > f.y
      ) {
        return true;
      }
    }
    return false;
  }

  /** Do all the lines drawn so far still work? */
  _linesHold() {
    for (const p of this.plan) {
      const guard = this.rivals[p.guard];
      const hand = this._hand(this.rivals[p.shooter]);
      const target = { x: guard.x + guard.w / 2, y: guard.y + guard.h / 2 };
      if (!this._clear(hand, target)) return false;
      if (!this._clear(target, { x: p.stand.x, y: this._eyeY })) return false;
    }
    return true;
  }

  /**
   * A thrower with no duel attached: it is simply shooting at you.
   *
   * Every arena wants at least one, because a level where every rival is part
   * of the answer is a level where standing still is safe, and standing still
   * should never be safe here.
   */
  heckler({ at = 0.5, up = 0.66, period = BRAWL.period * 0.85, phase = null } = {}) {
    this._perch(this.width * at, this.groundY - this.height * up, { period, phase });
    return this;
  }

  /**
   * Rock. It blocks snowballs, which is the only reason it exists.
   *
   * Placed last of all, after the throwers, and shrunk until it stops
   * spoiling a line — because a pillar is an obstacle, not a promise. Its job
   * is to rule out the stand-spot the player tries first; a pillar that rules
   * out *every* stand-spot is not a harder level, it is a locked door, and the
   * arena would rather have a shorter rock than no way through.
   */
  pillar({ at = 0.5, w = 38, h = 150 } = {}) {
    this._pillars.push({ at, w, h });
    return this;
  }

  /**
   * Rock hangs from above; it never grows from the floor.
   *
   * Which is not decoration. The floor is where the whole chapter is played —
   * every stand-spot is on it — and a column standing on it is a wall between
   * two parts of the answer, so the level stops being about lines and starts
   * being about getting past a rock. Hung from the ceiling it does exactly the
   * job it was brought in for and nothing else: it eats lines, and you walk
   * underneath it.
   */
  _placePillars() {
    const clear = this.penguinH * 2.4;
    for (const req of this._pillars) {
      for (let shrink = 1; shrink >= 0.35; shrink -= 0.2) {
        const h = Math.round(req.h * shrink);
        if (h < 40) break;
        const bottom = this.groundY - clear;
        const rock = {
          x: Math.round(this.width * req.at - req.w / 2),
          y: Math.round(bottom - h),
          w: req.w,
          h,
        };
        this.terrain.push(rock);
        if (this._linesHold()) break;
        this.terrain.pop();
      }
    }
    return this;
  }

  /** A patch of ground that will not hold you: you cannot line up and wait. */
  thinIce({ at = 0.4, w = 150, type = 'crack' }) {
    const x = Math.round(this.width * at - w / 2);
    this.floes.push({ x, y: this.groundY - 1, w, h: 22, type });
    return this;
  }

  /* --------------------------------------------------------- checks */

  get _blockers() {
    return [...this.floes, ...this.terrain];
  }

  /** Is the straight run from `a` to `b` free of ice? */
  _clear(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const steps = Math.max(10, Math.ceil(len / 5));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = a.x + dx * t;
      const py = a.y + dy * t;
      const r = BRAWL.radius;
      for (const f of this._blockers) {
        if (px + r > f.x && px - r < f.x + f.w && py + r > f.y && py - r < f.y + (f.h ?? 20)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Check every duel the level claims to have.
   *
   * Constructed geometry is not proof: a pillar dropped in later, or a second
   * duel's perch, can sit squarely across a line that was clean when it was
   * drawn. So the lines are re-walked once the arena is finished, against
   * everything in it.
   */
  _verify() {
    if (!this.plan.length) throw new Error('arenada tek bir düello yok');
    for (const p of this.plan) {
      const guard = this.rivals[p.guard];
      const shooter = this.rivals[p.shooter];
      const hand = this._hand(shooter);
      const target = { x: guard.x + guard.w / 2, y: guard.y + guard.h / 2 };
      const stand = { x: p.stand.x, y: this._eyeY };
      if (!this._clear(hand, target)) {
        throw new Error(`atıştan kapıdakine hat kapalı: ${Math.round(hand.x)} → ${Math.round(target.x)}`);
      }
      if (!this._clear(target, stand)) {
        throw new Error(`kapıdakinden durulacak yere hat kapalı: ${Math.round(target.x)}`);
      }
      const flight = Math.hypot(stand.x - hand.x, stand.y - hand.y);
      // A thrower that cannot see that far never winds up, and a duel whose
      // thrower never winds up is a locked door with a story attached.
      if (flight > BRAWL.range * 0.92) {
        throw new Error(`atış menzili aşıyor: ${Math.round(flight)}px`);
      }
      const room = PHYS.moveSpeed * dodgeWindow(flight);
      if (room < this.penguinW * 2.4) {
        throw new Error(`kaçmaya vakit yok: ${Math.round(room)}px`);
      }
      if (p.stand.x < PAD || p.stand.x > this.width - PAD) {
        throw new Error(`durulacak yer arenanın dışında: ${p.stand.x}`);
      }
      p.flight = Math.round(flight);
    }
    return this;
  }

  /* --------------------------------------------------------- dressing */

  /** Fish on the stand-spots: the level pays you for finding them. */
  scatterFish(n = 3, dy = 54) {
    for (let i = 0; i < n; i++) {
      const p = this.plan[i % Math.max(1, this.plan.length)];
      const x = p ? p.stand.x + (i - (n - 1) / 2) * 110 : this.width * (0.3 + 0.2 * i);
      this.fish.push({
        x: Math.round(Math.max(PAD, Math.min(this.width - PAD, x)) - 11),
        y: Math.round(this.groundY - dy),
      });
    }
    return this;
  }

  fishAt(at = 0.5, up = 0.2, kind = 'speed') {
    const item = {
      x: Math.round(this.width * at - 11),
      y: Math.round(this.groundY - this.height * up),
    };
    if (kind === 'speed') this.speedFish.push(item);
    else if (kind === 'normal') this.fish.push(item);
    else this.rotFish.push({ ...item, kind });
    return this;
  }

  sign(text, at = 0.1) {
    this.signs.push({ x: Math.round(this.width * at), y: this.groundY - 8, text });
    return this;
  }

  checkpointAt(at = 0.5) {
    this.checkpoints.push({ x: Math.round(this.width * at), y: this.groundY - 46 });
    return this;
  }

  /* --------------------------------------------------------- output */

  build(meta) {
    if (!this.spawn) throw new Error('arenanın zemini yok');
    for (const req of this._duels) {
      if (!this._placeShooter(req)) {
        const why = Object.entries(req.why ?? {})
          .sort((a, b) => b[1] - a[1])
          .map(([k, n]) => `${k}×${n}`)
          .join(', ');
        throw new Error(
          `${Math.round(req.guard.x)},${Math.round(req.guard.y)} kapıdaki penguen için ` +
            `temiz atış hattı kurulamadı (${why})`,
        );
      }
    }
    this._placePillars();
    this._verify();
    return {
      ...meta,
      axis: 'across',
      brawl: true,
      scale: this.scale,
      worldW: this.width,
      worldH: this.height,
      waterY: this.height + 40,
      spawn: this.spawn,
      goal: this.goal,
      floes: this.floes,
      terrain: this.terrain,
      rivals: this.rivals,
      fish: this.fish,
      speedFish: this.speedFish,
      rotFish: this.rotFish,
      checkpoints: this.checkpoints,
      signs: this.signs,
      hazards: [],
      zones: [],
      /** The intended solution: which throw takes out which guard, from where. */
      plan: this.plan,
    };
  }
}
