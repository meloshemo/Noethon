/**
 * World entities: ice floes, hazards and pickups.
 *
 * Every entity owns its own update/state machine and exposes a plain
 * `{x, y, w, h}` box that the collision code in level.js consumes.
 */

import { ICE, STORM, BRAWL, WIND, SWING, windAt, swingAt, tailWindow, lullWindow } from './config.js';
import { clamp, easeOutCubic, lerp } from '../core/util.js';

/* ------------------------------------------------------------------ */
/* Ice floes                                                           */
/* ------------------------------------------------------------------ */

/**
 * type:
 *   solid — never gives way, the safe ground of the game
 *   slip  — solid but almost frictionless
 *   crack — cracks on contact, collapses after a telegraphed delay
 *   trap  — looks solid, gives way almost instantly (late-game only)
 *   fall  — drops out of the sky after a short delay
 *   melt  — melts and reforms on its own clock, ignores the player
 *   move  — solid platform drifting along a path
 *   burst — a geyser under the ice; lands you, warns, then launches you
 *   snap  — looks solid, but vanishes just before you land on it
 */
export class Floe {
  constructor(def, index) {
    this.id = index;
    this.type = def.type ?? 'solid';
    this.x = def.x;
    this.y = def.y;
    this.w = def.w;
    this.h = def.h ?? 20;
    this.baseX = def.x;
    this.baseY = def.y;

    // Movement path (type: 'move')
    this.ax = def.ax ?? 0;
    // The rope (type: 'swing'). Length decides the period, so it is the only
    // thing a level author picks.
    this.pivotX = def.pivotX ?? def.x;
    this.pivotY = def.pivotY ?? 0;
    this.ropeLen = def.ropeLen ?? 200;
    this.ropeAngle = def.ropeAngle ?? SWING.maxAngle;
    this.angle = 0;
    this.ay = def.ay ?? 0;
    this.period = def.period ?? 3;
    this.phase = def.phase ?? 0;

    // Melting cycle (type: 'melt')
    this.meltPeriod = def.meltPeriod ?? 3.2;
    this.meltPhase = def.meltPhase ?? 0;
    this.meltOn = def.meltOn ?? 0.62; // fraction of the cycle spent solid

    this.delay = def.delay ?? null;
    this.respawnTime = def.respawn ?? ICE.respawn;

    this.state = 'idle'; // idle | cracking | gone | returning
    this.timer = 0;
    this.solidity = 1; // 0..1 — visual + collision presence
    this.shakeSeed = Math.random() * 100;
    this.dx = 0; // per-frame delta, used to carry the player
    this.dy = 0;
    this.vy = 0; // for falling floes
    this.touched = false;

    // Geyser (type: 'burst') — cycles on its own clock once armed.
    this.burstPeriod = def.burstPeriod ?? 0;
    this.burstPhase = def.burstPhase ?? 0;
    this.burstTimer = 0;
    this.burstFired = false;
    this.plume = 0; // 0..1 visual height of the water column

    // Sudden collapse (type: 'snap')
    this.snapped = false;
  }

  get breakable() {
    return (
      this.type === 'crack' || this.type === 'trap' || this.type === 'fall' || this.type === 'fake'
    );
  }

  /**
   * Ice that lies about what it is.
   *
   * Drawn as ordinary solid ice, with none of the veins or the colour that
   * every other breakable type wears. The renderer has to ask, because there is
   * no other way to tell.
   */
  get isFake() {
    return this.type === 'fake';
  }

  /** Floes that do something violent rather than simply disappearing. */
  get isBurst() {
    return this.type === 'burst';
  }

  get isSnap() {
    return this.type === 'snap';
  }

  get slippery() {
    return this.type === 'slip';
  }

  /** Collision is skipped entirely once a floe is more than half gone. */
  get solid() {
    return this.solidity > 0.5;
  }

  breakDelay(assistMult = 1) {
    if (this.delay != null) return this.delay * assistMult;
    if (this.type === 'trap') return ICE.trapDelay * assistMult;
    if (this.type === 'fake') return ICE.fakeDelay * assistMult;
    if (this.type === 'fall') return 0.35 * assistMult;
    return ICE.crackDelay * assistMult;
  }

