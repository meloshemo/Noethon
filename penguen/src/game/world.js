/**
 * The live world: builds a level definition into entities, steps the
 * simulation, and owns win/lose conditions and the camera.
 *
 * Rendering lives in render.js; screens and flow live in game.js. This file
 * is pure simulation so it stays easy to reason about.
 */

import { Floe, Hazard, Fish, Checkpoint } from './entities.js';
import { Player } from './player.js';
import { GhostRecorder, Ghost } from './ghost.js';
import {
  VIEW, VIEW_LIMITS, ASSIST, ICE, STORM, BOOST, ROT, REWARDS, AMBUSH, COLLAPSE, scaleForLevel, upgradeEffect,
} from './config.js';
import { WATER_Y } from './levels.js';
import { clamp, damp, rectsOverlap, rand } from '../core/util.js';

export class World {
  /**
   * @param {object} def level definition
   * @param {{particles:object, audio:object, assist:boolean}} deps
   */
  constructor(def, deps) {
    this.def = def;
    this.particles = deps.particles;
    this.audio = deps.audio;
    this.assist = deps.assist ?? false;

    this.worldW = def.worldW;
    // The level's own height, independent of the screen. On a tall phone the
    // viewport is much taller than this, and the difference is what gets
    // centred rather than dumped below the ice.
    this.worldH = def.worldH ?? VIEW_LIMITS.baseH;
    this.waterY = def.waterY ?? WATER_Y;

    // The band the camera is allowed to show: from the highest thing in the
    // level down to the sea, with enough sky above the top to jump into.
    const tops = [...(def.floes ?? []), ...(def.terrain ?? [])].map((f) => f.y);
    this.contentTop = Math.max(0, Math.min(...tops, this.waterY) - 170);
    this.contentBottom = Math.min(this.worldH, this.waterY + 60);
    this.fog = def.fog ?? 0;

    this.floes = (def.floes ?? []).map((d, i) => new Floe(d, i));
    /**
     * The continent: cliff faces, tunnel roofs, pillars. Solid to the physics
     * and permanent, so they are plain objects rather than Floes — nothing
     * about them ever changes, and the route checks must not see them as
     * places to land.
     */
    this.terrain = (def.terrain ?? []).map((d) => ({
      ...d,
      h: d.h ?? 20,
      type: 'rock',
      solid: true,
      dx: 0,
      dy: 0,
    }));
    /** What the player actually collides with. Built once; holds references. */
    this.solids = [...this.floes, ...this.terrain];
    this.zones = def.zones ?? [];
    /** Which penguin is being worn — the renderer reads it every frame. */
    this.skinId = deps.skin ?? 'normal';
    /** And what it leaves behind. */
    this.trailId = deps.trail ?? 'none';
    this.hazards = (def.hazards ?? []).map((d) => new Hazard(d));
    this.fish = (def.fish ?? []).map((d) => new Fish(d, 'normal'));
    /** Speed fish are scored separately, so the 3-fish star stays a 3-fish star. */
    this.boosts = (def.speedFish ?? []).map((d) => new Fish(d, 'speed'));
    /** Rotten fish: bait, never collectibles. */
    this.rotten = (def.rotFish ?? []).map((d) => new Fish(d, d.kind ?? 'heavy'));
    this.checkpoints = (def.checkpoints ?? []).map((d) => new Checkpoint(d));
    this.signs = def.signs ?? [];
    this.goal = { x: def.goal.x, y: def.goal.y, w: 54, h: 64, pulse: 0 };

    this.player = new Player();
    this.player.setScale(def.scale ?? scaleForLevel(def.id));

    // The run being recorded, and the run being raced. The ghost is the record
    // holder for this level — yours or a friend's, whichever is faster.
    this.recorder = new GhostRecorder();
    this.ghost = deps.ghost ? new Ghost(deps.ghost) : null;
    /** Seconds ahead of the ghost (positive) or behind it (negative). */
    this.ghostLead = null;

    // Shop upgrades. Levels are validated against base stats, so these only
    // ever make the penguin better — they never unlock anything.
    const owned = deps.upgrades ?? {};
    this.player.boost = {
      jump: upgradeEffect(owned, 'boots'),
      speed: upgradeEffect(owned, 'speed'),
      grip: upgradeEffect(owned, 'crampons'),
      wind: upgradeEffect(owned, 'vest'),
    };
    this.player.gear = {
      wings: owned.wings ?? 0,
      rocket: (owned.rocket ?? 0) > 0 ? owned.rocket : 0,
    };
    this.player.reset(def.spawn.x, def.spawn.y);
    /** Extra warning the bird radar buys, in seconds. */
    this.radar = upgradeEffect(owned, 'radar');
    this.magnetRange = upgradeEffect(owned, 'magnet');
    /** "Kalın Tüy" — one free save per attempt at the level. */
    this.shields = upgradeEffect(owned, 'down') ? 1 : 0;
    this.maxShields = this.shields;
    this.shieldFlash = 0;

    this.spawn = { ...def.spawn };
    this.respawn = { ...def.spawn };

    this.time = 0;
    this.elapsed = 0;
    this.deaths = 0;
    this.fishTaken = 0;
    this.status = 'playing'; // playing | dying | won
    this.deathTimer = 0;
    this.winTimer = 0;
    this.camera = { x: 0, y: 0, shake: 0, targetX: 0 };
    this.flash = 0;
    this.hint = null;
    this.hintTimer = 0;
    /** Counters the mission system reads after a run. */
    this.burstDodges = 0;
    this.orcaPasses = 0;
    /**
     * The skua. Not part of the level — a director event, so a course you have
     * memorised can still ambush you on the ninth run. null when there is no
     * bird in the sky.
     */
    this.skua = null;
    this.skuaCooldown = AMBUSH.grace;
    this.skuasDodged = 0;
    this.skuaGrabs = 0;
    /** Gear use, for the missions that ask how you played rather than what you survived. */
    this.glideTime = 0;
    this.rocketFires = 0;
    /** Seconds spent standing still — "finish without stopping" reads this. */
    this.stillTime = 0;
    /** Set by the game: ambushes only start once the player knows the game. */
    this.ambushes = (def.id ?? 1) >= AMBUSH.fromLevel || Boolean(def.daily) || Boolean(def.generated);
    /**
     * The serac that calves off the cliff as you reach the raft. Armed once per
     * attempt, on a coin flip, and only past the point where the level is
     * visibly nearly over — which is exactly where attention drops.
     */
    this.collapse = null;
    this.collapseArmed =
      ((def.id ?? 1) >= COLLAPSE.fromLevel || Boolean(def.daily) || Boolean(def.generated)) &&
      Math.random() < COLLAPSE.chance * (this.assist ? 0.45 : 1);
    this.boostsTaken = 0;
    /** Rotten fish swallowed this run — one of the daily objectives reads it. */
    this.rottenTaken = 0;
    this._orcaSeen = new Set();

    this.player.reset(this.spawn.x, this.spawn.y);
    this._centerCamera();
  }

