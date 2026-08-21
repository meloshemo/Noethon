/**
 * Climb validator.
 *
 * The shelf validator walks a level left to right and asks whether every jump
 * is inside the penguin's reach. A mountain cannot be checked that way, because
 * most of a mountain is not jumped at all: it is held onto. So this one walks
 * the *declared route* — every ledge the composer placed, with the move it was
 * placed for — and asks whether the geometry supports that move.
 *
 * Three moves, three questions:
 *
 *   jump   Is the gap inside the reach *at that rise*? A jump that gains 110 px
 *          has almost no horizontal travel left, so distance and height are
 *          checked together, never as two separate budgets.
 *   kick   Is there ice to kick off, does the shaft still gain height per kick
 *          at that width, and does a full stamina bar cover the shaft?
 *   creep  Same, for a single wall climbed the slow way.
 *
 * And the structural rules a climb has that a shelf does not: no ledge may be
 * buried in a wall, no cornice may seal a shaft, and no falling serac may own
 * more of its cycle than a player can wait out.
 *
 * Everything is derived from config.js. Nothing here is a number somebody liked
 * the look of.
 */

import {
  PHYS,
  PENGUIN,
  CLIMB,
  scaleForLevel,
  reachFor,
  reachAt,
  kickGain,
  climbBudget,
} from '../src/game/config.js';
import { CLIMB_LEVELS, CLIMB_FROM } from '../src/game/climb.js';

let failures = 0;
let warnings = 0;

/** How much of the theoretical maximum a level is allowed to actually use. */
const BUDGET = { jump: 0.86, rise: 0.87, kick: 0.72, creep: 0.7, shard: 0.35 };

/**
 * What a level's `effort` does to the two stamina lines above.
 *
 * `kick` and `creep` are comfort rather than fairness: at 0.72 a shaft must fit
 * inside under three quarters of a bar, so you top out with a quarter spare.
 * Taking that spare away is precisely what makes a climb hard, and a chapter
 * where every level keeps the same quarter is a chapter with no curve — which
 * is exactly what the difficulty tool found.
 *
 * So the two of them scale with the level's own effort, up to a line that does
 * not move. Past `HARD_CAP` there is no bar left for a player who grabs a
 * moment late, and a climb with no bar left has to be done perfectly rather
 * than well. Everything else here stays where it was: reach and rise are
 * fairness, not comfort, and they are not for sale.
 */
const HARD_CAP = 0.94;
const leanOn = (base, def) => Math.min(HARD_CAP, base * (def.effort ?? 1));

/**
 * How far a kick off a wall carries, landing `rise` pixels higher.
 *
 * A kick is not a jump: it starts with the sideways speed already at full and
 * the upward speed at `kickY` of a jump, so it goes further sideways and less
 * high. Worth deriving separately rather than borrowing the jump number.
 */
function kickThrow(scale, rise) {
  const v = Math.abs(PHYS.jumpVelocity) * (1 - PENGUIN.jumpPenaltyPerScale * (scale - 1)) * CLIMB.kickY;
  const speed = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
  const apex = (v * v) / (2 * PHYS.gravityUp);
  if (rise > apex) return 0;
  const tUp = v / PHYS.gravityUp;
  const tDown = Math.sqrt((2 * (apex - rise)) / PHYS.gravityDown);
  return speed * (tUp + tDown);
}

