/**
 * Persistence layer.
 *
 * A single versioned JSON blob in localStorage. All reads go through
 * `defaults()` so an older or corrupted save can never crash the game, and
 * `migrate()` carries v1 saves forward instead of wiping someone's progress.
 */

const KEY = 'pengu.save.v1';
const VERSION = 7;

/**
 * Ghost runs are the biggest thing in the save by far, so they are capped.
 * Both numbers are per-save totals, oldest evicted first.
 */
const MAX_GHOSTS = 40;
const MAX_RIVALS = 40;
/** Rivals shown on one level's board. More than this is a wall, not a list. */
const RIVALS_PER_LEVEL = 6;

function defaults() {
  return {
    version: VERSION,
    unlocked: 1,
    levels: {}, // { [id]: { stars, bestTime, deaths, fish } }
    // `lang: null` means "whatever the browser asks for". It only becomes a
    // fixed value once somebody picks one by hand, so a player who never opens
    // settings keeps following their phone.
    settings: { sfx: true, music: true, reducedMotion: false, assist: false, lang: null },
    stats: {
      totalDeaths: 0,
      totalPlays: 0,
      totalFish: 0,
      /** Levels finished without dying once — the ninja's condition. */
      flawless: 0,
      /** Distance covered in endless mode, in metres (10px = 1m). */
      endlessMeters: 0,
      /** Speed fish swallowed, ever. */
      boosts: 0,
      /** Bird dives survived, seconds glided, motor bursts, fish spent. */
      skuaDodges: 0,
      /** Grabs the chick twisted out of. */
      skuaEscapes: 0,
      glideSeconds: 0,
      rocketFires: 0,
      spent: 0,
      /** Runs started between midnight and five. */
      nightRuns: 0,
      /** The mountain: kicks off an ice wall, and seconds hanging on one. */
      wallKicks: 0,
      clingSeconds: 0,
      /** The sea: seconds under the ice, and dives finished on empty lungs. */
      swimSeconds: 0,
      deepBreaths: 0,
      /** The arena: rivals knocked over. */
      knockouts: 0,
    },
    /** Spendable currency. */
    coins: 0,
    /** { [upgradeId]: ownedLevel } */
    upgrades: {},
    /** Daily challenge state, including the day's completed objectives. */
    daily: {
      date: null,
      done: false,
      bestTime: null,
      streak: 0,
      bestStreak: 0,
      lastPlayed: null,
      objectives: [],
    },
    /** { [skinId]: true } — everything unlocked or bought. */
    skins: {},
    /** The skin currently worn. */
    skin: 'normal',
    /** { [trailId]: true } and the one in use. */
    trails: {},
    trail: 'none',
    /**
     * A run that was interrupted.
     *
     * Phones do not get closed at tidy moments: a bus arrives, a call comes in,
     * the tab is swapped and the page is thrown out of memory. Coming back to
     * "Bölüm 1" after that is the difference between a game somebody keeps and
     * one they delete, so the current attempt is kept on disk and offered back.
     */
    session: null,
    /** The endless sink: how many blocks of the monument have been funded. */
    monument: 0,
    /** Weekly league: { week, points, bestTier, lastWeekPoints }. */
    league: { week: null, points: 0, bestTier: 0, lastWeekPoints: 0 },
    /** Rotating missions, regenerated once a day. */
    missions: { date: null, list: [] },
    /** The name this player's runs are shared under. */
    name: '',
    /**
     * Who is playing: a permanent short id, when they started, and whether
     * they have been introduced. Never sent anywhere — see docs/GIZLILIK.md.
     */
    profile: { id: '', created: 0, greeted: false },
    /** Your own best run per level, as a share code: { [key]: {code, time, at} } */
    ghosts: {},
    /** Imported runs: { [key]: [{name, time, code, at}] } — the board. */
    rivals: {},
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
    name: typeof parsed.name === 'string' ? parsed.name : '',
    ghosts: parsed.ghosts ?? {},
    rivals: parsed.rivals ?? {},
    skins: parsed.skins ?? {},
    skin: parsed.skin ?? 'normal',
    trails: parsed.trails ?? {},
    trail: parsed.trail ?? 'none',
    league: { ...base.league, ...(parsed.league ?? {}) },
    monument: Number.isFinite(parsed.monument) ? parsed.monument : 0,
    session: parsed.session ?? null,
    // Merged rather than replaced: a save from before profiles existed has no
    // id at all, and `ensureProfile` mints one on the next boot.
    profile: { ...base.profile, ...(parsed.profile ?? {}) },
  };

  // v3 had no record of the best streak ever reached, only the live one. The
  // golden penguin is earned on that record, so seed it from what we know
  // rather than making a long-standing player start again.
  if ((parsed.version ?? 1) < 4) {
    out.daily.bestStreak = Math.max(out.daily.bestStreak ?? 0, out.daily.streak ?? 0);
  }

  /**
   * v1 had no economy. Rather than starting a returning player at zero, pay
   * them retroactively for the fish and stars they already earned.
   *
   * At the rates that were live when v2 shipped, not today's. Those two were
   * the same number for a long time and then the payouts were halved, at which
   * point a hardcoded three quietly stopped being `REWARDS.perFish` and became
   * a historical constant wearing its clothes. Pinning it says which it is: a
   * one-off back-payment for a version that no longer exists, and it must not
   * move when the live economy is retuned.
   */
  if ((parsed.version ?? 1) < 2) {
    const V2_PER_FISH = 3;
    const V2_PER_STAR = 8;
    const stars = Object.values(out.levels).reduce((n, l) => n + (l.stars ?? 0), 0);
    out.coins = (out.stats.totalFish ?? 0) * V2_PER_FISH + stars * V2_PER_STAR;
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

/** Drop the oldest entries of a keyed map until it fits. */
function prune(map, max) {
  const keys = Object.keys(map);
  if (keys.length <= max) return;
  keys
    .sort((a, b) => (map[a].at ?? 0) - (map[b].at ?? 0))
    .slice(0, keys.length - max)
    .forEach((k) => delete map[k]);
}

function pruneRivals(map) {
  let total = Object.values(map).reduce((n, l) => n + l.length, 0);
  if (total <= MAX_RIVALS) return;
  // Oldest imports go first, wherever they sit.
  const all = Object.entries(map).flatMap(([k, list]) => list.map((r) => ({ k, r })));
  all.sort((a, b) => (a.r.at ?? 0) - (b.r.at ?? 0));
  for (const { k, r } of all) {
    if (total <= MAX_RIVALS) break;
    map[k] = map[k].filter((x) => x !== r);
    if (!map[k].length) delete map[k];
    total--;
  }
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
    data.stats.spent = (data.stats.spent ?? 0) + cost;
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
        bestStreak: data.daily.bestStreak ?? 0,
        lastPlayed: data.daily.lastPlayed,
        objectives: [],
      };
      write(data);
    }
    return data.daily;
  },

  /** Record which of the day's objectives are now ticked off. */
  setDailyObjectives(data, done) {
    this.touchDaily(data);
    data.daily.objectives = done;
    write(data);
    return data.daily.objectives;
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
      // The best streak ever reached is what the golden penguin is earned on,
      // so it is kept separately from the live one, which a missed day resets.
      data.daily.bestStreak = Math.max(data.daily.bestStreak ?? 0, data.daily.streak);
    }
    write(data);
    return { first, streak: data.daily.streak };
  },

  /* -------------------------------------------------------- skins */

  /**
   * Unlock a cosmetic. `bag` is which wardrobe it goes in — 'skins' or
   * 'trails' — so the two slots share one set of rules.
   */
  grantSkin(data, id, bag = 'skins') {
    if (data[bag][id]) return false;
    data[bag][id] = true;
    write(data);
    return true;
  },

  /** Buy one with fish. Returns false when it cannot be afforded. */
  buySkin(data, id, cost, bag = 'skins') {
    if (data[bag][id]) return false;
    if ((data.coins ?? 0) < cost) return false;
    data.coins -= cost;
    data.stats.spent = (data.stats.spent ?? 0) + cost;
    data[bag][id] = true;
    write(data);
    return true;
  },

  wearSkin(data, id, bag = 'skins') {
    if (bag === 'trails') data.trail = id;
    else data.skin = id;
    write(data);
    return id;
  },

  /* ------------------------------------------------------ session */

  /**
   * Remember where an attempt got to.
   *
   * Written at checkpoints, deaths and pauses rather than every frame: those
   * are the moments a position is meaningful, and localStorage is not free.
   * A session older than a day is thrown away — coming back a week later to a
   * half-finished level you have forgotten is worse than starting it.
   */
  saveSession(data, run) {
    data.session = { ...run, at: Date.now() };
    write(data);
    return data.session;
  },

  /** The interrupted run, if there is a fresh one. */
  takeSession(data) {
    const s = data.session;
    if (!s) return null;
    if (Date.now() - (s.at ?? 0) > 36 * 3600 * 1000) {
      data.session = null;
      write(data);
      return null;
    }
    return s;
  },

  clearSession(data) {
    if (!data.session) return;
    data.session = null;
    write(data);
  },

  /**
   * Fund one more block of the monument.
   *
   * The only bottomless thing in the economy. It buys nothing — that is what
   * lets it be infinite without unbalancing anything, and it is why there is
   * always somewhere for a fish to go.
   */
  fundMonument(data, cost) {
    if ((data.coins ?? 0) < cost) return false;
    data.coins -= cost;
    data.stats.spent = (data.stats.spent ?? 0) + cost;
    data.monument = (data.monument ?? 0) + 1;
    write(data);
    return true;
  },

  /* ------------------------------------------------------- league */

  /**
   * Roll the league over if the week has turned, then return it.
   * The tier reached is kept forever; the points are not.
   */
  touchLeague(data, week) {
    if (data.league.week !== week) {
      data.league = {
        week,
        points: 0,
        bestTier: data.league.bestTier ?? 0,
        lastWeekPoints: data.league.week ? (data.league.points ?? 0) : 0,
      };
      write(data);
    }
    return data.league;
  },

  addLeaguePoints(data, week, points, tierIndex) {
    this.touchLeague(data, week);
    data.league.points += points;
    data.league.bestTier = Math.max(data.league.bestTier ?? 0, tierIndex);
    write(data);
    return data.league;
  },

  /* ------------------------------------------------------- ghosts */

  /** The name runs are shared under. Empty means "not asked yet". */
  setName(data, name) {
    data.name = String(name ?? '').trim().slice(0, 14);
    write(data);
    return data.name;
  },

  displayName(data) {
    return data.name?.trim() || 'Sen';
  },

  /**
   * Keep your own best run for a level. Only a faster run replaces the stored
   * one — the ghost you race should always be the best you have ever done.
   * Returns true when it was a new personal best.
   */
  recordGhost(data, key, { code, time }) {
    const prev = data.ghosts[key];
    if (prev && prev.time <= time) return false;
    data.ghosts[key] = { code, time, at: Date.now() };
    prune(data.ghosts, MAX_GHOSTS);
    write(data);
    return true;
  },

  /**
   * Add somebody else's run to a level's board. One entry per name, best time
   * kept, so re-pasting a friend's improved code updates their row instead of
   * stacking a second one.
   */
  addRival(data, key, { code, time, name }) {
    const who = (name ?? '').trim() || 'Rakip';
    const list = data.rivals[key] ?? [];
    const existing = list.find((r) => r.name === who);
    if (existing && existing.time <= time) return false;
    const next = list.filter((r) => r.name !== who);
    next.push({ name: who, time, code, at: Date.now() });
    next.sort((a, b) => a.time - b.time);
    data.rivals[key] = next.slice(0, RIVALS_PER_LEVEL);
    pruneRivals(data.rivals);
    write(data);
    return true;
  },

  removeRival(data, key, name) {
    const list = data.rivals[key];
    if (!list) return;
    data.rivals[key] = list.filter((r) => r.name !== name);
    if (!data.rivals[key].length) delete data.rivals[key];
    write(data);
  },

  /**
   * One level's board: your best plus every imported run, fastest first.
   * This is the leaderboard — it just travels by share code rather than server.
   */
  board(data, key) {
    const rows = (data.rivals[key] ?? []).map((r) => ({ ...r, you: false }));
    const mine = data.ghosts[key];
    if (mine) rows.push({ name: this.displayName(data), time: mine.time, code: mine.code, you: true });
    rows.sort((a, b) => a.time - b.time);
    return rows;
  },

  /** Every level that has anything on its board, in play order. */
  boardKeys(data) {
    const keys = new Set([...Object.keys(data.ghosts ?? {}), ...Object.keys(data.rivals ?? {})]);
    return [...keys].sort((a, b) => {
      if (a === 'daily') return 1;
      if (b === 'daily') return -1;
      return Number(a) - Number(b);
    });
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
