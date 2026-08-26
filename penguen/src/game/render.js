/**
 * Canvas renderer.
 *
 * Everything is drawn procedurally — no image assets — so the whole game is a
 * handful of text files that load instantly and scale to any resolution.
 *
 * Draw order: sky → aurora → stars → parallax bergs → water → floes → props →
 * hazards → penguin → particles → weather → post effects.
 */

import {
  VIEW, viewFor, AMBUSH, CHARGED, COIL, QUANTUM, SLACK, CLIMB, BRAWL, TRENCH, VENT, lobShot,
} from './config.js';
import { getSkin, getTrail } from './skins.js';
import { t } from '../core/i18n.js';
import { clamp, lerp, makeRng } from '../core/util.js';

/**
 * `#rrggbb` plus an alpha, as an `rgba()` string.
 *
 * Every tint in the game is written as a plain hex literal, because that is
 * what a person reading the config wants to see. The canvas wants four
 * numbers. This is the whole of the translation and it lives here rather than
 * in the config so the config stays a description of the game.
 */
function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}

/** The same colour, darker (`k < 0`) or lighter (`k > 0`). */
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k);
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

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
   * `viewFor` decides how much of the world to show; everything here is the
   * plumbing around it — the device pixel ratio, the uniform scale that fills
   * the screen edge to edge instead of letterboxing, and the buffer size.
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

    const fit = viewFor(cw, ch);
    VIEW.w = fit.w;
    VIEW.h = fit.h;

    // Uniform scale; the clamps inside viewFor only bind on extreme aspect
    // ratios, and then the leftover is centred rather than stretched.
    const scale = Math.min(cw / VIEW.w, ch / VIEW.h);
    this.viewScale = scale;
    this.offsetX = (cw - VIEW.w * scale) / 2;
    this.offsetY = (ch - VIEW.h * scale) / 2;
    this.dpr = dpr;

    this.canvas.style.width = `${cw}px`;
    this.canvas.style.height = `${ch}px`;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);

    this.measureChrome();

    // Snowflakes are laid out in logical space, so respread them on resize.
    for (const f of this.snow) {
      if (f.x > VIEW.w) f.x = Math.random() * VIEW.w;
      if (f.y > VIEW.h) f.y = Math.random() * VIEW.h;
    }
  }

  /**
   * How much of the view the interface is standing on.
   *
   * The pads and the top strip are drawn over the canvas, so the camera has to
   * know about them or it will frame the penguin somewhere the player cannot
   * see him. It did: at the top of every level in the diving chapter the
   * penguin spawned behind the level chip, because the camera had run out of
   * level to scroll and stopped with him twenty-seven pixels down a screen
   * whose first fifty pixels belong to the interface.
   *
   * Measured from the real elements rather than assumed, because their size
   * comes from the stage and the phone's own safe areas, and no constant here
   * could know either. Hidden elements measure zero, which is the right answer
   * — a desktop with no pads is owed no room for them.
   */
  measureChrome() {
    if (typeof document === 'undefined') return;
    const stage = this.canvas.parentElement.getBoundingClientRect();
    const height = (el) => (el ? el.getBoundingClientRect().height : 0);

    const bar = document.querySelector('.hud__bar');
    const barBox = bar ? bar.getBoundingClientRect() : null;
    // Down to the bottom of the chips plus the progress line under them. Not
    // the whole strip: a toast is part of it and comes and goes, and a camera
    // that flinched every time one appeared would be worse than the problem.
    const top = barBox && barBox.height > 0 ? barBox.bottom - stage.top + 10 : 0;
    const bottom = height(document.getElementById('touch'));

    const scale = this.viewScale || 1;
    VIEW.padTop = Math.round(top / scale);
    VIEW.padBottom = Math.round(bottom / scale);
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

    if (world.diving) {
      this._sea(ctx, world, camX, camY, time);
    } else {
      this._sky(ctx, world, camX, camY, time);
      this._parallax(ctx, world, camX, camY, time);
      this._water(ctx, world, camX, camY, time);
    }

    ctx.save();
    ctx.translate(-camX, -camY);
    this._terrain(ctx, world, time);
    if (world.diving) this._airHoles(ctx, world, time);
    if (world.diving) this._vents(ctx, world, time);
    this._zonesBack(ctx, world, time);
    this._signs(ctx, world);
    this._floes(ctx, world, time);
    this._geysers(ctx, world, time);
    this._checkpoints(ctx, world, time);
    this._fish(ctx, world, time);
    this._goal(ctx, world, time);
    this._hazards(ctx, world, time);
    if (world.brawl) this._brawl(ctx, world, time);
    this._skuaShadow(ctx, world, time);
    this._ghost(ctx, world, time);
    if (world.status !== 'dying') this._penguin(ctx, world, time);
    this._windGauge(ctx, world, time);
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

  /**
   * Under the ice.
   *
   * No sky, no horizon, no mountains — the chapter's whole argument is that
   * you are somewhere else, and half of that argument is made before a single
   * obstacle appears. What replaces them: a column of water that darkens with
   * depth, shafts of daylight coming down through the ice, and motes drifting
   * in them. The light is anchored to the world rather than the screen, so
   * diving really does take you away from it.
   */
  _sea(ctx, world, camX, camY, time) {
    const top = -camY;
    const bottom = world.worldH - camY;
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, '#2e6f96');
    g.addColorStop(0.28, '#1b4b74');
    g.addColorStop(0.68, '#0e2c50');
    g.addColorStop(1, '#061a35');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);

    // Daylight down the holes. Drawn from the world's holes so the light is
    // always where the air is — which makes the backdrop a map.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const hole of world.airHoles ?? []) {
      const x = hole.x + hole.w / 2 - camX;
      if (x < -320 || x > VIEW.w + 320) continue;
      const y0 = hole.y + hole.h - camY;
      const beam = ctx.createLinearGradient(0, y0, 0, y0 + 460);
      beam.addColorStop(0, 'rgba(190,235,255,0.30)');
      beam.addColorStop(0.5, 'rgba(150,210,245,0.10)');
      beam.addColorStop(1, 'rgba(120,180,230,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x - hole.w * 0.4, y0);
      ctx.lineTo(x + hole.w * 0.4, y0);
      ctx.lineTo(x + hole.w * 1.5, y0 + 460);
      ctx.lineTo(x - hole.w * 1.5, y0 + 460);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Motes: plankton and ice crumb, rising slowly. The only thing on screen
    // that moves when the penguin does not, so the water is never still.
    if (this.reducedMotion) return;
    ctx.fillStyle = 'rgba(198,232,255,0.30)';
    for (const st of this.stars) {
      const x = (st.x - camX * 0.55) % (VIEW.w * 1.4);
      const y = (st.y * 2.1 - camY * 0.55 - time * 14) % (VIEW.h * 1.5);
      ctx.globalAlpha = 0.18 + 0.22 * Math.sin(time * 0.9 + st.tw);
      ctx.beginPath();
      ctx.arc(x < 0 ? x + VIEW.w * 1.4 : x, y < 0 ? y + VIEW.h * 1.5 : y, st.r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /**
   * The holes themselves, seen from below: bright water and a ragged rim.
   *
   * They have to be legible from a long way off, because finding the next one
   * *is* the level. So they are the brightest thing under the ice and they
   * pulse gently — and they flare when the penguin is actually breathing in
   * one, which is the only feedback the mechanic needs.
   */
  _airHoles(ctx, world, time) {
    const view = this._viewBounds(world);
    for (const hole of world.airHoles ?? []) {
      if (hole.x + hole.w < view.left || hole.x > view.right) continue;
      const y = hole.y + hole.h;
      const pulse = this.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(time * 2.2 + hole.x * 0.01);
      const glow = Math.max(pulse * 0.4, hole.glow ?? 0);
      const g = ctx.createLinearGradient(0, y - 90, 0, y + 26);
      g.addColorStop(0, 'rgba(226,248,255,0.92)');
      g.addColorStop(0.72, `rgba(160,222,255,${0.35 + glow * 0.4})`);
      g.addColorStop(1, 'rgba(140,206,246,0)');
      ctx.fillStyle = g;
      ctx.fillRect(hole.x, y - 90, hole.w, 116);

      // The rim: the cut edge of the ice on both sides of the hole.
      ctx.fillStyle = 'rgba(236,252,255,0.85)';
      ctx.fillRect(hole.x - 10, y - 6, 12, 8);
      ctx.fillRect(hole.x + hole.w - 2, y - 6, 12, 8);
    }
  }

  /**
   * The cracks in the seabed that breathe.
   *
   * Drawn from `ventAt` — the same curve the water reads and the validator
   * prices — so the column a player is timing their dive against is the column
   * that is actually giving air. Three things have to be legible from a
   * distance: that it is there when it is silent, that it is *about* to blow,
   * and that it is blowing now.
   */
  _vents(ctx, world, time) {
    const view = this._viewBounds(world);
    for (const v of world.vents ?? []) {
      if (v.x + v.w < view.left || v.x > view.right) continue;
      const strength = v.blow ?? 0;
      const mouthY = v.y + v.h;
      const cx = v.x + v.w / 2;

      // The mouth. Always visible, so a silent vent is still a landmark.
      ctx.fillStyle = 'rgba(10,26,44,0.85)';
      ctx.beginPath();
      ctx.ellipse(cx, mouthY, v.w * 0.42, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha(VENT.tint, 0.35 + strength * 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();

      if (strength <= 0.02) {
        // Silent, but stirring: a few grains lifting off the lip say the crack
        // is alive and worth waiting on, without promising air that is not
        // coming yet.
        if (!this.reducedMotion) {
          ctx.fillStyle = withAlpha(VENT.tint, 0.22);
          for (let i = 0; i < 3; i++) {
            const t = (time * 0.5 + i * 0.33) % 1;
            ctx.beginPath();
            ctx.arc(cx + Math.sin(t * 6 + i) * 9, mouthY - t * 26, 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        continue;
      }

      // The column.
      const h = v.h * (0.35 + strength * 0.65);
      const g = ctx.createLinearGradient(0, mouthY, 0, mouthY - h);
      g.addColorStop(0, withAlpha(VENT.tint, 0.4 * strength));
      g.addColorStop(0.55, withAlpha(VENT.tint, 0.2 * strength));
      g.addColorStop(1, withAlpha(VENT.tint, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - v.w * 0.34, mouthY);
      ctx.lineTo(cx - v.w * 0.62, mouthY - h);
      ctx.lineTo(cx + v.w * 0.62, mouthY - h);
      ctx.lineTo(cx + v.w * 0.34, mouthY);
      ctx.closePath();
      ctx.fill();

      // Bubbles, rising on their own clock so the column has grain rather than
      // being a beam of light with a gradient on it. Enough of them that the
      // thing reads as *air* from across the screen, because deciding to swim
      // down to it is a decision made from across the screen.
      const n = Math.round(26 * strength) + 6;
      for (let i = 0; i < n; i++) {
        const seed = i * 2.399 + v.x * 0.013;
        const rise = ((time * (0.62 + (i % 5) * 0.13) + seed) % 1);
        const y = mouthY - rise * h;
        // They spread as they climb, the way a plume does.
        const spread = 0.12 + rise * 0.5;
        const wob = Math.sin(rise * 6.5 + seed * 3.1) * v.w * spread;
        const r = 1.4 + (i % 5) * 0.8 * strength * (1 - rise * 0.35);
        const fade = Math.sin(Math.min(1, rise * 1.35) * Math.PI) * 0.9 + 0.1;
        ctx.fillStyle = withAlpha('#eaffff', fade * 0.7 * strength);
        ctx.beginPath();
        ctx.arc(cx + wob, y, r, 0, Math.PI * 2);
        ctx.fill();
        // A highlight on the bigger ones, so they are bubbles and not dots.
        if (r > 2.4) {
          ctx.fillStyle = withAlpha('#ffffff', fade * 0.5 * strength);
          ctx.beginPath();
          ctx.arc(cx + wob - r * 0.3, y - r * 0.3, r * 0.34, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // A hard glow at the mouth while it is blowing: the source of the thing.
      const mg = ctx.createRadialGradient(cx, mouthY, 2, cx, mouthY, v.w * 0.7);
      mg.addColorStop(0, withAlpha('#dffcff', 0.5 * strength));
      mg.addColorStop(1, withAlpha('#dffcff', 0));
      ctx.fillStyle = mg;
      ctx.fillRect(cx - v.w * 0.7, mouthY - v.w * 0.7, v.w * 1.4, v.w * 1.4);
    }
  }

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
      // Under the ice the whole level is below the waterline, so the clamp is
      // not a correction there — it would flatten every slab in the chapter to
      // six pixels and leave the sea with no shape at all.
      const b =
        !world.diving && raw.y + raw.h > world.waterY
          ? { ...raw, h: Math.max(6, world.waterY - raw.y) }
          : raw;

      // A climbable wall has to be unmistakable. Everything else in this game
      // is a shade of the same blue-grey, and if the one surface the penguin
      // can hang on looks like the ones it cannot, the chapter is unfair by
      // construction — so grippable ice is drawn pale, cracked and vertically
      // grained, and nothing else in the game is.
      if (b.climb) {
        this._iceWall(ctx, b, time);
        continue;
      }

      const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
      if (b.kind === 'back' || b.kind === 'shoulder') {
        // The coast the penguin came down from. It is scenery with a job, not
        // a route, so it is painted to recede: darker than the sky in front of
        // it and flatter than the cliffs the level is actually made of.
        g.addColorStop(0, '#1b2f4d');
        g.addColorStop(0.3, '#152742');
        g.addColorStop(1, '#0b1830');
      } else if (b.kind === 'roof') {
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
      // Absolute, and it matters: the sea-ice roofs of the dive chapter sit at
      // negative y, JS `%` keeps the sign, and a negative step turns this into
      // a loop that never ends. The game hung on the first underwater level
      // for exactly that one missing call.
      const seed = (Math.abs(b.x * 31 + b.y * 17) % 40) + 22;
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
   * Ice you can hold on to.
   *
   * Pale, vertically grained and split by fracture lines, with a bright rim
   * down both faces — the faces are the part that matters, because they are
   * literally what the penguin grabs, and the player has to be able to see
   * where one ends without counting pixels.
   */
  _iceWall(ctx, b, time) {
    const g = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
    g.addColorStop(0, '#cfe9fb');
    g.addColorStop(0.3, '#9dc9e8');
    g.addColorStop(0.62, '#7db0d6');
    g.addColorStop(1, '#b9dcf3');
    ctx.fillStyle = g;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x, b.y, b.w, b.h);
    ctx.clip();

    // Vertical grain: the direction of the ice, and the direction of travel.
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    for (let x = b.x + 5; x < b.x + b.w; x += 9) {
      ctx.beginPath();
      ctx.moveTo(x, b.y);
      ctx.lineTo(x + Math.sin(x * 0.4) * 2, b.y + b.h);
      ctx.stroke();
    }
    // Fractures across it, spaced by position so a wall looks the same every
    // time it is drawn rather than shimmering.
    ctx.strokeStyle = 'rgba(72,120,164,0.5)';
    ctx.lineWidth = 1.6;
    const step = 30 + (Math.abs(b.x * 13) % 22);
    for (let y = b.y + step * 0.6; y < b.y + b.h; y += step) {
      const skew = ((y * 7) % 11) - 5;
      ctx.beginPath();
      ctx.moveTo(b.x - 2, y);
      ctx.lineTo(b.x + b.w * 0.55, y + skew);
      ctx.lineTo(b.x + b.w + 2, y - skew * 0.4);
      ctx.stroke();
    }
    ctx.restore();

    // Both faces, lit. This is the grip line.
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(b.x, b.y, 2.5, b.h);
    ctx.fillRect(b.x + b.w - 2.5, b.y, 2.5, b.h);
    // And the top, so the end of a wall is visible from below.
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(b.x - 2, b.y, b.w + 4, 3);
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

    /**
     * The hush, drawn behind everything.
     *
     * It has one job and it is a hard one: to say "the rules are different in
     * here" from across a level, to a player who has never seen one, without a
     * word of text. Three things do the work together.
     *
     * The edge is a hard, bright line rather than a fade, because a soft edge
     * would be a lie — gravity changes at a boundary, not over a gradient, and
     * a player who misjudges where the pocket starts has been misled by the
     * drawing rather than by their own eyes.
     *
     * The air inside is full of snow that has stopped falling properly. Motes
     * drift down at a fraction of the speed of everything else on screen, and
     * that contrast is the mechanic stated without naming it: whatever is in
     * here is not being pulled the way you are used to.
     *
     * And the colour is cold and pale rather than dark. Every other zone in
     * this game closes in on you — the tunnel goes black, the crevasse goes
     * blue-black. This one opens up.
     */
    for (const z of world.zones) {
      if (z.kind !== 'hush') continue;
      if (z.x + z.w < view.left || z.x > view.right) continue;
      const h = z.bottom - z.top;

      const g = ctx.createLinearGradient(0, z.top, 0, z.bottom);
      g.addColorStop(0, 'rgba(196,232,255,0.16)');
      g.addColorStop(0.5, 'rgba(168,214,255,0.09)');
      g.addColorStop(1, 'rgba(150,200,250,0.03)');
      ctx.fillStyle = g;
      ctx.fillRect(z.x, z.top, z.w, h);

      ctx.save();
      ctx.strokeStyle = 'rgba(214,242,255,0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -time * 14;
      ctx.strokeRect(z.x, z.top, z.w, h);
      ctx.setLineDash([]);

      if (!this.reducedMotion) {
        ctx.beginPath();
        ctx.rect(z.x, z.top, z.w, h);
        ctx.clip();
        // Deterministic, so the same hollow looks the same every attempt: a
        // level you are learning must not be redecorated between tries.
        const rng = makeRng(Math.round(z.x * 31 + z.top));
        ctx.fillStyle = 'rgba(232,248,255,0.55)';
        for (let i = 0; i < 46; i++) {
          const bx = z.x + rng() * z.w;
          const drift = Math.sin(time * 0.5 + i) * 9;
          // A fifth of the speed of falling snow, and never resetting with a
          // jump: it just keeps coming down, forever, slowly.
          const by = z.top + ((rng() * h + time * 15 + i * 7) % h);
          const r = 1.1 + rng() * 1.5;
          ctx.beginPath();
          ctx.arc(bx + drift, by, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    /**
     * The trench: cold black water with a visible lip.
     *
     * The lip is the whole drawing. Below it a lungful runs out more than
     * twice as fast, and that rate grows smoothly with depth — so the one
     * thing a player must be able to see is *where it starts*, and after that
     * how much further down they have gone. A soft gradient with no line in it
     * would hide the only decision the band offers.
     *
     * So: a hard, cold line across the water, and the dark deepening under it
     * in bands rather than a smooth wash, because bands can be counted and a
     * wash cannot. Motes drift *up* out of it, which is the one visual cue the
     * sea has for cold, and they are slow.
     */
    for (const z of world.zones) {
      if (z.kind !== 'trench') continue;
      if (z.x + z.w < view.left || z.x > view.right) continue;
      const h = z.bottom - z.top;

      ctx.save();
      // The one colour the cold is described in, taken from the config rather
      // than typed here in three slightly different shades. It claimed to be
      // read by the renderer for a while before it was.
      const g = ctx.createLinearGradient(0, z.top, 0, z.bottom);
      g.addColorStop(0, withAlpha(TRENCH.tint, 0.12));
      g.addColorStop(0.45, withAlpha(TRENCH.tint, 0.44));
      g.addColorStop(1, withAlpha(TRENCH.tint, 0.76));
      ctx.fillStyle = g;
      ctx.fillRect(z.x, z.top, z.w, h);

      // Counted bands, so a swimmer can tell a third of the way down from two.
      ctx.strokeStyle = 'rgba(120,180,220,0.10)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = z.top + (h * i) / 4;
        ctx.beginPath();
        ctx.moveTo(z.x, y);
        ctx.lineTo(z.x + z.w, y);
        ctx.stroke();
      }

      // The lip.
      ctx.strokeStyle = 'rgba(150,210,245,0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 10]);
      ctx.lineDashOffset = time * 10;
      ctx.beginPath();
      ctx.moveTo(z.x, z.top);
      ctx.lineTo(z.x + z.w, z.top);
      ctx.stroke();
      ctx.setLineDash([]);

      if (!this.reducedMotion) {
        ctx.beginPath();
        ctx.rect(z.x, z.top, z.w, h);
        ctx.clip();
        const rng = makeRng(Math.round(z.x * 17 + z.top));
        ctx.fillStyle = 'rgba(170,215,245,0.4)';
        for (let i = 0; i < 30; i++) {
          const bx = z.x + rng() * z.w;
          const by = z.bottom - ((rng() * h + time * 22 + i * 11) % h);
          ctx.beginPath();
          ctx.arc(bx + Math.sin(time * 0.7 + i) * 5, by, 1 + rng() * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

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

    /**
     * The rope, and the thing it is tied to.
     *
     * Without them a hanging slab is a floating platform on a curved path, and
     * a player has no way to know it will slow at the ends and race through
     * the middle. With them it is a pendulum, and everybody already knows what
     * a pendulum does — the drawing is doing the teaching that would otherwise
     * need a sign.
     *
     * Two ropes rather than one, from the two upper corners of the slab, so it
     * reads as hanging rather than as skewered. And the anchor is drawn as a
     * spike driven into the rock overhead, because a rope tied to nothing is
     * the one thing that would make the whole idea look like a bug.
     */
    if (f.type === 'swing') {
      const topY = y + 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(214,232,248,0.7)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(f.pivotX, f.pivotY);
        ctx.lineTo(cx + sgn * (w / 2 - 10), topY);
        ctx.stroke();
      }
      // The anchor.
      ctx.fillStyle = '#4a5568';
      ctx.beginPath();
      ctx.moveTo(f.pivotX - 13, f.pivotY - 5);
      ctx.lineTo(f.pivotX + 13, f.pivotY - 5);
      ctx.lineTo(f.pivotX, f.pivotY + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8fa4bd';
      ctx.beginPath();
      ctx.arc(f.pivotX, f.pivotY - 4, 3.4, 0, Math.PI * 2);
      ctx.fill();
      // A shackle where the ropes meet the ice, so the eye follows them down.
      ctx.fillStyle = 'rgba(160,190,220,0.85)';
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(cx + sgn * (w / 2 - 10), topY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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
    for (const f of world.charged ?? []) {
      if (f.taken) continue;
      this._chargedFish(ctx, f, time);
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
   * The charged fish.
   *
   * All three share a silhouette and a halo and differ only in colour and in
   * the one glyph on the flank, which is on purpose: they are one family, and
   * the player should learn "that shape means the button changes" once and
   * then only have to read the colour.
   *
   * The glyphs are the ideas themselves rather than icons of them. The coil is
   * an actual spring, drawn compressed and breathing. The quantum fish is
   * drawn twice, in two places, neither of them quite solid. The slack fish
   * has a ring that races and a hand that barely moves, and the gap between
   * those two speeds is the entire mechanic stated without a word.
   */
  _chargedFish(ctx, f, time) {
    const spec = CHARGED[f.kind] ?? CHARGED.coil;
    const cx = f.x + f.w / 2;
    const cy = f.y + f.h / 2 + Math.sin(f.phase) * 3;
    const pulse = 0.55 + 0.45 * Math.sin(time * 5 + f.phase);
    const tint = spec.tint;

    ctx.save();
    ctx.translate(cx, cy);

    const halo = ctx.createRadialGradient(0, 0, 3, 0, 0, 32 + pulse * 9);
    halo.addColorStop(0, withAlpha(tint, 0.34 * pulse));
    halo.addColorStop(0.55, withAlpha(tint, 0.14 * pulse));
    halo.addColorStop(1, withAlpha(tint, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(-44, -44, 88, 88);

    // The quantum fish is the only one drawn more than once. The ghost is
    // behind and offset, and it is *not* a motion blur: it sits still.
    const copies = f.kind === 'quantum' ? [{ dx: -13, a: 0.32 }, { dx: 0, a: 1 }] : [{ dx: 0, a: 1 }];
    for (const c of copies) {
      ctx.save();
      ctx.globalAlpha = c.a;
      ctx.translate(c.dx, 0);
      ctx.rotate(Math.sin(f.phase * 0.8) * 0.12);

      const g = ctx.createLinearGradient(-14, -9, 14, 9);
      g.addColorStop(0, tint);
      g.addColorStop(1, shade(tint, -0.42));
      ctx.fillStyle = g;
      ctx.shadowColor = withAlpha(tint, 0.65);
      ctx.shadowBlur = 15;
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

      ctx.fillStyle = '#08131f';
      ctx.beginPath();
      ctx.arc(-8, -3, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // The glyph.
      ctx.strokeStyle = '#0c1420';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (f.kind === 'coil') {
        // A spring, breathing: the turns bunch up and let go on the pulse.
        const squeeze = 1 - pulse * 0.35;
        ctx.beginPath();
        ctx.moveTo(-6, 5 * squeeze);
        for (let i = 0; i <= 3; i++) {
          ctx.lineTo(4, (3.2 - i * 2.4) * squeeze);
          ctx.lineTo(-5, (2 - i * 2.4) * squeeze);
        }
        ctx.stroke();
      } else if (f.kind === 'quantum') {
        // Two dots and nothing in between, which is the whole trick.
        ctx.fillStyle = '#0c1420';
        ctx.beginPath();
        ctx.arc(-3, 1, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(6, 1, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = c.a * 0.4;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(-1, 1);
        ctx.lineTo(4, 1);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = c.a;
      } else {
        // A dial with a hand that has almost stopped.
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.stroke();
        const slow = time * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(slow) * 4.4, Math.sin(slow) * 4.4);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.restore();
    }

    // The orbiting ring. On the slack fish it runs hard, so the contrast with
    // the almost-stopped hand inside it is impossible to miss.
    const spin = f.kind === 'slack' ? 7 : 3;
    ctx.strokeStyle = withAlpha(tint, 0.5 + 0.4 * pulse);
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = time * spin + (i * Math.PI) / 2;
      const r = 23 + pulse * 4;
      ctx.beginPath();
      ctx.arc(0, 0, r, a, a + 0.5);
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
    // In the snowball chapter the raft is there the whole time and does
    // nothing, which is the level's way of telling you what the level is
    // about: the way out is not somewhere to get to, it is something to earn.
    // So it is drawn cold and grey and counts down how many are still standing.
    const locked = world.exitLocked;
    ctx.save();
    ctx.translate(x, y + bob);

    // Glow beacon
    const g = ctx.createRadialGradient(0, -40, 4, 0, -40, 90);
    g.addColorStop(0, locked ? 'rgba(150,175,205,0.22)' : 'rgba(120,255,205,0.35)');
    g.addColorStop(1, 'rgba(120,255,205,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-90, -130, 180, 180);

    if (locked) {
      const left = world.rivals.filter((r) => r.guard && !r.out).length;
      // The raft sits ninety pixels from the far wall of the arena, so while
      // you are still at the near end the counter hangs half off the screen —
      // and it is the one number the level is asking you to watch. Slide it
      // back inside the view. A no-op once the raft is comfortably on screen.
      const half = 52;
      const nudge = clamp(
        x, world.camera.x + half, world.camera.x + VIEW.w - half,
      ) - x;
      ctx.fillStyle = 'rgba(10,26,44,0.72)';
      ctx.beginPath();
      ctx.roundRect(nudge - 34, -108, 68, 26, 13);
      ctx.fill();
      ctx.fillStyle = '#ff9aa5';
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t('ui.guardsLeft', { n: left }), nudge, -94);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

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
    ctx.fillStyle = locked ? '#7d8ea4' : '#5ce1a6';
    ctx.beginPath();
    ctx.moveTo(2, -66);
    ctx.quadraticCurveTo(22, -60 + wave, 40, -54);
    ctx.lineTo(2, -44);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * The wind, read off the penguin's own head.
   *
   * Wind is the one hazard in this chapter you are supposed to use rather than
   * survive, and using it means knowing two things: which way it is blowing
   * right now, and when the next tailwind arrives. The snow tells you the
   * first. This tells you the second, because "wait for the good gust" is only
   * a decision if you can see it coming.
   *
   * It rides above the penguin instead of sitting in the corner, so reading it
   * never costs you sight of the gap you are about to jump.
   */
  _windGauge(ctx, world, time) {
    const p = world.player;
    if (!p || !world.windZone) return;
    const cycle = world.windCycle ?? 0;
    const signed = world.windSigned ?? 0;
    const w = p.w * 2.6;
    const x = p.x + p.w / 2 - w / 2;
    const y = p.y - p.h * 0.62;
    const mid = x + w / 2;

    ctx.save();
    // The beat track. The lit stretch is the tailwind, and it comes round the
    // same way every time, so it can be counted rather than guessed at.
    ctx.fillStyle = 'rgba(6,26,44,0.5)';
    ctx.fillRect(x - 1, y + 6, w + 2, 4);
    ctx.fillStyle = 'rgba(150,235,170,0.55)';
    ctx.fillRect(x + w * 0.66, y + 6, w * 0.24, 4);
    ctx.fillStyle = '#eaf6ff';
    ctx.fillRect(x + w * cycle - 1, y + 4, 2, 8);

    // The needle. Length is strength, direction is direction; nothing to read,
    // only something to see.
    const tail = Boolean(world.windTail);
    const len = (w / 2 - 3) * Math.abs(signed);
    ctx.strokeStyle = tail ? '#9ff5b4' : '#cfe4f5';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    if (len > 1) {
      const dir = Math.sign(signed) || 1;
      ctx.beginPath();
      ctx.moveTo(mid, y);
      ctx.lineTo(mid + len * dir, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mid + len * dir, y);
      ctx.lineTo(mid + (len - 6) * dir, y - 4);
      ctx.moveTo(mid + len * dir, y);
      ctx.lineTo(mid + (len - 6) * dir, y + 4);
      ctx.stroke();
    }
    if (tail && !this.reducedMotion) {
      ctx.globalAlpha = 0.25 + 0.35 * Math.sin(time * 9);
      ctx.strokeStyle = '#e6fff0';
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
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
      } else if (h.kind === 'shard') {
        // A serac keeps its own time. While it is still hanging it is drawn
        // with a shivering crack line and a shaft of dust down the fall line,
        // because in a chimney there is nowhere to dodge to — the only way it
        // can be fair is if you can see the clock.
        ctx.save();
        const dropping = h.state === 'drop';
        if (h.state === 'spent') {
          ctx.restore();
          continue;
        }
        if (!dropping) {
          ctx.strokeStyle = 'rgba(255,150,170,0.35)';
          ctx.setLineDash([5, 9]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(h.x + h.w / 2, h.y + h.h);
          ctx.lineTo(h.x + h.w / 2, h.y + h.h + (h.fall ?? 400));
          ctx.stroke();
          ctx.setLineDash([]);
        }
        const shake = dropping ? 0 : Math.sin(time * 48) * 1.8;
        ctx.translate(h.x + shake, h.y);
        if (dropping) {
          ctx.fillStyle = 'rgba(220,240,255,0.35)';
          ctx.fillRect(h.w * 0.2, -34, h.w * 0.6, 34);
        }
        ctx.fillStyle = dropping ? '#eaf6ff' : '#ffd9e0';
        ctx.beginPath();
        ctx.moveTo(h.w * 0.5, 0);
        ctx.lineTo(h.w, h.h * 0.42);
        ctx.lineTo(h.w * 0.72, h.h);
        ctx.lineTo(h.w * 0.2, h.h * 0.88);
        ctx.lineTo(0, h.h * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
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
        // The streaks blow the way the wind is actually blowing, which is the
        // whole point: you read the beat off the snow, not off a meter.
        const signed = h.signed ?? 0;
        const dir = signed === 0 ? 1 : Math.sign(signed * (h.dir ?? 1));
        const t = h.intensity ?? 0;
        ctx.save();

        // Haze: the whole stretch greys out as the surge builds.
        ctx.globalAlpha = 0.06 + t * 0.16;
        // A tailwind is the thing you were waiting for, so it warms rather
        // than greys: the colour is the cue to go.
        ctx.fillStyle = h.tail ? '#dff0d8' : '#cfe4f5';
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
        // An updraft: a column of rising air you jump into. It is drawn as a
        // column and it moves upward, because a player should never have to be
        // told which way a thing pushes.
        const t = h.intensity ?? 0;
        const move = this.reducedMotion ? 0 : 1;
        ctx.save();
        const col = ctx.createLinearGradient(0, h.y + h.h, 0, h.y);
        col.addColorStop(0, `rgba(191,232,255,${0.02 + t * 0.05})`);
        col.addColorStop(1, `rgba(191,232,255,${0.14 + t * 0.18})`);
        ctx.fillStyle = col;
        ctx.fillRect(h.x, h.y, h.w, h.h);

        ctx.globalAlpha = 0.2 + t * 0.4;
        ctx.strokeStyle = '#dff4ff';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        for (let i = 0; i < 9; i++) {
          const seed = i * 61.7;
          const xx = h.x + 14 + ((seed * 5.3) % Math.max(1, h.w - 28));
          const rise = (time * move * (300 + t * 240) + seed * 43) % (h.h + 120);
          const yy = h.y + h.h + 60 - rise;
          const len = 30 + ((seed * 2.7) % 40);
          ctx.beginPath();
          ctx.moveTo(xx, yy);
          ctx.lineTo(xx + Math.sin((yy + seed) * 0.02) * 7, yy - len);
          ctx.stroke();
        }

        // Arrowheads at the mouth, pointing the way out.
        ctx.globalAlpha = 0.3 + t * 0.3;
        for (let i = 0; i < 3; i++) {
          const xx = h.x + (h.w / 4) * (i + 1);
          const yy = h.y + 18 + Math.sin(time * 3 * move + i) * 5;
          ctx.beginPath();
          ctx.moveTo(xx - 9, yy + 9);
          ctx.lineTo(xx, yy);
          ctx.lineTo(xx + 9, yy + 9);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
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
    for (const s of world.skuas ?? []) this._oneShadow(ctx, s, time);
  }

  /**
   * The shadow on the ice, per bird.
   *
   * A hunter's is drawn differently on purpose. Its dive cannot be dodged, so
   * the only fair thing left is to make it unmistakable *before* it starts:
   * the ring is amber rather than red, it does not shrink toward a point
   * because there is no point to shrink to, and it pulses slowly instead of
   * accelerating. Everything about it says "this one is coming to you".
   */
  _oneShadow(ctx, s, time) {
    if (!s || s.state !== 'warn' || s.delay > 0) return;
    const hunter = s.kind === 'hunt';
    const k = Math.min(1, s.t / s.warn);
    const r = hunter ? 40 : 34 * (1 - k * 0.55);
    const beat = hunter
      ? 0.5 + 0.5 * Math.abs(Math.sin(time * 5))
      : 0.35 + 0.65 * Math.abs(Math.sin(time * (7 + k * 26)));

    ctx.save();
    ctx.globalAlpha = (0.28 + 0.5 * k) * beat;
    ctx.fillStyle = '#04101f';
    ctx.beginPath();
    ctx.ellipse(s.targetX, s.targetY + 22, r, r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5 + 0.4 * k;
    ctx.strokeStyle = hunter ? '#ffbe55' : '#ff6b81';
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
    for (const s of world.skuas ?? []) this._oneSkua(ctx, s, time);
  }

  _oneSkua(ctx, s, time) {
    if (!s) return;
    // The second of a pair waits off-screen for half a second. Drawn while it
    // waits, faintly, because a bird you cannot see is not a warning — and the
    // whole reason for a pair is that the player gets to pick a side.
    if (s.delay > 0) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#2b3444';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 22, 7, s.dir * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    const hunter = s.kind === 'hunt';
    const diving = s.state !== 'warn';
    const flap = diving ? 0.9 : Math.sin(time * 14) * 0.55;
    // Big. A skua that reads as a sparrow is not frightening.
    const w = 58;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.dir, 1);
    // Tilt into the dive.
    ctx.rotate(diving ? 0.5 : 0.16 * Math.sin(time * 6));

    // Wings — swept back hard on the strike. A hunter is paler and browner,
    // the colour its own shadow is drawn in, so the thing on the ice and the
    // thing in the sky are recognisably the same bird.
    ctx.fillStyle = hunter ? '#5a4a34' : '#2b3444';
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.quadraticCurveTo(-w * 0.5, sgn * (w * 0.5 + flap * 12), -w * 1.05, sgn * (w * 0.28 + flap * 16));
      ctx.quadraticCurveTo(-w * 0.4, sgn * (w * 0.16), 0, 6);
      ctx.closePath();
      ctx.fill();
    }
    // Body and head
    ctx.fillStyle = hunter ? '#6e5b3e' : '#3a4557';
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

    /**
     * The struggle, drawn.
     *
     * Two things at once: how hard the chick is fighting, as feathers coming
     * off and a wing-beat that gets ragged, and how close it is to winning, as
     * a ring closing around the bird. Neither is a bar and neither is a
     * number, because the whole event lasts two seconds and the player has to
     * be able to read it without looking away from the penguin.
     */
    if (s.state === 'carry') {
      const k = clamp((s.wrest ?? 0) / AMBUSH.shakes, 0, 1);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.strokeStyle = `rgba(255,214,102,${0.35 + 0.55 * k})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 6, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
      ctx.stroke();
      if (!this.reducedMotion) {
        ctx.globalAlpha = 0.5 + 0.5 * (s.jolt ?? 0);
        ctx.fillStyle = '#e8eef7';
        for (let i = 0; i < 5; i++) {
          const a = time * 3 + i * 1.27;
          const r = 26 + ((time * 40 + i * 19) % 34);
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * r * 0.8, 10 + Math.sin(a) * r * 0.5, 3.4, 1.4, a, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

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

  /**
   * The grip: claws in the ice, and how much is left in the arms.
   *
   * The bar rides above the penguin rather than sitting in the HUD, and it is
   * only there when it means something — clinging, or partly spent. A meter in
   * the corner would be a thing to look away for, and on a wall the one place
   * the player cannot afford to look away from is the penguin.
   */
  _grip(ctx, p, body, time) {
    if (p.clinging) {
      // Claws. Four short strokes into the wall, shivering when the bar is low.
      const side = p.wallSide;
      const x = side > 0 ? p.x + p.w : p.x;
      const low = p.staminaFrac < CLIMB.tired;
      const jitter = low ? Math.sin(time * 44) * 1.6 : 0;
      ctx.save();
      ctx.strokeStyle = body;
      ctx.lineWidth = Math.max(1.6, p.w * 0.07);
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const y = p.y + p.h * (0.26 + i * 0.2);
        ctx.beginPath();
        ctx.moveTo(x - side * p.w * 0.18, y + jitter);
        ctx.lineTo(x + side * 4, y - p.h * 0.05 + jitter);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      // Chips of ice coming off the hold, more of them the harder it is going.
      if (!this.reducedMotion) {
        ctx.fillStyle = 'rgba(230,246,255,0.75)';
        const n = p.climbing ? 4 : 2;
        for (let i = 0; i < n; i++) {
          const t = (time * 3 + i * 0.37) % 1;
          ctx.globalAlpha = 0.7 * (1 - t);
          ctx.fillRect(x - side * 2, p.y + p.h * 0.3 + t * p.h * 0.9, 2.5, 2.5);
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    // The bar itself: hidden when full and on the ground, because a meter that
    // is always there stops being read.
    const frac = p.staminaFrac;
    if (frac >= 0.999 && !p.clinging) return;
    const w = p.w * 1.5;
    const x = p.x + p.w / 2 - w / 2;
    const y = p.y - p.h * 0.42;
    ctx.save();
    ctx.fillStyle = 'rgba(8,22,38,0.55)';
    ctx.fillRect(x - 1, y - 1, w + 2, 6);
    const low = frac < CLIMB.tired;
    ctx.fillStyle = low ? '#ff7a8a' : '#9ee6ff';
    ctx.fillRect(x, y, w * Math.max(0, frac), 4);
    if (low && !this.reducedMotion) {
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(time * 14);
      ctx.fillStyle = '#ffd0d8';
      ctx.fillRect(x, y, w * Math.max(0, frac), 4);
    }
    ctx.restore();
  }

  /**
   * The lungs, above the penguin's head.
   *
   * Same place and same shape as the climbing bar, because it is the same
   * question in a different chapter — how much of the thing that keeps you
   * alive is left — and a player who learned to read one on the mountain
   * should not have to learn a second one in the sea. It goes red and beats
   * faster as it empties, and it is always on: unlike a grip, breath is never
   * something you have plenty of down here.
   */
  _breath(ctx, p, time, drain = 1) {
    const frac = clamp(p.breathFrac, 0, 1);
    const w = p.w * 1.6;
    const x = p.x + p.w / 2 - w / 2;
    const y = p.y - p.h * 0.5;
    ctx.save();
    ctx.fillStyle = 'rgba(6,26,44,0.6)';
    ctx.fillRect(x - 1, y - 1, w + 2, 6);
    const low = frac < 0.28;
    ctx.fillStyle = low ? '#ff8a94' : '#8ff0d8';
    ctx.fillRect(x, y, w * frac, 4);
    /**
     * In cold water the bar itself says so.
     *
     * The trench's drain is smooth and depth-dependent, so a swimmer needs to
     * know not only that they are being charged extra but roughly how much —
     * and the only honest place to put that is on the thing being spent. The
     * bar gains a cold outline that thickens with the rate, and it pulses at
     * the rate rather than at a fixed speed, so two-and-a-half times as fast
     * looks two-and-a-half times as urgent.
     */
    if (drain > 1.02) {
      const bite = clamp((drain - 1) / 1.6, 0, 1);
      ctx.strokeStyle = `rgba(150,214,255,${0.45 + 0.4 * Math.abs(Math.sin(time * 3 * drain))})`;
      ctx.lineWidth = 1 + bite * 1.6;
      ctx.strokeRect(x - 1.5, y - 1.5, w + 3, 7);
    }
    if (low && !this.reducedMotion) {
      ctx.globalAlpha = 0.3 + 0.4 * Math.sin(time * (10 + (1 - frac) * 22));
      ctx.fillStyle = '#ffe3e7';
      ctx.fillRect(x, y, w * frac, 4);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // Bubbles. They only come out while the penguin is working — diving — so
    // they read as effort rather than as decoration, and they go *up*, which
    // is the one thing on screen that always tells you which way the surface
    // is when the ceiling is out of frame.
    if (this.reducedMotion || !p.diving) return;
    ctx.save();
    ctx.fillStyle = 'rgba(214,244,255,0.5)';
    for (let i = 0; i < 3; i++) {
      const t = (time * 1.6 + i * 0.33) % 1;
      const r = 1.4 + (i % 2) * 1.1;
      ctx.globalAlpha = 0.55 * (1 - t);
      ctx.beginPath();
      ctx.arc(
        p.x + p.w * (0.5 - p.facing * 0.34) + Math.sin(time * 5 + i) * 3,
        p.y + p.h * 0.4 - t * p.h * 1.8,
        r,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * The snowball fight: the rivals, what they are about to do, and what they
   * have already done.
   *
   * The aim line is the whole user interface of the chapter. A rival that
   * winds up and throws with no warning is a coin toss; a rival that draws the
   * shot on the ice for two thirds of a second before releasing it is a
   * puzzle, because that line is the thing the player is arranging. So it is
   * drawn long, drawn bright, and drawn all the way to where it will end —
   * through whoever happens to be standing in it, which is the point.
   */
  _brawl(ctx, world, time) {
    const view = this._viewBounds(world);

    for (const r of world.rivals) {
      if (r.x + r.w < view.left - 80 || r.x > view.right + 80) continue;

      if (r.out) {
        // A heap of snow where a penguin was. It stays for the rest of the
        // level: what you have already solved should keep being visible.
        ctx.fillStyle = 'rgba(232,246,255,0.9)';
        ctx.beginPath();
        ctx.ellipse(r.x + r.w / 2, r.y + r.h - 4, r.w * 0.62, r.h * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(150,196,230,0.5)';
        ctx.beginPath();
        ctx.ellipse(r.x + r.w / 2, r.y + r.h - 1, r.w * 0.7, r.h * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      /**
       * A lob's telegraph is the arc it will actually take.
       *
       * The straight aim line is the whole user interface of this chapter, and
       * for a thrower who arcs it over a pillar a straight line is not merely
       * unhelpful, it is a lie — it points at the pillar the ball is going to
       * clear. So the arc is drawn from the same ballistics the ball will fly,
       * with the landing spot marked on the ice, because what a lobbed shot
       * takes away is the safety of a place rather than the safety of a line.
       */
      if (r.aim && r.lobs && !this.reducedMotion) {
        const hand = r.hand;
        const shot = lobShot(hand, r.aim);
        const charge = clamp(1 - r.timer / BRAWL.windup, 0, 1);
        ctx.save();
        ctx.setLineDash([8, 8]);
        ctx.lineDashOffset = -time * 60;
        ctx.strokeStyle = `rgba(255,214,150,${0.26 + charge * 0.5})`;
        ctx.lineWidth = 1.6 + charge * 1.6;
        ctx.beginPath();
        for (let i = 0; i <= 26; i++) {
          const t = (i / 26) * shot.time;
          const px = hand.x + shot.vx * t;
          const py = hand.y + shot.vy * t + 0.5 * BRAWL.lobGravity * t * t;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        // Where it comes down. This is the part the player has to leave.
        ctx.strokeStyle = `rgba(255,190,120,${0.4 + charge * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(r.aim.x, r.aim.y, 16 + charge * 6, 6 + charge * 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // The aim, while it is being taken.
      if (r.aim && !r.lobs && !this.reducedMotion) {
        const hand = r.hand;
        const dx = r.aim.x - hand.x;
        const dy = r.aim.y - hand.y;
        const len = Math.hypot(dx, dy) || 1;
        // Carry the line well past the aim point: what the player is arranging
        // is what the ball passes *through*, and a line that stops at their own
        // feet hides exactly that.
        const far = { x: hand.x + (dx / len) * (len + 260), y: hand.y + (dy / len) * (len + 260) };
        const charge = clamp(1 - r.timer / BRAWL.windup, 0, 1);
        ctx.save();
        ctx.setLineDash([9, 9]);
        ctx.lineDashOffset = -time * 90;
        ctx.strokeStyle = `rgba(255,236,180,${0.28 + charge * 0.5})`;
        ctx.lineWidth = 1.6 + charge * 1.6;
        ctx.beginPath();
        ctx.moveTo(hand.x, hand.y);
        ctx.lineTo(far.x, far.y);
        ctx.stroke();
        ctx.restore();
      }

      this._rival(ctx, r, time);
    }

    for (const b of world.snowballs) {
      const g = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 1, b.x, b.y, b.r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#bcdcf2');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      if (this.reducedMotion) continue;
      // A short streak behind it, so a fast ball reads as a fast ball.
      const len = Math.hypot(b.vx, b.vy) || 1;
      ctx.strokeStyle = 'rgba(226,244,255,0.35)';
      ctx.lineWidth = b.r * 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - (b.vx / len) * 26, b.y - (b.vy / len) * 26);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }

  /**
   * One rival, drawn as a penguin and not as a hazard.
   *
   * Simplified on purpose — a flat silhouette with a scarf — because the
   * player has to read *where it is looking* and *whether it is winding up*
   * from across the arena, and the full hand-drawn bird has too much going on
   * at that size. A guard wears a red scarf and a heckler a blue one, which is
   * the only thing separating "shut the door" from "just noise".
   */
  _rival(ctx, r, time) {
    const cx = r.x + r.w / 2;
    const by = r.y + r.h;
    const wind = r.aim ? clamp(1 - r.timer / BRAWL.windup, 0, 1) : 0;
    const lean = r.facing * wind * 4;

    ctx.save();
    ctx.translate(lean, 0);

    // Body
    ctx.fillStyle = '#232b3d';
    ctx.beginPath();
    ctx.ellipse(cx, by - r.h * 0.42, r.w * 0.44, r.h * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    // Belly
    ctx.fillStyle = '#f2f7ff';
    ctx.beginPath();
    ctx.ellipse(cx + r.facing * 2, by - r.h * 0.38, r.w * 0.26, r.h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = '#232b3d';
    ctx.beginPath();
    ctx.arc(cx, by - r.h * 0.78, r.w * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Eye and beak, both on the side it is facing
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + r.facing * r.w * 0.12, by - r.h * 0.82, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb03a';
    ctx.beginPath();
    ctx.moveTo(cx + r.facing * r.w * 0.28, by - r.h * 0.78);
    ctx.lineTo(cx + r.facing * r.w * 0.5, by - r.h * 0.74);
    ctx.lineTo(cx + r.facing * r.w * 0.28, by - r.h * 0.7);
    ctx.closePath();
    ctx.fill();
    // Feet
    ctx.fillStyle = '#ff9a2e';
    ctx.fillRect(cx - r.w * 0.26, by - 3, r.w * 0.22, 3);
    ctx.fillRect(cx + r.w * 0.05, by - 3, r.w * 0.22, 3);
    // Scarf: red guards the door, blue just throws
    ctx.fillStyle = r.guard ? '#ff5f6d' : '#5fc9ff';
    ctx.fillRect(cx - r.w * 0.3, by - r.h * 0.64, r.w * 0.6, 4);
    ctx.beginPath();
    ctx.moveTo(cx - r.facing * r.w * 0.22, by - r.h * 0.62);
    ctx.lineTo(cx - r.facing * r.w * 0.5, by - r.h * 0.46 + Math.sin(time * 3 + cx) * 2);
    ctx.lineTo(cx - r.facing * r.w * 0.34, by - r.h * 0.44);
    ctx.closePath();
    ctx.fill();

    // The snowball in the raised flipper, growing as the wind-up finishes.
    if (wind > 0) {
      const hx = cx - r.facing * r.w * (0.34 + wind * 0.2);
      const hy = by - r.h * (0.5 + wind * 0.26);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx, hy, 3 + wind * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

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
    if ((p.charge > 0 || p.blinked > 0) && !this.reducedMotion) {
      // A blink leaves the same shape of streak as a boost, in the blink's own
      // colour, so the two never get confused for one another at speed.
      const blinking = p.blinked > 0;
      for (const g of p.trail) {
        const a = Math.max(0, g.life / (blinking ? 0.3 : 0.22));
        ctx.save();
        ctx.globalAlpha = a * (blinking ? 0.55 : 0.4);
        ctx.fillStyle = blinking
          ? withAlpha(CHARGED.quantum.tint, 1)
          : a > 0.5 ? '#ff5560' : '#ffd23f';
        ctx.beginPath();
        ctx.ellipse(g.x + p.w / 2, g.y + p.h * 0.55, p.w * 0.42, p.h * 0.46, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    /**
     * What the button currently means, drawn as a ring under the bird.
     *
     * Three effects, all short, all invisible until the player presses the
     * button — which is exactly the situation that needs a permanent reminder
     * on the character rather than a line of text that has already faded. The
     * ring is on the ice at his feet, where the eye already is.
     *
     * The coil is the odd one out: its ring winds tighter as the timer runs
     * down, because that clock is a threat rather than a gift. When it closes,
     * the spring goes off whether the player asked for it or not.
     */
    const aura = p.coilArmed
      ? { tint: CHARGED.coil.tint, k: clamp(p.coil / COIL.duration, 0, 1), wind: true }
      : p.quantum > 0
        ? { tint: CHARGED.quantum.tint, k: clamp(p.quantum / QUANTUM.duration, 0, 1), spent: p.quantumUsed }
        : p.slack > 0
          ? { tint: CHARGED.slack.tint, k: clamp(p.slack / SLACK.duration, 0, 1) }
          : null;
    if (aura && !this.reducedMotion) {
      const rx = p.w * (aura.wind ? 0.5 + aura.k * 0.5 : 0.9);
      ctx.save();
      ctx.globalAlpha = aura.spent ? 0.3 : 0.55 + 0.35 * Math.sin(time * 8);
      ctx.strokeStyle = withAlpha(aura.tint, 1);
      ctx.lineWidth = 2.5;
      if (aura.spent) ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + p.h, rx, rx * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // The remaining time, as the arc that is still closed.
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(
        p.x + p.w / 2,
        p.y + p.h,
        rx + 4,
        (rx + 4) * 0.32,
        0,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * aura.k,
      );
      ctx.stroke();
      ctx.restore();
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
    // Under the ice the bird tips into its heading.
    //
    // It noses down as it dives and levels out as it cruises, pivoting around
    // the middle of its body rather than its feet — swung around the feet a
    // standing pose travels a body-length sideways, which reads as being
    // thrown rather than as swimming.
    //
    // Not a full quarter turn onto its belly, which is what a real penguin
    // does and what this wanted to be. The sprite is drawn for standing: the
    // beak points sideways out of the head, so laid flat it points at the
    // seabed, and every version of the ninety-degree pose put the white belly
    // up or the eyes underneath. A tilt is honest about what the drawing can
    // do, and with the water, the bubbles and the ceiling overhead nobody is
    // in any doubt about what is happening.
    const py = p.submerged ? p.y + p.h * 0.5 : by;
    ctx.translate(cx, py);
    ctx.scale(sx, sy);
    if (p.submerged) {
      const pitch = clamp(Math.atan2(p.vy, Math.max(Math.abs(p.vx), 190)), -0.9, 0.9);
      ctx.rotate(p.facing * pitch * 0.85);
    }
    ctx.translate(-cx, -py);

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

    this._grip(ctx, p, body, time);
    if (p.submerged) this._breath(ctx, p, time, world.drain ?? 1);

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
