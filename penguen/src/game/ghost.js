/**
 * Ghost runs.
 *
 * A leaderboard needs a server. Racing someone does not: record the positions
 * of a run, and play them back as a translucent penguin the next time the level
 * is played. Your own best becomes the opponent, and a run can be handed to
 * someone else as a short code — which is the part that makes the timer mean
 * something without any backend at all.
 *
 * Format. Samples are taken on a fixed clock, so a sample's index *is* its
 * timestamp and no time needs storing. Each sample is a delta from the previous
 * one, quantised to a pixel, which keeps almost every delta inside one byte.
 * A shared code is that byte string, base64url'd, with a short header:
 *
 *   PG1.<level>.<centiseconds>.<name>.<body>
 *
 * The name rides along so an imported code can take its place on the board
 * under whoever set it.
 */

import { t } from '../core/i18n.js';

/** Seconds between samples. 20/s is smooth enough to read as a real penguin. */
export const SAMPLE_RATE = 0.05;

/** Refuse to encode runs longer than this — a share code has to stay pasteable. */
const MAX_SAMPLES = 4000;

const MAGIC = 'PG1';

/* ------------------------------------------------------------------ */
/* Recording                                                           */
/* ------------------------------------------------------------------ */

export class GhostRecorder {
  constructor() {
    this.samples = [];
    this.acc = 0;
  }

  reset() {
    this.samples.length = 0;
    this.acc = 0;
  }

  /** Call once per simulation step with the live player. */
  sample(dt, player) {
    this.acc += dt;
    if (this.acc < SAMPLE_RATE) return;
    this.acc -= SAMPLE_RATE;
    if (this.samples.length >= MAX_SAMPLES) return;
    this.samples.push({
      x: Math.round(player.x),
      y: Math.round(player.y),
      f: player.facing < 0 ? -1 : 1,
      // Packed flags, so the ghost visibly jumps, sprints and stumbles too.
      s: (player.onGround ? 1 : 0) | (player.charge > 0 ? 2 : 0) | (player.cursed ? 4 : 0),
    });
  }

  get length() {
    return this.samples.length;
  }
}

/* ------------------------------------------------------------------ */
/* Playback                                                            */
/* ------------------------------------------------------------------ */

export class Ghost {
  /** @param {{samples: Array, time: number, name?: string}} run */
  constructor(run) {
    this.samples = run.samples ?? [];
    this.time = run.time ?? 0;
    this.name = run.name ?? 'Rekor';
    this.t = 0;
    this.x = 0;
    this.y = 0;
    this.facing = 1;
    this.onGround = true;
    this.charged = false;
    this.cursed = false;
    this.finished = false;
    this.visible = this.samples.length > 1;
    if (this.visible) this._apply(0);
  }

  reset() {
    this.t = 0;
    this.finished = false;
    this._apply(0);
  }

  update(dt) {
    if (!this.visible) return;
    this.t += dt;
    const idx = this.t / SAMPLE_RATE;
    if (idx >= this.samples.length - 1) {
      this.finished = true;
      this._apply(this.samples.length - 1);
      return;
    }
    this._apply(idx);
  }

  /** Interpolated so the ghost glides rather than stepping between samples. */
  _apply(idx) {
    const i = Math.max(0, Math.min(this.samples.length - 1, Math.floor(idx)));
    const a = this.samples[i];
    if (!a) return;
    const b = this.samples[Math.min(this.samples.length - 1, i + 1)] ?? a;
    const t = Math.max(0, Math.min(1, idx - i));
    this.x = a.x + (b.x - a.x) * t;
    this.y = a.y + (b.y - a.y) * t;
    this.facing = a.f;
    this.onGround = (a.s & 1) !== 0;
    this.charged = (a.s & 2) !== 0;
    this.cursed = (a.s & 4) !== 0;
  }

