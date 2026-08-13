/**
 * Canvas renderer.
 *
 * Everything is drawn procedurally — no image assets — so the whole game is a
 * handful of text files that load instantly and scale to any resolution.
 *
 * Draw order: sky → aurora → stars → parallax bergs → water → floes → props →
 * hazards → penguin → particles → weather → post effects.
 */

import { VIEW, VIEW_LIMITS } from './config.js';
import { clamp, lerp, makeRng } from '../core/util.js';

const PALETTE = {
  skyTop: '#08132a',
  skyMid: '#122c50',
  skyLow: '#28618c',
  horizon: '#5aa0c0',
  iceTop: '#f2fbff',
  iceFace: '#cfeaf8',
  iceSide: '#9cc9e2',
  iceDeep: '#6ea4c2',
  water: '#0a2340',
  waterLight: '#134066',
  crack: '#4aa3d8',
  trap: '#c9556b',
  melt: '#8fd8ef',
  burst: '#63e0ff',
  snap: '#b9c8d8',
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dpr = 1;
    this.reducedMotion = false;
    this.snow = Array.from({ length: 90 }, () => ({
      x: Math.random() * VIEW.w,
      y: Math.random() * VIEW.h,
      r: 0.6 + Math.random() * 2.2,
      s: 8 + Math.random() * 26,
      d: Math.random() * Math.PI * 2,
      layer: Math.random(),
    }));
    this.stars = Array.from({ length: 70 }, () => ({
      x: Math.random() * VIEW.w * 1.4,
      y: Math.random() * VIEW.h * 0.55,
      r: 0.4 + Math.random() * 1.3,
      tw: Math.random() * Math.PI * 2,
    }));
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => this.resize());
    // The stage can change size without the window doing so (aspect-ratio box,
    // on-screen keyboard, browser chrome collapsing on scroll).
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    }
  }

  /**
   * Fit the logical viewport to the real one.
   *
   * The logical height is the anchor (so the penguin and the jump arc are the
   * same physical size everywhere) and the width follows the aspect ratio, so
   * the canvas fills the screen edge to edge instead of being letterboxed.
   */
  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const cw = Math.max(1, rect.width);
    const ch = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const aspect = cw / ch;
    const L = VIEW_LIMITS;

    VIEW.w = Math.round(clamp(L.baseH * aspect, L.minW, L.maxW));
    VIEW.h = Math.round(clamp(VIEW.w / aspect, L.minH, L.maxH));

    // Uniform scale; the clamps above only bind on extreme aspect ratios, and
    // then the leftover is centred rather than stretched.
    const scale = Math.min(cw / VIEW.w, ch / VIEW.h);
    this.viewScale = scale;
    this.offsetX = (cw - VIEW.w * scale) / 2;
    this.offsetY = (ch - VIEW.h * scale) / 2;
    this.dpr = dpr;

    this.canvas.style.width = `${cw}px`;
    this.canvas.style.height = `${ch}px`;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);

    // Snowflakes are laid out in logical space, so respread them on resize.
    for (const f of this.snow) {
      if (f.x > VIEW.w) f.x = Math.random() * VIEW.w;
      if (f.y > VIEW.h) f.y = Math.random() * VIEW.h;
    }
  }

  /** @param {import('./world.js').World} world */
  draw(world, particles, time) {
    const ctx = this.ctx;
    const s = this.viewScale * this.dpr;
    // Clear the full backing store first — the letterbox strips that appear at
    // extreme aspect ratios must not keep last frame's pixels.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.skyTop;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.setTransform(s, 0, 0, s, this.offsetX * this.dpr, this.offsetY * this.dpr);
    ctx.imageSmoothingEnabled = true;

    const shake = this.reducedMotion ? 0 : world.camera.shake;
    const camX = world.camera.x + (shake ? (Math.random() - 0.5) * shake : 0);
    const camY = world.camera.y + (shake ? (Math.random() - 0.5) * shake : 0);

    this._sky(ctx, camX, time);
    this._parallax(ctx, camX, camY, time);
    this._water(ctx, world, camX, camY, time);

    ctx.save();
    ctx.translate(-camX, -camY);
    this._signs(ctx, world);
    this._floes(ctx, world, time);
    this._geysers(ctx, world, time);
    this._checkpoints(ctx, world, time);
    this._fish(ctx, world, time);
    this._goal(ctx, world, time);
    this._hazards(ctx, world, time);
    if (world.status !== 'dying') this._penguin(ctx, world, time);
    particles.draw(ctx);
    ctx.restore();

    this._weather(ctx, time);
    if (world.fog) this._fog(ctx, world.fog, time);
    this._post(ctx, world);

    ctx.restore();
  }

  /* ---------------------------------------------------------------- */

  _sky(ctx, camX, time) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(0.45, PALETTE.skyMid);
    g.addColorStop(0.82, PALETTE.skyLow);
    g.addColorStop(1, PALETTE.horizon);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);

    // Stars
    for (const st of this.stars) {
      const x = (st.x - camX * 0.08) % (VIEW.w * 1.4);
      const alpha = 0.35 + 0.4 * Math.sin(time * 1.4 + st.tw);
      ctx.globalAlpha = clamp(alpha, 0, 1) * 0.9;
      ctx.fillStyle = '#dff2ff';
      ctx.beginPath();
      ctx.arc(x < 0 ? x + VIEW.w * 1.4 : x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this._aurora(ctx, camX, time);
  }

  _aurora(ctx, camX, time) {
    const t = this.reducedMotion ? 0 : time;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bands = [
      { hue: 160, y: 90, amp: 26, alpha: 0.16, speed: 0.22 },
      { hue: 190, y: 130, amp: 34, alpha: 0.13, speed: 0.16 },
      { hue: 275, y: 76, amp: 20, alpha: 0.1, speed: 0.3 },
    ];
    for (const b of bands) {
      const grad = ctx.createLinearGradient(0, b.y - 60, 0, b.y + 110);
      grad.addColorStop(0, `hsla(${b.hue}, 90%, 65%, 0)`);
      grad.addColorStop(0.45, `hsla(${b.hue}, 90%, 68%, ${b.alpha})`);
      grad.addColorStop(1, `hsla(${b.hue}, 90%, 70%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, VIEW.h);
      for (let x = 0; x <= VIEW.w; x += 24) {
        const wx = x + camX * 0.05;
        const y = b.y + Math.sin(wx * 0.006 + t * b.speed) * b.amp + Math.sin(wx * 0.013 + t * b.speed * 1.7) * b.amp * 0.5;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      for (let x = VIEW.w; x >= 0; x -= 24) {
        const wx = x + camX * 0.05;
        const y = b.y + 120 + Math.sin(wx * 0.006 + t * b.speed) * b.amp;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _parallax(ctx, camX, camY, time) {
    // Aerial perspective: distant ridges are hazy and light, near ones are
    // darker. That keeps the white floes reading clearly against the backdrop.
    const layers = [
      { depth: 0.14, y: 372, color: 'rgba(146,186,216,0.30)', step: 210, amp: 64 },
      { depth: 0.3, y: 400, color: 'rgba(96,142,184,0.42)', step: 168, amp: 48 },
      { depth: 0.5, y: 428, color: 'rgba(52,94,140,0.58)', step: 130, amp: 34 },
    ];
    for (const l of layers) {
      const off = -camX * l.depth;
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.moveTo(-40, VIEW.h);
      const start = Math.floor(-off / l.step) - 2;
      for (let i = start; i < start + Math.ceil(VIEW.w / l.step) + 4; i++) {
        const px = i * l.step + off;
        const peak = l.y - Math.abs(Math.sin(i * 2.7)) * l.amp - camY * l.depth * 0.4;
        ctx.lineTo(px, l.y - camY * l.depth * 0.4);
        ctx.lineTo(px + l.step * 0.5, peak);
        ctx.lineTo(px + l.step, l.y - camY * l.depth * 0.4);
      }
      ctx.lineTo(VIEW.w + 40, VIEW.h);
      ctx.closePath();
      ctx.fill();
    }

    // Depth wash toward the sea line so the floes feel like they float.
    const wash = ctx.createLinearGradient(0, VIEW.h * 0.62, 0, VIEW.h);
    wash.addColorStop(0, 'rgba(8,24,48,0)');
    wash.addColorStop(1, 'rgba(8,24,48,0.55)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, VIEW.h * 0.62, VIEW.w, VIEW.h * 0.38);
  }

  _water(ctx, world, camX, camY, time) {
    const surfaceY = world.waterY - camY;
    const g = ctx.createLinearGradient(0, surfaceY, 0, VIEW.h);
    g.addColorStop(0, PALETTE.waterLight);
    g.addColorStop(1, PALETTE.water);
    ctx.fillStyle = g;
    ctx.fillRect(0, surfaceY, VIEW.w, VIEW.h - surfaceY);

    const t = this.reducedMotion ? 0 : time;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = 'rgba(190,232,255,0.55)';
    ctx.lineWidth = 2;
    for (let row = 0; row < 3; row++) {
      ctx.beginPath();
      const yBase = surfaceY + 4 + row * 13;
      for (let x = 0; x <= VIEW.w; x += 10) {
        const y = yBase + Math.sin((x + camX * 0.5) * 0.03 + t * (1.4 + row * 0.4) + row) * (3 - row * 0.6);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.globalAlpha = 0.45 - row * 0.12;
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------------- */

  _floeShape(floe) {
    if (floe._shape && floe._shapeW === floe.w) return floe._shape;
    const rng = makeRng(floe.id * 977 + 41);
    const pts = [];
    const steps = Math.max(4, Math.round(floe.w / 32));
    for (let i = 0; i <= steps; i++) {
      pts.push({ x: (i / steps) * floe.w, y: (rng() - 0.5) * 4 });
    }
    floe._shape = pts;
    floe._shapeW = floe.w;
    floe._lipL = 6 + rng() * 8;
    floe._lipR = 6 + rng() * 8;
    return pts;
  }

  _floes(ctx, world, time) {
    for (const f of world.floes) {
      if (f.solidity <= 0.02) continue;
      const shape = this._floeShape(f);
      const shakeX = this.reducedMotion ? 0 : f.shakeOffset(time);
      const alpha = clamp(f.solidity, 0, 1);
      const shrink = f.type === 'melt' ? lerp(0.55, 1, alpha) : 1;
      const w = f.w * shrink;
      const x = f.x + (f.w - w) / 2 + shakeX;
      const y = f.y;
      const depth = 26;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Underside / submerged mass
      ctx.fillStyle = PALETTE.iceSide;
      ctx.beginPath();
      ctx.moveTo(x - f._lipL * shrink, y + 4);
      ctx.lineTo(x + w + f._lipR * shrink, y + 4);
      ctx.lineTo(x + w - 12, y + depth);
      ctx.lineTo(x + 12, y + depth);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = PALETTE.iceDeep;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + depth);
      ctx.lineTo(x + w - 12, y + depth);
      ctx.lineTo(x + w - 26, y + depth + 9);
      ctx.lineTo(x + 26, y + depth + 9);
      ctx.closePath();
      ctx.fill();

      // Top slab
      const g = ctx.createLinearGradient(0, y - 6, 0, y + 12);
      g.addColorStop(0, PALETTE.iceTop);
      g.addColorStop(1, PALETTE.iceFace);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - f._lipL * shrink, y + 5);
      for (const p of shape) ctx.lineTo(x + p.x * shrink, y + p.y);
      ctx.lineTo(x + w + f._lipR * shrink, y + 5);
      ctx.closePath();
      ctx.fill();

      // Rim light
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < shape.length; i++) {
        const p = shape[i];
        i === 0 ? ctx.moveTo(x + p.x * shrink, y + p.y) : ctx.lineTo(x + p.x * shrink, y + p.y);
      }
      ctx.stroke();

      this._floeDecor(ctx, f, x, y, w, time);
      ctx.restore();
    }
  }

  _floeDecor(ctx, f, x, y, w, time) {
    const cx = x + w / 2;
    if (f.type === 'crack' || (f.state === 'cracking' && f.type !== 'trap')) {
      const progress = f.state === 'cracking' ? 1 - clamp(f.timer / f.breakDelay(), 0, 1) : 0.25;
      ctx.strokeStyle = `rgba(74,163,216,${0.5 + progress * 0.5})`;
      ctx.lineWidth = 1 + progress * 2;
      const rng = makeRng(f.id * 31 + 7);
      const branches = 3;
      for (let b = 0; b < branches; b++) {
        ctx.beginPath();
        let px = x + w * (0.22 + b * 0.28);
        let py = y + 3;
        ctx.moveTo(px, py);
        const segs = 3 + Math.round(progress * 3);
        for (let i = 0; i < segs; i++) {
          px += (rng() - 0.5) * 26;
          py += 4 + rng() * 5;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }

    if (f.type === 'trap') {
      // Fair play: traps always carry a faint warm vein so they can be read.
      ctx.strokeStyle = 'rgba(201,85,107,0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.16, y + 6);
      ctx.lineTo(x + w * 0.38, y + 2);
      ctx.lineTo(x + w * 0.58, y + 8);
      ctx.lineTo(x + w * 0.86, y + 3);
      ctx.stroke();
    }

    if (f.type === 'slip') {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const sx = x + w * (0.2 + i * 0.28);
        ctx.beginPath();
        ctx.moveTo(sx, y + 9);
        ctx.lineTo(sx + 22, y + 9);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }

    if (f.type === 'melt') {
      ctx.fillStyle = 'rgba(143,216,239,0.55)';
      for (let i = 0; i < 3; i++) {
        const dx = x + w * (0.25 + i * 0.25);
        const drip = 4 + Math.sin(time * 3 + i + f.id) * 3;
        ctx.beginPath();
        ctx.ellipse(dx, y + 22 + drip, 2.4, 4 + drip * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (f.type === 'move') {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      const dir = Math.abs(f.ax) > Math.abs(f.ay);
      ctx.save();
      ctx.translate(cx, y + 13);
      if (!dir) ctx.rotate(Math.PI / 2);
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sgn * 16, -4);
        ctx.lineTo(sgn * 24, 0);
        ctx.lineTo(sgn * 16, 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    if (f.type === 'burst') {
      // A ring of bubbling holes; the ice bulges and glows as pressure builds.
      const heat = f.state === 'arming' || f.state === 'erupting' ? Math.max(f.plume, 0.15) : 0.15;
      ctx.fillStyle = `rgba(99,224,255,${0.25 + heat * 0.6})`;
      for (let i = 0; i < 4; i++) {
        const bx = x + w * (0.2 + i * 0.2);
        const r = 2.5 + Math.sin(time * 7 + i * 1.7) * 1.2 + heat * 3;
        ctx.beginPath();
        ctx.arc(bx, y + 10, r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (heat > 0.2) {
        ctx.strokeStyle = `rgba(99,224,255,${heat})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, y + 8, 14 + heat * 16, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (f.type === 'snap') {
      // The tell: a single hairline seam. Present but easy to miss the first
      // time, obvious once you know to look for it.
      ctx.strokeStyle = 'rgba(140,164,190,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.12, y + 4);
      ctx.lineTo(x + w * 0.88, y + 6);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(140,164,190,0.3)';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5, y + 5);
      ctx.lineTo(x + w * 0.46, y + 16);
      ctx.stroke();
    }

    if (f.type === 'fall') {
      ctx.strokeStyle = 'rgba(120,150,180,0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 14);
      ctx.lineTo(x + w - 10, y + 14);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /* ---------------------------------------------------------------- */

  _signs(ctx, world) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const s of world.signs) {
      ctx.font = '600 15px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
      const wpx = ctx.measureText(s.text).width + 28;
      ctx.fillStyle = 'rgba(6,20,40,0.55)';
      roundRect(ctx, s.x - wpx / 2, s.y - 17, wpx, 34, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,220,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#dff2ff';
      ctx.fillText(s.text, s.x, s.y);
    }
    ctx.restore();
  }

  _fish(ctx, world, time) {
    for (const f of world.fish) {
      if (f.taken) continue;
      const bob = Math.sin(f.phase) * 4;
      ctx.save();
      ctx.translate(f.x + f.w / 2, f.y + f.h / 2 + bob);
      ctx.rotate(Math.sin(f.phase * 0.7) * 0.16);

      ctx.shadowColor = 'rgba(255,196,84,0.55)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffc45a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(17, -6);
      ctx.lineTo(17, 6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#7a4a10';
      ctx.beginPath();
      ctx.arc(-5, -1.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Water columns for erupting geysers — drawn over the ice, under the bird. */
  _geysers(ctx, world, time) {
    for (const f of world.floes) {
      if (!f.isBurst || f.plume <= 0.02) continue;
      const cx = f.x + f.w / 2;
      const erupting = f.state === 'erupting';
      const h = erupting ? 40 + f.plume * 210 : 12 + f.plume * 26;
      const wRaw = f.w * (erupting ? 0.62 : 0.34);

      ctx.save();
      const g = ctx.createLinearGradient(0, f.y - h, 0, f.y + 10);
      g.addColorStop(0, 'rgba(190,240,255,0)');
      g.addColorStop(0.35, `rgba(150,230,255,${0.55 * f.plume})`);
      g.addColorStop(1, `rgba(255,255,255,${0.8 * f.plume})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - wRaw / 2, f.y + 8);
      ctx.quadraticCurveTo(cx - wRaw * 0.34, f.y - h * 0.6, cx - wRaw * 0.1, f.y - h);
      ctx.lineTo(cx + wRaw * 0.1, f.y - h);
      ctx.quadraticCurveTo(cx + wRaw * 0.34, f.y - h * 0.6, cx + wRaw / 2, f.y + 8);
      ctx.closePath();
      ctx.fill();

      // Spray specks so the column reads as water, not a beam of light.
      ctx.fillStyle = `rgba(235,250,255,${0.7 * f.plume})`;
      for (let i = 0; i < 7; i++) {
        const t = ((time * 2.4 + i * 0.31) % 1);
        const sy = f.y - t * h;
        const sx = cx + Math.sin(i * 3.1 + time * 5) * wRaw * 0.45 * t;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.6 + (1 - t) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  _checkpoints(ctx, world, time) {
    for (const c of world.checkpoints) {
      const sway = Math.sin(time * 2 + c.x) * 3;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.strokeStyle = '#c9e8ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -46);
      ctx.stroke();

      ctx.fillStyle = c.active ? '#5ce1a6' : 'rgba(200,230,255,0.4)';
      ctx.beginPath();
      ctx.moveTo(2, -46);
      ctx.lineTo(26 + sway, -38);
      ctx.lineTo(2, -30);
      ctx.closePath();
      ctx.fill();

      if (c.pulse > 0) {
        ctx.globalAlpha = c.pulse * 0.6;
        ctx.strokeStyle = '#5ce1a6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -24, 30 + (1 - c.pulse) * 40, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _goal(ctx, world, time) {
    const { x, y } = world.goal;
    const bob = Math.sin(time * 1.6) * 3;
    ctx.save();
    ctx.translate(x, y + bob);

    // Glow beacon
    const g = ctx.createRadialGradient(0, -40, 4, 0, -40, 90);
    g.addColorStop(0, 'rgba(120,255,205,0.35)');
    g.addColorStop(1, 'rgba(120,255,205,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-90, -130, 180, 180);

    // Raft
    ctx.fillStyle = '#8a5a35';
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(i * 11 - 5, -12, 10, 14);
    }
    ctx.fillStyle = '#6d4527';
    ctx.fillRect(-30, -4, 60, 5);

    // Mast + flag
    ctx.strokeStyle = '#e6f3ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, -66);
    ctx.stroke();

    const wave = Math.sin(time * 4) * 4;
    ctx.fillStyle = '#5ce1a6';
    ctx.beginPath();
    ctx.moveTo(2, -66);
    ctx.quadraticCurveTo(22, -60 + wave, 40, -54);
    ctx.lineTo(2, -44);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _hazards(ctx, world, time) {
    for (const h of world.hazards) {
      if (h.kind === 'icicle') {
        const shakeX = h.state === 'warn' ? Math.sin(time * 60) * 2.4 : 0;
        ctx.save();
        ctx.translate(h.x + shakeX, h.y);
        ctx.fillStyle = h.state === 'warn' ? '#ffe6ea' : '#dff1fb';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(h.w, 0);
        ctx.lineTo(h.w / 2, h.h);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (h.state === 'idle') {
          ctx.strokeStyle = 'rgba(223,241,251,0.25)';
          ctx.setLineDash([4, 8]);
          ctx.beginPath();
          ctx.moveTo(h.w / 2, h.h);
          ctx.lineTo(h.w / 2, h.h + 260);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      } else if (h.kind === 'seal') {
        ctx.save();
        ctx.translate(h.x + h.w / 2, h.y + h.h);
        ctx.scale(h.dir, 1);
        const wob = Math.sin(time * 6) * 1.5;
        ctx.fillStyle = '#586b82';
        ctx.beginPath();
        ctx.ellipse(0, -11 + wob * 0.3, 22, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(16, -16, 9, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-20, -12);
        ctx.lineTo(-32, -20 + wob);
        ctx.lineTo(-30, -6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0d1622';
        ctx.beginPath();
        ctx.arc(20, -18, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c9d7e6';
        ctx.beginPath();
        ctx.ellipse(0, -6, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (h.kind === 'orca') {
        // Warning fin cutting the surface, then the breach itself.
        const ocx = h.x + h.w / 2;
        if (h.rise <= 0.12) {
          const wob = Math.sin(time * 5) * 3;
          const fy = h.baseY + h.h * 0.5;
          ctx.save();
          ctx.fillStyle = 'rgba(22,34,52,0.85)';
          ctx.beginPath();
          ctx.moveTo(ocx - 12 + wob, fy);
          ctx.lineTo(ocx + wob, fy - 22);
          ctx.lineTo(ocx + 12 + wob, fy);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(190,232,255,0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(ocx + wob, fy + 2, 34, 6, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(ocx, h.y + h.h / 2);
          ctx.rotate(-0.35 + (1 - h.rise) * 0.7);
          // Body
          ctx.fillStyle = '#16202e';
          ctx.beginPath();
          ctx.ellipse(0, 0, 30, 62, 0, 0, Math.PI * 2);
          ctx.fill();
          // Belly
          ctx.fillStyle = '#eef6ff';
          ctx.beginPath();
          ctx.ellipse(4, 22, 16, 34, 0, 0, Math.PI * 2);
          ctx.fill();
          // Eye patch
          ctx.beginPath();
          ctx.ellipse(-11, -30, 8, 5, -0.4, 0, Math.PI * 2);
          ctx.fill();
          // Dorsal fin
          ctx.fillStyle = '#16202e';
          ctx.beginPath();
          ctx.moveTo(-24, -6);
          ctx.lineTo(-46, -30);
          ctx.lineTo(-22, -34);
          ctx.closePath();
          ctx.fill();
          // Jaw line
          ctx.strokeStyle = 'rgba(240,250,255,0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-6, -52);
          ctx.quadraticCurveTo(14, -44, 18, -28);
          ctx.stroke();
          ctx.restore();
        }
      } else if (h.kind === 'gust') {
        ctx.save();
        ctx.globalAlpha = 0.22;
        const dir = Math.sign(h.power ?? 1);
        ctx.strokeStyle = '#bfe8ff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
          const yy = h.y + 22 + i * (h.h / 7);
          const t = (time * (this.reducedMotion ? 0 : 1) * 260 * dir + i * 90) % (h.w + 120);
          const sx = dir > 0 ? h.x - 60 + t : h.x + h.w + 60 - t;
          ctx.beginPath();
          ctx.moveTo(sx, yy);
          ctx.lineTo(sx + 46 * dir, yy);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#bfe8ff';
        ctx.fillRect(h.x, h.y, h.w, h.h);
        ctx.restore();
      }
    }
  }

  /* ---------------------------------------------------------------- */

  _penguin(ctx, world, time) {
    const p = world.player;
    const cx = p.x + p.w / 2;
    const by = p.y + p.h;
    const sx = p.squashX;
    const sy = p.squashY;
    const s = p.scale;

    // Down colour darkens as the chick grows up.
    const t = clamp((s - 1) / 0.62, 0, 1);
    const body = `rgb(${Math.round(lerp(88, 26, t))}, ${Math.round(lerp(100, 36, t))}, ${Math.round(lerp(118, 52, t))})`;

    ctx.save();
    ctx.translate(cx, by);
    ctx.scale(sx, sy);
    ctx.translate(-cx, -by);

    // Shadow on the floe
    if (p.onGround) {
      ctx.fillStyle = 'rgba(10,30,50,0.18)';
      ctx.beginPath();
      ctx.ellipse(cx, by + 2, p.w * 0.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const step = p.onGround ? Math.sin(p.walkPhase) : 0;
    const footY = by - 1;

    // Feet
    ctx.fillStyle = '#ff9c3f';
    for (const sgn of [-1, 1]) {
      const fx = cx + sgn * p.w * 0.24 + (sgn === 1 ? step * 3 : -step * 3);
      ctx.beginPath();
      ctx.ellipse(fx, footY, p.w * 0.17, p.h * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body
    const bodyH = p.h * 0.82;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(cx, by - bodyH * 0.5, p.w * 0.46, bodyH * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = '#f6fbff';
    ctx.beginPath();
    ctx.ellipse(cx + p.facing * p.w * 0.05, by - bodyH * 0.44, p.w * 0.29, bodyH * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flipper — flaps in the air
    const flap = p.onGround ? step * 0.25 : Math.sin(time * 16) * 0.7;
    ctx.save();
    ctx.translate(cx - p.facing * p.w * 0.38, by - bodyH * 0.62);
    ctx.rotate(p.facing * (0.25 + flap));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, p.h * 0.12, p.w * 0.12, p.h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Head
    const headY = by - bodyH - p.h * 0.06;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(cx + p.facing * p.w * 0.04, headY, p.w * 0.34, p.h * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ff9c3f';
    ctx.beginPath();
    ctx.moveTo(cx + p.facing * p.w * 0.3, headY + p.h * 0.01);
    ctx.lineTo(cx + p.facing * p.w * 0.52, headY + p.h * 0.05);
    ctx.lineTo(cx + p.facing * p.w * 0.3, headY + p.h * 0.09);
    ctx.closePath();
    ctx.fill();

    // Eyes
    const blinking = p.blink < 0;
    for (const sgn of [-1, 1]) {
      const ex = cx + p.facing * p.w * 0.12 + sgn * p.w * 0.12;
      if (blinking) {
        ctx.strokeStyle = '#0e1723';
        ctx.lineWidth = Math.max(1, p.w * 0.035);
        ctx.beginPath();
        ctx.moveTo(ex - p.w * 0.06, headY - p.h * 0.03);
        ctx.lineTo(ex + p.w * 0.06, headY - p.h * 0.03);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(ex, headY - p.h * 0.03, p.w * 0.075, p.h * 0.065, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0e1723';
        ctx.beginPath();
        ctx.arc(ex + p.facing * p.w * 0.02, headY - p.h * 0.03, p.w * 0.038, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // A tuft of down — the "newly hatched" tell, shrinks as it grows
    if (t < 0.75) {
      ctx.strokeStyle = body;
      ctx.lineWidth = Math.max(1.4, p.w * 0.05);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, headY - p.h * 0.2);
      ctx.lineTo(cx - p.facing * p.w * 0.08, headY - p.h * 0.32 * (1 - t * 0.5));
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    ctx.restore();
  }

  /* ---------------------------------------------------------------- */

  _weather(ctx, time) {
    if (this.reducedMotion) return;
    for (const f of this.snow) {
      f.y += f.s * 0.016;
      f.x += Math.sin(time * 0.8 + f.d) * 0.4;
      if (f.y > VIEW.h) {
        f.y = -4;
        f.x = Math.random() * VIEW.w;
      }
      ctx.globalAlpha = 0.25 + f.layer * 0.45;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _fog(ctx, amount, time) {
    const g = ctx.createLinearGradient(0, 0, VIEW.w, 0);
    g.addColorStop(0, `rgba(200,225,245,0)`);
    g.addColorStop(0.55, `rgba(200,225,245,${amount * 0.25})`);
    g.addColorStop(1, `rgba(210,232,250,${amount})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }

  _post(ctx, world) {
    if (world.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${world.flash * 0.35})`;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    }
    // Vignette keeps the eye on the penguin.
    const g = ctx.createRadialGradient(VIEW.w / 2, VIEW.h / 2, VIEW.h * 0.35, VIEW.w / 2, VIEW.h / 2, VIEW.h * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(2,10,24,0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
