/**
 * Pooled particle system.
 *
 * Particles are pre-allocated once and recycled, so no garbage is created
 * during play — important for staying at a steady 60fps on phones.
 */

import { rand, randInt } from './util.js';

const MAX = 320;

export class Particles {
  constructor() {
    this.pool = Array.from({ length: MAX }, () => ({ alive: false }));
    this.cursor = 0;
    this.intensity = 1; // 0 when "reduced motion" is on
  }

  _acquire() {
    // Ring buffer: if everything is busy the oldest particle is stolen.
    for (let i = 0; i < MAX; i++) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % MAX;
      if (!p.alive) return p;
    }
    return this.pool[this.cursor];
  }

  spawn(opts) {
    if (this.intensity <= 0) return;
    const p = this._acquire();
    p.alive = true;
    p.x = opts.x;
    p.y = opts.y;
    p.vx = opts.vx ?? 0;
    p.vy = opts.vy ?? 0;
    p.gravity = opts.gravity ?? 900;
    p.drag = opts.drag ?? 0.02;
    p.life = opts.life ?? 0.6;
    p.maxLife = p.life;
    p.size = opts.size ?? 3;
    p.color = opts.color ?? '#e8f6ff';
    p.shape = opts.shape ?? 'shard';
    p.rot = opts.rot ?? rand(Math.PI * 2);
    p.spin = opts.spin ?? rand(6, -6);
    p.fade = opts.fade ?? true;
  }

  /** Ice shards flying out of a collapsing floe. */
  burstIce(x, y, count = 12, spread = 40) {
    const n = Math.round(count * this.intensity);
    for (let i = 0; i < n; i++) {
      this.spawn({
        x: x + rand(spread, -spread),
        y: y + rand(6, -6),
        vx: rand(190, -190),
        vy: rand(-40, -300),
        size: rand(6, 2),
        life: rand(1.1, 0.5),
        color: ['#ffffff', '#d9f0ff', '#a8dcf5'][randInt(0, 2)],
        shape: 'shard',
      });
    }
  }

  /** Soft snow puff for landings and footsteps. */
  puff(x, y, count = 8, dir = 0) {
    const n = Math.round(count * this.intensity);
    for (let i = 0; i < n; i++) {
      this.spawn({
        x: x + rand(10, -10),
        y,
        vx: rand(90, -90) + dir * 60,
        vy: rand(-20, -110),
        gravity: 260,
        size: rand(5, 2),
        life: rand(0.6, 0.25),
        color: 'rgba(255,255,255,0.82)',
        shape: 'dot',
      });
    }
  }

  splash(x, y) {
    const n = Math.round(22 * this.intensity);
    for (let i = 0; i < n; i++) {
      this.spawn({
        x: x + rand(14, -14),
        y,
        vx: rand(170, -170),
        vy: rand(-120, -400),
        gravity: 1100,
        size: rand(5, 2),
        life: rand(0.9, 0.4),
        color: ['#7fd4ff', '#bde9ff', '#ffffff'][randInt(0, 2)],
        shape: 'dot',
      });
    }
  }

  sparkle(x, y, color = '#ffd76a') {
    const n = Math.round(14 * this.intensity);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.spawn({
        x,
        y,
        vx: Math.cos(a) * rand(180, 60),
        vy: Math.sin(a) * rand(180, 60) - 40,
        gravity: 220,
        size: rand(4, 2),
        life: rand(0.8, 0.4),
        color,
        shape: 'star',
      });
    }
  }

  update(dt) {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.vx *= 1 - p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
  }

  draw(ctx) {
    for (const p of this.pool) {
      if (!p.alive) continue;
      const t = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = p.fade ? Math.min(1, t * 1.6) : 1;
      ctx.translate(p.x, p.y);
      ctx.fillStyle = p.color;
      if (p.shape === 'dot') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (0.4 + t * 0.6), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        ctx.rotate(p.rot);
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.32, -s * 0.32);
        ctx.lineTo(s, 0);
        ctx.lineTo(s * 0.32, s * 0.32);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.32, s * 0.32);
        ctx.lineTo(-s, 0);
        ctx.lineTo(-s * 0.32, -s * 0.32);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.72);
      }
      ctx.restore();
    }
  }

  clear() {
    for (const p of this.pool) p.alive = false;
  }
}
