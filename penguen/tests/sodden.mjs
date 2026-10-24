/**
 * Islak buz — does the mountain's tenth verb actually cost anything?
 *
 * Chapter II had nine verbs and every one of them was about *shape*: how far
 * apart the holds are, which way the wall leans, whether there is anything to
 * hold at all. Its resource — the arm bar — was only ever spent by distance,
 * so the chapter's own sentence had been argued with in one dimension for
 * fifteen levels. This is the trench's argument moved to the mountain: a band
 * of wall that charges by the second.
 *
 * Two things have to be true and the second one is the one this project has
 * been bitten by. It has to bite — a mechanic that is declared, composed,
 * drawn and inert passes every other check in the repo. And it has to be
 * wired *everywhere*: when glare ice was added, three of the four places that
 * build a player's intent did not learn about it, so the solver's penguin
 * could grip a wall the player's penguin cannot and it declared two levels
 * climbable by a move nobody can make. A proof allowed to be stronger than the
 * game is not a proof of anything.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Player } from '../src/game/player.js';
import { Tower } from '../src/game/tower.js';
import { CLIMB_LEVELS } from '../src/game/climb.js';
import { CLIMB, SODDEN, sapAt } from '../src/game/config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (rel) => readFileSync(resolve(root, rel), 'utf8');
const STEP = 1 / 120;

let fails = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  console.log(`  ✗ ${m}`);
  fails++;
};
const check = (c, m) => (c ? ok(m) : bad(m));

console.log('Islak buz ısırıyor mu?\n');

console.log('1) Kol gücü gerçekten daha hızlı eriyor');
{
  /** Seconds of hanging before the bar empties, at this drain multiplier. */
  const hang = (sap, climbing) => {
    const p = new Player();
    p.boost = { jump: 0, speed: 0, grip: 0, wind: 0 };
    p.clinging = true;
    p.wallSide = 1;
    p.wallBlock = { x: -400, y: -4000, w: 40, h: 8000 };
    let t = 0;
    for (let i = 0; i < 4000 && p.stamina > 0; i++) {
      p.clinging = true;
      p.wallSide = 1;
      p.stamina -= (climbing ? CLIMB.drainClimb : CLIMB.drainHold) * STEP * sap;
      t += STEP;
    }
    return t;
  };
  const dry = hang(1, false);
  const wet = hang(SODDEN.sap, false);
  check(dry > 5, `kuru duvarda asılı kalma ${dry.toFixed(1)} sn`);
  check(
    Math.abs(dry / wet - SODDEN.sap) < 0.05,
    `ıslakta ${wet.toFixed(1)} sn — ${(dry / wet).toFixed(2)}× hızlı (hedef ${SODDEN.sap}×)`,
  );
  const dryUp = hang(1, true);
  const wetUp = hang(SODDEN.sap, true);
  check(wetUp < dryUp, `tırmanırken de ödeniyor: ${dryUp.toFixed(1)} → ${wetUp.toFixed(1)} sn`);
}

console.log('\n2) Duvarı yerinde bırakıyor');
{
  /* The whole difference from glare ice. A band that removed the wall would be
     verglas with extra steps, and the chapter already has verglas. */
  const t = new Tower({ scale: 1, effort: 0.9 });
  t.base({ w: 250 });
  t.chimney({ height: 260 });
  t.sodden({ side: 1, from: 0.5 });
  const z = t.zones.find((zz) => zz.kind === 'sodden');
  check(Boolean(z), 'bant kuruldu');
  const mid = { x: z.x + z.w / 2, y: (z.top + z.bottom) / 2 };
  check(sapAt(t.zones, mid.x, mid.y) > 1, `bandın içinde ${sapAt(t.zones, mid.x, mid.y)}× fiyat`);
  check(sapAt(t.zones, mid.x, z.top - 40) === 1, 'bandın üstünde normal');
  check(sapAt(t.zones, mid.x, z.bottom + 40) === 1, 'bandın altında normal');
  check(
    !t.zones.some((zz) => zz.kind === 'glaze'),
    'cam buz üretmiyor — tutunma dokunulmadan kalıyor',
  );
  // The other wall of the same shaft must never be touched.
  const shaft = t._lastShaft;
  const far = shaft.leftFace - 4;
  check(sapAt(t.zones, far, mid.y) === 1, 'karşı duvar etkilenmiyor');
}

console.log('\n3) Besteci ödeyemeyeceği bandı reddediyor');
{
  const build = (opts) => {
    const t = new Tower({ scale: 1, effort: 0.9 });
    t.base({ w: 250 });
    t.chimney({ height: 260 });
    t.sodden(opts);
    return t;
  };
  const refuses = (opts, why) => {
    try {
      build(opts);
      bad(`${why}: kabul edildi, reddedilmeliydi`);
    } catch (err) {
      ok(`${why}: "${err.message}"`);
    }
  };
  refuses({ side: 1, sap: SODDEN.max + 0.5 }, 'sınırın üstünde bir fiyat');
  refuses({ side: 1, len: 900 }, 'bacanın bütçesini aşan bir bant');
  refuses({ side: 1, len: 8 }, 'hissedilemeyecek kadar kısa bir bant');
  try {
    const t = new Tower({ scale: 1, effort: 0.9 });
    t.base({ w: 250 });
    t.sodden({ side: 1 });
    bad('bacasız bant: kabul edildi');
  } catch (err) {
    ok(`bacasız bant: "${err.message}"`);
  }
}

/*
 * The one that would have caught the glare-ice bug.
 *
 * Every place that assembles a player's intent has to know about every zone,
 * or one of the proofs quietly drives a different penguin than the game does.
 * Static, because the alternative is noticing years later that a solver has
 * been climbing walls the player cannot.
 */
console.log('\n4) Her yerden okunuyor');
{
  const places = [
    ['src/game/world.js', 'oyunun kendisi'],
    ['tests/climb-run.mjs', 'tırmanış çözücüsü'],
  ];
  for (const [file, label] of places) {
    const text = src(file);
    // Either `sap: sapAt(...)` or the shorthand `sap,` in the intent object.
    check(
      /sapAt\(/.test(text) && /\bsap[,:}]/.test(text),
      `${label} ıslak buzu okuyor (${file})`,
    );
  }
  check(/intent\.sap/.test(src('src/game/player.js')), 'fizik onu harcıyor');
  check(/'sodden'/.test(src('src/game/render.js')), 'çizim onu gösteriyor');
}

console.log('\n5) Yayındaki bantlar kendi sınırlarının içinde');
{
  let bands = 0;
  for (const def of CLIMB_LEVELS) {
    for (const z of def.zones ?? []) {
      if (z.kind !== 'sodden') continue;
      bands++;
      if ((z.sap ?? 0) > SODDEN.max) bad(`L${def.id}: ${z.sap}× sınırın üstünde`);
      if (z.bottom - z.top < 20) bad(`L${def.id}: bant ${z.bottom - z.top}px, hissedilmez`);
      if (!(z.w > 0)) bad(`L${def.id}: bandın genişliği yok`);
    }
  }
  check(bands > 0, `${bands} ıslak bant yayında`);
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Islak buz duvarı yerinde bırakıp zamanı fiyatlandırıyor — ve her katman aynı fiyatı görüyor.');
