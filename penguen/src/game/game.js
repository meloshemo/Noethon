/**
 * Game orchestration: the run loop, the state machine and the bridge between
 * the simulation (World) and the DOM UI.
 */

import { t, loc } from '../core/i18n.js';
import { World } from './world.js';
import { Renderer } from './render.js';
import { Particles } from '../core/particles.js';
import { getCraftedLevel, ALL_LEVELS } from './chapters.js';
import { generateLevel, generateDailyLevel } from './generator.js';
import { CRAFTED_LEVELS, ASSIST_AFTER_DEATHS, REWARDS, scaleForLevel } from './config.js';
import { Storage, todayKey } from '../core/storage.js';
import { ensureMissions, progressMission } from './missions.js';
import { encodeRun, decodeRun } from './ghost.js';
import { newlyEarned, getSkin } from './skins.js';
import { weekKey, scoreRun, tierFor } from './league.js';
import { dailyObjectives, applyRun } from './daily.js';
import { fingerprint } from '../core/util.js';

/** Fixed physics step — decoupled from the display refresh rate. */
const STEP = 1 / 120;
const MAX_STEPS = 6;

/** Neutral intent — used to animate the menu backdrop without playing it. */
const NO_INPUT = { axis: 0, jumpHeld: false, jumpPressed: false };

export function getLevel(id) {
  return id <= CRAFTED_LEVELS ? getCraftedLevel(id) : generateLevel(id);
}

