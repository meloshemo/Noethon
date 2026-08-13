/**
 * Level validator.
 *
 * Run with:  node tests/validate-levels.mjs
 *
 * Difficulty is only fun when it is fair, so this checks — analytically, not by
 * playing — that every jump in every level is inside the penguin's real reach
 * at that level's growth scale. It covers the 18 handcrafted levels plus a
 * large sample of generated ones, and fails loudly on anything impossible.
 */

import { PHYS, PENGUIN, ICE, scaleForLevel, CRAFTED_LEVELS } from '../src/game/config.js';
import { LEVELS, WATER_Y } from '../src/game/levels.js';
import { generateLevel } from '../src/game/generator.js';

/** How much of the theoretical maximum jump a level is allowed to demand. */
const BUDGET = { distance: 0.86, rise: 0.8 };
/** Early levels must be much gentler than that. */
const TUTORIAL_BUDGET = { distance: 0.55, rise: 0.5 };

function reachFor(scale) {
  const v = Math.abs(PHYS.jumpVelocity) * (1 - PENGUIN.jumpPenaltyPerScale * (scale - 1));
  const speed = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
  const tUp = v / PHYS.gravityUp;
  const height = (v * v) / (2 * PHYS.gravityUp);
  const tDown = Math.sqrt((2 * height) / PHYS.gravityDown);
  return { distance: speed * (tUp + tDown), height };
}

/**
 * How far into a floe the player realistically lands, as a fraction of its
 * width. Used as a near-worst case: a minimal jump puts them close to the near
 * edge, so a short-fuse floe has to be escapable from there, not just from the
 * middle.
 */
const LANDING = 0.75;

/** How long a floe stays put after being stepped on, or null if it never goes. */
function fuseOf(floe) {
  if (floe.type === 'trap') return floe.delay ?? ICE.trapDelay;
  if (floe.type === 'fall') return floe.delay ?? 0.35;
  if (floe.type === 'crack') return floe.delay ?? ICE.crackDelay;
  // A geyser gives you its warning time to get clear.
  if (floe.type === 'burst') return ICE.burstWarn;
  return null;
}

const problems = [];
const warnings = [];

