/**
 * Daily missions.
 *
 * Three every day, rolled from a fixed pool with the date as the seed — so
 * everybody gets the same three, and reloading the page can't reroll them into
 * something easier. They exist for two reasons: they give the shop a steady
 * income that isn't "replay level 1 forever", and they give a reason to open
 * the game tomorrow.
 */

import { makeRng } from '../core/util.js';
import { todayKey } from '../core/storage.js';

/**
 * Each mission tracks a counter that the game bumps through `progressMission`.
 * `goal` is how far it has to get; `reward` is paid once, on completion.
 */
const POOL = [
  /* --- the everyday ones: always achievable on the way to somewhere else -- */
  { id: 'clear3', text: '3 bölüm bitir', goal: 3, reward: 30, event: 'clear', tier: 'easy', en: { text: 'Finish 3 levels' } },
  { id: 'fish12', text: '12 balık topla', goal: 12, reward: 30, event: 'fish', tier: 'easy', en: { text: 'Collect 12 fish' } },
  { id: 'stars4', text: '4 yıldız kazan', goal: 4, reward: 35, event: 'star', tier: 'easy', en: { text: 'Earn 4 stars' } },
  { id: 'daily', text: 'Günün bölümünü bitir', goal: 1, reward: 40, event: 'daily', tier: 'easy', en: { text: 'Finish the level of the day' } },

  /* --- the ones that ask for a clean run -------------------------------- */
  { id: 'flawless1', text: 'Bir bölümü hiç ölmeden bitir', goal: 1, reward: 35, event: 'flawless', tier: 'mid', en: { text: 'Finish a level without dying' } },
  { id: 'flawless3', text: 'Üç bölümü üst üste ölmeden bitir', goal: 3, reward: 80, event: 'flawless', tier: 'hard', en: { text: 'Finish three levels in a row without dying' } },
  { id: 'perfect', text: 'Bir bölümden 3 yıldız al', goal: 1, reward: 50, event: 'threeStars', tier: 'mid', en: { text: 'Get 3 stars on a level' } },
  { id: 'clear5', text: '5 bölüm bitir', goal: 5, reward: 45, event: 'clear', tier: 'mid', en: { text: 'Finish 5 levels' } },
  { id: 'fish20', text: '20 balık topla', goal: 20, reward: 45, event: 'fish', tier: 'mid', en: { text: 'Collect 20 fish' } },

  /* --- the ones about surviving something ------------------------------- */
  { id: 'burst', text: 'Bir gayzerin fırlatışından sıyrıl', goal: 1, reward: 25, event: 'burstDodge', tier: 'mid', en: { text: 'Get clear of one geyser' } },
  { id: 'burst3', text: 'Üç gayzerden sağ çık', goal: 3, reward: 60, event: 'burstDodge', tier: 'hard', en: { text: 'Survive three geysers' } },
  { id: 'orca', text: 'Orkanın burnunun dibinden geç', goal: 1, reward: 25, event: 'orcaPass', tier: 'mid', en: { text: 'Slip past an orca' } },
  // Two different things, and they used to be one. "Escape a bird by a hair"
  // is a sentence about being *caught* and fighting free, and it was wired to
  // the counter for dives that missed you — describing a mechanic that exists
  // and paying out for a different one. Now the wording and the counter agree,
  // and the struggle finally has something asking for it.
  { id: 'skua', text: 'Bir kuş dalışını boşa çıkar', goal: 1, reward: 55, event: 'skuaDodge', tier: 'mid', en: { text: 'Make a bird miss' } },
  { id: 'skuaFree', text: 'Kuşun pençesinden boğuşarak kurtul', goal: 1, reward: 90, event: 'skuaEscape', tier: 'mid', en: { text: 'Wrestle free of a bird' } },
  { id: 'skua3', text: 'Üç kuş dalışını boşa çıkar', goal: 3, reward: 110, event: 'skuaDodge', tier: 'hard', en: { text: 'Waste three bird dives' } },
  { id: 'tunnel', text: 'Bir tüneli hiç ölmeden geç', goal: 1, reward: 60, event: 'tunnelClean', tier: 'hard', en: { text: 'Cross a tunnel without dying' } },

  /* --- the ones about how you play, not what you survive ---------------- */
  { id: 'glide', text: 'Kanatlarınla 6 saniye süzül', goal: 6, reward: 50, event: 'glide', tier: 'mid', needs: 'wings', en: { text: 'Glide 6 seconds on your wings' } },
  { id: 'rocket', text: 'Sırt motorunu 5 kez ateşle', goal: 5, reward: 50, event: 'rocket', tier: 'mid', needs: 'rocket', en: { text: 'Fire the back motor 5 times' } },
  { id: 'boost2', text: 'İki hız balığı yut', goal: 2, reward: 45, event: 'boost', tier: 'mid', en: { text: 'Swallow two speed fish' } },
  { id: 'clean', text: 'Bir bölümü çürük balığa dokunmadan bitir', goal: 1, reward: 40, event: 'cleanRun', tier: 'mid', en: { text: 'Finish a level without touching a rotten fish' } },
  { id: 'sprintFinish', text: 'Hız balığı etkisi üstündeyken bir bölüm bitir', goal: 1, reward: 65, event: 'sprintFinish', tier: 'hard', en: { text: 'Finish a level while the speed fish is still on you' } },
  { id: 'noStop', text: 'Bir bölümü hiç durmadan bitir', goal: 1, reward: 70, event: 'noStop', tier: 'hard', en: { text: 'Finish a level without ever stopping' } },
];

/**
 * Missions that ask for gear the player has not bought are not aspirational,
 * they are dead slots — so they are filtered out until the gear is owned.
 */
function eligible(save) {
  return POOL.filter((m) => !m.needs || (save.upgrades?.[m.needs] ?? 0) > 0);
}

/** Deterministic pick of three distinct missions for a given day. */
export function rollMissions(dateKey = todayKey(), save = { upgrades: {} }) {
  const seed = [...dateKey].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) >>> 0;
  const rng = makeRng(seed);
  const out = [];

  // One of each weight, in order. A day of three easy missions is a day with
  // nothing to aim at; a day of three hard ones is a day people skip.
  for (const tier of ['easy', 'mid', 'hard']) {
    const pool = eligible(save).filter(
      (m) => m.tier === tier && !out.some((o) => o.event === m.event),
    );
    if (!pool.length) continue;
    out.push({ ...pool[Math.floor(rng() * pool.length)], progress: 0, done: false });
  }

  // Backfill if a tier was empty for this player.
  const rest = eligible(save).filter((m) => !out.some((o) => o.event === m.event));
  while (out.length < 3 && rest.length) {
    out.push({ ...rest.splice(Math.floor(rng() * rest.length), 1)[0], progress: 0, done: false });
  }
  return out;
}

/** Make sure today's missions exist, without disturbing today's progress. */
export function ensureMissions(save, Storage) {
  if (save.missions.date === todayKey() && save.missions.list?.length) return save.missions.list;
  return Storage.setMissions(save, rollMissions(todayKey(), save)).list;
}

/**
 * Advance every mission watching `event`.
 * @returns {Array} missions that completed on this call, for the reward toast
 */
export function progressMission(save, event, amount = 1) {
  const finished = [];
  for (const m of save.missions.list ?? []) {
    if (m.done || m.event !== event) continue;
    m.progress = Math.min(m.goal, m.progress + amount);
    if (m.progress >= m.goal) {
      m.done = true;
      finished.push(m);
    }
  }
  return finished;
}
