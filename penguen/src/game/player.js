/**
 * The penguin.
 *
 * Movement is deliberately forgiving: coyote time, jump buffering and a
 * variable-height jump. Those three make a platformer feel "fair", which is
 * exactly what the early levels need.
 */

import { PHYS, PENGUIN, BOOST, ROT, GEAR, CLIMB, SWIM, WIND, breathFor } from './config.js';
import { clamp, damp, rectsOverlap } from '../core/util.js';

export class Player {
  constructor() {
    this.scale = 1;
    /** Shop upgrades, resolved to plain multipliers by the world. */
    this.boost = { jump: 0, speed: 0, grip: 0, wind: 0 };
    /**
     * Active gear, in levels owned. 0 means the penguin does not have it and
     * none of the code below does anything at all.
     */
    this.gear = { wings: 0, rocket: 0 };
    /**
     * Glide seconds a diamond penguin adds. Kept separate from the wings so a
     * penguin that lengthens the glide is useless without them — the perk
     * improves a thing you own, it does not hand you the thing.
     */
    this.glideBonus = 0;
    /** Speed-fish charge: seconds remaining. */
    this.charge = 0;
    /** Rotten-fish curses: { heavy, dizzy, blind } → seconds remaining. */
    this.curse = { heavy: 0, dizzy: 0, blind: 0 };
    /** Afterimages, so the boost reads as speed rather than as a colour. */
    this.trail = [];
    /**
     * A short ring buffer of where the penguin has been, kept always and
     * reused in place so it produces no garbage. The cosmetic trail paints
     * from this — which is why a trail costs nothing but eighteen objects.
     */
    this.history = Array.from({ length: 18 }, () => ({ x: 0, y: 0, age: 1 }));
    this._histAt = 0;
    this._histAcc = 0;
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
    this.drift = 0;
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
    this.drift = 0;
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
    this.charge = 0;
    this.curse = { heavy: 0, dizzy: 0, blind: 0 };
    this.trail.length = 0;
    for (const p of this.history) {
      p.x = x;
      p.y = y;
      p.age = 1;
    }
    this.gliding = false;
    /** Inside a rising column this frame — drawn, and read by the HUD. */
    this.lifted = false;
    this.glideLeft = this.glideMax;
    this.rocketLeft = this.rocketMax;
    this.burn = 0;
    this.rocketCool = 0;
    /** Set for one frame when the motor fires, so the world can make a noise. */
    this.rocketFired = false;

    /* --- climbing ---------------------------------------------------- */
    /** Which side the gripped wall is on: -1 left, +1 right, 0 not gripping. */
    this.wallSide = 0;
    this.clinging = false;
    this.climbing = false;
    this.stamina = this.staminaMax;
    /** Seconds the wall just kicked off stays ungrabbable, and which one. */
    this.noGrab = 0;
    this.noGrabSide = 0;
    /** Set for one frame on a kick-off, so the world can spray chips. */
    this.wallJumped = false;
    /** Pulling over the head of a wall rather than climbing its face. */
    this.mantling = false;
    /** Seconds a wall kick is immune to the jump-cut. */
    this.kickGrace = 0;
    /** The block currently being gripped, so the climb knows where its top is. */
    this.wallBlock = null;
    /** The block being pulled over, kept until the penguin is standing on it. */
    this.mantleBlock = null;

    /* --- under the ice ----------------------------------------------- */
    /**
     * Set by the world for a dive level. Nothing reads it anywhere else, so a
     * shelf level and a mountain level behave exactly as they always have.
     */
    this.submerged = false;
    /** Seconds of breath left. Only meaningful while submerged. */
    this.breath = SWIM.breath;
    /** Diving this frame — the button is down. Drawn, and used for bubbles. */
    this.diving = false;
    /** Head is in air: at a hole in the ice, or above the surface. */
    this.breathing = false;
  }

  /**
   * How long the penguin can hang.
   *
   * Crampons help here for the same reason they help on polished ice — they
   * are the one upgrade that is about the *contact* rather than about power —
   * but they only lengthen the bar, they never remove it.
   */
  get staminaMax() {
    return CLIMB.stamina + CLIMB.gripBonus * (this.boost?.grip ?? 0);
  }

  get staminaFrac() {
    return this.staminaMax > 0 ? this.stamina / this.staminaMax : 0;
  }