  /** Called by the player when it lands on / stands on this floe. */
  touch(assistMult = 1, onCrack) {
    this.touched = true;

    // A geyser arms the moment weight lands on it. The warning is short but
    // always there — the ice hisses and bulges before it fires, so a player
    // who has met one before can get off in time.
    if (this.isBurst) {
      if (this.state !== 'idle') return;
      this.state = 'arming';
      this.timer = ICE.burstWarn * assistMult;
      onCrack?.(this);
      return;
    }

    if (!this.breakable || this.state !== 'idle') return;
    this.state = 'cracking';
    this.timer = this.breakDelay(assistMult);
    onCrack?.(this);
  }

  /**
   * "snap" ice: the cruel one. It waits until the player is committed to the
   * landing — falling, close, directly above — and only then gives way.
   *
   * Two things keep it from being cheap. It fires once and then stays gone
   * long enough that the retry is a known quantity rather than another
   * ambush, and its surface carries a hairline seam you can learn to read.
   *
   * @returns {boolean} true if it snapped on this call
   */
  trySnap(player, assist) {
    if (!this.isSnap || this.snapped || this.state !== 'idle') return false;
    if (player.vy <= 0) return false;
    const cx = player.x + player.w / 2;
    if (cx < this.x - 12 || cx > this.x + this.w + 12) return false;
    // Time until the feet reach the surface, at the current fall speed.
    const eta = (this.y - (player.y + player.h)) / Math.max(1, player.vy);
    if (eta < 0 || eta > ICE.snapTrigger * (assist ? 0.45 : 1)) return false;
    this.snapped = true;
    this.state = 'gone';
    this.timer = ICE.snapRespawn;
    this.solidity = 0;
    return true;
  }

