/**
 * Persistence layer.
 *
 * A single versioned JSON blob in localStorage. All reads go through
 * `defaults()` so an older or corrupted save can never crash the game, and
 * `migrate()` carries v1 saves forward instead of wiping someone's progress.
 */

const KEY = 'pengu.save.v1';
const VERSION = 2;

function defaults() {
  return {
    version: VERSION,
    unlocked: 1,
    levels: {}, // { [id]: { stars, bestTime, deaths, fish } }
    settings: { sfx: true, music: true, reducedMotion: false, assist: false },
    stats: { totalDeaths: 0, totalPlays: 0, totalFish: 0 },
    /** Spendable currency. */
    coins: 0,
    /** { [upgradeId]: ownedLevel } */
    upgrades: {},
    /** Daily challenge state. */
    daily: { date: null, done: false, bestTime: null, streak: 0, lastPlayed: null },
    /** Rotating missions, regenerated once a day. */
    missions: { date: null, list: [] },
  };
}

/** Bring an older save up to the current shape without losing anything. */
function migrate(parsed) {
  const base = defaults();
  const out = {
    ...base,
    ...parsed,
    version: VERSION,
    settings: { ...base.settings, ...(parsed.settings ?? {}) },
    stats: { ...base.stats, ...(parsed.stats ?? {}) },
    daily: { ...base.daily, ...(parsed.daily ?? {}) },
    missions: { ...base.missions, ...(parsed.missions ?? {}) },
    levels: parsed.levels ?? {},
    upgrades: parsed.upgrades ?? {},
    coins: Number.isFinite(parsed.coins) ? parsed.coins : 0,
  };

  // v1 had no economy. Rather than starting a returning player at zero, pay
  // them retroactively for the fish and stars they already earned.
  if ((parsed.version ?? 1) < 2) {
    const stars = Object.values(out.levels).reduce((n, l) => n + (l.stars ?? 0), 0);
    out.coins = (out.stats.totalFish ?? 0) * 3 + stars * 8;
  }
  return out;
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return migrate(JSON.parse(raw));
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

/** Local calendar day, so "today" means the player's today. */
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(a, b) {
  if (!a || !b) return Infinity;
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
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

  addCoins(data, amount) {
    data.coins = Math.max(0, Math.round(data.coins + amount));
    write(data);
    return data.coins;
  },

  /** Buy the next level of an upgrade. Returns true when the purchase went through. */
  buyUpgrade(data, spec) {
    const owned = data.upgrades[spec.id] ?? 0;
    if (owned >= spec.levels.length) return false;
    const cost = spec.levels[owned].cost;
    if (data.coins < cost) return false;
    data.coins -= cost;
    data.upgrades[spec.id] = owned + 1;
    write(data);
    return true;
  },

  /**
   * Daily challenge bookkeeping.
   *
   * The streak is the thing that brings people back, so it is deliberately
   * forgiving in one direction only: playing the next day continues it,
   * skipping a day resets it, and playing twice in a day changes nothing.
   */
  touchDaily(data) {
    const today = todayKey();
    if (data.daily.date !== today) {
      const gap = daysBetween(data.daily.date, today);
      data.daily = {
        date: today,
        done: false,
        bestTime: null,
        streak: gap === 1 ? data.daily.streak : 0,
        lastPlayed: data.daily.lastPlayed,
      };
      write(data);
    }
    return data.daily;
  },

  completeDaily(data, time) {
    const today = todayKey();
    this.touchDaily(data);
    const first = !data.daily.done;
    data.daily.done = true;
    data.daily.bestTime = data.daily.bestTime == null ? time : Math.min(data.daily.bestTime, time);
    if (first) {
      data.daily.streak = data.daily.lastPlayed === today ? data.daily.streak : data.daily.streak + 1;
      data.daily.lastPlayed = today;
    }
    write(data);
    return { first, streak: data.daily.streak };
  },

  setMissions(data, list) {
    data.missions = { date: todayKey(), list };
    write(data);
    return data.missions;
  },

  reset() {
    const fresh = defaults();
    write(fresh);
    return fresh;
  },
};
