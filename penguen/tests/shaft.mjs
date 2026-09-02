/**
 * Her baca gerçekten bir bara sığıyor mu?
 *
 * This pack exists because of a bug report: "level 41 has a gap you cannot get
 * past, and it does not look like difficulty — it looks like a fault." It was
 * a fault, and the arithmetic behind it was wrong the same way for every shaft
 * in the chapter.
 *
 * A chimney is climbed by kicking off one wall into the other, which is cheap.
 * But the two columns of a shaft never both reach the bottom: each finds its
 * own foot, on purpose, so that entering needs one hand-hold rather than two.
 * That leaves a stretch at the bottom of every chimney where the far wall is
 * not there yet, and in that stretch there is nothing to kick off — the only
 * way up is to creep, at more than twice the cost per pixel.
 *
 * The composer priced whole shafts at the kicking rate. On level 41 the bottom
 * leg came out at 81% of one bar against a fairness line of 77%, and with a
 * band of wet ice on it the second shaft reached 99%. From the player's seat
 * that is not a hard climb; it is a climb lost at the top to a sum.
 *
 * So this measures every shaft the way it is actually climbed and holds the
 * chapter to its own line. A number here going over is a level nobody can
 * finish, not a level that is hard.
 */

import { CLIMB_LEVELS } from '../src/game/climb.js';
import { Tower } from '../src/game/tower.js';
import { climbBudget, scaleForLevel, sapAt } from '../src/game/config.js';

let fails = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  console.log(`  ✗ ${m}`);
  fails++;
};
const check = (c, m) => (c ? ok(m) : bad(m));

/* The chapter's own fairness line, kept in step with tower.js. A climb allowed
   the whole bar is a climb with no room for one wasted grab. */
const LEAN_CAP = 0.9;
const KICK_BUDGET = 0.62;
const CREEP_BUDGET = 0.6;
const leanOn = (base, effort) => Math.min(LEAN_CAP, base * effort);
/** What a wet pixel costs on top of a dry one, as a multiple. */
const WET_EXTRA = 0.9;

/** Every shaft, with the two numbers that decide what it costs. */
function shafts(def) {
  const walls = (def.terrain ?? []).filter((t) => t.climb);
  const out = [];
  for (const node of def.route) {
    if (!node.chimney) continue;
    const cols = walls.filter((w) => Math.abs(w.y - node.y) < 6);
    if (cols.length !== 2) continue;
    const feet = cols.map((c) => c.y + c.h);
    const bottom = Math.max(...feet);
    out.push({
      top: node.y,
      bottom,
      /* Where the second wall begins. Below this line there is one wall and
         one way up; above it there are two and the climb is kicks. */
      soloTop: Math.min(...feet),
      face: cols.find((c) => c.y + c.h === bottom),
      inner: node.chimney.inner,
    });
  }
  return out;
}

console.log('Bacalar bir bara sığıyor mu?\n');

console.log('1) Her bacanın her bölümü tek bara sığıyor');
{
  let counted = 0;
  let worst = null;
  for (const def of CLIMB_LEVELS) {
    const scale = def.scale ?? scaleForLevel(def.id);
    const nubs = def.floes.filter((f) => f.nub);
    const lean = leanOn(KICK_BUDGET, def.effort ?? 1);
    for (const s of shafts(def)) {
      const budget = climbBudget(scale, s.inner);
      // Rest ledges refill the bar, so they cut the climb into legs.
      const inside = nubs
        .filter((n) => n.y > s.top && n.y < s.bottom)
        .map((n) => n.y)
        .sort((a, b) => b - a);
      const marks = [s.bottom, ...inside, s.top];
      const centre = s.face.x + s.face.w / 2;
      for (let i = 0; i < marks.length - 1; i++) {
        const lo = marks[i];
        const hi = marks[i + 1];
        const solo = Math.max(0, lo - Math.max(hi, s.soloTop));
        const both = lo - hi - solo;
        // Wet ice is charged at the rate of the stretch it sits in.
        let wet = 0;
        for (let y = hi; y < lo; y += 2) {
          if (sapAt(def.zones, centre, y) > 1) {
            wet += (2 * WET_EXTRA) / (y > s.soloTop ? budget.creep : budget.kicked);
          }
        }
        const cost = solo / budget.creep + both / budget.kicked + wet;
        counted++;
        if (cost > lean) {
          bad(
            `L${def.id} ${def.name}: ${Math.round(lo - hi)}px'lik bölüm barın ` +
              `%${Math.round(cost * 100)}'ini istiyor (sınır %${Math.round(lean * 100)}) — ` +
              `${Math.round(solo)}px'i tek duvarda`,
          );
        }
        if (!worst || cost / lean > worst.ratio) {
          worst = { id: def.id, name: def.name, cost, lean, ratio: cost / lean };
        }
      }
    }
  }
  check(counted > 0, `${counted} baca bölümü ölçüldü`);
  if (worst) {
    ok(
      `en sıkı: L${worst.id} ${worst.name} — barın %${Math.round(worst.cost * 100)}'i ` +
        `(sınır %${Math.round(worst.lean * 100)})`,
    );
  }
}

console.log('\n2) Tek duvarlar sürünme bütçesinin içinde');
{
  /* A single face has no second wall by definition, so every pixel of it is
     creeped. Nothing here was over the line — this is the check that keeps it
     that way, since `face` and `chimney` price the bar differently. */
  let counted = 0;
  for (const def of CLIMB_LEVELS) {
    const scale = def.scale ?? scaleForLevel(def.id);
    const budget = climbBudget(scale, 520);
    const lean = leanOn(CREEP_BUDGET, def.effort ?? 1);
    const byTop = new Map();
    for (const w of (def.terrain ?? []).filter((t) => t.climb)) {
      const k = Math.round(w.y / 6);
      byTop.set(k, [...(byTop.get(k) ?? []), w]);
    }
    for (const [, group] of byTop) {
      if (group.length !== 1) continue;
      counted++;
      const cost = group[0].h / budget.creep;
      if (cost > lean) {
        bad(
          `L${def.id} ${def.name}: ${group[0].h}px tek duvar barın %${Math.round(cost * 100)}'ini ` +
            `istiyor (sınır %${Math.round(lean * 100)})`,
        );
      }
    }
  }
  check(counted > 0, `${counted} tek duvar ölçüldü`);
}

console.log('\n3) Besteci kendi kuralını uyguluyor');
{
  /* The rule has to live in the composer, not only here: a plan that asks for
     too much should be refused when it is written rather than discovered by
     somebody playing it. */
  const refuses = (build, why) => {
    try {
      build();
      bad(`${why}: kabul edildi, reddedilmeliydi`);
    } catch (err) {
      ok(`${why}: "${err.message}"`);
    }
  };
  refuses(() => {
    const t = new Tower({ scale: 1, effort: 0.8 });
    t.base({ w: 250 });
    t.chimney({ height: 900 });
  }, 'bir bara sığmayan baca');
  refuses(() => {
    const t = new Tower({ scale: 1, effort: 0.9 });
    t.base({ w: 250 });
    t.chimney({ height: 260 });
    t.sodden({ side: 1, len: 140 });
  }, 'bacanın ödeyemeyeceği ıslak buz bandı');
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Her baca, gerçekten tırmanıldığı hızlarla, bir bara sığıyor.');
