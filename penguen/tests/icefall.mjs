/**
 * Buz düşmesi — the arena's first threat that cover cannot answer.
 *
 * Chapter four had six verbs for fifteen levels, the thinnest vocabulary in
 * the game, and every one of them was the same question: *where can you stand
 * so that nothing has a line on you*. A pillar answers it, a bank puts a clock
 * on the answer, a lobber goes over it — but that is one argument about
 * horizontal sight-lines, which is why fifteen levels built out of it read as
 * one level.
 *
 * Ice comes from above, so no wall stands between it and you, and it is
 * *reactive*: it hangs there until somebody is underneath. That makes it a
 * statement about the spot rather than the shot — the safest square on the
 * level is the one you must not stand on.
 *
 * It is the shelf's icicle, unchanged. What this pack proves is not that the
 * entity works — `validate-levels` has covered that for thirty-one levels —
 * but the two things that are new here and were both wrong first time: that it
 * hangs somewhere a player can *see*, and that it actually falls.
 */

import { World } from '../src/game/world.js';
import { ALL_LEVELS } from '../src/game/chapters.js';

const STEP = 1 / 120;
const deps = () => ({
  particles: { puff() {}, splash() {}, sparkle() {}, burstIce() {} },
  audio: new Proxy({}, { get: () => () => {} }),
  assist: false,
  upgrades: {},
  skin: 'normal',
});

let fails = 0;
const check = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) fails++;
};

const arenas = ALL_LEVELS.filter((d) => (d.hazards ?? []).some((h) => h.kind === 'icicle') && d.id >= 62);

console.log('Arenada buz düşmesi\n');

console.log('1) Arenalarda var');
check(arenas.length >= 3, `${arenas.length} arenada buz asılı`);

console.log('\n2) Görülebilecek bir yerde asılı');
for (const def of arenas) {
  for (const h of def.hazards.filter((x) => x.kind === 'icicle')) {
    /*
     * The first version read `groundY - height`, which is the top of the
     * *world* rather than the top of the room: on a standard arena that is
     * y = -102, so the ice hung off the top of the screen and the warning it
     * gives — the entire reason it is fair — could not be seen until it was
     * already falling.
     */
    const inside = h.y > 0 && h.y + h.h < def.worldH;
    check(inside, `${def.id}. ${def.name}: buz y ${h.y} (dünya 0..${def.worldH})`);
    /*
     * Not "above every perch". That was the first rule here and it is the
     * wrong one: an arena is allowed a perch higher than its ceiling ice, and
     * demanding otherwise failed two levels that were perfectly fine. What
     * actually matters is that it hangs *clear* — high enough over the floor
     * that a standing penguin is underneath it rather than inside it, and not
     * buried in a platform where nobody would ever see it.
     */
    const ground = Math.max(...(def.floes ?? []).map((f) => f.y));
    check(
      ground - (h.y + h.h) > 90,
      `${def.id}. ${def.name}: zeminden ${Math.round(ground - h.y - h.h)}px yukarıda`,
    );
    const buried = (def.floes ?? []).some(
      (f) => h.x < f.x + f.w && h.x + h.w > f.x && h.y < f.y + f.h && h.y + h.h > f.y,
    );
    check(!buried, `${def.id}. ${def.name}: bir platformun içine gömülü değil`);
  }
}

console.log('\n3) Gerçekten düşüyor, ve önce uyarıyor');
for (const def of arenas) {
  const w = new World(def, deps());
  const ice = w.hazards.filter((h) => h.kind === 'icicle');
  const seen = ice.map(() => new Set());
  // Walked back and forth so every hanging point gets somebody underneath it.
  for (let i = 0; i < 2400 && w.status === 'playing'; i++) {
    w.update(STEP, { axis: i % 600 < 350 ? 1 : -1 });
    ice.forEach((h, j) => seen[j].add(h.state));
  }
  ice.forEach((h, j) => {
    check(seen[j].has('drop'), `${def.id}. ${def.name}: ${j + 1}. buz düşüyor`);
    // The warning is what makes it fair: it must never go straight to falling.
    check(seen[j].has('warn'), `${def.id}. ${def.name}: ${j + 1}. buz önce uyarıyor`);
  });
}

console.log('\n4) Ve durduğu yer bir cevabın üstünde değil');
{
  /*
   * Level 71 taught this one. The icefall went over the middle of the arena
   * and the solver stopped being able to win: the middle *is* that level's
   * answer to all four doors, and hanging ice on the only answer is not
   * difficulty, it is a locked door. `brawl-run` is what caught it, and it is
   * what keeps catching it — this check only records the rule.
   */
  const { BRAWL_LEVELS } = await import('../src/game/brawl.js');
  check(BRAWL_LEVELS.length === 15, `${BRAWL_LEVELS.length} arena besteleniyor`);
  console.log('     (geçilebilirliğin kanıtı brawl-run: on beş arenayı da gerçek fizikle kazanıyor)');
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Tavan da bir şey söylüyor — ve söylediğini görebiliyorsun.');
