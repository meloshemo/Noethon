/**
 * Chapter II — the mountain.
 *
 * Levels 32 onward. Written as plans, the same way the shelf is, but composed by
 * `Tower` instead of `Course`: the cursor climbs instead of running, and the
 * new verb is holding on.
 *
 * The ramp, which matters more here than it did on the shelf, because the
 * player is being taught a control they have never used in thirty-one levels:
 *
 *   32–34  the grip itself. A wall you cannot fall off, a wall you can, and a
 *          shaft short enough that running out of stamina costs you a retry
 *          rather than the level.
 *   35–38  the chimney as a route. Kicking is cheap and creeping is expensive,
 *          and the levels are built so the player finds that out by doing it.
 *   39–42  the mountain fights back: seracs on a clock, wind through the shaft,
 *          lips that force a kick under rock, ice that gives under a rested foot.
 *   43–46  everything, with the ice lying. The summit is the hardest thing in
 *          the game and is meant to be.
 *
 * Nothing here explains itself either. The one exception is the first sign in
 * level 32, which names the grip — because a verb the player cannot discover by
 * pressing the buttons they already know is not a discovery, it is a wall.
 */

import { Tower } from './tower.js';
import { scaleForLevel, menaceFor} from './config.js';

/** @type {{name:string, subtitle:string, target:number, build:(t:Tower)=>void}[]} */
/**
 * `effort` is the chapter's difficulty curve, written down.
 *
 * Every shaft a plan asks for is multiplied by it, so the same climb gets
 * taller as the chapter goes on and the pair of arms doing it does not. The
 * whole chapter used to share one allowance, which is another way of saying it
 * had no curve at all.
 *
 * How far it can go is not a matter of taste. The theoretical budget — every
 * kick gaining its full height, no time lost catching the wall — is optimistic,
 * and the solver knows by how much. Three of these numbers are lower than their
 * neighbours because the solver refused everything above them: 37, 44 and 46
 * were already at the edge of what the physics gives, and their difficulty has
 * to come from somewhere other than height.
 */
