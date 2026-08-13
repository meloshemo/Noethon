/**
 * The penguin.
 *
 * Movement is deliberately forgiving: coyote time, jump buffering and a
 * variable-height jump. Those three make a platformer feel "fair", which is
 * exactly what the early levels need.
 */

import { PHYS, PENGUIN } from './config.js';
import { clamp, damp, rectsOverlap } from '../core/util.js';

export class Player {
  constructor() {
    this.scale = 1;
    /** Shop upgrades, resolved to plain multipliers by the world. */
    this.boost = { jump: 0, speed: 0, grip: 0, wind: 0 };
    this.reset(0, 0);
  }

  setScale(scale) {
    this.scale = scale;
    this.w = PENGUIN.w * scale;
    this.h = PENGUIN.h * scale;
  }

  /** Thrown by a geyser — briefly ignores ground contact so it reads clean. */
  launch(vx, vy) {
    this.vx = vx;
    this.vy = vy;
    this.onGround = false;
    this.groundFloe = null;
    this.coyote = 0;
    this.buffer = 0;
    this.squashX = 0.7;
    this.squashY = 1.4;
    this.launched = 0.35;
  }

  reset(x, y) {
    this.setScale(this.scale);
    this.x = x - this.w / 2;
    this.y = y - this.h;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.groundFloe = null;
    this.coyote = 0;
    this.buffer = 0;
    this.facing = 1;
    this.squashX = 1;
    this.squashY = 1;
    this.walkPhase = 0;
    this.blink = 2 + Math.random() * 3;
    this.alive = true;
    this.slideAmount = 0;
    this.airTime = 0;
    this.wasOnGround = false;
    this.landedThisFrame = false;
    this.jumpedThisFrame = false;
    this.launched = 0;
  }

  get box() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get centerX() {
    return this.x + this.w / 2;
  }

  get jumpVelocity() {
    const base = PHYS.jumpVelocity * (1 - PENGUIN.jumpPenaltyPerScale * (this.scale - 1));
    return base * (1 + this.boost.jump);
  }

