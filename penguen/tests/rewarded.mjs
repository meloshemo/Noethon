/**
 * The offer to double a haul.
 *
 * There is no ad network in this project, and this file is where that fact is
 * stated in code rather than in a comment nobody reads. What is tested is the
 * *game's* half of a rewarded video, which is all of it except the video: when
 * the offer appears, when it refuses to, that a cancelled watch pays nothing,
 * and that the daily cap actually caps.
 *
 * That last one is the one worth guarding. A doubling with no limit is not a
 * bonus, it is the economy — and the economy was just slowed down on purpose,
 * so a bonus that undoes that would make the whole exercise pointless.
 */

import {
  canDouble, doubleUp, watchesLeft, setProvider, isHouseProvider, DAILY_LIMIT,
} from '../src/core/rewarded.mjs';
import { REWARDS } from '../src/game/config.js';

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails++;
}
const blank = () => ({ coins: 0 });

console.log('İkiye katlama teklifi\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) Teklif ne zaman çıkar, ne zaman çıkmaz');
setProvider(null); // the built-in placeholder
check('varsayılan sağlayıcı yerinde olan', isHouseProvider() === true);
check('iyi bir kazançta çıkıyor', canDouble(blank(), 60) === true);
check('sıfır kazançta çıkmıyor', canDouble(blank(), 0) === false);
check(
  'önemsiz kazançta çıkmıyor',
  canDouble(blank(), REWARDS.firstClear - 1) === false,
  `${REWARDS.firstClear} balığın altı`,
);
setProvider({ available: () => false, show: async () => true });
check('sağlayıcı yokken çıkmıyor', canDouble(blank(), 200) === false);

/* 2 --------------------------------------------------------------------- */
console.log('\n2) Yalnızca sonuna kadar izleyen kazanır');
setProvider({ available: () => true, show: async () => true });
{
  const save = blank();
  const bonus = await doubleUp(save, 120);
  check('tam izleyince kazanç ikiye katlanıyor', bonus === 120, `+${bonus}`);
  check('hak düşüyor', watchesLeft(save) === DAILY_LIMIT - 1, `${watchesLeft(save)} kaldı`);
}
setProvider({ available: () => true, show: async () => false });
{
  const save = blank();
  const bonus = await doubleUp(save, 120);
  check('yarıda bırakınca hiçbir şey vermiyor', bonus === 0);
  check('ve hak da düşmüyor', watchesLeft(save) === DAILY_LIMIT, `${watchesLeft(save)} kaldı`);
}

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Günlük sınır gerçekten sınır');
setProvider({ available: () => true, show: async () => true });
{
  const save = blank();
  let paid = 0;
  for (let i = 0; i < DAILY_LIMIT + 4; i++) paid += await doubleUp(save, 100);
  check(
    `günde en fazla ${DAILY_LIMIT} kez`,
    paid === DAILY_LIMIT * 100,
    `${paid} balık, sınır ${DAILY_LIMIT * 100}`,
  );
  check('sınıra varınca teklif de kayboluyor', canDouble(save, 100) === false);
}
{
  // Yesterday's spending does not count against today.
  const save = { coins: 0, rewarded: { day: '2000-01-01', used: DAILY_LIMIT } };
  check('dünkü haklar bugüne sarkmıyor', watchesLeft(save) === DAILY_LIMIT);
}

/* 4 --------------------------------------------------------------------- */
console.log('\n4) Ekonomiyi ele geçiremiyor');
// A whole day of doublings against a day of ordinary play. The point of the
// cap is that watching is a bonus rather than a job, so the ceiling has to be
// small next to what playing pays.
const perLevel = REWARDS.firstClear + REWARDS.perStar * 2 + REWARDS.perFish * 3;
const dayOfPlay = perLevel * 12;
const dayOfWatching = DAILY_LIMIT * perLevel;
check(
  'bir günlük izleme, bir günlük oyunun küçük bir kısmı',
  dayOfWatching < dayOfPlay * 0.4,
  `${dayOfWatching} vs ${dayOfPlay} balık`,
);

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Teklif adil, sınırlı, ve reklam ağı bağlı değil.');
