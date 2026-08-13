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
  { id: 'clear3', text: '3 bölüm bitir', goal: 3, reward: 30, event: 'clear' },
  { id: 'fish12', text: '12 balık topla', goal: 12, reward: 30, event: 'fish' },
  { id: 'flawless1', text: 'Bir bölümü hiç ölmeden bitir', goal: 1, reward: 35, event: 'flawless' },
  { id: 'stars4', text: '4 yıldız kazan', goal: 4, reward: 35, event: 'star' },
  { id: 'daily', text: 'Günün bölümünü bitir', goal: 1, reward: 40, event: 'daily' },
  { id: 'clear5', text: '5 bölüm bitir', goal: 5, reward: 45, event: 'clear' },
  { id: 'fish20', text: '20 balık topla', goal: 20, reward: 45, event: 'fish' },
  { id: 'burst', text: 'Bir gayzerden kaçmayı başar', goal: 1, reward: 25, event: 'burstDodge' },
  { id: 'orca', text: 'Orkanın üstünden geç', goal: 1, reward: 25, event: 'orcaPass' },
  { id: 'perfect', text: 'Bir bölümden 3 yıldız al', goal: 1, reward: 50, event: 'threeStars' },
];

/** Deterministic pick of three distinct missions for a given day. */
export function rollMissions(dateKey = todayKey()) {
  const seed = [...dateKey].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) >>> 0;
  const rng = makeRng(seed);
  const pool = [...POOL];
  const out = [];
  while (out.length < 3 && pool.length) {
    const spec = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    // Never two missions that watch the same event — they'd complete together
    // and the day would feel like one mission paying triple.
    if (out.some((m) => m.event === spec.event)) continue;
    out.push({ ...spec, progress: 0, done: false });
  }
  return out;
}

/** Make sure today's missions exist, without disturbing today's progress. */
export function ensureMissions(save, Storage) {
  if (save.missions.date === todayKey() && save.missions.list?.length) return save.missions.list;
  return Storage.setMissions(save, rollMissions()).list;
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
