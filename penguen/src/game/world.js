/**
 * The live world: builds a level definition into entities, steps the
 * simulation, and owns win/lose conditions and the camera.
 *
 * Rendering lives in render.js; screens and flow live in game.js. This file
 * is pure simulation so it stays easy to reason about.
 */

import { t, loc } from '../core/i18n.js';
import { Floe, Hazard, Fish, Checkpoint, Rival, Snowball } from './entities.js';
import { Player } from './player.js';
import { GhostRecorder, Ghost } from './ghost.js';
import {
  VIEW, VIEW_LIMITS, ASSIST, ICE, STORM, WIND, SWIM, BRAWL, BOOST, CHARGED, ROT, REWARDS, AMBUSH, COLLAPSE, HUSH,
  hushAt, glazeAt, trenchDrainAt, scaleForLevel, upgradeEffect, hazardPhase, ventAt, VENT,
} from './config.js';
import { WATER_Y } from './levels.js';
import { getSkin } from './skins.js';
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
    /**
     * Which way "forward" is. 'across' is the shelf — the game as it has always
     * been. 'up' is a mountain: progress, the camera, the finish check and the
     * ghost comparison all read height instead of distance. 'dive' is the sea.
     *
     * Read this early: the camera band below is the first thing that asks, and
     * setting it forty lines further down meant every underwater level spent
     * its first frame — and therefore its whole camera range — believing it was
     * a shelf.
     */
    this.axis = def.axis ?? 'across';
    /**
     * Under the ice. The level is water from the surface down, so the sea is
     * not the thing that kills you any more — the clock on your lungs is.
     */
    this.diving = this.axis === 'dive';

    // The band the camera is allowed to show: from the highest thing in the
    // level down to the sea, with enough sky above the top to jump into.
    if (this.axis === 'dive') {
      // Under the ice the level *is* the water column: the surface is the top
      // of the world and the seabed is the bottom, both of them hard limits
      // the penguin can touch. Deriving the band from the highest slab instead
      // reaches up into the ice cap the holes are cut through, and the camera
      // spends the level looking at a ceiling with the penguin off the bottom
      // of the screen.
      this.contentTop = -40;
      this.contentBottom = this.worldH;
    } else {
      const tops = [...(def.floes ?? []), ...(def.terrain ?? [])].map((f) => f.y);
      this.contentTop = Math.max(0, Math.min(...tops, this.waterY) - 170);
      this.contentBottom = Math.min(this.worldH, this.waterY + 60);
    }
    this.fog = def.fog ?? 0;
    /**
     * Holes in the ice. Swim your head into one and you breathe. They are the
     * only checkpoints the chapter has that matter, and they are placed by the
     * composer inside a lungful of each other.
     */
    this.airHoles = (def.air ?? []).map((a) => ({ ...a, glow: 0 }));
    /**
     * The snowball fight. Rival penguins that throw, and what they have thrown.
     *
     * A brawl level is an ordinary shelf level in every other respect — same
     * axis, same camera, same ice — because the chapter's idea is not a new
     * kind of world, it is a new kind of question asked inside the old one.
     */
    this.brawl = Boolean(def.brawl);
    this.rivals = (def.rivals ?? []).map((d) => new Rival(d));
    this.snowballs = [];

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
    /**
     * Snow banks: cover the other side shoots away. See `BANK`.
     *
     * Loose snow, not ice. A snowball buries itself in one; a penguin bellies
     * through it. That is not a softening — it is what keeps the promise the
     * mechanic is built on, that a bank can only ever *give* the player time.
     * Made solid, it was also a wall: it stood between two stand-spots on a
     * level where the walk between them is already timed to the dodge window,
     * and the arena went from winnable to not because somebody added cover.
     */
    this.banks = (def.banks ?? []).map((d) => ({
      ...d,
      type: 'bank',
      bank: true,
      gone: false,
      left: d.hits ?? 3,
      hit: 0,
    }));
    /** What the player actually collides with. Built once; holds references. */
    this.solids = [...this.floes, ...this.terrain];
    this.zones = def.zones ?? [];
    /**
     * Cracks in the seabed that breathe. Air, but only when it is blowing.
     * See `VENT` — this is the chapter's only clock.
     */
    this.vents = (def.vents ?? []).map((v) => ({ ...v, blow: 0 }));
    /** Which penguin is being worn — the renderer reads it every frame. */
    this.skinId = deps.skin ?? 'normal';
    /** And what it leaves behind. */
    this.trailId = deps.trail ?? 'none';
    // `phase` first, so a level that names one still wins. See `hazardPhase`:
    // this used to be a die roll inside the Hazard, which meant every solver
    // attempt was played against a different level.
    this.hazards = (def.hazards ?? []).map((d, i, all) => new Hazard({
      phase: hazardPhase(def.id ?? 0, i, all.length),
      ...d,
    }));
    this.fish = (def.fish ?? []).map((d) => new Fish(d, 'normal'));
    /** Speed fish are scored separately, so the 3-fish star stays a 3-fish star. */
    this.boosts = (def.speedFish ?? []).map((d) => new Fish(d, 'speed'));
    /** Rotten fish: bait, never collectibles. */
    this.rotten = (def.rotFish ?? []).map((d) => new Fish(d, d.kind ?? 'heavy'));
    /**
     * The charged fish: coil, quantum, slack.
     *
     * Scored apart from everything else for the same reason the speed fish is:
     * the three-fish star has to stay a three-fish star, and a level that
     * offers a blink must not quietly make its own collectible harder to get.
     *
     * None of them is ever on the running line. Every level in this game is
     * proved crossable by a penguin that owns nothing and picks up nothing,
     * and a fish that sat on the route would turn that proof into a lie.
     */
    this.charged = (def.chargedFish ?? []).map((d) => new Fish(d, d.kind ?? 'coil'));
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

    // Shop upgrades, plus whatever the worn penguin brings. Levels are
    // validated against a penguin with neither, so both can only ever make a
    // course easier — never unlock one.
    const owned = deps.upgrades ?? {};
    const perk = getSkin(this.skinId).perk ?? {};
    this.player.boost = {
      jump: upgradeEffect(owned, 'boots') + (perk.jump ?? 0),
      speed: upgradeEffect(owned, 'speed') + (perk.speed ?? 0),
      // Grip is a fraction toward "not slippery", so it is capped rather than
      // summed past 1 — a penguin that cannot slide at all is a different game.
      grip: Math.min(0.92, upgradeEffect(owned, 'crampons') + (perk.grip ?? 0)),
      wind: upgradeEffect(owned, 'vest'),
    };
    this.player.gear = {
      wings: owned.wings ?? 0,
      rocket: (owned.rocket ?? 0) > 0 ? owned.rocket : 0,
    };
    /** Extra glide seconds the worn penguin adds on top of the wings. */
    this.player.glideBonus = perk.glide ?? 0;
    this.player.reset(def.spawn.x, def.spawn.y);
    /** Extra warning the bird radar buys, in seconds. */
    this.radar = upgradeEffect(owned, 'radar') + (perk.radar ?? 0);
    this.magnetRange = upgradeEffect(owned, 'magnet') + (perk.magnet ?? 0);
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
    /**
     * Birds in the air. At most two, and only ever one of them holding you.
     *
     * A list rather than a single bird, because a pair is the whole point of
     * the late shelf: one dive is a question about your reflexes and two
     * arriving a beat apart from opposite sides is a question about where you
     * chose to be standing.
     */
    this.skuas = [];
    this.skuaCooldown = AMBUSH.grace;
    /** How fast the lungs are emptying, as a multiple. 1 outside a trench. */
    this.drain = 1;
    /** Gravity multiplier from a hush pocket this frame, or 0 for none. */
    this.hushed = 0;
    this._wasHushed = false;
    /**
     * Which of this level's mechanics have introduced themselves.
     *
     * Once each, per attempt, at the moment the thing first happens to you.
     * Four mechanics were added and only one of them ever said anything — and
     * the worst of the silent three was the trench, whose entire effect is
     * that your air runs out faster with nothing on screen saying why. A
     * player does not learn from that, they just die.
     *
     * A set rather than a flag each, so the fifth mechanic is one word.
     */
    this._told = new Set();
    this.skuasDodged = 0;
    this.skuaGrabs = 0;
    /** Grabs the chick fought its way out of. A daily mission asks for one. */
    this.skuasEscaped = 0;
    /** Gear use, for the missions that ask how you played rather than what you survived. */
    this.glideTime = 0;
    this.rocketFires = 0;
    /** Seconds spent standing still — "finish without stopping" reads this. */
    this.stillTime = 0;
    /** Set by the game: ambushes only start once the player knows the game. */
    // The skua hunts over open ice. Inside a shaft there is nowhere for it to
    // dive from and nowhere for the player to dodge to, so the mountain gets
    // its own ambushes — falling seracs — rather than this one.
    this.ambushes =
      this.axis === 'across' &&
      !this.brawl &&
      ((def.id ?? 1) >= AMBUSH.fromLevel || Boolean(def.daily) || Boolean(def.generated));
    /**
     * The serac that calves off the cliff as you reach the raft. Armed once per
     * attempt, on a coin flip, and only past the point where the level is
     * visibly nearly over — which is exactly where attention drops.
     */
    this.collapse = null;
    this.collapseArmed =
      this.axis === 'across' &&
      !this.brawl &&
      ((def.id ?? 1) >= COLLAPSE.fromLevel || Boolean(def.daily) || Boolean(def.generated)) &&
      Math.random() < COLLAPSE.chance * (this.assist ? 0.45 : 1);
    this.boostsTaken = 0;
    /** Charged fish swallowed this run, so a mission can ask for one. */
    this.chargedTaken = 0;
    /**
     * And what they were worth.
     *
     * Summed as they are eaten rather than counted at the end, because the
     * three are not worth the same: the coil is the cheapest of them and the
     * blink is the one people will cross a level for.
     */
    this.chargedValue = 0;
    /** Rotten fish swallowed this run — one of the daily objectives reads it. */
    this.rottenTaken = 0;
    /** Kicks off an ice wall, so missions can ask for them. */
    this.wallKicks = 0;
    /** Seconds spent hanging on ice — the climbing counterpart of glide time. */
    this.clingTime = 0;
    /** Rivals knocked out with somebody else's snowball. */
    this.brawlKnockouts = 0;
    this._orcaSeen = new Set();

    this._submerge();
    this._centerCamera();
  }

  /**
   * Put the penguin back in the water with full lungs.
   *
   * Called from every reset there is — spawn, respawn, checkpoint — because a
   * penguin that respawns holding the breath it drowned with respawns to drown
   * again, which is not a hard level, it is a broken one.
   */
  _submerge() {
    this.player.reset(this.respawn.x, this.respawn.y);
    this.player.submerged = this.diving;
    this.player.breath = this.player.breathMax;
  }

  get assistMult() {
    return this.assist ? ASSIST.crackDelay : 1;
  }

  get tuning() {
    return { coyote: this.assist ? ASSIST.coyoteTime : 1 };
  }

  /**
   * How fast the level's hazards run, as a multiple.
   *
   * The chapter's own difficulty dials turned out to be at their ceiling. On
   * the shelf, `tight` widens gaps until the widest one is exactly what a
   * running jump clears, and level thirty-one has been sitting on that edge
   * for a while — push it a further five percent and the composer produces a
   * gap the penguin physically cannot cross, which is not a hard level, it is
   * a broken one.
   *
   * So the last third of the chapter gets harder a different way. `menace`
   * speeds up everything that moves: seals patrol faster, icicles fall sooner,
   * whales surface on a shorter clock. None of that touches a single distance,
   * so every geometric proof in `tests/` stays exactly as true as it was, and
   * the levels stop being about whether you *can* make the jump and start
   * being about whether you can make it *now*.
   *
   * Assist still wins over it, because the point of easy mode is fewer things
   * happening at once and a menace dial that survived it would be a lie.
   */
  get hazardSpeed() {
    if (this.assist) return ASSIST.hazardSpeed;
    return this.def.menace ?? 1;
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
    // The interface stands on the top and bottom of the view, so the band the
    // camera may show reaches that far past the level in both directions —
    // otherwise, at the ends of a level, the camera runs out of world to
    // scroll and parks the penguin underneath a chip or a pad.
    const top = this.contentTop - VIEW.padTop;
    const bottom = this.contentBottom + VIEW.padBottom;
    const slack = VIEW.h - (bottom - top);
    if (slack > 0) {
      // The view is taller than everything there is to see: centre it.
      const at = top - slack / 2;
      return { min: at, max: at };
    }
    return { min: top, max: bottom - VIEW.h };
  }

  /**
   * How far the camera may travel sideways.
   *
   * A mountain is narrower than the screen, so there is nothing to scroll to —
   * and clamping to [0, worldW - VIEW.w] pins it at zero, which draws the whole
   * climb hard against the left edge with a third of the screen empty. Same
   * treatment the vertical range already gets: when the view is wider than the
   * level, centre the level instead of scrolling it.
   */
  get _camXRange() {
    const slack = VIEW.w - this.worldW;
    if (slack > 0) {
      const at = -slack / 2;
      return { min: at, max: at };
    }
    return { min: 0, max: this.worldW - VIEW.w };
  }

  _centerCamera() {
    const up = this.axis === 'up';
    const x = this._camXRange;
    const y = this._camYRange;
    this.camera.x = clamp(this.player.centerX - VIEW.w * (up ? 0.5 : 0.42), x.min, x.max);
    this.camera.y = clamp(this.player.y - VIEW.h * (up ? 0.64 : this.diving ? 0.5 : 0.55), y.min, y.max);
  }

  /** Progress along the level, 0..1 — drives the HUD bar. */
  get progress() {
    // In an arena, "how far along" is not a distance. You spend the level
    // walking back and forth on purpose, and a bar that swings with you says
    // nothing. What is actually progressing is how many guards are left.
    if (this.brawl) {
      const guards = this.rivals.filter((r) => r.guard);
      if (guards.length) {
        const down = guards.filter((r) => r.out).length;
        const walk = clamp(
          (this.player.centerX - this.spawn.x) / Math.max(1, this.goal.x - this.spawn.x),
          0,
          1,
        );
        return clamp((down + walk * 0.35) / (guards.length + 0.35), 0, 1);
      }
    }
    if (this.axis === 'up') {
      return clamp((this.spawn.y - this.player.y) / Math.max(1, this.spawn.y - this.goal.y), 0, 1);
    }
    return clamp((this.player.centerX - this.spawn.x) / Math.max(1, this.goal.x - this.spawn.x), 0, 1);
  }

  /** Height climbed, in the metres the HUD shows on a mountain. */
  get metresClimbed() {
    return Math.max(0, Math.round((this.spawn.y - this.player.y) / 12));
  }

  showHint(text, seconds = 2.6) {
    this.hint = text;
    this.hintTimer = seconds;
  }

  /**
   * Say a thing once per attempt, the first time it happens.
   *
   * Not at the start of the level and not on a sign by the door: at the moment
   * the mechanic first does something to the player, which is the only moment
   * the sentence means anything. Said on every occurrence it would be nagging;
   * said never, three of these mechanics were invisible.
   */
  _tell(key, text, seconds = 1.8) {
    if (this._told.has(key)) return;
    this._told.add(key);
    this.showHint(text, seconds);
  }

  update(dt, intent) {
    /**
     * Slack time.
     *
     * The penguin runs on `dt`; everything it has to dodge runs on `wdt`. When
     * no slack fish is working the two are the same number and this costs
     * nothing — `worldRate` is 1, so `dt * 1` is `dt` down to the last bit, and
     * every solver and validator in `tests/` sees exactly the clock it always
     * saw. That equality is not an optimisation, it is the safety property:
     * the proofs of passability are run by a penguin that picks nothing up.
     */
    const rate = this.player.worldRate;
    const wdt = dt * rate;
    this.time += wdt;
    // Recording and the ghost both run on the same clock as the timer, so a
    // sample's index is its time on the clock — including the seconds lost to
    // deaths, which is exactly what the timer charges you for.
    if (this.status === 'playing') {
      this.elapsed += dt;
      this.recorder.sample(dt, this.player);
      if (this.ghost) {
        this.ghost.update(dt);
        this.ghostLead = this.ghost.leadAt(this.player.x, this.player.y, this.axis);
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
    for (const b of this.banks) if (b.hit > 0) b.hit = Math.max(0, b.hit - dt * 3);

    for (const f of this.floes) {
      f.update(wdt, this.time, fx);
      // Standing on a slab that hangs on a rope, the first time. What needs
      // saying is not that it moves — that is visible — but that it *stops*,
      // because waiting for the end is the move and rushing the middle is how
      // it throws you.
      if (f.type === 'swing' && this.player.groundFloe === f) {
        this._tell('swing', t('world.swing'), 2);
      }
    }
    for (const f of this.fish) f.update(dt);
    for (const f of this.boosts) f.update(dt);
    for (const f of this.charged) f.update(dt);
    for (const f of this.rotten) f.update(dt);
    this._updateSkua(wdt, intent);
    this._updateCollapse(wdt);
    for (const c of this.checkpoints) c.update(dt);
    for (const h of this.hazards) h.update(wdt, this.time, this.player, this.hazardSpeed);
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
    let lift = 0;
    this.windPressure = 0;
    this.windSigned = 0;
    this.windTail = false;
    this.windZone = false;
    this.windCycle = 0;
    for (const h of this.hazards) {
      if (h.kind !== 'gust' && h.kind !== 'storm') continue;
      if (!rectsOverlap(this.player.box, h.box)) continue;

      if (h.kind === 'gust') {
        // A column of rising air. It only lifts what is inside it, and it does
        // nothing to a penguin standing on ice — you have to be off the ground
        // to be carried, which is what makes it a jump extender rather than a
        // lift.
        if (!this.player.onGround) lift += h.lift ?? 0;
        this.windPressure = Math.max(this.windPressure, h.intensity ?? 0);
        continue;
      }

      // Standing still digs the claws in. The counterplay to a headwind is to
      // stop and let it pass, and it costs the one thing this game charges for
      // everywhere else: time.
      const still = this.player.onGround && Math.abs(intent.axis ?? 0) < 0.01;
      const factor = this.player.onGround ? (still ? WIND.dugIn : WIND.ground) : 1;
      push += (h.strength ?? 0) * factor * (1 - this.player.boost.wind);
      this.windZone = true;
      if (Math.abs(h.signed ?? 0) >= this.windPressure) {
        this.windPressure = Math.abs(h.signed ?? 0);
        this.windSigned = (h.signed ?? 0) * (h.dir ?? 1);
        this.windTail = Boolean(h.tail);
        this.windCycle = h.cycle ?? 0;
      }
    }

    /**
     * The hush.
     *
     * A hollow of still, dense air where gravity runs at well under half. It
     * is read here, once, and handed to the player as a single multiplier,
     * because the player has no business knowing what a zone is — it knows how
     * to fall, and this tells it how hard.
     *
     * Tested against the middle of the body rather than the whole box on
     * purpose. Overlap would flick the pocket on the instant a wingtip crossed
     * the line and off again a frame later, and a gravity that stutters at the
     * boundary is far worse than one that switches a body-width late: the
     * player would be aiming a jump with two different physics in it.
     */
    const g = hushAt(this.zones, this.player.centerX, this.player.y + this.player.h / 2);
    this.hushed = g < 1 ? g : 0;
    if (this.hushed && !this._wasHushed) {
      this.audio.hush?.();
      // Once per level, not once per entry. Told again on every crossing it
      // would be nagging, and the whole point of the pocket is that it teaches
      // itself the moment the first jump goes twice as far as it should.
      this._tell('hush', t('world.hush'), 1.8);
    }
    this._wasHushed = Boolean(this.hushed);

    // Currents. A band of moving water, and the only reason the sea has a wind
    // system at all — but it is not wind: it pushes a *swimmer*, so there is no
    // ground factor and the down parka does nothing about it. You do not shrug
    // off the ocean, you swim across it.
    if (this.diving) {
      for (const z of this.zones) {
        if (z.kind !== 'current') continue;
        if (!rectsOverlap(this.player.box, z)) continue;
        push += z.power ?? 0;
      }
    }

    // "snap" ice decides to vanish while the player is still in the air, so it
    // has to be checked before the move, not after the landing.
    for (const f of this.floes) {
      if (!f.isSnap) continue;
      if (f.trySnap(this.player, this.assist)) {
        this.particles.burstIce(f.x + f.w / 2, f.y, 20, f.w / 2);
        this.audio.shatter();
        this.shake(6);
        this.showHint(t('world.iceGone'), 1.2);
      }
    }

    // Glare ice, read at the hands rather than at the feet: what decides
    // whether a grip lands is where the grip would be.
    const grip = glazeAt(this.zones, this.player.centerX, this.player.y + this.player.h * 0.4) ? 0 : 1;
    if (!grip) this._tell('glaze', t('world.glaze'), 2);
    this.player.update(dt, { ...intent, push, lift, grip, gravity: this.hushed || 1 }, this.solids, this.tuning, {
      onJump: (wound) => {
        if (wound) {
          this.audio.uncoil?.();
          this.particles.burstIce(this.player.centerX, this.player.y + this.player.h, 14, 16);
          this.shake(5);
        } else {
          this.audio.jump();
        }
        this.particles.puff(this.player.centerX, this.player.y + this.player.h, wound ? 12 : 6, 0);
      },
      onBlink: () => {
        this.audio.blink?.();
        this.particles.sparkle(this.player.centerX, this.player.y + this.player.h / 2, CHARGED.quantum.tint);
      },
      onLand: (impact, floe) => {
        this.audio.land();
        this.particles.puff(this.player.centerX, this.player.y + this.player.h, 4 + Math.round(impact * 8));
        if (impact > 0.55) this.shake(impact * 3);
        if (floe) this._touchFloe(floe);
      },
      onStand: (floe) => this._touchFloe(floe),
      onWallJump: (side) => {
        this.audio.jump();
        this.wallKicks++;
        this.particles.burstIce(
          this.player.x + (side > 0 ? this.player.w : 0),
          this.player.y + this.player.h * 0.5,
          7,
          10,
        );
      },
      onSlip: () => {
        // The bar emptying is the one thing in the climb that has to be
        // unmissable, because the penguin will look fine for another half
        // second while it falls.
        this.audio.crack();
        this.particles.puff(this.player.centerX, this.player.y + this.player.h * 0.4, 8);
        this.showHint(t('world.noGrip'), 1.1);
      },
    });
    this._trackGear(dt);

    this._checkBursts();

    // Keep the player inside the level horizontally.
    this.player.x = clamp(this.player.x, 0, this.worldW - this.player.w);

    this._checkPickups();
    this._checkHazards();
    this._checkOrcaPasses();
    this._checkGoal();

    if (this.brawl) this._brawl(dt);

    if (this.diving) this._breathe(dt);
    else if (this.player.y > this.waterY - this.player.h * 0.35) this.die('water');

    this._followCamera(dt);
    this.flash = Math.max(0, this.flash - dt * 2.5);
  }

  /**
   * The snowball fight.
   *
   * Everything here is one rule applied three times: a snowball stops at the
   * first thing it touches. Which thing that is decides whether the throw was
   * a threat, a tool or a waste — and the player decides which, by standing
   * somewhere, which is the only move the chapter gives them.
   */
  _brawl(dt) {
    if (this.status !== 'playing') return;
    const speed = this.assist ? ASSIST.hazardSpeed : 1;

    for (const r of this.rivals) {
      const shot = r.update(dt, this.player, speed);
      if (!shot) continue;
      this.snowballs.push(new Snowball(r.hand, shot, r.lobs));
      // The first arc. Its whole point is that the answer the player has been
      // using for four levels — get behind something — has just stopped
      // working, and being told that once is the difference between a new idea
      // and an unfair one.
      if (r.lobs) this._tell('lob', t('world.lob'), 2.2);
      this.audio.jump?.();
      this.particles.puff(r.hand.x, r.hand.y, 4);
    }

    for (let i = this.snowballs.length - 1; i >= 0; i--) {
      const b = this.snowballs[i];
      // Stepped in slices, because a ball crossing five hundred pixels a second
      // steps eight pixels a frame — enough to pass clean through a penguin at
      // sixty hertz and out the other side, which would make a perfectly aimed
      // shot fail at random.
      const slices = 4;
      let stopped = false;
      for (let k = 0; k < slices && !stopped; k++) {
        b.update((dt * speed) / slices);
        const box = b.box;

        for (const r of this.rivals) {
          if (r.out) continue;
          // Never its own thrower: the ball starts inside that penguin's hand.
          if (Math.hypot(r.hand.x - b.origin.x, r.hand.y - b.origin.y) < 2) continue;
          if (!rectsOverlap(box, r.box)) continue;
          r.knockOut();
          this.brawlKnockouts++;
          this.particles.puff(r.x + r.w / 2, r.y + r.h / 2, 16);
          this.audio.shatter();
          this.shake(4);
          if (this.rivals.every((o) => !o.guard || o.out)) {
            this.showHint(t('world.wayOpen'), 1.6);
            this.audio.checkpoint();
          }
          stopped = true;
          break;
        }
        if (stopped) break;

        if (rectsOverlap(box, this.player.box)) {
          this.particles.puff(b.x, b.y, 10);
          this.die('snowball');
          return;
        }

        // A bank eats the shot and is a little less of a bank for it. The
        // cover on this level is being taken down by the people using it
        // against you, which is the only clock this chapter has.
        for (const f of this.banks) {
          if (f.gone || !rectsOverlap(box, f)) continue;
          f.left--;
          f.hit = 1;
          this.shake(3);
          this.particles.burstIce(b.x, b.y, 10, 12);
          if (f.left <= 0) {
            f.gone = true;
            this.particles.burstIce(f.x + f.w / 2, f.y + f.h / 2, 20, f.w / 2);
            this.audio.shatter();
            this._tell('bank', t('world.bank'), 2);
          }
          stopped = true;
          break;
        }
        if (stopped) break;

        for (const f of this.solids) {
          if (f.state === 'gone' || f.state === 'melted') continue;
          if (!rectsOverlap(box, f.box ?? f)) continue;
          this.particles.puff(b.x, b.y, 7);
          stopped = true;
          break;
        }
        if (b.dead) stopped = true;
      }
      if (stopped || b.dead) this.snowballs.splice(i, 1);
    }
  }

  /** True while the way out is still being guarded. */
  get exitLocked() {
    return this.brawl && this.rivals.some((r) => r.guard && !r.out);
  }

  /**
   * The lungs.
   *
   * The only clock in the chapter, and the only thing that kills you on its
   * own. It runs whether you are moving or not, which is what makes hesitating
   * expensive — the mountain punished you for hurrying, the sea punishes you
   * for dithering, and that is the point of putting them next to each other.
   *
   * A hole in the ice refills it fast enough that a breath is a beat and not a
   * wait: about a second and a half from empty, so you dip in, gasp and go.
   */
  _breathe(dt) {
    if (this.status !== 'playing') return;
    const p = this.player;
    const head = { x: p.x, y: p.y, w: p.w, h: p.h * 0.45 };
    let inAir = false;
    for (const hole of this.airHoles) {
      hole.glow = Math.max(0, hole.glow - dt * 2);
      if (!rectsOverlap(head, hole)) continue;
      inAir = true;
      hole.glow = 1;
    }
    /*
     * A vent gives air the way a hole does, and takes a clock to do it.
     *
     * Deliberately the same branch as the ice: once you are breathing, the
     * game should not care which of the two you found. What differs is that
     * this one is only there part of the time, and that difference is the
     * whole point of it — so the column's strength is read from the shared
     * `ventAt`, the same curve the renderer draws and the validator prices.
     */
    let ventFill = 0;
    for (const v of this.vents) {
      v.blow = ventAt(v.period, v.phase, this.time);
      if (!rectsOverlap(head, v)) continue;
      // Said the first time a player is standing in a silent column, which is
      // the exact moment the mechanic looks broken: you have swum down to the
      // air and there is no air. One line, once, and never again.
      this._tell('vent', t('world.vent'), 2.2);
      if (v.blow <= 0.02) continue;
      inAir = true;
      ventFill = Math.max(ventFill, v.blow);
    }
    p.breathing = inAir;
    /**
     * Worked out before the early return, not after it.
     *
     * This used to sit below the `inAir` branch, so surfacing inside a hole
     * left `drain` holding whatever the last underwater frame had put there,
     * and the breath meter kept its cold outline while the lungs refilled. A
     * readout that says "this is costing you double" at the one moment nothing
     * is costing anything is worse than no readout: the player learns to
     * distrust the only instrument they have down here.
     */
    this.drain = inAir ? 1 : trenchDrainAt(this.zones, p.centerX, p.y + p.h / 2);
    // The trench is the one that has to speak. Everything else the sea does is
    // visible: a wall, a seal, a current you can feel pushing. This is a number
    // changing, and a number changing in silence is not a mechanic, it is an
    // unexplained death.
    if (this.drain > 1.15) this._tell('trench', t('world.trench'), 2);
    if (inAir) {
      const before = p.breath;
      // A crack in a rock is a thinner gasp than a hole in the ice, and it
      // fades at both ends of a blow rather than switching on.
      const rate = ventFill > 0 ? SWIM.refill * VENT.rate * ventFill : SWIM.refill;
      p.breath = Math.min(p.breathMax, p.breath + rate * dt);
      // One bubble-burst per gasp, at the moment the lungs actually fill,
      // rather than a stream the whole time a player idles in a hole.
      if (before < p.breathMax * 0.999 && p.breath >= p.breathMax * 0.999) {
        this.particles.puff(p.centerX, p.y, 8);
        this.audio.pickup?.();
      }
      return;
    }
    // Cold black water costs more air than the same distance of open sea,
    // scaled by how far below the trench lip the body is.
    p.breath -= dt * this.drain;
    if (p.breath <= 0) {
      p.breath = 0;
      this.die('breath');
    }
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
      for (const f of [...this.fish, ...this.boosts, ...this.charged]) {
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
      this.showHint(loc(ROT[f.kind], 'label') || t('world.badFish'), 1.6);
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
      this.showHint(t('world.boost'), 1.4);
    }
    for (const f of this.charged) {
      if (f.taken || !rectsOverlap(this.player.box, f.box)) continue;
      f.taken = true;
      f.pop = 1;
      this.chargedTaken++;
      this.player.chargeFish(f.kind);
      this.chargedValue += CHARGED[f.kind]?.reward ?? 0;
      const spec = CHARGED[f.kind];
      this.audio.chargedFish?.();
      this.particles.sparkle(f.x + f.w / 2, f.y + f.h / 2, spec?.tint ?? '#8ad7ff');
      this.particles.sparkle(f.x + f.w / 2, f.y + f.h / 2, '#ffffff');
      this.shake(4);
      this.showHint(loc(spec, 'label') || t('world.boost'), 1.5);
    }

    for (const c of this.checkpoints) {
      if (c.active || !rectsOverlap(this.player.box, c.box)) continue;
      c.active = true;
      c.pulse = 1;
      this.respawn = { x: c.x + c.w / 2, y: c.y };
      this.audio.checkpoint();
      this.particles.sparkle(c.x + c.w / 2, c.y - 20, '#7fe7ff');
      this.showHint(t('world.checkpoint'), 1.4);
      // A checkpoint is exactly the position worth keeping if the phone dies.
      this.onCheckpoint?.();
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
      // Not under the ice. A leopard seal in its own element is not something
      // you land on — it is the fastest predator in the Southern Ocean and the
      // penguin is the small one. Down here the only answer is not to be there.
      if (!this.diving && h.kind === 'seal' && this.player.vy > 20 && this.player.y + this.player.h < h.y + h.h * 0.85) {
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
    // The way out is guarded until the guards are down. Nothing subtle about
    // it: the raft is there, you can see it, and walking onto it does nothing
    // while somebody is still standing in front of it.
    if (this.exitLocked) return undefined;
    // Generous on purpose: a fast player jumping in at head height used to sail
    // straight over a raft-sized box and land past the finish.
    const box = {
      x: this.goal.x - 52,
      y: this.goal.y - 168,
      w: 104,
      h: 200,
    };
    if (rectsOverlap(this.player.box, box)) return this.win();
    // Last resort — overshooting the raft still counts as escaping. On a
    // mountain "past it" means above it, and standing on anything higher than
    // the summit ledge is unambiguously the top.
    if (this.axis === 'up') {
      if (this.player.onGround && this.player.y + this.player.h <= this.goal.y + 6) this.win();
    } else if (this.diving) {
      // Under the ice there is no "standing past it": the way out is a hole,
      // and swimming up through it is the whole finish. Being level with the
      // surface anywhere beyond the hole counts too, so overshooting the exit
      // by a body's width is not a death sentence with empty lungs.
      if (this.player.centerX > this.goal.x && this.player.y <= this.goal.y - 10) this.win();
    } else if (this.player.onGround && this.player.centerX > this.goal.x + 52) {
      this.win();
    }
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
      this._submerge();
      this.particles.sparkle(this.player.centerX, this.player.y, '#9b8cff');
      this.audio.checkpoint();
      this.shake(4);
      this.showHint(t('world.downSaved'), 1.6);
      return;
    }

    this.status = 'dying';
    this.deathTimer = 0.72;
    this.deaths++;
    this.flash = 0.8;
    this.shake(7);
    if (cause === 'breath') {
      // Not a splash and not a shatter. Drowning is quiet — a last string of
      // bubbles going up while the penguin does not.
      this.particles.puff(this.player.centerX, this.player.y, 18);
      this.audio.splash();
    } else if (cause === 'water') {
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

  /**
   * Is this point a place a penguin could be standing?
   *
   * Not "is there something nearby": the surface has to be *at* the point, the
   * way a floe's top is at the height of the feet on it. Merely overlapping
   * some solid is how a coordinate a few pixels inside a floe passes for one on
   * top of it, and a coordinate inside a floe is a penguin falling out of it.
   */
  /**
   * Can the penguin be put down here?
   *
   * Asked by the two places that hand the player a coordinate somebody else
   * chose — the death-loop guard in `_respawn`, and the session restored from
   * a save. Both need the same answer and both were getting the wrong one.
   *
   * It used to ask one question: is there a floe top within six pixels? That
   * is right for the first two chapters and wrong for the other two.
   *
   *   · Under the ice there is nothing to stand on, because the penguin
   *     swims. Every checkpoint in the whole diving chapter therefore failed
   *     this test and was thrown away — you crossed a long, hard level, took
   *     the flag, heard the chime, drowned, and started again from the mouth
   *     of the tunnel with nothing to say why.
   *   · It never asked whether the space was *free*. A point can have ground
   *     under it and still be the middle of an ice pillar.
   */
  standable(x, y) {
    const half = this.player.w / 2;
    const box = { x: x - half, y: y - this.player.h, w: this.player.w, h: this.player.h };
    for (const f of this.solids) {
      if (!f.solid) continue;
      if (rectsOverlap(box, { x: f.x, y: f.y, w: f.w, h: f.h })) return false;
    }
    // Swimming: anywhere clear is somewhere the penguin can be.
    if (this.diving) return true;
    for (const f of this.solids) {
      if (!f.solid) continue;
      if (Math.abs(f.y - y) > 6) continue;
      if (Math.min(x + half, f.x + f.w) - Math.max(x - half, f.x) <= 2) continue;
      return true;
    }
    return false;
  }

  _respawn() {
    this.status = 'playing';
    this.shields = this.maxShields;
    this.player.alive = true;
    this._submerge();
    // Floes reset so a broken path never soft-locks the player after a death.
    for (const f of this.floes) f.reset();
    for (const h of this.hazards) h.reset();
    // Rivals get back up. A brawl arena is a puzzle, and a puzzle that is
    // half-solved when you die teaches nothing — you would learn to trade
    // deaths for knockouts instead of learning where to stand.
    for (const r of this.rivals) r.reset();
    this.snowballs.length = 0;
    this.brawlKnockouts = 0;
    // The banks come back too. A player who dies behind a bank they had spent
    // would otherwise respawn into a level with less cover than the one they
    // were given, which is a difficulty curve nobody chose.
    for (const b of this.banks) {
      b.gone = false;
      b.left = b.hits ?? 3;
      b.hit = 0;
    }
    // Speed fish come back on a retry; the normal three stay taken so a death
    // never costs you collectibles you already earned this run.
    for (const f of this.boosts) f.reset();
    for (const f of this.charged) f.reset();
    for (const f of this.rotten) f.reset();
    // A collapse that already happened does not happen twice on the same
    // attempt — the shock is the mechanic, and a repeat is just a wall.
    this.collapse = null;
    this.skuas.length = 0;
    this.skuaCooldown = AMBUSH.grace;
    this.boostsTaken = 0;
    this.chargedTaken = 0;
    this.chargedValue = 0;
    this.rottenTaken = 0;
    // Last line of defence against a death loop.
    //
    // A respawn point is a coordinate, and coordinates outlive the ground they
    // were taken from: a checkpoint on ice that has since drifted, a point
    // restored from a save written before the level changed shape. Land in one
    // and you fall, and falling puts you back at the same place, for ever. The
    // floes have just been reset, so if it is not standable now it never will
    // be, and the start of the level always is.
    if (!this.standable(this.respawn.x, this.respawn.y)) {
      this.respawn = { ...this.def.spawn };
      this.player.reset(this.respawn.x, this.respawn.y);
    }
    this.particles.puff(this.respawn.x, this.respawn.y, 10);
    this._centerCamera();
  }

  shake(amount) {
    this.camera.shake = Math.min(14, this.camera.shake + amount);
  }

  _followCamera(dt) {
    // Look ahead in the direction of travel so fast runs still show the path.
    // On a mountain the direction of travel is up, so the lead is vertical and
    // the penguin sits low in the frame: what matters is the next hold, and the
    // next hold is always above.
    const up = this.axis === 'up';
    const lead = up ? 0 : clamp(this.player.vx * 0.35, -110, 110);
    const xr = this._camXRange;
    const yr = this._camYRange;
    const targetX = clamp(this.player.centerX + lead - VIEW.w * (up ? 0.5 : 0.42), xr.min, xr.max);
    const frame = up ? 0.64 : this.diving ? 0.5 : 0.55;
    const targetY = clamp(this.player.y - VIEW.h * frame, yr.min, yr.max);
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
    if (this.player.clinging) this.clingTime += dt;
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
   *   — a grab is a struggle you can win, not a cutscene you watch;
   *   — and losing it costs you the checkpoint, not the level.
   */
  _updateSkua(dt, intent) {
    if (!this.ambushes || this.status !== 'playing') return;

    if (!this.skuas.length) {
      this.skuaCooldown -= dt;
      if (this.skuaCooldown > 0) return;
      // Assist mode halves the frequency rather than switching it off: the
      // point of easy mode is fewer surprises, not a different game.
      const rate = AMBUSH.rate * (this.assist ? 0.5 : 1);
      if (Math.random() > rate * dt) return;
      this._launchHunt();
      return;
    }

    // Only one bird may be holding the chick. A second one arriving while the
    // first is carrying would be two struggles at once, which is not harder,
    // it is incoherent.
    const held = this.skuas.some((s) => s.state === 'carry');

    for (let i = this.skuas.length - 1; i >= 0; i--) {
      const s = this.skuas[i];
      // The second bird of a pair waits its beat off-screen. Drawn already, so
      // the player can see it coming and pick a side.
      if (s.delay > 0) {
        s.delay -= dt;
        s.x = s.fromX;
        s.y = s.fromY;
        continue;
      }
      s.t += dt;
      const done = this._flySkua(s, dt, intent, held);
      if (done) this.skuas.splice(i, 1);
    }
    if (!this.skuas.length) this.skuaCooldown = AMBUSH.cooldown;
  }

  /**
   * One bird, one frame. Returns true when it is finished with.
   */
  _flySkua(s, dt, intent, held) {
    if (s.state === 'warn') {
      // Fly in along a straight line to the strike point.
      const k = clamp(s.t / s.warn, 0, 1);
      s.x = s.fromX + (s.targetX - s.fromX) * k;
      s.y = s.fromY + (s.targetY - s.fromY) * k * k;
      if (s.kind === 'hunt') this._tell('hunt', t('world.hunter'), 2);
      if (s.t >= s.warn) {
        s.state = 'strike';
        s.t = 0;
      }
      return false;
    }

    if (s.state === 'strike') {
      const k = clamp(s.t / AMBUSH.dive, 0, 1);

      /**
       * A hunter steers all the way down.
       *
       * The strike point stops being a place and becomes a *direction*: it
       * leans toward wherever the chick actually is, hard, for the whole dive.
       * Walking out from under it does not work and is not meant to — the
       * answer to a hunter is the struggle, not the sidestep, and that is why
       * it announces itself with a longer shadow and a different colour before
       * it ever leaves the sky. A thing you cannot dodge has to be a thing you
       * can see coming.
       */
      if (s.kind === 'hunt' && !s.hit) {
        const want = this.player.centerX;
        s.targetX += clamp(want - s.targetX, -AMBUSH.huntTurn * dt, AMBUSH.huntTurn * dt);
        s.targetY += clamp(
          this.player.y + this.player.h * 0.4 - s.targetY,
          -AMBUSH.huntTurn * dt,
          AMBUSH.huntTurn * dt,
        );
      }

      s.x = s.targetX + s.dir * 240 * k;
      s.y = s.targetY - 120 * k * k + 40 * k;

      /**
       * The pull-out.
       *
       * A feint reaches the strike point and does not take it. It climbs away,
       * wheels round, and comes back from the side the player is no longer
       * watching — the first pass is free and the second one is not. What it
       * costs the player is the habit of relaxing the moment a dive misses.
       */
      if (s.kind === 'feint' && !s.hit && s.t >= AMBUSH.dive * 0.62) {
        s.state = 'wheel';
        s.t = 0;
        s.kind = 'lock';
        s.wheeled = true;
        this.audio.screech?.();
        return false;
      }

      const box = { x: s.x - 26, y: s.y - 18, w: 52, h: 36 };
      if (!s.hit && !held && this.player.alive && rectsOverlap(this.player.box, box)) {
        s.hit = true;
        s.state = 'carry';
        s.t = 0;
        this.skuaGrabs++;
        s.wrest = 0;
        s.jolt = 0;
        this.audio.screech?.();
        this.shake(7);
        this.player.alive = false;
        // Told, not hidden. The struggle is two seconds long and a player who
        // spends the first one working out that there is something to do has
        // already lost it.
        this.showHint(t('world.shakeFree'), AMBUSH.carry);
        // Whatever else is in the sky goes home. Two birds is a question about
        // where you stand, not a pile-on once the answer is in.
        for (const other of this.skuas) if (other !== s) other.leaving = true;
      } else if (s.t >= AMBUSH.dive) {
        this.skuasDodged++;
        return true;
      }
      return false;
    }

    if (s.state === 'wheel') {
      // Climbing away and turning, in full view, before it comes back.
      const k = clamp(s.t / AMBUSH.wheel, 0, 1);
      s.y -= 300 * dt;
      s.x += s.dir * 200 * dt;
      if (k >= 1) {
        // Back from the other side, aimed where the chick is now.
        s.dir = -s.dir;
        s.targetX = clamp(this.player.centerX, this.spawn.x, this.worldW - 40);
        s.targetY = this.player.y + this.player.h * 0.4;
        s.fromX = s.x;
        s.fromY = s.y;
        s.warn = Math.max(0.3, AMBUSH.warn * 0.62);
        s.state = 'warn';
        s.t = 0;
      }
      return false;
    }

    if (s.state === 'carry') {
      /**
       * The struggle.
       *
       * The bird has you and it is climbing. You get a little over two seconds
       * before it clears the level, and the only thing you can do about it is
       * the thing you can always do: hit the button. Five good presses twist
       * you loose. The grip tightens back between them, so it has to be five
       * presses *quickly* — a slow tap fights the decay and never gets there.
       *
       * Winning does not make you safe. You come out with the bird's own
       * momentum, sideways and rising, over whatever the level happens to have
       * underneath at that moment — which is very often the sea. That is the
       * point: an escape that dropped you gently onto the nearest floe would
       * make the whole event a formality with extra steps.
       */
      s.x += s.dir * 210 * dt;
      s.y -= 190 * dt;
      s.wrest = Math.max(0, s.wrest - AMBUSH.regrip * dt);
      if (intent?.jumpPressed) {
        s.wrest += 1;
        s.jolt = 1;
        this.audio.flap?.();
        this.particles.puff(s.x, s.y + 14, 3);
      }
      if (s.jolt > 0) s.jolt = Math.max(0, s.jolt - dt * 4);
      // The thrash is drawn from the same number the escape is scored from, so
      // the player can see how close they are without a bar being added to a
      // game that has no bars.
      const shove = s.jolt * 9 * s.dir;
      this.player.x = s.x - this.player.w / 2 - shove;
      this.player.y = s.y + 12 + s.jolt * 4;
      this.player.vx = 0;
      this.player.vy = 0;

      if (s.wrest >= AMBUSH.shakes) {
        this.player.alive = true;
        this.player.launch(s.dir * 150, -210);
        this.skuasEscaped++;
        this.audio.screech?.();
        this.particles.burstIce(this.player.centerX, this.player.y, 10, 12);
        this.shake(5);
        this.showHint(t('world.wrestled'), 1.4);
        return true;
      }

      if (s.t >= AMBUSH.carry) {
        this.die('skua');
        return true;
      }
      return false;
    }

    return true;
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

  /**
   * Decide what is coming, and send it.
   *
   * The mix is the difficulty curve for this whole event, and it moves with
   * the level rather than being one number for the game. Level twelve gets a
   * plain locked dive almost every time, because the shadow has to mean
   * something before it can lie. By the end of the shelf a quarter of them are
   * hunters that cannot be dodged and a third arrive in pairs.
   */
  _launchHunt() {
    const id = this.def.id ?? 1;
    // How far through the crafted levels this one is, 0 at the first ambush.
    const ramp = clamp((id - AMBUSH.fromLevel) / 20, 0, 1);
    const roll = Math.random();
    let kind = 'lock';
    if (roll < AMBUSH.huntChance * ramp) kind = 'hunt';
    else if (roll < AMBUSH.huntChance * ramp + AMBUSH.feintChance * ramp) kind = 'feint';

    this._launchSkua({ kind });
    // A second bird, from the other side, a beat later. Never two hunters:
    // that is not a question, it is an execution.
    if (id >= AMBUSH.pairFrom && kind !== 'hunt' && Math.random() < AMBUSH.pairChance * ramp) {
      this._launchSkua({ kind: 'lock', delay: AMBUSH.pairGap, mirror: true });
    }
  }

  _launchSkua({ kind = 'lock', delay = 0, mirror = false } = {}) {
    const p = this.player;
    // Aim where the penguin is going, not where it is: a bird that dives at
    // your current position is dodged by simply continuing to walk.
    const base = kind === 'hunt' ? AMBUSH.huntWarn : AMBUSH.warn;
    const warn = Math.max(0.34, base + (this.radar ?? 0)) * (this.assist ? 1.35 : 1);
    const lead = clamp(p.vx * warn * 0.8, -180, 180);
    const targetX = clamp(p.centerX + lead, this.spawn.x, this.worldW - 40);
    const targetY = p.y + p.h * 0.4;
    // The second of a pair comes from the opposite side, which is the entire
    // reason it is worth having: the answer to one bird is to run, and running
    // has a direction.
    const dir = mirror ? (p.vx >= 0 ? -1 : 1) : p.vx >= 0 ? 1 : -1;

    const bird = {
      state: 'warn',
      kind,
      t: 0,
      warn,
      dir,
      delay,
      targetX,
      targetY,
      // Comes in high and behind, so it crosses the screen into the strike.
      fromX: targetX - dir * (VIEW.w * 0.62),
      fromY: Math.max(this.contentTop - 40, targetY - 340),
      x: 0,
      y: 0,
      hit: false,
      wheeled: false,
      leaving: false,
      /** How far through twisting free the chick is. Decays between presses. */
      wrest: 0,
      /** One thrash, drawn. Purely so the struggle is visible from outside. */
      jolt: 0,
    };
    bird.x = bird.fromX;
    bird.y = bird.fromY;
    this.skuas.push(bird);
    this.audio.screech?.();
    return bird;
  }

  /**
   * The bird that matters right now.
   *
   * The one holding the chick if there is one, otherwise whichever arrived
   * first. Kept because most of the game only ever asks "is something on me" —
   * the music's heat, a mission's counter, a test setting up a struggle — and
   * none of that wants to know a flock exists.
   */
  get skua() {
    return this.skuas.find((s) => s.state === 'carry') ?? this.skuas[0] ?? null;
  }

  /** The attempt as recorded, ready to be encoded into a share code. */
  get run() {
    return { samples: this.recorder.samples, time: this.elapsed };
  }

  /** Coins the speed fish are worth this run. */
  get boostCoins() {
    return this.boostsTaken * REWARDS.perBoost;
  }

  /** And the charged ones, which are priced individually. */
  get chargedCoins() {
    return this.chargedValue;
  }

  /** Star rating for the run that just finished. */
  rate() {
    let stars = 1;
    if (this.fishTaken >= this.fish.length && this.fish.length > 0) stars++;
    if (this.elapsed <= (this.def.target ?? 40)) stars++;
    return stars;
  }
}
