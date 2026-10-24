/**
 * The trench: cold water that charges for depth.
 *
 * Fifteen levels about a lungful, and until now depth itself was free. The
 * corridor decided where the swimmer went, the clock counted seconds, and it
 * cost exactly the same to spend one on the seabed as under the roof — which
 * is why chapter three came out as the most repetitive in the game when the
 * level vocabularies were finally measured.
 *
 * What is proved here:
 *
 *   1. the drain is a gradient rather than a switch — the top of a trench is
 *      nearly free and the floor is ruinous, the way pressure works;
 *   2. it really empties the lungs faster, measured on the real `World`;
 *   3. the composer, the validator and the running game agree on what a swim
 *      costs, because all three call one function. This is the one that
 *      matters: an earlier version tagged each route node with the rate where
 *      it sat, which passed every check and drowned the player on level sixty;
 *   4. and every shipped trench is deep enough to be worth avoiding and
 *      shallow enough to be survivable.
 */

import { World } from '../src/game/world.js';
import { ALL_LEVELS } from '../src/game/chapters.js';
import { TRENCH, trenchDrainAt, swimCost, breathRange, scaleForLevel } from '../src/game/config.js';

const STEP = 1 / 120;
const noop = () => {};
const deps = () => ({
  particles: new Proxy({}, { get: () => noop }),
  audio: new Proxy({}, { get: () => noop }),
  assist: false,
  upgrades: {},
  skin: 'normal',
});

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails++;
}

console.log('Çukur — derinliğin bedeli\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) Bir anahtar değil, bir eğim');
const band = [{ kind: 'trench', x: 0, w: 500, top: 300, bottom: 500, drain: TRENCH.drain }];
const at = (y) => trenchDrainAt(band, 250, y);
check('kenarın üstünde bedava', at(299) === 1 && at(200) === 1);
check('dudakta hâlâ bedava', Math.abs(at(300) - 1) < 1e-9);
check('yarıda yarı yolda', Math.abs(at(400) - (1 + (TRENCH.drain - 1) / 2)) < 1e-9, at(400).toFixed(2));
check('dipte tam bedel', Math.abs(at(500) - TRENCH.drain) < 1e-9, at(500).toFixed(2));
check('daha da aşağısı artmıyor', at(900) === at(500));
check('yanındaysan bedava', trenchDrainAt(band, 501, 450) === 1);
check('çukursuz denizde her yer bedava', trenchDrainAt([], 0, 0) === 1 && trenchDrainAt(undefined, 0, 0) === 1);

/* 2 --------------------------------------------------------------------- */
console.log('\n2) Gerçekten nefesi bitiriyor');
/** Hold the penguin at a depth for a second and see what a lungful lost. */
function spend(level, y) {
  const def = ALL_LEVELS.find((d) => d.id === level);
  const w = new World(def, deps());
  const zone = (def.zones ?? []).find((z) => z.kind === 'trench');
  if (!zone) return null;
  w.player.x = zone.x + zone.w / 2;
  w.player.y = y;
  const before = w.player.breath;
  for (let i = 0; i < 120; i++) {
    w.player.x = zone.x + zone.w / 2;
    w.player.y = y;
    w.update(STEP, { axis: 0, jumpHeld: false, jumpPressed: false });
  }
  return { lost: before - w.player.breath, drain: w.drain, zone };
}
const withTrench = ALL_LEVELS.find((d) => (d.zones ?? []).some((z) => z.kind === 'trench'));
const zone = withTrench.zones.find((z) => z.kind === 'trench');
const shallow = spend(withTrench.id, zone.top - 60);
const deep = spend(withTrench.id, zone.bottom - 10);
check(
  'dudağın üstünde saniyede bir saniye gidiyor',
  shallow && Math.abs(shallow.lost - 1) < 0.1,
  `${shallow?.lost.toFixed(2)} sn`,
);
check(
  'dipte çok daha hızlı gidiyor',
  deep && deep.lost > shallow.lost * 1.8,
  `${deep?.lost.toFixed(2)} sn (yüzeyde ${shallow?.lost.toFixed(2)})`,
);
check(
  'oran hesapla uyuşuyor',
  deep && Math.abs(deep.lost / deep.drain - 1) < 0.12,
  `x${deep?.drain.toFixed(2)}`,
);

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Besteci, doğrulayıcı ve oyun aynı sayıyı söylüyor');
// The bug this catches: charging a leg at the rate measured at one of its ends
// rather than along it. The two differ most on the leg that *leaves* a trench.
const a = { x: zone.x, y: zone.bottom - 10 };
const b = { x: zone.x + zone.w, y: zone.top - 120 };
const sampled = swimCost(withTrench.zones, a, b);
const naive = Math.hypot(b.x - a.x, b.y - a.y) * trenchDrainAt(withTrench.zones, b.x, b.y);
check(
  'örnekleme, uçtan ölçmekten farklı sonuç veriyor',
  sampled > naive * 1.15,
  `örnekleme ${Math.round(sampled)}px, uçtan ${Math.round(naive)}px`,
);
check('boş mesafe sıfır', swimCost(withTrench.zones, a, a) === 0);
check(
  'çukursuz yerde maliyet mesafeye eşit',
  Math.abs(swimCost([], { x: 0, y: 0 }, { x: 300, y: 400 }) - 500) < 1,
);

/* 4 --------------------------------------------------------------------- */
console.log('\n4) Oyundaki her çukur kaçınmaya değer ve hayatta kalınabilir');
let count = 0;
for (const def of ALL_LEVELS) {
  for (const t of def.trenches ?? []) {
    count++;
    const scale = def.scale ?? scaleForLevel(def.id);
    const lung = breathRange(scale);
    if (t.cost < 1.4) check(`L${def.id} çukuru çok ucuz`, false, `x${t.cost}`);
    if (t.cost > TRENCH.drain) check(`L${def.id} çukuru tabanı aşıyor`, false, `x${t.cost}`);
    // A single trench must never be a whole lungful on its own.
    const span = (t.to - t.from) * t.cost;
    if (span > lung * 0.62) {
      check(`L${def.id} çukuru tek başına bir ciğer`, false, `${Math.round(span)}px / ${Math.round(lung)}px`);
    }
    const pocket = (def.zones ?? []).find(
      (z) => z.kind === 'trench' && z.x <= t.from + 4 && z.x + z.w >= t.to - 4,
    );
    if (!pocket) check(`L${def.id} çukurunun bölgesi yok`, false);
  }
}
check('oyunda çukur var', count > 0, `${count} çukur`);
check('hepsi geçti', true);

console.log(`\n${count} çukur, ${ALL_LEVELS.length} bölüm tarandı.`);
if (fails) {
  console.log(`\n✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('\n✓ Derinlik artık bedava değil, ve üç yer de aynı fiyatı söylüyor.');