  /**
   * How long a lungful lasts.
   *
   * Crampons do nothing here — they are about contact — but the growth curve
   * does: a bigger bird has bigger lungs, which is the one place in the game
   * where getting heavier is purely good news, and it is the chapter where the
   * penguin has already earned it.
   */
  get breathMax() {
    return breathFor(this.scale);
  }

  get breathFrac() {
    return this.breathMax > 0 ? this.breath / this.breathMax : 0;
  }

  get swimSpeed() {
    return this.moveSpeed * SWIM.speed;
  }

  get glideMax() {
    if (!this.gear.wings) return 0;
    const tier = this.gear.wings === 1 ? 1 : this.gear.wings === 2 ? 1.7 : 2.6;
    return GEAR.wings.stamina * tier + (this.glideBonus ?? 0);
  }

  get rocketMax() {
    return this.gear.rocket ?? 0;
  }

  /** Ate something rotten. Re-eating refreshes rather than stacks. */
  afflict(kind) {
    const spec = ROT[kind];
    if (!spec) return;
    this.curse[kind] = Math.max(this.curse[kind], spec.duration);
    this.squashX = 1.25;
    this.squashY = 0.78;
  }

  get cursed() {
    return this.curse.heavy > 0 || this.curse.dizzy > 0 || this.curse.blind > 0;
  }

  /** Swallowed a speed fish. Refreshes rather than stacks. */
  energise(seconds = BOOST.duration) {
    this.charge = Math.max(this.charge, seconds);
    this.squashX = 0.82;
    this.squashY = 1.2;
  }

  get charged() {
    return this.charge > 0;
  }

  get box() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get centerX() {
    return this.x + this.w / 2;
  }

  get jumpVelocity() {
    const base = PHYS.jumpVelocity * (1 - PENGUIN.jumpPenaltyPerScale * (this.scale - 1));
    const rot = this.curse.heavy > 0 ? ROT.heavy.jump : 0;
    return base * (1 + this.boost.jump + (this.charged ? BOOST.jump : 0) + rot);
  }

  get moveSpeed() {
    const base = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (this.scale - 1));
    const rot = this.curse.heavy > 0 ? ROT.heavy.speed : 0;
    return base * (1 + this.boost.speed + (this.charged ? BOOST.speed : 0) + rot);
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
    if (this.submerged) {
      this._swim(dt, intent, floes, events);
      return;
    }

    const slippery = this.groundFloe?.slippery;
    // Crampons pull the slip factor back toward normal ground friction.
    const slipFactor = PHYS.slipFriction + (1 - PHYS.slipFriction) * this.boost.grip;
    const accel = this.onGround ? PHYS.groundAccel : PHYS.airAccel;
    const friction = this.onGround
      ? PHYS.groundFriction * (slippery ? slipFactor : 1)
      : PHYS.airFriction;

    this.launched = Math.max(0, this.launched - dt);
    this.charge = Math.max(0, this.charge - dt);
    for (const k of ['heavy', 'dizzy', 'blind']) {
      this.curse[k] = Math.max(0, this.curse[k] - dt);
    }
    // Dizzy swaps the controls. Done here rather than at the input layer so it
    // applies to touch, keyboard and gamepad without any of them knowing.
    if (this.curse.dizzy > 0) intent = { ...intent, axis: -intent.axis };

    if (this.charge > 0) {
      // Sampled positions, oldest first — the renderer fades them out behind.
      this.trail.push({ x: this.x, y: this.y, f: this.facing, life: 0.22 });
      if (this.trail.length > 8) this.trail.shift();
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life -= dt;
      if (this.trail[i].life <= 0) this.trail.splice(i, 1);
    }

    // Kicking off a wall means holding *toward* that wall at the moment you
    // leave it — so without this, air control immediately drags the penguin
    // back into the ice it just pushed away from and the kick eats itself. For
    // the length of the no-regrab window, steering into the wall you just left
    // does nothing. Steering away, or letting go, works normally.
    if (this.noGrab > 0 && Math.sign(intent.axis) === this.noGrabSide) {
      intent = { ...intent, axis: 0 };
    }