  /**
   * How far ahead the player is, in seconds, judged by who reached this x first.
   * Positive means the player is winning.
   */
  leadAt(playerX, playerY = null, axis = 'across') {
    if (!this.visible) return null;
    // On a mountain "how far along" is height, not distance, and y grows
    // downward — so the same scan runs with the comparison flipped.
    const passed =
      axis === 'up' ? (s) => s.y >= playerY : (s) => s.x <= playerX;
    // The ghost's index is its timestamp, so a linear scan back from the
    // current point finds when it passed this point.
    const upto = Math.min(this.samples.length - 1, Math.ceil(this.t / SAMPLE_RATE));
    for (let i = upto; i >= 0; i--) {
      if (passed(this.samples[i])) {
        const ghostTime = i * SAMPLE_RATE;
        return ghostTime - this.t;
      }
    }
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Encoding                                                            */
/* ------------------------------------------------------------------ */

function toBase64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Names are UTF-8: "Ayşe" has to survive the round trip. */
function encodeName(name) {
  const trimmed = String(name ?? '').trim().slice(0, 14);
  if (!trimmed) return '-';
  return toBase64Url(new TextEncoder().encode(trimmed)) || '-';
}

function decodeName(chunk) {
  if (!chunk || chunk === '-') return null;
  try {
    return new TextDecoder().decode(fromBase64Url(chunk)).slice(0, 14) || null;
  } catch {
    return null;
  }
}

function fromBase64Url(str) {
  const pad = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(pad + '==='.slice((pad.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Deltas are written as one signed byte when they fit and as an escape plus
 * two bytes when they don't — which is rare, since 20 samples a second at
 * 320px/s is about 16px of movement per sample.
 */
function writeDelta(out, d) {
  if (d >= -127 && d <= 127) {
    out.push(d & 0xff);
  } else {
    const clamped = Math.max(-32768, Math.min(32767, d));
    out.push(0x80, (clamped >> 8) & 0xff, clamped & 0xff);
  }
}

function readDelta(bytes, cursor) {
  const b = bytes[cursor.i++];
  if (b === 0x80) {
    const hi = bytes[cursor.i++];
    const lo = bytes[cursor.i++];
    let v = (hi << 8) | lo;
    if (v & 0x8000) v -= 0x10000;
    return v;
  }
  return b > 127 ? b - 256 : b;
}

/**
 * @param {{samples:Array, time:number, level:number|string, name?:string}} run
 * @returns {string} a pasteable share code
 */
export function encodeRun(run) {
  const bytes = [];
  let px = 0;
  let py = 0;
  for (const s of run.samples) {
    writeDelta(bytes, s.x - px);
    writeDelta(bytes, s.y - py);
    bytes.push(((s.f < 0 ? 1 : 0) << 3) | (s.s & 7));
    px = s.x;
    py = s.y;
  }
  const body = toBase64Url(Uint8Array.from(bytes));
  // Centiseconds keep the header short and are the precision the timer shows.
  return `${MAGIC}.${run.level}.${Math.round(run.time * 100)}.${encodeName(run.name)}.${body}`;
}

/**
 * @returns {{samples:Array, time:number, level:string, name:string|null}|null}
 *   null when the code is not one of ours or is damaged — a bad paste must
 *   never throw, it must just say "bu kod okunamadı".
 */
export function decodeRun(code) {
  try {
    // Codes get pasted out of chat apps, so tolerate stray whitespace anywhere.
    const parts = String(code).replace(/\s+/g, '').split('.');
    if (parts.length !== 5 || parts[0] !== MAGIC) return null;
    const [, level, cs, nameChunk, body] = parts;
    if (!/^\d+$/.test(cs)) return null;
    const bytes = fromBase64Url(body);
    const cursor = { i: 0 };
    const samples = [];
    let x = 0;
    let y = 0;
    while (cursor.i < bytes.length - 1) {
      x += readDelta(bytes, cursor);
      y += readDelta(bytes, cursor);
      const flags = bytes[cursor.i++];
      if (flags === undefined) break;
      samples.push({ x, y, f: flags & 8 ? -1 : 1, s: flags & 7 });
      if (samples.length > MAX_SAMPLES) return null;
    }
    if (samples.length < 2) return null;
    return {
      samples,
      time: Number(cs) / 100,
      level: String(level),
      name: decodeName(nameChunk),
    };
  } catch {
    return null;
  }
}

/**
 * Stamp a name onto an already-encoded code.
 *
 * The name is a header field, not part of the body, so a player who names
 * themselves after setting a record does not have to set it again.
 */
export function withName(code, name) {
  const parts = String(code).split('.');
  if (parts.length !== 5 || parts[0] !== MAGIC) return code;
  parts[3] = encodeName(name);
  return parts.join('.');
}

/** Human-readable summary line for sharing alongside the code. */
export function shareText({ level, time, deaths, fish, code, daily, name }) {
  const clock = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}.${String(Math.floor((time * 100) % 100)).padStart(2, '0')}`;
  const where = daily ? t('title.daily') : t('ui.levelN', { n: level });
  const lines = [`Pengu · ${where} · ${clock}${name ? ` (${name})` : ''}`];
  // The stats line is skipped when sharing an old run off the board, where
  // only the time was kept.
  if (Number.isFinite(deaths) && Number.isFinite(fish)) {
    lines.push(t('share.stats', { deaths, fish }));
  }
  lines.push('', t('share.challenge'), code);
  return lines.join('\n');
}