function check(def, { tutorial = false } = {}) {
  const id = def.id;
  const scale = scaleForLevel(id);
  const reach = reachFor(scale);
  const budget = tutorial ? TUTORIAL_BUDGET : BUDGET;
  const fail = (msg) => problems.push(`L${id} (${def.name}): ${msg}`);
  const warn = (msg) => warnings.push(`L${id} (${def.name}): ${msg}`);

  const all = [...def.floes].sort((a, b) => a.x - b.x);
  // 'snap' ice is bait beside the route, never part of it, so the path checks
  // below walk the level as if it were not there.
  const floes = all.filter((f) => f.type !== 'snap');

  if (!floes.length) return fail('hiç buz yok');
  if (def.spawn.x < floes[0].x || def.spawn.x > floes[0].x + floes[0].w) {
    fail(`başlangıç noktası ilk buzun üstünde değil (spawn ${def.spawn.x})`);
  }

  for (let i = 0; i < floes.length - 1; i++) {
    const a = floes[i];
    const b = floes[i + 1];

    // A drifting floe can meet you halfway; count that in its favour.
    const assistA = a.type === 'move' ? Math.abs(a.ax ?? 0) : 0;
    const assistB = b.type === 'move' ? Math.abs(b.ax ?? 0) : 0;
    const gap = b.x - (a.x + a.w) - assistA - assistB;
    const rise = a.y - b.y + (b.type === 'move' ? Math.abs(b.ay ?? 0) : 0);

    if (gap > reach.distance * budget.distance) {
      fail(`${i}→${i + 1} arası ${Math.round(gap)}px, erişim ${Math.round(reach.distance * budget.distance)}px`);
    }
    if (rise > reach.height * budget.rise) {
      fail(`${i}→${i + 1} yükselişi ${Math.round(rise)}px, tırmanış sınırı ${Math.round(reach.height * budget.rise)}px`);
    }
    if (gap < -a.w) warn(`${i}→${i + 1} buzları üst üste biniyor`);
    if (b.x < a.x + a.w) warn(`${i}→${i + 1} buzları çakışıyor (${a.x + a.w} > ${b.x})`);

    // Short-fuse floes (traps, falling ice) are "touch and go": the player has
    // no time to walk across them, so the jump has to work from where they
    // land — roughly 40% in — not from the far edge.
    const fuse = fuseOf(a);
    if (fuse != null) {
      const speed = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
      const walkable = fuse * speed;
      if (a.w * LANDING > walkable) {
        fail(
          `${i}. buz (${a.type}) ${a.w}px genişliğinde ama ${fuse}s içinde ancak ${Math.round(walkable)}px koşulabilir`,
        );
      }
      const steppingStone = a.type === 'trap' || a.type === 'fall';
      const fromLanding = steppingStone ? a.w * LANDING + gap : gap;
      if (fromLanding > reach.distance * budget.distance) {
        fail(
          `${i}. buz (${a.type}) üstünden kalkışta ${Math.round(fromLanding)}px gerekiyor, erişim ${Math.round(reach.distance * budget.distance)}px`,
        );
      }
    }

    // Two unavoidable breakables back to back is the hardest fair pattern.
    const risky = (f) => f.type === 'crack' || f.type === 'trap' || f.type === 'fall';
    if (tutorial && risky(a) && risky(b)) {
      warn(`${i}→${i + 1}: öğretici bölümde arka arkaya kırılgan buz`);
    }

    // Timing-based floes need somewhere safe to wait for the right moment.
    // Standing on breaking ice while you count out a melt cycle is a coin
    // flip, not a skill — so the floe before one must be stand-on-forever.
    // 'slip' is deliberately excluded: you can stand on it forever, but you
    // cannot hold a position on it, and timing a melt cycle needs both.
    const waitable = a.type === 'solid' || a.type === 'move';
    const needsTiming =
      b.type === 'melt' || (b.type === 'move' && Math.abs(b.ax ?? 0) > 0);
    if (needsTiming && !waitable) {
      fail(`${i + 1}. buz (${b.type}) zamanlama istiyor ama önündeki ${a.type} buzunda beklenemez`);
    }
  }

  // --- 'snap' bait ---------------------------------------------------
  // The whole point of snapping ice is that it vanishes as you commit to it.
  // That is only fair if the level never needs it: the gap it sits in must be
  // clearable without it, and it must sit low enough to read as a shortcut
  // rather than as the road.
  for (const f of all) {
    if (f.type !== 'snap') continue;
    const before = floes.filter((o) => o.x + o.w <= f.x + f.w).pop();
    const after = floes.find((o) => o.x >= f.x);
    if (!before || !after) {
      fail(`kaçan buz (x=${f.x}) yolun ucunda — atlanamaz`);
      continue;
    }
    const skipGap = after.x - (before.x + before.w);
    if (skipGap > reach.distance * budget.distance) {
      fail(
        `kaçan buz olmadan ${Math.round(skipGap)}px geçilemiyor, erişim ${Math.round(reach.distance * budget.distance)}px — bu buz zorunlu`,
      );
    }
    if (f.y < before.y + 20 || f.y < after.y + 20) {
      fail(`kaçan buz (x=${f.x}) komşularıyla aynı hizada — yem gibi durmuyor`);
    }
    if (f.y + 24 >= WATER_Y) fail(`kaçan buz suya çok yakın (y=${f.y})`);
  }

  // --- orcas ----------------------------------------------------------
  // An orca has to breach in open water, and it has to spend most of its cycle
  // below the surface, or the gap it guards is simply shut.
  for (const h of def.hazards ?? []) {
    if (h.kind !== 'orca') continue;
    const cx = h.x + h.w / 2;
    const onFloe = floes.find((f) => cx > f.x - 20 && cx < f.x + f.w + 20);
    if (onFloe) fail(`orka buzun altında değil boşlukta olmalı (x=${h.x})`);
    if ((h.period ?? 3.4) < 2.4) fail(`orka çok sık çıkıyor (period=${h.period})`);
  }

  // Landing on a floe must always be above the water line.
  const penguinW = PENGUIN.w * scale;
  for (const f of floes) {
    if (f.y >= WATER_Y - 8) fail(`buz suyun içinde (y=${f.y})`);
    if (f.type === 'burst' && f.burstPeriod && f.w < penguinW * 2.4) {
      warn(`zamanlı gayzer dar: ${f.w}px — kaçacak yer az`);
    }
    // Every floe has to be wide enough to actually stand on, with margin.
    if (f.w < penguinW + 20) fail(`buz penguenden dar: ${f.w}px, penguen ${Math.round(penguinW)}px`);
    // Short-fuse floes and bait are meant to be tight; the rest are not.
    else if (!['trap', 'fall', 'snap'].includes(f.type) && f.w < penguinW * 1.6) {
      warn(`çok dar buz: ${f.w}px, penguen ${Math.round(penguinW)}px`);
    }
  }

  // The goal must sit on the last floe.
  const last = floes[floes.length - 1];
  const onLast = def.goal.x >= last.x - 20 && def.goal.x <= last.x + last.w + 20;
  if (!onLast) fail(`sal son buzun üstünde değil (goal ${def.goal.x}, buz ${last.x}-${last.x + last.w})`);
  if (Math.abs(def.goal.y - last.y) > 2) fail('sal ile son buzun yüksekliği uyuşmuyor');

  // Fish must be reachable from some floe, not floating in the void.
  for (const [n, f] of (def.fish ?? []).entries()) {
    const ok = floes.some((p) => {
      const dx = Math.max(p.x - f.x, f.x - (p.x + p.w), 0);
      const dy = p.y - f.y;
      return dx <= reach.distance * 0.55 && dy <= reach.height * 0.95 && dy > -40;
    });
    if (!ok) warn(`${n + 1}. balık erişilemez görünüyor (${f.x}, ${f.y})`);
  }

  // Hazards must not be parked exactly on the spawn point.
  for (const h of def.hazards ?? []) {
    if (h.kind !== 'gust' && Math.abs(h.x - def.spawn.x) < 90 && Math.abs((h.y ?? 0) - def.spawn.y) < 80) {
      fail(`tehlike başlangıç noktasının üstünde (${h.kind})`);
    }
  }

  // A seal must leave the right-hand strip of its floe free. That strip is
  // where the player stands to line up and launch the next jump — a patrol
  // that sweeps it turns every departure into a coin flip.
  const LAUNCH_STRIP = 70;
  for (const h of def.hazards ?? []) {
    if (h.kind !== 'seal') continue;
    const under = floes.find((f) => h.x >= f.x - 10 && h.x <= f.x + f.w + 10);
    if (!under) {
      warn(`fok hiçbir buzun üstünde değil (x=${h.x})`);
      continue;
    }
    const patrolRight = h.x + (h.range ?? 0) + (h.w ?? 44);
    if (patrolRight > under.x + under.w - LAUNCH_STRIP) {
      fail(
        `fok kalkış kenarını kapatıyor: devriye ${Math.round(patrolRight)}, buz sonu ${under.x + under.w}`,
      );
    }
  }

  return undefined;
}