  get moveSpeed() {
    const base = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (this.scale - 1));
    return base * (1 + this.boost.speed);
  }

  /**
   * @param {number} dt
   * @param {{axis:number, jumpHeld:boolean, jumpPressed:boolean}} intent
   * @param {Array} floes
   * @param {object} tuning coyote-time multiplier etc. from assist mode
   */
  update(dt, intent, floes, tuning, events) {
    this.landedThisFrame = false;
    this.jumpedThisFrame = false;
    this.wasOnGround = this.onGround;

    const slippery = this.groundFloe?.slippery;
    // Crampons pull the slip factor back toward normal ground friction.
    const slipFactor = PHYS.slipFriction + (1 - PHYS.slipFriction) * this.boost.grip;
    const accel = this.onGround ? PHYS.groundAccel : PHYS.airAccel;
    const friction = this.onGround
      ? PHYS.groundFriction * (slippery ? slipFactor : 1)
      : PHYS.airFriction;

    this.launched = Math.max(0, this.launched - dt);

    const target = intent.axis * this.moveSpeed;
    if (this.launched > 0) {
      // Tumbling: steering is heavily damped, but not gone — the player can
      // still fight for a landing, which is what keeps this fair.
      this.vx += intent.axis * PHYS.airAccel * 0.25 * dt;
    } else if (intent.axis !== 0) {
      const rate = slippery && this.onGround ? accel * (0.35 + 0.65 * this.boost.grip) : accel;
      this.vx += Math.sign(target - this.vx) * rate * dt;
      // Don't overshoot the target speed in a single step.
      if (Math.sign(target - this.vx) !== Math.sign(target) && Math.abs(this.vx) > Math.abs(target)) {
        this.vx = target;
      }
      this.vx = clamp(this.vx, -Math.abs(target), Math.abs(target));
      this.facing = Math.sign(intent.axis);
    } else {
      const drop = friction * dt;
      this.vx = Math.abs(this.vx) <= drop ? 0 : this.vx - Math.sign(this.vx) * drop;
    }

    // External forces (wind gusts) are injected by the level each frame.
    this.vx += (intent.push ?? 0) * dt;

    // --- Jump: buffered press + coyote time ---------------------------
    if (intent.jumpPressed) this.buffer = PHYS.jumpBuffer;
    this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = this.onGround ? PHYS.coyoteTime * (tuning.coyote ?? 1) : Math.max(0, this.coyote - dt);

    if (this.buffer > 0 && this.coyote > 0) {
      this.vy = this.jumpVelocity;
      this.buffer = 0;
      this.coyote = 0;
      this.onGround = false;
      this.groundFloe = null;
      this.squashX = 0.78;
      this.squashY = 1.25;
      this.jumpedThisFrame = true;
      events?.onJump?.();
    }

    // Releasing the button early cuts the jump short — but only a jump. A
    // geyser throw is not the player's to cut, and letting the same code path
    // damp it turned the eruption into a hop.
    if (!intent.jumpHeld && this.vy < 0 && this.launched <= 0) {
      this.vy *= 1 - (1 - PHYS.jumpCut) * Math.min(1, dt * 30);
    }

    const g = this.vy < 0 ? PHYS.gravityUp : PHYS.gravityDown;
    this.vy = Math.min(PHYS.maxFall, this.vy + g * dt);

    // --- Move & resolve, one axis at a time ---------------------------
    const ridden = this.groundFloe;
    if (ridden && this.onGround) {
      this.x += ridden.dx;
      this.y += ridden.dy;
    }

    this.x += this.vx * dt;
    this._resolveX(floes);

    this.y += this.vy * dt;
    const prevGround = this.groundFloe;
    this.onGround = false;
    this.groundFloe = null;
    this._resolveY(floes, events);

    if (this.onGround && !this.wasOnGround) {
      this.landedThisFrame = true;
      const impact = clamp(Math.abs(this.vy) / 900, 0, 1);
      this.squashX = 1 + 0.28 * impact;
      this.squashY = 1 - 0.26 * impact;
      events?.onLand?.(impact, this.groundFloe);
    }
    if (!this.onGround && prevGround && !this.jumpedThisFrame) this.coyote = PHYS.coyoteTime * (tuning.coyote ?? 1);

    this.airTime = this.onGround ? 0 : this.airTime + dt;

    // --- Cosmetics ----------------------------------------------------
    this.squashX = damp(this.squashX, 1, 14, dt);
    this.squashY = damp(this.squashY, 1, 14, dt);
    if (this.onGround && Math.abs(this.vx) > 20) this.walkPhase += dt * (4 + Math.abs(this.vx) / 40);
    else this.walkPhase = damp(this.walkPhase % (Math.PI * 2), 0, 6, dt);
    this.slideAmount = damp(this.slideAmount, slippery && Math.abs(this.vx) > 60 ? 1 : 0, 8, dt);
    this.blink -= dt;
    if (this.blink < -0.14) this.blink = 2.4 + Math.random() * 3.2;
  }

  _resolveX(floes) {
    const box = this.box;
    for (const f of floes) {
      if (!f.solid) continue;
      const fb = { x: f.x, y: f.y, w: f.w, h: f.h };
      if (!rectsOverlap(box, fb)) continue;
      // Only push out sideways if we're clearly beside the floe, not on top.
      const overlapTop = box.y + box.h - fb.y;
      if (overlapTop < 8) continue;
      if (this.vx > 0) this.x = fb.x - this.w;
      else if (this.vx < 0) this.x = fb.x + fb.w;
      else continue;
      this.vx = 0;
      box.x = this.x;
    }
  }

  _resolveY(floes, events) {
    const box = this.box;
    for (const f of floes) {
      if (!f.solid) continue;
      const fb = { x: f.x, y: f.y, w: f.w, h: f.h };
      if (!rectsOverlap(box, fb)) continue;

      if (this.vy >= 0 && box.y + box.h - this.vy * 0.016 <= fb.y + fb.h * 0.8) {
        // Landing on top.
        this.y = fb.y - this.h;
        this.vy = 0;
        this.onGround = true;
        this.groundFloe = f;
        events?.onStand?.(f);
      } else if (this.vy < 0) {
        // Bonked the underside.
        this.y = fb.y + fb.h;
        this.vy = 40;
      }
      box.y = this.y;
    }
  }
}
