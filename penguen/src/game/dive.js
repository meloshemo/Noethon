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
import { scaleForLevel, menaceFor} from './config.js';

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
    breath: 0.64,
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
    breath: 0.68,
    /* The asymmetry, stated. Every slot is near the bed, so the whole level is
       paid for in the expensive direction and the rises are the rests. */
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.78, gap: 190 });
      d.open({ len: 260 });
      d.gate({ at: 0.82, gap: 180 });
      d.hole();
      /* And then, once, the asymmetry taken away.
         This level's whole subject is that going down is the thing you pay
         for — so the flume is the sentence finished: water running *up*
         through a narrow channel, right after the breath, where the swimmer
         has just been reminded how cheap rising is. Inside it the button
         barely works. It is the first time in the chapter that pressing down
         is not the answer to being too high, and it lands on the level that
         spent its first half teaching you it always was. */
      d.flume({ rise: -0.62, len: 420 });
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
    breath: 0.7,
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
    breath: 0.84,
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
    breath: 0.74,
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
    breath: 0.79,
    /* Two rivers, one above the other, running opposite ways.
       This level used to be with-you then against-you, one after the other,
       which is a current happening *to* you: there is nothing to decide, only
       a stretch that is quick and a stretch that is slow. Stacked instead,
       it becomes the one question moving water can ask and nothing else in
       this chapter can. The shallow river fights and the deep river helps —
       so depth, which has cost the button since the first dive and never once
       bought anything, is suddenly worth *paying* for. And the slots do not
       care which river you are in, so the choice is real on both sides: hold
       the button and go fast down where the air is far, or stay up in the
       slow water near the ice you will need.

       Then the second half turns it over. Both rivers run against you and the
       deep one runs harder, so the answer that just worked becomes the
       expensive one, on the half of the level where the lungs are already
       low. */
    build: (d) => {
      d.mouth();
      d.current({ flow: -0.3, band: 0.36, at: 0.24 });
      d.current({ flow: 0.34, band: 0.36, at: 0.74, keep: true });
      d.gate({ at: 0.35, gap: 172 });
      d.hole();
      d.current({ flow: -0.26, band: 0.36, at: 0.26 });
      d.current({ flow: -0.44, band: 0.36, at: 0.76, keep: true });
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
    breath: 0.82,
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
      /* The bottom of the sawtooth, finally worth going to.
         Up, down, up — and until now every *down* was a cost and every *up*
         was where the air was, so the shape of the level and the shape of the
         reward pointed opposite ways. One tooth now ends in a crack that
         breathes, which makes the deepest point on the level the one place you
         want to be, and makes you wait there while the cold runs the clock. */
      d.vent();
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
    breath: 0.92,
    /* The ceiling never lifts. Every slot is a squeeze and they are all near
       the bed, so the whole level is swum in the expensive half of the water
       with no room to drift. */
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.72, gap: 156 });
      d.gate({ at: 0.76, gap: 152 });
      /* On a level where the ceiling never lifts, the air stops being up.
         Every slot here is already down in the expensive half of the water,
         so a hole in the ice was the one moment the level let you go back to
         the surface and be comfortable — which is the opposite of what it says
         it is about. The crack in the floor is where you already are. */
      d.vent();
      // Squeezed from both sides at once. Every slot on this level is already
      // down in the expensive half of the water because the ceiling never
      // lifts — and now the expensive half is expensive for a reason. The
      // trench is shallow-lipped on purpose: the swimmer has no choice about
      // being low, so the level must not also charge them the full rate for it.
      d.trench({ at: 0.7, dip: 0.42, len: 300 });
      d.gate({ at: 0.78, gap: 148 });
      d.gate({ at: 0.8, gap: 146 });
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
    breath: 0.84,
    /* The two things that take your line away, at the same time. A slot is a
       precise place to be, and a current is the water deciding where you are.

       And then the thing neither of them can do alone. The second half of this
       level has no hole in the ice: the only air is a crack in the seabed that
       breathes on a clock, and there is a current running over it. Every other
       vent in the chapter asks you to *stop*, which costs a wait and nothing
       else. This one asks you to stop in water that is moving, so holding the
       one square metre where the air is becomes the work — and the level named
       Black Water finally has a moment where the sea is deciding where you are
       while you are trying very hard to be somewhere exact. */
    build: (d) => {
      d.mouth();
      d.current({ flow: -0.38, band: 0.4 });
      d.gate({ at: 0.34, gap: 152 });
      d.stretch({ gap: 150, from: 0.52 });
      d.hole();
      d.current({ flow: -0.42, band: 0.6 });
      d.gate({ at: 0.7, gap: 150 });
      d.stretch({ gap: 152, from: 0.36, next: 'vent' });
      d.vent();
      d.gate({ at: 0.44, gap: 150 });
      d.stretch({ gap: 152, from: 0.4 });
      d.surfaceOut();
      d.scatterFish(3);
      d.checkpointAt(4);
    },
  },
  {
    name: 'İki Ciğer',
    subtitle: 'Delikler seyrek',
    en: { name: 'Two Lungs', subtitle: 'The holes are far apart' },
    target: 66,
    depth: 580,
    breath: 0.86,
    /* Exactly two breaths in the whole level, and both of them are earned. The
       name is the level: you get two lungfuls and the sea is longer than two
       lungfuls' worth of comfortable swimming.

       That was the claim. Measured against `breathRange`, the crossing was
       0.99 of *one* lungful — the level named Two Lungs was a one-lung level
       with an optional hole in the middle of it, and a speed fish on the line
       to make sure. It had been that way since it was written and nothing
       could see it, because every rule in the chapter checks that a stretch is
       *short* enough and none of them checks that a level is long enough to
       deserve its name. The budget is up and the shortcut is gone. */
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
      /* Water going down, on the level about getting up.
         The cruel direction, put where it is cruellest. Everything else in
         this chapter can be answered by letting go of the button — the bird
         floats, the ice is up there, and that has been free since the first
         dive. Here the water pushes the wrong way and there is no button for
         up; there never was one. It sits on the second lungful, the one this
         level's own note says has to be spent well, so the answer to being
         too deep stops working at the exact moment being too deep is the
         whole problem. */
      d.flume({ rise: 0.56, at: 0.46, len: 380 });
      d.gate({ at: 0.44, gap: 158 });
      d.stretch({ gap: 162, len: 300, from: 0.34 });
      d.surfaceOut();
      d.scatterFish(3, 40);
      /* The speed fish is gone from this one.
         It sat on the line, on the level whose entire subject is air, and it
         is the one pickup that shortens a swim. A level called Two Lungs
         should not hand you a way to make it one. */
      d.checkpointAt(2);
    },
  },
  {
    name: 'Kılçık',
    subtitle: 'Sarkıtlar sıklaşıyor',
    en: { name: 'Fishbone', subtitle: 'The icicles crowd in' },
    target: 64,
    depth: 620,
    breath: 0.88,
    /* No open water anywhere. Slot after slot, alternating shallow and deep,
       so there is never a stretch in which to settle and never a moment the
       line is not being asked for. */
    build: (d) => {
      d.mouth();
      d.gate({ at: 0.3, gap: 150 });
      d.gate({ at: 0.66, gap: 148 });
      d.gate({ at: 0.28, gap: 146 });
      d.gate({ at: 0.7, gap: 146 });
      /* The one rest on the level, and it charges rent.
         This level's own note says there is never a stretch in which to settle
         and never a moment the line is not being asked for — which was true of
         everything except the breath in the middle, where you popped up
         through the ice and went again without deciding anything. So the
         breath is a vent now: it is on the floor, it is on a clock, and the
         only way to take it is to stop moving in the one level built out of
         not stopping. */
      d.vent();
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
    breath: 0.92,
    /* Being hunted takes a line; a current takes it back. Everything the last
       eleven levels taught, arriving together, on eleven percent of a lung. */
    build: (d) => {
      d.mouth();
      d.current({ flow: -0.40, band: 0.5 });
      d.seal({ span: 340, speed: 180 });
      d.gate({ at: 0.38, gap: 148 });
      d.hole();
      d.current({ flow: -0.44, band: 0.55 });
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
    breath: 0.88,
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
      d.current({ flow: -0.36, band: 0.78 });
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
    breath: 0.94,
    /* The wall of the chapter, and it is meant to be one. Two seals, two
       currents, slots at both ends of the column and the longest unbreathed
       swim in the game. There is an answer and it is a narrow one: this is the
       level to lose an evening to. */
    build: (d) => {
      d.mouth();
      /* A band you cross rather than a passage you live in.
         Given the whole first lungful it priced out at 4836px against a 3927px
         lung — two slots at opposite ends of the column and a leopard seal, all
         of it upstream, is more than one breath can buy. The finale below is
         the passage; this is the warning. */
      d.current({ flow: -0.3, band: 0.45, len: 760 });
      d.gate({ at: 0.26, gap: 142 });
      d.seal({ span: 340, speed: 185 });
      d.gate({ at: 0.8, gap: 140 });
      d.hole();
      d.gate({ at: 0.24, gap: 140 });
      d.current({ flow: -0.52, band: 0.62 });
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
  const def = d.build({
    id,
    name: plan.name,
    subtitle: plan.subtitle,
    en: plan.en,
    target: plan.target,
    ship: plan.ship,
  });
  def.menace = menaceFor((id - DIVE_FROM) / (DIVE_PLANS.length - 1));
  return def;
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
