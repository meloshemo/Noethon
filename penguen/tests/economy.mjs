/**
 * Economy simulator.
 *
 * Run with:  node tests/economy.mjs
 *
 * The question this answers is the only one that matters about a currency:
 * **how long until there is nothing left to want?** An economy that hands you
 * the whole shop in a quarter of an hour is not generous, it is over — from
 * then on every fish you pick up is worth nothing, and the shop stops being a
 * reason to play.
 *
 * So this plays the game on paper. It walks a simulated player through the
 * campaign and into endless mode, minute by minute, paying them exactly what
 * the real reward table pays, and reports when they can afford each milestone.
 *
 * The player profile is deliberately *good but not expert*: they collect most
 * fish, take most speed fish, average about two stars, and die enough to make
 * levels take a bit over twice their target time. A worse player earns less per
 * minute but also spends longer per level, which mostly cancels; an expert
 * earns more per minute but runs out of new levels sooner. The middle is the
 * number worth designing against.
 *
 * The thresholds at the bottom are the design, and they fail the build if the
 * balance drifts: the first purchase should feel close, and the last one should
 * be weeks away.
 */

import { REWARDS, UPGRADES, monumentCost } from '../src/game/config.js';
import { SKINS, TRAILS } from '../src/game/skins.js';
import { LEVELS } from '../src/game/levels.js';
import { generateLevel } from '../src/game/generator.js';
import { rollMissions } from '../src/game/missions.js';

/* ------------------------------------------------------------------ */
/* The player                                                          */
/* ------------------------------------------------------------------ */

const PLAYER = {
  /** Fraction of a level's three fish they pick up. */
  fishRate: 0.75,
  /** Fraction of runs where they take the speed fish. */
  boostRate: 0.5,
  /** Stars per level, out of three. */
  stars: 2.0,
  /** Fraction of levels cleared without a single death. */
  flawlessRate: 0.35,
  /**
   * How much longer a level takes than its target time, counting retries.
   * A target is the three-star time, so simply clearing takes longer, and
   * dying a few times on the way takes longer still.
   */
  timeFactor: 2.3,
  /** Minutes of play in a day. Past this they stop, and tomorrow's dailies wait. */
  minutesPerDay: 25,
  /** Fraction of days they finish the daily challenge and its objectives. */
  dailyRate: 0.85,
  /** Of the day's three missions, how many they typically finish. */
  missionsPerDay: 2,
};

/** What one clear of a level pays, at the current reward table. */
function payForLevel(def, first) {
  let coins = 0;
  coins += Math.round(3 * PLAYER.fishRate) * REWARDS.perFish;
  coins += PLAYER.boostRate * (def.speedFish?.length ? REWARDS.perBoost : 0);
  if (first) {
    coins += REWARDS.firstClear;
    coins += PLAYER.stars * REWARDS.perStar;
  }
  coins += PLAYER.flawlessRate * REWARDS.flawless;
  return coins;
}

/** Minutes one attempt at a level costs. */
function minutesForLevel(def) {
  return (def.target * PLAYER.timeFactor) / 60;
}

/** What a day of dailies and missions pays, once. */
function dailyPay(dayIndex) {
  let coins = 0;
  if (Math.random() < PLAYER.dailyRate) {
    const streak = Math.min(10, dayIndex + 1);
    coins += REWARDS.daily;
    coins += Math.min(REWARDS.streakCap, streak * REWARDS.streakStep);
    // Two of the four objectives on an average day.
    coins += 2 * REWARDS.dailyObjective;
  }
  const missions = rollMissions(`2026-01-${String((dayIndex % 28) + 1).padStart(2, '0')}`, {
    upgrades: { wings: 1, rocket: 1 },
  });
  coins += missions
    .slice(0, PLAYER.missionsPerDay)
    .reduce((n, m) => n + m.reward, 0);
  return coins;
}

/** The daily challenge and its objectives cost time too. */
const DAILY_MINUTES = 3.5;

/* ------------------------------------------------------------------ */
/* Milestones                                                          */
/* ------------------------------------------------------------------ */

const shopTotal = UPGRADES.reduce((n, u) => n + u.levels.reduce((m, l) => m + l.cost, 0), 0);
const cheapestShop = Math.min(...UPGRADES.map((u) => u.levels[0].cost));
const cosmeticTotal =
  [...SKINS, ...TRAILS]
    .filter((s) => s.unlock.kind === 'coins')
    .reduce((n, s) => n + s.unlock.cost, 0);

const MILESTONES = [
  { name: 'ilk market eşyası', cost: cheapestShop },
  { name: 'ilk aktif ekipman (Planör Kanat)', cost: UPGRADES.find((u) => u.id === 'wings').levels[0].cost },
  { name: 'marketin yarısı', cost: shopTotal / 2 },
  { name: 'marketteki her şey', cost: shopTotal },
  { name: 'market + satın alınabilir kozmetikler', cost: shopTotal + cosmeticTotal },
];

/* ------------------------------------------------------------------ */
/* The simulation                                                      */
/* ------------------------------------------------------------------ */