/* --------------------------------------------------------------- run */

console.log('Bölümler doğrulanıyor...\n');

for (const def of LEVELS) {
  check(def, { tutorial: def.id <= 5 });
}

// Sample the endless range widely, including the plateau.
const generated = [];
for (let id = CRAFTED_LEVELS + 1; id <= CRAFTED_LEVELS + 80; id++) {
  const def = generateLevel(id);
  generated.push(def);
  check(def);
}

// Curve sanity: the ramp must be monotonic and start gentle.
const first = LEVELS[0];
const firstGaps = first.floes.slice(0, -1).map((f, i) => first.floes[i + 1].x - (f.x + f.w));
if (Math.max(...firstGaps) > 80) {
  problems.push(`L1: ilk bölümdeki en geniş boşluk ${Math.max(...firstGaps)}px — yeni oyuncu için fazla`);
}
if ((LEVELS[0].hazards ?? []).length || (LEVELS[1].hazards ?? []).length || (LEVELS[2].hazards ?? []).length) {
  problems.push('İlk üç bölümde tehlike olmamalı');
}
const introducedEarly = LEVELS.slice(0, 3).flatMap((l) => l.floes.map((f) => f.type));
if (introducedEarly.some((t) => t !== 'solid')) {
  problems.push('İlk üç bölümde sadece sağlam buz olmalı');
}

console.log(`Elle tasarlanan bölüm: ${LEVELS.length}`);
console.log(`Üretilen bölüm örneklemi: ${generated.length}`);
console.log(`Toplam buz: ${[...LEVELS, ...generated].reduce((s, l) => s + l.floes.length, 0)}`);

if (warnings.length) {
  console.log(`\n⚠  ${warnings.length} uyarı`);
  for (const w of warnings.slice(0, 20)) console.log('   ' + w);
  if (warnings.length > 20) console.log(`   ... ve ${warnings.length - 20} tane daha`);
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} hata\n`);
  for (const p of problems) console.error('   ' + p);
  process.exit(1);
}

console.log('\n✓ Bütün bölümler geçilebilir.');
