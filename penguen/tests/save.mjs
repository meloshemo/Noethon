/**
 * The save file, and the promise not to lose anybody's progress.
 *
 * Everything in this game lives in one versioned JSON blob in localStorage,
 * and it has been through seven shapes. The rule since v1 has been that an old
 * save is *carried forward*, never wiped — which is easy to say and easy to
 * break, because breaking it looks like nothing at all until somebody who has
 * played for a month opens the game and is back on level one.
 *
 * So this loads saves in every old shape and checks the things that would
 * actually hurt: progress, purchases, records, and the run that was in
 * progress when the tab was closed.
 */

/** A localStorage that lives in memory, so the real module runs unchanged. */
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const { Storage } = await import('../src/core/storage.js');
const KEY = 'pengu.save.v1';

let fails = 0;
const ok = (name, cond, extra = '') => {
  if (cond) console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`);
  else {
    console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`);
    fails++;
  }
};
const load = (raw) => {
  store.clear();
  if (raw !== undefined) store.set(KEY, typeof raw === 'string' ? raw : JSON.stringify(raw));
  return Storage.load();
};

console.log('Kayıt dosyası denetleniyor...\n');

/* 1 ------------------------------------------------------------------- */
console.log('1) Hiç kayıt yokken');
{
  const s = load(undefined);
  ok('yeni oyuncu 1. bölümde', s.unlocked === 1);
  ok('ayarlar dolu', typeof s.settings.sfx === 'boolean');
  ok('sürüm güncel', s.version >= 7, `v${s.version}`);
}

/* 2 ------------------------------------------------------------------- */
console.log('\n2) Bozuk kayıt');
{
  const s = load('{bu json değil');
  ok('çökmüyor, sıfırdan başlıyor', s.unlocked === 1);
  const half = load('{"unlocked":9}');
  ok('yarım kayıt tamamlanıyor', half.unlocked === 9 && Boolean(half.stats));
}

/* 3 ------------------------------------------------------------------- */
console.log('\n3) v1 kaydı (ekonomi yokken)');
{
  const s = load({
    version: 1,
    unlocked: 12,
    levels: { 1: { stars: 3, bestTime: 21.5, deaths: 2, fish: 3 }, 2: { stars: 2 } },
    stats: { totalFish: 40, totalDeaths: 9 },
  });
  ok('ilerleme korunuyor', s.unlocked === 12);
  ok('yıldızlar duruyor', s.levels[1].stars === 3 && s.levels[2].stars === 2);
  ok('rekor duruyor', s.levels[1].bestTime === 21.5);
  // v1 had no coins at all; a returning player is paid for what they earned.
  ok('geçmişe dönük balık ödemesi', s.coins === 40 * 3 + 5 * 8, `${s.coins} balık`);
  ok('yeni alanlar dolduruldu', Array.isArray(s.missions.list) && s.trail === 'none');
}

/* 4 ------------------------------------------------------------------- */
console.log('\n4) v3 kaydı (en iyi seri kaydedilmiyorken)');
{
  const s = load({ version: 3, unlocked: 20, daily: { streak: 6, bestStreak: 0 } });
  ok('en iyi seri yaşayandan türetiliyor', s.daily.bestStreak === 6);
}

/* 5 ------------------------------------------------------------------- */
console.log('\n5) Satın alınanlar ve koleksiyon');
{
  const s = load({
    version: 5,
    unlocked: 40,
    coins: 1200,
    upgrades: { boots: 2, wings: 1 },
    skins: { gold: true },
    skin: 'gold',
    trails: { snow: true },
    trail: 'snow',
    monument: 3,
    league: { week: '2026-07', points: 240, bestTier: 2 },
  });
  ok('yükseltmeler duruyor', s.upgrades.boots === 2 && s.upgrades.wings === 1);
  ok('balık duruyor', s.coins === 1200);
  ok('giyilen penguen duruyor', s.skin === 'gold' && s.skins.gold === true);
  ok('iz duruyor', s.trail === 'snow');
  ok('anıt ve lig duruyor', s.monument === 3 && s.league.points === 240);
}

/* 6 ------------------------------------------------------------------- */
console.log('\n6) Yarıda kalan oyun');
{
  const session = { level: 33, elapsed: 12.4, fish: 2 };
  const s = load({ version: 6, unlocked: 34, session });
  ok('kaldığın yer duruyor', s.session?.level === 33, JSON.stringify(s.session));
}

/* 7 ------------------------------------------------------------------- */
console.log('\n7) Yazıp geri okumak');
{
  let s = load(undefined);
  s = Storage.recordLevel(s, 7, { stars: 3, time: 30.2, deaths: 1, fish: 3 });
  s = Storage.recordLevel(s, 7, { stars: 2, time: 41.0, deaths: 4, fish: 1 });
  const again = Storage.load();
  ok('en iyi süre saklanıyor', again.levels[7].bestTime === 30.2, `${again.levels[7].bestTime}`);
  ok('en iyi yıldız saklanıyor', again.levels[7].stars === 3);
  ok('ölümler toplanıyor', again.levels[7].deaths === 5, `${again.levels[7].deaths}`);
  ok('sonraki bölüm açılıyor', again.unlocked >= 8);
}

/* 8 ------------------------------------------------------------------- */
console.log('\n8) Bugünün bölümü mevcut');
{
  const { CRAFTED_LEVELS } = await import('../src/game/config.js');
  const s = load({ version: 2, unlocked: 9999 });
  ok('açık bölüm sayısı taşmıyor', s.unlocked > CRAFTED_LEVELS, `${s.unlocked}`);
}

if (fails) {
  console.log(`\n✗ ${fails} sorun.`);
  process.exit(1);
}
console.log('\n✓ Kayıt dosyası her sürümden güvenle açılıyor.');
