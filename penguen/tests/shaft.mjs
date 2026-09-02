/**
 * Her baca gerçekten bir bara sığıyor mu?
 *
 * This pack exists because of a bug report: "level 41 has a gap you cannot get
 * past, and it does not look like difficulty — it looks like a fault." It was
 * a fault, and the arithmetic behind it was wrong in the same way for every
 * shaft in the chapter.
 *
 * A chimney is climbed by kicking off one wall into the other, which is cheap.
 * But the two columns of a shaft never both reach the bottom: each finds its
 * own foot, on purpose, so that entering the shaft needs one hand-hold rather
 * than two. That leaves a stretch at the bottom of every chimney where the far
 * wall simply is not there yet, and in that stretch there is nothing to kick
 * off — the only way up is to creep, at more than twice the cost per pixel.
 *
 * The composer's budget priced the whole height at the kicking rate. On level
 * 41 the true cost of the bottom leg came out at 81% of one bar against a
 * fairness line of 77%, and with a band of wet ice added to it the second
 * shaft reached 99%. From the player's seat that is not a hard climb; it is a
 * climb you lose at the top to a sum you cannot see.
 *
 * So this measures every shaft the way it is actually climbed, and holds the
 * chapter to its own line. A number here going over is a level nobody can
 * finish, not a level that is hard.
 */

import { CLIMB_LEVELS } from '../src/game/climb.js';
import { climbBudget, scaleForLevel, sapAt, CLIMB } from '../src/game/config.js';

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
const leanOn = (effort) => Math.min(LEAN_CAP, KICK_BUDGET * effort);

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
      node,
      top: node.y,
      bottom,
      /* Where the second wall begins. Below this line there is one wall and
         one way up; above it there are two and the climb is kicks. */
      soloTop: Math.min(...feet),
      face: cols.find((c) => c.y + c.h === bottom),
      inner: node.chimney.inner,
      rests: node.chimney.rests ?? 0,
    });
  }
  return out;
}

console.log('Bacalar bir bara sığıyor mu?\n');

console.log('1) Her bacanın alt bölümü tek bara sığıyor');
{
  let worst = { cost: 0 };
  let counted = 0;
  for (const def of CLIMB_LEVELS) {
    const scale = def.scale ?? scaleForLevel(def.id);
    const nubs = def.floes.filter((f) => f.nub);
    for (const s of shafts(def)) {
      const budget = climbBudget(scale, s.inner);
      const lean = leanOn(def.effort ?? 1);
      const height = s.bottom - s.top;
      // Rest ledges refill the bar, so they cut the climb into legs.
      const inside = nubs.filter((n) => n.y > s.top && n.y < s.bottom).map((n) => n.y);
      const marks = [s.bottom, ...inside.sort((a, b) => b - a), s.top];
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
            wet += (2 * (CLIMB.drainHold ? 0.9 : 0.9)) / (y > s.soloTop ? budget.creep : budget.kicked);
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
        if (cost / lean > worst.cost / (worst.lean ?? 1)) worst = { def, cost, lean, height };
      }
    }
  }
  check(counted > 0, `${counted} baca bölümü ölçüldü`);
  if (worst.def) {
    ok(
      `en sıkı: L${worst.def.id} ${worst.def.name} — barın %${Math.round(worst.cost * 100)}'i ` +
        `(sınır %${Math.round(worst.lean * 100)})`,
    );
  }
}

console.log('\n2) Tek duvarlar da sürünme bütçesinin içinde');
{
  /* A single face has no second wall by definition, so every pixel of it is
     creeped. Nothing here was over the line — this is the check that keeps it
     that way, since `face` and `chimney` price the bar differently. */
  const CREEP_BUDGET = 0.6;
  let counted = 0;
  for (const def of CLIMB_LEVELS) {
    const scale = def.scale ?? scaleForLevel(def.id);
    const budget = climbBudget(scale, 520);
    const lean = Math.min(LEAN_CAP, CREEP_BUDGET * (def.effort ?? 1));
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
     too much should be refused when it is written rather than discovered by a
     player. */
  const { Tower } = await import('../src/game/tower.js');
  let refused = false;
  try {
    const t = new Tower({ scale: 1, effort: 0.8 });
    t.base({ w: 250 });
    t.chimney({ height: 900 });
  } catch (err) {
    refused = /sığmıyor|yüksek/.test(err.message);
    ok(`aşırı baca reddediliyor: "${err.message}"`);
  }
  check(refused, 'besteci bir bara sığmayan bacayı kabul etmiyor');
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Her baca, gerçekten tırmanıldığı hızlarla, bir bara sığıyor.');
