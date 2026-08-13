/**
 * Procedural audio.
 *
 * Every sound is synthesised with the Web Audio API — no asset files, so the
 * game stays a zero-dependency static bundle that works offline.
 */

const NOTES = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, C6: 1046.5 };

export class Audio {
  constructor() {
    this.ctx = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.enabled = { sfx: true, music: true };
    this._musicTimer = null;
    this._step = 0;
  }

  /** Browsers only allow audio after a gesture, so this is called on first input. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.5;
    this.sfxGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.ctx.destination);

    if (this.enabled.music) this.startMusic();
  }

  setEnabled(kind, on) {
    this.enabled[kind] = on;
    if (kind === 'music') on ? this.startMusic() : this.stopMusic();
    if (kind === 'sfx' && this.sfxGain) this.sfxGain.gain.value = on ? 0.5 : 0;
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
    this._noise({ dur: 0.42, gain: 0.3, filter: 3200, q: 1.2 });
    for (let i = 0; i < 4; i++) {
      this._tone({ freq: 1200 + i * 300, slide: -700, dur: 0.2, type: 'triangle', gain: 0.05, delay: i * 0.03 });
    }
  }

  splash() {
    this._noise({ dur: 0.5, gain: 0.32, filter: 520, q: 0.5 });
    this._tone({ freq: 220, slide: -140, dur: 0.35, type: 'sine', gain: 0.12 });
  }

  fish() {
    this._tone({ freq: NOTES.E5, dur: 0.1, type: 'triangle', gain: 0.2 });
    this._tone({ freq: NOTES.G5, dur: 0.14, type: 'triangle', gain: 0.18, delay: 0.07 });
  }

  checkpoint() {
    this._tone({ freq: NOTES.C5, dur: 0.14, type: 'sine', gain: 0.18 });
    this._tone({ freq: NOTES.G5, dur: 0.2, type: 'sine', gain: 0.16, delay: 0.09 });
  }

  win() {
    const seq = [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6];
    seq.forEach((f, i) => this._tone({ freq: f, dur: 0.3, type: 'triangle', gain: 0.2, delay: i * 0.11 }));
  }

  ui(kind = 'tap') {
    const freq = kind === 'back' ? 320 : 640;
    this._tone({ freq, dur: 0.07, type: 'sine', gain: 0.14 });
  }

  /** Slow arpeggio pad — deliberately sparse so it never fights the SFX. */
  startMusic() {
    if (!this.ctx || this._musicTimer || !this.enabled.music) return;
    const chords = [
      [NOTES.C4, NOTES.E4, NOTES.G4],
      [NOTES.A4 / 2, NOTES.C4, NOTES.E4],
      [NOTES.G4 / 2, NOTES.D4, NOTES.G4],
      [NOTES.C4, NOTES.G4, NOTES.C5],
    ];
    const play = () => {
      const chord = chords[Math.floor(this._step / 4) % chords.length];
      const note = chord[this._step % chord.length] * (this._step % 8 < 4 ? 1 : 2);
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      osc.type = 'sine';
      osc.frequency.value = note;
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.exponentialRampToValueAtTime(0.5, t0 + 0.4);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.9);
      osc.connect(lp).connect(env).connect(this.musicGain);
      osc.start(t0);
      osc.stop(t0 + 2);
      this._step++;
    };
    play();
    this._musicTimer = setInterval(play, 900);
  }

  stopMusic() {
    if (this._musicTimer) clearInterval(this._musicTimer);
    this._musicTimer = null;
  }
}