  update(dt, time, ctxFx) {
    this.dx = 0;
    this.dy = 0;

    /**
     * A slab hanging on a rope.
     *
     * Not a moving platform with a curved path: a pendulum. It is fastest at
     * the bottom of the arc and it hangs almost still at the ends, and those
     * two facts are the whole reason it is worth having — the timing is
     * legible on sight to anybody who has ever watched a swing, so a player
     * knows to step on at the moment it stops without having to be told, and
     * knows that the middle of the arc is where it will run away from them.
     *
     * `dx`/`dy` are the frame's movement, which is how a rider gets carried:
     * the player adds them to its own position while it is standing here. Down
     * near the bottom of a long arc that is a real shove, and staying on
     * during it is the skill the thing is asking for.
     */
    if (this.type === 'swing') {
      const prevX = this.x;
      const prevY = this.y;
      const at = swingAt(this.ropeLen, this.ropeAngle, this.phase, time);
      this.angle = at.angle;
      this.x = this.pivotX - this.w / 2 + at.dx;
      this.y = this.pivotY + at.dy;
      this.dx = this.x - prevX;
      this.dy = this.y - prevY;
      return;
    }

    if (this.type === 'move') {
      const prevX = this.x;
      const prevY = this.y;
      const t = ((time / this.period) + this.phase) * Math.PI * 2;
      this.x = this.baseX + Math.sin(t) * this.ax;
      this.y = this.baseY + Math.sin(t) * this.ay;
      this.dx = this.x - prevX;
      this.dy = this.y - prevY;
      return;
    }

    if (this.type === 'melt') {
      const cycle = ((time / this.meltPeriod) + this.meltPhase) % 1;
      if (cycle < this.meltOn) {
        // Present, but fades out over the last 25% as a warning.
        const warn = clamp((cycle - this.meltOn * 0.75) / (this.meltOn * 0.25), 0, 1);
        this.solidity = 1 - warn * 0.35;
      } else {
        const gonePhase = (cycle - this.meltOn) / (1 - this.meltOn);
        // Melt away quickly, drift back in over the second half.
        this.solidity = gonePhase < 0.25 ? 1 - gonePhase / 0.25 : easeOutCubic(clamp((gonePhase - 0.6) / 0.4, 0, 1));
        if (gonePhase > 0.24 && gonePhase < 0.3 && !this._popped) {
          this._popped = true;
          ctxFx?.shatter(this);
        }
        if (gonePhase < 0.2) this._popped = false;
      }
      return;
    }

    if (this.isBurst && this.state === 'idle' && this.burstPeriod > 0) {
      // Some geysers fire on a timer whether or not anyone is standing there,
      // so the level has a rhythm even before you step on it.
      const cycle = ((time / this.burstPeriod) + this.burstPhase) % 1;
      const warnAt = 1 - ICE.burstWarn / this.burstPeriod;
      this.plume = cycle > warnAt ? (cycle - warnAt) / (1 - warnAt) : 0;
      if (cycle > warnAt && !this.burstFired) {
        this.burstFired = true;
        this.state = 'erupting';
        this.timer = 0.42;
      }
      if (cycle < 0.2) this.burstFired = false;
    }

    switch (this.state) {
      case 'arming': {
        this.timer -= dt;
        this.plume = 1 - clamp(this.timer / ICE.burstWarn, 0, 1);
        if (this.timer <= 0) {
          this.state = 'erupting';
          this.timer = 0.42;
        }
        break;
      }
      case 'erupting': {
        this.timer -= dt;
        this.plume = clamp(this.timer / 0.42, 0, 1);
        if (this.timer <= 0) {
          this.state = 'cooling';
          this.timer = 1.1;
          this.plume = 0;
        }
        break;
      }
      case 'cooling': {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'idle';
          this.timer = 0;
          this.burstFired = false;
        }
        break;
      }
      case 'cracking': {
        this.timer -= dt;
        if (this.type === 'fall') {
          if (this.timer <= 0) {
            this.state = 'gone';
            this.timer = this.respawnTime;
            this.vy = 0;
            ctxFx?.shatter(this);
          }
        } else if (this.timer <= 0) {
          this.state = 'gone';
          this.timer = this.respawnTime;
          this.solidity = 0;
          ctxFx?.shatter(this);
        }
        break;
      }
      case 'gone': {
        this.timer -= dt;
        this.solidity = 0;
        if (this.timer <= 0) {
          this.state = 'returning';
          this.timer = 0.45;
        }
        break;
      }
      case 'returning': {
        this.timer -= dt;
        this.solidity = easeOutCubic(1 - clamp(this.timer / 0.45, 0, 1));
        if (this.timer <= 0) {
          this.state = 'idle';
          this.solidity = 1;
          this.touched = false;
          // `snapped` deliberately stays set: the ambush happens once per
          // attempt. Reforming ice you already learned about is a platform,
          // not a second trap.
        }
        break;
      }
      default:
        this.solidity = lerp(this.solidity, 1, Math.min(1, dt * 8));
    }
  }

  /** Visual jitter while a floe is about to give way or blow. */
  shakeOffset(time) {
    if (this.state === 'arming') {
      const urgency = 1 - clamp(this.timer / ICE.burstWarn, 0, 1);
      return Math.sin(time * 80 + this.shakeSeed) * ICE.shake * 1.6 * urgency;
    }
    if (this.state !== 'cracking') return 0;
    const urgency = 1 - clamp(this.timer / this.breakDelay(), 0, 1);
    return Math.sin(time * 60 + this.shakeSeed) * ICE.shake * urgency;
  }

  reset() {
    this.state = 'idle';
    this.timer = 0;
    this.solidity = 1;
    this.touched = false;
    this.vy = 0;
    this.x = this.baseX;
    this.y = this.baseY;
    this._popped = false;
    this.snapped = false;
    this.burstFired = false;
    this.plume = 0;
  }
}

/* ------------------------------------------------------------------ */
/* Hazards                                                             */
/* ------------------------------------------------------------------ */

/**
 * kind:
 *   spike  — static icicle spikes, lethal on contact
 *   icicle — hangs overhead, drops when the player walks underneath
 *   seal   — patrols back and forth
 *   gust   — wind column, pushes but never kills
 *   orca   — breaches out of the gap on a timer, lethal at the top of its arc
 *   storm  — a stretch of coast with the wind against you, surging in waves
 *   shard  — serac ice down a shaft, on its own clock rather than on yours
 */
