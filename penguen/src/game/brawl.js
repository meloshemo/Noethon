/**
 * Chapter IV — Kar Topu.
 *
 * Fifteen arenas, and the chapter with the fewest rules in the game: rival
 * penguins throw snowballs at where you were standing, a snowball stops at the
 * first thing it touches, and the way out is shut while anybody is guarding it.
 * There is nothing else. No throw button, no new key, nothing to pick up.
 *
 * The answer is always the same shape and never the same place: get a guard
 * between yourself and a thrower, then be somewhere else when it lands.
 */

import { Arena } from './arena.js';
import { scaleForLevel, menaceFor} from './config.js';

/** The snowball fight starts here, straight out of the sea. */
export const BRAWL_FROM = 62;

/**
 * `heat` is the chapter's difficulty curve, written down.
 *
 * A multiple of the gap between throws, so below one is faster. Everything else
 * about an arena is a shape and shapes do not have degrees — a line either
 * exists or it does not — which makes cadence the one dial that can be turned
 * without turning an answer into a coin flip.
 */
const BRAWL_PLANS = [
  {
    name: 'Kapıdaki',
    subtitle: 'Yolu bir penguen tutuyor',
    en: { name: 'The One in the Doorway', subtitle: 'A penguin is holding the way' },
    target: 30,
    heat: 1.15,
    build: (a) => {
      a.sign('Yukarıdaki sana atıyor.\nAradaki penguenin arkasına geç.');
      a.duel({ guardAt: 0.52, guardUp: 0.18, standAt: 0.2, shooterUp: 0.34 });
      a.scatterFish(3);
    },
  },
  {
    name: 'İki Kapıcı',
    subtitle: 'İkisi de düşecek',
    en: { name: 'Two Doorkeepers', subtitle: 'Both of them go down' },
    target: 42,
    heat: 1.08,
    build: (a) => {
      a.duel({ guardAt: 0.38, guardUp: 0.17, standAt: 0.12, shooterUp: 0.32 });
      a.duel({ guardAt: 0.62, guardUp: 0.22, standAt: 0.88, shooterUp: 0.4, phase: 0.5 });
      a.scatterFish(3);
    },
  },
  {
    name: 'Tepedeki',
    subtitle: 'Biri sadece sana atıyor',
    en: { name: 'The One on Top', subtitle: 'One of them only throws at you' },
    target: 46,
    heat: 1.02,
    build: (a) => {
      a.duel({ guardAt: 0.46, guardUp: 0.19, standAt: 0.16, shooterUp: 0.36 });
      a.heckler({ at: 0.72, up: 0.52, phase: 0.3 });
      /* The first snow bank in the game, on the level whose whole subject is
         somebody who never stops throwing at you.
         Standing behind it is the obvious move and it is the wrong one: the
         heckler's own shots take it down, three of them, and the safest place
         on the level is the place that is running out. It teaches the verb by
         punishing the instinct. */
      a.bank({ at: 0.34 });
      a.scatterFish(3);
      a.fishAt(0.3, 0.24, 'speed');
    },
  },
  {
    name: 'Kaya',
    subtitle: 'Her yerden hat yok',
    en: { name: 'The Rock', subtitle: 'There is no line from everywhere' },
    target: 50,
    heat: 0.96,
    build: (a) => {
      a.duel({ guardAt: 0.36, guardUp: 0.18, standAt: 0.1, shooterUp: 0.34 });
      a.duel({ guardAt: 0.64, guardUp: 0.24, standAt: 0.9, shooterUp: 0.42, phase: 0.45 });
      a.pillar({ at: 0.24, w: 40, h: 110 });
      // The first lobber, on the level named after the rock.
      //
      // This level's whole lesson used to be "there is no line from
      // everywhere", and a player who learned it went and stood behind the
      // pillar and stayed there. The lesson is now the harder half of the same
      // sentence: there is no line from everywhere, and there is no *safe
      // place* either. This one throws over the rock.
      //
      // It is slow, deliberately. An arc takes twice as long as a flat shot,
      // so the thing that takes away the free answer hands back the seconds to
      // deal with it — and its whole path is drawn while it winds up.
      a.lobber({ at: 0.16, up: 0.44, phase: 0.25 });
      a.scatterFish(3);
    },
  },
  {
    name: 'İnce Buz',
    subtitle: 'Durup bekleyemezsin',
    en: { name: 'Thin Ice', subtitle: 'You cannot stand and wait' },
    target: 54,
    heat: 0.9,
    build: (a) => {
      a.duel({ guardAt: 0.4, guardUp: 0.19, standAt: 0.13, shooterUp: 0.36 });
      a.duel({ guardAt: 0.66, guardUp: 0.25, standAt: 0.9, shooterUp: 0.43, phase: 0.5 });
      a.thinIce({ at: 0.13, w: 170 });
      // Thin ice takes away standing still; this takes away the corner you were
      // standing still *in*. Measured, the arena had a spot nothing reached, and
      // an arena with a spot nothing reaches is a corridor with decoration.
      a.heckler({ at: 0.86, up: 0.6, phase: 0.3 });
      a.heckler({ at: 0.52, up: 0.56, phase: 0.2 });
      a.scatterFish(3);
      // Slack, over the thin ice.
      //
      // This chapter is one long argument about time: every rival is a clock
      // and the only safe place is between two of them. Slack does not make
      // the snowballs miss, it makes the space between two beats wide enough
      // to walk through — but only while you are off the ice, which on a level
      // where the ice is going anyway is a very odd promise to make.
      a.charged(0.2, 'slack', 0.36);
    },
  },
  {
    name: 'Üç Kapıcı',
    subtitle: 'Sıra kimde?',
    en: { name: 'Three Doorkeepers', subtitle: 'Whose turn is it?' },
    target: 62,
    heat: 0.85,
    build: (a) => {
      a.duel({ guardAt: 0.3, guardUp: 0.16, standAt: 0.06, shooterUp: 0.32 });
      a.duel({ guardAt: 0.52, guardUp: 0.22, standAt: 0.86, shooterUp: 0.4, phase: 0.33 });
      a.duel({ guardAt: 0.66, guardUp: 0.26, standAt: 0.34, shooterUp: 0.46, phase: 0.66 });
      /* Three shots to line up and one square you cannot linger on.
         The level's own question is "whose turn is it" — three guards, three
         stand-spots, and the answer is a route around them. The ceiling now
         has an opinion about the middle of that route: it is the shortest way
         between the first spot and the last, and it is the one place on the
         level where waiting for a phase is free. It is not free any more. */
      a.icefall({ at: 0.46 });
      a.scatterFish(3);
      a.checkpointAt(0.3);
    },
  },
  {
    name: 'Çapraz Ateş',
    subtitle: 'İki taraftan birden',
    en: { name: 'Crossfire', subtitle: 'From both sides at once' },
    target: 66,
    heat: 0.86,
    build: (a) => {
      a.duel({ guardAt: 0.34, guardUp: 0.18, standAt: 0.08, shooterUp: 0.34 });
      a.duel({ guardAt: 0.66, guardUp: 0.24, standAt: 0.92, shooterUp: 0.42, phase: 0.4 });
      a.heckler({ at: 0.5, up: 0.6, phase: 0.15 });
      // Crossfire used to have a hole in the middle of it: two lines crossing
      // leaves a spot where neither one is, and the level's own name promised
      // something it did not deliver. A block of rock in the centre and a
      // thrower who arcs over it close that spot from both directions at once
      // — one owns the open floor, the other owns the shadow behind the rock,
      // and the only ground left is the ground you are crossing.
      a.pillar({ at: 0.5, w: 38, h: 108 });
      a.lobber({ at: 0.5, up: 0.36, phase: 0.7 });
      a.scatterFish(3);
      a.fishAt(0.5, 0.16, 'speed');
    },
  },
  {
    name: 'Dar Alan',
    subtitle: 'Kaçacak yer az',
    en: { name: 'Tight Ground', subtitle: 'Little room to move' },
    target: 70,
    heat: 0.75,
    build: (a) => {
      a.duel({ guardAt: 0.38, guardUp: 0.19, standAt: 0.11, shooterUp: 0.36 });
      a.duel({ guardAt: 0.68, guardUp: 0.25, standAt: 0.92, shooterUp: 0.43, phase: 0.5 });
      a.pillar({ at: 0.22, w: 36, h: 100 });
      a.pillar({ at: 0.8, w: 36, h: 92 });
      // Two pillars and two lobbers, one over each. Between them the arena has
      // no standing answer left at all: the flat throwers own the open floor,
      // the arcs own the cover, and the only thing that works is to keep
      // moving between the two — which is what this level is called.
      a.lobber({ at: 0.3, up: 0.5, phase: 0.15 });
      a.lobber({ at: 0.74, up: 0.46, phase: 0.65 });
      a.scatterFish(3);
    },
  },
  {
    name: 'Sabırsızlar',
    subtitle: 'Daha hızlı atıyorlar',
    en: { name: 'The Impatient', subtitle: 'They throw faster' },
    target: 74,
    heat: 0.7,
    build: (a) => {
      a.duel({ guardAt: 0.36, guardUp: 0.18, standAt: 0.1, shooterUp: 0.35, period: 1.9 });
      a.duel({ guardAt: 0.64, guardUp: 0.24, standAt: 0.9, shooterUp: 0.42, period: 2.0, phase: 0.5 });
      a.heckler({ at: 0.5, up: 0.58, period: 1.7, phase: 0.25 });
      a.scatterFish(3);
      // The blink, in the middle of the crossfire.
      //
      // Everything on this level throws faster than you can walk between
      // throws. A blink is three and a bit bodies of ground that costs no
      // time at all, and there is exactly one of them, so it buys one gap and
      // then you are back to walking.
      a.charged(0.5, 'quantum', 0.4);
    },
  },
  {
    name: 'Dört Kapı',
    subtitle: 'Uzun bir sıra',
    en: { name: 'Four Doors', subtitle: 'A long queue' },
    target: 82,
    heat: 0.78,
    build: (a) => {
      a.duel({ guardAt: 0.28, guardUp: 0.16, standAt: 0.05, shooterUp: 0.32 });
      a.duel({ guardAt: 0.46, guardUp: 0.21, standAt: 0.76, shooterUp: 0.38, phase: 0.25 });
      a.duel({ guardAt: 0.62, guardUp: 0.26, standAt: 0.92, shooterUp: 0.44, phase: 0.5 });
      a.duel({ guardAt: 0.74, guardUp: 0.31, standAt: 0.44, shooterUp: 0.5, phase: 0.75 });
      // A queue this long has an end, and the end was somewhere to hide. Not
      // any more: this one is not guarding a door, it is watching the corner.
      a.heckler({ at: 0.16, up: 0.58, phase: 0.6 });
      /* One place to stop and read the queue, and it lasts three shots.
         A level of four doors is a level of four decisions taken in a row with
         no gap between them; the bank is the gap, and buying it costs it. */
      a.bank({ at: 0.52 });
      a.scatterFish(3);
      /* Four doors, and the ceiling has an opinion about the near end.
         It was over the middle first and the solver could not win: the
         middle *is* this level's answer to all four doors, and hanging ice
         on the only answer is not difficulty, it is a locked door. Moved to
         the approach, it shapes the run without closing it. */
      a.icefall({ at: 0.3, up: 0.62 });
      a.checkpointAt(0.26);
    },
  },
  {
    name: 'Buzul Ağzı',
    subtitle: 'Kaya, ince buz, ve onlar',
    en: { name: 'The Glacier\'s Mouth', subtitle: 'Rock, thin ice, and them' },
    target: 86,
    heat: 0.62,
    build: (a) => {
      a.duel({ guardAt: 0.32, guardUp: 0.17, standAt: 0.07, shooterUp: 0.33 });
      a.duel({ guardAt: 0.54, guardUp: 0.23, standAt: 0.84, shooterUp: 0.4, phase: 0.4 });
      a.duel({ guardAt: 0.72, guardUp: 0.29, standAt: 0.44, shooterUp: 0.47, phase: 0.7 });
      a.pillar({ at: 0.2, w: 38, h: 104 });
      a.thinIce({ at: 0.62, w: 160 });
      a.scatterFish(3);
      a.fishAt(0.86, 0.3, 'speed');
      /* The arena's own rotten fish.
         The wind-up is this chapter's entire fairness: the arm goes back, the
         line is drawn, and you have that long to not be standing on it. This
         one shortens it — the rivals do not throw harder or more often, they
         find the range sooner, so the cover you picked on the old timing stops
         being cover. Every other bait in the game is about the penguin; this
         is the first that is about the level. */
      a.fishAt(0.44, 0.26, 'marked');
    },
  },
  {
    name: 'Gözcüler',
    subtitle: 'Üç tanesi sadece bekliyor',
    en: { name: 'The Watchers', subtitle: 'Three of them are only waiting' },
    target: 88,
    heat: 0.58,
    build: (a) => {
      a.duel({ guardAt: 0.38, guardUp: 0.19, standAt: 0.11, shooterUp: 0.36 });
      a.duel({ guardAt: 0.66, guardUp: 0.25, standAt: 0.92, shooterUp: 0.43, phase: 0.5 });
      a.heckler({ at: 0.5, up: 0.62, phase: 0.1 });
      a.heckler({ at: 0.5, up: 0.4, phase: 0.4 });
      // The third watcher is the one that changes the level. Two flat lines
      // and a rock is a puzzle with an answer; two flat lines, a rock, and
      // somebody dropping them in behind it is a puzzle whose answer keeps
      // moving. This is the last arena before the two that end the game, and
      // it is where the player should stop believing in safe corners.
      a.pillar({ at: 0.8, w: 36, h: 100 });
      a.lobber({ at: 0.84, up: 0.6, phase: 0.75 });
      a.scatterFish(3);
    },
  },
  {
    name: 'Aynı Anda',
    subtitle: 'Hepsi birlikte atıyor',
    en: { name: 'All at Once', subtitle: 'They all throw together' },
    target: 92,
    heat: 0.54,
    build: (a) => {
      a.duel({ guardAt: 0.3, guardUp: 0.17, standAt: 0.06, shooterUp: 0.33, phase: 0 });
      a.duel({ guardAt: 0.54, guardUp: 0.23, standAt: 0.84, shooterUp: 0.4, phase: 0 });
      a.duel({ guardAt: 0.72, guardUp: 0.29, standAt: 0.44, shooterUp: 0.47, phase: 0 });
      a.heckler({ at: 0.5, up: 0.6, phase: 0 });
      a.scatterFish(3);
      // A coil on the level where every rival throws on the same beat.
      //
      // When everything arrives at once there is no gap to walk into, only a
      // volley to be above. The coil clears it. What the level does not tell
      // you is that the spring goes off by itself if you sit on it, and a
      // penguin flung upward on somebody else's count comes down on it too.
      a.charged(0.42, 'coil', 0.44);
      /* Two banks, on the level where every rival throws on the same beat.
         A volley that arrives together also *lands* together, so cover here
         does not erode, it is demolished — one salvo per bank. They are two
         breaths, taken one at a time, and after the second one there is
         nothing between you and the count. */
      a.bank({ at: 0.22 });
      a.bank({ at: 0.64 });
      a.checkpointAt(0.34);
    },
  },
  {
    name: 'Kalabalık',
    subtitle: 'Beş kapıcı, iki gözcü',
    en: { name: 'The Crowd', subtitle: 'Five keepers, two watchers' },
    target: 104,
    heat: 0.6,
    build: (a) => {
      a.duel({ guardAt: 0.26, guardUp: 0.15, standAt: 0.04, shooterUp: 0.3 });
      a.duel({ guardAt: 0.4, guardUp: 0.2, standAt: 0.68, shooterUp: 0.36, phase: 0.2 });
      a.duel({ guardAt: 0.56, guardUp: 0.25, standAt: 0.86, shooterUp: 0.42, phase: 0.4 });
      a.duel({ guardAt: 0.68, guardUp: 0.3, standAt: 0.4, shooterUp: 0.47, phase: 0.6 });
      a.duel({ guardAt: 0.8, guardUp: 0.35, standAt: 0.52, shooterUp: 0.53, phase: 0.8 });
      a.heckler({ at: 0.5, up: 0.66, phase: 0.15 });
      a.heckler({ at: 0.92, up: 0.5, phase: 0.55 });
      a.scatterFish(3);
      a.checkpointAt(0.22);
    },
  },
  {
    name: 'Koloninin Sonu',
    subtitle: 'Bütün koloni yolunu kesti',
    en: { name: 'The Colony\'s End', subtitle: 'The whole colony blocked the way' },
    target: 116,
    heat: 0.45,
    build: (a) => {
      a.duel({ guardAt: 0.26, guardUp: 0.15, standAt: 0.04, shooterUp: 0.3, period: 2.2 });
      a.duel({ guardAt: 0.4, guardUp: 0.2, standAt: 0.68, shooterUp: 0.36, period: 2.2, phase: 0.2 });
      a.duel({ guardAt: 0.55, guardUp: 0.25, standAt: 0.86, shooterUp: 0.42, period: 2.2, phase: 0.4 });
      a.duel({ guardAt: 0.68, guardUp: 0.3, standAt: 0.38, shooterUp: 0.47, period: 2.2, phase: 0.6 });
      a.duel({ guardAt: 0.8, guardUp: 0.35, standAt: 0.52, shooterUp: 0.53, period: 2.2, phase: 0.8 });
      a.heckler({ at: 0.5, up: 0.68, period: 1.9, phase: 0.1 });
      a.heckler({ at: 0.92, up: 0.54, period: 1.9, phase: 0.45 });
      a.pillar({ at: 0.16, w: 36, h: 96 });
      // And one arc in the last fight of the game, over the one piece of cover
      // in it. Five throwers on the same clock make standing still lethal
      // already; this makes hiding lethal too.
      a.lobber({ at: 0.34, up: 0.6, period: 2.4, phase: 0.3 });
      a.thinIce({ at: 0.7, w: 150 });
      a.scatterFish(3);
      a.fishAt(0.6, 0.34, 'speed');
      // The last level in the game puts all three in the air at once, over an
      // arena with five rivals on one clock. Every one of them is reachable
      // and none of them is on the way to anywhere. Whatever a player has
      // learned about these fish in fifty levels, this is where they get to
      // find out whether they were right.
      a.charged(0.24, 'coil', 0.46);
      a.charged(0.5, 'quantum', 0.52);
      a.charged(0.78, 'slack', 0.46);
      /* The last arena in the game, and the last word is not a thrower.
         Two of them, over the two places a player instinctively backs
         into when the shooting starts: the corners. There is nowhere on
         this level that is safe for as long as you would like. */
      a.icefall({ at: 0.22, up: 0.58 });
      a.icefall({ at: 0.8, up: 0.64 });
      a.checkpointAt(0.2);
    },
  },
];

function composeArena(plan, id) {
  const scale = scaleForLevel(id);
  const a = new Arena({ scale, width: plan.width ?? 1500, height: plan.height ?? 580, heat: plan.heat });
  a.ground();
  try {
    plan.build(a);
  } catch (err) {
    throw new Error(`${id}. ${plan.name}: ${err.message}`);
  }
  try {
    const def = a.build({
      id,
      name: plan.name,
      subtitle: plan.subtitle,
      en: plan.en,
      target: plan.target,
      ship: plan.ship,
    });
    def.menace = menaceFor((id - BRAWL_FROM) / (BRAWL_PLANS.length - 1));
    return def;
  } catch (err) {
    throw new Error(`${id}. ${plan.name}: ${err.message}`);
  }
}

/** Every plan, shipped or not — the solver's `--all` mode wants these. */
export const BRAWL_DRAFTS = BRAWL_PLANS.map((p, i) => composeArena(p, BRAWL_FROM + i));

/** What the game sees: plans that pass, numbered consecutively. */
export const BRAWL_LEVELS = BRAWL_PLANS.filter((p) => p.ship !== false).map((p, i) =>
  composeArena(p, BRAWL_FROM + i),
);
