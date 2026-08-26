/**
 * Procedural audio.
 *
 * Every sound is synthesised with the Web Audio API — no asset files, so the
 * game stays a zero-dependency static bundle that works offline.
 *
 * Effects live here; the score lives in `music.js`, on its own bus, because it
 * is a different problem. An effect is a reaction and has to be instant; music
 * is a schedule and has to be early.
 */

import { Music } from './music.js';

const NOTES = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, C6: 1046.5 };

export class Audio {
  constructor() {
    this.ctx = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.enabled = { sfx: true, music: true };
    this.music = null;
  }

  /** Browsers only allow audio after a gesture, so this is called on first input. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;

    /*
     * All or nothing.
     *
     * Every sound in the game is guarded by `if (!this.ctx) return`, which is
     * the right check as long as having a context means having the gain nodes
     * hanging off it. Built in place, it did not: a browser that refuses a
     * context after too many tabs, or a gain node that fails on a device with
     * no output, left `ctx` set and `sfxGain` undefined — and then every sound
     * passed the guard and threw on the connect. The loop survives a throw,
     * but it would have been throwing once a jump for the rest of the session.
     *
     * So it is assembled to one side and only published when it is whole.
     */
    let ctx;
    try {
      ctx = new Ctor();
      const sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.5;
      sfxGain.connect(ctx.destination);

      const musicGain = ctx.createGain();
      musicGain.gain.value = 0.2;
      musicGain.connect(ctx.destination);

      const music = new Music(ctx, musicGain);

      this.ctx = ctx;
      this.sfxGain = sfxGain;
      this.musicGain = musicGain;
      this.music = music;
    } catch {
      // Silence is a fine outcome; a game that will not start is not.
      ctx?.close?.();
      this.ctx = null;
      this.sfxGain = null;
      this.musicGain = null;
      this.music = null;
      return;
    }

