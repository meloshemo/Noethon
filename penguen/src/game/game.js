/**
 * Game orchestration: the run loop, the state machine and the bridge between
 * the simulation (World) and the DOM UI.
 */

import { World } from './world.js';
import { Renderer } from './render.js';
import { Particles } from '../core/particles.js';
import { getCraftedLevel, LEVELS } from './levels.js';
import { generateLevel } from './generator.js';
import { CRAFTED_LEVELS, ASSIST_AFTER_DEATHS, scaleForLevel } from './config.js';
import { Storage } from '../core/storage.js';

/** Fixed physics step — decoupled from the display refresh rate. */
const STEP = 1 / 120;
const MAX_STEPS = 6;

/** Neutral intent — used to animate the menu backdrop without playing it. */
const NO_INPUT = { axis: 0, jumpHeld: false, jumpPressed: false };

export function getLevel(id) {
  return id <= CRAFTED_LEVELS ? getCraftedLevel(id) : generateLevel(id);
}

export const TOTAL_CRAFTED = LEVELS.length;

export class Game {
  constructor({ canvas, input, audio, storage, ui }) {
    this.renderer = new Renderer(canvas);
    this.particles = new Particles();
    this.input = input;
    this.audio = audio;
    this.save = storage;
    this.ui = ui;

    this.state = 'menu';
    this.world = null;
    this.levelId = 1;
    this.accumulator = 0;
    this.lastTs = 0;
    this.runDeaths = 0;
    this.assistOffered = false;
    this.jumpPressed = false;

    this.input.on('jump', () => {
      this.jumpPressed = true;
    });
    this.input.on('pause', () => this.togglePause());
    this.input.on('restart', () => {
      if (this.state === 'playing') this.restart();
    });

    this.applySettings();
    this._boundLoop = (ts) => this._loop(ts);
    requestAnimationFrame(this._boundLoop);
  }

  applySettings() {
    const s = this.save.settings;
    this.audio.setEnabled('sfx', s.sfx);
    this.audio.setEnabled('music', s.music);
    this.renderer.reducedMotion = s.reducedMotion;
    this.particles.intensity = s.reducedMotion ? 0.35 : 1;
  }

  /* ------------------------------------------------------------ flow */

  startLevel(id) {
    this.levelId = id;
    const def = getLevel(id);
    if (!def) return;
    this.particles.clear();
    this.world = new World(def, {
      particles: this.particles,
      audio: this.audio,
      assist: this.save.settings.assist,
    });
    this.runDeaths = 0;
    this.assistOffered = false;
    this.state = 'playing';
    this.accumulator = 0;
    this.input.releaseAll();
    this.jumpPressed = false;
    this.ui.onLevelStart(def, scaleForLevel(id));
  }

  restart() {
    if (!this.world) return;
    const deaths = this.world.deaths + this.runDeaths;
    this.startLevel(this.levelId);
    this.runDeaths = deaths;
  }

  nextLevel() {
    this.startLevel(this.levelId + 1);
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.input.releaseAll();
      this.ui.showScreen('pause');
      this.audio.ui('back');
    } else if (this.state === 'paused') {
      this.resume();
    }
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.lastTs = 0;
    this.ui.showScreen(null);
    this.audio.ui();
  }

  quitToMenu() {
    this.input.releaseAll();
    this.showMenuScene();
    this.ui.showScreen('title');
  }

  /**
   * A live, unplayed level rendered behind the menus — the aurora drifts, the
   * sea moves and the chick idles on the ice. Far better than a flat backdrop,
   * and it costs nothing: it is the same world code, just never given input.
   */
  showMenuScene() {
    this.state = 'menu';
    this.particles.clear();
    this.world = new World(getLevel(1), {
      particles: this.particles,
      audio: this.audio,
      assist: false,
    });
    this.world.signs = [];
  }

  /* ------------------------------------------------------------ loop */

  _loop(ts) {
    requestAnimationFrame(this._boundLoop);
    if (!this.lastTs) this.lastTs = ts;
    // Clamp so a background tab doesn't teleport the player on return.
    const frame = Math.min(0.25, (ts - this.lastTs) / 1000);
    this.lastTs = ts;

    this.input.pollGamepad();

    if (this.state === 'playing' && this.world) {
      this.accumulator += frame;
      let steps = 0;
      while (this.accumulator >= STEP && steps < MAX_STEPS) {
        this._step(STEP);
        this.accumulator -= STEP;
        steps++;
      }
      if (steps === MAX_STEPS) this.accumulator = 0;
    } else if (this.state === 'menu' && this.world) {
      // Keep the backdrop alive, but never let it be played or lost.
      this.world.update(Math.min(frame, STEP * MAX_STEPS), NO_INPUT);
    }

    if (this.world) {
      this.particles.update(frame);
      this.renderer.draw(this.world, this.particles, ts / 1000);
      this.ui.updateHud(this.world, this.levelId, this.runDeaths);
    }
  }

  _step(dt) {
    const w = this.world;
    const prevDeaths = w.deaths;

    w.update(dt, {
      axis: this.input.axis,
      jumpHeld: this.input.state.jump,
      jumpPressed: this.jumpPressed,
    });
    this.jumpPressed = false;

    if (w.deaths > prevDeaths) this._onDeath();
    if (w.status === 'won' && w.winTimer > 0.85) this._onWin();
  }

  _onDeath() {
    const total = this.world.deaths + this.runDeaths;
    if (!this.assistOffered && !this.save.settings.assist && total >= ASSIST_AFTER_DEATHS) {
      this.assistOffered = true;
      this.ui.offerAssist();
    }
  }

  _onWin() {
    const w = this.world;
    const stars = w.rate();
    const prevBest = this.save.levels[this.levelId]?.bestTime;
    const result = {
      level: this.levelId,
      stars,
      time: w.elapsed,
      deaths: w.deaths + this.runDeaths,
      fish: w.fishTaken,
      totalFish: w.fish.length,
      target: w.def.target,
      name: w.def.name,
      isLast: this.levelId >= CRAFTED_LEVELS && !w.def.generated,
      prevBest,
    };
    this.state = 'complete';
    // Record before the UI reads the save, so the grid and title are current.
    this.ui.onLevelComplete(result);
    Storage.recordLevel(this.save, this.levelId, {
      stars,
      time: w.elapsed,
      deaths: result.deaths,
      fish: w.fishTaken,
    });
    this.ui.refreshTitle();
  }

  /** Turn assist mode on mid-level without losing the attempt. */
  enableAssist() {
    this.save.settings.assist = true;
    if (this.world) this.world.assist = true;
    this.ui.persist();
  }
}
