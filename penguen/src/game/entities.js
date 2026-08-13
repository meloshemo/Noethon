/**
 * World entities: ice floes, hazards and pickups.
 *
 * Every entity owns its own update/state machine and exposes a plain
 * `{x, y, w, h}` box that the collision code in level.js consumes.
 */

import { ICE } from './config.js';
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
    return this.type === 'crack' || this.type === 'trap' || this.type === 'fall';
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
  }

  get lethal() {
    if (this.kind === 'gust') return false;
    // An orca only bites while it is actually out of the water.
    if (this.kind === 'orca') return this.rise > 0.12;
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
      case 'gust': {
        this.strength = (this.power ?? 320) * (0.6 + 0.4 * Math.sin(time * 2.2 + this.phase * 6));
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
  }
}

/* ------------------------------------------------------------------ */
/* Pickups & markers                                                   */
/* ------------------------------------------------------------------ */

export class Fish {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.w = 22;
    this.h = 16;
    this.taken = false;
    this.phase = Math.random() * Math.PI * 2;
    this.pop = 0;
  }

  update(dt) {
    this.phase += dt * 2.4;
    if (this.pop > 0) this.pop = Math.max(0, this.pop - dt * 3);
  }

  get box() {
    return { x: this.x - 4, y: this.y - 4, w: this.w + 8, h: this.h + 8 };
  }

  reset() {
    this.taken = false;
    this.pop = 0;
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