  get assistMult() {
    return this.assist ? ASSIST.crackDelay : 1;
  }

  get tuning() {
    return { coyote: this.assist ? ASSIST.coyoteTime : 1 };
  }

  get hazardSpeed() {
    return this.assist ? ASSIST.hazardSpeed : 1;
  }

  /** Vertical camera bounds — negative on screens taller than the level. */
  /**
   * How far the camera may travel vertically.
   *
   * Clamped to the band that actually has something in it, not to the world
   * box. A world is 900 tall because a summit needs the room, but a level that
   * never leaves sea level fills only its bottom third — and on a tall phone,
   * where the view is nearly as tall as the world, clamping to the box put the
   * penguin at the bottom of the screen under six hundred pixels of empty sky.
   */
  get _camYRange() {
    const top = this.contentTop;
    const bottom = this.contentBottom;
    const slack = VIEW.h - (bottom - top);
    if (slack > 0) {
      // The view is taller than everything there is to see: centre it.
      const at = top - slack / 2;
      return { min: at, max: at };
    }
    return { min: top, max: bottom - VIEW.h };
  }

  _centerCamera() {
    const y = this._camYRange;
    this.camera.x = clamp(this.player.centerX - VIEW.w * 0.42, 0, Math.max(0, this.worldW - VIEW.w));
    this.camera.y = clamp(this.player.y - VIEW.h * 0.55, y.min, y.max);
  }

