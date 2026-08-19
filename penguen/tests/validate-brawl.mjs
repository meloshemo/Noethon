/**
 * Arena geometry, checked before anybody throws anything.
 *
 * `brawl-run.mjs` proves each arena can be won by playing it. This proves the
 * quieter half: that the level is *shaped* the way the chapter says it is, and
 * that the answer it ships with is a real answer rather than a note the
 * composer left itself. The line from the thrower's hand to the guard and on to
 * the marked patch of floor is re-walked here from the level data alone, with
 * no help from the composer that drew it.
 */

import { BRAWL_LEVELS } from '../src/game/brawl.js';
import { PENGUIN, BRAWL, PHYS, dodgeWindow } from '../src/game/config.js';

let fails = 0;
const bad = (def, msg) => {
  console.log(`  ✗ ${def.id}. ${def.name}: ${msg}`);
  fails++;
};

/** Does the straight run from a to b touch this box? */
function hits(a, b, box, r = BRAWL.radius) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const steps = Math.max(12, Math.ceil(Math.hypot(dx, dy) / 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = a.x + dx * t;
    const py = a.y + dy * t;
    if (
      px + r > box.x &&
      px - r < box.x + box.w &&
      py + r > box.y &&
      py - r < box.y + (box.h ?? 20)
    ) {
      return true;
    }
  }
  return false;
}

console.log('Kar topu arenaları doğrulanıyor...\n');

let duels = 0;
let rivals = 0;
let guards = 0;
let shortest = Infinity;
let longest = 0;

for (const def of BRAWL_LEVELS) {
  const scale = def.scale;
  const bodyH = PENGUIN.h * scale;
  const bodyW = PENGUIN.w * scale;
  const solids = [...def.floes, ...def.terrain];
  rivals += def.rivals.length;
  const guardList = def.rivals.filter((r) => r.guard);
  guards += guardList.length;

  if (!guardList.length) bad(def, 'kapıyı tutan kimse yok — arena kilitlenmiyor');
  if (def.rivals.length === guardList.length) bad(def, 'atıcı yok: kapıdakiler devrilemez');

  // 1. Every guard has a plan entry. A guard nobody can reach is a locked exit
  //    with a story attached, and it is the one way this chapter can ship a
  //    level that literally cannot be finished.
  for (const g of guardList) {
    const i = def.rivals.indexOf(g);
    if (!def.plan.some((p) => p.guard === i)) {
      bad(def, `${Math.round(g.x)},${Math.round(g.y)} kapıdakinin çözümü yok`);
    }
  }

  for (const p of def.plan) {
    duels++;
    const guard = def.rivals[p.guard];
    const shooter = def.rivals[p.shooter];
    if (!guard?.guard) bad(def, 'çözüm kapıcı olmayan birini hedefliyor');
    if (shooter?.guard) bad(def, 'çözümde atıcı olarak bir kapıcı kullanılmış');
    if (!guard || !shooter) continue;

    const hand = { x: shooter.x + shooter.w / 2, y: shooter.y + shooter.h * 0.34 };
    const target = { x: guard.x + guard.w / 2, y: guard.y + guard.h / 2 };
    const stand = { x: p.stand.x, y: def.floes[0].y - bodyH / 2 };

    // 2. The shot reaches the guard, and carries on to where the player is
    //    told to stand. Both halves, because a ball that bursts on a ledge
    //    between the two is a shot the player aimed perfectly and lost.
    for (const f of solids) {
      if (hits(hand, target, f)) {
        bad(def, `atıcıdan kapıdakine hat kapalı (${Math.round(hand.x)}→${Math.round(target.x)})`);
        break;
      }
    }
    for (const f of solids) {
      if (hits(target, stand, f)) {
        bad(def, `kapıdakinden durulacak yere hat kapalı (${Math.round(target.x)}→${stand.x})`);
        break;
      }
    }

    // 3. The guard is genuinely between the two, not merely near the line.
    const dx = stand.x - hand.x;
    const dy = stand.y - hand.y;
    const len = Math.hypot(dx, dy) || 1;
    const t = ((target.x - hand.x) * dx + (target.y - hand.y) * dy) / (len * len);
    if (t <= 0.02 || t >= 0.98) bad(def, 'kapıdaki atışın üstünde değil');
    const px = hand.x + dx * t;
    const py = hand.y + dy * t;
    const off = Math.hypot(target.x - px, target.y - py);
    if (off > guard.w * BRAWL.hitFrac) {
      bad(def, `atış kapıdakinin ${Math.round(off)}px yanından geçiyor`);
    }

    // 4. The thrower can see that far, and the player can get off the line.
    if (len > BRAWL.range) bad(def, `atış menzil dışında: ${Math.round(len)}px`);
    const window = dodgeWindow(len);
    if (PHYS.moveSpeed * window < bodyW * 2.4) {
      bad(def, `kaçmaya vakit yok: ${window.toFixed(2)} sn`);
    }
    shortest = Math.min(shortest, len);
    longest = Math.max(longest, len);

    // 5. The stand-spot is on the floor, inside the arena, and walkable to.
    if (p.stand.x < 40 || p.stand.x > def.worldW - 40) {
      bad(def, `durulacak yer arenanın dışında: ${p.stand.x}`);
    }
    const floor = def.floes[0];
    if (p.stand.x < floor.x + bodyW || p.stand.x > floor.x + floor.w - bodyW) {
      bad(def, `durulacak yer zeminin dışında: ${p.stand.x}`);
    }
    // Nothing standing on the floor in the way of walking there.
    for (const t2 of def.terrain) {
      if (t2.y + t2.h > floor.y - bodyH * 1.1 && t2.y < floor.y) {
        bad(def, `zeminde yürümeyi kesen kaya: ${t2.x}`);
      }
    }
  }

  // 6. Rivals stand on something, and it is a perch rather than a shelf.
  for (const r of def.rivals) {
    const under = def.floes.find(
      (f) =>
        Math.abs(f.y - (r.y + r.h)) < 3 && r.x + r.w > f.x - 2 && r.x < f.x + f.w + 2,
    );
    if (!under) bad(def, `havada duran rakip: ${Math.round(r.x)},${Math.round(r.y)}`);
  }

  // 7. The way out exists and is past the start.
  if (!def.goal || def.goal.x < def.spawn.x + 200) bad(def, 'çıkış başlangıca çok yakın');
}

console.log(`Arena sayısı        : ${BRAWL_LEVELS.length} (${BRAWL_LEVELS[0].id}–${BRAWL_LEVELS[BRAWL_LEVELS.length - 1].id})`);
console.log(`Rakip penguen       : ${rivals} · ${guards} tanesi kapıda`);
console.log(`Düello              : ${duels}`);
console.log(`Atış mesafesi       : ${Math.round(shortest)}–${Math.round(longest)}px`);
console.log(`Kaçış payı          : ${dodgeWindow(longest).toFixed(2)} sn (en uzun atışta)`);
console.log(`Kar topu hızı       : ${BRAWL.speed} px/sn · nişan kilidi ${BRAWL.windup} sn`);

if (fails) {
  console.log(`\n✗ ${fails} sorun.`);
  process.exit(1);
}
console.log('\n✓ Bütün arenalarda temiz bir çözüm var.');