function rects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function validate(def) {
  const scale = def.scale ?? scaleForLevel(def.id);
  const reach = reachFor(scale);
  const penguinW = PENGUIN.w * scale;
  const penguinH = PENGUIN.h * scale;
  const walls = def.terrain.filter((t) => t.climb);
  const blocks = def.terrain.filter((t) => !t.climb);
  const problems = [];
  const fail = (msg) => problems.push(msg);

  /* --- the route ---------------------------------------------------- */
  const route = def.route ?? [];
  if (route.length < 3) fail('rota çok kısa');

  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const rise = a.y - b.y;
    const gap = Math.max(0, b.x > a.x ? b.x - (a.x + a.w) : a.x - (b.x + b.w));

    if (b.via === 'jump') {
      if (rise > reach.height * BUDGET.rise) {
        fail(
          `${i}. adım zıplanamaz: ${Math.round(rise)}px yükseliş, ` +
            `sınır ${Math.round(reach.height * BUDGET.rise)}px`,
        );
      }
      const allowed = reachAt(scale, Math.max(0, rise)) * BUDGET.jump;
      if (gap > allowed) {
        fail(
          `${i}. adım çok uzak: ${Math.round(gap)}px, ` +
            `${Math.round(rise)}px yükselirken erişim ${Math.round(allowed)}px`,
        );
      }
      continue;
    }

    if (b.via === 'kick' && b.chimney) {
      const c = b.chimney;
      const gain = kickGain(scale, c.inner);
      if (gain <= 12) fail(`${i}. baca çok geniş: tekme ${Math.round(gain)}px kazandırıyor`);
      const budget = climbBudget(scale, c.inner);
      const perBreath = Math.max(budget.kicked, budget.creep) * leanOn(BUDGET.kick, def);
      const stretches = c.rests + 1;
      const tallest = c.height / stretches;
      if (tallest > perBreath) {
        fail(
          `${i}. baca bir nefese sığmıyor: ${Math.round(tallest)}px, ` +
            `bir barın sınırı ${Math.round(perBreath)}px`,
        );
      }
      // The way out is the head of a column, so it has to *be* a head: a ledge
      // exactly as wide as the column, flush with its top.
      // And there really is ice on both sides for the whole shaft.
      //
      // The foot of a shaft is allowed to hang above the ledge it starts from —
      // a chimney whose columns reached all the way down would cut through the
      // jumps between the ledges below it. What is not allowed is a mouth
      // higher than a jump plus a reach, because then nobody can get a hand on
      // it in the first place.
      const grabHeight = reach.height + penguinH * 0.8;
      // Both columns have to reach the top of the shaft. Their *feet* may sit
      // at different heights — a jump corridor below usually crosses only one
      // of them — but at least one has to hang low enough to be caught from
      // the ledge the climb starts on.
      // The shaft's columns: everything standing between the ledge the climb
      // starts from and the shoulder it ends on. The exit is no longer a wall
      // top — it is open mountain above them — so they cannot be found by
      // looking level with it.
      const columns = walls.filter((w) => w.y + w.h <= a.y + 12 && w.y >= b.y - 12);
      if (columns.length < 2) fail(`${i}. bacanın iki duvarı yok (${columns.length})`);
      // The exit has to be a column head: a ledge flush with the top of one of
      // the shaft's columns, wide enough to stand on.
      const head = def.floes.some(
        (f) =>
          f.head &&
          Math.abs(f.y - b.y) < 3 &&
          columns.some((w) => Math.abs(f.x + f.w / 2 - (w.x + w.w / 2)) < 8),
      );
      if (!head) fail(`${i}. bacanın çıkışı bir duvarın tepesinde değil`);
      const reachable = columns.some((w) => a.y - (w.y + w.h) <= grabHeight);
      if (columns.length && !reachable) {
        const best = Math.min(...columns.map((w) => a.y - (w.y + w.h)));
        fail(`${i}. baca ağzı ${Math.round(best)}px yukarıda, tutunma sınırı ${Math.round(grabHeight)}px`);
      }
      continue;
    }

    if (b.via === 'creep' && b.climbHeight) {
      const budget = climbBudget(scale, def.worldW);
      const ceiling = budget.creep * leanOn(BUDGET.creep, def);
      if (b.climbHeight > ceiling) {
        fail(`${i}. duvar bir bara sığmıyor: ${b.climbHeight}px > ${Math.round(ceiling)}px`);
      }
      // The wall has to reach from the ledge below it up to the exit, and the
      // exit has to be flush with its head — the penguin pulls over the top
      // onto the ledge, so a gap there is a gap it falls down.
      const grabHeight = reach.height + penguinH * 0.8;
      const covering = walls.filter((w) => w.y <= b.y + 4 && w.y + w.h >= a.y - grabHeight);
      if (!covering.length) {
        fail(`${i}. adımda tepeye kadar çıkan duvar yok`);
        continue;
      }
      if (a.y - (covering[0].y + covering[0].h) > grabHeight) {
        fail(`${i}. duvarın eteği tutunulamayacak kadar yüksek`);
      }
      const wl = covering[0];
      if (Math.abs(wl.y - b.y) > 6) {
        fail(`${i}. duvarın tepesi ${wl.y}, çıkış buzu ${b.y} — aynı hizada değil`);
      }
      const touching = b.x <= wl.x + wl.w + 6 && b.x + b.w >= wl.x - 6;
      if (!touching) fail(`${i}. çıkış buzu duvara değmiyor`);
      // And nothing may roof the column being climbed: pulling over the top
      // needs a body's worth of air above the wall's head.
      for (const f of def.floes) {
        if (f === b) continue;
        if (f.x + f.w <= wl.x || f.x >= wl.x + wl.w) continue;
        const head = wl.y - (f.y + (f.h ?? 20));
        if (head > 0 && head < penguinH * 1.1) {
          fail(`${i}. duvarın tepesinde ${Math.round(head)}px kalıyor, penguen ${Math.round(penguinH)}px`);
        }
      }
      continue;
    }

    if (b.via !== 'start') fail(`${i}. adımın hareketi tanımsız: ${b.via}`);
  }

  /* --- nothing buried, nothing sealed ------------------------------- */
  for (const f of def.floes) {
    const fb = { x: f.x, y: f.y, w: f.w, h: f.h ?? 20 };
    for (const w of walls) {
      // A ledge resting exactly on a wall top is a cornice, which is fine. A
      // ledge inside one is a bug you cannot see and cannot land on.
      // A ledge marked as resting on a wall head — the top-out of a chimney,
      // or the exit of a single face reaching out over the column it climbed —
      // is *meant* to sit in that column's footprint. That is what makes
      // topping out the same thing as arriving.
      if (f.head || f.rim) continue;
      if (rects({ ...fb, y: fb.y + 2, h: fb.h - 4 }, w)) {
        fail(`buz ${Math.round(f.x)},${Math.round(f.y)} duvarın içinde`);
      }
    }
    for (const r of blocks) {
      if (rects(fb, r)) fail(`buz ${Math.round(f.x)},${Math.round(f.y)} kayanın içinde`);
    }
  }

  // Overhangs must leave a body's worth of headroom over whatever is under
  // them, or they are a ceiling rather than an obstacle.
  for (const r of blocks) {
    for (const f of def.floes) {
      if (f.x + f.w < r.x || f.x > r.x + r.w) continue;
      const head = f.y - (r.y + r.h);
      if (head > 0 && head < penguinH * 1.25) {
        fail(`çıkıntı altında ${Math.round(head)}px kalıyor, penguen ${Math.round(penguinH)}px`);
      }
    }
  }

  /* --- the shaft is inside the world -------------------------------- */
  for (const f of def.floes) {
    if (f.x < -4 || f.x + f.w > def.worldW + 4) {
      fail(`buz dünyanın dışında: ${Math.round(f.x)}..${Math.round(f.x + f.w)} / ${def.worldW}`);
    }
    if (f.y < 0 || f.y > def.waterY) {
      fail(`buz dikeyde dışarıda: ${Math.round(f.y)} / su ${def.waterY}`);
    }
  }

  /* --- falling ice you can wait out --------------------------------- */
  for (const h of def.hazards) {
    if (h.kind !== 'shard') continue;
    const dropTime = Math.sqrt((2 * (h.fall ?? 600)) / 2000);
    const share = (dropTime + (h.warn ?? 0.5)) / (h.period ?? 3);
    if (share > BUDGET.shard) {
      fail(`serak döngüsünün %${Math.round(share * 100)}'i tehlikeli — beklenemez`);
    }
  }

  /* --- wind that pushes rather than walls ---------------------------- */
  for (const h of def.hazards) {
    if (h.kind !== 'storm') continue;
    // Blown sideways over one full jump, the penguin must not lose more than
    // half a jump's worth of line — the same rule the shelf storms follow.
    const air = 0.66;
    const drift = 0.5 * h.power * air * air * 0.5;
    if (drift > reach.distance * 0.5) {
      fail(`baca rüzgârı çok savuruyor: ${Math.round(drift)}px`);
    }
  }

  /* --- collectibles that exist ------------------------------------- */
  const standable = def.floes;
  for (const f of [...def.fish, ...def.speedFish, ...def.rotFish]) {
    const ok = standable.some((s) => {
      const dx = Math.max(0, Math.abs(f.x + 11 - (s.x + s.w / 2)) - s.w / 2);
      const dy = s.y - f.y;
      return dx <= reach.distance * 0.55 && dy <= reach.height * 0.95 && dy > -60;
    });
    if (!ok) fail(`balık ${Math.round(f.x)},${Math.round(f.y)} hiçbir buzdan alınamıyor`);
  }

  /* --- the summit really is the top -------------------------------- */
  if (def.goal.y >= def.spawn.y) fail('zirve başlangıçtan yukarıda değil');
  const top = Math.min(...def.floes.map((f) => f.y));
  if (def.goal.y > top + 4) fail('zirveden daha yüksek bir buz var');

  /* --- checkpoints on something you can stand on -------------------- */
  for (const c of def.checkpoints) {
    const on = def.floes.some((f) => Math.abs(f.y - c.y) < 2 && c.x >= f.x - 4 && c.x <= f.x + f.w + 4);
    if (!on) fail(`kontrol noktası ${Math.round(c.x)},${Math.round(c.y)} boşlukta`);
  }

  return problems;
}