export class Hazard {
  constructor(def) {
    Object.assign(this, {
      kind: 'spike',
      w: 26,
      h: 26,
      speed: 70,
      range: 120,
      dir: 1,
      ...def,
    });
    this.baseX = this.x;
    this.baseY = this.y;
    this.state = 'idle';
    this.vy = 0;
    this.timer = 0;
    this.phase = def.phase ?? Math.random();
    // Orca: how high it breaches and how often.
    this.height = def.height ?? 220;
    this.period = def.period ?? 3.4;
    this.rise = 0; // 0..1 along the breach arc
    // Storm: 0..1 wind strength this frame, and whether it is still building.
    this.intensity = 0;
    this.building = false;
    /** Storm: -1 fully against, +1 fully with, and where in the breath it is. */
    this.signed = 0;
    this.cycle = 0;
    this.tail = false;
    this.lull = false;
    /** Gust: how hard the column is lifting right now. */
    this.lift = 0;
    /** Serac: when its cycle started, or null while it is still asleep. */
    this.armedAt = null;
  }

  get lethal() {
    if (this.kind === 'gust' || this.kind === 'storm') return false;
    // An orca only bites while it is actually out of the water.
    if (this.kind === 'orca') return this.rise > 0.12;
    // Falling ice is only dangerous while it is falling. Hanging above you it
    // is a warning, and once it is past you it is scenery.
    if (this.kind === 'shard') return this.state === 'drop';
    return true;
  }

  get box() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt, time, player, speedMult = 1) {
    const s = speedMult;
    switch (this.kind) {
      case 'seal': {
        this.x += this.dir * this.speed * s * dt;
        if (this.x > this.baseX + this.range) {
          this.x = this.baseX + this.range;
          this.dir = -1;
        } else if (this.x < this.baseX - this.range) {
          this.x = this.baseX - this.range;
          this.dir = 1;
        }
        break;
      }
      case 'icicle': {
        if (this.state === 'idle') {
          const cx = player.x + player.w / 2;
          const overlap = cx > this.x - 26 && cx < this.x + this.w + 26 && player.y > this.y;
          if (overlap) {
            this.state = 'warn';
            this.timer = 0.42 / s;
          }
        } else if (this.state === 'warn') {
          this.timer -= dt;
          if (this.timer <= 0) this.state = 'drop';
        } else if (this.state === 'drop') {
          this.vy += 2000 * dt;
          this.y += this.vy * dt;
          if (this.y > this.baseY + 620) {
            this.state = 'cooldown';
            this.timer = 2.4;
          }
        } else {
          this.timer -= dt;
          if (this.timer <= 0) this.reset();
        }
        break;
      }
      case 'shard': {
        // An icicle waits for you to walk under it; a serac does not care where
        // you are. On a wall you cannot stop and you cannot step aside, so the
        // only fair version is one with a clock you can learn — the crack is
        // always the same length, and it always comes at the same interval.
        //
        // But the clock must not already be running when the player arrives.
        // Left free-running, the first thing a level with a serac in it does is
        // drop one on somebody who has not moved yet, which is not a clock, it
        // is a coin flip on the loading screen. So it sleeps until the penguin
        // is actually in the shaft, and then starts from the top of its cycle —
        // the first crack a player ever hears is always a full warning.
        if (this.armedAt == null) {
          if (player.y > (this.arm ?? -Infinity)) {
            this.state = 'idle';
            this.y = this.baseY;
            break;
          }
          this.armedAt = time;
        }
        const period = this.period ?? 3;
        const warn = this.warn ?? 0.5;
        const cycle = (((time - this.armedAt) * s) / period) % 1;
        const fallFrom = warn / period;
        if (cycle < fallFrom) {
          this.state = 'warn';
          this.y = this.baseY;
          this.vy = 0;
        } else {
          this.state = 'drop';
          const t = (cycle - fallFrom) * period;
          this.y = this.baseY + 0.5 * 2000 * t * t;
          if (this.y > this.baseY + (this.fall ?? 600)) this.state = 'spent';
        }
        break;
      }
      case 'gust': {
        // A rising column. Not a sideways nudge with a different name: this is
        // the only thing in the shelf chapter that gives height for free, so
        // it is drawn as a shaft of moving snow and it lifts.
        // Deliberately steady. The storm is the thing you time; this is the
        // thing you use, and a tool that changes strength while you are in the
        // air is not a tool. What breathes is the drawing of it, not the push.
        const cycle = ((time * s) / (this.period ?? 3.2) + this.phase) % 1;
        this.intensity = 0.82 + 0.18 * Math.sin(cycle * Math.PI * 2);
        this.lift = this.power ?? WIND.lift;
        this.strength = 0;
        break;
      }
      case 'storm': {
        // Four beats: against, lull, with, lull. The shape lives in
        // `windAt` so that what the player is shown, what the physics does and
        // what the validator proved are all reading the same curve.
        const cycle = ((time * s) / (this.period ?? WIND.period) + this.phase) % 1;
        const signed = windAt(cycle);
        this.cycle = cycle;
        this.signed = signed;
        this.intensity = Math.abs(signed);
        this.tail = tailWindow(cycle);
        this.lull = lullWindow(cycle);
        // Building is now "about to be against you", which is the half of the
        // cycle worth a warning. Nobody needs warning about a tailwind.
        this.building = signed < 0 && cycle < 0.16;
        // `dir` is which way the level runs. A positive `signed` blows that
        // way, so a tailwind is a tailwind wherever the level happens to face.
        this.strength = (this.power ?? WIND.power) * signed * (this.dir ?? 1);
        break;
      }
      case 'orca': {
        // One clean sine arc per period, spending most of the cycle underwater
        // so the gap is crossable — the fin shows first, then the whale.
        const cycle = (((time * s) / this.period) + this.phase) % 1;
        const air = 0.42; // fraction of the cycle spent out of the water
        this.rise = cycle < air ? Math.sin((cycle / air) * Math.PI) : 0;
        this.warn = cycle >= 1 - 0.16 || (cycle < air && this.rise < 0.15);
        this.y = this.baseY - this.rise * this.height;
        break;
      }
      default:
        break;
    }
  }

  reset() {
    this.x = this.baseX;
    this.y = this.baseY;
    this.state = 'idle';
    this.vy = 0;
    this.timer = 0;
    // A serac that has already been woken goes back to sleep on a retry, so a
    // respawn always buys the same full warning the first attempt did.
    this.armedAt = null;
  }
}

