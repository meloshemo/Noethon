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

/**
 * `breath` is the chapter's difficulty curve, written down.
 *
 * It is how much of one lungful the composer may spend between two air holes,
 * and it climbs from just under half at the first dive to almost all of one at
 * the last. Two levels step *back* down it on purpose — 51 and 55, where a
 * leopard seal arrives — because a new thing to be frightened of should not
 * turn up on the tightest breath in the chapter. A curve with no rhythm is a
 * ramp, and a ramp is a thing you climb rather than a thing you play.
 */
const DIVE_PLANS = [
  {
    name: 'İlk Nefes',
    subtitle: 'Buzun altı sessiz',
    en: { name: 'First Breath', subtitle: 'It is quiet under the ice' },
    target: 34,
    depth: 500,
    breath: 0.56,
    /* Only the corridor. Two slots, both wide, both roughly where the swimmer
       already is: the level is here to say "press to go down, let go to come
       up" and then get out of the way. */
    build: (d) => {
      d.mouth();
      d.open({ len: 340 });
      d.gate({ at: 0.55, gap: 210 });
      d.open({ len: 300 });
      d.gate({ at: 0.45, gap: 205 });
      d.hole();
      d.stretch({ gap: 200, len: 300 });
      d.surfaceOut();
      d.scatterFish(3);
      d.checkpointAt(5);
    },
  },
  {
    name: 'Aşağı Bas',
    subtitle: 'Yukarısı bedava, aşağısı değil',
    en: { name: 'Press Down', subtitle: 'Going up is free, going down is not' },
    target: 40,
    depth: 560,
    breath: 0.61,
    /* The asymmetry, stated. Every slot is near the bed, so the whole level is
       paid for in the expensive direction and the rises are the rests. */
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.78, gap: 190 });
      d.open({ len: 260 });
      d.gate({ at: 0.82, gap: 180 });
      d.hole();
      d.gate({ at: 0.85, gap: 175 });
      d.stretch({ gap: 180, from: 0.62 });
      d.surfaceOut();
      d.scatterFish(3, 40);
      d.checkpointAt(4);
    },
  },
  {
    name: 'Dar Geçit',
    subtitle: 'Buz sarkıyor',
    en: { name: 'Narrow Passage', subtitle: 'The ice hangs low' },
    target: 44,
    depth: 560,
    breath: 0.65,
    /* Three slots at the same height, close together. Nothing to think about
       and no room to be wrong: the first level that is about the line rather
       than about the plan. */
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.5, gap: 168 });
      d.gate({ at: 0.5, gap: 160 });
      d.stretch({ gap: 154, from: 0.44 });
      d.hole();
      d.gate({ at: 0.5, gap: 152 });
      d.stretch({ gap: 156, from: 0.4 });
      d.surfaceOut();
      d.scatterFish(3);
      d.checkpointAt(4);
    },
  },
  {
    name: 'Uzun Soluk',
    subtitle: 'Bir sonraki delik uzakta',
    en: { name: 'Long Breath', subtitle: 'The next hole is far' },
    target: 46,
    depth: 540,
    breath: 0.71,
    /* Nothing in the way at all. The obstacle is the distance, and this is the
       level that tells you the ceiling of ice is itself the hazard. */
    build: (d) => {
      d.mouth();
      d.open({ len: 320 });
      d.stretch({ gap: 200, len: 360, from: 0.4 });
      d.hole();
      d.stretch({ gap: 195, len: 340, from: 0.34 });
      d.surfaceOut();
      d.scatterFish(3, 30);
      d.fishAt(3, 70, 'speed');
      d.checkpointAt(3);
    },
  },
  {
    name: 'Deniz Leoparı',
    subtitle: 'Yalnız değilsin',
    en: { name: 'Leopard Seal', subtitle: 'You are not alone' },
    target: 48,
    depth: 580,
    breath: 0.69,
    /* A new thing to be frightened of, so the breath steps back down. The seal
       gets open water on both sides: it has to be something you see coming and
       swim around, not something you meet inside a slot. */
    build: (d) => {
      d.mouth();
      d.open({ len: 300 });
      d.seal({ span: 300, speed: 140 });
      d.hole();
      d.gate({ at: 0.6, gap: 175 });
      d.seal({ span: 340, speed: 155 });
      d.stretch({ gap: 175 });
      d.surfaceOut();
      d.scatterFish(3);
      d.checkpointAt(4);
    },
  },
  {
    name: 'Akıntı',
    subtitle: 'Su seni taşıyor',
    en: { name: 'The Current', subtitle: 'The water carries you' },
    target: 50,
    depth: 560,
    breath: 0.75,
    /* With you, then against you, and the against half is placed where the
       lungs are already low: a current is only interesting when it costs air
       rather than time. */
    build: (d) => {
      d.mouth();
      d.current({ power: 190, band: 0.45 });
      d.gate({ at: 0.35, gap: 172 });
      d.hole();
      d.current({ power: -210, band: 0.55 });
      d.stretch({ gap: 170, from: 0.42 });
      d.surfaceOut();
      d.scatterFish(3);
      d.checkpointAt(3);
    },
  },
  {
    name: 'Testere Dişi',
    subtitle: 'Yukarı, aşağı, yukarı',
    en: { name: 'Sawtooth', subtitle: 'Up, down, up' },
    target: 52,
    depth: 600,
    breath: 0.78,
    /* Top, bottom, top, bottom — and this is the level where that finally
       means something. The comment here used to claim depth was the thing that
       cost, and it was not true: the clock ran at one second per second
       wherever the swimmer was. The first cold band is on the second descent,
       so the sentence the level was already telling itself becomes true
       halfway through it. */
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.2, gap: 168 });
      d.gate({ at: 0.8, gap: 166 });
      d.gate({ at: 0.22, gap: 164 });
      d.hole();
      d.trench({ at: 0.66, dip: 0.5, len: 320 });
      d.hole();
      d.gate({ at: 0.24, gap: 162 });
      d.stretch({ gap: 165, from: 0.26 });
      d.surfaceOut();
      d.scatterFish(3, 50);
      d.checkpointAt(5);
    },
  },
  {
    name: 'Buzul Karnı',
    subtitle: 'Tavan alçalıyor',
    en: { name: "The Glacier's Belly", subtitle: 'The ceiling comes down' },
    target: 54,
    depth: 620,
    breath: 0.82,
    /* The ceiling never lifts. Every slot is a squeeze and they are all near
       the bed, so the whole level is swum in the expensive half of the water
       with no room to drift. */
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.72, gap: 156 });
      d.gate({ at: 0.76, gap: 152 });
      d.hole();
      // Squeezed from both sides at once. Every slot on this level is already
      // down in the expensive half of the water because the ceiling never
      // lifts — and now the expensive half is expensive for a reason. The
      // trench is shallow-lipped on purpose: the swimmer has no choice about
      // being low, so the level must not also charge them the full rate for it.
      d.trench({ at: 0.7, dip: 0.42, len: 300 });
      d.gate({ at: 0.78, gap: 148 });
      d.stretch({ gap: 152, from: 0.66 });
      d.surfaceOut();
      d.scatterFish(3, 40);
      d.checkpointAt(4);
    },
  },
  {
    name: 'Sürü',
    subtitle: 'İki leopar, tek koridor',
    en: { name: 'The Pack', subtitle: 'Two leopards, one corridor' },
    target: 56,
    depth: 600,
    breath: 0.8,
    /* Two of them, and a slot between: you cannot outrun the second one on the
       line that got you past the first. Breath steps down again, because the
       question here is the seals. */
    build: (d) => {
      d.mouth();
      d.seal({ span: 320, speed: 165 });
      d.gate({ at: 0.4, gap: 160 });
      d.seal({ span: 360, speed: 175 });
      d.hole();
      // The cheap way past a leopard seal has always been to go under it. Now
      // under it is where the air goes, so the third one has to be dodged
      // upward — into the ceiling, in a corridor, with a seal in it. The level
      // is called The Pack and this is the level saying what a pack is: not
      // three of the same problem, but a problem that closes a door each time.
      d.trench({ at: 0.6, dip: 0.42, len: 260 });
      d.seal({ span: 340, speed: 170 });
      d.stretch({ gap: 162, from: 0.36 });
      d.surfaceOut();
      d.scatterFish(3);
      d.fishAt(4, 60, 'speed');
      d.checkpointAt(4);
    },
  },
  {
    name: 'Kara Su',
    subtitle: 'Akıntı ve dar geçit birlikte',
    en: { name: 'Black Water', subtitle: 'A current and a squeeze at once' },
    target: 58,
    depth: 620,
    breath: 0.8,
    /* The two things that take your line away, at the same time. A slot is a
       precise place to be, and a current is the water deciding where you are. */
    build: (d) => {
      d.mouth();
      d.current({ power: -200, band: 0.4 });
      d.gate({ at: 0.34, gap: 152 });
      d.stretch({ gap: 150, from: 0.52 });
      d.hole();
      d.current({ power: -220, band: 0.6 });
      d.gate({ at: 0.7, gap: 150 });
      d.stretch({ gap: 152, from: 0.36 });
      d.surfaceOut();
      d.scatterFish(3);
      d.checkpointAt(4);
    },
  },
  {
    name: 'İki Ciğer',
    subtitle: 'Delikler seyrek',
    en: { name: 'Two Lungs', subtitle: 'The holes are far apart' },
    target: 62,
    depth: 580,
    breath: 0.87,
    /* Exactly two breaths in the whole level, and both of them are earned. The
       name is the level: you get two lungfuls and the sea is longer than two
       lungfuls' worth of comfortable swimming. */
    build: (d) => {
      d.mouth();
      d.stretch({ gap: 165, len: 320, from: 0.3 });
      d.hole();
      // The second lungful is the one that has to be spent well, so this is
      // where the cold goes. It is deep and it is right after the only breath
      // on the level, which means the choice is made at the moment the player
      // has the most air and the least reason to think about it.
      d.trench({ at: 0.6, dip: 0.66, len: 340 });
      d.gate({ at: 0.7, gap: 160 });
      d.stretch({ gap: 162, len: 300, from: 0.34 });
      d.surfaceOut();
      d.scatterFish(3, 40);
      d.fishAt(2, 80, 'speed');
      d.checkpointAt(2);
    },
  },
  {
    name: 'Kılçık',
    subtitle: 'Sarkıtlar sıklaşıyor',
    en: { name: 'Fishbone', subtitle: 'The icicles crowd in' },
    target: 64,
    depth: 620,
    breath: 0.84,
    /* No open water anywhere. Slot after slot, alternating shallow and deep,
       so there is never a stretch in which to settle and never a moment the
       line is not being asked for. */
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.3, gap: 150 });
      d.gate({ at: 0.66, gap: 148 });
      d.gate({ at: 0.28, gap: 146 });
      d.gate({ at: 0.7, gap: 146 });
      d.hole();
      d.gate({ at: 0.32, gap: 144 });
      // The level alternates shallow and deep, over and over, and until now
      // the two halves of that alternation cost the same. Putting the cold
      // under the second half turns a rhythm into a question: the shallow
      // slots are rests and the deep ones are the bill, and the fishbone
      // finally has a wide end and a narrow one.
      d.trench({ at: 0.68, dip: 0.5, len: 300 });
      d.stretch({ gap: 146, len: 200, from: 0.3 });
      d.surfaceOut();
      d.scatterFish(3);
      d.checkpointAt(5);
    },
  },
  {
    name: 'Leopar ve Akıntı',
    subtitle: 'Kaçarken sürükleniyorsun',
    en: { name: 'Leopard and Current', subtitle: 'You drift while you flee' },
    target: 66,
    depth: 620,
    breath: 0.9,
    /* Being hunted takes a line; a current takes it back. Everything the last
       eleven levels taught, arriving together, on eleven percent of a lung. */
    build: (d) => {
      d.mouth();
      d.current({ power: -210, band: 0.5 });
      d.seal({ span: 340, speed: 180 });
      d.gate({ at: 0.38, gap: 148 });
      d.hole();
      d.current({ power: -230, band: 0.55 });
      d.seal({ span: 360, speed: 185 });
      d.stretch({ gap: 150, from: 0.42 });
      d.surfaceOut();
      d.scatterFish(3);
      d.fishAt(5, 70, 'speed');
      d.checkpointAt(4);
    },
  },
  {
    name: 'Dipteki Yol',
    subtitle: 'Tavan tamamen kapandı',
    en: { name: 'The Road on the Bottom', subtitle: 'The ceiling has closed entirely' },
    target: 70,
    depth: 660,
    breath: 0.82,
    /* Pinned to the seabed from end to end, and now the seabed is the cold.
       The cheap direction is gone twice over: there is no rising to rest,
       because the slots are all at the bottom, and there is no resting at the
       bottom, because the bottom is where the air goes. The two halves of that
       sentence used to be one half. */
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.84, gap: 146 });
      d.gate({ at: 0.86, gap: 144 });
      d.hole();
      d.trench({ at: 0.58, dip: 0.72, len: 380 });
      d.hole();
      d.current({ power: -200, band: 0.78 });
      d.gate({ at: 0.86, gap: 142 });
      d.stretch({ gap: 144, from: 0.74 });
      d.surfaceOut();
      d.scatterFish(3, 30);
      d.checkpointAt(4);
    },
  },
  {
    name: 'Açık Deniz',
    subtitle: 'Buzun bittiği yer',
    en: { name: 'Open Sea', subtitle: 'Where the ice ends' },
    target: 78,
    depth: 660,
    breath: 0.96,
    /* The wall of the chapter, and it is meant to be one. Two seals, two
       currents, slots at both ends of the column and the longest unbreathed
       swim in the game. There is an answer and it is a narrow one: this is the
       level to lose an evening to. */
    build: (d) => {
      d.mouth();
      d.current({ power: -210, band: 0.45 });
      d.gate({ at: 0.26, gap: 142 });
      d.seal({ span: 340, speed: 185 });
      d.gate({ at: 0.8, gap: 140 });
      d.hole();
      d.gate({ at: 0.24, gap: 140 });
      d.current({ power: -240, band: 0.62 });
      d.seal({ span: 360, speed: 195 });
      d.stretch({ gap: 136, len: 190, from: 0.24 });
      d.surfaceOut();
      d.scatterFish(3);
      d.fishAt(6, 80, 'speed');
      d.checkpointAt(5);
    },
  },
];

function composeDive(plan, id) {
  const scale = scaleForLevel(id);
  const d = new Deep({ scale, depth: plan.depth ?? 560, breath: plan.breath });
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
    en: plan.en,
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
