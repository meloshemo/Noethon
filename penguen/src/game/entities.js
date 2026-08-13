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
  }

  get breakable() {
    return this.type === 'crack' || this.type === 'trap' || this.type === 'fall';
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
    if (!this.breakable || this.state !== 'idle') return;
    this.state = 'cracking';
    this.timer = this.breakDelay(assistMult);
    onCrack?.(this);
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

    switch (this.state) {
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
        }
        break;
      }
      default:
        this.solidity = lerp(this.solidity, 1, Math.min(1, dt * 8));
    }
  }

  /** Visual jitter while a floe is about to give way. */
  shakeOffset(time) {
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
  }

  get lethal() {
    return this.kind !== 'gust';
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
