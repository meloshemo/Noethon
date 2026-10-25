/**
 * What the penguin is *feeling*, as numbers.
 *
 * The bird was drawn correctly and it was not alive. Every part of it moved
 * because the physics moved: the feet stepped because `walkPhase` turned, the
 * body squashed because a landing squashed it, and that was the whole of it.
 * Nothing about him ever *reacted* — the head never lagged behind a start, the
 * eyes never went where he was going, and his face at the bottom of a
 * four-hundred-pixel fall was the same face as standing on a beach.
 *
 * Character animation is mostly two ideas and this file is both of them:
 *
 *   **Lag.** A body is not rigid. When the feet accelerate, the head arrives
 *   late and then overshoots. Every value here is a spring chasing a target
 *   rather than the target itself, which is the difference between a puppet
 *   and a drawing that has been moved.
 *
 *   **Attention.** A creature looks at what matters to it. Where the eyes
 *   point is the cheapest and loudest signal in the whole frame, and this bird
 *   had none — so it now looks where it is going, down when it is falling, at
 *   the bird that is hunting it, and at nothing in particular when it is bored.
 *
 * ---
 *
 * It is a separate file for a reason that matters more than tidiness: **this
 * layer must not be able to change the game.** It reads the player and the
 * world and writes only to itself; the renderer owns it and nothing else ever
 * looks at it. So it runs at frame rate rather than on the fixed step, it can
 * be as expensive or as fanciful as it likes, and no proof of passability in
 * this project has to care that it exists.
 *
 * `tests/pose.mjs` holds that: it runs a level twice, once with an expression
 * layer being driven every frame and once without, and the two runs have to
 * agree to the last pixel.
 */

import { clamp } from '../core/util.js';

/** Spring a value toward a target. `k` is roughly "how fast", 1..30. */
function chase(from, to, k, dt) {
  return from + (to - from) * (1 - Math.exp(-k * dt));
}

/**
 * The moods, in the order they win.
 *
 * A penguin who is drowning *and* being chased is drowning. Ordering them
 * rather than blending them is what keeps the face readable: a blend of four
 * expressions is one expression, and it is called "nothing much".
 */
export const MOODS = ['gasp', 'fear', 'effort', 'rush', 'joy', 'calm'];

export class Pose {
  constructor() {
    /** Body tilt, radians. Positive leans the way he is going. */
    this.lean = 0;
    /** Head offset from where the neck says it should be, in body widths. */
    this.headX = 0;
    this.headY = 0;
    /** Where the eyes point, -1..1 in each axis. */
    this.lookX = 0;
    this.lookY = 0;
    /** Eye opening: 0 shut, 1 normal, 1.4 saucers. */
    this.open = 1;
    /** Brow angle: negative is a frown, positive is worry. */
    this.brow = 0;
    /** Beak opening, 0..1. */
    this.mouth = 0;
    /** The near flipper's extra swing, radians. */
    this.armL = 0;
    this.armR = 0;
    /** Belly wobble, in body heights. */
    this.jiggle = 0;
    /** Seconds spent doing nothing at all. */
    this.idle = 0;
    /** Slow breathing, 0..1. */
    this.breath = 0;
    this.mood = 'calm';
    this._vx = 0;
    this._vy = 0;
    this._t = 0;
  }

