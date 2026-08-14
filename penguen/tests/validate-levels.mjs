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

import { PHYS, PENGUIN, ICE, STORM, scaleForLevel, reachFor, CRAFTED_LEVELS } from '../src/game/config.js';
import { LEVELS, WATER_Y } from '../src/game/levels.js';
import { CRAFTED_TOTAL, CHAPTERS } from '../src/game/chapters.js';
import { generateLevel } from '../src/game/generator.js';

/** How much of the theoretical maximum jump a level is allowed to demand. */
const BUDGET = { distance: 0.86, rise: 0.8 };
/** Early levels must be much gentler than that. */
const TUTORIAL_BUDGET = { distance: 0.55, rise: 0.5 };

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
  if (floe.type === 'fake') return floe.delay ?? ICE.fakeDelay;
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
      const runSpeed = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
      const walkable = fuse * runSpeed;
      // A geyser has to be escapable from its near edge, not from where you
      // typically land: getting caught on one is not a near miss, it is a
      // launch into the sea. So it gets the full width plus a safety margin.
      const need = a.type === 'burst' ? a.w / 0.85 : a.w * LANDING;
      if (need > walkable) {
        fail(
          `${i}. buz (${a.type}) ${a.w}px genişliğinde, ${Math.round(need)}px koşmak gerekiyor ama ${fuse}s içinde ancak ${Math.round(walkable)}px koşulabilir`,
        );
      }
      const steppingStone = a.type === 'trap' || a.type === 'fall' || a.type === 'fake';
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

  // --- storms ---------------------------------------------------------
  // A storm must never be an unwinnable wall. Two things keep it fair: the
  // wind has to pulse (so there is a lull to move in) and it must not be so
  // strong that the penguin cannot make headway even at full surge.
  const speed = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
  for (const h of def.hazards ?? []) {
    if (h.kind !== 'storm') continue;
    const period = h.period ?? STORM.period;
    const power = Math.abs(h.power ?? 300);
    if (period < 2.6) fail(`fırtına çok sık esiyor (period=${period})`);
    // At peak, walking into the wind must still be net forward motion.
    const groundPush = power * STORM.groundFactor;
    if (groundPush >= PHYS.groundAccel * 0.45) {
      fail(`fırtına yerde çok güçlü: ${Math.round(groundPush)} vs ivme ${PHYS.groundAccel}`);
    }
    // Airborne drift over one full jump must stay under half a jump's reach,
    // or a jump taken inside the zone can never be aimed.
    const airtime = 0.66;
    const drift = power * airtime * airtime * 0.5;
    if (drift > reach.distance * 0.5) {
      fail(`fırtına havada çok savuruyor: ${Math.round(drift)}px, erişimin yarısı ${Math.round(reach.distance * 0.5)}px`);
    }
    // There has to be ice inside the zone to shelter on.
    const inside = floes.filter((f) => f.x + f.w > h.x && f.x < h.x + h.w);
    if (inside.length < 2) fail(`fırtına bölgesinde sığınacak buz yok (x=${h.x})`);
  }

  // --- the speed fish -------------------------------------------------
  for (const f of def.speedFish ?? []) {
    const ok = floes.some((p) => {
      const dx = Math.max(p.x - f.x, f.x - (p.x + p.w), 0);
      const dy = p.y - f.y;
      return dx <= reach.distance * 0.5 && dy <= reach.height * 0.95 && dy > -40;
    });
    if (!ok) fail(`hız balığı erişilemez (${f.x}, ${f.y})`);
    // It is a detour by design; sitting at head height on the running line
    // would make it a freebie rather than a decision.
    const onLine = floes.some(
      (p) => f.x > p.x - 10 && f.x < p.x + p.w + 10 && p.y - f.y < 55 && p.y - f.y > -10,
    );
    if (onLine) warn(`hız balığı ana hattın üstünde duruyor (${f.x}, ${f.y})`);
  }

  // --- rotten fish ----------------------------------------------------
  // The inverse rule to the speed fish: these are meant to be in the way. But
  // "in the way" must mean "dodgeable" — over a floe, at a height a jump can
  // clear, never floating in a gap where avoiding it is impossible.
  for (const f of def.rotFish ?? []) {
    const host = floes.find((p) => f.x > p.x - 16 && f.x < p.x + p.w + 16);
    if (!host) {
      fail(`çürük balık boşlukta duruyor, kaçınılamaz (${f.x}, ${f.y})`);
      continue;
    }
    const above = host.y - f.y;
    if (above < 22) fail(`çürük balık buza gömülü (${f.x}, ${f.y})`);
    if (above > reach.height * 0.7) {
      warn(`çürük balık çok yüksek, kimse çarpmaz (${f.x}, ${f.y})`);
    }
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
    else if (!['trap', 'fall', 'snap', 'fake'].includes(f.type) && f.w < penguinW * 1.6) {
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

  checkTerrain(def, { floes, reach, scale, fail, warn });
  return undefined;
}

/**
 * The continent.
 *
 * Cliff faces and tunnel roofs are solid, which means they can wall a level
 * shut as easily as they can shape it. Three things have to hold:
 *
 *   1. No block may sit inside a floe, or inside the space the penguin
 *      occupies while standing on one. A floe you cannot stand on is worse
 *      than no floe at all.
 *   2. Every jump between consecutive floes must fit under whatever hangs over
 *      the corridor between them. A roof caps the apex, and a capped apex is a
 *      shorter jump — so the gap is re-checked against the reach *under that
 *      ceiling*, not against the open-air reach.
 *   3. Nothing may block the corridor outright.
 */
function checkTerrain(def, { floes, reach, scale, fail, warn }) {
  const blocks = def.terrain ?? [];
  if (!blocks.length) return;
  const pw = PENGUIN.w * scale;
  const ph = PENGUIN.h * scale;

  // 1 — standing room over every floe.
  for (const f of floes) {
    for (const b of blocks) {
      const overlapsX = b.x < f.x + f.w && b.x + b.w > f.x;
      if (!overlapsX) continue;
      const bottom = b.y + b.h;
      if (bottom > f.y && b.y < f.y + 24) {
        fail(`kaya buzun içinde (buz x=${f.x}, kaya x=${b.x})`);
      } else if (bottom <= f.y && f.y - bottom < ph + 6) {
        fail(`buzun üstünde durulacak yer yok: ${Math.round(f.y - bottom)}px, penguen ${Math.round(ph)}px`);
      }
    }
  }

  // 2 & 3 — headroom over every jump.
  for (let i = 0; i < floes.length - 1; i++) {
    const a = floes[i];
    const b = floes[i + 1];
    const gap = b.x - (a.x + a.w);
    if (gap <= 0) continue;
    const surface = Math.min(a.y, b.y);
    const corridor = { x: a.x + a.w - pw, w: gap + pw * 2 };

    let roof = -Infinity;
    for (const t of blocks) {
      const overlapsX = t.x < corridor.x + corridor.w && t.x + t.w > corridor.x;
      if (!overlapsX) continue;
      const bottom = t.y + t.h;
      // Only things actually above the route can be a ceiling.
      if (bottom <= surface) roof = Math.max(roof, bottom);
      else if (t.y < surface) fail(`kaya geçişi tıkıyor (${i}→${i + 1}, kaya x=${t.x})`);
    }
    if (roof === -Infinity) continue;

    const headroom = surface - roof;
    if (headroom < ph + 10) {
      fail(`${i}→${i + 1} arası tavan çok alçak: ${Math.round(headroom)}px`);
      continue;
    }
    const apex = headroom - ph;
    const under = reachFor(scale, apex);
    if (gap > under.distance * 0.86) {
      fail(
        `${i}→${i + 1} tavan altında geçilemez: boşluk ${Math.round(gap)}px, ` +
          `tavan altı erişim ${Math.round(under.distance * 0.86)}px (apex ${Math.round(apex)}px)`,
      );
    }
    const rise = a.y - b.y;
    if (rise > apex * 0.8) {
      fail(`${i}→${i + 1} tavan altında tırmanılamaz: ${Math.round(rise)}px, apex ${Math.round(apex)}px`);
    }
  }
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

// The list and the constant must agree, or the endless mode starts in the
// middle of the campaign or skips the end of it.
// The count now spans every chapter, not just the shelf — chapters.js is the
// list, config.js is the number, and they are not allowed to drift.
if (CRAFTED_TOTAL !== CRAFTED_LEVELS) {
  problems.push(
    `CRAFTED_LEVELS ${CRAFTED_LEVELS}, ama bölümler toplamı ${CRAFTED_TOTAL} ` +
      `(${CHAPTERS.map((c) => `${c.name} ${c.levels.length}`).join(' + ')})`,
  );
}

// Monotony is a defect, not a taste. Antarctica is not a corridor at one
// height, and a course that never leaves its starting line is the thing this
// game was rightly criticised for. Level 1 is exempt: it teaches walking.
for (const def of LEVELS.slice(1)) {
  const ys = def.floes.map((f) => f.y);
  const range = Math.max(...ys) - Math.min(...ys);
  const need = def.id < 9 ? 70 : 150;
  if (range < need) {
    problems.push(`L${def.id} (${def.name}): dikey çeşitlilik yok — ${range}px, en az ${need}px olmalı`);
  }
}

// Length, for the same reason: a course that is over in four seconds cannot
// hold anybody's attention, however good the four seconds are.
for (const def of LEVELS) {
  const need = def.id <= 3 ? 1500 : 2400;
  if (def.worldW < need) {
    problems.push(`L${def.id} (${def.name}): parkur çok kısa — ${def.worldW}px, en az ${need}px`);
  }
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