const CLIMB_PLANS = [
  /* ------------------------------------------------ 32–34 · the grip */
  {
    name: 'Buzulun Eteği',
    signs: [{ dx: 92, dy: -104, text: 'Duvara doğru bas: tutun  •  Tutunurken BOŞLUK: tırman' }],
    subtitle: 'Yukarısı çok uzak',
    en: { name: "The Glacier's Foot", subtitle: 'The top is a long way up' },
    target: 40,
    effort: 0.7,
    build: (t) => {
      t.base({ w: 300 });
      t.steps({ n: 3, rise: 0.6, w: 150 });
      // The first wall is a gift: the ledge it lands on is directly above, so
      // holding the button too long or letting go too early both still work.
      t.face({ height: 120, side: 1, exit: 190 });
      t.steps({ n: 2, rise: 0.55, w: 150 });
      t.crown({ w: 280 });
      t.scatterFish(3, 56);
      t.checkpoint(t.floes[4]);
    },
  },
  {
    name: 'Tutunma',
    subtitle: 'Kollarında ne kadar var',
    en: { name: 'Holding On', subtitle: 'How much your arms have left' },
    target: 46,
    effort: 0.76,
    build: (t) => {
      t.base({ w: 260 });
      t.steps({ n: 2, rise: 0.62, w: 140 });
      t.face({ height: 180, side: -1, exit: 170 });
      t.traverse({ n: 2, w: 130 });
      t.face({ height: 175, side: 1, exit: 170 });
      t.steps({ n: 2, rise: 0.58, w: 140 });
      t.crown({ w: 260 });
      t.scatterFish(3, 58);
      t.checkpoint(t.floes[4]);
      t.checkpoint(t.floes[7]);
    },
  },
  {
    name: 'Dar Yarık',
    subtitle: 'İki duvar arası',
    en: { name: 'Narrow Cleft', subtitle: 'Between two walls' },
    target: 52,
    effort: 0.82,
    build: (t) => {
      t.base({ w: 250 });
      t.steps({ n: 2, rise: 0.6, w: 140 });
      // The first chimney. Short enough that a player who only creeps still
      // clears it, so nobody is forced to discover kicking under pressure.
      t.chimney({ height: 200 });
      t.traverse({ n: 2, w: 130 });
      t.steps({ n: 2, rise: 0.6, w: 140 });
      t.crown({ w: 260 });
      t.scatterFish(3, 58);
      t.checkpoint(t.floes[3]);
    },
  },

  /* ------------------------------------------- 35–38 · the chimney */
  {
    name: 'Çifte Baca',
    subtitle: 'Nefes alacak yer yok',
    en: { name: 'Twin Chimneys', subtitle: 'Nowhere to catch your breath' },
    target: 58,
    effort: 0.88,
    build: (t) => {
      t.base({ w: 240 });
      t.steps({ n: 2, rise: 0.62, w: 135 });
      t.chimney({ height: 260 });
      /* No wet ice on this one, and the arithmetic is the reason.
         A band was put here first, on the reasoning that "nowhere to catch
         your breath" was a claim about layout that the bar itself did not
         know. Charged honestly it does not fit: this shaft is a hundred and
         ninety pixels tall and a hundred and six of them are the stretch where
         only one wall has reached down, where the only way up is creeping and
         a wet pixel costs more than twice what it costs higher. Between the
         top margin and that stretch there is nowhere left to put a band a
         player could feel.
         The chapter has room for exactly one, and it is on 43. That is not a
         disappointment, it is the budget being visible: these shafts were
         already tuned to sit near their own fairness line, so wet ice has to
         be *bought* with height, and most of these plans have none to sell. */
      t.traverse({ n: 2, w: 120 });
      t.chimney({ height: 275 });
      t.steps({ n: 2, rise: 0.58, w: 135 });
      t.crown({ w: 250 });
      t.scatterFish(3, 58);
      t.fishAt(4, 92, 'speed');
      t.checkpoint(t.floes[3]);
      t.checkpoint(t.floes[7]);
    },
  },
  {
    name: 'Uzun Baca',
    subtitle: 'Yarı yolda bir çıkıntı',
    en: { name: 'Long Chimney', subtitle: 'One ledge halfway up' },
    target: 64,
    effort: 0.94,
    build: (t) => {
      t.base({ w: 240 });
      t.steps({ n: 2, rise: 0.62, w: 135 });
      // Tall enough that creeping cannot do it — the nub halfway is the whole
      // reason it is passable, and finding it is the level.
      /* The mountain's own rotten fish, on the way in to the longest shaft.
         Every bait in the game until now made the penguin worse at what it
         was already doing — heavier, slippier, backwards, blinder — and all
         four are survived the same way, by slowing down for a few seconds.
         This one takes the wall away for three and a half, on the level whose
         whole answer is a wall. It sits below the shaft rather than inside it,
         so eating it is a decision made before the commitment and not a
         sentence handed down in the middle of one. */
      t.fishAt(3, 52, 'clumsy');
      t.chimney({ height: 380, rests: 1 });
      /* The level is a long shaft with one ledge in it, and the ledge is the
         whole point. So part of the shaft is glare ice: there is a rest on
         this climb and there is also a stretch you cannot even pause on, and
         you have to know which is which before you leave the ledge. */
      t.glaze({ side: -1, from: 0.62 });
      // A slab of ice hanging on a rope, halfway up the longest chimney in the
      // chapter, and the first one the player meets.
      //
      // Placed here because this level is already about patience: the shaft
      // above it is four hundred pixels with one rest in it, and a player who
      // has just spent an arm getting this far is in exactly the frame of mind
      // to stand still and watch something swing. The lesson is that it stops
      // at the ends, and nothing on this level punishes waiting to find out.
      //
      // The rope is cut to the width of the shaft, so its period is whatever
      // that width makes it. Nobody chose the timing.
      t.pendulum({ w: 130 });
      t.steps({ n: 2, rise: 0.6, w: 135 });
      t.crown({ w: 250 });
      t.scatterFish(3, 58);
      // A coil beside the long chimney, level with the halfway nub.
      //
      // This is the first place in the game where the fish is arguably a
      // better answer than the mechanic the chapter just taught: a wound
      // spring off the nub clears most of the upper shaft without spending an
      // arm. It is out to the side, so taking it costs a kick and a regrab —
      // and if the shaft has already emptied your stamina, that price is one
      // you cannot pay. The shortcut only exists for a climber who did not
      // need it.
      t.charged(4, 'coil', 104, 30);
      t.checkpoint(t.floes[3]);
      t.checkpoint(t.floes[6]);
    },
  },
  {
    name: 'Çıkıntı',
    subtitle: 'Gökyüzü kapandı',
    en: { name: 'The Overhang', subtitle: 'The sky is gone' },
    target: 66,
    effort: 1.0,
    build: (t) => {
      t.base({ w: 240 });
      t.steps({ n: 2, rise: 0.6, w: 140 });
      t.chimney({ height: 250, lip: 0.55 });
      t.traverse({ n: 3, w: 120 });
      t.chimney({ height: 270, lip: 0.45 });
      /* A blank face and a glazed band, on the one level that gets both.
         Measured, spreading a new verb thinly across four levels made the
         chapter *more* repetitive rather than less: a level that is another
         level plus one word is still four fifths the same level, and four
         levels holding the same new word are four fifths the same as each
         other. Distinctiveness is combinations, not toys. `tools/variety.mjs`
         puts the chapter at 15% twinned untouched, 14% with the glaze spread
         over four levels, and 11% with two rare words stacked here.
         Measured, this level shared its whole vocabulary with two others in
         the chapter — the same six words in the same order — and giving all
         three of them the *same* new verb kept them identical, which is what
         the first attempt at this did. Each of them gets a different one. Here
         it is a single wall with nothing on either side of it, which is the
         only shape on the mountain that cannot be rested in at all: a chimney
         always has a far wall to reach for, and this does not.

         The band goes on the shaft above, not on the face — `glaze` always
         works on the last chimney — so it is written before the face, in the
         order the two things actually exist. Low in that shaft and on the same
         side as the lip, because the solver refused every other arrangement: a
         band above an overhang takes away the wall the kick under it has to
         land on, and the shaft stops being a hard climb and becomes a dead
         end. */
      t.glaze({ side: 1, from: 0.3 });
      t.face({ height: 150 });
      t.traverse({ n: 2, w: 125 });
      t.steps({ n: 2, rise: 0.58, w: 140 });
      t.crown({ w: 250 });
      t.scatterFish(3, 60);
      t.fishAt(5, 96, 'speed');
      t.checkpoint(t.floes[4]);
      t.checkpoint(t.floes[8]);
    },
  },
  {
    name: 'Kırılgan Basamaklar',
    subtitle: 'Dinlenecek yer güvenli değil',
    en: { name: 'Brittle Steps', subtitle: 'The place to rest is not safe' },
    target: 70,
    effort: 1.06,
    build: (t) => {
      t.base({ w: 230 });
      t.steps({ n: 2, rise: 0.6, w: 135 });
      t.traverse({ n: 3, w: 125, types: ['crack', 'solid'] });
      t.chimney({ height: 300 });
      // Cracking ice on a climb is a different animal: the ledge you were
      // going to rest on is the one that gives way, so the bar has to be
      // spent before you know whether you can afford it.
      // The rope again, and this time the ledge you leave from is cracking.
      //
      // Second appearance, and the escalation is not the swing — it is what is
      // under it. On the level where every place to rest is on a fuse, the one
      // solid thing in the shaft is a slab hanging on a rope, and it will only
      // be where you need it every other second.
      t.pendulum({ w: 130 });
      t.face({ height: 170, side: 1, exit: 165 });
      t.steps({ n: 2, rise: 0.58, w: 135 });
      t.crown({ w: 250 });
      t.scatterFish(3, 58);
      t.checkpoint(t.floes[4]);
      t.checkpoint(t.floes[9]);
    },
  },

  /* -------------------------------------- 39–42 · the mountain bites */
  {
    name: 'Serak',
    subtitle: 'Yukarıdan gelen',
    en: { name: 'Serac', subtitle: 'Coming down from above' },
    target: 74,
    effort: 1.12,
    build: (t) => {
      t.base({ w: 230 });
      t.steps({ n: 2, rise: 0.6, w: 135 });
      t.chimney({ height: 280, hazard: 'shards' });
      t.traverse({ n: 2, w: 125 });
      t.chimney({ height: 300, hazard: 'shards' });
      /* Glare ice under falling shards, on the second shaft.
         Every hazard in this chapter can be answered by waiting: the serac is
         a metronome, and a climber who holds still through one beat is a
         climber who is safe. Glare ice takes away the place to hold still. The
         wet ice that was tried here first did the arithmetic version of the
         same thing — it made waiting expensive rather than impossible — and it
         left this level with the same vocabulary as 35, which is the failure
         the variety tool exists to catch. Two hazard levels should not be one
         idea twice. */
      t.glaze({ side: -1, from: 0.42 });
      t.steps({ n: 2, rise: 0.58, w: 135 });
      t.crown({ w: 250 });
      t.scatterFish(3, 58);
      // Slack, hung between the two shard shafts.
      //
      // Falling ice is a metronome, and this is the only thing in the game
      // that slows a metronome down. It works while you are airborne, which
      // in a shaft means while you are between kicks — so a climber who has
      // it can cross a beat they would otherwise have to wait out. Waiting
      // costs stamina here, which is why the trade is real.
      t.charged(5, 'slack', 108, 24);
      t.checkpoint(t.floes[3]);
      t.checkpoint(t.floes[7]);
    },
  },
  {
    name: 'Bacadaki Rüzgâr',
    subtitle: 'Şaft bir borudur',
    en: { name: 'Wind in the Chimney', subtitle: 'A shaft is a pipe' },
    target: 78,
    effort: 1.18,
    build: (t) => {
      t.base({ w: 230 });
      t.steps({ n: 2, rise: 0.6, w: 135 });
      t.gale({ height: 420, power: 170, period: 3.2 });
      t.chimney({ height: 290 });
      // The same slab, in a shaft that is also a pipe.
      //
      // Four levels after the player learned that a swing stops at the ends,
      // this one puts a gale through it. The wind does not move the rope — a
      // rope is not a penguin — but it very much moves anything standing on
      // the slab, so the ride that was a free crossing becomes a place where
      // you have to lean into the beat and hope you picked the right end to
      // step on from.
      t.pendulum({ w: 130 });
      t.face({ height: 180, side: -1, exit: 160 });
      t.steps({ n: 2, rise: 0.58, w: 135 });
      t.crown({ w: 250 });
      t.scatterFish(3, 58);
      t.fishAt(6, 90, 'speed');
      t.checkpoint(t.floes[3]);
      t.checkpoint(t.floes[8]);
    },
  },
  {
    name: 'Cilalı Sırt',
    subtitle: 'Ayak tutmuyor',
    en: { name: 'Polished Ridge', subtitle: 'Your feet find nothing' },
    target: 80,
    effort: 1.24,
    build: (t) => {
      t.base({ w: 225 });
      t.traverse({ n: 3, w: 130, types: ['slip', 'solid'] });
      /* Shorter than it was, and the composer is the one that said so.
         Every chimney has a stretch at the bottom where only one wall has
         reached down — the columns find their own feet so that entering needs
         one hand-hold, not two — and in that stretch there is nothing to kick
         off, so it can only be creeped at more than twice the cost per pixel.
         The shaft budget had always priced the whole height at the kicking
         rate. Here that came out at 81% of one bar for the bottom leg alone,
         against a fairness line of 77%: a climb you lose at the top to a sum,
         which from the player's seat looks exactly like a fault. */
      t.chimney({ height: 275 });
      /* No glare ice here, and it was tried.
         The fit is exact — the level is called Polished Ridge and its subtitle
         is "your feet find nothing", which until now was only ever about the
         floor. It is also the hardest climb in the chapter (effort 0.962) with
         slip under every traverse, and the solver refused a band at every
         height on both walls. There is no stamina left in this level for a
         move you cannot back out of. A good idea that the level cannot pay
         for is not a good idea for that level. */
      t.traverse({ n: 3, w: 125, types: ['slip', 'solid'] });
      t.chimney({ height: 260, lip: 0.5 });
      /* And no wet ice here either, on the same grounds as the glare ice.
         A band was put on this shaft and it is why the level became
         unfinishable: charged honestly — at the creeping rate, because it
         landed in the stretch where only one wall has reached down — it took
         the shaft to ninety-nine per cent of one bar. The old budget could not
         see that, because it priced every pixel of every shaft at the kicking
         rate.
         The note above turns out to have been about the level rather than
         about verglas: this climb has no bar to spare for anything of any
         kind. Two mechanics have now been offered to it and the arithmetic has
         refused both. Worth leaving written down so it is not offered a
         third. */
      t.steps({ n: 2, rise: 0.58, w: 135 });
      t.crown({ w: 245 });
      t.scatterFish(3, 58);
      t.fishAt(5, 44, 'heavy');
      t.checkpoint(t.floes[4]);
      t.checkpoint(t.floes[9]);
    },
  },
  {
    name: 'Yüksek Şaft',
    subtitle: 'İki mola, bir nefes',
    en: { name: 'High Shaft', subtitle: 'Two rests, one breath' },
    target: 86,
    effort: 1.3,
    build: (t) => {
      t.base({ w: 225 });
      t.steps({ n: 2, rise: 0.6, w: 132 });
      t.chimney({ height: 420, rests: 2, hazard: 'shards' });
      t.traverse({ n: 3, w: 118 });
// A rope in the second shaft, on the tallest tower in the chapter.
      //
      // Level forty-two is the one that spends the most stamina, and this is
      // placed *after* the long chimney has taken it: the swing gets you
      // across the upper shaft without asking for an arm you no longer have.
      // Not a gift — you still have to be on it at the right moment, and the
      // rope here is short, which by this chapter's own arithmetic means it is
      // quick.
      t.pendulum({ w: 126 });
      t.face({ height: 175, side: 1, exit: 160 });
      t.crown({ w: 245 });
      t.scatterFish(3, 58);
      t.checkpoint(t.floes[3]);
      t.checkpoint(t.floes[8]);
    },
  },

  /* ---------------------------------------------- 43–46 · the summit */
  {
    name: 'Yalan Buz',
    subtitle: 'Dinlenmek isteyeceksin',
    en: { name: 'Lying Ice', subtitle: 'You will want to rest' },
    target: 90,
    effort: 1.36,
    build: (t) => {
      t.base({ w: 220 });
      t.steps({ n: 2, rise: 0.6, w: 132 });
      // Fake ice on a mountain is meaner than fake ice on a shelf, and it is
      // meant to be: on the shelf you keep running and survive it, up here the
      // ledge you were about to rest on simply is not there.
      t.traverse({ n: 3, w: 125, types: ['solid', 'fake'] });
      // Twenty pixels shorter than it was, bought back as wet ice below: a
      // shaft and a band spend the same bar, so a plan cannot simply add one.
      t.chimney({ height: 310 });
      /* The wall lies too.
         Three levels in this chapter had exactly the same vocabulary — 38, 42
         and 43 — which on a level called Lying Ice is the joke going the wrong
         way: its idea was carried entirely by a `types` parameter no player
         reads and no tool can see. Wet ice is the same lie told about the
         *wall* rather than the floor. It looks like every other face in the
         shaft, it holds like every other face in the shaft, and it empties the
         arms at twice the rate while it does. On the level whose subtitle is
         "you will want to rest", the place you want to rest is the place that
         charges for it. */
      t.sodden({ side: -1, from: 0.46 });
      // And once more where the ice lies.
      //
      // By this level the player has ridden three of these and knows the rule:
      // wait for the end, step on, ride. What this one adds is that the ledge
      // the swing delivers you to may not be there. The rope never lies —
      // everything around it does.
      t.pendulum({ w: 130 });
      t.face({ height: 180, side: -1, exit: 160 });
      t.steps({ n: 2, rise: 0.58, w: 132 });
      t.crown({ w: 245 });
      t.scatterFish(3, 58);
      t.checkpoint(t.floes[4]);
      t.checkpoint(t.floes[9]);
    },
  },
  {
    name: 'Kuzey Duvarı',
    subtitle: 'Buzul burada dikleşiyor',
    en: { name: 'The North Wall', subtitle: 'This is where it goes vertical' },
    target: 96,
    effort: 1.03,
    build: (t) => {
      t.base({ w: 220 });
      t.gale({ height: 560, power: 175, period: 3 });
      t.chimney({ height: 340, hazard: 'shards' });
      t.traverse({ n: 3, w: 120, types: ['solid', 'crack'] });
      t.chimney({ height: 400, rests: 1, hazard: 'shards', lip: 0.6 });
      t.traverse({ n: 2, w: 125 });
      t.crown({ w: 240 });
      t.scatterFish(3, 58);
      t.fishAt(5, 94, 'speed');
      // The blink, out past the lip.
      //
      // A blink carries sideways and never up, which on a wall makes it the
      // exact answer to the one problem a wall poses that a jump cannot: the
      // overhang. Getting to it means leaving the rock in a gale, and there is
      // nothing under it for a long way down.
      t.charged(8, 'quantum', 126, 34);
      t.checkpoint(t.floes[2]);
      t.checkpoint(t.floes[7]);
    },
  },
  {
    name: 'Buz Kulesi',
    subtitle: 'Aşağı bakma',
    en: { name: 'Ice Tower', subtitle: 'Do not look down' },
    target: 104,
    effort: 1.48,
    build: (t) => {
      t.base({ w: 215 });
      t.steps({ n: 2, rise: 0.6, w: 130 });
      t.chimney({ height: 380, rests: 1, hazard: 'shards' });
      t.traverse({ n: 3, w: 118, types: ['slip', 'solid'] });
      t.chimney({ height: 300, rests: 1 });
      t.gale({ height: 300, power: 180, period: 2.9 });
      t.traverse({ n: 3, w: 118, types: ['solid', 'fake'] });
      t.face({ height: 190, side: 1, exit: 155 });
      t.crown({ w: 240 });
      t.scatterFish(3, 58);
      t.fishAt(6, 46, 'dizzy');
      t.checkpoint(t.floes[3]);
      t.checkpoint(t.floes[8]);
      t.checkpoint(t.floes[13]);
    },
  },
  {
    name: 'Zirve',
    subtitle: 'Antarktika ayaklarının altında',
    en: { name: 'The Summit', subtitle: 'Antarctica under your feet' },
    target: 116,
    effort: 1.07,
    build: (t) => {
      t.base({ w: 210 });
      t.gale({ height: 900, power: 180, period: 2.8 });
      /* Two points of arithmetic over the line, and it counts. The summit's
         first shaft priced out at 68% of a bar against its own 66% limit once
         the bottom of it was charged at the creeping rate it is actually
         climbed at. Nobody reported this one — it is the level after the one
         that was reported, and it was over by the same rule. */
      t.chimney({ height: 345, hazard: 'shards' });
      t.traverse({ n: 3, w: 116, types: ['crack', 'solid'] });
      /* Taller than it was, because the summit had gone soft in the one place
         the chapter measures.
         Cutting the first shaft to satisfy the honest budget cost this level
         real difficulty: on the arm-bar reading it finished with a third of a
         bar while 42, 44 and 45 finish with a tenth — the finale was the
         easiest of the last four on the chapter's own axis. This shaft has a
         rest in it, so each of its two legs is measured separately and both
         had room. The height goes back into the half of the climb that can
         carry it. */
      t.chimney({ height: 400, rests: 1, hazard: 'shards', lip: 0.62 });
      t.traverse({ n: 3, w: 116, types: ['solid', 'fake'] });
      t.face({ height: 185, side: -1, exit: 150 });
      /* Forty pixels taller, and worth writing down what that did not do.
         Cutting shaft one to satisfy the honest budget cost this level
         difficulty on the chapter's own axis: it finishes with a third of a
         bar where 42, 44 and 45 finish with a tenth. Three ways to give it
         back were tried. The middle shaft is at the height the *physics*
         allows — the solver cannot climb 415 there, let alone 500. Shafts one
         and two sit exactly on the *budget* line. This one had room in both,
         so the height went here — and the measured arm reading did not move a
         point, because the level's binding step is elsewhere and that step is
         itself against one of the two limits.
         So the summit is as demanding of the arm as this chapter's geometry
         permits, and the difficulty tool's "easy" flag on it is a fact about
         the ceiling rather than about the plan. The extra height stays: it is
         more climbing on the last climb, honestly priced. */
      t.chimney({ height: 340, hazard: 'shards' });
      t.crown({ w: 250 });
      t.scatterFish(3, 58);
      t.fishAt(7, 92, 'speed');
      t.fishAt(10, 46, 'heavy');
      t.checkpoint(t.floes[2]);
      t.checkpoint(t.floes[7]);
      t.checkpoint(t.floes[12]);
    },
  },
];