function simulate() {
  let coins = 0;
  let minutes = 0;
  let day = 0;
  let minutesToday = 0;
  let level = 1;
  const hits = new Map();

  const check = () => {
    for (const m of MILESTONES) {
      if (!hits.has(m.name) && coins >= m.cost) {
        hits.set(m.name, { minutes, day: day + 1, level });
      }
    }
  };

  // A hard stop: if a milestone is not reached in this much play it is
  // effectively unreachable, and saying so is more useful than looping.
  const LIMIT_MINUTES = 60 * 40;

  while (hits.size < MILESTONES.length && minutes < LIMIT_MINUTES) {
    // Start of a play day: the daily and its objectives come first, the way
    // people actually play — the thing with a streak on it gets done first.
    if (minutesToday === 0) {
      coins += dailyPay(day);
      minutes += DAILY_MINUTES;
      minutesToday += DAILY_MINUTES;
      check();
    }

    const def = level <= LEVELS.length ? LEVELS[level - 1] : generateLevel(level);
    const first = level <= LEVELS.length || true; // endless levels are always new
    coins += payForLevel(def, first);
    const cost = minutesForLevel(def);
    minutes += cost;
    minutesToday += cost;
    level++;
    check();

    if (minutesToday >= PLAYER.minutesPerDay) {
      day++;
      minutesToday = 0;
    }
  }

  return { hits, minutes, day: day + 1, level, coins };
}

/* ------------------------------------------------------------------ */

const RUNS = 200;
const totals = new Map();
let lastLevel = 0;

for (let i = 0; i < RUNS; i++) {
  const r = simulate();
  lastLevel = Math.max(lastLevel, r.level);
  for (const [name, at] of r.hits) {
    if (!totals.has(name)) totals.set(name, []);
    totals.get(name).push(at);
  }
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

console.log('Ekonomi simülasyonu\n');
console.log(`  Oyuncu profili: bölümlerin %${PLAYER.fishRate * 100}'ini toplayan,`);
console.log(`  ortalama ${PLAYER.stars} yıldız alan, günde ${PLAYER.minutesPerDay} dakika oynayan biri.\n`);
console.log(`  Market toplamı        : ${shopTotal} balık`);
console.log(`  Kozmetik toplamı      : ${cosmeticTotal} balık`);
console.log(`  En ucuz market eşyası : ${cheapestShop} balık\n`);

const rows = [];
for (const m of MILESTONES) {
  const hitsFor = totals.get(m.name);
  if (!hitsFor?.length) {
    rows.push({ name: m.name, minutes: Infinity, days: Infinity, level: 0 });
    console.log(`  ${m.name.padEnd(42)} ulaşılamadı (40 saat oynandı)`);
    continue;
  }
  const mins = median(hitsFor.map((h) => h.minutes));
  const days = median(hitsFor.map((h) => h.day));
  const lvl = median(hitsFor.map((h) => h.level));
  rows.push({ name: m.name, minutes: mins, days, level: lvl });
  const t = mins < 90 ? `${Math.round(mins)} dk` : `${(mins / 60).toFixed(1)} saat`;
  console.log(`  ${m.name.padEnd(42)} ${t.padStart(9)}   ·   ${days} gün   ·   bölüm ${lvl}`);
}

/* ------------------------------------------------------------------ */
/* The design, as assertions                                           */
/* ------------------------------------------------------------------ */

const problems = [];
const find = (name) => rows.find((r) => r.name === name);

// The first purchase has to feel close, or the currency never means anything.
const first = find('ilk market eşyası');
if (first.minutes > 12) problems.push(`İlk eşya çok geç: ${Math.round(first.minutes)} dk (en fazla 12 dk olmalı)`);
if (first.minutes < 3) problems.push(`İlk eşya çok erken: ${Math.round(first.minutes)} dk (en az 3 dk olmalı)`);

// The active gear is the first real goal, and should be worth saving for.
const gear = find('ilk aktif ekipman (Planör Kanat)');
if (gear.minutes < 90) problems.push(`Planör Kanat çok ucuz: ${Math.round(gear.minutes)} dk (en az 90 dk olmalı)`);

// Half the shop is the mid-game. Reaching it in one sitting is too fast.
const half = find('marketin yarısı');
if (half.minutes < 60 * 8) problems.push(`Marketin yarısı çok hızlı: ${(half.minutes / 60).toFixed(1)} saat (en az 8 saat olmalı)`);

// And the whole thing should be a long-term goal measured in weeks of play,
// not an afternoon. This is the assertion the whole file exists for.
const all = find('marketteki her şey');
if (all.minutes < 60 * 20) {
  problems.push(`Market çok çabuk bitiyor: ${(all.minutes / 60).toFixed(1)} saat (en az 20 saat olmalı)`);
}
if (all.days < 40) problems.push(`Market ${all.days} günde bitiyor (en az 40 gün olmalı)`);

// And the point of the monument: even a player who owns literally everything
// still has somewhere to put a fish. This is the assertion that says the
// economy never actually ends.
const blocks = 40;
const monumentTotal = Array.from({ length: blocks }, (_, i) => monumentCost(i)).reduce((a, b) => a + b, 0);
if (monumentTotal < 60_000_000) {
  problems.push(`Anıt yeterince derin değil: ${blocks} blok = ${monumentTotal} balık`);
}
console.log(`  Anıtın ilk ${blocks} bloğu: ${monumentTotal.toLocaleString('tr-TR')} balık — pratikte bitmez.`);

console.log('');
if (problems.length) {
  console.error(`✗ ${problems.length} denge sorunu\n`);
  for (const p of problems) console.error('   ' + p);
  process.exit(1);
}
console.log('✓ Ekonomi dengeli: ilk alım yakın, son alım uzak.');
