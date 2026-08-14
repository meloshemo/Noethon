/**
 * Global tuning constants.
 *
 * Everything that affects "game feel" lives here so it can be tuned in one
 * place. Units are pixels and seconds unless stated otherwise.
 */

/**
 * Logical render resolution.
 *
 * Mutable on purpose: the renderer rewrites w/h on every resize so the view
 * matches the device's aspect ratio exactly. That means no black bars — a wide
 * screen simply sees more of the level, a tall one sees more sky.
 * `h` stays the anchor, so the penguin is the same size on every device.
 */
export const VIEW = { w: 960, h: 540 };

/**
 * Bounds the adaptive viewport so no device gets an unfair field of view.
 *
 * minW is what a portrait phone falls back to. Lower is a narrower view of the
 * level but a bigger picture, and in portrait the width is what limits the
 * scale — at 720 the game only filled about two thirds of the screen.
 */
export const VIEW_LIMITS = { minW: 600, maxW: 1440, minH: 440, maxH: 900, baseH: 540 };

/**
 * Physics.
 *
 * Tuned for a *snappy* game: high speed, hard gravity, short airtime. The
 * penguin covers more ground per jump than before while spending noticeably
 * less time floating, which is what makes the game feel fast rather than
 * merely quick. Gravity is asymmetric (lighter on the way up, heavy on the way
 * down) — the classic platformer trick that makes a jump feel decisive.
 */
export const PHYS = {
  gravityUp: 2150,
  gravityDown: 3100,
  maxFall: 1500,
  moveSpeed: 320,
  groundAccel: 4200,
  airAccel: 2700,
  groundFriction: 3600,
  airFriction: 780,
  jumpVelocity: -780,
  /** Multiplier applied to upward velocity when jump is released early. */
  jumpCut: 0.34,
  /** Grace period to still jump after walking off a ledge. */
  coyoteTime: 0.13,
  /** Jump presses are remembered this long before touching ground. */
  jumpBuffer: 0.15,
  /** Friction multiplier while standing on slippery ice. */
  slipFriction: 0.12,
};

/** Base penguin size at growth scale 1.0. */
export const PENGUIN = {
  w: 30,
  h: 34,
  /** Growth makes the bird heavier: jump and speed shrink slightly. */
  jumpPenaltyPerScale: 0.11,
  speedPenaltyPerScale: 0.08,
};

/** Water line offset from the bottom of a level's world height. */
export const WATER_MARGIN = 70;

/**
 * How far the penguin can jump, from the physics rather than from playtesting.
 *
 * This is the number every level in the game is measured against — the
 * composer places floes with it, the generator sizes its gaps with it and the
 * validator fails the build when a level asks for more than it. One definition,
 * so those three can never drift apart.
 *
 * `maxHeight` caps the apex, which is what a ceiling does: under a low roof the
 * penguin cannot take the full arc, so it cannot jump as far either. Passing it
 * is how a tunnel gets measured honestly.
 */
export function reachFor(scale, maxHeight = Infinity) {
  const v = Math.abs(PHYS.jumpVelocity) * (1 - PENGUIN.jumpPenaltyPerScale * (scale - 1));
  const speed = PHYS.moveSpeed * (1 - PENGUIN.speedPenaltyPerScale * (scale - 1));
  const full = (v * v) / (2 * PHYS.gravityUp);
  const height = Math.max(0, Math.min(full, maxHeight));
  const tUp = Math.sqrt((2 * height) / PHYS.gravityUp);
  const tDown = Math.sqrt((2 * height) / PHYS.gravityDown);
  return { distance: speed * (tUp + tDown), height, full };
}

/** Timings for the different ice behaviours (seconds). */
export const ICE = {
  /** "crack": time between first touch and collapse. */
  crackDelay: 0.85,
  /** "trap": looks solid, gives way almost immediately. */
  trapDelay: 0.22,
  /** How long a broken floe stays gone before drifting back. */
  respawn: 2.6,
  /** Shake amplitude while a floe is cracking. */
  shake: 2.2,
  /**
   * "burst": warning time before the geyser fires.
   *
   * Unlike cracking ice — where being caught on it is survivable if you were
   * heading off anyway — a geyser throws you, so the window has to cover the
   * worst case: landing on the very near edge and running the whole width.
   */
  burstWarn: 0.6,
  /** "burst": how hard it throws the penguin. */
  burstUp: -1180,
  burstSide: 210,
  /**
   * "fake": ice that is drawn exactly like solid ice and is not.
   *
   * The fuse is long enough to run off if you keep moving and short enough to
   * drown anybody who stops to look around. That is the whole design: it does
   * not punish you for not knowing, it punishes you for hesitating.
   */
  fakeDelay: 0.46,
  /** "snap": how close to landing the ice waits before vanishing. */
  snapTrigger: 0.26,
  /** "snap": stays gone this long, so the retry is a fair one. */
  snapRespawn: 1.5,
};

