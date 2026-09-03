/**
 * The score.
 *
 * There are no audio files in this game and there never will be — it is a
 * few hundred kilobytes of text that draws and plays everything it needs. So
 * the music is written the way the levels are: as rules, in code, generated
 * fresh every time you press play.
 *
 * What it replaced was one four-chord arpeggio on a `setInterval`, the same in
 * every level, drifting slowly out of time because the wall clock and the
 * audio clock are not the same clock. What it is now:
 *
 * **One motif, four costumes.** Five notes — up a fourth, step down, home —
 * that belong to the penguin rather than to a level. You hear them on the
 * title screen in the major, on the mountain in the minor over a bare fifth,
 * under the ice stretched to half speed and drowned in delay, and in the
 * snowball arena chopped into staccato. Nobody has to notice this. It is why
 * four completely different pieces of music sound like one game.
 *
 * **Layers, not tracks.** Pad, bass, arpeggio, percussion and lead are five
 * separate voices that arrive and leave on their own, driven by what is
 * happening: the pad is always there, the drums only when it is going badly.
 * A level that is going well and a level that is nearly lost do not sound the
 * same, and neither of them was recorded twice.
 *
 * **Scheduled on the audio clock.** A lookahead scheduler wakes every 25ms and
 * queues the next fifth of a second of notes at exact times. `setInterval`
 * cannot do this — it is late by however busy the main thread is, which on a
 * frame where a chapter's worth of ice is being drawn is *very* late, and the
 * beat audibly stumbles exactly when the game gets exciting.
 */

/** Equal temperament, from a MIDI-ish note number. */
const hz = (n) => 440 * 2 ** ((n - 69) / 12);

/**
 * The Pengu motif, in scale degrees.
 *
 * Deliberately singable and deliberately short: it has to survive being
 * played on a square wave at half speed under two hundred metres of ice.
 */
const MOTIF = [
  { deg: 0, at: 0, len: 2 },
  { deg: 3, at: 2, len: 2 },
  { deg: 4, at: 4, len: 3 },
  { deg: 2, at: 8, len: 2 },
  { deg: 0, at: 11, len: 4 },
];

/** Scales, as semitone offsets from the root. */
const SCALES = {
  pentaMajor: [0, 2, 4, 7, 9, 12, 14, 16],
  aeolian: [0, 2, 3, 5, 7, 8, 10, 12],
  lydian: [0, 2, 4, 6, 7, 9, 11, 12],
  dorian: [0, 2, 3, 5, 7, 9, 10, 12],
};

/**
 * The four chapters and the two menus, as arrangements.
 *
 * Every number here was chosen against the thing it plays under: the mountain
 * is slow because you spend it hanging still, the sea is slower and filtered
 * because you are under two hundred metres of water, and the arena is quick
 * and dry because it is the only chapter where standing still is the mistake.
 */
const SCENES = {
  menu: {
    bpm: 74,
    root: 48, // C3
    scale: 'pentaMajor',
    pad: [0, 4, 2, 5],
    bass: [0, 0, 5, 4],
    arp: [0, 2, 4, 5],
    wave: 'triangle',
    cutoff: 1500,
    perc: null,
    motifEvery: 2,
    swing: 0.06,
  },
  shelf: {
    bpm: 100,
    root: 48,
    scale: 'pentaMajor',
    pad: [0, 3, 4, 2],
    bass: [0, 3, 4, 2],
    arp: [0, 2, 4, 6, 4, 2],
    wave: 'triangle',
    cutoff: 2200,
    perc: 'shaker',
    motifEvery: 4,
    swing: 0.08,
  },
  climb: {
    bpm: 82,
    root: 45, // A2 — the mountain sits a third lower and stays there
    scale: 'aeolian',
    pad: [0, 0, 5, 4],
    bass: [0, 0, 5, 4],
    // Bare fourths and fifths: nothing that resolves, because nothing here is
    // resolved until you are standing on top of it.
    arp: [0, 4, 7, 4],
    wave: 'sine',
    cutoff: 1100,
    perc: 'wind',
    motifEvery: 8,
    swing: 0,
  },
  dive: {
    bpm: 66,
    root: 38, // D2
    scale: 'lydian',
    pad: [0, 2, 3, 1],
    bass: [0, 0, 0, 0], // one long pedal note: you are under something heavy
    arp: [0, 3, 5, 7, 5, 3],
    wave: 'sine',
    cutoff: 620,
    perc: 'drip',
    motifEvery: 8,
    swing: 0,
    /** Half speed, and the delay turned up: everything down here is slower. */
    stretch: 2,
    delay: 0.5,
  },
  brawl: {
    bpm: 116,
    root: 40, // E2
    scale: 'dorian',
    pad: [0, 5, 3, 4],
    bass: [0, 0, 5, 5, 3, 3, 4, 4],
    arp: [0, 2, 4, 2],
    wave: 'square',
    cutoff: 2600,
    perc: 'tom',
    motifEvery: 4,
    swing: 0.12,
  },
};

