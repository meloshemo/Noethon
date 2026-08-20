/**
 * Penguin skins.
 *
 * The penguin is drawn from scratch every frame, so a skin is not an image —
 * it is a palette plus a small painter that adds whatever the character wears.
 * That means a skin costs about a kilobyte, works at every growth scale, and
 * follows the squash-and-stretch of the body for free.
 *
 * Almost every skin is earned rather than bought. A thing you can buy is a
 * transaction; a thing you unlocked by finishing fifty levels without dying is
 * a record of what you did, and it is the reason to play one more round.
 *
 * `paint` runs inside the body transform, after the penguin is drawn, with:
 *   geo = { cx, by, w, h, bodyH, headY, facing, step, time }
 * where cx/by are the centre and the feet, and headY is the eye line.
 */

import { t } from '../core/i18n.js';

/**
 * Rarity.
 *
 * Not a power level — everything here is cosmetic and always will be. It is a
 * grammar for *how hard this was to get*, so a card can say at a glance whether
 * it is a starting item or the thing somebody played all week for.
 */
export const RARITY = {
  common: { name: 'Yaygın', color: '#8fc4e2', order: 0, en: { name: 'Common' } },
  rare: { name: 'Nadir', color: '#4fd7ff', order: 1, en: { name: 'Rare' } },
  epic: { name: 'Efsanevi', color: '#9b8cff', order: 2, en: { name: 'Epic' } },
  mythic: { name: 'Mitik', color: '#ffd23f', order: 3, en: { name: 'Mythic' } },
  diamond: { name: 'Elmas', color: '#7ce8ff', order: 4, en: { name: 'Diamond' } },
};

/**
 * Diamond penguins carry a perk.
 *
 * This is the one place the collection stops being purely cosmetic, so the
 * rules around it are tight:
 *
 *   — every perk is a *modifier on an existing stat*, never a new verb. No
 *     penguin can do something the game does not already let you do.
 *   — the numbers are small, roughly one shop tier. A diamond penguin is worth
 *     wearing, never worth needing.
 *   — every level is still validated against a penguin with nothing at all, so
 *     no perk can ever unlock a course. Same contract the shop has always had.
 *
 * Wearing one costs you the choice of wearing anything else, which is the
 * balance: the perk and the look are the same slot.
 */
export const PERKS = {
  jump: { fmt: (v) => t('perk.jump', { n: Math.round(v * 100) }) },
  speed: { fmt: (v) => t('perk.speed', { n: Math.round(v * 100) }) },
  glide: { fmt: (v) => t('perk.glide', { n: v.toFixed(1) }) },
  grip: { fmt: (v) => t('perk.grip', { n: Math.round(v * 100) }) },
  magnet: { fmt: (v) => t('perk.magnet', { n: v }) },
  radar: { fmt: (v) => t('perk.radar', { n: v.toFixed(2) }) },
};

/** Human-readable perk list for a card. */
export function perkText(skin) {
  if (!skin.perk) return null;
  return Object.entries(skin.perk)
    .map(([k, v]) => PERKS[k]?.fmt(v) ?? '')
    .filter(Boolean)
    .join(' · ');
}

/** Where an unlock's progress is read from. Kept here so the UI can show it. */
export const FEATS = {
  flawless: { read: (s) => s.stats.flawless ?? 0 },
  fish: { read: (s) => s.stats.totalFish ?? 0 },
  meters: { read: (s) => Math.floor(s.stats.endlessMeters ?? 0) },
  streak: { read: (s) => s.daily?.bestStreak ?? 0 },
  perfect: { read: (s) => Object.values(s.levels).filter((l) => l.stars >= 3).length },
  boosts: { read: (s) => s.stats.boosts ?? 0 },
  diamond: { read: (s) => ((s.league?.bestTier ?? 0) >= 3 ? 1 : 0) },
  skua: { read: (s) => s.stats.skuaDodges ?? 0 },
  glide: { read: (s) => Math.floor(s.stats.glideSeconds ?? 0) },
  rockets: { read: (s) => s.stats.rocketFires ?? 0 },
  spent: { read: (s) => s.stats.spent ?? 0 },
  deaths: { read: (s) => s.stats.totalDeaths ?? 0 },
  plays: { read: (s) => s.stats.totalPlays ?? 0 },
  night: { read: (s) => s.stats.nightRuns ?? 0 },
  wardrobe: { read: (s) => Object.keys(s.skins ?? {}).length },
};

/* ------------------------------------------------------------------ */
/* Painters                                                            */
/* ------------------------------------------------------------------ */