  /** Progress along the level, 0..1 — drives the HUD bar. */
  get progress() {
    return clamp((this.player.centerX - this.spawn.x) / Math.max(1, this.goal.x - this.spawn.x), 0, 1);
  }

  showHint(text, seconds = 2.6) {
    this.hint = text;
    this.hintTimer = seconds;
  }

  update(dt, intent) {
    this.time += dt;
    // Recording and the ghost both run on the same clock as the timer, so a
    // sample's index is its time on the clock — including the seconds lost to
    // deaths, which is exactly what the timer charges you for.
    if (this.status === 'playing') {
      this.elapsed += dt;
      this.recorder.sample(dt, this.player);
      if (this.ghost) {
        this.ghost.update(dt);
        this.ghostLead = this.ghost.leadAt(this.player.x);
      }
    }
    if (this.hintTimer > 0) this.hintTimer = Math.max(0, this.hintTimer - dt);

    const fx = {
      shatter: (floe) => {
        this.particles.burstIce(floe.x + floe.w / 2, floe.y + floe.h / 2, 14, floe.w / 2);
        this.audio.shatter();
        this.shake(4);
      },
    };
    if (this.shieldFlash > 0) this.shieldFlash = Math.max(0, this.shieldFlash - dt);

    for (const f of this.floes) f.update(dt, this.time, fx);
    for (const f of this.fish) f.update(dt);
    for (const f of this.boosts) f.update(dt);
    for (const f of this.rotten) f.update(dt);
    this._updateSkua(dt);
    this._updateCollapse(dt);
    for (const c of this.checkpoints) c.update(dt);
    for (const h of this.hazards) h.update(dt, this.time, this.player, this.hazardSpeed);
    this.goal.pulse = (this.goal.pulse + dt * 2) % (Math.PI * 2);

    if (this.status === 'dying') {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this._respawn();
      this._followCamera(dt);
      this.flash = Math.max(0, this.flash - dt * 2.5);
      return;
    }

    if (this.status === 'won') {
      this.winTimer += dt;
      this._followCamera(dt);
      return;
    }

    // Wind. A gust is a column you cross; a storm is a stretch of coast where
    // the wind is simply against you and you have to time the lulls.
    let push = 0;
    this.windPressure = 0;
    for (const h of this.hazards) {
      if (h.kind !== 'gust' && h.kind !== 'storm') continue;
      if (!rectsOverlap(this.player.box, h.box)) continue;
      const ground = h.kind === 'storm' ? STORM.groundFactor : 0.35;
      const raw = (h.strength ?? h.power ?? 0) * (this.player.onGround ? ground : 1);
      push += raw * (1 - this.player.boost.wind);
      if (h.kind === 'storm') this.windPressure = Math.max(this.windPressure, h.intensity ?? 0);
    }

    // "snap" ice decides to vanish while the player is still in the air, so it
    // has to be checked before the move, not after the landing.
    for (const f of this.floes) {
      if (!f.isSnap) continue;
      if (f.trySnap(this.player, this.assist)) {
        this.particles.burstIce(f.x + f.w / 2, f.y, 20, f.w / 2);
        this.audio.shatter();
        this.shake(6);
        this.showHint('Buz kaçtı!', 1.2);
      }
    }

    this.player.update(dt, { ...intent, push }, this.solids, this.tuning, {
      onJump: () => {
        this.audio.jump();
        this.particles.puff(this.player.centerX, this.player.y + this.player.h, 6, 0);
      },
      onLand: (impact, floe) => {
        this.audio.land();
        this.particles.puff(this.player.centerX, this.player.y + this.player.h, 4 + Math.round(impact * 8));
        if (impact > 0.55) this.shake(impact * 3);
        if (floe) this._touchFloe(floe);
      },
      onStand: (floe) => this._touchFloe(floe),
    });
    this._trackGear(dt);

    this._checkBursts();

    // Keep the player inside the level horizontally.
    this.player.x = clamp(this.player.x, 0, this.worldW - this.player.w);

    this._checkPickups();
    this._checkHazards();
    this._checkOrcaPasses();
    this._checkGoal();

    if (this.player.y > this.waterY - this.player.h * 0.35) this.die('water');

    this._followCamera(dt);
    this.flash = Math.max(0, this.flash - dt * 2.5);
  }