/**
 * Antarctic storm zones.
 *
 * Unlike a gust — a narrow column you cross — a storm is a stretch of coast
 * where the wind is simply against you. It pulses rather than blowing flat,
 * because a constant headwind is just a slower walk, while a pulsing one is a
 * decision: push through the lull, or wait out the surge on solid ice.
 */
export const STORM = {
  /** Seconds per surge cycle. */
  period: 3.6,
  /** Fraction of the cycle spent at full strength. */
  surge: 0.34,
  /** Wind during the lull, as a fraction of full power. */
  lull: 0.22,
  /** How much of the wind is felt with both feet on the ice. */
  groundFactor: 0.6,
  /** Seconds of visible build-up before a surge peaks. */
  warn: 0.55,
};

/**
 * The speed fish.
 *
 * A single red-and-gold fish per level that turns the penguin into a streak of
 * lightning for a few seconds. It is never on the main line — always a detour —
 * so taking it is a bet: the boost saves far more time than the detour costs,
 * but only if you can still hit your landings at half again the speed.
 */
export const BOOST = {
  duration: 4.5,
  speed: 0.5,
  jump: 0.06,
  /** Extra coins for grabbing one. */
  reward: 10,
};

/**
 * Rotten fish.
 *
 * The counterweight to the speed fish, and the reason "grab everything" stops
 * being a free strategy. These sit *on* the running line rather than off it, so
 * avoiding one costs a jump or a swerve — the player has to decide, at speed,
 * whether that costs less than the debuff.
 *
 * Each is survivable on its own. None is survivable if you were already in
 * trouble, which is the point.
 */
export const ROT = {
  /** Lead in the belly: heavier, shorter jump. */
  heavy: { duration: 5, jump: -0.22, speed: -0.18, label: 'Ağırlaştın!' },
  /** Left is right. Short, because it is the nastiest. */
  dizzy: { duration: 3.2, label: 'Kontroller ters!' },
  /** Frost on the eyes: the view closes in. */
  blind: { duration: 4, label: 'Göremiyorsun!' },
};

/**
 * Active gear.
 *
 * The rest of the shop makes numbers bigger. These change what the penguin can
 * *do*, on the same jump button:
 *
 *   hold in mid-air   → wings out, the fall slows to a glide
 *   tap in mid-air    → the back motor fires once, straight up
 *
 * Both run on a meter that only refills on the ground, so neither turns the
 * game into flying: they turn a jump you already committed to into a jump you
 * can still argue with. Every level is validated against a penguin with none of
 * this, so gear can only ever make a course easier — never unlock one.
 */
export const GEAR = {
  wings: {
    /** Seconds of glide per landing, at level 1. */
    stamina: 1.1,
    /** Downward speed while gliding, as a fraction of terminal velocity. */
    fallFactor: 0.22,
    /** Forward drift the spread wings give you. */
    lift: 46,
  },
  rocket: {
    /** Bursts per landing, at level 1. */
    charges: 1,
    /** Upward velocity a burst sets. */
    power: -560,
    /** Seconds of thrust visual + a floor on vertical speed. */
    burn: 0.22,
    /** Minimum time between two bursts, so a double tap is not a rocket ride. */
    cooldown: 0.28,
  },
};

/**
 * Ambushes.
 *
 * A skua is a big polar gull that will genuinely take a chick. It is not part
 * of the level: it comes out of nothing, at a moment the level did not choose,
 * which is the whole point — a course you have memorised should still be able
 * to surprise you on the ninth run.
 *
 * It gets a shadow on the ice before it strikes, and that is deliberate. A
 * zero-warning instant kill is a coin flip and people quit; a warning you have
 * to *notice while doing something else* is the thing that makes people say one
 * more go. The window is short enough to be genuinely nasty.
 */