    if (this._pendingScene !== undefined) this.music.setScene(sceneFor(this._pendingScene));
    if (this.enabled.music) this.music.start();
  }

  /**
   * Which piece of music is playing. Menus, and one per chapter.
   *
   * Called with a level definition rather than a name so the caller does not
   * have to know how chapters map to scenes — that mapping is a fact about the
   * music, and it belongs on this side of the wall.
   */
  setScene(def) {
    if (!this.music) {
      this._pendingScene = def;
      return;
    }
    this.music.setScene(sceneFor(def));
  }

  /** How much is going on, 0..1. Layers arrive and leave on this. */
  setIntensity(v) {
    this.music?.setIntensity(v);
  }

  setEnabled(kind, on) {
    this.enabled[kind] = on;
    if (kind === 'music' && this.music) on ? this.music.start() : this.music.stop();
    if (kind === 'sfx' && this.sfxGain) this.sfxGain.gain.value = on ? 0.5 : 0;
  }

  /** Kept so a caller that predates the score still works. */
  startMusic() {
    this.music?.start();
  }

  stopMusic() {
    this.music?.stop();
  }

  _tone({ freq = 440, dur = 0.15, type = 'sine', gain = 0.3, slide = 0, delay = 0, attack = 0.008 }) {
    if (!this.ctx || !this.enabled.sfx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env).connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.2, gain = 0.25, filter = 1200, delay = 0, q = 0.8 }) {
    if (!this.ctx || !this.enabled.sfx) return;
    const t0 = this.ctx.currentTime + delay;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = filter;
    bp.Q.value = q;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp).connect(env).connect(this.sfxGain);
    src.start(t0);
  }

  jump() {
    this._tone({ freq: 340, slide: 260, dur: 0.16, type: 'triangle', gain: 0.24 });
  }

  land() {
    this._noise({ dur: 0.09, gain: 0.16, filter: 700 });
  }

  crack() {
    this._noise({ dur: 0.16, gain: 0.2, filter: 2600, q: 2 });
    this._tone({ freq: 900, slide: -420, dur: 0.14, type: 'square', gain: 0.06 });
  }

  shatter() {
    this.music?.duck(0.5);
    this._noise({ dur: 0.42, gain: 0.3, filter: 3200, q: 1.2 });
    for (let i = 0; i < 4; i++) {
      this._tone({ freq: 1200 + i * 300, slide: -700, dur: 0.2, type: 'triangle', gain: 0.05, delay: i * 0.03 });
    }
  }

  /** Rising hiss — the geyser telling you to move. */
  hiss() {
    this._noise({ dur: 0.5, gain: 0.14, filter: 2400, q: 0.6 });
    this._tone({ freq: 180, slide: 520, dur: 0.5, type: 'sine', gain: 0.05 });
  }

  /** The eruption itself. */
  burst() {
    this._noise({ dur: 0.7, gain: 0.34, filter: 900, q: 0.4 });
    this._tone({ freq: 120, slide: 380, dur: 0.4, type: 'sawtooth', gain: 0.1 });
    this._tone({ freq: 700, slide: -420, dur: 0.5, type: 'triangle', gain: 0.07, delay: 0.05 });
  }

  splash() {
    this.music?.duck(0.4);
    this._noise({ dur: 0.5, gain: 0.32, filter: 520, q: 0.5 });
    this._tone({ freq: 220, slide: -140, dur: 0.35, type: 'sine', gain: 0.12 });
  }

  fish() {
    this._tone({ freq: NOTES.E5, dur: 0.1, type: 'triangle', gain: 0.2 });
    this._tone({ freq: NOTES.G5, dur: 0.14, type: 'triangle', gain: 0.18, delay: 0.07 });
  }

  /** Swallowing the speed fish — a rising electric zap. */
  charge() {
    this._tone({ freq: 220, slide: 1400, dur: 0.22, type: 'sawtooth', gain: 0.14 });
    this._tone({ freq: 660, slide: 900, dur: 0.3, type: 'triangle', gain: 0.16, delay: 0.05 });
    this._noise({ dur: 0.28, gain: 0.16, filter: 3600, q: 1.4, delay: 0.02 });
  }

  /** Swallowing something rotten — a wet, descending gulp. */
  rot() {
    this._tone({ freq: 420, slide: -300, dur: 0.3, type: 'sawtooth', gain: 0.12 });
    this._noise({ dur: 0.34, gain: 0.16, filter: 380, q: 0.6 });
    this._tone({ freq: 180, slide: -110, dur: 0.4, type: 'square', gain: 0.05, delay: 0.08 });
  }

  /**
   * The skua.
   *
   * Two rising cries a beat apart, harsh and thin — the sound has to cut
   * through whatever else is happening, because it is often the only warning
   * a player who is watching their feet will get.
   */
  screech() {
    this.music?.duck(0.6);
    this._tone({ freq: 900, slide: 520, dur: 0.14, type: 'sawtooth', gain: 0.11 });
    this._tone({ freq: 1150, slide: 700, dur: 0.12, type: 'square', gain: 0.07, delay: 0.13 });
    this._noise({ dur: 0.2, gain: 0.07, filter: 2600, q: 2.4, delay: 0.02 });
  }

  /**
   * One thrash against the bird's grip.
   *
   * Short, dry and slightly different every time, because it is heard five
   * times in two seconds and a sound played that fast at one pitch stops
   * registering as effort and starts registering as a bug.
   */
  flap() {
    const up = 0.9 + Math.random() * 0.4;
    this._noise({ dur: 0.09, gain: 0.13, filter: 1400 * up, q: 1.1 });
    this._tone({ freq: 300 * up, slide: -140, dur: 0.08, type: 'square', gain: 0.06 });
  }

  /**
   * Swallowing a charged fish.
   *
   * A bell rather than a zap: the speed fish is a shove and these are a
   * *permission*, and the ear should be told which one it just got.
   */
  chargedFish() {
    this.music?.duck(0.4);
    this._tone({ freq: 520, slide: 1050, dur: 0.26, type: 'triangle', gain: 0.15 });
    this._tone({ freq: 1040, dur: 0.42, type: 'sine', gain: 0.1, delay: 0.06 });
    this._tone({ freq: 1560, dur: 0.34, type: 'sine', gain: 0.05, delay: 0.1 });
  }

  /** The blink landing — a clean, hollow pop with no tail on it. */
  blink() {
    this._tone({ freq: 1500, slide: -900, dur: 0.09, type: 'sine', gain: 0.13 });
    this._noise({ dur: 0.07, gain: 0.08, filter: 5200, q: 3 });
  }

  /** The coil letting go. Low, and much bigger than a jump. */
  uncoil() {
    this._tone({ freq: 140, slide: 620, dur: 0.24, type: 'sawtooth', gain: 0.15 });
    this._tone({ freq: 70, slide: 300, dur: 0.3, type: 'square', gain: 0.08, delay: 0.02 });
    this._noise({ dur: 0.2, gain: 0.1, filter: 1200, q: 0.9 });
  }

  /**
   * Stepping into the hush.
   *
   * Almost nothing: a low sine that swells and goes, and the music ducked
   * under it. The pocket is a place where the world stops pushing, so the
   * honest sound for it is the sound of something being taken away rather
   * than something arriving.
   */
  hush() {
    this.music?.duck(0.45);
    this._tone({ freq: 130, dur: 0.7, type: 'sine', gain: 0.09 });
    this._tone({ freq: 196, dur: 0.55, type: 'sine', gain: 0.05, delay: 0.08 });
    this._noise({ dur: 0.5, gain: 0.05, filter: 420, q: 0.5 });
  }

  /** The back motor firing. */
  rocket() {
    this._noise({ dur: 0.34, gain: 0.14, filter: 900, q: 0.8 });
    this._tone({ freq: 180, slide: 420, dur: 0.3, type: 'sawtooth', gain: 0.07 });
  }

  /** A storm surge arriving. */
  windSurge() {
    this._noise({ dur: 1.1, gain: 0.13, filter: 620, q: 0.4 });
  }

  checkpoint() {
    this._tone({ freq: NOTES.C5, dur: 0.14, type: 'sine', gain: 0.18 });
    this._tone({ freq: NOTES.G5, dur: 0.2, type: 'sine', gain: 0.16, delay: 0.09 });
  }

  win() {
    this.music?.duck(0.5);
    const seq = [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6];
    seq.forEach((f, i) => this._tone({ freq: f, dur: 0.3, type: 'triangle', gain: 0.2, delay: i * 0.11 }));
  }

  ui(kind = 'tap') {
    const freq = kind === 'back' ? 320 : 640;
    this._tone({ freq, dur: 0.07, type: 'sine', gain: 0.14 });
  }

}

/**
 * Which scene a level asks for.
 *
 * By chapter, not by level number, because the number is an accident of how
 * many levels each chapter happens to have and the music is about the verb.
 */
function sceneFor(def) {
  if (!def) return 'menu';
  if (def.brawl) return 'brawl';
  if (def.axis === 'dive') return 'dive';
  if (def.axis === 'up') return 'climb';
  return 'shelf';
}
