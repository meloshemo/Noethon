/**
 * Chapter III — Buz Altı.
 *
 * Fifteen dives, written as plans rather than as coordinates: a plan says what
 * the level *asks*, the composer works out where the ice has to be for that
 * question to have an answer, and two test passes refuse anything it got wrong.
 *
 * The chapter is deliberately the shortest to explain of the three. Hold the
 * button to go down, let go to come up, and find the next hole before your
 * lungs do. Everything after that is arrangement.
 */

import { Deep } from './deep.js';
import { scaleForLevel } from './config.js';

/** The dives start here, straight off the summit of the mountain. */
export const DIVE_FROM = 47;

const DIVE_PLANS = [
  {
    name: 'İlk Nefes',
    subtitle: 'Buzun altı sessiz',
    target: 34,
    depth: 500,
    build: (d) => {
      d.mouth();
      d.open({ len: 340 });
      d.gate({ at: 0.55, gap: 200 });
      d.open({ len: 300 });
      d.gate({ at: 0.4, gap: 200 });
      d.hole();
      d.open({ len: 300 });
      d.gate({ at: 0.6, gap: 190 });
      d.surfaceOut();
      d.scatterFish(3);
      d.checkpointAt(5);
    },
  },
  {
    name: 'Aşağı Bas',
    subtitle: 'Yukarısı bedava, aşağısı değil',
    target: 38,
    depth: 540,
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.75, gap: 175 });
      d.open({ len: 260 });
      d.gate({ at: 0.25, gap: 175 });
      d.hole();
      d.gate({ at: 0.78, gap: 170 });
      d.open({ len: 240 });
      d.gate({ at: 0.3, gap: 170 });
      d.surfaceOut();
      d.scatterFish(3);
      d.fishAt(3, 70, 'speed');
      d.checkpointAt(4);
    },
  },
  {
    name: 'Dar Geçit',
    subtitle: 'Buz sarkıyor',
    target: 42,
    depth: 560,
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.6, gap: 150 });
      d.gate({ at: 0.35, gap: 150 });
      d.hole();
      d.gate({ at: 0.7, gap: 140 });
      d.gate({ at: 0.4, gap: 140 });
      d.open({ len: 280 });
      d.gate({ at: 0.62, gap: 140 });
      d.surfaceOut();
      d.scatterFish(3);
      d.checkpointAt(4);
    },
  },
  {
    name: 'Uzun Soluk',
    subtitle: 'Bir sonraki delik uzakta',
    target: 46,
    depth: 560,
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.5, gap: 170 });
      d.open({ len: 360 });
      d.gate({ at: 0.72, gap: 165 });
      d.open({ len: 320 });
      d.gate({ at: 0.3, gap: 165 });
      d.open({ len: 240 });
      d.hole();
      d.gate({ at: 0.55, gap: 160 });
      d.open({ len: 300 });
      d.surfaceOut();
      d.scatterFish(3);
      d.fishAt(4, 60, 'speed');
      d.checkpointAt(7);
    },
  },
  {
    name: 'Deniz Leoparı',
    subtitle: 'Yalnız değilsin',
    target: 48,
    depth: 560,
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.5, gap: 180 });
      d.open({ len: 380 });
      d.seal({ span: 260 });
      d.gate({ at: 0.68, gap: 165 });
      d.hole();
      d.open({ len: 360 });
      d.seal({ span: 280, speed: 148 });
      d.gate({ at: 0.34, gap: 165 });
      d.open({ len: 300 });
      d.surfaceOut();
      d.scatterFish(3);
      d.checkpointAt(5);
    },
  },
  {
    name: 'Akıntı',
    subtitle: 'Su seni taşıyor',
    target: 50,
    depth: 580,
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.55, gap: 175 });
      d.open({ len: 320 });
      d.current({ power: 150, band: 0.55 });
      d.gate({ at: 0.3, gap: 170 });
      d.hole();
      d.open({ len: 320 });
      d.current({ power: -160, band: 0.6 });
      d.gate({ at: 0.7, gap: 170 });
      d.open({ len: 280 });
      d.surfaceOut();
      d.scatterFish(3);
      d.fishAt(6, 60, 'speed');
      d.checkpointAt(5);
    },
  },
  {
    name: 'Testere Dişi',
    subtitle: 'Yukarı, aşağı, yukarı',
    target: 52,
    depth: 580,
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.75, gap: 155 });
      d.gate({ at: 0.25, gap: 155 });
      d.hole();
      d.gate({ at: 0.72, gap: 150 });
      d.gate({ at: 0.28, gap: 150 });
      d.hole();
      d.gate({ at: 0.74, gap: 150 });
      d.gate({ at: 0.3, gap: 150 });
      d.surfaceOut();
      d.scatterFish(3);
      d.checkpointAt(5);
    },
  },
  {
    name: 'Buzul Karnı',
    subtitle: 'Tavan alçalıyor',
    target: 54,
    depth: 600,
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.62, gap: 165 });
      d.open({ len: 300 });
      d.gate({ at: 0.8, gap: 150 });
      d.hole();
      d.gate({ at: 0.84, gap: 145 });
      d.open({ len: 280 });
      d.gate({ at: 0.5, gap: 145 });
      d.gate({ at: 0.82, gap: 140 });
      d.surfaceOut();
      d.scatterFish(3);
      d.fishAt(3, -60, 'speed');
      d.checkpointAt(5);
    },
  },
  {
    name: 'Sürü',
    subtitle: 'İki leopar, tek koridor',
    target: 56,
    depth: 600,
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.5, gap: 175 });
      d.open({ len: 340 });
      d.seal({ span: 300, speed: 140 });
      d.gate({ at: 0.7, gap: 160 });
      d.hole();
      d.seal({ span: 280, speed: 155 });
      d.gate({ at: 0.32, gap: 160 });
      d.seal({ span: 240, speed: 165 });
      d.surfaceOut();
      d.scatterFish(3);
      d.checkpointAt(5);
    },
  },
  {
    name: 'Kara Su',
    subtitle: 'Akıntı ve dar geçit birlikte',
    target: 58,
    depth: 600,
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.6, gap: 160 });
      d.current({ power: 170, band: 0.62 });
      d.gate({ at: 0.28, gap: 150 });
      d.hole();
      d.gate({ at: 0.72, gap: 150 });
      d.current({ power: -170, band: 0.62 });
      d.gate({ at: 0.35, gap: 145 });
      d.open({ len: 300 });
      d.surfaceOut();
      d.scatterFish(3);
      d.fishAt(6, 60, 'speed');
      d.checkpointAt(4);
    },
  },
  {
    name: 'İki Ciğer',
    subtitle: 'Delikler seyrek',
    target: 62,
    depth: 600,
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.55, gap: 165 });
      d.open({ len: 380 });
      d.gate({ at: 0.75, gap: 155 });
      d.open({ len: 380 });
      d.gate({ at: 0.3, gap: 155 });
      d.hole();
      d.gate({ at: 0.68, gap: 150 });
      d.open({ len: 380 });
      d.gate({ at: 0.32, gap: 150 });
      d.open({ len: 340 });
      d.surfaceOut();
      d.scatterFish(3);
      d.checkpointAt(7);
    },
  },
  {
    name: 'Kılçık',
    subtitle: 'Sarkıtlar sıklaşıyor',
    target: 64,
    depth: 620,
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.7, gap: 145 });
      d.gate({ at: 0.35, gap: 145 });
      d.gate({ at: 0.72, gap: 140 });
      d.hole();
      d.gate({ at: 0.3, gap: 140 });
      d.gate({ at: 0.74, gap: 138 });
      d.gate({ at: 0.36, gap: 138 });
      d.gate({ at: 0.68, gap: 138 });
      d.surfaceOut();
      d.scatterFish(3);
      d.fishAt(4, 60, 'speed');
      d.checkpointAt(5);
    },
  },
  {
    name: 'Leopar ve Akıntı',
    subtitle: 'Kaçarken sürükleniyorsun',
    target: 66,
    depth: 620,
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.55, gap: 160 });
      d.current({ power: 175, band: 0.6 });
      d.seal({ span: 280, speed: 150 });
      d.gate({ at: 0.3, gap: 150 });
      d.hole();
      d.gate({ at: 0.7, gap: 150 });
      d.current({ power: -175, band: 0.6 });
      d.seal({ span: 300, speed: 160 });
      d.gate({ at: 0.36, gap: 148 });
      d.surfaceOut();
      d.scatterFish(3);
      d.checkpointAt(5);
    },
  },
  {
    name: 'Dipteki Yol',
    subtitle: 'Tavan tamamen kapandı',
    target: 68,
    depth: 640,
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.78, gap: 150 });
      d.gate({ at: 0.84, gap: 142 });
      d.open({ len: 300 });
      d.hole();
      d.gate({ at: 0.86, gap: 140 });
      d.seal({ span: 240, speed: 155 });
      d.gate({ at: 0.8, gap: 140 });
      d.surfaceOut();
      d.scatterFish(3);
      d.fishAt(5, -70, 'speed');
      d.checkpointAt(4);
    },
  },
  {
    name: 'Açık Deniz',
    subtitle: 'Buzun bittiği yer',
    target: 74,
    depth: 640,
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.6, gap: 155 });
      d.current({ power: 180, band: 0.6 });
      d.gate({ at: 0.3, gap: 148 });
      d.seal({ span: 300, speed: 160 });
      d.hole();
      d.gate({ at: 0.75, gap: 145 });
      d.gate({ at: 0.32, gap: 145 });
      d.current({ power: -180, band: 0.62 });
      d.hole();
      d.seal({ span: 300, speed: 170 });
      d.gate({ at: 0.66, gap: 142 });
      d.surfaceOut();
      d.scatterFish(3);
      d.fishAt(8, 60, 'speed');
      d.checkpointAt(6);
    },
  },
];

function composeDive(plan, id) {
  const scale = scaleForLevel(id);
  const d = new Deep({ scale, depth: plan.depth ?? 560 });
  try {
    plan.build(d);
  } catch (err) {
    // The composer's refusals are the useful half of it, so they say which
    // plan asked for the impossible rather than making somebody count.
    throw new Error(`${id}. ${plan.name}: ${err.message}`);
  }
  return d.build({
    id,
    name: plan.name,
    subtitle: plan.subtitle,
    target: plan.target,
    ship: plan.ship,
  });
}

/** Every plan, shipped or not — the solver's `--all` mode wants these. */
export const DIVE_DRAFTS = DIVE_PLANS.map((p, i) => composeDive(p, DIVE_FROM + i));

/**
 * What the game sees: plans that pass, numbered consecutively from `DIVE_FROM`.
 * A plan held back leaves no gap in the level list.
 */
export const DIVE_LEVELS = DIVE_PLANS.filter((p) => p.ship !== false).map((p, i) =>
  composeDive(p, DIVE_FROM + i),
);