  _touchFloe(floe) {
    if (!floe.breakable && !floe.isBurst) return;
    if (floe.state !== 'idle') return;
    floe.touch(this.assistMult, () => {
      if (floe.isBurst) this.audio.hiss();
      else this.audio.crack();
      this.particles.puff(floe.x + floe.w / 2, floe.y, 4);
    });
  }

  /**
   * Geysers. Standing on one when it fires throws the penguin clear off the
   * ice — usually into the sea, which is the point. The half-second of hiss
   * and bulge beforehand is the whole fairness budget: react or fly.
   */
  _checkBursts() {
    for (const f of this.floes) {
      if (!f.isBurst || f.state !== 'erupting' || f._launched) continue;
      const column = { x: f.x, y: f.y - 190, w: f.w, h: 210 };
      if (!rectsOverlap(this.player.box, column)) {
        // Armed it, then got clear before it blew. That is the skill.
        if (f.touched) this.burstDodges++;
      } else {
        const dir = this.player.centerX < f.x + f.w / 2 ? -1 : 1;
        this.player.launch(
          this.player.vx * 0.4 + dir * ICE.burstSide,
          ICE.burstUp * (this.assist ? 0.72 : 1),
        );
        this.audio.burst();
        this.particles.splash(this.player.centerX, f.y);
        this.shake(9);
        this.showHint('Gayzer!', 1.1);
      }
      f._launched = true;
    }
    for (const f of this.floes) {
      if (f.isBurst && f.state !== 'erupting') f._launched = false;
    }
  }

  _checkPickups() {
    // Magnet: fish drift toward the penguin instead of needing a precise line.
    if (this.magnetRange > 0) {
      const px = this.player.centerX;
      const py = this.player.y + this.player.h / 2;
      // Deliberately excludes rotten fish: a magnet that pulls curses into you
      // would make a purchase actively harmful.
      for (const f of [...this.fish, ...this.boosts]) {
        if (f.taken) continue;
        const dx = px - (f.x + f.w / 2);
        const dy = py - (f.y + f.h / 2);
        const dist = Math.hypot(dx, dy);
        if (dist > this.magnetRange || dist < 1) continue;
        const pull = (1 - dist / this.magnetRange) * 520 * 0.016;
        f.x += (dx / dist) * pull;
        f.y += (dy / dist) * pull;
      }
    }

    for (const f of this.fish) {
      if (f.taken || !rectsOverlap(this.player.box, f.box)) continue;
      f.taken = true;
      f.pop = 1;
      this.fishTaken++;
      this.audio.fish();
      this.particles.sparkle(f.x + f.w / 2, f.y + f.h / 2);
    }

    for (const f of this.rotten) {
      if (f.taken || !rectsOverlap(this.player.box, f.box)) continue;
      f.taken = true;
      f.pop = 1;
      this.player.afflict(f.kind);
      this.rottenTaken++;
      this.audio.rot();
      this.particles.sparkle(f.x + f.w / 2, f.y + f.h / 2, '#7fbf4d');
      this.shake(3);
      this.showHint(ROT[f.kind]?.label ?? 'Fena bir şey yedin', 1.6);
    }

    for (const f of this.boosts) {
      if (f.taken || !rectsOverlap(this.player.box, f.box)) continue;
      f.taken = true;
      f.pop = 1;
      this.boostsTaken++;
      this.player.energise(BOOST.duration);
      this.audio.charge();
      this.particles.sparkle(f.x + f.w / 2, f.y + f.h / 2, '#ff3b48');
      this.particles.sparkle(f.x + f.w / 2, f.y + f.h / 2, '#ffd23f');
      this.shake(4);
      this.showHint('Hız enerjisi!', 1.4);
    }
    for (const c of this.checkpoints) {
      if (c.active || !rectsOverlap(this.player.box, c.box)) continue;
      c.active = true;
      c.pulse = 1;
      this.respawn = { x: c.x + c.w / 2, y: c.y };
      this.audio.checkpoint();
      this.particles.sparkle(c.x + c.w / 2, c.y - 20, '#7fe7ff');
      this.showHint('Kontrol noktası', 1.4);
    }
  }