export const AMBUSH = {
  /** Seconds of shadow before the dive lands. */
  warn: 0.72,
  /** How long the dive itself takes, from off-screen to the strike point. */
  dive: 0.42,
  /** Never twice inside this window. */
  cooldown: 6.5,
  /** Grace after a spawn or respawn — never ambushed while getting your bearings. */
  grace: 2.4,
  /** Chance per second of an attack, once everything else allows it. */
  rate: 0.18,
  /** The earliest level an ambush can happen at all. */
  fromLevel: 12,
  /** How long the bird carries the chick before dropping it. */
  carry: 0.9,
};

/**
 * The collapse at the flag.
 *
 * A serac calves off the cliff above the raft just as you arrive. It is the
 * nastiest thing in the game and it is deliberate: the last four seconds of a
 * level are where attention drops, and a level that can still take you there is
 * a level you do not sleepwalk through.
 *
 * What stops it being a coin flip: it only fires on a fraction of arrivals, it
 * throws a shadow before it lands, and it falls *short of the raft* — the ice
 * it smashes is ground you have to cross, not the goal itself. Somebody who
 * knows it exists gets past it every time. Somebody who does not, finds out.
 */
export const COLLAPSE = {
  /** Chance of a collapse on any given approach to the goal. */
  chance: 0.55,
  /** How close to the goal, as a fraction of the level, it arms. */
  from: 0.82,
  /** Shadow time before impact. */
  warn: 0.5,
  /** How long the debris stays lethal on the ice. */
  linger: 1.6,
  /** Never in the first levels: the player has to have somewhere to fall from. */
  fromLevel: 8,
};

/** Assist mode is offered after this many deaths on the same level. */
export const ASSIST_AFTER_DEATHS = 4;

/** Multipliers applied when assist mode is on. */
export const ASSIST = {
  crackDelay: 1.9,
  coyoteTime: 1.8,
  hazardSpeed: 0.72,
};

/** Handcrafted levels end here; beyond this the generator takes over. */
/**
 * How many handcrafted levels there are. levels.js must contain exactly this
 * many plans — the validator fails the build if the two ever disagree, which
 * is the only way a number in one file and a list in another stay honest.
 */
export const CRAFTED_LEVELS = 31;

/** Growth curve: how big the penguin is on a given level. */
export function scaleForLevel(level) {
  if (level <= 3) return 1;
  const t = Math.min(1, (level - 3) / 30);
  return +(1 + 0.62 * t).toFixed(3);
}

/**
 * The endless sink.
 *
 * Raising prices only ever *delays* the moment a player owns everything. The
 * moment still arrives, and when it does the currency dies and with it the
 * reason to pick up another fish.
 *
 * So there is one thing that never runs out. The monument is a pile of ice you
 * fund a block at a time; each block costs more than the last, and all you get
 * is a rank and a taller monument. It buys nothing and affects nothing — which
 * is exactly why it can be infinite without breaking the game.
 */
export const MONUMENT = {
  /** First block. */
  base: 500,
  /** Each block costs this much more than the last. */
  growth: 1.35,
  /** Rank names, in order. Past the end the number just keeps going. */
  ranks: [
    'Buz Parçası', 'Kar Yığını', 'Buz Sütunu', 'Sarkıt', 'Buz Kemeri',
    'Donmuş Şelale', 'Buzul Dili', 'Buz Kalesi', 'Kutup Kulesi', 'Ebedi Buzul',
  ],
};

/** What the next monument block costs at a given size. */
export function monumentCost(blocks) {
  return Math.round((MONUMENT.base * MONUMENT.growth ** blocks) / 10) * 10;
}

/** Star thresholds are per level; these are the fallbacks. */
export const STAR_RULES = {
  /** 2nd star: collect every fish. 3rd star: finish under target time. */
  defaultTarget: 30,
};

/* ------------------------------------------------------------------ */
/* Economy                                                             */
/* ------------------------------------------------------------------ */

/**
 * Fish are the currency. They come from three places, and the split matters:
 * levels pay for playing, stars pay for playing *well*, and missions pay for
 * coming back. A shop with only one income source stops mattering fast.
 */
export const REWARDS = {
  /** Per fish picked up in a level. */
  perFish: 3,
  /** The speed fish pays extra — it is harder to reach and easy to skip. */
  perBoost: 10,
  /** First time a level is cleared. */
  firstClear: 12,
  /** Per new star earned (never paid twice for the same star). */
  perStar: 8,
  /** Clearing without a single death. */
  flawless: 15,
  /** Daily challenge completion. */
  daily: 40,
  /** Bonus per consecutive day, capped. */
  streakStep: 5,
  streakCap: 50,
  /** Each of the day's objectives, the first time it is ticked off. */
  dailyObjective: 30,
};