/* ------------------------------------------------------------------ */
/* Pickups & markers                                                   */
/* ------------------------------------------------------------------ */

/**
 * kind:
 *   normal — the three collectibles, worth a star and some coins
 *   speed  — red and gold, a temporary sprint, always a detour
 *   heavy / dizzy / blind — rotten, a temporary curse, always on the line
 */
/** The rotten kinds. A fish is bait if its kind is in here, and only then. */
const ROT_KINDS = ['heavy', 'slick', 'dizzy', 'blind'];
/** The fish that hand the jump button a new meaning for a few seconds. */
const CHARGED_KINDS = ['coil', 'quantum', 'slack'];

export class Fish {
  constructor(def, kind = 'normal') {
    this.kind = kind;
    this.rot = ROT_KINDS.includes(kind);
    this.charged = CHARGED_KINDS.includes(kind);
    this.x = def.x;
    this.y = def.y;
    this.baseX = def.x;
    this.baseY = def.y;
    // The speed and charged fish are bigger and easier to grab — they are
    // already a detour, so they should not also be a precision test.
    const big = kind === 'speed' || this.charged;
    this.w = big ? 30 : 22;
    this.h = big ? 22 : 16;
    // A rotten fish drifts on the spot, which is most of how you spot one
    // moving at speed — that and the colour.
    this.wobble = Math.random() * Math.PI * 2;
    this.taken = false;
    this.phase = Math.random() * Math.PI * 2;
    this.pop = 0;
  }

  get isSpeed() {
    return this.kind === 'speed';
  }

  /** Charged fish read as alive: they hover, they do not drift like bait. */
  get lively() {
    return this.charged;
  }

  update(dt) {
    this.phase += dt * (this.rot ? 1.5 : this.charged ? 3.2 : 2.4);
    if (this.rot) {
      this.wobble += dt * 3.1;
      this.x = this.baseX + Math.sin(this.wobble) * 6;
    } else if (this.charged) {
      // A charged fish hovers rather than swims: it holds its lane and bobs,
      // so from across a level it reads as a thing waiting to be used.
      this.wobble += dt * 2.2;
      this.y = this.baseY + Math.sin(this.wobble) * 7;
    }
    if (this.pop > 0) this.pop = Math.max(0, this.pop - dt * 3);
  }