/* ------------------------------------------------------------------ */

console.log('Tırmanış bölümleri doğrulanıyor...\n');

let ledges = 0;
let wallCount = 0;
for (const def of CLIMB_LEVELS) {
  const problems = validate(def);
  ledges += def.floes.length;
  wallCount += def.terrain.filter((t) => t.climb).length;
  if (problems.length) {
    failures += problems.length;
    console.log(`✗ ${def.id}. ${def.name}`);
    for (const p of problems) console.log(`    ${p}`);
  }
}

const scale = scaleForLevel(CLIMB_FROM);
const inner = Math.round(reachFor(scale).distance * 0.9);
const b = climbBudget(scale, inner);
console.log(`Bölüm sayısı        : ${CLIMB_LEVELS.length} (${CLIMB_FROM}–${CLIMB_FROM + CLIMB_LEVELS.length - 1})`);
console.log(`Buz çıkıntısı       : ${ledges}`);
console.log(`Tırmanılabilir duvar: ${wallCount}`);
console.log(`Bir bar             : ${Math.round(b.creep)}px sürünerek · ${Math.round(b.kicked)}px tekmeleyerek`);
console.log(`Tekme başına        : ${Math.round(b.perKick)}px (${inner}px baca)`);
console.log(
  `Toplam tırmanış     : ${CLIMB_LEVELS.reduce((n, d) => n + d.metres, 0)} m\n`,
);

if (failures) {
  console.log(`✗ ${failures} sorun.`);
  process.exit(1);
}
if (warnings) console.log(`${warnings} uyarı.`);
console.log('✓ Bütün tırmanışlar geçilebilir.');
