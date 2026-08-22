/**
 * Under-ice geometry, checked before anybody swims it.
 *
 * `dive-run.mjs` proves each level can be finished by running the real World
 * against it. This proves something different and cheaper: that the level is
 * *shaped* the way the chapter says it is. The two catch different things — a
 * solver says "somebody got through", a validator says "and it was not luck" —
 * and between them there is nowhere for a bad level to hide.
 */

import { DIVE_LEVELS } from '../src/game/dive.js';
import { PENGUIN, SWIM, swimReach, breathRange, breathFor, swimCost } from '../src/game/config.js';
import { rectsOverlap } from '../src/core/util.js';

let fails = 0;
const bad = (def, msg) => {
  console.log(`  ✗ ${def.id}. ${def.name}: ${msg}`);
  fails++;
};

console.log('Dalış bölümleri doğrulanıyor...\n');

let slots = 0;
let holes = 0;
let tightest = Infinity;
let longestSwim = 0;

for (const def of DIVE_LEVELS) {
  const scale = def.scale;
  const bodyH = PENGUIN.h * scale;
  const bodyW = PENGUIN.w * scale;
  const route = def.route;

  // 1. Every slot is wide enough to swim through, with a body to spare.
  for (const r of route) {
    if (r.tag !== 'gate') continue;
    slots++;
    tightest = Math.min(tightest, r.gap);
    if (r.gap < bodyH * 1.8) {
      bad(def, `${r.x} noktasındaki geçit ${r.gap}px, gövde ${Math.round(bodyH)}px`);
    }
  }

  // 2. Every move between two slots has room for the depth change it needs.
  //    Rising and sinking are different speeds, so this is asked in the
  //    direction the swimmer actually goes, never on an average.
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const dy = b.y - a.y;
    if (Math.abs(dy) < 5) continue;
    const need = swimReach(scale, dy);
    const have = b.x - a.x;
    if (have + 1 < need) {
      bad(def, `${a.x}→${b.x}: ${Math.round(dy)}px için ${Math.round(need)}px lazım, ${Math.round(have)}px var`);
    }
  }

  /**
   * 3. No stretch between two breaths is longer than a lungful, with margin.
   *    Measured along the route, not as the crow flies — the crow is not the
   *    one running out of air.
   *
   *    And measured in *air* rather than in pixels wherever the two differ.
   *    Cold water empties the lungs faster, so a segment through a trench is
   *    charged as the longer swim it really is. Getting this wrong is the
   *    quietest possible failure: the geometry is fine, every rule passes, and
   *    the level simply cannot be finished by anybody.
   */
  const breaths = [0];
  for (const r of route) if (r.tag === 'air' || r.tag === 'start') breaths.push(r.x);
  breaths.push(route[route.length - 1].x);
  const lung = breathRange(scale);
  /**
   * Distance from a to b, charged at whatever the lungs are actually paying.
   *
   * `swimCost` samples along each leg using the same function the world calls
   * every frame, so this cannot drift from the running game — which it did,
   * once, in the way that matters: level sixty passed here and drowned in the
   * solver, because a leg was being charged at the rate measured at one end
   * instead of the rate along the whole of it.
   */
  const airCost = (from, to) => {
    let total = 0;
    for (let k = 1; k < route.length; k++) {
      const p = route[k - 1];
      const q = route[k];
      if (q.x <= from || p.x >= to) continue;
      const span = Math.min(q.x, to) - Math.max(p.x, from);
      const full = Math.max(1, q.x - p.x);
      total += (swimCost(def.zones, p, q) * span) / full;
    }
    return total;
  };
  for (let i = 1; i < breaths.length; i++) {
    const swim = Math.max(breaths[i] - breaths[i - 1], airCost(breaths[i - 1], breaths[i]));
    longestSwim = Math.max(longestSwim, swim);
    // The fairness line, not the difficulty dial. The composer's own budget is
    // per level and climbs across the chapter; this is the point past which
    // there is no room left for a player who takes a slightly wrong line.
    if (swim > lung * 0.95) {
      bad(def, `${Math.round(swim)}px nefessiz, bir ciğer ${Math.round(lung)}px`);
    }
  }

  // 4. Every hole is actually open: no ceiling across it, and wide enough to
  //    swim up into without threading a needle.
  for (const hole of def.air) {
    holes++;
    if (hole.w < bodyW * 2) bad(def, `nefes deliği ${hole.w}px, çok dar`);
    // The throat: the part of the hole the penguin has to swim up through.
    // Not the whole box — the top of it is above the ice, where the lid that
    // stops the penguin floating out of the level is supposed to be.
    const throat = {
      x: hole.x,
      y: hole.y + hole.h * 0.55,
      w: hole.w,
      h: hole.h * 0.45,
    };
    for (const t of def.terrain) {
      if (rectsOverlap(throat, t)) {
        bad(def, `${hole.x} nefes deliğinin boğazı kapalı`);
        break;
      }
    }
  }

  // 5. Hazards live in water, not inside the ice.
  for (const h of def.hazards) {
    const box = { x: h.x - (h.range ?? 0), y: h.y, w: h.w + (h.range ?? 0) * 2, h: h.h };
    for (const t of def.terrain) {
      if (rectsOverlap(box, t)) {
        bad(def, `${h.kind} buzun içinde: ${h.x},${h.y}`);
        break;
      }
    }
  }

  // 6. The way in and the way out are both breathable, and the way out is the
  //    end of the level rather than something in the middle of it.
  if (!def.air.length) bad(def, 'hiç nefes deliği yok');
  if (def.goal.x < def.worldW - 400) bad(def, 'çıkış bölümün sonunda değil');
  if (def.spawn.x > 400) bad(def, 'giriş bölümün başında değil');

  // 7. Fish are in water the swimmer can reach.
  for (const f of [...def.fish, ...def.speedFish]) {
    const box = { x: f.x, y: f.y, w: 22, h: 18 };
    if (def.terrain.some((t) => rectsOverlap(box, t))) {
      bad(def, `balık buzun içinde: ${f.x},${f.y}`);
    }
  }
}

const scale = DIVE_LEVELS[DIVE_LEVELS.length - 1].scale;
console.log(`Bölüm sayısı        : ${DIVE_LEVELS.length} (${DIVE_LEVELS[0].id}–${DIVE_LEVELS[DIVE_LEVELS.length - 1].id})`);
console.log(`Geçit               : ${slots} · en dar ${tightest}px`);
console.log(`Nefes deliği        : ${holes}`);
console.log(`Bir ciğer           : ${breathFor(scale).toFixed(1)} sn · ${Math.round(breathRange(scale))}px`);
console.log(`En uzun nefessiz yol: ${Math.round(longestSwim)}px`);
console.log(`Dalış / yükseliş    : ${SWIM.sinkMax} / ${SWIM.riseMax} px/sn`);

if (fails) {
  console.log(`\n✗ ${fails} sorun.`);
  process.exit(1);
}
console.log('\n✓ Bütün dalışlar geçilebilir.');