  get box() {
    return { x: this.x - 4, y: this.y - 4, w: this.w + 8, h: this.h + 8 };
  }

  reset() {
    this.taken = false;
    this.pop = 0;
    this.x = this.baseX;
    this.y = this.baseY;
  }
}

export class Checkpoint {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.w = 24;
    this.h = 46;
    this.active = false;
    this.pulse = 0;
  }

  get box() {
    return { x: this.x - 10, y: this.y - 10, w: this.w + 20, h: this.h + 20 };
  }

  update(dt) {
    if (this.pulse > 0) this.pulse = Math.max(0, this.pulse - dt * 2);
  }
}

/* ------------------------------------------------------------------ */
/* The snowball fight                                                  */
/* ------------------------------------------------------------------ */

/**
 * A rival penguin.
 *
 * It stands on its ledge and throws. It does not chase, it does not jump, it
 * does not aim anywhere except at you — and that last part is the whole
 * mechanic, because a thing that always aims at you is a thing you can point
 * at somebody else.
 *
 * The cycle is: wait, wind up (aim locked, arm back, line drawn), throw. The
 * lock is the fair part. Without it the ball would follow you and there would
 * be no baiting, only dodging; with it the level becomes a question about
 * where to be standing rather than how fast you can move.
 */
export class Rival {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.w = def.w ?? 30;
    this.h = def.h ?? 40;
    /** Guards the way out. The exit stays shut while any guard is standing. */
    this.guard = def.guard ?? false;
    this.period = def.period ?? BRAWL.period;
    /** Offset into the cycle, so a room full of rivals is not a volley. */
    this.phase = def.phase ?? 0;
    this.facing = def.facing ?? -1;
    this.skin = def.skin ?? 'rival';
    this.reset();
  }

  reset() {
    this.out = false;
    this.state = 'wait'; // wait | windup
    this.timer = this.period * (1 - (this.phase % 1));
    /** Where the throw is going, locked when the wind-up begins. */
    this.aim = null;
    this.puff = 0;
    this.throwFlash = 0;
  }

  get box() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get hand() {
    return { x: this.x + this.w / 2, y: this.y + this.h * 0.34 };
  }

  /**
   * @returns {null | {x:number, y:number}} the aim point, on the frame it throws
   */
  update(dt, player, speedMult = 1) {
    if (this.out) {
      this.puff = Math.max(0, this.puff - dt);
      return null;
    }
    this.throwFlash = Math.max(0, this.throwFlash - dt * 3);
    this.timer -= dt * speedMult;
    if (this.timer > 0) return null;

    if (this.state === 'wait') {
      const cx = player.x + player.w / 2;
      const cy = player.y + player.h / 2;
      const hand = this.hand;
      if (Math.hypot(cx - hand.x, cy - hand.y) > BRAWL.range) {
        this.timer = 0.4;
        return null;
      }
      this.state = 'windup';
      this.timer = BRAWL.windup;
      this.aim = { x: cx, y: cy };
      this.facing = cx < hand.x ? -1 : 1;
      return null;
    }

    this.state = 'wait';
    this.timer = this.period;
    this.throwFlash = 1;
    const shot = this.aim;
    this.aim = null;
    return shot;
  }

  knockOut() {
    this.out = true;
    this.state = 'wait';
    this.aim = null;
    this.puff = 0.6;
  }
}

/**
 * A thrown snowball.
 *
 * Straight, and that is a design decision rather than a simplification. A lob
 * cannot be lined up by eye, and this chapter is entirely about lining things
 * up: if the player cannot see the line, there is no puzzle, only luck. So the
 * throw is flat and hard, and the ball stops at the first thing it touches —
 * a rival, the player, or ice.
 */
export class Snowball {
  constructor(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    this.x = from.x;
    this.y = from.y;
    this.vx = (dx / len) * BRAWL.speed;
    this.vy = (dy / len) * BRAWL.speed;
    this.r = BRAWL.radius;
    this.life = 3.2;
    this.dead = false;
    this.spin = 0;
    /** Where it came from, so a thrower never shoots itself. */
    this.origin = from;
  }

  get box() {
    return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 };
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.spin += dt * 14;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
}
