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
import { scaleForLevel } from './config.js';

/** The snowball fight starts here, straight out of the sea. */
export const BRAWL_FROM = 62;

const BRAWL_PLANS = [
  {
    name: 'Kapıdaki',
    subtitle: 'Yolu bir penguen tutuyor',
    en: { name: 'The One in the Doorway', subtitle: 'A penguin is holding the way' },
    target: 30,
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
    build: (a) => {
      a.duel({ guardAt: 0.46, guardUp: 0.19, standAt: 0.16, shooterUp: 0.36 });
      a.heckler({ at: 0.72, up: 0.52, phase: 0.3 });
      a.scatterFish(3);
      a.fishAt(0.3, 0.24, 'speed');
    },
  },
  {
    name: 'Kaya',
    subtitle: 'Her yerden hat yok',
    en: { name: 'The Rock', subtitle: 'There is no line from everywhere' },
    target: 50,
    build: (a) => {
      a.duel({ guardAt: 0.36, guardUp: 0.18, standAt: 0.1, shooterUp: 0.34 });
      a.duel({ guardAt: 0.64, guardUp: 0.24, standAt: 0.9, shooterUp: 0.42, phase: 0.45 });
      a.pillar({ at: 0.24, w: 40, h: 110 });
      a.scatterFish(3);
    },
  },
  {
    name: 'İnce Buz',
    subtitle: 'Durup bekleyemezsin',
    en: { name: 'Thin Ice', subtitle: 'You cannot stand and wait' },
    target: 54,
    build: (a) => {
      a.duel({ guardAt: 0.4, guardUp: 0.19, standAt: 0.13, shooterUp: 0.36 });
      a.duel({ guardAt: 0.66, guardUp: 0.25, standAt: 0.9, shooterUp: 0.43, phase: 0.5 });
      a.thinIce({ at: 0.13, w: 170 });
      a.heckler({ at: 0.52, up: 0.56, phase: 0.2 });
      a.scatterFish(3);
    },
  },
  {
    name: 'Üç Kapıcı',
    subtitle: 'Sıra kimde?',
    en: { name: 'Three Doorkeepers', subtitle: 'Whose turn is it?' },
    target: 62,
    build: (a) => {
      a.duel({ guardAt: 0.3, guardUp: 0.16, standAt: 0.06, shooterUp: 0.32 });
      a.duel({ guardAt: 0.52, guardUp: 0.22, standAt: 0.86, shooterUp: 0.4, phase: 0.33 });
      a.duel({ guardAt: 0.66, guardUp: 0.26, standAt: 0.34, shooterUp: 0.46, phase: 0.66 });
      a.scatterFish(3);
      a.checkpointAt(0.3);
    },
  },
  {
    name: 'Çapraz Ateş',
    subtitle: 'İki taraftan birden',
    en: { name: 'Crossfire', subtitle: 'From both sides at once' },
    target: 66,
    build: (a) => {
      a.duel({ guardAt: 0.34, guardUp: 0.18, standAt: 0.08, shooterUp: 0.34 });
      a.duel({ guardAt: 0.66, guardUp: 0.24, standAt: 0.92, shooterUp: 0.42, phase: 0.4 });
      a.heckler({ at: 0.5, up: 0.6, phase: 0.15 });
      a.heckler({ at: 0.5, up: 0.36, phase: 0.7 });
      a.scatterFish(3);
      a.fishAt(0.5, 0.16, 'speed');
    },
  },
  {
    name: 'Dar Alan',
    subtitle: 'Kaçacak yer az',
    en: { name: 'Tight Ground', subtitle: 'Little room to move' },
    target: 70,
    build: (a) => {
      a.duel({ guardAt: 0.38, guardUp: 0.19, standAt: 0.11, shooterUp: 0.36 });
      a.duel({ guardAt: 0.68, guardUp: 0.25, standAt: 0.92, shooterUp: 0.43, phase: 0.5 });
      a.pillar({ at: 0.22, w: 36, h: 100 });
      a.pillar({ at: 0.8, w: 36, h: 92 });
      a.scatterFish(3);
    },
  },
  {
    name: 'Sabırsızlar',
    subtitle: 'Daha hızlı atıyorlar',
    en: { name: 'The Impatient', subtitle: 'They throw faster' },
    target: 74,
    build: (a) => {
      a.duel({ guardAt: 0.36, guardUp: 0.18, standAt: 0.1, shooterUp: 0.35, period: 1.9 });
      a.duel({ guardAt: 0.64, guardUp: 0.24, standAt: 0.9, shooterUp: 0.42, period: 2.0, phase: 0.5 });
      a.heckler({ at: 0.5, up: 0.58, period: 1.7, phase: 0.25 });
      a.scatterFish(3);
    },
  },
  {
    name: 'Dört Kapı',
    subtitle: 'Uzun bir sıra',
    en: { name: 'Four Doors', subtitle: 'A long queue' },
    target: 82,
    build: (a) => {
      a.duel({ guardAt: 0.28, guardUp: 0.16, standAt: 0.05, shooterUp: 0.32 });
      a.duel({ guardAt: 0.46, guardUp: 0.21, standAt: 0.76, shooterUp: 0.38, phase: 0.25 });
      a.duel({ guardAt: 0.62, guardUp: 0.26, standAt: 0.92, shooterUp: 0.44, phase: 0.5 });
      a.duel({ guardAt: 0.74, guardUp: 0.31, standAt: 0.44, shooterUp: 0.5, phase: 0.75 });
      a.scatterFish(3);
      a.checkpointAt(0.26);
    },
  },
  {
    name: 'Buzul Ağzı',
    subtitle: 'Kaya, ince buz, ve onlar',
    en: { name: 'The Glacier\'s Mouth', subtitle: 'Rock, thin ice, and them' },
    target: 86,
    build: (a) => {
      a.duel({ guardAt: 0.32, guardUp: 0.17, standAt: 0.07, shooterUp: 0.33 });
      a.duel({ guardAt: 0.54, guardUp: 0.23, standAt: 0.84, shooterUp: 0.4, phase: 0.4 });
      a.duel({ guardAt: 0.72, guardUp: 0.29, standAt: 0.44, shooterUp: 0.47, phase: 0.7 });
      a.pillar({ at: 0.2, w: 38, h: 104 });
      a.thinIce({ at: 0.62, w: 160 });
      a.scatterFish(3);
      a.fishAt(0.86, 0.3, 'speed');
    },
  },
  {
    name: 'Gözcüler',
    subtitle: 'Üç tanesi sadece bekliyor',
    en: { name: 'The Watchers', subtitle: 'Three of them are only waiting' },
    target: 88,
    build: (a) => {
      a.duel({ guardAt: 0.38, guardUp: 0.19, standAt: 0.11, shooterUp: 0.36 });
      a.duel({ guardAt: 0.66, guardUp: 0.25, standAt: 0.92, shooterUp: 0.43, phase: 0.5 });
      a.heckler({ at: 0.5, up: 0.62, phase: 0.1 });
      a.heckler({ at: 0.5, up: 0.4, phase: 0.4 });
      a.heckler({ at: 0.84, up: 0.6, phase: 0.75 });
      a.scatterFish(3);
    },
  },
  {
    name: 'Aynı Anda',
    subtitle: 'Hepsi birlikte atıyor',
    en: { name: 'All at Once', subtitle: 'They all throw together' },
    target: 92,
    build: (a) => {
      a.duel({ guardAt: 0.3, guardUp: 0.17, standAt: 0.06, shooterUp: 0.33, phase: 0 });
      a.duel({ guardAt: 0.54, guardUp: 0.23, standAt: 0.84, shooterUp: 0.4, phase: 0 });
      a.duel({ guardAt: 0.72, guardUp: 0.29, standAt: 0.44, shooterUp: 0.47, phase: 0 });
      a.heckler({ at: 0.5, up: 0.6, phase: 0 });
      a.scatterFish(3);
      a.checkpointAt(0.34);
    },
  },
  {
    name: 'Kalabalık',
    subtitle: 'Beş kapıcı, iki gözcü',
    en: { name: 'The Crowd', subtitle: 'Five keepers, two watchers' },
    target: 104,
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
    build: (a) => {
      a.duel({ guardAt: 0.26, guardUp: 0.15, standAt: 0.04, shooterUp: 0.3, period: 2.2 });
      a.duel({ guardAt: 0.4, guardUp: 0.2, standAt: 0.68, shooterUp: 0.36, period: 2.2, phase: 0.2 });
      a.duel({ guardAt: 0.55, guardUp: 0.25, standAt: 0.86, shooterUp: 0.42, period: 2.2, phase: 0.4 });
      a.duel({ guardAt: 0.68, guardUp: 0.3, standAt: 0.38, shooterUp: 0.47, period: 2.2, phase: 0.6 });
      a.duel({ guardAt: 0.8, guardUp: 0.35, standAt: 0.52, shooterUp: 0.53, period: 2.2, phase: 0.8 });
      a.heckler({ at: 0.5, up: 0.68, period: 1.9, phase: 0.1 });
      a.heckler({ at: 0.92, up: 0.54, period: 1.9, phase: 0.45 });
      a.pillar({ at: 0.16, w: 36, h: 96 });
      a.thinIce({ at: 0.7, w: 150 });
      a.scatterFish(3);
      a.fishAt(0.6, 0.34, 'speed');
      a.checkpointAt(0.2);
    },
  },
];

function composeArena(plan, id) {
  const scale = scaleForLevel(id);
  const a = new Arena({ scale, width: plan.width ?? 1500, height: plan.height ?? 580 });
  a.ground();
  try {
    plan.build(a);
  } catch (err) {
    throw new Error(`${id}. ${plan.name}: ${err.message}`);
  }
  try {
    return a.build({
      id,
      name: plan.name,
      subtitle: plan.subtitle,
      en: plan.en,
      target: plan.target,
      ship: plan.ship,
    });
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