    const target = intent.axis * this.moveSpeed;
    if (this.launched > 0) {
      // Tumbling: steering is heavily damped, but not gone — the player can
      // still fight for a landing, which is what keeps this fair.
      this.vx += intent.axis * PHYS.airAccel * 0.25 * dt;
    } else if (intent.axis !== 0) {
      const boosted = this.charged ? 1.35 : 1;
      const rate = (slippery && this.onGround ? accel * (0.35 + 0.65 * this.boost.grip) : accel) * boosted;
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

    /**
     * Wind, in its own channel.
     *
     * This used to be `vx += push * dt`, which looked right and did nothing.
     * The steering above clamps `vx` to the walk speed every single frame, so
     * whatever the wind added on one frame was taken straight back on the
     * next: a storm could lean on a penguin for four seconds and move the
     * landing spot by nothing. That is the entire reason the weather read as
     * decoration.
     *
     * Kept separate, steering owns the speed the player asked for and the wind
     * owns the speed the weather gave, and neither can erase the other. The
     * drag term is what stops it running away: drift approaches `push / drag`
     * and no further, so a tailwind is a bonus with a ceiling rather than an
     * accelerating slide into the sea.
     */
    this.drift += (intent.push ?? 0) * dt;
    this.drift -= this.drift * (this.onGround ? WIND.dragGround : WIND.dragAir) * dt;
    /**
     * Rising air.
     *
     * Applied as an upward acceleration rather than a velocity, so a column
     * does not teleport a falling penguin: you enter it moving down, you slow,
     * you stop, you climb. That takes about a third of a second and it is the
     * whole feel of the thing — a gust catches you rather than grabbing you.
     */
    this.lifted = (intent.lift ?? 0) > 0 && !this.onGround;
    if (this.lifted) this.vy -= intent.lift * dt;

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

    // --- The wall ------------------------------------------------------
    // Grip first, because everything below it — the motor, the wings, gravity
    // itself — has to know whether the penguin is currently holding on.
    this.wallJumped = false;
    this.noGrab = this.onGround ? 0 : Math.max(0, this.noGrab - dt);
    this.wallBlock = null;
    const wall = this.onGround ? 0 : this._probeWall(floes);
    const holdingInto = wall !== 0 && Math.sign(intent.axis) === wall;
    const barred = this.noGrab > 0 && this.noGrabSide === wall;
    // Once the pull-over has started, the grip is latched. The probe loses the
    // face the moment the body moves in over the top — which is exactly the
    // moment the penguin must not be dropped.
    const topping =
      this.mantleBlock &&
      !this.onGround &&
      this.y + this.h <= this.mantleBlock.y + 8 &&
      this.centerX > this.mantleBlock.x - this.w &&
      this.centerX < this.mantleBlock.x + this.mantleBlock.w + this.w;
    if (topping) this.wallBlock = this.mantleBlock;
    this.clinging = (holdingInto || topping) && !barred && this.stamina > 0;
    this.climbing = false;
    if (!this.clinging) {
      this.wallSide = 0;
      this.mantling = false;
      this.mantleBlock = null;
    } else if (topping && wall === 0) {
      this.wallSide = this.centerX < this.mantleBlock.x ? 1 : -1;
    }
    else {
      this.wallSide = wall;
      // A tap kicks off. Checked before the motor so the same button means the
      // same thing it always has: press to leave where you are.
      if (intent.jumpPressed) {
        this.vx = -wall * CLIMB.kickX;
        this.vy = this.jumpVelocity * CLIMB.kickY;
        this.stamina = Math.max(0, this.stamina - CLIMB.kickCost);
        this.noGrab = CLIMB.regrab;
        this.noGrabSide = wall;
        this.clinging = false;
        this.wallSide = 0;
        this.facing = -wall;
        this.buffer = 0;
        this.jumpedThisFrame = true;
        this.wallJumped = true;
        // A kick is fired by a *tap*, so the button is already up by the next
        // frame — and the variable-height jump cut would then shave two thirds
        // off it. Playing it the way the control is designed to be played was
        // being punished, and the shaft became uncrossable for exactly the
        // players who used the mechanic correctly. The impulse is protected
        // for as long as it takes to leave the wall.
        this.kickGrace = CLIMB.regrab;
        this.squashX = 0.76;
        this.squashY = 1.28;
        events?.onWallJump?.(wall);
      }
    }
    if (this.onGround) this.stamina = Math.min(this.staminaMax, this.stamina + CLIMB.regen * dt);

    // --- Gear ---------------------------------------------------------
    // Both meters refill only on the ground: gear turns a jump you already
    // committed to into one you can still argue with, never into flight.
    this.rocketFired = false;
    this.rocketCool = Math.max(0, this.rocketCool - dt);
    this.burn = Math.max(0, this.burn - dt);
    if (this.onGround) {
      this.glideLeft = this.glideMax;
      this.rocketLeft = this.rocketMax;
    }

    // The motor: a tap in mid-air, once the jump itself is spent. Checked
    // before the glide so a tap is a burst and a hold is a glide, which is the
    // whole reason both fit on one button.
    if (
      this.rocketMax > 0 &&
      intent.jumpPressed &&
      !this.onGround &&
      !this.clinging &&
      !this.jumpedThisFrame &&
      this.rocketLeft > 0 &&
      this.rocketCool <= 0
    ) {
      this.vy = Math.min(this.vy, GEAR.rocket.power);
      this.rocketLeft--;
      this.rocketCool = GEAR.rocket.cooldown;
      this.burn = GEAR.rocket.burn;
      this.rocketFired = true;
      this.squashX = 0.74;
      this.squashY = 1.34;
      this.buffer = 0;
      events?.onRocket?.();
    }

    // Wings: held, on the way down, while there is stamina left.
    this.gliding =
      this.glideMax > 0 &&
      intent.jumpHeld &&
      !this.onGround &&
      !this.clinging &&
      this.vy > 60 &&
      this.burn <= 0 &&
      this.glideLeft > 0;
    if (this.gliding) {
      this.glideLeft = Math.max(0, this.glideLeft - dt);
      // Spread wings also carry you forward a little, which is what makes a
      // glide a decision about distance rather than just a slower fall.
      this.vx += Math.sign(this.facing) * GEAR.wings.lift * dt * (intent.axis === 0 ? 1 : 0.4);
    }

    // Releasing the button early cuts the jump short — but only a jump. A
    // geyser throw is not the player's to cut, and letting the same code path
    // damp it turned the eruption into a hop.
    this.kickGrace = Math.max(0, this.kickGrace - dt);
    if (!intent.jumpHeld && this.vy < 0 && this.launched <= 0 && this.kickGrace <= 0) {
      this.vy *= 1 - (1 - PHYS.jumpCut) * Math.min(1, dt * 30);
    }

    const g = this.vy < 0 ? PHYS.gravityUp : PHYS.gravityDown;
    this.vy = Math.min(PHYS.maxFall, this.vy + g * dt);
    if (this.gliding) this.vy = Math.min(this.vy, PHYS.maxFall * GEAR.wings.fallFactor);

    // Holding on replaces gravity outright. Hanging still costs; creeping
    // upward costs more than twice as much; and when the bar empties the wall
    // simply stops being a wall — the penguin does not fall *off*, it stops
    // being able to hold on, which is a distinction the player can feel.
    if (this.clinging) {
      // Topping out. Once the feet clear the head of the wall there is nothing
      // left to climb, and hanging there creeping sideways at grip speed would
      // take two seconds — so the pull-over happens at running pace and the
      // penguin ends up standing on top of what it was hanging from. Without
      // this a wall is a dead end: you can reach its top and never get onto it.
      const head = this.wallBlock ? this.wallBlock.y : -Infinity;
      if (this.y + this.h <= head + 6) {
        this.mantleBlock = this.wallBlock;
        const block = this.wallBlock;
        // The pull-over ends when the penguin is over the thing it climbed.
        // Left running, it sails straight across a narrow wall head and off
        // the far side — you would top out and immediately fall, which is the
        // opposite of what topping out means.
        const over =
          block && this.centerX > block.x + 6 && this.centerX < block.x + block.w - 6;
        if (over) {
          // Standing on it now, not hanging off it.
          //
          // The pull-over *finishes* here rather than handing back to gravity
          // and hoping: the penguin is set down on the thing it climbed. Left
          // to drift it hovers a few pixels above ground it has already
          // reached, burning the rest of the bar, and a climb that succeeded
          // reads as one that did not.
          this.clinging = false;
          this.wallSide = 0;
          this.mantling = false;
          this.mantleBlock = null;
          this.vx = 0;
          // A pixel into the block and a whisker of downward speed, so the
          // ordinary landing code picks it up this frame — setting `onGround`
          // here would only be overwritten by the collision pass below.
          this.vy = 20;
          this.y = block.y - this.h + 1;
        } else {
          // Aimed at the middle of what is being climbed rather than shoved
          // blindly sideways. The head of a column is barely wider than the
          // penguin, and a constant push sails straight over it.
          const to = block.x + block.w / 2 - this.centerX;
          this.vx = clamp(to * 6, -this.moveSpeed * 0.9, this.moveSpeed * 0.9);
          this.vy = -CLIMB.climbSpeed * 0.35;
          this.stamina -= CLIMB.drainClimb * dt;
          this.climbing = true;
          this.mantling = true;
        }
      } else if (intent.jumpHeld) {
        this.mantling = false;
        this.vy = -CLIMB.climbSpeed;
        this.stamina -= CLIMB.drainClimb * dt;
        this.climbing = true;
      } else {
        this.mantling = false;
        this.vy = CLIMB.slideSpeed;
        this.stamina -= CLIMB.drainHold * dt;
      }
      // Stay pressed into the ice, otherwise the probe loses the wall the
      // instant friction eats the sideways speed and the grip flickers. While
      // pulling over the top the sideways speed is the whole point, so it is
      // left alone.
      if (!this.mantling) this.vx = this.wallSide * 24;
      if (this.stamina <= 0) {
        this.stamina = 0;
        this.clinging = false;
        this.wallSide = 0;
        events?.onSlip?.();
      }
    }

    // --- Move & resolve, one axis at a time ---------------------------
    const ridden = this.groundFloe;
    if (ridden && this.onGround) {
      this.x += ridden.dx;
      this.y += ridden.dy;
    }

    this.x += (this.vx + this.drift) * dt;
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

    // Breadcrumb for the cosmetic trail, on a fixed clock rather than per
    // frame, so the spacing is the same at 60 and 144 Hz.
    for (const p of this.history) p.age = Math.min(1, p.age + dt * 1.9);
    this._histAcc += dt;
    if (this._histAcc >= 0.035) {
      this._histAcc = 0;
      const slot = this.history[this._histAt];
      slot.x = this.x + this.w / 2;
      slot.y = this.y + this.h * 0.6;
      slot.age = 0;
      this._histAt = (this._histAt + 1) % this.history.length;
    }
  }

