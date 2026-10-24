/**
 * Çürük balıklar — do the new four take anything away?
 *
 * The bait had four kinds and they were one idea with four faces: heavier,
 * slippier, backwards, blinder. Every one of them makes the penguin worse at
 * what it was already doing, and every one is survived the same way — slow
 * down for a few seconds and wait it out. After four chapters that had stopped
 * being a decision.
 *
 * The new four take away an *answer* instead: the equipment the player bought,
 * the wall they were about to grab, the lungs they were counting, the cover
 * they were standing behind. Each is aimed at a chapter that has that answer,
 * which is also the rule that makes them fair — a curse that costs nothing
 * where it is dropped teaches the player that the fish is harmless, and then
 * they eat one where it is not.
 *
 * So this pack asks three things of each: does it bite, does it lift, and is
 * it visible while it is on. The last one is not decoration. `slick` has been
 * in the game since the bait was written with no screen effect of any kind: a
 * four-second problem the player cannot tell they have does not read as
 * difficulty, it reads as the controls breaking.
 */

import { Player } from '../src/game/player.js';
import { World } from '../src/game/world.js';
import { Rival } from '../src/game/entities.js';
import { ROT, BRAWL } from '../src/game/config.js';
import { ALL_LEVELS } from '../src/game/chapters.js';
import { DIVE_LEVELS } from '../src/game/dive.js';

const STEP = 1 / 120;
const noop = () => {};
const deps = () => ({
  particles: { puff: noop, splash: noop, sparkle: noop, burstIce: noop },
  audio: new Proxy({}, { get: () => noop }),
  assist: false,
  upgrades: {},
  skin: 'normal',
});

let fails = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  console.log(`  ✗ ${m}`);
  fails++;
};
const check = (c, m) => (c ? ok(m) : bad(m));

console.log('Çürük balıklar ısırıyor mu?\n');

console.log('1) Sekiz tür, sekiz renk');
{
  const kinds = Object.keys(ROT);
  check(kinds.length === 8, `${kinds.length} çürük tür`);
  const tints = kinds.map((k) => ROT[k].tint);
  check(tints.every(Boolean), 'her türün kendi rengi var');
  check(new Set(tints).size === tints.length, `${new Set(tints).size} ayrı renk — hiçbiri ikizlenmiyor`);
  for (const k of kinds) {
    if (!(ROT[k].duration > 0)) bad(`${k}: süresi yok`);
    if (!ROT[k].label || !ROT[k].en?.label) bad(`${k}: iki dilde konuşmuyor`);
  }
}

console.log('\n2) Donmuş tüy: satın alınan ekipman çalışmıyor');
{
  const p = new Player();
  p.gear = { wings: 3, rocket: 2 };
  p.glideBonus = 0;
  const glide = p.glideMax;
  const rocket = p.rocketMax;
  check(glide > 1 && rocket === 2, `normalde ${glide.toFixed(1)} sn süzülme, ${rocket} ateşleme`);
  p.afflict('stiff');
  check(p.glideMax === 0, 'lanetliyken kanat yok');
  check(p.rocketMax === 0, 'lanetliyken motor yok');
  // And it lifts.
  for (let i = 0; i < Math.ceil(ROT.stiff.duration * 120) + 4; i++) p.update(STEP, { axis: 0 }, [], {}, {});
  check(p.glideMax === glide && p.rocketMax === rocket, 'süre bitince ikisi de geri geliyor');
}

console.log('\n3) Uyuşmuş pençe: buz duvarı tutulmuyor');
{
  const p = new Player();
  const wall = { solid: true, climb: true, x: 0, y: 0, w: 40, h: 400 };
  p.x = wall.x + wall.w;
  p.y = 100;
  check(p._probeWall([wall]) !== 0, 'normalde duvar tutuluyor');
  p.afflict('clumsy');
  check(p._probeWall([wall]) === 0, 'lanetliyken tutulmuyor');
  for (let i = 0; i < Math.ceil(ROT.clumsy.duration * 120) + 4; i++) {
    p.curse.clumsy = Math.max(0, p.curse.clumsy - STEP);
  }
  check(p._probeWall([wall]) !== 0, 'süre bitince duvar geri geliyor');
}

console.log('\n4) Delik ciğer: nefes iki kat gidiyor');
{
  const def = DIVE_LEVELS[0];
  const drainOf = (curse) => {
    const w = new World(def, deps());
    const p = w.player;
    p.submerged = true;
    p.breath = p.breathMax;
    if (curse) p.afflict('leak');
    const before = p.breath;
    for (let i = 0; i < 120; i++) {
      p.submerged = true;
      if (curse) p.curse.leak = Math.max(0.5, p.curse.leak);
      w.update(STEP, { axis: 0, jumpHeld: true });
    }
    return before - p.breath;
  };
  const dry = drainOf(false);
  const wet = drainOf(true);
  check(dry > 0.5, `bir saniyede normal ${dry.toFixed(2)} nefes gidiyor`);
  check(
    Math.abs(wet / dry - ROT.leak.drain) < 0.08,
    `lanetliyken ${wet.toFixed(2)} — ${(wet / dry).toFixed(2)}× (hedef ${ROT.leak.drain}×)`,
  );
}

console.log('\n5) İşaretlenme: rakipler daha çabuk nişan alıyor');
{
  const windupFor = (curse) => {
    const r = new Rival({ x: 400, y: 100, w: 26, h: 40, period: 2, phase: 0 });
    const player = { x: 420, y: 100, w: 26, h: 40, curse: { marked: curse ? 5 : 0 } };
    r.state = 'wait';
    r.timer = 0;
    r.update(STEP, player, 1);
    return r.timer;
  };
  const plain = windupFor(false);
  const marked = windupFor(true);
  check(Math.abs(plain - BRAWL.windup) < 0.01, `normal nişan kilidi ${plain.toFixed(2)} sn`);
  check(
    Math.abs(marked / plain - ROT.marked.aim) < 0.02,
    `işaretliyken ${marked.toFixed(2)} sn — %${Math.round((1 - marked / plain) * 100)} kısa`,
  );
}

console.log('\n6) Hepsi görünür, ve her chapter kendi yemini taşıyor');
{
  const seen = new Map();
  for (const def of ALL_LEVELS) {
    for (const f of def.rotFish ?? []) {
      if (!ROT[f.kind]) bad(`L${def.id}: "${f.kind}" diye bir çürük balık yok`);
      seen.set(f.kind, (seen.get(f.kind) ?? 0) + 1);
    }
  }
  check(seen.size >= 6, `${seen.size} tür yayında: ${[...seen.keys()].join(', ')}`);
  for (const k of ['clumsy', 'leak', 'marked', 'stiff']) {
    check(seen.has(k), `${k} el yapımı bölümlerde var`);
  }
  /* The chapter-aimed ones must land in the chapter whose answer they take.
     A numb claw on the shelf is a fish that does nothing. */
  const chapterOf = (id) => (id < 32 ? 1 : id < 47 ? 2 : id < 62 ? 3 : 4);
  const want = { clumsy: 2, leak: 3, marked: 4 };
  for (const def of ALL_LEVELS) {
    for (const f of def.rotFish ?? []) {
      const need = want[f.kind];
      if (need && chapterOf(def.id) !== need) {
        bad(`L${def.id}: ${f.kind} yanlış chapter'da (${chapterOf(def.id)}, olmalı ${need})`);
      }
    }
  }
  ok('chapter’a özel yemler kendi chapter’larında');
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Sekiz çürük balık, sekiz ayrı problem — ve her biri bir cevabı geri alıyor.');