  /**
   * @param {number} dt   seconds since the last frame — real time, not sim time
   * @param {object} p    the player, read only
   * @param {object} w    the world, read only
   */
  update(dt, p, w) {
    if (!p) return this;
    const step = Math.min(dt, 0.05);
    this._t += step;

    // Acceleration, measured rather than asked for: the player does not
    // publish one, and a difference over a frame is what a body would feel.
    const ax = step > 0 ? (p.vx - this._vx) / step : 0;
    const ay = step > 0 ? (p.vy - this._vy) / step : 0;
    this._vx = p.vx;
    this._vy = p.vy;

    const still = p.onGround && Math.abs(p.vx) < 12 && !p.clinging;
    this.idle = still ? this.idle + step : 0;

    /* ---------------------------------------------------------- mood */
    const drowning = p.submerged && p.breathMax > 0 && p.breath / p.breathMax < 0.28;
    const hunted = (w?.skuas ?? []).some((s) => s.state === 'warn' || s.state === 'strike');
    const carried = (w?.skuas ?? []).some((s) => s.state === 'carry');
    const falling = !p.onGround && !p.clinging && !p.gliding && p.vy > 520;
    const working = p.clinging || p.climbing;
    const rushing = p.charge > 0 || p.quantum > 0;

    this.mood =
      drowning || carried ? 'gasp'
      : hunted || falling ? 'fear'
      : working ? 'effort'
      : rushing ? 'rush'
      : w?.status === 'won' ? 'joy'
      : 'calm';

    /* ---------------------------------------------------------- lag */
    // The head arrives late and overshoots. Twelve is springy enough to read
    // at a glance and slow enough that it is never mistaken for a wobble.
    const wantHeadX = clamp(-ax / 4200, -0.3, 0.3) - clamp(p.vx / 900, -0.16, 0.16);
    const wantHeadY = clamp(ay / 9000, -0.12, 0.16);
    this.headX = chase(this.headX, wantHeadX, 12, step);
    this.headY = chase(this.headY, wantHeadY, 14, step);

    // The body leans into a start and out of a stop. Clinging cancels it: a
    // bird holding a wall is pressed flat against it.
    const wantLean = p.clinging ? 0 : clamp(p.vx / 1400, -0.2, 0.2) + clamp(ax / 26000, -0.1, 0.1);
    this.lean = chase(this.lean, wantLean, 9, step);

    // Loose fat over a moving skeleton.
    this.jiggle = chase(this.jiggle, clamp(-ay / 26000, -0.05, 0.05), 18, step);

    /* ------------------------------------------------------ attention */
    let lx = clamp(p.vx / 260, -1, 1);
    let ly = clamp(p.vy / 520, -1, 1);
    if (this.mood === 'fear' && hunted) {
      // At the thing that is coming, which is the only place a real animal
      // would be looking.
      const s = (w.skuas ?? []).find((k) => k.state === 'warn' || k.state === 'strike');
      if (s) {
        lx = clamp((s.x - (p.x + p.w / 2)) / 260, -1, 1);
        ly = clamp((s.y - (p.y + p.h * 0.3)) / 200, -1, 1);
      }
    } else if (this.idle > 1.6) {
      // Bored: a slow look around, and never quite level, so it reads as a
      // creature thinking rather than a head on a motor.
      lx = Math.sin(this._t * 0.7) * 0.8;
      ly = Math.sin(this._t * 0.31 + 1.1) * 0.35 - 0.1;
    }
    this.lookX = chase(this.lookX, lx, 10, step);
    this.lookY = chase(this.lookY, ly, 10, step);

    /* ------------------------------------------------------- the face */
    const face = {
      gasp: { open: 1.35, brow: 0.5, mouth: 0.85 },
      fear: { open: 1.42, brow: 0.62, mouth: 0.5 },
      effort: { open: 0.72, brow: -0.55, mouth: 0.3 },
      rush: { open: 1.1, brow: -0.35, mouth: 0.42 },
      joy: { open: 1.15, brow: 0.15, mouth: 0.7 },
      calm: { open: 1, brow: 0, mouth: 0 },
    }[this.mood];
    this.open = chase(this.open, face.open, 16, step);
    this.brow = chase(this.brow, face.brow, 14, step);
    // The beak flutters when he is out of air rather than hanging open, which
    // is the difference between panting and a broken jaw.
    const pant = this.mood === 'gasp' ? 0.6 + 0.4 * Math.sin(this._t * 13) : 1;
    this.mouth = chase(this.mouth, face.mouth * pant, 18, step);

    /* ------------------------------------------------------- the arms */
    // Up in fright, back at speed, out for balance on a narrow perch.
    const wantArm =
      this.mood === 'fear' ? -1.15
      : this.mood === 'rush' ? 0.55
      : p.gliding ? 0
      : still ? 0.12 * Math.sin(this._t * 1.4)
      : 0;
    this.armL = chase(this.armL, wantArm, 11, step);
    this.armR = chase(this.armR, wantArm * (this.mood === 'fear' ? 1 : 0.7), 11, step);

    // Breathing: slow when calm, quick when he has been running.
    const rate = this.mood === 'gasp' ? 5.5 : this.mood === 'rush' ? 3.4 : 1.5;
    this.breath = (Math.sin(this._t * rate) + 1) / 2;

    return this;
  }
}
