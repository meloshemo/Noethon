/**
 * Persistence layer.
 *
 * A single versioned JSON blob in localStorage. All reads go through
 * `defaults()` so an older or corrupted save can never crash the game.
 */

const KEY = 'pengu.save.v1';

function defaults() {
  return {
    version: 1,
    unlocked: 1,
    levels: {}, // { [id]: { stars, bestTime, deaths, fish } }
    settings: { sfx: true, music: true, reducedMotion: false, assist: false },
    stats: { totalDeaths: 0, totalPlays: 0, totalFish: 0 },
  };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    const base = defaults();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      stats: { ...base.stats, ...(parsed.stats ?? {}) },
      levels: parsed.levels ?? {},
    };
  } catch {
    return defaults();
  }
}

function write(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* private mode / quota — the game still plays, progress just isn't kept */
  }
}

export const Storage = {
  load: read,

  save(data) {
    write(data);
    return data;
  },

  /** Merge a level result, keeping the best of each metric. */
  recordLevel(data, id, { stars, time, deaths, fish }) {
    const prev = data.levels[id] ?? { stars: 0, bestTime: Infinity, deaths: 0, fish: 0 };
    data.levels[id] = {
      stars: Math.max(prev.stars, stars),
      bestTime: Math.min(prev.bestTime ?? Infinity, time),
      deaths: prev.deaths + deaths,
      fish: Math.max(prev.fish, fish),
    };
    data.unlocked = Math.max(data.unlocked, id + 1);
    data.stats.totalPlays += 1;
    data.stats.totalDeaths += deaths;
    data.stats.totalFish += fish;
    write(data);
    return data;
  },

  reset() {
    const fresh = defaults();
    write(fresh);
    return fresh;
  },
};