  /** Counted once per orca, the first time the penguin gets past it. */
  _checkOrcaPasses() {
    for (const h of this.hazards) {
      if (h.kind !== 'orca' || this._orcaSeen.has(h)) continue;
      if (this.player.centerX > h.x + h.w + 20 && this.player.onGround) {
        this._orcaSeen.add(h);
        this.orcaPasses++;
      }
    }
  }

  _checkHazards() {
    for (const h of this.hazards) {
      if (!h.lethal) continue;
      if (h.kind === 'icicle' && h.state !== 'drop') continue;
      if (!rectsOverlap(this.player.box, h.box)) continue;

      // Stomping a seal from above is a jump, not a death — it rewards nerve.
      // The window is deliberately wide: "jump on it" is the intended answer,
      // so it must work when the player commits, not only when they're precise.
      if (h.kind === 'seal' && this.player.vy > 20 && this.player.y + this.player.h < h.y + h.h * 0.85) {
        this.player.vy = this.player.jumpVelocity * 0.8;
        this.particles.puff(h.x + h.w / 2, h.y, 10);
        this.audio.land();
        this.shake(2.5);
        h.reset();
        continue;
      }
      this.die(h.kind);
      return;
    }
  }

  _checkGoal() {
    // Generous on purpose: a fast player jumping in at head height used to sail
    // straight over a raft-sized box and land past the finish.
    const box = {
      x: this.goal.x - 52,
      y: this.goal.y - 168,
      w: 104,
      h: 200,
    };
    if (rectsOverlap(this.player.box, box)) return this.win();
    // Last resort — overshooting the raft still counts as escaping.
    if (this.player.onGround && this.player.centerX > this.goal.x + 52) this.win();
    return undefined;
  }

  die(cause = 'water') {
    if (this.status !== 'playing') return;

    // "Kalın Tüy": one save per attempt. It puts the penguin back on the last
    // safe ground rather than at the checkpoint, so it rescues a run without
    // erasing the mistake.
    if (this.shields > 0) {
      this.shields--;
      this.shieldFlash = 1;
      this.player.reset(this.respawn.x, this.respawn.y);
      this.particles.sparkle(this.player.centerX, this.player.y, '#9b8cff');
      this.audio.checkpoint();
      this.shake(4);
      this.showHint('Kalın tüy seni kurtardı', 1.6);
      return;
    }

    this.status = 'dying';
    this.deathTimer = 0.72;
    this.deaths++;
    this.flash = 0.8;
    this.shake(7);
    if (cause === 'water') {
      this.particles.splash(this.player.centerX, this.waterY);
      this.audio.splash();
    } else {
      this.particles.burstIce(this.player.centerX, this.player.y + this.player.h / 2, 16, 14);
      this.audio.shatter();
    }
    this.player.alive = false;
  }

  win() {
    if (this.status !== 'playing') return;
    this.status = 'won';
    this.winTimer = 0;
    this.audio.win();
    for (let i = 0; i < 3; i++) {
      this.particles.sparkle(this.goal.x + rand(30, -30), this.goal.y - 30 + rand(20, -20), '#ffd76a');
    }
  }

  _respawn() {
    this.status = 'playing';
    this.shields = this.maxShields;
    this.player.alive = true;
    this.player.reset(this.respawn.x, this.respawn.y);
    // Floes reset so a broken path never soft-locks the player after a death.
    for (const f of this.floes) f.reset();
    for (const h of this.hazards) h.reset();
    // Speed fish come back on a retry; the normal three stay taken so a death
    // never costs you collectibles you already earned this run.
    for (const f of this.boosts) f.reset();
    for (const f of this.rotten) f.reset();
    // A collapse that already happened does not happen twice on the same
    // attempt — the shock is the mechanic, and a repeat is just a wall.
    this.collapse = null;
    this.skua = null;
    this.skuaCooldown = AMBUSH.grace;
    this.boostsTaken = 0;
    this.rottenTaken = 0;
    this.particles.puff(this.respawn.x, this.respawn.y, 10);
    this._centerCamera();
  }