/** The level number this chapter starts on. */
export const CLIMB_FROM = 32;

/**
 * Which plans are actually in the campaign.
 *
 * Every level here validates geometrically. Seven of them also survive
 * `climb-run.mjs`, which drives the real physics up the real route and searches
 * for an input sequence that works; the other eight have a step it cannot find
 * a way through, and a level nobody can prove is climbable does not ship. They
 * stay in this file because the plans are good and the composer is what needs
 * more work — but they are not in the game until the solver says they are.
 */
/** Compose one plan into a level definition at the given number. */
function compose(plan, id) {
  const tower = new Tower({ scale: scaleForLevel(id), width: 660, effort: plan.effort });
  plan.build(tower);
  const def = tower.build({
    id,
    name: plan.name,
    subtitle: plan.subtitle,
    en: plan.en,
    intro: null,
    target: plan.target,
    chapter: 2,
  });
  def.signs = (plan.signs ?? []).map((s) => ({
    x: def.spawn.x + (s.dx ?? 0),
    y: def.spawn.y + (s.dy ?? -96),
    text: s.text,
  }));
  def.ship = plan.ship !== false;
  def.menace = menaceFor((id - CLIMB_FROM) / (CLIMB_PLANS.length - 1));
  return def;
}

export const CLIMB_LEVELS = CLIMB_PLANS.filter((p) => p.ship !== false).map((plan, i) =>
  compose(plan, CLIMB_FROM + i),
);

/**
 * Every plan, shipped or not, numbered as if they all were.
 *
 * Only the solver reads this: it is how a held-back plan gets worked on without
 * being in the game, and how the day it starts passing is noticed.
 */
export const CLIMB_DRAFTS = CLIMB_PLANS.map((plan, i) => compose(plan, CLIMB_FROM + i));
