/**
 * Canvas renderer.
 *
 * Everything is drawn procedurally — no image assets — so the whole game is a
 * handful of text files that load instantly and scale to any resolution.
 *
 * Draw order: sky → aurora → stars → parallax bergs → water → floes → props →
 * hazards → penguin → particles → weather → post effects.
 */

import { VIEW, VIEW_LIMITS, AMBUSH } from './config.js';
import { getSkin, getTrail } from './skins.js';
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

/**
 * Hard ceiling on the canvas backing store.
 *
 * Browsers refuse to allocate a canvas past a maximum side length (4096 on the
 * strictest mobile engines) and past a total area, and a refused allocation is
 * silent: you get a canvas that never paints. The side limit is the one a tall
 * phone actually hits. Both are set high enough that ordinary screens keep
 * their full device pixel ratio — dropping it blurs the game, so it is only
 * ever a last resort.
 */
const MAX_CANVAS_PIXELS = 8_000_000;
const MAX_CANVAS_SIDE = 4096;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    // `alpha: false` is a speed win but is the first thing to fail when memory
    // is tight, so fall back rather than ending up with a null context.
    this.ctx =
      canvas.getContext('2d', { alpha: false }) ??
      canvas.getContext('2d') ??
      null;
    if (!this.ctx) throw new Error('2D canvas desteklenmiyor');

    // A 2D context can be lost on mobile (backgrounding, memory pressure) and,
    // unlike WebGL, nothing in the app notices unless we listen.
    canvas.addEventListener('contextlost', (e) => {
      e.preventDefault();
      this.contextLost = true;
    });
    canvas.addEventListener('contextrestored', () => {
      this.contextLost = false;
      this.resize();
    });

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
    // A parent that measures zero (or NaN, mid-layout) would poison VIEW and
    // then every gradient built from it, so fall back to a sane box instead.
    const cw = Number.isFinite(rect.width) && rect.width > 0 ? rect.width : 960;
    const ch = Number.isFinite(rect.height) && rect.height > 0 ? rect.height : 540;
    const aspect = cw / ch;
    if (!Number.isFinite(aspect) || aspect <= 0) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Trim the device pixel ratio until the buffer fits inside the ceiling.
    while (dpr > 1 && (cw * dpr * (ch * dpr) > MAX_CANVAS_PIXELS
      || cw * dpr > MAX_CANVAS_SIDE || ch * dpr > MAX_CANVAS_SIDE)) {
      dpr -= 0.25;
    }
    dpr = Math.max(1, dpr);

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
    if (this.contextLost) return;
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

    // Dizzy sways the picture. Small — enough to unsettle aim, not enough to
    // make the geometry unreadable.
    const dizzy = world.player?.curse?.dizzy ?? 0;
    if (dizzy > 0 && !this.reducedMotion) {
      const t = Math.min(1, dizzy / 0.5);
      ctx.translate(VIEW.w / 2, VIEW.h / 2);
      ctx.rotate(Math.sin(time * 2.6) * 0.035 * t);
      ctx.scale(1 + 0.012 * Math.sin(time * 3.7) * t, 1);
      ctx.translate(-VIEW.w / 2, -VIEW.h / 2);
    }

    const shake = this.reducedMotion ? 0 : world.camera.shake;
    const camX = world.camera.x + (shake ? (Math.random() - 0.5) * shake : 0);
    const camY = world.camera.y + (shake ? (Math.random() - 0.5) * shake : 0);

    this._sky(ctx, world, camX, camY, time);
    this._parallax(ctx, world, camX, camY, time);
    this._water(ctx, world, camX, camY, time);

    ctx.save();
    ctx.translate(-camX, -camY);
    this._terrain(ctx, world, time);
    this._zonesBack(ctx, world, time);
    this._signs(ctx, world);
    this._floes(ctx, world, time);
    this._geysers(ctx, world, time);
    this._checkpoints(ctx, world, time);
    this._fish(ctx, world, time);
    this._goal(ctx, world, time);
    this._hazards(ctx, world, time);
    this._skuaShadow(ctx, world, time);
    this._ghost(ctx, world, time);
    if (world.status !== 'dying') this._penguin(ctx, world, time);
    this._skua(ctx, world, time);
    this._collapse(ctx, world, time);
    particles.draw(ctx);
    // Drawn last so a tunnel darkens the penguin inside it too.
    this._zones(ctx, world, camX, time);
    ctx.restore();

    this._weather(ctx, time);
    if (world.fog) this._fog(ctx, world.fog, time);
    this._curses(ctx, world, time);
    this._post(ctx, world);

    ctx.restore();
  }

  /* ---------------------------------------------------------------- */

  _sky(ctx, world, camX, camY, time) {
    // The gradient belongs to the world, not to the screen: climbing a cliff
    // should take you into the darker air near the top of the weather, and a
    // sky pinned to the viewport looks identical at every altitude.
    const top = -camY;
    const bottom = world.waterY - camY;
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(0.45, PALETTE.skyMid);
    g.addColorStop(0.82, PALETTE.skyLow);
    g.addColorStop(1, PALETTE.horizon);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);

    // Stars, drifting slowly against the camera in both axes.
    for (const st of this.stars) {
      const x = (st.x - camX * 0.08) % (VIEW.w * 1.4);
      const alpha = 0.35 + 0.4 * Math.sin(time * 1.4 + st.tw);
      ctx.globalAlpha = clamp(alpha, 0, 1) * 0.9;
      ctx.fillStyle = '#dff2ff';
      ctx.beginPath();
      ctx.arc(x < 0 ? x + VIEW.w * 1.4 : x, st.y - camY * 0.1, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this._aurora(ctx, camX, camY, time);
  }

  _aurora(ctx, camX, camY, time) {
    const t = this.reducedMotion ? 0 : time;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lift = camY * 0.35;
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
        const y = b.y - lift + Math.sin(wx * 0.006 + t * b.speed) * b.amp + Math.sin(wx * 0.013 + t * b.speed * 1.7) * b.amp * 0.5;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      for (let x = VIEW.w; x >= 0; x -= 24) {
        const wx = x + camX * 0.05;
        const y = b.y + 120 - lift + Math.sin(wx * 0.006 + t * b.speed) * b.amp;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _parallax(ctx, world, camX, camY, time) {
    // Aerial perspective: distant ridges are hazy and light, near ones are
    // darker. That keeps the white floes reading clearly against the backdrop.
    //
    // The ridges stand *on the sea*, so they are anchored to the water line
    // rather than to the screen. On a tall level the camera climbs hundreds of
    // pixels, and a backdrop pinned to the viewport would ride up with it and
    // end as mountains floating in mid-air.
    const base = world.waterY - camY;
    const layers = [
      // Tall on purpose. The camera now climbs several hundred pixels above the
      // sea, and ranges that only bumped along the horizon left the top of a
      // summit looking out at nothing at all.
      { depth: 0.14, drop: -40, color: 'rgba(146,186,216,0.30)', step: 340, amp: 330 },
      { depth: 0.3, drop: -18, color: 'rgba(96,142,184,0.42)', step: 260, amp: 180 },
      { depth: 0.5, drop: -2, color: 'rgba(52,94,140,0.58)', step: 210, amp: 62 },
    ];
    for (const l of layers) {
      const off = -camX * l.depth;
      const y = base + l.drop;
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.moveTo(-40, VIEW.h);
      const start = Math.floor(-off / l.step) - 2;
      for (let i = start; i < start + Math.ceil(VIEW.w / l.step) + 4; i++) {
        const px = i * l.step + off;
        const peak = y - Math.abs(Math.sin(i * 2.7)) * l.amp;
        ctx.lineTo(px, y);
        ctx.lineTo(px + l.step * 0.5, peak);
        ctx.lineTo(px + l.step, y);
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

  /**
   * The continent. Cliff faces, tunnel roofs and pillars — the solid ice the
   * route is cut through.
   *
   * Drawn colder and darker than the floes on purpose: the player has to be
   * able to tell at a glance what is a platform that might give way and what
   * is a thousand years of ice that never will.
   */
  _terrain(ctx, world, time) {
    if (!world.terrain?.length) return;
    const view = this._viewBounds(world);

    for (const raw of world.terrain) {
      if (raw.x + raw.w < view.left || raw.x > view.right) continue;
      // Ice stops at the waterline. Painting rock over the sea makes a cliff
      // look like it is standing in a hole cut through the water.
      const b =
        raw.y + raw.h > world.waterY ? { ...raw, h: Math.max(6, world.waterY - raw.y) } : raw;

      const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
      if (b.kind === 'roof') {
        // A roof is seen from underneath, so it is lit from above and its cut
        // face is the darkest thing on screen.
        g.addColorStop(0, '#2b4a70');
        g.addColorStop(0.35, '#1b3253');
        g.addColorStop(1, '#0d1c33');
      } else {
        g.addColorStop(0, '#3a608c');
        g.addColorStop(0.22, '#24406a');
        g.addColorStop(1, '#101f3a');
      }
      ctx.fillStyle = g;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // Strata: horizontal compression lines, the tell that this is old ice.
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x, b.y, b.w, b.h);
      ctx.clip();
      ctx.strokeStyle = 'rgba(160,205,236,0.09)';
      ctx.lineWidth = 1;
      const seed = ((b.x * 31 + b.y * 17) % 40) + 22;
      for (let y = b.y + seed * 0.5; y < b.y + b.h; y += seed) {
        ctx.beginPath();
        ctx.moveTo(b.x, y);
        ctx.lineTo(b.x + b.w, y + Math.sin(b.x * 0.01 + y * 0.02) * 3);
        ctx.stroke();
      }
      ctx.restore();

      // A lit lip along whichever edge faces the open air.
      const lip = b.kind === 'roof' ? b.y + b.h : b.y;
      ctx.fillStyle = b.kind === 'roof' ? 'rgba(120,180,225,0.25)' : 'rgba(224,244,255,0.75)';
      ctx.fillRect(b.x, lip - (b.kind === 'roof' ? 0 : 3), b.w, 3);

      // Icicles under a roof, purely so a ceiling reads as a ceiling.
      if (b.kind === 'roof' && !this.reducedMotion) {
        ctx.fillStyle = 'rgba(190,228,250,0.5)';
        for (let i = 0; i < b.w; i += 34) {
          const h = 6 + (((b.x + i) * 7919) % 13);
          const x = b.x + i + 8;
          ctx.beginPath();
          ctx.moveTo(x - 3, b.y + b.h);
          ctx.lineTo(x + 3, b.y + b.h);
          ctx.lineTo(x, b.y + b.h + h);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  /**
   * The back wall of a tunnel.
   *
   * Drawn before anything in the tunnel, and opaque: you are inside a mass of
   * ice, so what is behind you is more ice — not the mountains twenty
   * kilometres away, which is what a translucent wash left showing through.
   */
  _zonesBack(ctx, world, time) {
    if (!world.zones?.length) return;
    const view = this._viewBounds(world);

    for (const z of world.zones) {
      if (z.kind !== 'tunnel') continue;
      if (z.x + z.w < view.left || z.x > view.right) continue;
      const h = z.bottom - z.top;

      const g = ctx.createLinearGradient(0, z.top, 0, z.bottom);
      g.addColorStop(0, '#0c1b31');
      g.addColorStop(0.55, '#123055');
      g.addColorStop(1, '#0a1729');
      ctx.fillStyle = g;
      ctx.fillRect(z.x, z.top, z.w, h);

      // Meltwater streaks down the back wall, which is most of what tells you
      // it is a surface at all rather than a hole.
      ctx.save();
      ctx.beginPath();
      ctx.rect(z.x, z.top, z.w, h);
      ctx.clip();
      ctx.strokeStyle = 'rgba(150,205,240,0.10)';
      ctx.lineWidth = 2;
      for (let x = z.x + 24; x < z.x + z.w; x += 58) {
        const wob = Math.sin(x * 0.05) * 10;
        ctx.beginPath();
        ctx.moveTo(x, z.top);
        ctx.lineTo(x + wob, z.bottom);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * Atmosphere per zone: inside a tunnel the light goes, in a crevasse the
   * depth below you goes blue-black. Drawn over everything, including the
   * penguin, because that is what being inside something means.
   */
  _zones(ctx, world, camX, time) {
    if (!world.zones?.length) return;
    const view = this._viewBounds(world);

    for (const z of world.zones) {
      if (z.x + z.w < view.left || z.x > view.right) continue;
      const h = z.bottom - z.top;

      if (z.kind === 'tunnel') {
        ctx.save();
        // Dark at the middle, open at both mouths, so entering and leaving are
        // gradual rather than a hard edge.
        const g = ctx.createLinearGradient(z.x, 0, z.x + z.w, 0);
        g.addColorStop(0, 'rgba(4,10,22,0)');
        g.addColorStop(0.22, 'rgba(4,10,22,0.62)');
        g.addColorStop(0.78, 'rgba(4,10,22,0.62)');
        g.addColorStop(1, 'rgba(4,10,22,0)');
        ctx.fillStyle = g;
        ctx.fillRect(z.x, z.top, z.w, h);
        ctx.restore();
      } else if (z.kind === 'crevasse') {
        const g = ctx.createLinearGradient(0, z.top, 0, z.bottom);
        g.addColorStop(0, 'rgba(6,16,34,0)');
        g.addColorStop(1, 'rgba(6,16,34,0.75)');
        ctx.fillStyle = g;
        ctx.fillRect(z.x, z.top, z.w, h);
      }
    }
  }

  /** World-space bounds of what is currently on screen, plus a margin. */
  _viewBounds(world) {
    const left = world.camera.x - 80;
    return { left, right: left + VIEW.w + 160 };
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
    if (f.type === 'crack' || (f.state === 'cracking' && f.type !== 'trap' && !f.isFake)) {
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

    // Fake ice carries no tell at all while it is idle — that is the entire
    // point of it. Once it commits, the cracks come fast and wide, so the
    // half-second you have reads as "run" rather than as a decoration.
    if (f.isFake && f.state === 'cracking') {
      const progress = 1 - clamp(f.timer / f.breakDelay(), 0, 1);
      ctx.strokeStyle = `rgba(255,120,110,${0.35 + progress * 0.6})`;
      ctx.lineWidth = 1.5 + progress * 3;
      const rng = makeRng(f.id * 977 + 3);
      for (let b = 0; b < 4; b++) {
        ctx.beginPath();
        let px = x + w * (0.14 + b * 0.24);
        let py = y + 2;
        ctx.moveTo(px, py);
        for (let i = 0; i < 4; i++) {
          px += (rng() - 0.5) * 34 * (0.4 + progress);
          py += 3 + rng() * 6;
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
    for (const f of world.boosts ?? []) {
      if (f.taken) continue;
      this._speedFish(ctx, f, time);
    }
    for (const f of world.rotten ?? []) {
      if (f.taken) continue;
      this._rotFish(ctx, f, time);
    }
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

  /**
   * The speed fish: crimson body, gold lightning, and a halo that pulses hard
   * enough to be spotted from across a gap. It has to read as "different and
   * worth a detour" at a glance, not as a fourth collectible.
   */
  _speedFish(ctx, f, time) {
    const cx = f.x + f.w / 2;
    const cy = f.y + f.h / 2 + Math.sin(f.phase) * 5;
    const pulse = 0.6 + 0.4 * Math.sin(time * 7 + f.phase);

    ctx.save();
    ctx.translate(cx, cy);

    // Halo
    const halo = ctx.createRadialGradient(0, 0, 3, 0, 0, 34 + pulse * 10);
    halo.addColorStop(0, `rgba(255,80,90,${0.35 * pulse})`);
    halo.addColorStop(0.5, `rgba(255,190,60,${0.18 * pulse})`);
    halo.addColorStop(1, 'rgba(255,190,60,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(-46, -46, 92, 92);

    ctx.rotate(Math.sin(f.phase * 0.8) * 0.14);

    // Body
    const g = ctx.createLinearGradient(-14, -10, 14, 10);
    g.addColorStop(0, '#ff3b48');
    g.addColorStop(1, '#c8102e');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(255,60,72,0.7)';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(23, -9);
    ctx.lineTo(23, 9);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Gold lightning down the flank
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(2, -8);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-1, 0);
    ctx.lineTo(-5, 8);
    ctx.lineTo(5, -1);
    ctx.lineTo(1, -1);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath();
    ctx.arc(-8, -3, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a0d16';
    ctx.beginPath();
    ctx.arc(-8, -3, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Sparks orbiting the halo
    ctx.strokeStyle = `rgba(255,210,63,${pulse})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = time * 4 + (i * Math.PI * 2) / 3;
      const r = 24 + pulse * 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6));
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Rotten fish. Sickly green, sunken-eyed, with flies and a faint haze — it
   * has to be readable as "do not eat" at a glance once you have been burned
   * once, without being so loud that the first one is not a surprise.
   */
  _rotFish(ctx, f, time) {
    const tint = { heavy: '#7a5cff', dizzy: '#7fbf4d', blind: '#8a8f9a' }[f.kind] ?? '#7fbf4d';
    const cx = f.x + f.w / 2;
    const cy = f.y + f.h / 2 + Math.sin(f.phase) * 3;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(f.phase * 0.6) * 0.5 + 0.25); // listing, not swimming

    // Sickly haze
    const haze = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
    haze.addColorStop(0, `${tint}44`);
    haze.addColorStop(1, `${tint}00`);
    ctx.fillStyle = haze;
    ctx.fillRect(-30, -30, 60, 60);

    // Body
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(17, -6);
    ctx.lineTo(17, 6);
    ctx.closePath();
    ctx.fill();

    // Belly-up patch and a dead, crossed eye
    ctx.fillStyle = 'rgba(20,26,20,0.45)';
    ctx.beginPath();
    ctx.ellipse(1, 2, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b2118';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-7, -3);
    ctx.lineTo(-3, 1);
    ctx.moveTo(-3, -3);
    ctx.lineTo(-7, 1);
    ctx.stroke();

    // Flies
    ctx.fillStyle = 'rgba(30,36,28,0.8)';
    for (let i = 0; i < 3; i++) {
      const a = time * 3.5 + i * 2.1;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 15, Math.sin(a * 1.4) * 11 - 12, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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
      } else if (h.kind === 'storm') {
        const dir = Math.sign(h.power ?? -1);
        const t = h.intensity ?? 0;
        ctx.save();

        // Haze: the whole stretch greys out as the surge builds.
        ctx.globalAlpha = 0.06 + t * 0.16;
        ctx.fillStyle = '#cfe4f5';
        ctx.fillRect(h.x, h.y, h.w, h.h);

        // Driven snow — long, near-horizontal streaks. Density and lean both
        // track the surge, so the wind is readable before it hits.
        ctx.globalAlpha = 0.14 + t * 0.5;
        ctx.strokeStyle = '#eaf6ff';
        ctx.lineCap = 'round';
        const lines = Math.round(14 + t * 22);
        const speed = this.reducedMotion ? 0 : 1;
        for (let i = 0; i < lines; i++) {
          const seed = i * 97.13;
          const yy = h.y + ((seed * 7.7) % h.h);
          const len = 26 + ((seed * 3.3) % 46) * (0.5 + t);
          const travel = (time * speed * (420 + t * 520) + seed * 31) % (h.w + 200);
          const sx = dir < 0 ? h.x + h.w + 100 - travel : h.x - 100 + travel;
          ctx.lineWidth = 1 + ((seed % 3) * 0.6);
          ctx.beginPath();
          ctx.moveTo(sx, yy);
          ctx.lineTo(sx + len * dir, yy + len * 0.18);
          ctx.stroke();
        }

        // Edge markers, so the zone has a boundary you can stand behind.
        ctx.globalAlpha = 0.25 + t * 0.35;
        ctx.strokeStyle = '#9fd0ee';
        ctx.setLineDash([10, 12]);
        ctx.lineWidth = 2;
        for (const ex of [h.x, h.x + h.w]) {
          ctx.beginPath();
          ctx.moveTo(ex, h.y);
          ctx.lineTo(ex, h.y + h.h);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.lineCap = 'butt';
        ctx.restore();
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

  /**
   * The serac coming down on the approach to the raft.
   *
   * Drawn with its own shadow on the ice below it, growing as it falls — the
   * only warning there is, and the reason a second run past this spot is not
   * the same as the first.
   */
  _collapse(ctx, world, time) {
    const c = world.collapse;
    if (!c) return;

    if (c.state === 'fall') {
      // Shadow first: it is on the ground, under everything.
      const drop = Math.max(0.001, c.landY - c.y);
      const k = 1 - Math.min(1, drop / 420);
      ctx.save();
      ctx.globalAlpha = 0.2 + k * 0.5;
      ctx.fillStyle = '#03101f';
      ctx.beginPath();
      ctx.ellipse(c.x, c.landY + 8, c.w * (0.35 + k * 0.5), c.w * 0.16 * (0.4 + k), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const y = c.state === 'fall' ? c.y : c.landY;
    const settle = c.state === 'debris' ? Math.min(1, c.t / 0.3) : 0;
    const h = c.w * (1 - settle * 0.45);

    ctx.save();
    ctx.translate(c.x, y);
    if (c.state === 'fall') ctx.rotate(Math.sin(time * 6) * 0.06);

    // A chunk of the cliff, not a floe: darker, harder-edged, with a bright
    // fracture face where it tore away.
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, '#dff1ff');
    g.addColorStop(0.35, '#8fb8d8');
    g.addColorStop(1, '#33557d');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-c.w * 0.5, 0);
    ctx.lineTo(-c.w * 0.38, -h * 0.78);
    ctx.lineTo(-c.w * 0.05, -h);
    ctx.lineTo(c.w * 0.34, -h * 0.82);
    ctx.lineTo(c.w * 0.5, -h * 0.2);
    ctx.lineTo(c.w * 0.2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (c.state === 'fall' && !this.reducedMotion) {
      // Powder trailing the fall.
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#eaf6ff';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(c.x + Math.sin(time * 20 + i) * 12, y - c.w - i * 22, 6 - i, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /**
   * The mark on the ice where the bird is going to be.
   *
   * Drawn under everything the player is standing on rather than on the bird
   * itself, and it *pulses faster as the strike approaches*. That is the whole
   * fairness contract for the ambush: the warning has to be readable out of the
   * corner of an eye by someone who is busy landing a jump.
   */
  _skuaShadow(ctx, world, time) {
    const s = world.skua;
    if (!s || s.state !== 'warn') return;
    const k = Math.min(1, s.t / s.warn);
    const r = 34 * (1 - k * 0.55);
    const beat = 0.35 + 0.65 * Math.abs(Math.sin(time * (7 + k * 26)));

    ctx.save();
    ctx.globalAlpha = (0.28 + 0.5 * k) * beat;
    ctx.fillStyle = '#04101f';
    ctx.beginPath();
    ctx.ellipse(s.targetX, s.targetY + 22, r, r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5 + 0.4 * k;
    ctx.strokeStyle = '#ff6b81';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(s.targetX, s.targetY + 22, r + 7, (r + 7) * 0.34, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /**
   * The skua itself: a big dark gull, wings back, coming down fast.
   */
  _skua(ctx, world, time) {
    const s = world.skua;
    if (!s) return;
    const diving = s.state !== 'warn';
    const flap = diving ? 0.9 : Math.sin(time * 14) * 0.55;
    // Big. A skua that reads as a sparrow is not frightening.
    const w = 58;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.dir, 1);
    // Tilt into the dive.
    ctx.rotate(diving ? 0.5 : 0.16 * Math.sin(time * 6));

    // Wings — swept back hard on the strike.
    ctx.fillStyle = '#2b3444';
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.quadraticCurveTo(-w * 0.5, sgn * (w * 0.5 + flap * 12), -w * 1.05, sgn * (w * 0.28 + flap * 16));
      ctx.quadraticCurveTo(-w * 0.4, sgn * (w * 0.16), 0, 6);
      ctx.closePath();
      ctx.fill();
    }
    // Body and head
    ctx.fillStyle = '#3a4557';
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.42, w * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0f5fb';
    ctx.beginPath();
    ctx.ellipse(w * 0.26, -1, w * 0.16, w * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hooked beak, which is the part that reads as a predator.
    ctx.fillStyle = '#ffb43f';
    ctx.beginPath();
    ctx.moveTo(w * 0.38, -3);
    ctx.lineTo(w * 0.66, 1);
    ctx.lineTo(w * 0.38, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#101722';
    ctx.beginPath();
    ctx.arc(w * 0.3, -3, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Talons, out on the strike.
    if (diving) {
      ctx.strokeStyle = '#ffb43f';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      for (const dy of [-3, 3]) {
        ctx.beginPath();
        ctx.moveTo(w * 0.1, w * 0.16);
        ctx.lineTo(w * 0.22 + dy, w * 0.34);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    ctx.restore();

    // Speed streaks behind it on the way in, so a dive reads as fast.
    if (!this.reducedMotion && diving) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#cfe6ff';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const off = i * 14;
        ctx.beginPath();
        ctx.moveTo(s.x - s.dir * (30 + off), s.y - 16 + i * 12);
        ctx.lineTo(s.x - s.dir * (72 + off), s.y - 26 + i * 12);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * The record holder, running the level beside you.
   *
   * Deliberately not a second penguin: a translucent silhouette with a name
   * over it reads instantly as "not you", and never gets mistaken for
   * something you can land on or have to dodge.
   */
  _ghost(ctx, world, time) {
    const g = world.ghost;
    if (!g?.visible) return;
    const p = world.player;
    const w = p.w;
    const h = p.h;
    const cx = g.x + w / 2;
    const by = g.y + h;
    // Fades out once it has finished — it has left, you are still running.
    const alpha = g.finished ? 0.18 : 0.42;

    ctx.save();
    ctx.globalAlpha = alpha;

    const bob = g.onGround ? Math.sin(time * 9 + g.x * 0.05) * 1.2 : 0;
    ctx.translate(0, bob);

    ctx.fillStyle = g.cursed ? 'rgba(150,255,170,0.9)' : 'rgba(150,225,255,0.9)';

    // Feet
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + sgn * w * 0.24, by - 1, w * 0.16, h * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Body
    const bodyH = h * 0.82;
    ctx.beginPath();
    ctx.ellipse(cx, by - bodyH * 0.5, w * 0.46, bodyH * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    const headY = by - bodyH - h * 0.06;
    ctx.beginPath();
    ctx.ellipse(cx + g.facing * w * 0.04, headY, w * 0.34, h * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    // Beak, so which way it is running is never in doubt
    ctx.beginPath();
    ctx.moveTo(cx + g.facing * w * 0.3, headY + h * 0.01);
    ctx.lineTo(cx + g.facing * w * 0.52, headY + h * 0.05);
    ctx.lineTo(cx + g.facing * w * 0.3, headY + h * 0.09);
    ctx.closePath();
    ctx.fill();

    // Sprinting ghosts get the same crimson tell the player does.
    if (g.charged) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,90,90,0.5)';
      ctx.beginPath();
      ctx.ellipse(cx, by - bodyH * 0.5, w * 0.6, bodyH * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    // Name tag. It fades out when the two are neck and neck, where the label
    // would sit on top of the player's own head and read as clutter — at that
    // range you can see the ghost anyway.
    const close = Math.max(0, 1 - Math.abs(g.x - p.x) / (w * 1.6));
    ctx.globalAlpha = (alpha + 0.3) * (1 - close * 0.85);
    ctx.fillStyle = '#dff3ff';
    ctx.font = `600 ${Math.round(h * 0.24)}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(g.name, cx, headY - h * 0.46);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  /* ---------------------------------------------------------------- */

  _penguin(ctx, world, time) {
    const p = world.player;

    // The cosmetic trail goes down before anything else — it is behind the
    // penguin in every sense.
    const trail = getTrail(world.trailId);
    if (trail.paint && !this.reducedMotion) {
      const hist = [];
      // Oldest first, so a trail that draws a line draws it in order.
      for (let i = 0; i < p.history.length; i++) {
        const slot = p.history[(p._histAt + i) % p.history.length];
        if (slot.age < 1) hist.push(slot);
      }
      if (hist.length) {
        ctx.save();
        trail.paint(ctx, hist, { w: p.w, h: p.h }, time);
        ctx.restore();
      }
    }

    // Afterimages next, so the live bird draws on top of its own streak.
    if (p.charge > 0 && !this.reducedMotion) {
      for (const g of p.trail) {
        const a = Math.max(0, g.life / 0.22);
        ctx.save();
        ctx.globalAlpha = a * 0.4;
        ctx.fillStyle = a > 0.5 ? '#ff5560' : '#ffd23f';
        ctx.beginPath();
        ctx.ellipse(g.x + p.w / 2, g.y + p.h * 0.55, p.w * 0.42, p.h * 0.46, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const cx = p.x + p.w / 2;
    const by = p.y + p.h;
    const sx = p.squashX;
    const sy = p.squashY;
    const s = p.scale;

    const skin = getSkin(world.skinId);

    // Down colour darkens as the chick grows up — but only for the ordinary
    // penguin. A gold one is gold at every size.
    const t = clamp((s - 1) / 0.62, 0, 1);
    let body = skin.grows
      ? `rgb(${Math.round(lerp(88, 26, t))}, ${Math.round(lerp(100, 36, t))}, ${Math.round(lerp(118, 52, t))})`
      : skin.tint;
    if (p.charge > 0) {
      // Crimson, not merely tinted — at speed he should look like a different
      // animal from across the screen.
      const k = clamp(p.charge / 0.6, 0, 1);
      body = `rgb(${Math.round(lerp(38, 176, k))}, ${Math.round(lerp(46, 28, k))}, ${Math.round(lerp(62, 40, k))})`;
    } else if (p.curse.heavy > 0) {
      body = '#4a3a72'; // leaden purple
    } else if (p.curse.dizzy > 0) {
      body = '#3f5a34'; // green around the gills
    }

    ctx.save();
    ctx.translate(cx, by);
    ctx.scale(sx, sy);
    ctx.translate(-cx, -by);

    const bodyH = p.h * 0.82;
    const headY = by - bodyH - p.h * 0.06;
    const step = p.onGround ? Math.sin(p.walkPhase) : 0;
    const geo = {
      cx,
      by,
      w: p.w,
      h: p.h,
      bodyH,
      headY,
      facing: p.facing,
      step,
      time,
      airborne: !p.onGround,
    };
    // Some skins wear things behind the bird — a jetpack, a cape.
    if (skin.behind && skin.paint) skin.paint(ctx, geo, 'behind');

    // Shadow on the floe
    if (p.onGround) {
      ctx.fillStyle = 'rgba(10,30,50,0.18)';
      ctx.beginPath();
      ctx.ellipse(cx, by + 2, p.w * 0.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const footY = by - 1;

    // Feet
    ctx.fillStyle = skin.foot;
    for (const sgn of [-1, 1]) {
      const fx = cx + sgn * p.w * 0.24 + (sgn === 1 ? step * 3 : -step * 3);
      ctx.beginPath();
      ctx.ellipse(fx, footY, p.w * 0.17, p.h * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(cx, by - bodyH * 0.5, p.w * 0.46, bodyH * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = skin.belly;
    ctx.beginPath();
    ctx.ellipse(cx + p.facing * p.w * 0.05, by - bodyH * 0.44, p.w * 0.29, bodyH * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // The back motor, under the bird and behind the body.
    if (p.burn > 0) {
      const k = p.burn / 0.22;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const fy = by - p.h * 0.05;
      const flame = ctx.createLinearGradient(cx, fy, cx, fy + p.h * 0.75 * k);
      flame.addColorStop(0, `rgba(255,236,170,${0.95 * k})`);
      flame.addColorStop(0.45, `rgba(255,150,60,${0.6 * k})`);
      flame.addColorStop(1, 'rgba(255,80,30,0)');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(cx - p.w * 0.2, fy);
      ctx.lineTo(cx + p.w * 0.2, fy);
      ctx.lineTo(cx, fy + p.h * 0.8 * k);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Flipper — flaps in the air, or locks out flat into a wing while gliding.
    const flap = p.onGround ? step * 0.25 : Math.sin(time * 16) * 0.7;
    if (p.gliding) {
      // Both wings out, level, with a faint membrane between wing and body —
      // the silhouette has to say "gliding" from across the screen.
      const span = p.w * 1.15;
      const wy = by - bodyH * 0.68;
      ctx.save();
      ctx.fillStyle = body;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sgn * p.w * 0.28, wy);
        ctx.quadraticCurveTo(cx + sgn * span * 0.8, wy - p.h * 0.16, cx + sgn * span, wy + p.h * 0.06);
        ctx.quadraticCurveTo(cx + sgn * span * 0.7, wy + p.h * 0.14, cx + sgn * p.w * 0.28, wy + p.h * 0.1);
        ctx.closePath();
        ctx.fill();
      }
      // Air spilling off the tips, so the glide reads as slow rather than stuck.
      ctx.strokeStyle = 'rgba(200,235,255,0.5)';
      ctx.lineWidth = 1.5;
      for (const sgn of [-1, 1]) {
        const tx = cx + sgn * span;
        ctx.beginPath();
        ctx.moveTo(tx, wy + p.h * 0.04);
        ctx.lineTo(tx + sgn * (8 + Math.sin(time * 18) * 4), wy + p.h * 0.16);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(cx - p.facing * p.w * 0.38, by - bodyH * 0.62);
    ctx.rotate(p.facing * (0.25 + flap));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, p.h * 0.12, p.w * 0.12, p.h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Head
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(cx + p.facing * p.w * 0.04, headY, p.w * 0.34, p.h * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = skin.beak;
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
        ctx.fillStyle = skin.eye ?? '#0e1723';
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

    // Whatever this penguin wears, drawn inside the body transform so it
    // squashes and stretches with the bird rather than sliding around on it.
    if (skin.paint) {
      skin.paint(ctx, geo, 'front');
    }

    ctx.restore();

    // A skin's own glow — always on, unlike the speed boost's.
    if (skin.aura && !this.reducedMotion) {
      const ax = p.x + p.w / 2;
      const ay = p.y + p.h * 0.5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(ax, ay, p.w * 0.25, ax, ay, p.w * 1.25);
      glow.addColorStop(0, skin.aura);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(ax - p.w * 1.4, ay - p.h * 1.4, p.w * 2.8, p.h * 2.8);
      ctx.restore();
    }

    // Charged aura: a crimson glow with gold lightning snapping off it. Drawn
    // after the bird so it reads as energy coming off him, not paint on him.
    if (p.charge > 0) {
      const cx2 = p.x + p.w / 2;
      const cy2 = p.y + p.h * 0.5;
      // The last second flickers, which is the warning that it is running out.
      const fade = p.charge < 1 ? 0.35 + 0.65 * Math.abs(Math.sin(time * 22)) : 1;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const aura = ctx.createRadialGradient(cx2, cy2, p.w * 0.2, cx2, cy2, p.w * 1.5);
      aura.addColorStop(0, `rgba(255,70,80,${0.34 * fade})`);
      aura.addColorStop(0.55, `rgba(255,190,60,${0.16 * fade})`);
      aura.addColorStop(1, 'rgba(255,190,60,0)');
      ctx.fillStyle = aura;
      ctx.fillRect(cx2 - p.w * 1.6, cy2 - p.h * 1.6, p.w * 3.2, p.h * 3.2);

      ctx.strokeStyle = `rgba(255,215,80,${0.9 * fade})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = time * 13 + (i * Math.PI * 2) / 3;
        const r0 = p.w * 0.55;
        const r1 = p.w * (0.9 + 0.25 * Math.sin(time * 30 + i));
        const mx = Math.cos(a) * (r0 + r1) * 0.5 + Math.sin(time * 25 + i) * 5;
        const my = Math.sin(a) * (r0 + r1) * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx2 + Math.cos(a) * r0, cy2 + Math.sin(a) * r0);
        ctx.lineTo(cx2 + mx, cy2 + my);
        ctx.lineTo(cx2 + Math.cos(a) * r1, cy2 + Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.restore();
    }
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

  /** Screen-level effects of a rotten fish. */
  _curses(ctx, world, time) {
    const p = world.player;
    if (!p?.cursed) return;

    // Blind: frost creeps in from the edges. Deliberately a vignette rather
    // than a blackout — you can still see where your feet are, just not what
    // is coming.
    if (p.curse.blind > 0) {
      const t = Math.min(1, p.curse.blind / 0.6);
      const g = ctx.createRadialGradient(
        VIEW.w / 2, VIEW.h / 2, VIEW.h * 0.1,
        VIEW.w / 2, VIEW.h / 2, VIEW.h * (0.62 - 0.18 * t),
      );
      g.addColorStop(0, 'rgba(214,232,246,0)');
      g.addColorStop(0.65, `rgba(206,226,242,${0.35 * t})`);
      g.addColorStop(1, `rgba(198,220,238,${0.94 * t})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    }

    // Dizzy: the whole picture sways, and the edge glows green.
    if (p.curse.dizzy > 0) {
      const t = Math.min(1, p.curse.dizzy / 0.5);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
      g.addColorStop(0, `rgba(120,190,80,${0.16 * t})`);
      g.addColorStop(0.5, 'rgba(120,190,80,0)');
      g.addColorStop(1, `rgba(120,190,80,${0.16 * t})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
      ctx.restore();
    }

    if (p.curse.heavy > 0) {
      const t = Math.min(1, p.curse.heavy / 0.6);
      ctx.fillStyle = `rgba(74,58,114,${0.12 * t})`;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    }
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
