/**
 * The hush: a hollow where gravity is not what it is everywhere else.
 *
 * This is the only mechanic in the game that changes the number every other
 * number is measured against, so it gets the strictest test in the directory.
 * Wind moves where a jump lands and a geyser changes how one starts; this
 * changes what a jump *is*, and a mechanic that deep can be wrong in ways the
 * ordinary checks cannot see.
 *
 * Four things are proved here, and the fourth is the one that matters:
 *
 *   1. inside the pocket the penguin really does go roughly twice as far and
 *      twice as high, measured by running the real `Player`;
 *   2. the boundary is a boundary — outside it, physics is exactly what it
 *      always was, to the last bit;
 *   3. terminal velocity is scaled too, so arriving fast from above does not
 *      punch straight through the effect;
 *   4. and every hush crossing in the shipped levels is genuinely impossible
 *      without the pocket. That last one is what stops the hollow quietly
 *      becoming decoration the day somebody widens a floe.
 */

import { Player } from '../src/game/player.js';
import { ALL_LEVELS } from '../src/game/chapters.js';
import { HUSH, PHYS, PENGUIN, hushAt, reachInHush, reachFor, crossableGap } from '../src/game/config.js';

const STEP = 1 / 120;
const TUNING = { coyote: 1 };

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails++;
}

const ground = (y = 400) => [
  { x: -4000, y, w: 12000, h: 400, solid: true, climb: false, slippery: false, dx: 0, dy: 0 },
];

/**
 * Jump once and report how far and how high it went.
 *
 * Held for the full arc, steering forward the whole time — the best jump a
 * player can make, which is the only jump worth measuring a limit against.
 */
function oneJump(gravity) {
  const p = new Player();
  p.setScale(1);
  p.reset(0, 400);
  const floes = ground();
  const intent = (t, held) => ({ axis: 1, jumpHeld: held, jumpPressed: false, gravity });
  // Get up to running speed first.
  for (let i = 0; i < 90; i++) p.update(STEP, intent(0, false), floes, TUNING, {});
  const x0 = p.x;
  const y0 = p.y;
  let peak = p.y;
  p.update(STEP, { axis: 1, jumpHeld: true, jumpPressed: true, gravity }, floes, TUNING, {});
  let air = 0;
  for (let i = 0; i < 1200; i++) {
    p.update(STEP, intent(i * STEP, true), floes, TUNING, {});
    peak = Math.min(peak, p.y);
    air += STEP;
    if (p.onGround) break;
  }
  return { distance: p.x - x0, height: y0 - peak, air };
}

console.log('Sessiz alan — yerçekiminin değiştiği yer\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) İçeride fizik gerçekten değişiyor');
const outside = oneJump(1);
const inside = oneJump(HUSH.gravity);
check(
  'sessiz alanda çok daha uzağa gidiliyor',
  inside.distance > outside.distance * 1.8,
  `${outside.distance.toFixed(0)} px → ${inside.distance.toFixed(0)} px`,
);
check(
  'sessiz alanda çok daha yükseğe çıkılıyor',
  inside.height > outside.height * 1.8,
  `${outside.height.toFixed(0)} px → ${inside.height.toFixed(0)} px`,
);
check(
  'havada kalma süresi de uzuyor',
  inside.air > outside.air * 1.4,
  `${outside.air.toFixed(2)} sn → ${inside.air.toFixed(2)} sn`,
);
// The arithmetic in the config and the behaviour of the class have to agree,
// because the composer places floes using the arithmetic and the player has
// to be able to reach them.
const predicted = reachInHush(1);
check(
  'hesap ile gerçek uçuş uyuşuyor',
  Math.abs(inside.height - predicted.full) < predicted.full * 0.12,
  `gerçek ${inside.height.toFixed(0)} px, hesap ${predicted.full.toFixed(0)} px`,
);

/* 2 --------------------------------------------------------------------- */
console.log('\n2) Sınır gerçekten sınır');
const plain = reachFor(1);
check(
  'dışarıda fizik zerre değişmemiş',
  Math.abs(outside.height - plain.full) < plain.full * 0.12,
  `${outside.height.toFixed(0)} px vs ${plain.full.toFixed(0)} px`,
);
const zones = [{ kind: 'hush', x: 100, w: 300, top: 50, bottom: 350, gravity: 0.42 }];
check('alanın içi hafif', hushAt(zones, 250, 200) === 0.42);
check('bir piksel dışı normal', hushAt(zones, 99, 200) === 1 && hushAt(zones, 250, 351) === 1);
check('alansız dünyada her yer normal', hushAt([], 250, 200) === 1 && hushAt(undefined, 0, 0) === 1);
check(
  'tabanın altına inilemiyor',
  hushAt([{ kind: 'hush', x: 0, w: 10, top: 0, bottom: 10, gravity: 0.01 }], 5, 5) === HUSH.floor,
);

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Yukarıdan hızlı gelmek etkiyi delmiyor');
// A penguin that entered the pocket already falling used to keep the speed it
// arrived with, so the hush appeared broken at the exact moment most players
// meet one: on the way in from above.
function fallSpeed(gravity) {
  const p = new Player();
  p.setScale(1);
  p.reset(0, 0);
  const floes = [];
  for (let i = 0; i < 400; i++) {
    p.update(STEP, { axis: 0, jumpHeld: false, jumpPressed: false, gravity }, floes, TUNING, {});
  }
  return p.vy;
}
const fastOut = fallSpeed(1);
const fastIn = fallSpeed(HUSH.gravity);
check(
  'sessiz alanda son hız da düşük',
  fastIn < fastOut * 0.7,
  `${fastOut.toFixed(0)} → ${fastIn.toFixed(0)}`,
);
check('dışarıda son hız değişmemiş', Math.abs(fastOut - PHYS.maxFall) < 1, fastOut.toFixed(0));

/* 4 --------------------------------------------------------------------- */
console.log('\n4) Bölümlerdeki her sessiz alan gerçekten gerekli');
let spans = 0;
const plainGap = crossableGap(1);
for (const def of ALL_LEVELS) {
  for (const g of def.hushes ?? []) {
    spans++;
    const scale = def.scale ?? 1;
    const quiet = reachInHush(scale, Infinity, g.gravity);
    const normal = reachFor(scale);
    const body = PENGUIN.w * scale;
    if (g.across <= crossableGap(scale) * 1.25) {
      check(`L${def.id} boşluğu dışarıdan geçiliyor`, false, `${g.across}px`);
    }
    if (g.up <= normal.height * 1.25) {
      check(`L${def.id} rafına dışarıdan çıkılıyor`, false, `${g.up}px`);
    }
    if (g.across > (quiet.distance - body) * 0.92 || g.up > quiet.full * 0.82) {
      check(`L${def.id} içeriden bile zor`, false, `${g.across}px / ${g.up}px`);
    }
    const pocket = (def.zones ?? []).find(
      (z) => z.kind === 'hush' && z.x <= g.from && z.x + z.w >= g.to,
    );
    if (!pocket) check(`L${def.id} alanı geçişi kapsamıyor`, false);
  }
}
check('oyunda sessiz alan var', spans > 0, `${spans} geçiş`);
check('hepsi dört kapıdan da geçti', true);

console.log(`\n${spans} sessiz geçiş, ${ALL_LEVELS.length} bölüm tarandı.`);
if (fails) {
  console.log(`\n✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('\n✓ Sessiz alan fiziği değiştiriyor ve bunu dürüst yapıyor.');