export const TOTAL_CRAFTED = ALL_LEVELS.length;

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
    /** Set while the daily challenge is being played. */
    this.dailyRun = false;

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

  /** The daily challenge — same level for everybody, once a day. */
  startDaily() {
    const def = generateDailyLevel(todayKey());
    Storage.touchDaily(this.save);
    this.dailyRun = true;
    this.levelId = CRAFTED_LEVELS + 1; // only used for HUD growth sizing
    this._begin(def);
  }

  startLevel(id) {
    this.dailyRun = false;
    this.levelId = id;
    const def = getLevel(id);
    if (!def) return;
    this._begin(def);
  }

  /** The level's key on the board — the daily has one board for everybody. */
  get boardKey() {
    return this.dailyRun ? 'daily' : String(this.levelId);
  }

  /**
   * The run to race. Whoever holds the record for this level takes the ice
   * beside you — you if nobody has sent you a faster code, them if they have.
   */
  _ghostFor(key) {
    const rows = Storage.board(this.save, key);
    const best = rows[0];
    if (!best?.code) return null;
    const run = decodeRun(best.code);
    if (!run) return null;
    return { ...run, name: best.you ? Storage.displayName(this.save) : best.name };
  }

  /**
   * Write the current attempt to disk.
   *
   * Called where a position actually means something — a checkpoint reached, a
   * death, a pause, the tab going away — rather than on a timer. What is stored
   * is the *respawn* point, not the exact pixel: restoring somebody to the
   * middle of a jump they were losing would be a worse gift than the checkpoint.
   */
  saveSession() {
    const w = this.world;
    if (!w || this.state === 'menu' || w.status === 'won') return;
    Storage.saveSession(this.save, {
      level: this.levelId,
      daily: this.dailyRun,
      // What shape the level was when this point meant something. Without it
      // the coordinate outlives the ground it was standing on.
      stamp: levelStamp(w.def),
      x: Math.round(w.respawn.x),
      y: Math.round(w.respawn.y),
      elapsed: +w.elapsed.toFixed(2),
      deaths: w.deaths + this.runDeaths,
      fish: w.fishTaken,
    });
  }

  /** Is there an interrupted attempt to offer? */
  get pendingSession() {
    const s = Storage.takeSession(this.save);
    if (!s) return null;
    // A saved point is only a point on the level that produced it. Change the
    // level and the same two numbers can name open water, which is what turned
    // "Devam et" into a penguin falling out of the sky on every launch and
    // dying there for ever, because dying put it back at the same place.
    const def = s.daily ? this._dailyDef() : getLevel(s.level);
    if (!def || s.stamp !== levelStamp(def)) {
      Storage.clearSession(this.save);
      return null;
    }
    return s;
  }

  /** Today's generated level, for checking a stored daily session against. */
  _dailyDef() {
    try {
      return generateDailyLevel(todayKey());
    } catch {
      return null;
    }
  }

  /**
   * Pick an interrupted run back up.
   *
   * The clock, the deaths and the fish all come back with it: resuming must not
   * be a way to launder a bad run into a clean one, or the leaderboard means
   * nothing.
   */
  resumeSession() {
    const s = this.pendingSession;
    if (!s) return false;
    if (s.daily) this.startDaily();
    else this.startLevel(s.level);
    const w = this.world;
    if (!w) return false;
    // Belt as well as braces. The stamp says the level is the same shape; this
    // says the point is still standing on it. A checkpoint saved on ice that
    // has since melted or drifted is a legal point in an illegal place.
    const at = w.standable(s.x, s.y) ? { x: s.x, y: s.y } : { ...w.def.spawn };
    w.respawn = { ...at };
    w.player.reset(at.x, at.y);
    w.elapsed = s.elapsed ?? 0;
    w.deaths = s.deaths ?? 0;
    w.fishTaken = 0;
    w._centerCamera();
    w.showHint(t('game.resumed'), 1.8);
    return true;
  }

  _begin(def) {
    this.particles.clear();
    this.world = new World(def, {
      particles: this.particles,
      audio: this.audio,
      assist: this.save.settings.assist,
      upgrades: this.save.upgrades,
      ghost: this._ghostFor(this.boardKey),
      skin: this.save.skin ?? 'normal',
      trail: this.save.trail ?? 'none',
    });
    this.runDeaths = 0;
    this.assistOffered = false;
    this.state = 'playing';
    this.accumulator = 0;
    this.input.releaseAll();
    this.jumpPressed = false;
    this.world.onCheckpoint = () => this.saveSession();
    this.audio.setScene(def);
    this.audio.setIntensity(0.35);
    this.ui.onLevelStart(def, scaleForLevel(def.id));
  }

  restart() {
    if (!this.world) return;
    const deaths = this.world.deaths + this.runDeaths;
    this.replay();
    this.runDeaths = deaths;
  }

  /** Restart whatever is currently loaded — campaign level or daily. */
  replay() {
    if (this.dailyRun) this.startDaily();
    else this.startLevel(this.levelId);
  }

  nextLevel() {
    this.startLevel(this.levelId + 1);
  }

  togglePause() {
    if (this.state === 'playing') {
      this.saveSession();
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
    this.saveSession();
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
    this.audio.setScene(null);
    this.audio.setIntensity(0.18);
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
    try {
      this._frame(ts);
    } catch (err) {
      // A throw inside the frame used to repeat silently every frame: the HUD
      // froze on its initial values and the canvas stayed black, with no way to
      // see why on a phone. Report it once, visibly, and stop the loop.
      this._boundLoop = () => {};
      this.ui.showFatal?.(err);
      throw err;
    }
  }

  _frame(ts) {
    if (!this.lastTs) this.lastTs = ts;
    // Clamp so a background tab doesn't teleport the player on return.
    const frame = Math.min(0.25, (ts - this.lastTs) / 1000);
    this.lastTs = ts;

    // Gamepad access is blocked outright in some embedded contexts, and a
    // throw here would kill the frame before anything got drawn.
    try {
      this.input.pollGamepad();
    } catch {
      this.input.pollGamepad = () => {};
    }

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
      if (this.state === 'playing') this.audio.setIntensity(this._heat());
    }
  }

  /**
   * How much is going on, 0..1 — the one number the score listens to.
   *
   * Deliberately made of things the *player* is feeling rather than things the
   * level contains: how far in they are, how close the thing that kills them
   * is, how much of the resource this chapter charges them is left. A level
   * that is going well and the same level nearly lost do not sound alike, and
   * neither of them was written twice.
   */
  _heat() {
    const w = this.world;
    if (!w || w.status !== 'playing') return 0.25;
    const p = w.player;
    // Everywhere: getting on with it raises the temperature, and so does the
    // end of the level being in sight.
    let heat = 0.28 + w.progress * 0.34;
    if (Math.abs(p.vx) > p.moveSpeed * 0.6) heat += 0.08;

    // Chapter by chapter, whatever that chapter is actually about.
    if (w.diving) {
      // Air. Below a third of a lungful this is the only thing that matters.
      const air = p.breathFrac;
      heat += air < 0.34 ? (0.34 - air) * 1.9 : 0;
      if (p.breathing) heat -= 0.18;
    } else if (w.axis === 'up') {
      // Arms, and the drop underneath them.
      heat += (1 - p.staminaFrac) * 0.4;
      if (p.clinging) heat += 0.1;
      if (p.onGround) heat -= 0.14;
    } else if (w.brawl) {
      // The guards still standing, and anything in the air right now.
      const guards = w.rivals.filter((r) => r.guard);
      const down = guards.filter((r) => r.out).length;
      heat = 0.3 + (guards.length ? down / guards.length : 0) * 0.3;
      if (w.snowballs.length) heat += 0.22;
      if (w.rivals.some((r) => r.aim)) heat += 0.12;
    } else if (!p.onGround) {
      heat += 0.1;
    }

    // Anything currently trying to kill you, in every chapter at once.
    if (w.skua) heat += 0.3;
    if (w.collapse) heat += 0.25;
    return Math.max(0, Math.min(1, heat));
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

    if (w.deaths > prevDeaths) {
      this._onDeath();
      this.saveSession();
    }
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
    const deaths = w.deaths + this.runDeaths;
    this.state = 'complete';

    const result = this.dailyRun
      ? this._finishDaily(w, stars, deaths)
      : this._finishLevel(w, stars, deaths);

    // The attempt is over: nothing left to resume.
    Storage.clearSession(this.save);
    this._bankRun(w, result);
    this._runMissions(w, result);
    this._recordFeats(w, result);
    this._runDailyObjectives(w, result);
    this._runLeague(w, result);
    this._grantSkins(result);
    Storage.save(this.save);
    this.ui.onLevelComplete(result);
    this.ui.refreshTitle();
  }

  /**
   * Campaign payout. Only *new* progress pays: replaying a level for fun is
   * fine, farming the first level for coins is not.
   */
  _finishLevel(w, stars, deaths) {
    const prev = this.save.levels[this.levelId];
    const prevBest = prev?.bestTime;
    const prevStars = prev?.stars ?? 0;

    let coins = w.fishTaken * REWARDS.perFish;
    const breakdown = [{ label: t('stat.fish'), value: coins }];

    if (w.boostsTaken > 0) {
      const v = w.boostsTaken * REWARDS.perBoost;
      coins += v;
      breakdown.push({ label: t('game.boostEnergy'), value: v });
    }

    if (!prev) {
      coins += REWARDS.firstClear;
      breakdown.push({ label: t('game.firstClear'), value: REWARDS.firstClear });
    }
    const newStars = Math.max(0, stars - prevStars);
    if (newStars > 0) {
      const v = newStars * REWARDS.perStar;
      coins += v;
      breakdown.push({ label: t('game.newStars', { n: newStars }), value: v });
    }
    if (deaths === 0) {
      coins += REWARDS.flawless;
      breakdown.push({ label: t('game.flawless'), value: REWARDS.flawless });
    }

    Storage.recordLevel(this.save, this.levelId, {
      stars,
      time: w.elapsed,
      deaths,
      fish: w.fishTaken,
    });
    Storage.addCoins(this.save, coins);

    return {
      level: this.levelId,
      stars,
      time: w.elapsed,
      deaths,
      fish: w.fishTaken,
      totalFish: w.fish.length,
      target: w.def.target,
      name: w.def.name,
      isLast: this.levelId >= CRAFTED_LEVELS && !w.def.generated,
      prevBest,
      coins,
      breakdown,
      daily: false,
    };
  }

  /** Daily payout: a flat prize plus a streak bonus that grows for a week. */
  _finishDaily(w, stars, deaths) {
    const prevBest = this.save.daily.bestTime;
    const { first, streak } = Storage.completeDaily(this.save, w.elapsed);

    let coins = w.fishTaken * REWARDS.perFish;
    const breakdown = [{ label: t('stat.fish'), value: coins }];
    if (w.boostsTaken > 0) {
      const v = w.boostsTaken * REWARDS.perBoost;
      coins += v;
      breakdown.push({ label: t('game.boostEnergy'), value: v });
    }
    if (first) {
      coins += REWARDS.daily;
      breakdown.push({ label: t('title.daily'), value: REWARDS.daily });
      const bonus = Math.min(REWARDS.streakCap, streak * REWARDS.streakStep);
      if (bonus > 0) {
        coins += bonus;
        breakdown.push({ label: t('game.streak', { n: streak }), value: bonus });
      }
    }
    Storage.addCoins(this.save, coins);
    this.save.stats.totalFish += w.fishTaken;

    return {
      level: null,
      stars,
      time: w.elapsed,
      deaths,
      fish: w.fishTaken,
      totalFish: w.fish.length,
      target: w.def.target,
      name: t('title.daily'),
      prevBest,
      coins,
      breakdown,
      daily: true,
      streak,
      firstToday: first,
    };
  }

  /**
   * File the finished attempt on the board and hand the result the numbers the
   * win screen needs: the share code, whether it was a personal best, and where
   * the time lands among everyone whose code you hold.
   */
  _bankRun(w, result) {
    const key = this.boardKey;
    const samples = w.recorder.samples;
    result.boardKey = key;

    if (samples.length > 1) {
      const code = encodeRun({ samples, time: w.elapsed, level: key, name: this.save.name });
      result.isPB = Storage.recordGhost(this.save, key, { code, time: w.elapsed });
      result.code = Storage.board(this.save, key).find((r) => r.you)?.code ?? code;
    }

    const board = Storage.board(this.save, key);
    result.board = board;
    result.rank = board.findIndex((r) => r.you) + 1 || null;
    result.rivals = board.length;

    if (w.ghost?.visible) {
      result.ghostName = w.ghost.name;
      result.ghostTime = w.ghost.time;
      result.beatGhost = w.elapsed < w.ghost.time;
    }
  }

  /** Take a friend's code onto the board. Returns a message for the UI. */
  importRival(code) {
    const run = decodeRun(code);
    if (!run) return { ok: false, message: t('game.badCode') };
    const key = run.level;
    const name = run.name ?? t('game.rival');
    if (name === Storage.displayName(this.save)) {
      return { ok: false, message: t('game.ownCode') };
    }
    const added = Storage.addRival(this.save, key, { code, time: run.time, name });
    const where = key === 'daily' ? t('title.daily') : t('ui.levelN', { n: key });
    return added
      ? { ok: true, key, message: t('game.rivalAdded', { name, where }) }
      : { ok: false, key, message: t('game.rivalSlower', { name }) };
  }

  /**
   * The lifetime counters the collection is earned on.
   *
   * These are deliberately cumulative and never reset: a skin unlocked by
   * finishing fifty levels without dying is a record of something you did, and
   * it should not evaporate.
   */
  _recordFeats(w, result) {
    const st = this.save.stats;
    if (result.deaths === 0) st.flawless = (st.flawless ?? 0) + 1;
    st.boosts = (st.boosts ?? 0) + w.boostsTaken;
    // Endless levels are the ones that count as distance travelled, at the
    // game's own scale of ten pixels to the metre.
    if (!this.dailyRun && this.levelId > CRAFTED_LEVELS) {
      result.meters = Math.round(w.worldW / 10);
      st.endlessMeters = (st.endlessMeters ?? 0) + result.meters;
    }
    result.boosts = w.boostsTaken;
    result.rotten = w.rottenTaken;
    result.skuasDodged = w.skuasDodged;
    result.skuaGrabs = w.skuaGrabs;
    st.skuaDodges = (st.skuaDodges ?? 0) + w.skuasDodged;
    st.glideSeconds = (st.glideSeconds ?? 0) + w.glideTime;
    st.rocketFires = (st.rocketFires ?? 0) + w.rocketFires;
    // A run that starts between midnight and five in the morning. The alien
    // penguin is for people who play at times they should not.
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) st.nightRuns = (st.nightRuns ?? 0) + 1;
  }

  /**
   * Daily Pengu: the day's objectives, ticked off across every attempt rather
   * than demanded in one run. That is what makes a fifth go worth starting.
   */
  _runDailyObjectives(w, result) {
    if (!result.daily) return;
    const key = todayKey();
    const daily = Storage.touchDaily(this.save);
    const { done, newly } = applyRun(key, w.def.target, daily.objectives, result);
    Storage.setDailyObjectives(this.save, done);

    const list = dailyObjectives(key, w.def.target);
    result.objectives = list.map((o) => ({ ...o, done: done.includes(o.id), fresh: newly.includes(o.id) }));
    result.objectivesDone = newly.length;
    result.objectivesTotal = list.length;

    if (newly.length) {
      const pay = newly.length * REWARDS.dailyObjective;
      Storage.addCoins(this.save, pay);
      result.coins += pay;
      result.breakdown.push({ label: t('game.dailyGoals', { n: newly.length }), value: pay });
    }
  }

  /** Score the run into this week's league. */
  _runLeague(w, result) {
    const week = weekKey();
    Storage.touchLeague(this.save, week);
    const { points, rows } = scoreRun(result);
    const before = this.save.league.points;
    const after = before + points;
    Storage.addLeaguePoints(this.save, week, points, tierFor(after));
    result.league = {
      points,
      rows,
      total: after,
      promoted: tierFor(after) > tierFor(before),
    };
  }

  /**
   * Hand over anything the run just earned. Checked here rather than on the
   * collection screen so the unlock lands on the win sheet, at the moment it
   * was earned, which is the only moment it means anything.
   */
  _grantSkins(result) {
    const earned = newlyEarned(this.save);
    if (!earned.length) return;
    for (const item of earned) Storage.grantSkin(this.save, item.id, item.bag);
    result.unlockedSkins = earned.map((s) => ({ id: s.id, name: s.name, bag: s.bag }));
  }

  /** Feed the run into today's missions and pay out anything completed. */
  _runMissions(w, result) {
    ensureMissions(this.save, Storage);
    const done = [
      ...progressMission(this.save, 'clear', 1),
      ...progressMission(this.save, 'fish', w.fishTaken),
      ...progressMission(this.save, 'star', result.stars),
      ...(result.deaths === 0 ? progressMission(this.save, 'flawless', 1) : []),
      ...(result.stars === 3 ? progressMission(this.save, 'threeStars', 1) : []),
      ...(result.daily ? progressMission(this.save, 'daily', 1) : []),
      ...(w.burstDodges > 0 ? progressMission(this.save, 'burstDodge', w.burstDodges) : []),
      ...(w.orcaPasses > 0 ? progressMission(this.save, 'orcaPass', w.orcaPasses) : []),
      ...(w.skuasDodged > 0 ? progressMission(this.save, 'skuaDodge', w.skuasDodged) : []),
      ...(w.glideTime > 0 ? progressMission(this.save, 'glide', w.glideTime) : []),
      ...(w.rocketFires > 0 ? progressMission(this.save, 'rocket', w.rocketFires) : []),
      ...(w.boostsTaken > 0 ? progressMission(this.save, 'boost', w.boostsTaken) : []),
      ...(w.rottenTaken === 0 ? progressMission(this.save, 'cleanRun', 1) : []),
      ...(w.player.charge > 0 ? progressMission(this.save, 'sprintFinish', 1) : []),
      // "Without stopping" allows a moment's hesitation, not a rest.
      ...(w.stillTime < 1.2 ? progressMission(this.save, 'noStop', 1) : []),
      ...(result.deaths === 0 && (w.zones ?? []).some((z) => z.kind === 'tunnel')
        ? progressMission(this.save, 'tunnelClean', 1)
        : []),
    ];
    if (done.length) {
      const total = done.reduce((n, m) => n + m.reward, 0);
      Storage.addCoins(this.save, total);
      result.coins += total;
      result.breakdown.push({ label: t('game.missions', { n: done.length }), value: total });
      result.missionsDone = done.map((m) => loc(m, 'text'));
    }
  }

  /** Turn assist mode on mid-level without losing the attempt. */
  enableAssist() {
    this.save.settings.assist = true;
    if (this.world) this.world.assist = true;
    this.ui.persist();
  }
}

/**
 * A short fingerprint of a level's shape.
 *
 * Every floe that can be stood on, plus where the level starts. Enough that a
 * coordinate saved before the ground moved can be told apart from one saved
 * after, and cheap enough to compute on every save.
 */
function levelStamp(def) {
  if (!def) return '';
  let s = `${def.id}:${Math.round(def.spawn?.x ?? 0)},${Math.round(def.spawn?.y ?? 0)}`;
  for (const f of def.floes ?? []) s += `|${f.x},${f.y},${f.w},${f.type}`;
  return fingerprint(s);
}

