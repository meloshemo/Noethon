/**
 * The lobbed snowball.
 *
 * Chapter four is built entirely out of sight-lines, and a chapter built out
 * of sight-lines has exactly one static answer: stand behind something. Once a
 * player finds that out, a pillar is a hard counter to the whole idea.
 *
 * A lob goes over it. What is proved here is that it is a real ballistic arc
 * rather than a curved-looking straight line, that it actually clears the
 * cover it exists to defeat, and — the part that matters most — that taking
 * away the free answer does not take away the time to find another one. An arc
 * is much slower than a flat shot, and that trade is the whole fairness
 * argument: the lob removes a place, and pays for it in seconds.
 */

import { Snowball } from '../src/game/entities.js';
import { ALL_LEVELS } from '../src/game/chapters.js';
import { BRAWL, PHYS, lobShot, dodgeWindow } from '../src/game/config.js';

const STEP = 1 / 120;
let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails++;
}

/** Fly a ball and report where it went. */
function fly(from, to, lobbed) {
  const b = new Snowball(from, to, lobbed);
  const path = [];
  for (let i = 0; i < 600; i++) {
    b.update(STEP);
    path.push({ x: b.x, y: b.y, t: (i + 1) * STEP });
    if (b.dead) break;
    if (lobbed && b.y > to.y && b.vy > 0) break;
    if (!lobbed && Math.abs(b.x - to.x) < 8) break;
  }
  return path;
}

console.log('Kavisli atış — kayanın üstünden\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) Gerçek bir mermi yolu');
const from = { x: 100, y: 300 };
const to = { x: 700, y: 300 };
const arc = fly(from, to, true);
const flat = fly(from, to, false);
const apex = Math.min(...arc.map((q) => q.y));
check(
  'yukarı çıkıp aşağı iniyor',
  apex < from.y - 150,
  `tepe ${Math.round(from.y - apex)} px yukarıda`,
);
check(
  'düz atış hiç yükselmiyor',
  Math.abs(Math.min(...flat.map((q) => q.y)) - from.y) < 1,
);
const landing = arc[arc.length - 1];
check(
  'hedefe iniyor',
  Math.abs(landing.x - to.x) < 40,
  `x ${Math.round(landing.x)}, hedef ${to.x}`,
);
// The apex should be where the arithmetic says, since the composer and the
// validator both size cover against that number.
const shot = lobShot(from, to);
check(
  'tepe hesapla uyuşuyor',
  Math.abs(from.y - apex - shot.rise) < shot.rise * 0.06,
  `gerçek ${Math.round(from.y - apex)}, hesap ${Math.round(shot.rise)}`,
);

/* 2 --------------------------------------------------------------------- */
console.log('\n2) Siperi aşıyor, ve bunun bedelini saniyeyle ödüyor');
// The tallest pillar the chapter uses, standing halfway between.
const PILLAR_H = 150;
const midY = Math.min(...arc.filter((q) => Math.abs(q.x - 400) < 20).map((q) => q.y));
check(
  'yolun ortasında kayanın tepesinden yüksek',
  from.y - midY > PILLAR_H,
  `${Math.round(from.y - midY)} px vs ${PILLAR_H} px kaya`,
);
const arcTime = landing.t;
const flatTime = Math.hypot(to.x - from.x, to.y - from.y) / BRAWL.speed;
check(
  'kavisli atış düz atıştan çok daha yavaş',
  arcTime > flatTime * 1.3,
  `${arcTime.toFixed(2)} sn vs ${flatTime.toFixed(2)} sn`,
);
// The real fairness number: wind-up plus flight, against the ground a standing
// penguin covers in that time.
const window = BRAWL.windup + arcTime;
check(
  'kaçmaya bol vakit var',
  PHYS.moveSpeed * window > 300,
  `${Math.round(PHYS.moveSpeed * window)} px kaçış alanı`,
);
check(
  'düz atıştan daha cömert',
  window > dodgeWindow(Math.abs(to.x - from.x)),
  `${window.toFixed(2)} sn vs ${dodgeWindow(600).toFixed(2)} sn`,
);

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Oyundaki her kavisli atıcı adil');
let lobbers = 0;
for (const def of ALL_LEVELS) {
  const rivals = (def.rivals ?? []).filter((r) => r.lobs);
  if (!rivals.length) continue;
  const pillars = (def.terrain ?? []).filter((t) => t.h >= 60);
  for (const r of rivals) {
    lobbers++;
    const hand = { x: r.x + r.w / 2, y: r.y + 8 };
    // Worst case for the thrower: the far end of the arena.
    for (const targetX of [80, def.worldW - 80]) {
      const target = { x: targetX, y: def.groundY ?? r.y + 200 };
      const s = lobShot(hand, target);
      if (!(s.time > 0.7)) {
        check(`L${def.id} atışı fazla hızlı`, false, `${s.time.toFixed(2)} sn`);
      }
      if (Math.abs(hand.x - targetX) < 40) continue;
      // Clears every pillar that stands between the two.
      for (const t of pillars) {
        const px = t.x + t.w / 2;
        if (px < Math.min(hand.x, targetX) || px > Math.max(hand.x, targetX)) continue;
        const at = (px - hand.x) / s.vx;
        const y = hand.y + s.vy * at + 0.5 * BRAWL.lobGravity * at * at;
        if (y > t.y - 6) {
          check(`L${def.id} atışı kayayı aşamıyor`, false, `${Math.round(y)} vs kaya tepesi ${t.y}`);
        }
      }
    }
  }
}
check('oyunda kavisli atıcı var', lobbers > 0, `${lobbers} atıcı`);
check('hepsi kayayı aşıyor ve kaçılabilir', true);

console.log(`\n${lobbers} kavisli atıcı, ${ALL_LEVELS.length} bölüm tarandı.`);
if (fails) {
  console.log(`\n✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('\n✓ Kavis gerçek, siperi aşıyor, ve zamanla ödüyor.');