/** A helmet dome — the astronaut's bubble, drawn over the head. */
const bubble = (ctx, g) => {
  ctx.save();
  ctx.strokeStyle = 'rgba(190,235,255,0.85)';
  ctx.lineWidth = Math.max(1.4, g.w * 0.045);
  ctx.fillStyle = 'rgba(150,215,255,0.18)';
  ctx.beginPath();
  ctx.arc(g.cx + g.facing * g.w * 0.04, g.headY - g.h * 0.02, g.w * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Reflection, so the glass reads as glass.
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = Math.max(1, g.w * 0.03);
  ctx.beginPath();
  ctx.arc(g.cx - g.w * 0.12, g.headY - g.h * 0.08, g.w * 0.22, Math.PI * 0.9, Math.PI * 1.5);
  ctx.stroke();
  ctx.restore();
};

const jetpack = (ctx, g) => {
  ctx.save();
  ctx.fillStyle = '#c9d6e4';
  ctx.fillRect(g.cx - g.facing * g.w * 0.52, g.by - g.bodyH * 0.85, g.w * 0.2, g.bodyH * 0.5);
  // Thrust only while airborne, which makes the jump read as a launch.
  if (g.airborne) {
    const flick = 0.6 + 0.4 * Math.sin(g.time * 40);
    const fx = g.cx - g.facing * g.w * 0.42;
    const fy = g.by - g.bodyH * 0.35;
    const flame = ctx.createLinearGradient(fx, fy, fx, fy + g.h * 0.5 * flick);
    flame.addColorStop(0, 'rgba(255,220,120,0.95)');
    flame.addColorStop(1, 'rgba(255,90,40,0)');
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(fx - g.w * 0.09, fy);
    ctx.lineTo(fx + g.w * 0.09, fy);
    ctx.lineTo(fx, fy + g.h * 0.5 * flick);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

const headband = (ctx, g, color, tail = true) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(g.cx + g.facing * g.w * 0.04, g.headY - g.h * 0.09, g.w * 0.35, g.h * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  if (tail) {
    // Two ribbons streaming back, angled by how fast the bird is moving.
    const sway = Math.sin(g.time * 12) * 0.25;
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(g.cx - g.facing * g.w * 0.3, g.headY - g.h * 0.09);
      ctx.quadraticCurveTo(
        g.cx - g.facing * g.w * 0.62,
        g.headY - g.h * 0.05 + k * g.h * 0.06 + sway * g.h * 0.1,
        g.cx - g.facing * g.w * 0.86,
        g.headY + k * g.h * 0.09 + sway * g.h * 0.14,
      );
      ctx.lineWidth = Math.max(1.4, g.w * 0.05);
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }
  ctx.restore();
};

const crown = (ctx, g) => {
  ctx.save();
  const w = g.w * 0.46;
  const y = g.headY - g.h * 0.2;
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(g.cx - w / 2, y);
  ctx.lineTo(g.cx - w / 2, y - g.h * 0.14);
  ctx.lineTo(g.cx - w * 0.18, y - g.h * 0.05);
  ctx.lineTo(g.cx, y - g.h * 0.18);
  ctx.lineTo(g.cx + w * 0.18, y - g.h * 0.05);
  ctx.lineTo(g.cx + w / 2, y - g.h * 0.14);
  ctx.lineTo(g.cx + w / 2, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff5f6d';
  ctx.beginPath();
  ctx.arc(g.cx, y - g.h * 0.055, g.w * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const pirateHat = (ctx, g) => {
  ctx.save();
  const y = g.headY - g.h * 0.16;
  ctx.fillStyle = '#1b2333';
  ctx.beginPath();
  ctx.moveTo(g.cx - g.w * 0.5, y);
  ctx.quadraticCurveTo(g.cx, y - g.h * 0.3, g.cx + g.w * 0.5, y);
  ctx.quadraticCurveTo(g.cx, y + g.h * 0.06, g.cx - g.w * 0.5, y);
  ctx.fill();
  // Skull
  ctx.fillStyle = '#f2f7ff';
  ctx.beginPath();
  ctx.arc(g.cx, y - g.h * 0.1, g.w * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b2333';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(g.cx + k * g.w * 0.03, y - g.h * 0.11, g.w * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }
  // Eyepatch
  ctx.strokeStyle = '#101722';
  ctx.lineWidth = Math.max(1.2, g.w * 0.035);
  ctx.beginPath();
  ctx.moveTo(g.cx - g.w * 0.28, g.headY - g.h * 0.06);
  ctx.lineTo(g.cx + g.w * 0.3, g.headY - g.h * 0.02);
  ctx.stroke();
  ctx.fillStyle = '#101722';
  ctx.beginPath();
  ctx.ellipse(g.cx + g.facing * g.w * 0.19, g.headY - g.h * 0.03, g.w * 0.09, g.h * 0.075, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const santaHat = (ctx, g) => {
  ctx.save();
  const y = g.headY - g.h * 0.16;
  ctx.fillStyle = '#e23b4b';
  ctx.beginPath();
  ctx.moveTo(g.cx - g.w * 0.34, y);
  ctx.quadraticCurveTo(g.cx - g.w * 0.1, y - g.h * 0.36, g.cx + g.facing * g.w * 0.42, y - g.h * 0.24);
  ctx.quadraticCurveTo(g.cx + g.w * 0.1, y - g.h * 0.05, g.cx + g.w * 0.34, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(g.cx, y, g.w * 0.38, g.h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(g.cx + g.facing * g.w * 0.44, y - g.h * 0.24, g.w * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const visor = (ctx, g, color, glow) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = glow;
  ctx.shadowBlur = g.w * 0.4;
  ctx.beginPath();
  ctx.roundRect?.(
    g.cx + g.facing * g.w * 0.04 - g.w * 0.3,
    g.headY - g.h * 0.09,
    g.w * 0.6,
    g.h * 0.11,
    g.h * 0.04,
  );
  if (!ctx.roundRect) ctx.rect(g.cx - g.w * 0.26, g.headY - g.h * 0.09, g.w * 0.6, g.h * 0.11);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Scan line, so the visor is clearly a screen.
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const sy = g.headY - g.h * 0.085 + ((g.time * 40) % 10) * (g.h * 0.01);
  ctx.fillRect(g.cx + g.facing * g.w * 0.04 - g.w * 0.28, sy, g.w * 0.56, 1);
  ctx.restore();
};

/** Flames licking up the body — used by the fire skin. */
const flames = (ctx, g) => {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const t = g.time * 9 + i * 1.7;
    const px = g.cx + Math.sin(t) * g.w * 0.36;
    const py = g.by - g.bodyH * (0.15 + 0.28 * ((Math.sin(t * 1.3) + 1) / 2));
    const r = g.w * (0.14 + 0.06 * Math.sin(t * 2.1));
    const grad = ctx.createRadialGradient(px, py, 0, px, py, r * 2.4);
    grad.addColorStop(0, 'rgba(255,225,140,0.75)');
    grad.addColorStop(0.5, 'rgba(255,120,40,0.35)');
    grad.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

/** A slow shimmer across the body — the gold skin's tell. */
const shimmer = (ctx, g) => {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const phase = (g.time * 0.6) % 1;
  const x = g.cx - g.w + phase * g.w * 2.4;
  const grad = ctx.createLinearGradient(x - g.w * 0.3, 0, x + g.w * 0.3, 0);
  grad.addColorStop(0, 'rgba(255,240,180,0)');
  grad.addColorStop(0.5, 'rgba(255,245,200,0.45)');
  grad.addColorStop(1, 'rgba(255,240,180,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(g.cx, g.by - g.bodyH * 0.5, g.w * 0.48, g.bodyH * 0.54, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/** Goggles pushed up on the brow, for the explorer and the diver. */
const goggles = (ctx, g, glass, strap) => {
  ctx.save();
  ctx.strokeStyle = strap;
  ctx.lineWidth = Math.max(1.6, g.w * 0.05);
  ctx.beginPath();
  ctx.moveTo(g.cx - g.w * 0.33, g.headY - g.h * 0.05);
  ctx.lineTo(g.cx + g.w * 0.33, g.headY - g.h * 0.05);
  ctx.stroke();
  ctx.fillStyle = glass;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(
      g.cx + g.facing * g.w * 0.12 + sgn * g.w * 0.13,
      g.headY - g.h * 0.05,
      g.w * 0.105,
      g.h * 0.085,
      0, 0, Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(g.cx + g.facing * g.w * 0.06, g.headY - g.h * 0.08, g.w * 0.03, g.h * 0.025, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/** A fur-trimmed parka hood around the head. */
const hood = (ctx, g, shell, fur) => {
  ctx.save();
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.arc(g.cx + g.facing * g.w * 0.02, g.headY - g.h * 0.02, g.w * 0.44, Math.PI * 0.82, Math.PI * 2.18);
  ctx.fill();
  ctx.strokeStyle = fur;
  ctx.lineWidth = Math.max(2.6, g.w * 0.1);
  ctx.beginPath();
  ctx.arc(g.cx + g.facing * g.w * 0.02, g.headY - g.h * 0.02, g.w * 0.44, Math.PI * 0.86, Math.PI * 2.14);
  ctx.stroke();
  ctx.restore();
};

/** A top hat, worn straight. */
const topHat = (ctx, g, band = '#e23b4b') => {
  ctx.save();
  const y = g.headY - g.h * 0.19;
  ctx.fillStyle = '#12161f';
  ctx.fillRect(g.cx - g.w * 0.42, y - g.h * 0.02, g.w * 0.84, g.h * 0.05);
  ctx.fillRect(g.cx - g.w * 0.24, y - g.h * 0.34, g.w * 0.48, g.h * 0.34);
  ctx.fillStyle = band;
  ctx.fillRect(g.cx - g.w * 0.24, y - g.h * 0.1, g.w * 0.48, g.h * 0.06);
  ctx.restore();
};

/** A bow tie under the beak — the joke the whole species is built on. */
const bowTie = (ctx, g, color = '#12161f') => {
  ctx.save();
  ctx.fillStyle = color;
  const y = g.headY + g.h * 0.17;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(g.cx, y);
    ctx.lineTo(g.cx + sgn * g.w * 0.2, y - g.h * 0.06);
    ctx.lineTo(g.cx + sgn * g.w * 0.2, y + g.h * 0.06);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(g.cx, y, g.w * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/** Antennae with a bobbing tip. */
const antennae = (ctx, g, color) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, g.w * 0.035);
  for (const sgn of [-1, 1]) {
    const bob = Math.sin(g.time * 6 + sgn) * g.h * 0.03;
    ctx.beginPath();
    ctx.moveTo(g.cx + sgn * g.w * 0.14, g.headY - g.h * 0.18);
    ctx.quadraticCurveTo(
      g.cx + sgn * g.w * 0.26,
      g.headY - g.h * 0.34,
      g.cx + sgn * g.w * 0.2,
      g.headY - g.h * 0.44 + bob,
    );
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(g.cx + sgn * g.w * 0.2, g.headY - g.h * 0.44 + bob, g.w * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

/** A knight's great helm with a slit and a plume. */
const helm = (ctx, g) => {
  ctx.save();
  ctx.fillStyle = '#9aa8bd';
  ctx.beginPath();
  ctx.ellipse(g.cx + g.facing * g.w * 0.04, g.headY - g.h * 0.02, g.w * 0.38, g.h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d1420';
  ctx.fillRect(g.cx - g.w * 0.3, g.headY - g.h * 0.06, g.w * 0.66, g.h * 0.06);
  ctx.fillStyle = '#c3ced9';
  ctx.fillRect(g.cx + g.facing * g.w * 0.02 - g.w * 0.03, g.headY - g.h * 0.24, g.w * 0.06, g.h * 0.34);
  // Plume
  ctx.fillStyle = '#e23b4b';
  ctx.beginPath();
  ctx.moveTo(g.cx, g.headY - g.h * 0.26);
  ctx.quadraticCurveTo(
    g.cx - g.facing * g.w * 0.3,
    g.headY - g.h * (0.52 + 0.04 * Math.sin(g.time * 8)),
    g.cx - g.facing * g.w * 0.44,
    g.headY - g.h * 0.2,
  );
  ctx.quadraticCurveTo(g.cx - g.facing * g.w * 0.18, g.headY - g.h * 0.3, g.cx, g.headY - g.h * 0.2);
  ctx.fill();
  ctx.restore();
};

/** Aurora ribbons streaming off the body. */
const auroraRibbons = (ctx, g) => {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = Math.max(2, g.w * 0.09);
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const hue = 150 + i * 55;
    const ph = g.time * 2.2 + i * 2.1;
    ctx.strokeStyle = `hsla(${hue}, 90%, 68%, 0.5)`;
    ctx.beginPath();
    ctx.moveTo(g.cx - g.facing * g.w * 0.3, g.by - g.bodyH * (0.35 + i * 0.2));
    ctx.quadraticCurveTo(
      g.cx - g.facing * g.w * (0.8 + 0.2 * Math.sin(ph)),
      g.by - g.bodyH * (0.5 + i * 0.22) + Math.sin(ph * 1.3) * g.h * 0.12,
      g.cx - g.facing * g.w * 1.3,
      g.by - g.bodyH * (0.3 + i * 0.26) + Math.cos(ph) * g.h * 0.16,
    );
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.restore();
};

/** Frost crystals growing off the shoulders. */
const crystals = (ctx, g) => {
  ctx.save();
  ctx.fillStyle = 'rgba(190,240,255,0.85)';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * 0.85 + (i / 4) * Math.PI * 0.7;
    const r = g.w * 0.44;
    const px = g.cx + Math.cos(a) * r;
    const py = g.by - g.bodyH * 0.62 + Math.sin(a) * g.bodyH * 0.34;
    const len = g.h * (0.1 + 0.06 * Math.sin(g.time * 2 + i));
    ctx.beginPath();
    ctx.moveTo(px - g.w * 0.04, py);
    ctx.lineTo(px + g.w * 0.04, py);
    ctx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

/* ------------------------------------------------------------------ */
/* The catalogue                                                       */
/* ------------------------------------------------------------------ */

/**
 * `body` may be a function of the growth scale, because the ordinary penguin
 * darkens as it grows up and the others do not.
 */
export const SKINS = [
  {
    id: 'normal',
    rarity: 'common',
    name: 'Penguen',
    blurb: 'Yeni yumurtadan çıkmış hâli. Büyüdükçe tüyleri koyulaşır.',
    en: { name: 'Penguin', blurb: 'Fresh out of the egg. The feathers darken as it grows.' },
    tint: '#4a5a72',
    grows: true,
    belly: '#f6fbff',
    beak: '#ff9c3f',
    foot: '#ff9c3f',
    unlock: { kind: 'default' },
  },
  {
    id: 'ninja',
    rarity: 'rare',
    name: 'Ninja Penguen',
    blurb: 'Ölmeden geçmeyi bilenlere.',
    en: { name: 'Ninja Penguin', blurb: 'For the ones who get through without dying.' },
    tint: '#1d2330',
    belly: '#39404f',
    beak: '#d9a441',
    foot: '#d9a441',
    eye: '#ff5f6d',
    paint: (ctx, g) => headband(ctx, g, '#e23b4b'),
    unlock: { kind: 'feat', feat: 'flawless', goal: 50 },
  },
  {
    id: 'king',
    rarity: 'epic',
    name: 'Kral Penguen',
    blurb: 'Buzulun tacı senindir.',
    en: { name: 'King Penguin', blurb: 'The crown of the glacier is yours.' },
    tint: '#2a3550',
    belly: '#fff4d6',
    beak: '#ffb43f',
    foot: '#ffb43f',
    paint: (ctx, g) => {
      // A gold sash across the chest, then the crown.
      ctx.save();
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = Math.max(2, g.w * 0.09);
      ctx.beginPath();
      ctx.moveTo(g.cx - g.w * 0.3, g.by - g.bodyH * 0.8);
      ctx.lineTo(g.cx + g.w * 0.28, g.by - g.bodyH * 0.24);
      ctx.stroke();
      ctx.restore();
      crown(ctx, g);
    },
    unlock: { kind: 'feat', feat: 'fish', goal: 1000 },
  },
  {
    id: 'astronaut',
    rarity: 'epic',
    name: 'Astronot Penguen',
    blurb: 'Sonsuz modda çok uzağa gidenlere.',
    en: { name: 'Astronaut Penguin', blurb: 'For going a very long way in endless mode.' },
    tint: '#dfe7f2',
    belly: '#ffffff',
    beak: '#ffb43f',
    foot: '#9aa8bd',
    eye: '#1b2333',
    paint: (ctx, g) => {
      jetpack(ctx, g);
      bubble(ctx, g);
    },
    behind: true,
    unlock: { kind: 'feat', feat: 'meters', goal: 5000 },
  },
  {
    id: 'golden',
    rarity: 'mythic',
    name: 'Altın Penguen',
    blurb: 'Yedi gün üst üste günün bölümünü bitirenlere.',
    en: { name: 'Golden Penguin', blurb: 'For seven days of the daily level in a row.' },
    tint: '#c9922b',
    belly: '#ffe9a8',
    beak: '#fff2c4',
    foot: '#fff2c4',
    eye: '#3d2a06',
    paint: shimmer,
    aura: 'rgba(255,214,90,0.30)',
    unlock: { kind: 'feat', feat: 'streak', goal: 7 },
  },
  {
    id: 'pirate',
    rarity: 'rare',
    name: 'Korsan Penguen',
    blurb: 'Üç yıldızı toplamayı huy edinenlere.',
    en: { name: 'Pirate Penguin', blurb: 'For making a habit of three stars.' },
    tint: '#33405a',
    belly: '#e8eef7',
    beak: '#ff9c3f',
    foot: '#ff9c3f',
    paint: pirateHat,
    unlock: { kind: 'feat', feat: 'perfect', goal: 20 },
  },
  {
    id: 'fire',
    rarity: 'epic',
    name: 'Ateş Penguen',
    blurb: 'Hız balığını huy edinenlere.',
    en: { name: 'Fire Penguin', blurb: 'For making a habit of the speed fish.' },
    tint: '#5a1c1c',
    belly: '#ffd9a0',
    beak: '#ffcf3f',
    foot: '#ff7a2f',
    eye: '#ffd23f',
    paint: flames,
    aura: 'rgba(255,120,40,0.34)',
    unlock: { kind: 'feat', feat: 'boosts', goal: 15 },
  },
  {
    id: 'cyber',
    rarity: 'mythic',
    name: 'Siber Penguen',
    blurb: 'Elmas lige çıkanlara.',
    en: { name: 'Cyber Penguin', blurb: 'For reaching the Diamond league.' },
    tint: '#1a2140',
    belly: '#2b3a6b',
    beak: '#38f2d0',
    foot: '#38f2d0',
    eye: '#38f2d0',
    paint: (ctx, g) => {
      // Circuit lines down the belly, then the visor over the eyes.
      ctx.save();
      ctx.strokeStyle = 'rgba(56,242,208,0.75)';
      ctx.lineWidth = Math.max(1, g.w * 0.025);
      for (const k of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.moveTo(g.cx + k * g.w * 0.14, g.by - g.bodyH * 0.72);
        ctx.lineTo(g.cx + k * g.w * 0.14, g.by - g.bodyH * 0.44);
        ctx.lineTo(g.cx + k * g.w * 0.22, g.by - g.bodyH * 0.3);
        ctx.stroke();
      }
      ctx.restore();
      visor(ctx, g, '#0d1b3a', 'rgba(56,242,208,0.9)');
    },
    aura: 'rgba(56,242,208,0.26)',
    unlock: { kind: 'feat', feat: 'diamond', goal: 1 },
  },
  {
    id: 'christmas',
    rarity: 'rare',
    name: 'Yılbaşı Penguen',
    blurb: 'Aralık ayında bedava, diğer aylarda balıkla.',
    en: { name: 'Winter Penguin', blurb: 'Free through December, fish the rest of the year.' },
    tint: '#1f4030',
    belly: '#f4fff8',
    beak: '#ff9c3f',
    foot: '#ff9c3f',
    paint: (ctx, g) => {
      // Scarf first, then the hat over it.
      ctx.save();
      ctx.fillStyle = '#e23b4b';
      ctx.fillRect(g.cx - g.w * 0.33, g.headY + g.h * 0.14, g.w * 0.66, g.h * 0.09);
      ctx.beginPath();
      ctx.moveTo(g.cx - g.facing * g.w * 0.3, g.headY + g.h * 0.16);
      ctx.lineTo(g.cx - g.facing * g.w * 0.46, g.headY + g.h * 0.44 + Math.sin(g.time * 8) * g.h * 0.03);
      ctx.lineTo(g.cx - g.facing * g.w * 0.3, g.headY + g.h * 0.44);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      santaHat(ctx, g);
    },
    unlock: { kind: 'coins', cost: 520, freeInDecember: true },
  },

  /* ---------------------------------------------------- the wardrobe */
  {
    id: 'tuxedo',
    rarity: 'rare',
    name: 'Frak Penguen',
    blurb: 'Zaten smokin giyiyordu. Şimdi ciddiye alıyor.',
    en: { name: 'Tailcoat Penguin', blurb: 'It was already wearing a tuxedo. Now it means it.' },
    tint: '#12161f',
    belly: '#ffffff',
    beak: '#ffb43f',
    foot: '#ffb43f',
    paint: (ctx, g) => {
      bowTie(ctx, g);
      topHat(ctx, g);
    },
    unlock: { kind: 'coins', cost: 750 },
  },
  {
    id: 'explorer',
    rarity: 'rare',
    name: 'Kâşif Penguen',
    blurb: 'Kıtayı haritalayanlara.',
    en: { name: 'Explorer Penguin', blurb: 'For mapping the continent.' },
    tint: '#4a3f33',
    belly: '#e8dcc6',
    beak: '#ff9c3f',
    foot: '#8a6b45',
    paint: (ctx, g) => {
      hood(ctx, g, '#c25a2e', '#e8dcc6');
      goggles(ctx, g, '#2b4a70', '#7a5c3a');
    },
    unlock: { kind: 'feat', feat: 'plays', goal: 120 },
  },
  {
    id: 'diver',
    rarity: 'rare',
    name: 'Dalgıç Penguen',
    blurb: 'Suya düşmekten korkmayanlara.',
    en: { name: 'Diver Penguin', blurb: 'For not minding the water.' },
    tint: '#123a4a',
    belly: '#bfe8ff',
    beak: '#ffb43f',
    foot: '#39c2c9',
    paint: (ctx, g) => {
      goggles(ctx, g, '#7ce8ff', '#0d2430');
      // Snorkel, bobbing with the walk.
      ctx.save();
      ctx.strokeStyle = '#ffb43f';
      ctx.lineWidth = Math.max(1.6, g.w * 0.055);
      ctx.beginPath();
      ctx.moveTo(g.cx - g.facing * g.w * 0.3, g.headY + g.h * 0.08);
      ctx.quadraticCurveTo(
        g.cx - g.facing * g.w * 0.42,
        g.headY - g.h * 0.2,
        g.cx - g.facing * g.w * 0.3,
        g.headY - g.h * 0.32,
      );
      ctx.stroke();
      ctx.restore();
    },
    unlock: { kind: 'feat', feat: 'deaths', goal: 150 },
  },
  {
    id: 'chef',
    rarity: 'rare',
    name: 'Aşçı Penguen',
    blurb: 'Bütün o balıkla bir şey yapması lazımdı.',
    en: { name: 'Chef Penguin', blurb: 'Something had to be done with all that fish.' },
    tint: '#2e3542',
    belly: '#fdfdfa',
    beak: '#ff9c3f',
    foot: '#ff9c3f',
    paint: (ctx, g) => {
      // Toque, puffed with a little wobble.
      ctx.save();
      ctx.fillStyle = '#fdfdfa';
      const y = g.headY - g.h * 0.18;
      ctx.fillRect(g.cx - g.w * 0.26, y - g.h * 0.06, g.w * 0.52, g.h * 0.1);
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(
          g.cx + i * g.w * 0.17,
          y - g.h * (0.16 + 0.02 * Math.sin(g.time * 5 + i)),
          g.w * 0.15,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      // Neckerchief
      ctx.fillStyle = '#e23b4b';
      ctx.fillRect(g.cx - g.w * 0.3, g.headY + g.h * 0.15, g.w * 0.6, g.h * 0.07);
      ctx.restore();
    },
    unlock: { kind: 'coins', cost: 980 },
  },
  {
    id: 'rockstar',
    rarity: 'epic',
    name: 'Rock Penguen',
    blurb: 'Buzulun tek gitaristi.',
    en: { name: 'Rock Penguin', blurb: 'The only guitarist on the glacier.' },
    tint: '#1a1622',
    belly: '#f0e6ff',
    beak: '#ff5f6d',
    foot: '#ff5f6d',
    eye: '#ffd23f',
    paint: (ctx, g) => {
      // Mohawk
      ctx.save();
      ctx.fillStyle = '#ff2d6f';
      for (let i = -2; i <= 2; i++) {
        const hgt = g.h * (0.3 - Math.abs(i) * 0.05);
        ctx.beginPath();
        ctx.moveTo(g.cx + i * g.w * 0.07 - g.w * 0.035, g.headY - g.h * 0.18);
        ctx.lineTo(g.cx + i * g.w * 0.07 + g.w * 0.035, g.headY - g.h * 0.18);
        ctx.lineTo(g.cx + i * g.w * 0.07, g.headY - g.h * 0.18 - hgt);
        ctx.closePath();
        ctx.fill();
      }
      // Shades
      ctx.fillStyle = '#0d1018';
      ctx.fillRect(g.cx - g.w * 0.28, g.headY - g.h * 0.09, g.w * 0.62, g.h * 0.09);
      ctx.restore();
    },
    aura: 'rgba(255,45,111,0.22)',
    unlock: { kind: 'feat', feat: 'boosts', goal: 60 },
  },
  {
    id: 'alien',
    rarity: 'epic',
    name: 'Uzaylı Penguen',
    blurb: 'Buraya nasıl geldiği belli değil.',
    en: { name: 'Alien Penguin', blurb: 'Nobody knows how it got here.' },
    tint: '#4a8f4d',
    belly: '#d8ffcf',
    beak: '#8ad86a',
    foot: '#8ad86a',
    eye: '#0d1018',
    paint: (ctx, g) => antennae(ctx, g, '#b6ff8a'),
    aura: 'rgba(120,255,140,0.2)',
    unlock: { kind: 'feat', feat: 'night', goal: 5 },
  },
  {
    id: 'ghost',
    rarity: 'epic',
    name: 'Hayalet Penguen',
    blurb: 'Buzda çok fazla kaybolanlara.',
    en: { name: 'Ghost Penguin', blurb: 'For getting lost on the ice a great many times.' },
    tint: '#7d90b8',
    belly: '#e6efff',
    beak: '#b9c8e6',
    foot: '#b9c8e6',
    eye: '#5cf0ff',
    paint: (ctx, g) => {
      // A tattered hem instead of feet, drifting.
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#cddcf5';
      ctx.beginPath();
      ctx.moveTo(g.cx - g.w * 0.42, g.by - g.h * 0.1);
      for (let i = 0; i <= 6; i++) {
        const x = g.cx - g.w * 0.42 + (i / 6) * g.w * 0.84;
        const y = g.by + (i % 2 === 0 ? 0 : g.h * 0.09) + Math.sin(g.time * 5 + i) * g.h * 0.02;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(g.cx + g.w * 0.42, g.by - g.h * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
    aura: 'rgba(160,200,255,0.24)',
    unlock: { kind: 'feat', feat: 'deaths', goal: 400 },
  },
  {
    id: 'knight',
    rarity: 'epic',
    name: 'Şövalye Penguen',
    blurb: 'Kuşlara karşı zırh giyenlere.',
    en: { name: 'Knight Penguin', blurb: 'For wearing armour against the birds.' },
    tint: '#5b6577',
    belly: '#c3ced9',
    beak: '#ffb43f',
    foot: '#8a94a6',
    paint: helm,
    unlock: { kind: 'feat', feat: 'skua', goal: 25 },
  },
  {
    id: 'aurora',
    rarity: 'mythic',
    name: 'Kutup Işığı Penguen',
    blurb: 'Gökyüzünü sırtında taşıyanlara.',
    en: { name: 'Aurora Penguin', blurb: 'For carrying the sky on your back.' },
    tint: '#1b2a52',
    belly: '#c9f5ff',
    beak: '#7ce8ff',
    foot: '#7ce8ff',
    eye: '#c9f5ff',
    paint: auroraRibbons,
    behind: true,
    aura: 'rgba(110,240,200,0.24)',
    unlock: { kind: 'feat', feat: 'glide', goal: 300 },
  },
  {
    id: 'frost',
    rarity: 'mythic',
    name: 'Buz Kraliçesi',
    blurb: 'Kıtanın kendisi kadar soğuk olanlara.',
    en: { name: 'Ice Queen', blurb: 'For being as cold as the continent itself.' },
    tint: '#8fd8ef',
    belly: '#ffffff',
    beak: '#dff6ff',
    foot: '#bfe8ff',
    eye: '#1b4a6b',
    paint: (ctx, g) => {
      crystals(ctx, g);
      crown(ctx, g);
    },
    aura: 'rgba(150,230,255,0.3)',
    unlock: { kind: 'feat', feat: 'perfect', goal: 45 },
  },
  {
    id: 'shadow',
    rarity: 'mythic',
    name: 'Gölge Penguen',
    blurb: 'Bütün gardırobu toplayanlara.',
    en: { name: 'Shadow Penguin', blurb: 'For collecting the entire wardrobe.' },
    tint: '#0b0d14',
    belly: '#1a1f2e',
    beak: '#6b4dff',
    foot: '#6b4dff',
    eye: '#b39cff',
    paint: (ctx, g) => {
      // A dark corona that eats the light instead of adding to it.
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#0b0d14';
      for (let i = 0; i < 4; i++) {
        const a = g.time * 1.6 + (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.ellipse(
          g.cx + Math.cos(a) * g.w * 0.5,
          g.by - g.bodyH * 0.5 + Math.sin(a) * g.bodyH * 0.4,
          g.w * 0.24,
          g.h * 0.16,
          a,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.restore();
    },
    aura: 'rgba(107,77,255,0.3)',
    unlock: { kind: 'feat', feat: 'wardrobe', goal: 15 },
  },

  /* ------------------------------------------- diamond: with a perk */
  {
    id: 'diamond',
    rarity: 'diamond',
    name: 'Elmas Penguen',
    blurb: 'Buzun kendisinden yontulmuş. Daha yükseğe zıplar.',
    en: { name: 'Diamond Penguin', blurb: 'Carved from the ice itself. Jumps higher.' },
    tint: '#5fd3f5',
    belly: '#eafcff',
    beak: '#ffffff',
    foot: '#bfeeff',
    eye: '#0b2a3a',
    perk: { jump: 0.08, grip: 0.3 },
    paint: (ctx, g) => {
      // Faceted body: a few bright planes over the silhouette, so it reads as
      // cut stone rather than as a blue penguin.
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(g.cx - g.w * 0.3 + i * g.w * 0.22, g.by - g.bodyH * 0.9);
        ctx.lineTo(g.cx - g.w * 0.14 + i * g.w * 0.22, g.by - g.bodyH * 0.2);
        ctx.lineTo(g.cx - g.w * 0.34 + i * g.w * 0.22, g.by - g.bodyH * 0.35);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      crystals(ctx, g);
    },
    aura: 'rgba(124,232,255,0.34)',
    unlock: { kind: 'coins', cost: 6500 },
  },
  {
    id: 'jet',
    rarity: 'diamond',
    name: 'Jet Penguen',
    blurb: 'Sırtındaki türbin hiç susmaz. Daha hızlı koşar.',
    en: { name: 'Jet Penguin', blurb: 'The turbine on its back never stops. Runs faster.' },
    tint: '#26304a',
    belly: '#dfe9ff',
    beak: '#ff7a2f',
    foot: '#ff7a2f',
    eye: '#ffd23f',
    perk: { speed: 0.1, radar: 0.2 },
    behind: true,
    paint: (ctx, g, layer) => {
      if (layer === 'behind') {
        jetpack(ctx, g);
        return;
      }
      visor(ctx, g, '#101a2e', 'rgba(255,160,60,0.9)');
    },
    aura: 'rgba(255,140,60,0.24)',
    unlock: { kind: 'coins', cost: 7200 },
  },
  {
    id: 'albatross',
    rarity: 'diamond',
    name: 'Albatros Penguen',
    blurb: 'Yanlış kuşun kanatlarını ödünç almış. Daha uzun süzülür.',
    en: { name: 'Albatross Penguin', blurb: 'Borrowed the wrong bird’s wings. Glides longer.' },
    tint: '#e8eef7',
    belly: '#ffffff',
    beak: '#ffb43f',
    foot: '#ffb43f',
    eye: '#22304a',
    perk: { glide: 0.7 },
    behind: true,
    paint: (ctx, g, layer) => {
      if (layer !== 'behind') return;
      // Long folded wings, always visible, tipped in slate.
      ctx.save();
      for (const sgn of [-1, 1]) {
        ctx.fillStyle = '#f4f8ff';
        ctx.beginPath();
        ctx.moveTo(g.cx + sgn * g.w * 0.2, g.by - g.bodyH * 0.78);
        ctx.quadraticCurveTo(
          g.cx + sgn * g.w * 1.15,
          g.by - g.bodyH * (0.62 + 0.05 * Math.sin(g.time * 3 + sgn)),
          g.cx + sgn * g.w * 1.32,
          g.by - g.bodyH * 0.12,
        );
        ctx.quadraticCurveTo(g.cx + sgn * g.w * 0.7, g.by - g.bodyH * 0.42, g.cx + sgn * g.w * 0.2, g.by - g.bodyH * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#4a5a72';
        ctx.beginPath();
        ctx.ellipse(g.cx + sgn * g.w * 1.24, g.by - g.bodyH * 0.2, g.w * 0.12, g.h * 0.05, sgn * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
    aura: 'rgba(220,240,255,0.22)',
    unlock: { kind: 'coins', cost: 8000 },
  },
  {
    id: 'emperor',
    rarity: 'diamond',
    name: 'İmparator Penguen',
    blurb: 'Türün en büyüğü. Balıklar ona gelir.',
    en: { name: 'Emperor Penguin', blurb: 'The largest of the species. The fish come to it.' },
    tint: '#232c3d',
    belly: '#fff6dc',
    beak: '#ffcf3f',
    foot: '#ffcf3f',
    perk: { magnet: 120, jump: 0.05 },
    paint: (ctx, g) => {
      // The orange ear patches a real emperor wears.
      ctx.save();
      const grad = ctx.createLinearGradient(0, g.headY - g.h * 0.1, 0, g.headY + g.h * 0.2);
      grad.addColorStop(0, '#ffd23f');
      grad.addColorStop(1, 'rgba(255,160,60,0)');
      ctx.fillStyle = grad;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(g.cx + sgn * g.w * 0.3, g.headY + g.h * 0.05, g.w * 0.11, g.h * 0.12, sgn * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      crown(ctx, g);
    },
    aura: 'rgba(255,208,90,0.26)',
    unlock: { kind: 'coins', cost: 9000 },
  },
];

export const SKIN_BY_ID = Object.fromEntries(SKINS.map((s) => [s.id, s]));

/* ------------------------------------------------------------------ */
/* Trails — the second slot                                            */
/* ------------------------------------------------------------------ */

/**
 * What the penguin leaves behind.
 *
 * A separate slot from the skin, which is the whole point: twenty penguins and
 * ten trails is two hundred looks, and two of them being *yours* is what makes
 * a wardrobe a wardrobe rather than a list. A trail paints from the player's
 * recent positions, so it costs nothing but a ring buffer.
 *
 * `paint(ctx, history, geo, time)` — history is newest-last, each entry
 * {x, y, age} where age is 0..1 from fresh to gone.
 */
export const TRAILS = [
  {
    id: 'none',
    rarity: 'common',
    name: 'Yok',
    blurb: 'Arkanda hiçbir şey bırakma.',
    en: { name: 'None', blurb: 'Leave nothing behind you.' },
    unlock: { kind: 'default' },
    paint: null,
  },
  {
    id: 'snow',
    rarity: 'common',
    name: 'Kar Tozu',
    blurb: 'Ayağının kaldırdığı ince kar.',
    en: { name: 'Snow Dust', blurb: 'The fine snow your feet kick up.' },
    color: '#e8f6ff',
    unlock: { kind: 'coins', cost: 120 },
    paint: (ctx, hist, g) => {
      ctx.fillStyle = '#e8f6ff';
      for (const p of hist) {
        ctx.globalAlpha = (1 - p.age) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, g.w * 0.09 * (1 - p.age * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  {
    id: 'bubbles',
    rarity: 'common',
    name: 'Kabarcık',
    blurb: 'Denizden çıkmış gibi.',
    en: { name: 'Bubbles', blurb: 'As if you just came out of the sea.' },
    color: '#7ce8ff',
    unlock: { kind: 'coins', cost: 190 },
    paint: (ctx, hist, g, time) => {
      ctx.strokeStyle = '#7ce8ff';
      ctx.lineWidth = 1.4;
      hist.forEach((p, i) => {
        ctx.globalAlpha = (1 - p.age) * 0.6;
        const r = g.w * (0.06 + 0.07 * ((i * 7919) % 10) / 10);
        ctx.beginPath();
        ctx.arc(p.x, p.y - p.age * g.h * 0.5 + Math.sin(time * 4 + i) * 2, r, 0, Math.PI * 2);
        ctx.stroke();
      });
    },
  },
  {
    id: 'sparks',
    rarity: 'rare',
    name: 'Kıvılcım',
    blurb: 'Buzu yakarak geç.',
    en: { name: 'Sparks', blurb: 'Burn the ice as you pass.' },
    color: '#ffd23f',
    unlock: { kind: 'coins', cost: 560 },
    paint: (ctx, hist, g, time) => {
      ctx.globalCompositeOperation = 'lighter';
      hist.forEach((p, i) => {
        ctx.globalAlpha = (1 - p.age) * 0.8;
        ctx.fillStyle = i % 2 ? '#ffd23f' : '#ff8a3f';
        const jig = Math.sin(time * 30 + i * 2) * g.w * 0.1;
        ctx.beginPath();
        ctx.arc(p.x + jig, p.y + Math.cos(time * 22 + i) * g.h * 0.08, g.w * 0.05, 0, Math.PI * 2);
        ctx.fill();
      });
    },
  },
  {
    id: 'ice',
    rarity: 'rare',
    name: 'Buz Kırığı',
    blurb: 'Havada kalan kristaller.',
    en: { name: 'Ice Shards', blurb: 'Crystals left hanging in the air.' },
    color: '#bfe8ff',
    unlock: { kind: 'feat', feat: 'flawless', goal: 20 },
    paint: (ctx, hist, g) => {
      ctx.fillStyle = '#bfe8ff';
      hist.forEach((p, i) => {
        ctx.globalAlpha = (1 - p.age) * 0.7;
        const r = g.w * 0.12 * (1 - p.age);
        const a = i * 0.7;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
        ctx.lineTo(p.x + Math.cos(a + 2.1) * r, p.y + Math.sin(a + 2.1) * r);
        ctx.lineTo(p.x + Math.cos(a + 4.2) * r, p.y + Math.sin(a + 4.2) * r);
        ctx.closePath();
        ctx.fill();
      });
    },
  },
  {
    id: 'hearts',
    rarity: 'rare',
    name: 'Kalp',
    blurb: 'Kimse sormadı ama işte.',
    en: { name: 'Hearts', blurb: 'Nobody asked, but here they are.' },
    color: '#ff5f8d',
    unlock: { kind: 'coins', cost: 640 },
    paint: (ctx, hist, g, time) => {
      ctx.fillStyle = '#ff5f8d';
      hist.forEach((p, i) => {
        if (i % 2) return;
        ctx.globalAlpha = (1 - p.age) * 0.8;
        const r = g.w * 0.17 * (1 - p.age * 0.45);
        const y = p.y - p.age * g.h * 0.6 + Math.sin(time * 3 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(p.x, y + r * 0.7);
        ctx.bezierCurveTo(p.x - r * 1.4, y - r * 0.4, p.x - r * 0.2, y - r * 1.1, p.x, y - r * 0.35);
        ctx.bezierCurveTo(p.x + r * 0.2, y - r * 1.1, p.x + r * 1.4, y - r * 0.4, p.x, y + r * 0.7);
        ctx.fill();
      });
    },
  },
  {
    id: 'notes',
    rarity: 'rare',
    name: 'Nota',
    blurb: 'Rock penguene yakışır.',
    en: { name: 'Notes', blurb: 'Suits the rock penguin.' },
    color: '#c9b6ff',
    unlock: { kind: 'feat', feat: 'plays', goal: 60 },
    paint: (ctx, hist, g, time) => {
      ctx.fillStyle = '#c9b6ff';
      ctx.strokeStyle = '#c9b6ff';
      ctx.lineWidth = 1.6;
      hist.forEach((p, i) => {
        if (i % 3) return;
        ctx.globalAlpha = (1 - p.age) * 0.85;
        const y = p.y - p.age * g.h * 0.7 + Math.sin(time * 3 + i) * 3;
        const r = g.w * 0.12;
        ctx.beginPath();
        ctx.ellipse(p.x, y, r, r * 0.78, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(p.x + r * 0.9, y);
        ctx.lineTo(p.x + r * 0.9, y - r * 2.4);
        ctx.stroke();
      });
    },
  },
  {
    id: 'flame',
    rarity: 'epic',
    name: 'Alev İzi',
    blurb: 'Arkanda yanan bir çizgi.',
    en: { name: 'Flame Trail', blurb: 'A burning line behind you.' },
    color: '#ff7a2f',
    unlock: { kind: 'feat', feat: 'boosts', goal: 40 },
    paint: (ctx, hist, g, time) => {
      ctx.globalCompositeOperation = 'lighter';
      hist.forEach((p, i) => {
        const k = 1 - p.age;
        ctx.globalAlpha = k * 0.55;
        const r = g.w * 0.34 * k;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        grad.addColorStop(0, 'rgba(255,236,170,0.9)');
        grad.addColorStop(0.45, 'rgba(255,120,40,0.5)');
        grad.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y - Math.sin(time * 8 + i) * 2, r, 0, Math.PI * 2);
        ctx.fill();
      });
    },
  },
  {
    id: 'aurora',
    rarity: 'epic',
    name: 'Kutup Işığı',
    blurb: 'Gökyüzünü peşinden sürükle.',
    en: { name: 'Aurora', blurb: 'Drag the sky along behind you.' },
    color: '#5ce1a6',
    unlock: { kind: 'feat', feat: 'streak', goal: 14 },
    paint: (ctx, hist, g, time) => {
      if (hist.length < 3) return;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = g.w * 0.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let band = 0; band < 3; band++) {
        ctx.strokeStyle = `hsla(${150 + band * 55}, 90%, 66%, 0.28)`;
        ctx.beginPath();
        hist.forEach((p, i) => {
          const y = p.y + Math.sin(time * 3 + i * 0.6 + band) * g.h * 0.14 * (1 - p.age);
          i === 0 ? ctx.moveTo(p.x, y) : ctx.lineTo(p.x, y);
        });
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    },
  },
  {
    id: 'void',
    rarity: 'mythic',
    name: 'Boşluk',
    blurb: 'Geçtiğin yerde ışık kalmasın.',
    en: { name: 'Void', blurb: 'Let no light stay where you passed.' },
    color: '#6b4dff',
    unlock: { kind: 'feat', feat: 'diamond', goal: 1 },
    paint: (ctx, hist, g, time) => {
      hist.forEach((p, i) => {
        const k = 1 - p.age;
        ctx.globalAlpha = k * 0.6;
        ctx.fillStyle = '#0b0d14';
        const r = g.w * 0.4 * k;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = k * 0.45;
        ctx.strokeStyle = '#6b4dff';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * (0.8 + 0.2 * Math.sin(time * 6 + i)), 0, Math.PI * 2);
        ctx.stroke();
      });
    },
  },
];

export const TRAIL_BY_ID = Object.fromEntries(TRAILS.map((t) => [t.id, t]));

export function getTrail(id) {
  return TRAIL_BY_ID[id] ?? TRAIL_BY_ID.none;
}

/**
 * A still portrait for the collection screen.
 *
 * Deliberately its own routine rather than a call into the renderer: a card
 * wants a calm, centred bird with no squash, no blink and no walk cycle, and
 * wiring the live drawing code up to a detached canvas would drag the whole
 * world in with it. The palette and the accessory painter are shared, which is
 * the part that actually has to match.
 */
export function drawPortrait(ctx, skin, { w, h, time = 0, facing = 1 }) {
  const cx = w / 2;
  const by = h * 0.9;
  const ph = h * 0.66;
  const pw = ph * 0.88;
  const bodyH = ph * 0.82;
  const headY = by - bodyH - ph * 0.06;
  const geo = { cx, by, w: pw, h: ph, bodyH, headY, facing, step: 0, time, airborne: false };

  ctx.clearRect(0, 0, w, h);
  if (skin.behind && skin.paint) skin.paint(ctx, geo, 'behind');

  const body = skin.grows ? 'rgb(88, 100, 118)' : skin.tint;

  ctx.fillStyle = skin.foot;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + sgn * pw * 0.24, by - 1, pw * 0.17, ph * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(cx, by - bodyH * 0.5, pw * 0.46, bodyH * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin.belly;
  ctx.beginPath();
  ctx.ellipse(cx + facing * pw * 0.05, by - bodyH * 0.44, pw * 0.29, bodyH * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Flipper
  ctx.save();
  ctx.translate(cx - facing * pw * 0.38, by - bodyH * 0.62);
  ctx.rotate(facing * 0.25);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, ph * 0.12, pw * 0.12, ph * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(cx + facing * pw * 0.04, headY, pw * 0.34, ph * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin.beak;
  ctx.beginPath();
  ctx.moveTo(cx + facing * pw * 0.3, headY + ph * 0.01);
  ctx.lineTo(cx + facing * pw * 0.52, headY + ph * 0.05);
  ctx.lineTo(cx + facing * pw * 0.3, headY + ph * 0.09);
  ctx.closePath();
  ctx.fill();
  for (const sgn of [-1, 1]) {
    const ex = cx + facing * pw * 0.12 + sgn * pw * 0.12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, headY - ph * 0.03, pw * 0.075, ph * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin.eye ?? '#0e1723';
    ctx.beginPath();
    ctx.arc(ex + facing * pw * 0.02, headY - ph * 0.03, pw * 0.038, 0, Math.PI * 2);
    ctx.fill();
  }

  if (skin.paint) skin.paint(ctx, geo, 'front');
}

export function getSkin(id) {
  return SKIN_BY_ID[id] ?? SKIN_BY_ID.normal;
}

/**
 * Where a player stands on a skin.
 * @returns {{owned:boolean, kind:string, have:number, goal:number, pct:number,
 *            cost:number|null, label:string}}
 */
export function skinStatus(save, skin, now = new Date(), bag = 'skins') {
  const owned = skin.unlock.kind === 'default' || Boolean(save[bag]?.[skin.id]);
  if (skin.unlock.kind === 'default') {
    return { owned: true, kind: 'default', have: 1, goal: 1, pct: 1, cost: null, label: t('skin.start') };
  }
  if (skin.unlock.kind === 'coins') {
    const free = skin.unlock.freeInDecember && now.getMonth() === 11;
    return {
      owned,
      kind: 'coins',
      have: save.coins ?? 0,
      goal: free ? 0 : skin.unlock.cost,
      pct: free ? 1 : Math.min(1, (save.coins ?? 0) / skin.unlock.cost),
      cost: free ? 0 : skin.unlock.cost,
      label: free ? t('skin.december') : t('ui.priceFish', { n: skin.unlock.cost }),
    };
  }
  const feat = FEATS[skin.unlock.feat];
  const have = feat.read(save);
  const goal = skin.unlock.goal;
  const what = t(`feat.${skin.unlock.feat}`);
  return {
    owned,
    kind: 'feat',
    have,
    goal,
    pct: Math.min(1, have / goal),
    cost: null,
    label: goal > 1 ? `${have} / ${goal} ${what}` : what,
  };
}

/**
 * Every skin whose condition is now met but which is not yet owned.
 * Called after each run, so an unlock lands the moment it is earned.
 */
export function newlyEarned(save, now = new Date()) {
  const check = (list, bag) =>
    list
      .filter((item) => {
        if (item.unlock.kind !== 'feat' && !(item.unlock.freeInDecember && now.getMonth() === 11)) {
          return false;
        }
        const st = skinStatus(save, item, now, bag);
        return !st.owned && st.pct >= 1;
      })
      .map((item) => ({ ...item, bag }));
  return [...check(SKINS, 'skins'), ...check(TRAILS, 'trails')];
}