  shake(amount) {
    this.camera.shake = Math.min(14, this.camera.shake + amount);
  }

  _followCamera(dt) {
    // Look ahead in the direction of travel so fast runs still show the path.
    const lead = clamp(this.player.vx * 0.35, -110, 110);
    const targetX = clamp(this.player.centerX + lead - VIEW.w * 0.42, 0, Math.max(0, this.worldW - VIEW.w));
    const yr = this._camYRange;
    const targetY = clamp(this.player.y - VIEW.h * 0.55, yr.min, yr.max);
    this.camera.x = damp(this.camera.x, targetX, 7, dt);
    this.camera.y = damp(this.camera.y, targetY, 5, dt);
    this.camera.shake = damp(this.camera.shake, 0, 9, dt);
  }

  /**
   * Gear accounting.
   *
   * Must run *after* the player has stepped: `rocketFired` is set inside
   * `player.update`, so reading it at the top of the frame counts every burst
   * one frame late and drops the last one of a run entirely.
   */
  _trackGear(dt) {
    if (this.status !== 'playing') return;
    if (this.player.gliding) this.glideTime += dt;
    if (this.player.rocketFired) {
      this.rocketFires++;
      this.audio.rocket?.();
    }
    // Standing still on the ground. Airborne does not count: you cannot
    // exactly loiter mid-jump.
    if (this.player.onGround && Math.abs(this.player.vx) < 24) this.stillTime += dt;
  }

  /**
   * The skua.
   *
   * A big polar gull that takes chicks. It is a director event rather than a
   * placed hazard: it arrives at a moment the level did not choose, which is
   * the only way a course you have memorised can still frighten you.
   *
   * What keeps it from being cheap:
   *   — the strike point is locked when the shadow appears, so moving works;
   *   — the shadow is drawn on the ice under that point, not on the bird, so
   *     it is readable while you are busy doing something else;
   *   — never within `grace` of a spawn, and never twice inside the cooldown;
   *   — a grab costs you the checkpoint, not the level.
   */
  _updateSkua(dt) {
    if (!this.ambushes || this.status !== 'playing') return;

    if (!this.skua) {
      this.skuaCooldown -= dt;
      if (this.skuaCooldown > 0) return;
      // Assist mode halves the frequency rather than switching it off: the
      // point of easy mode is fewer surprises, not a different game.
      const rate = AMBUSH.rate * (this.assist ? 0.5 : 1);
      if (Math.random() > rate * dt) return;
      this._launchSkua();
      return;
    }

    const s = this.skua;
    s.t += dt;

    if (s.state === 'warn') {
      // Fly in along a straight line to the strike point.
      const k = clamp(s.t / s.warn, 0, 1);
      s.x = s.fromX + (s.targetX - s.fromX) * k;
      s.y = s.fromY + (s.targetY - s.fromY) * k * k;
      if (s.t >= s.warn) {
        s.state = 'strike';
        s.t = 0;
      }
      return;
    }

    if (s.state === 'strike') {
      // Through the strike point and out the other side.
      const k = clamp(s.t / AMBUSH.dive, 0, 1);
      s.x = s.targetX + s.dir * 240 * k;
      s.y = s.targetY - 120 * k * k + 40 * k;

      const box = { x: s.x - 26, y: s.y - 18, w: 52, h: 36 };
      if (!s.hit && this.player.alive && rectsOverlap(this.player.box, box)) {
        s.hit = true;
        s.state = 'carry';
        s.t = 0;
        this.skuaGrabs++;
        this.audio.screech?.();
        this.shake(7);
        this.player.alive = false;
      } else if (s.t >= AMBUSH.dive) {
        this.skuasDodged++;
        this.skua = null;
        this.skuaCooldown = AMBUSH.cooldown;
      }
      return;
    }

    if (s.state === 'carry') {
      // Carried off, then dropped — the death lands after the indignity.
      s.x += s.dir * 210 * dt;
      s.y -= 190 * dt;
      this.player.x = s.x - this.player.w / 2;
      this.player.y = s.y + 12;
      this.player.vx = 0;
      this.player.vy = 0;
      if (s.t >= AMBUSH.carry) {
        this.skua = null;
        this.skuaCooldown = AMBUSH.cooldown;
        this.die('skua');
      }
    }
  }

