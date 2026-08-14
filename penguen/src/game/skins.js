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

/** Where an unlock's progress is read from. Kept here so the UI can show it. */
export const FEATS = {
  flawless: { label: 'ölmeden bitirilen bölüm', read: (s) => s.stats.flawless ?? 0 },
  fish: { label: 'toplanan balık', read: (s) => s.stats.totalFish ?? 0 },
  meters: { label: 'sonsuz modda metre', read: (s) => Math.floor(s.stats.endlessMeters ?? 0) },
  streak: { label: 'gün üst üste günün bölümü', read: (s) => s.daily?.bestStreak ?? 0 },
  perfect: { label: '3 yıldızlı bölüm', read: (s) => Object.values(s.levels).filter((l) => l.stars >= 3).length },
  boosts: { label: 'hız balığı', read: (s) => s.stats.boosts ?? 0 },
  diamond: { label: 'Elmas lige çıkış', read: (s) => (s.league?.bestTier ?? 0) >= 3 ? 1 : 0 },
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
    name: 'Penguen',
    blurb: 'Yeni yumurtadan çıkmış hâli. Büyüdükçe tüyleri koyulaşır.',
    tint: '#4a5a72',
    grows: true,
    belly: '#f6fbff',
    beak: '#ff9c3f',
    foot: '#ff9c3f',
    unlock: { kind: 'default' },
  },
  {
    id: 'ninja',
    name: 'Ninja Penguen',
    blurb: 'Ölmeden geçmeyi bilenlere.',
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
    name: 'Kral Penguen',
    blurb: 'Buzulun tacı senindir.',
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
    name: 'Astronot Penguen',
    blurb: 'Sonsuz modda çok uzağa gidenlere.',
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
    name: 'Altın Penguen',
    blurb: 'Yedi gün üst üste günün bölümünü bitirenlere.',
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
    name: 'Korsan Penguen',
    blurb: 'Üç yıldızı toplamayı huy edinenlere.',
    tint: '#33405a',
    belly: '#e8eef7',
    beak: '#ff9c3f',
    foot: '#ff9c3f',
    paint: pirateHat,
    unlock: { kind: 'feat', feat: 'perfect', goal: 20 },
  },
  {
    id: 'fire',
    name: 'Ateş Penguen',
    blurb: 'Hız balığını huy edinenlere.',
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
    name: 'Siber Penguen',
    blurb: 'Elmas lige çıkanlara.',
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
    name: 'Yılbaşı Penguen',
    blurb: 'Aralık ayında bedava, diğer aylarda balıkla.',
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
    unlock: { kind: 'coins', cost: 240, freeInDecember: true },
  },
];

export const SKIN_BY_ID = Object.fromEntries(SKINS.map((s) => [s.id, s]));

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
export function skinStatus(save, skin, now = new Date()) {
  const owned = skin.unlock.kind === 'default' || Boolean(save.skins?.[skin.id]);
  if (skin.unlock.kind === 'default') {
    return { owned: true, kind: 'default', have: 1, goal: 1, pct: 1, cost: null, label: 'Başlangıç' };
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
      label: free ? 'Aralık hediyesi' : `${skin.unlock.cost} balık`,
    };
  }
  const feat = FEATS[skin.unlock.feat];
  const have = feat.read(save);
  const goal = skin.unlock.goal;
  return {
    owned,
    kind: 'feat',
    have,
    goal,
    pct: Math.min(1, have / goal),
    cost: null,
    label: goal > 1 ? `${have} / ${goal} ${feat.label}` : feat.label,
  };
}

/**
 * Every skin whose condition is now met but which is not yet owned.
 * Called after each run, so an unlock lands the moment it is earned.
 */
export function newlyEarned(save, now = new Date()) {
  return SKINS.filter((skin) => {
    if (skin.unlock.kind !== 'feat' && !(skin.unlock.freeInDecember && now.getMonth() === 11)) return false;
    const st = skinStatus(save, skin, now);
    return !st.owned && st.pct >= 1;
  });
}