  /**
   * Swimming.
   *
   * A separate integration rather than gravity with different numbers, because
   * a swimming body is not a falling body with a smaller `g`. It has no ground
   * state, no coyote time, no jump to buffer and no wall to hold — none of
   * those questions mean anything down here — and threading them through the
   * land update with `if (!this.submerged)` in a dozen places would have made
   * both halves harder to read and neither of them safer.
   *
   * What it *does* share is the collision solver, so ice is ice: the same
   * boxes, resolved on the same two passes, in the same order.
   */
  _swim(dt, intent, floes, events) {
    this.onGround = false;
    this.groundFloe = null;
    this.clinging = false;
    this.wallSide = 0;
    this.gliding = false;

    this.charge = Math.max(0, this.charge - dt);
    for (const k of ['heavy', 'dizzy', 'blind']) {
      this.curse[k] = Math.max(0, this.curse[k] - dt);
    }
    if (this.curse.dizzy > 0) intent = { ...intent, axis: -intent.axis };

    if (this.charge > 0) {
      this.trail.push({ x: this.x, y: this.y, f: this.facing, life: 0.22 });
      if (this.trail.length > 8) this.trail.shift();
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life -= dt;
      if (this.trail[i].life <= 0) this.trail.splice(i, 1);
    }

    // Sideways. Water carries a body: there is no friction cliff at the moment
    // you let go, you keep going and slow down over a second or so. That coast
    // is most of why swimming feels like swimming rather than like walking in
    // a room with no floor.
    const top = this.swimSpeed;
    if (intent.axis !== 0) {
      this.vx += Math.sign(intent.axis) * SWIM.accel * dt;
      this.vx = clamp(this.vx, -top, top);
      this.facing = Math.sign(intent.axis);
    } else {
      const drop = SWIM.drag * dt;
      this.vx = Math.abs(this.vx) <= drop ? 0 : this.vx - Math.sign(this.vx) * drop;
    }
    this.vx += (intent.push ?? 0) * dt;
    // A current is not wind: it pushes a swimmer, and the swim branch has no
    // steering clamp to fight it, so it lives in `vx` where it belongs. The
    // drift channel is cleared so a gust caught on the way in cannot keep
    // shoving somebody around underwater.
    this.drift = 0;

    // Up is free, down is held. A penguin floats; it has to *work* to go
    // under, and that is the whole control: the button is the depth.
    this.diving = Boolean(intent.jumpHeld);
    if (this.diving) {
      this.vy = Math.min(SWIM.sinkMax, this.vy + (SWIM.dive - SWIM.buoyancy) * dt);
    } else {
      this.vy = Math.max(-SWIM.riseMax, this.vy - SWIM.buoyancy * dt);
    }

    this.x += this.vx * dt;
    this._resolveX(floes);
    this.y += this.vy * dt;
    this._resolveY(floes, events);

    this.airTime = 0;
    this.squashX = damp(this.squashX, 1, 14, dt);
    this.squashY = damp(this.squashY, 1, 14, dt);
    this.walkPhase += dt * (3 + Math.abs(this.vx) / 90);
    this.blink -= dt;
    if (this.blink < -0.14) this.blink = 2.4 + Math.random() * 3.2;

    for (const p of this.history) p.age = Math.min(1, p.age + dt * 1.9);
    this._histAcc += dt;
    if (this._histAcc >= 0.035) {
      this._histAcc = 0;
      const slot = this.history[this._histAt];
      slot.x = this.x + this.w / 2;
      slot.y = this.y + this.h * 0.6;
      slot.age = 0;
      this._histAt = (this._histAt + 1) % this.history.length;
    }
  }

