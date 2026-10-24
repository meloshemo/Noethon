/**
 * Can the wardrobe actually be earned?
 *
 * Twenty-four penguins hung in this cupboard and not one of them could be
 * unlocked by climbing, diving or standing in the snow. That was not a design
 * decision; it was an accident nobody could see, because every individual
 * piece looked fine. The mountain counted its wall kicks. The arena counted
 * its knockouts. `_recordFeats` wrote its stats. The gap was between them:
 * those counters were computed every frame and dropped on the floor when the
 * level ended, so the save never learned a thing about three quarters of the
 * game.
 *
 * That is a whole class of bug — *a number that is measured, displayed, and
 * never stored* — and it is invisible to every test that checks one file at a
 * time. So the centre of this pack is a check that crosses the seam: for every
 * unlock condition in the catalogue, follow the stat it reads all the way back
 * to the line that writes it. An unlock nobody can reach is a costume that
 * does not exist.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SKINS, TRAILS, FEATS } from '../src/game/skins.js';
import { KEYS } from '../src/core/i18n.js';
import { World } from '../src/game/world.js';
import { DIVE_LEVELS } from '../src/game/dive.js';
import { Storage } from '../src/core/storage.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (rel) => readFileSync(resolve(root, rel), 'utf8');

let fails = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  console.log(`  ✗ ${m}`);
  fails++;
};
const check = (c, m) => (c ? ok(m) : bad(m));

console.log('Gardırop gerçekten kazanılabilir mi?\n');

console.log('1) Her açılma şartının bir karşılığı var');
{
  for (const s of SKINS) {
    const u = s.unlock;
    if (u.kind === 'default') continue;
    if (u.kind === 'coins') {
      if (!(u.cost > 0)) bad(`${s.id}: fiyatı yok`);
      continue;
    }
    if (u.kind !== 'feat') {
      bad(`${s.id}: tanınmayan açılma türü "${u.kind}"`);
      continue;
    }
    if (!FEATS[u.feat]) bad(`${s.id}: "${u.feat}" diye bir başarım yok`);
    else if (!(u.goal > 0)) bad(`${s.id}: hedefi yok`);
  }
  const feats = SKINS.filter((s) => s.unlock.kind === 'feat').length;
  const coins = SKINS.filter((s) => s.unlock.kind === 'coins').length;
  check(true, `${SKINS.length} penguen: ${feats} başarımla, ${coins} balıkla, 1 başlangıç`);
}

/**
 * The one that would have caught it.
 *
 * `FEATS.kicks` reads `stats.wallKicks`. Somebody has to *write* that, and
 * before this pack existed nobody did for three chapters' worth of counters.
 * So: pull the stat name out of each reader, then look for an assignment to it
 * anywhere the game records progress. Static, on purpose — the alternative is
 * playing a hundred levels to find out that a number never moved.
 */
console.log('\n2) Her başarım gerçekten yazılan bir sayıyı okuyor');
{
  const writers = src('src/game/game.js') + src('src/core/storage.js');
  for (const [id, spec] of Object.entries(FEATS)) {
    const body = String(spec.read);
    // `s.stats.totalFish`, `s.daily?.bestStreak`, `s.league?.bestTier`, …
    const field = body.match(/s\.stats\.([a-zA-Z]+)/)?.[1];
    if (!field) {
      // Reads something other than a plain counter (the wardrobe's own size,
      // the league tier). Those are structures the save keeps by definition.
      ok(`${id}: sayaç değil, kaydın kendi yapısını okuyor`);
      continue;
    }
    // Assigned or added to — `st.x = …`, `data.stats.x += …`, either counts.
    const written = new RegExp(`\\.${field}\\s*(\\+)?=[^=]`).test(writers);
    check(written, `${id}: stats.${field} bir yerde yazılıyor`);
  }
}

console.log('\n3) Yeni sayaçlar kaydın varsayılanında da var');
{
  const base = Storage.blank ? Storage.blank() : null;
  const fresh = base ?? JSON.parse(JSON.stringify({ stats: {} }));
  const names = ['wallKicks', 'clingSeconds', 'swimSeconds', 'deepBreaths', 'knockouts'];
  const defaults = src('src/core/storage.js');
  for (const n of names) {
    check(new RegExp(`${n}:\\s*0`).test(defaults), `${n} sıfırdan başlıyor`);
  }
  check(
    /stats:\s*\{\s*\.\.\.base\.stats/.test(defaults),
    'eski kayıtlar göç ederken yeni sayaçları alıyor',
  );
  void fresh;
}

console.log('\n4) Deniz turu gerçekten sayılıyor');
{
  /* The counters the sea never kept, measured in the real World rather than
     trusted. A run that swims has to move both of them. */
  const def = DIVE_LEVELS[0];
  const w = new World(def, {
    particles: { puff() {}, splash() {}, sparkle() {}, burstIce() {} },
    audio: new Proxy({}, { get: () => () => {} }),
    assist: false,
    upgrades: {},
    skin: 'normal',
  });
  const p = w.player;
  p.submerged = true;
  const start = { swim: w.swimTime, low: w.lowestBreath };
  for (let i = 0; i < 240; i++) {
    p.submerged = true;
    w.update(1 / 120, { axis: 1, jumpHeld: true });
  }
  check(w.swimTime > 1.5, `iki saniyelik dalışta ${w.swimTime.toFixed(2)} sn sayıldı`);
  check(w.lowestBreath < start.low, `en düşük nefes ${(w.lowestBreath * 100).toFixed(0)}%'e indi`);
  const before = w.swimTime;
  w._respawn();
  check(
    w.swimTime === 0 && w.lowestBreath === 1,
    `yeni denemede sıfırlanıyor (${before.toFixed(2)} sn → ${w.swimTime.toFixed(2)}) — boğulan denemeler toplanmıyor`,
  );
}

console.log('\n5) Yetenek hâlâ yalnızca elmasın işareti');
{
  const perked = SKINS.filter((s) => s.perk);
  check(
    perked.every((s) => s.rarity === 'diamond'),
    `${perked.length} yetenekli penguen, hepsi elmas`,
  );
}

console.log('\n6) Her yeni parça iki dilde de konuşuyor');
{
  for (const s of SKINS) {
    if (!s.en?.name || !s.en?.blurb) bad(`${s.id}: İngilizcesi eksik`);
  }
  for (const tItem of TRAILS) {
    if (!tItem.en?.name) bad(`iz ${tItem.id}: İngilizcesi eksik`);
  }
  for (const id of Object.keys(FEATS)) {
    const key = `feat.${id}`;
    const missing = ['tr', 'en'].filter((l) => !KEYS[l].includes(key));
    if (missing.length) bad(`${key}: ${missing.join(', ')} eksik`);
  }
  check(true, `${SKINS.length} penguen, ${TRAILS.length} iz, ${Object.keys(FEATS).length} başarım tarandı`);
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Gardıroptaki her parça bir yerden kazanılıyor, ve kazanıldığı yer kayda geçiyor.');