/**
 * Shop upgrades.
 *
 * Every one of these makes the penguin better, never the level easier — the
 * level validator runs against *base* stats, so no level is ever gated behind
 * a purchase. Upgrades buy comfort and speed, not access.
 */
/**
 * The shop.
 *
 * Prices come from the economy simulator (`tests/economy.mjs`), not from feel.
 * The shape they encode: the first purchase inside five minutes so the currency
 * means something immediately, and the active gear — the only items that change
 * what the penguin can *do* — deliberately far enough away that owning one is
 * something you saved for rather than something that happened on the way past.
 */
export const UPGRADES = [
  {
    id: 'boots',
    name: 'Kar Botu',
    blurb: 'Daha yükseğe ve daha uzağa zıpla.',
    icon: 'boot',
    levels: [
      { cost: 90, effect: 0.05, label: '+%5 zıplama' },
      { cost: 320, effect: 0.1, label: '+%10 zıplama' },
      { cost: 850, effect: 0.16, label: '+%16 zıplama' },
    ],
  },
  {
    id: 'speed',
    name: 'Hızlı Ayak',
    blurb: 'Buz üstünde daha çevik koş.',
    icon: 'bolt',
    levels: [
      { cost: 85, effect: 0.05, label: '+%5 hız' },
      { cost: 300, effect: 0.1, label: '+%10 hız' },
      { cost: 800, effect: 0.15, label: '+%15 hız' },
    ],
  },
  {
    id: 'crampons',
    name: 'Krampon',
    blurb: 'Cilalı buzda kayma azalır.',
    icon: 'spike',
    levels: [
      { cost: 220, effect: 0.45, label: 'Kayma %45 az' },
      { cost: 620, effect: 0.75, label: 'Kayma %75 az' },
    ],
  },
  {
    id: 'down',
    name: 'Kalın Tüy',
    blurb: 'Her denemede bir kez ölümden kurtarır.',
    icon: 'shield',
    levels: [{ cost: 900, effect: 1, label: 'Denemede 1 can' }],
  },
  {
    id: 'magnet',
    name: 'Balık Mıknatısı',
    blurb: 'Balıklar sana doğru gelir.',
    icon: 'magnet',
    levels: [
      { cost: 260, effect: 90, label: '90px çekim' },
      { cost: 780, effect: 165, label: '165px çekim' },
    ],
  },
  {
    id: 'vest',
    name: 'Rüzgar Yeleği',
    blurb: 'Kutup rüzgarı seni daha az savurur.',
    icon: 'wind',
    levels: [{ cost: 560, effect: 0.55, label: 'Rüzgar %55 az' }],
  },
  {
    id: 'wings',
    name: 'Planör Kanat',
    blurb: 'Havada zıplamayı basılı tut — kanatlar açılır, düşüş yavaşlar.',
    icon: 'wings',
    levels: [
      { cost: 2400, effect: 1, label: '1.1 sn süzülme' },
      { cost: 5200, effect: 1.7, label: '1.9 sn süzülme' },
      { cost: 9500, effect: 2.6, label: '2.9 sn süzülme' },
    ],
  },
  {
    id: 'rocket',
    name: 'Sırt Motoru',
    blurb: 'Havadayken zıplamaya bas — motor bir kez ateşler.',
    icon: 'rocket',
    levels: [
      { cost: 3400, effect: 1, label: 'Havada 1 ateşleme' },
      { cost: 7000, effect: 2, label: 'Havada 2 ateşleme' },
    ],
  },
  {
    id: 'radar',
    name: 'Kuş Radarı',
    blurb: 'Kuş dalışa geçmeden önce daha uzun uyarı verir.',
    icon: 'radar',
    levels: [
      { cost: 1400, effect: 0.35, label: '+0.35 sn uyarı' },
      { cost: 3200, effect: 0.7, label: '+0.7 sn uyarı' },
    ],
  },
];

/** Look up the numeric effect of an owned upgrade level (0 when unowned). */
export function upgradeEffect(owned, id) {
  const spec = UPGRADES.find((u) => u.id === id);
  const lvl = owned?.[id] ?? 0;
  if (!spec || lvl <= 0) return 0;
  return spec.levels[Math.min(lvl, spec.levels.length) - 1].effect;
}