  /**
   * The collapse at the flag.
   *
   * Ice falls from above onto the approach, not onto the raft: what it smashes
   * is ground you still have to cross. A player who knows it is coming waits a
   * beat or runs early and never sees it again; a player who does not, loses a
   * level they had already spent.
   */
  _updateCollapse(dt) {
    if (this.status !== 'playing') return;

    if (!this.collapse) {
      if (!this.collapseArmed || this.progress < COLLAPSE.from) return;
      this.collapseArmed = false;
      const gx = this.goal.x;
      // Lands short of the raft, on the last stretch of ice.
      const x = gx - 120 - Math.random() * 90;
      const floor = this.floes
        .filter((f) => x > f.x - 30 && x < f.x + f.w + 30)
        .sort((a, b) => a.y - b.y)[0];
      this.collapse = {
        state: 'fall',
        t: 0,
        x,
        y: Math.max(this.contentTop - 60, (floor?.y ?? this.goal.y) - 420),
        landY: (floor?.y ?? this.goal.y) - 6,
        w: 74,
        vy: 0,
        floor,
      };
      this.audio.crack?.();
      this.shake(3);
      return;
    }

    const c = this.collapse;
    c.t += dt;

    if (c.state === 'fall') {
      // Falls fast enough to be frightening, slow enough that the shadow it
      // throws is a real warning rather than a formality.
      c.vy += 2400 * dt;
      c.y += c.vy * dt;
      const box = { x: c.x - c.w / 2, y: c.y - c.w, w: c.w, h: c.w };
      if (this.player.alive && rectsOverlap(this.player.box, box)) {
        this.shake(9);
        this.die('ice');
        return;
      }
      if (c.y >= c.landY) {
        c.y = c.landY;
        c.state = 'debris';
        c.t = 0;
        this.shake(10);
        this.flash = 0.5;
        this.audio.shatter();
        this.particles.burstIce(c.x, c.landY, 26, c.w);
        // What it smashes, it takes with it: the ice under the impact goes.
        if (c.floor && c.floor.type !== 'rock') {
          c.floor.state = 'cracking';
          c.floor.timer = 0.28;
        }
      }
      return;
    }

    // The debris is lethal while it settles, then it is scenery.
    if (c.state === 'debris') {
      const box = { x: c.x - c.w / 2, y: c.landY - c.w * 0.6, w: c.w, h: c.w * 0.6 };
      if (c.t < 0.5 && this.player.alive && rectsOverlap(this.player.box, box)) {
        this.die('ice');
        return;
      }
      if (c.t >= COLLAPSE.linger) this.collapse = null;
    }
  }

  _launchSkua() {
    const p = this.player;
    // Aim where the penguin is going, not where it is: a bird that dives at
    // your current position is dodged by simply continuing to walk.
    const warn = Math.max(0.34, AMBUSH.warn + (this.radar ?? 0)) * (this.assist ? 1.35 : 1);
    const lead = clamp(p.vx * warn * 0.8, -180, 180);
    const targetX = clamp(p.centerX + lead, this.spawn.x, this.worldW - 40);
    const targetY = p.y + p.h * 0.4;
    const dir = p.vx >= 0 ? 1 : -1;

    this.skua = {
      state: 'warn',
      t: 0,
      warn,
      dir,
      targetX,
      targetY,
      // Comes in high and behind, so it crosses the screen into the strike.
      fromX: targetX - dir * (VIEW.w * 0.62),
      fromY: Math.max(this.contentTop - 40, targetY - 340),
      x: 0,
      y: 0,
      hit: false,
    };
    this.audio.screech?.();
  }

  /** The attempt as recorded, ready to be encoded into a share code. */
  get run() {
    return { samples: this.recorder.samples, time: this.elapsed };
  }

  /** Coins the speed fish are worth this run. */
  get boostCoins() {
    return this.boostsTaken * REWARDS.perBoost;
  }

  /** Star rating for the run that just finished. */
  rate() {
    let stars = 1;
    if (this.fishTaken >= this.fish.length && this.fish.length > 0) stars++;
    if (this.elapsed <= (this.def.target ?? 40)) stars++;
    return stars;
  }
}