  /**
   * Which side a climbable wall is on, or 0.
   *
   * A probe rather than a collision result: while clinging the sideways speed
   * is nearly nothing, so there is no push-out to read, and grip would flicker
   * on and off every other frame. Reaching a few pixels past the body each way
   * asks the question the player is actually asking — "is there ice here?"
   *
   * Only surfaces marked climbable count. Tunnel roofs and cliff faces stay
   * exactly as solid and exactly as ungrippable as they have always been, so
   * nothing in the first thirty-one levels changes underfoot.
   */
  _probeWall(solids) {
    const REACH = 4;
    const top = this.y + this.h * 0.15;
    const h = this.h * 0.7;
    // Mantling. Grip survives a little past the top of the wall, so a climb
    // can finish by pulling over the edge instead of stopping dead one body
    // length short of it. Without this every wall in the game would need a
    // ledge bolted to its side, and topping out — the most satisfying move in
    // climbing — would not exist.
    const MANTLE = this.h * 0.5;
    const right = this.x + this.w;
    for (const f of solids) {
      if (!f.solid || !f.climb) continue;
      if (top + h <= f.y - MANTLE || top >= f.y + f.h) continue;
      // The body has to be *against the face*, not merely overlapping the
      // block: a wide block would otherwise be grippable from inside it.
      if (right >= f.x - REACH && right <= f.x + REACH) {
        this.wallBlock = f;
        return 1;
      }
      if (this.x >= f.x + f.w - REACH && this.x <= f.x + f.w + REACH) {
        this.wallBlock = f;
        return -1;
      }
    }
    return 0;
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

      // Ledge assist.
      //
      // Coming up the side of a ledge and missing its lip by a few pixels used
      // to stop the jump dead against the wall of it — the penguin was a
      // finger's width short and got nothing. That is barely noticeable on a
      // shelf, where you approach platforms from the side at the same height,
      // and it is constant on a mountain, where every jump arrives at a ledge
      // from underneath and beside it.
      //
      // So a near miss on the way up is pulled onto the ledge instead. The
      // assist is a fraction of the penguin's own height, which makes it a few
      // percent of a jump: enough that "I made that" is never answered with
      // "no you didn't", small enough that it never reaches something the
      // level was not measured to give you.
      if (this.vy < 0 && overlapTop < this.h * 0.3 && f.type !== 'rock') {
        this.y = fb.y - this.h;
        this.vy = Math.min(this.vy, -40);
        box.y = this.y;
        continue;
      }
      // Which way the penguin was actually going, not which way it was
      // steering: walk into a wall on a tailwind and the wind is what has to
      // stop at it.
      const move = this.vx + this.drift;
      if (move > 0) this.x = fb.x - this.w;
      else if (move < 0) this.x = fb.x + fb.w;
      else continue;
      this.vx = 0;
      this.drift = 0;
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
        // Rising with the feet already level with the top of the block is a
        // pull-over, not a head-bump. Treating it as a bump teleports the
        // penguin to the *bottom* of whatever it was climbing — the whole
        // height of the wall, in one frame, at the exact moment the climb was
        // about to succeed.
        const overlapTop = box.y + box.h - fb.y;
        if (overlapTop < 10) {
          this.y = fb.y - this.h;
          this.vy = 0;
          this.onGround = true;
          this.groundFloe = f;
          events?.onStand?.(f);
        } else {
          // Bonked the underside.
          this.y = fb.y + fb.h;
          this.vy = 40;
        }
      }
      box.y = this.y;
    }
  }
}
