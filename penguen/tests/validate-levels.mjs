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

import {
  PHYS, PENGUIN, ICE, WIND, HUSH, windAt, tailWindow, lullWindow, reachWithWind, riseWithLift,
  reachInHush, crossableGap, scaleForLevel, reachFor, CRAFTED_LEVELS, MENACE_CEILING,
} from '../src/game/config.js';
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

  // A wind gap is deliberately longer than an unassisted jump — that is the
  // whole point of it — so the plain reach rule below steps aside for those
  // pairs and the stricter wind rules further down take over.
  const windGaps = def.windGaps ?? [];
  const overWind = new Set(windGaps.map((g) => `${g.from}:${g.to}`));
  // Same for a shelf that only the rising air reaches.
  const updrafts = def.updrafts ?? [];
  const overLift = new Set(updrafts.map((g) => `${g.from}:${g.to}`));
  // And for the hollow where gravity itself is different, which is exempt
  // from both the distance rule and the height rule at once — it is the only
  // thing in the game that breaks two limits with one idea.
  const hushes = def.hushes ?? [];
  const overHush = new Set(hushes.map((g) => `${g.from}:${g.to}`));

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

    const hushCrossed = overHush.has(`${a.x + a.w}:${b.x}`);
    const windCrossed = overWind.has(`${a.x + a.w}:${b.x}`) || hushCrossed;
    if (!windCrossed && gap > reach.distance * budget.distance) {
      fail(`${i}→${i + 1} arası ${Math.round(gap)}px, erişim ${Math.round(reach.distance * budget.distance)}px`);
    }
    const liftCrossed = overLift.has(`${a.x + a.w}:${b.x}`) || hushCrossed;
    if (!liftCrossed && rise > reach.height * budget.rise) {
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
    const period = h.period ?? WIND.period;
    const power = Math.abs(h.power ?? WIND.power);
    if (period < 3) fail(`fırtına çok sık esiyor (period=${period})`);

    // The wind is allowed to matter now, so the rules that keep it fair are
    // different ones. The old cap said "it must never change what you can
    // reach", which is the same as saying it must never be worth reading.
    //
    // What has to hold instead:
    //
    //   1. There is a lull, it comes round on a fixed beat, and it is long
    //      enough to take off in. Everything the level asks is possible then.
    //   2. Standing still on the ground beats the wind. A penguin that stops
    //      and digs in must not be pushed backwards off its own ledge.
    let lullSeconds = 0;
    let tailSeconds = 0;
    for (let i = 0; i < 400; i++) {
      if (lullWindow(i / 400)) lullSeconds += period / 400;
      if (tailWindow(i / 400)) tailSeconds += period / 400;
    }
    if (lullSeconds < 0.62) fail(`fırtınanın sakin anı çok kısa: ${lullSeconds.toFixed(2)} sn`);
    if (tailSeconds < 0.62) fail(`kuyruk rüzgârı çok kısa: ${tailSeconds.toFixed(2)} sn`);
    const dugIn = power * WIND.dugIn;
    if (dugIn >= PHYS.groundFriction * 0.8) {
      fail(`fırtına duran pengueni sürüklüyor: ${Math.round(dugIn)} vs sürtünme ${PHYS.groundFriction}`);
    }
    // And walking with the wind against you must still be forward motion.
    const walking = power * WIND.ground;
    if (walking >= PHYS.groundAccel * 0.5) {
      fail(`fırtınaya karşı yürünmüyor: ${Math.round(walking)} vs ivme ${PHYS.groundAccel}`);
    }
    // There has to be ice inside the zone to shelter on.
    const inside = floes.filter((f) => f.x + f.w > h.x && f.x < h.x + h.w);
    if (inside.length < 2) fail(`fırtına bölgesinde sığınacak buz yok (x=${h.x})`);
  }

  // --- wind gaps ------------------------------------------------------
  // The one place the wind is load-bearing: a gap you cannot jump, and can
  // jump with the wind behind you. That claim is worth proving in both
  // directions, because getting either half wrong ruins it — too short and
  // the wind is decoration again, too long and the level is a wall.
  // Both edge-to-edge: a gap is the hole between two floes, and the penguin
  // crosses it a whole body longer than its centre travels.
  const body = PENGUIN.w * scale;
  const plainGap = crossableGap(scale);
  const winded = reachWithWind(scale, WIND.power) + body;
  // The assist is only real if the wind is still at full strength when the
  // penguin lands, so the jump has to fit inside the tailwind, not straddle it.
  const jumpV = Math.abs(PHYS.jumpVelocity) * (1 - PENGUIN.jumpPenaltyPerScale * (scale - 1));
  const apexH = (jumpV * jumpV) / (2 * PHYS.gravityUp);
  const flight = jumpV / PHYS.gravityUp + Math.sqrt((2 * apexH) / PHYS.gravityDown);
  for (const g of windGaps) {
    // It has to be a real gate. If a flat-out running jump clears it, the
    // storm is scenery.
    if (g.gap <= plainGap * 1.08) {
      fail(`rüzgâr boşluğu rüzgârsız da geçiliyor: ${g.gap}px, rüzgârsız erişim ${Math.round(plainGap)}px`);
    }
    // And it has to be comfortably inside the assisted jump, not on its lip:
    // the tailwind is not perfectly timed by a human, so the margin is where
    // the fairness lives.
    if (g.gap > winded * 0.86) {
      fail(`rüzgâr boşluğu rüzgârla bile zor: ${g.gap}px, rüzgârlı erişim ${Math.round(winded)}px`);
    }
    // A storm has to actually blow over the whole crossing, and it has to
    // hold full strength for longer than the jump takes.
    const period = ((def.hazards ?? []).find((h) => h.kind === 'storm')?.period) ?? WIND.period;
    let atFull = 0;
    for (let i = 0; i < 400; i++) if (windAt(i / 400) > 0.999) atFull += period / 400;
    if (atFull < flight) {
      fail(`kuyruk rüzgârı sıçrayıştan kısa: ${atFull.toFixed(2)}s < ${flight.toFixed(2)}s`);
    }
    const covering = (def.hazards ?? []).find(
      (h) => h.kind === 'storm' && h.x <= g.from && h.x + h.w >= g.to,
    );
    if (!covering) fail(`rüzgâr boşluğunun üstünde fırtına yok (${g.from}→${g.to})`);
    // The answer to this gap is to stand still and wait for the beat, so the
    // ledge you wait on must be solid, wide, and not on a fuse.
    const perch = floes.find((f) => f.x + f.w === g.from);
    if (!perch) {
      fail(`rüzgâr boşluğundan önce buz yok (${g.from})`);
    } else {
      if (perch.type !== 'solid') fail(`rüzgâr boşluğunun bekleme buzu '${perch.type}', kalıcı olmalı`);
      if (perch.w < PENGUIN.w * scale * 3) {
        fail(`rüzgâr boşluğunun bekleme buzu dar: ${perch.w}px`);
      }
    }
    const landing = floes.find((f) => f.x === g.to);
    if (!landing) fail(`rüzgâr boşluğunun karşısında buz yok (${g.to})`);
    else if (landing.w < PENGUIN.w * scale * 2.5) {
      fail(`rüzgâr boşluğunun iniş buzu dar: ${landing.w}px`);
    }
  }

  // --- updrafts -------------------------------------------------------
  // The vertical half of the same idea: a shelf out of jumping range with a
  // column of rising air under it. The column has to be the reason you get
  // there, it has to actually cover the climb, and it must never be so strong
  // that the penguin stops falling altogether.
  const lifted = riseWithLift(scale, WIND.lift);
  for (const g of updrafts) {
    if (g.rise <= reach.height * 1.05) {
      fail(`yükselen hava olmadan da çıkılıyor: ${g.rise}px, zıplama ${Math.round(reach.height)}px`);
    }
    if (g.rise > lifted * 0.85) {
      fail(`yükselen havayla bile çıkılmıyor: ${g.rise}px, taşınan yükseklik ${Math.round(lifted)}px`);
    }
    const column = (def.hazards ?? []).find(
      (h) => h.kind === 'gust' && h.x <= g.from && h.x + h.w >= g.to,
    );
    if (!column) {
      fail(`yükselen hava sütunu boşluğu kapsamıyor (${g.from}→${g.to})`);
    } else {
      if ((column.power ?? 0) >= PHYS.gravityUp * 0.6) {
        fail(`yükselen hava çok güçlü: ${column.power} vs yerçekimi ${PHYS.gravityUp}`);
      }
      const ledge = floes.find((f) => f.x === g.to);
      if (ledge && column.y > ledge.y - 20) {
        fail(`sütun iniş buzuna kadar çıkmıyor (${column.y} > ${ledge.y})`);
      }
    }
  }

  // --- the hush -------------------------------------------------------
  //
  // The strictest gate in the file, because this is the only mechanic that
  // suspends two rules at once. Four things have to be true and all four have
  // to be true together, or the hollow is either a free pass or a wall:
  //
  //   the gap is genuinely uncrossable outside it,
  //   the shelf is genuinely unreachable outside it,
  //   both are comfortably inside what the pocket gives,
  //   and the pocket actually covers the whole crossing, with room overhead
  //   for the arc it makes possible.
  for (const g of hushes) {
    const quiet = reachInHush(scale, Infinity, g.gravity);
    if (g.gravity < HUSH.floor) {
      fail(`sessiz alan fazla hafif: ${g.gravity} < ${HUSH.floor}`);
    }
    if (g.across <= plainGap * 1.25) {
      fail(`sessiz alan boşluğu dışarıdan da geçiliyor: ${g.across}px, normal ${Math.round(plainGap)}px`);
    }
    if (g.up <= reach.height * 1.25) {
      fail(`sessiz alan rafına dışarıdan da çıkılıyor: ${g.up}px, normal ${Math.round(reach.height)}px`);
    }
    if (g.across > (quiet.distance - PENGUIN.w * scale) * 0.92) {
      fail(`sessiz alanda bile geçilmiyor: ${g.across}px, içeride ${Math.round(quiet.distance)}px`);
    }
    if (g.up > quiet.full * 0.82) {
      fail(`sessiz alanda bile çıkılmıyor: ${g.up}px, içeride ${Math.round(quiet.full)}px`);
    }
    const pocket = (def.zones ?? []).find(
      (z) => z.kind === 'hush' && z.x <= g.from && z.x + z.w >= g.to,
    );
    if (!pocket) {
      fail(`sessiz alan geçişi kapsamıyor (${g.from}→${g.to})`);
    } else {
      // The arc inside the pocket is over a second and a half long and more
      // than three hundred pixels tall. A ceiling that clips it would turn the
      // most spectacular jump in the game into a bump against a roof.
      const floor = Math.max(...floes.filter((f) => f.x >= g.from - 260 && f.x <= g.to + 260).map((f) => f.y), 0);
      const room = floor - pocket.top;
      if (room < quiet.full * 0.95) {
        fail(`sessiz alanın tavanı yayı kesiyor: ${Math.round(room)}px, yay ${Math.round(quiet.full)}px`);
      }
    }
  }

  /**
   * --- snap floes have to be alone under the sky ------------------------
   *
   * A snap floe does not wait to be stood on. It fires when a falling penguin
   * is within a quarter of a second of its surface, which is the whole point:
   * it is gone by the time your feet arrive. What that also means is that it
   * fires for a penguin who is not aiming at it at all — one landing on a
   * different floe, a little above and slightly overlapping.
   *
   * Level eighteen shipped like that. Four snap floes tucked under the floes
   * the route lands on, firing on every correct landing, shattering ice the
   * player could not see and had not touched. Nothing caught it: the geometry
   * was legal, the level was passable, and the only symptom was a noise.
   *
   * So: nothing may hang over a snap floe within the height a fall crosses in
   * the trigger window. If something does, the snap is not a trap, it is a
   * rumour going off under the floor.
   *
   * Read from `all` rather than `floes`, because `floes` is the *route* — snap
   * ice is filtered out of it precisely so the reachability rules ignore
   * something that will not be there. That filter is right, and it is also why
   * a check written against `floes` found nothing at all when it was pointed
   * at the very level it was written for.
   */
  const snapDrop = PHYS.maxFall * ICE.snapTrigger;
  for (const f of all) {
    if (f.type !== 'snap') continue;
    for (const other of all) {
      if (other === f) continue;
      if (other.x + other.w <= f.x || other.x >= f.x + f.w) continue;
      const above = f.y - other.y;
      if (above > 0 && above < snapDrop) {
        fail(
          `kaçan buz (x=${f.x}) başka bir buzun altında: ${Math.round(above)}px, ` +
            `tetik mesafesi ${Math.round(snapDrop)}px`,
        );
      }
    }
  }

  /**
   * --- the menace dial has a floor -------------------------------------
   *
   * `menace` speeds up everything that moves, and it exists because the
   * geometric dial ran out — the widest gap on the last levels is already
   * exactly what a running jump clears, so the only honest way left to make
   * them harder is to give the player less time rather than more distance.
   *
   * Less time has a floor, and this is it. None of these rules is about
   * whether a level is hard; they are about whether the hazard is a clock the
   * player can read or a coin flip with an animation on it:
   *
   *   an icicle's warning must stay long enough to walk a body out from under;
   *   a seal must stay slower than the penguin, or being on the same floe as
   *     one is death regardless of what you do;
   *   an orca must stay under water longer than it takes to cross its gap.
   *
   * Nothing here checks a distance, because `menace` never changes one. That
   * is the whole reason it was chosen over widening the ice.
   */
  const menace = def.menace ?? 1;
  if (menace > MENACE_CEILING) fail(`hız çarpanı fazla yüksek: ${menace}`);
  const bodyOut = (PENGUIN.w * scale) / PHYS.moveSpeed;
  for (const h of def.hazards ?? []) {
    if (h.kind === 'icicle') {
      const warn = 0.42 / menace;
      if (warn < bodyOut * 1.35) {
        fail(`sarkıt uyarısı çok kısa: ${warn.toFixed(2)} sn, kaçış ${(bodyOut * 1.35).toFixed(2)} sn`);
      }
    }
    if (h.kind === 'seal') {
      const speed = (h.speed ?? 70) * menace;
      if (speed > PHYS.moveSpeed * 0.72) {
        fail(`fok penguenden hızlı: ${Math.round(speed)} px/sn, yürüyüş ${PHYS.moveSpeed}`);
      }
    }
    if (h.kind === 'orca') {
      const period = (h.period ?? 3.2) / menace;
      // Time to walk the gap it surfaces in, plus the jump over it.
      const cross = (h.w ?? 76) / PHYS.moveSpeed + reach.distance / PHYS.moveSpeed;
      if (period < cross) {
        fail(`orka döngüsü çok kısa: ${period.toFixed(2)} sn, geçiş ${cross.toFixed(2)} sn`);
      }
    }
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

/*
 * Sample the endless range at both ends of its ramp.
 *
 * Eighty consecutive ids from the start covers every shape the generator makes
 * (they cycle every twenty) four times over, at the shallow end. That used to
 * be the whole sample, and it stopped at level a hundred and fifty-six — which
 * was fine while everything past ninety-seven was identical, and stopped being
 * fine the moment the clock kept tightening past it. The rules below are the
 * ones that decide whether a sped-up hazard is still a clock a player can read,
 * so they have to be asked at the speed the player will actually meet, not at
 * the speed the sample happened to reach.
 */
const generated = [];
const DEEP = CRAFTED_LEVELS + 220; // past the end of the second ramp
for (const id of [
  ...Array.from({ length: 80 }, (_, i) => CRAFTED_LEVELS + 1 + i),
  ...Array.from({ length: 40 }, (_, i) => DEEP + i),
]) {
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