/** Sixteenth notes per bar. Everything is written against this grid. */
const STEPS_PER_BAR = 16;
/** How far ahead notes are queued, and how often the scheduler wakes. */
const LOOKAHEAD = 0.22;
const TICK_MS = 25;

export class Music {
  /**
   * @param {AudioContext} ctx
   * @param {GainNode} out where the music goes — its own bus, not the SFX one
   */
  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = out;
    this.playing = false;
    this.scene = 'menu';
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    /** 0..1, smoothed — how much is going on. */
    this.intensity = 0;
    this._targetIntensity = 0;

    // The one shared effect: a filtered feedback delay. Cheap, and it is the
    // difference between "beeps" and "a room".
    this.bus = ctx.createGain();
    this.tone = ctx.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.frequency.value = 1600;
    this.tone.Q.value = 0.4;
    this.delay = ctx.createDelay(1.2);
    this.delay.delayTime.value = 0.34;
    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0.3;
    this.damp = ctx.createBiquadFilter();
    this.damp.type = 'lowpass';
    this.damp.frequency.value = 1800;

    this.bus.connect(this.tone).connect(out);
    this.tone.connect(this.delay);
    this.delay.connect(this.damp).connect(this.feedback).connect(this.delay);
    this.damp.connect(out);

    /** One noise buffer, reused by every percussion hit that needs one. */
    const frames = Math.floor(ctx.sampleRate * 0.6);
    this.noise = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  }

  get spec() {
    return SCENES[this.scene] ?? SCENES.menu;
  }

  /** Seconds per sixteenth, including whatever stretch the scene asks for. */
  get stepDur() {
    const s = this.spec;
    return (60 / s.bpm / 4) * (s.stretch ?? 1);
  }

  start() {
    if (this.playing || !this.ctx) return;
    this.playing = true;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this._pump(), TICK_MS);
    this._pump();
  }

  stop() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Change scene on the next beat.
   *
   * Not immediately, and this is the whole difference between a soundtrack and
   * a playlist: cutting mid-beat sounds like a mistake even when the two
   * pieces are in the same key. The beat rather than the bar because a bar at
   * menu tempo is three and a quarter seconds, and a player who pressed play
   * three seconds ago has already stopped believing the button did anything.
   */
  setScene(name) {
    if (!SCENES[name] || name === this.scene) return;
    this._pending = name;
  }

  /** How much is going on, 0..1. Smoothed here so callers can be blunt. */
  setIntensity(v) {
    this._targetIntensity = Math.max(0, Math.min(1, v));
  }

  /**
   * Get out of the way of a sound effect.
   *
   * A game where the music and the effects are simply added together is a game
   * where you cannot hear the ice crack. The bus dips for a fifth of a second
   * whenever something important happens and comes straight back — the same
   * trick as a radio voice-over, for the same reason.
   */
  duck(amount = 0.45, time = 0.22) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.bus.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(0.0001, g.value), t);
    g.exponentialRampToValueAtTime(Math.max(0.02, 1 - amount), t + 0.02);
    g.exponentialRampToValueAtTime(1, t + time);
  }

  /* ------------------------------------------------------------------ */

  _pump() {
    if (!this.playing || !this.ctx) return;
    // Intensity eases toward its target once per wake-up rather than per note,
    // so a layer never appears halfway through a beat.
    this.intensity += (this._targetIntensity - this.intensity) * 0.06;

    const horizon = this.ctx.currentTime + LOOKAHEAD;
    let guard = 0;
    while (this.nextTime < horizon && guard++ < 64) {
      if (this.step % 4 === 0 && this._pending) {
        this.scene = this._pending;
        this._pending = null;
        this.step = 0;
        this._applyScene();
      }
      this._schedule(this.step, this.nextTime);
      this.nextTime += this.stepDur;
      this.step++;
    }
  }

  _applyScene() {
    const s = this.spec;
    const t = this.ctx.currentTime;
    this.delay.delayTime.setTargetAtTime(s.delay ?? 0.34, t, 0.3);
    this.feedback.gain.setTargetAtTime(s.delay ? 0.42 : 0.28, t, 0.3);
  }

  /** Scale degree → frequency, with octave wrapping. */
  _note(deg, octave = 0) {
    const s = this.spec;
    const scale = SCALES[s.scale];
    const oct = Math.floor(deg / scale.length) + octave;
    const step = ((deg % scale.length) + scale.length) % scale.length;
    return hz(s.root + scale[step] + oct * 12);
  }

  _voice({ freq, at, dur, wave = 'sine', gain = 0.2, cutoff = null, glide = 0 }) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, at);
    if (glide) osc.frequency.exponentialRampToValueAtTime(freq * glide, at + dur);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + Math.min(0.06, dur * 0.25));
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    let node = osc.connect(env);
    if (cutoff) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = cutoff;
      node = env.connect(lp);
      lp.connect(this.bus);
    } else {
      env.connect(this.bus);
    }
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  _hit({ at, dur = 0.12, gain = 0.2, cutoff = 4000, type = 'highpass' }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = cutoff;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(env).connect(this.bus);
    src.start(at);
    src.stop(at + dur + 0.02);
  }

  /**
   * One sixteenth of music.
   *
   * Everything is decided here from the step number and the current intensity,
   * which is what makes the score endless without repeating in the way a
   * four-bar loop repeats: the same bar is never quite the same twice, because
   * what is happening in the level is never quite the same either.
   */
  _schedule(step, timeAt) {
    const s = this.spec;
    const inBar = step % STEPS_PER_BAR;
    const bar = Math.floor(step / STEPS_PER_BAR);
    const heat = this.intensity;
    // Swing: every other sixteenth arrives late. Off entirely on the mountain
    // and under the ice, where there is no groove to be had.
    const at = timeAt + (inBar % 2 ? this.stepDur * (s.swing ?? 0) : 0);

    // Pad — always. One long chord per bar, the floor everything stands on.
    if (inBar === 0) {
      const deg = s.pad[bar % s.pad.length];
      const dur = this.stepDur * STEPS_PER_BAR * 0.98;
      for (const off of [0, 2, 4]) {
        this._voice({
          freq: this._note(deg + off, 1),
          at,
          dur,
          wave: s.wave,
          gain: 0.035 + 0.02 * heat,
          cutoff: s.cutoff,
        });
      }
    }

    // Bass — from a little effort onward. Roots on the beat, nothing clever.
    if (heat > 0.12 && inBar % 4 === 0) {
      const seq = s.bass;
      const deg = seq[(bar * (STEPS_PER_BAR / 4) + inBar / 4) % seq.length];
      this._voice({
        freq: this._note(deg, 0),
        at,
        dur: this.stepDur * 3.4,
        wave: s.wave === 'square' ? 'sawtooth' : 'sine',
        gain: 0.075 + 0.03 * heat,
        cutoff: 420,
      });
    }

    // Arpeggio — the part that reads as "the tune is moving".
    if (heat > 0.3 && inBar % 2 === 0) {
      const seq = s.arp;
      const i = (step / 2) % seq.length;
      this._voice({
        freq: this._note(seq[i] + (bar % 2 ? 7 : 0), 2),
        at,
        dur: this.stepDur * 1.6,
        wave: s.wave,
        gain: 0.028 + 0.03 * heat,
        cutoff: s.cutoff * 1.4,
      });
    }

    // Percussion — only when it is going badly. Nothing tells a player the
    // level has turned faster than drums arriving.
    if (heat > 0.5 && s.perc) {
      if (s.perc === 'shaker' && inBar % 2 === 1) {
        this._hit({ at, dur: 0.05, gain: 0.05 * heat, cutoff: 6000 });
      }
      if (s.perc === 'tom' && (inBar === 0 || inBar === 6 || inBar === 10)) {
        this._voice({
          freq: 92,
          at,
          dur: 0.2,
          wave: 'sine',
          gain: 0.2 * heat,
          glide: 0.55,
        });
      }
      if (s.perc === 'wind' && inBar === 0) {
        this._hit({ at, dur: this.stepDur * 10, gain: 0.03 * heat, cutoff: 900, type: 'bandpass' });
      }
      if (s.perc === 'drip' && inBar % 8 === 4) {
        this._voice({ freq: 900, at, dur: 0.18, wave: 'sine', gain: 0.05 * heat, glide: 2.2 });
      }
    }

    // The motif. Every few bars, and never while the pad is changing under it.
    const every = s.motifEvery ?? 4;
    if (bar % every === every - 1) {
      for (const n of MOTIF) {
        if (n.at !== inBar) continue;
        this._voice({
          freq: this._note(n.deg + s.pad[bar % s.pad.length], 2),
          at,
          dur: this.stepDur * n.len,
          wave: s.wave === 'square' ? 'triangle' : s.wave,
          gain: 0.055 + 0.02 * heat,
          cutoff: s.cutoff * 1.8,
        });
      }
    }
  }
}
