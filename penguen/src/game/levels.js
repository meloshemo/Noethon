/**
 * Handcrafted levels.
 *
 * These are written as *plans*, not as coordinates. A plan says "a shelf, then
 * a climb, then a tunnel with cracking ice in it"; the composer in terrain.js
 * turns that into geometry using the penguin's real reach at that level's
 * growth scale. Nobody types a pixel gap, so nobody can type an impossible one.
 *
 * The ramp, which is the single most important thing in this game:
 *   1–3   pure movement. Wide ice, small gaps, nothing that can kill you but
 *         the sea, and it takes real effort to find it. The player learns the
 *         verbs and nothing else.
 *   4–8   one new kind of ice per level, always with solid ground right after.
 *   9–13  the continent arrives: slopes, the first crevasse, the first tunnel.
 *         Mechanics start combining, checkpoints appear.
 *   14–18 real pressure. Traps, storms, seals, bait that poisons you.
 *   19–22 the ambushes: geysers that throw you off the map, orcas out of the
 *         water, a summit with a long way down.
 *   23–30 nothing can be trusted — including ice that looks completely solid
 *         and is not. Tunnels full of it, chained geysers, cliffs taken at
 *         speed, and a cornice that can come down on the run to the raft.
 *         This is where the game is meant to hurt.
 *   31+   procedurally generated (see generator.js).
 *
 * Nothing here explains itself. No intro cards, no signs past the one that
 * names the controls: the player finds out what ice does by standing on it.
 * That is the whole reason the ambush mechanics exist, and a card that spoils
 * them in advance throws the surprise away.
 */

import { Course, WATER, SEA_LEVEL } from './terrain.js';
import { scaleForLevel, menaceFor} from './config.js';

export const WATER_Y = WATER;
export const GROUND_Y = SEA_LEVEL;

/**
 * @typedef {{name:string, subtitle:string, target:number, build:(c:Course)=>void}} Plan
 * @type {Plan[]}
 */
/**
 * `tight` is the chapter's difficulty curve, written down.
 *
 * Every gap a plan asks for is multiplied by it. The plans state gaps as
 * fractions of the penguin's real reach, which is what makes an impossible one
 * impossible to write — but it is not a curve, and measured, this chapter had
 * none. It sloped at *minus* fifty-three percent: levels one to eleven were
 * harder than twenty-seven to thirty-one, and the most forgiving level in the
 * whole chapter was the twenty-eighth.
 */
const PLANS = [
  /* ---------------------------------------------------- 1-3 · verbs */
  {
    name: 'İlk Adımlar',
    subtitle: 'Buzul kıyısı',
    en: { name: 'First Steps', subtitle: 'The edge of the glacier' },
    target: 30,
    tight: 0.8,
    signs: [{ dx: 90, dy: -96, text: 'Yürü: ← →  •  Zıpla: BOŞLUK' }],
    build: (c) => {
      c.shelf({ n: 4, gap: 0.3, w: 230 });
      c.landing({ w: 240 });
      c.scatterFish(3, 58);
    },
  },
  {
    name: 'Açık Sular',
    subtitle: 'Buzlar seyreliyor',
    en: { name: 'Open Water', subtitle: 'The floes are thinning' },
    target: 36,
    tight: 0.817,
    build: (c) => {
      c.shelf({ n: 3, gap: 0.46, w: 180, wave: 22 });
      c.slope({ n: 2, rise: 0.34, gap: 0.4, w: 170 });
      c.slope({ n: 3, rise: -0.34, gap: 0.4, w: 165 });
      c.landing({ w: 210 });
      c.scatterFish(3, 60);
    },
  },
  {
    name: 'Basamaklar',
    subtitle: 'Yukarı, aşağı',
    en: { name: 'Steps', subtitle: 'Up, then down' },
    target: 42,
    tight: 0.833,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 190 });
      c.slope({ n: 4, rise: 0.46, gap: 0.44, w: 135 });
      c.shelf({ n: 3, gap: 0.46, w: 150, wave: 18 });
      c.slope({ n: 4, rise: -0.44, gap: 0.44, w: 145 });
      c.landing({ w: 210 });
      c.scatterFish(3, 60);
    },
  },

  /* ------------------------------------------------ 4-8 · the ice */
  {
    name: 'Çatlak',
    subtitle: 'Ayağının altında',
    en: { name: 'The Crack', subtitle: 'Right under your feet' },
    target: 46,
    tight: 0.85,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 180 });
      c.slope({ n: 3, rise: 0.42, gap: 0.44, w: 155 });
      c.shelf({ n: 5, gap: 0.5, w: 140, types: ['crack', 'solid'] });
      c.slope({ n: 3, rise: -0.4, gap: 0.44, w: 150, types: ['solid', 'crack'] });
      c.landing();
      c.scatterFish(3, 62);
    },
  },
  {
    name: 'Cilalı Buz',
    subtitle: 'Fren yok',
    en: { name: 'Polished Ice', subtitle: 'No brakes' },
    target: 50,
    tight: 0.867,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 175 });
      c.slope({ n: 4, rise: 0.42, gap: 0.46, w: 145, type: 'slip' });
      c.shelf({ n: 4, gap: 0.5, w: 165, types: ['slip', 'solid'] });
      c.slope({ n: 4, rise: -0.4, gap: 0.44, w: 155, type: 'slip' });
      c.landing();
      c.scatterFish(3, 62);
    },
  },
  {
    name: 'Eriyen Zemin',
    subtitle: 'Bekle, sonra geç',
    en: { name: 'Melting Ground', subtitle: 'Wait, then cross' },
    target: 54,
    tight: 0.883,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.42, w: 180 });
      c.slope({ n: 2, rise: 0.5, gap: 0.46, w: 160 });
      for (let i = 0; i < 4; i++) {
        c.put(c.gapOf(0.56), 145, c.y, 'melt', { meltPhase: i * 0.27, meltPeriod: 2.9 });
        c.put(c.gapOf(0.46), 160, c.y - (i % 2 ? c.riseOf(0.4) : 0));
      }
      c.slope({ n: 3, rise: -0.44, gap: 0.44, w: 165 });
      c.landing();
      c.scatterFish(3, 62);
    },
  },
  {
    name: 'Akıntı',
    subtitle: 'Buz da yolculuk eder',
    en: { name: 'The Current', subtitle: 'Ice travels too' },
    target: 56,
    tight: 0.9,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 180 });
      for (let i = 0; i < 4; i++) {
        c.put(c.gapOf(0.46), 135, c.y, 'move', { ax: 92, period: 3.1, phase: i * 0.9 });
        c.put(c.gapOf(0.44), 155, c.y - c.riseOf(0.38));
      }
      c.slope({ n: 3, rise: -0.42, gap: 0.44, w: 165 });
      c.landing();
      c.scatterFish(3, 62);
    },
  },
  {
    name: 'Düşen Buz',
    subtitle: 'Bastığın an kaçar',
    en: { name: 'Falling Ice', subtitle: 'Gone the moment you land' },
    target: 58,
    tight: 0.917,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 175 });
      c.shelf({ n: 4, gap: 0.54, w: 128, types: ['fall', 'solid'] });
      c.slope({ n: 4, rise: 0.46, gap: 0.48, w: 135 });
      c.shelf({ n: 4, gap: 0.54, w: 128, types: ['fall', 'solid'] });
      c.slope({ n: 3, rise: -0.42, gap: 0.44, w: 155 });
      c.landing();
      c.scatterFish(3, 62);
      c.temptation(0.6, 'heavy');
    },
  },

  /* ------------------------------------------ 9-13 · the continent */
  {
    name: 'Yamaç',
    subtitle: 'Kıta yükseliyor',
    en: { name: 'The Slope', subtitle: 'The continent rises' },
    target: 62,
    tight: 0.933,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.42, w: 175 });
      c.slope({ n: 6, rise: 0.58, gap: 0.48, w: 120 });
      c.shelf({ n: 3, gap: 0.5, w: 150, types: ['crack', 'solid'] });
      c.cliff({ drop: 340, ledges: 4 });
      c.landing();
      c.scatterFish(3, 62);
      c.checkpoint(c.at(0.55));
    },
  },
  {
    name: 'Yarık',
    subtitle: 'Altında dip yok',
    en: { name: 'The Rift', subtitle: 'There is no bottom to it' },
    target: 64,
    tight: 0.95,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.42, w: 175 });
      c.slope({ n: 3, rise: 0.5, gap: 0.46, w: 150 });
      c.crevasse({ pillars: 3, gap: 0.68, depth: 260 });
      c.shelf({ n: 2, gap: 0.48, w: 155, types: ['crack', 'solid'] });
      c.crevasse({ pillars: 4, gap: 0.7, depth: 300 });
      c.slope({ n: 3, rise: -0.44, gap: 0.44, w: 160 });
      c.landing();
      c.scatterFish(3, 64);
      c.checkpoint(c.at(0.5));
    },
  },
  {
    name: 'Buz Tüneli',
    subtitle: 'Tavan alçak',
    en: { name: 'Ice Tunnel', subtitle: 'The ceiling is low' },
    target: 66,
    tight: 0.967,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 175 });
      c.slope({ n: 2, rise: -0.4, gap: 0.44, w: 160 });
      c.tunnel({ n: 7, headroom: 110, gap: 0.52, w: 135 });
      c.slope({ n: 3, rise: 0.44, gap: 0.44, w: 150 });
      c.landing();
      c.scatterFish(3, 62);
      c.temptation(0.5, 'dizzy');
      c.checkpoint(c.at(0.35));
    },
  },
  {
    name: 'Sarkıtlar',
    subtitle: 'Yukarıdan düşen',
    en: { name: 'Icicles', subtitle: 'Coming down from above' },
    target: 68,
    tight: 0.983,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 175 });
      c.slope({ n: 2, rise: 0.46, gap: 0.44, w: 155 });
      c.tunnel({ n: 8, headroom: 116, gap: 0.52, w: 135, icicles: 5 });
      c.slope({ n: 4, rise: -0.42, gap: 0.44, w: 155, type: 'crack' });
      c.landing();
      c.scatterFish(3, 62);
      c.checkpoint(c.at(0.3));
    },
  },
  {
    name: 'Foklar',
    subtitle: 'Yolun üstünde',
    en: { name: 'Seals', subtitle: 'Right on the route' },
    target: 68,
    tight: 1.0,
    build: (c) => {
      c.shelf({ n: 3, gap: 0.44, w: 180 });
      c.seal(c.at(0.35), { speed: 82 });
      c.slope({ n: 4, rise: 0.5, gap: 0.48, w: 140 });
      c.seal(undefined, { speed: 92 });
      c.shelf({ n: 3, gap: 0.5, w: 155 });
      c.seal(undefined, { speed: 86 });
      c.cliff({ drop: 300, ledges: 3 });
      c.landing();
      c.scatterFish(3, 62);
      c.checkpoint(c.at(0.55));
    },
  },

  /* ------------------------------------------- 14-18 · the pressure */
  {
    name: 'Sahte Zemin',
    subtitle: 'Göründüğü gibi değil',
    en: { name: 'False Ground', subtitle: 'Not what it looks like' },
    target: 68,
    tight: 1.017,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 170 });
      c.slope({ n: 3, rise: 0.5, gap: 0.46, w: 150 });
      c.put(c.gapOf(0.5), 68, c.y, 'trap');
      c.put(c.gapOf(0.42), 160, c.y);
      c.slope({ n: 4, rise: 0.4, gap: 0.5, w: 138, types: ['solid', 'fake'] });
      c.put(c.gapOf(0.5), 68, c.y, 'trap');
      c.put(c.gapOf(0.42), 165, c.y);
      c.cliff({ drop: 380, ledges: 4 });
      c.landing();
      c.scatterFish(3, 62);
      c.temptation(0.55, 'heavy');
      c.checkpoint(c.at(0.55));
    },
  },
  {
    name: 'Fırtına Kıyısı',
    subtitle: 'Rüzgâr geri itiyor',
    en: { name: 'Storm Coast', subtitle: 'The wind pushes you back' },
    target: 72,
    tight: 1.033,
    build: (c) => {
      c.shelf({ n: 3, gap: 0.42, w: 175 });
      const from = c.x;
      c.shelf({ n: 5, gap: 0.46, w: 160 });
      c.storm(from, { period: 4.6 });
      // The first gap the wind has to carry you over. It comes after five
      // ledges of being pushed around by the same wind, so by the time the
      // gap arrives the beat is already familiar.
      c.windGap({ w: 200 });
      c.slope({ n: 3, rise: 0.46, gap: 0.44, w: 150 });
      c.landing();
      c.scatterFish(3, 62);
      c.sprint(0.55);
      c.checkpoint(c.at(0.4));
    },
  },
  {
    name: 'Çürük Yem',
    subtitle: 'Her balık iyi balık değil',
    en: { name: 'Rotten Bait', subtitle: 'Not every fish is a good fish' },
    target: 70,
    tight: 1.05,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.44, w: 170 });
      c.slope({ n: 4, rise: 0.52, gap: 0.46, w: 145 });
      c.tunnel({ n: 5, headroom: 112, gap: 0.5, w: 140 });
      c.cliff({ drop: 300, ledges: 3 });
      c.shelf({ n: 3, gap: 0.5, w: 150, types: ['crack', 'solid'] });
      c.landing();
      c.scatterFish(3, 62);
      c.temptation(0.34, 'dizzy');
      c.temptation(0.58, 'heavy');
      // The fourth bad fish, introduced on the level whose whole subject is
      // bad fish, and placed above the cracked shelf: losing your grip on ice
      // that is already going is how you learn what this one costs.
      c.temptation(0.72, 'slick');
      c.checkpoint(c.at(0.5));
    },
  },
  {
    name: 'Uçurum Yolu',
    subtitle: 'Aşağısı çok aşağı',
    en: { name: 'Cliff Road', subtitle: 'A very long way down' },
    target: 74,
    tight: 1.067,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 170 });
      c.summit({ height: 260, steps: 3, w: 180 });
      c.shelf({ n: 3, gap: 0.5, w: 140, types: ['crack', 'solid'] });
      c.cliff({ drop: 380, ledges: 4, gap: 0.38 });
      c.crevasse({ pillars: 3, gap: 0.68, depth: 250 });
      c.landing();
      c.scatterFish(3, 62);
      c.sprint(0.3);
      c.checkpoint(c.at(0.6));
    },
  },
  {
    name: 'Kaçan Buz',
    subtitle: 'Tam inerken',
    en: { name: 'Vanishing Ice', subtitle: 'Just as you land' },
    target: 72,
    tight: 1.083,
    build: (c) => {
      c.shelf({ n: 3, gap: 0.44, w: 170 });
      for (let i = 0; i < 4; i++) {
        // The snap floe hangs low and inviting *in the gap*, which is the only
        // reason anybody ever lands on one — and the only place it can go
        // without firing under the floe you were aiming for.
        // The bait piece lands its own far side now, so the plan no longer
        // adds one: two ledges here would put a floe on top of the trap.
        c.bait();
      }
      c.slope({ n: 4, rise: 0.48, gap: 0.44, w: 150 });
      c.tunnel({ n: 4, headroom: 114, gap: 0.5, w: 140 });
      c.cliff({ drop: 320, ledges: 3 });
      c.landing();
      c.scatterFish(3, 62);
      c.checkpoint(c.at(0.55));
    },
  },

  /* ------------------------------------------ 19-22 · the ambushes */
  {
    name: 'Gayzer',
    subtitle: 'Buz tıslamaya başlarsa',
    en: { name: 'Geyser', subtitle: 'If the ice starts hissing' },
    target: 76,
    tight: 1.1,
    build: (c) => {
      c.shelf({ n: 3, gap: 0.42, w: 170 });
      for (let i = 0; i < 4; i++) {
        c.put(c.gapOf(0.46), 190, c.y, 'burst');
        c.put(c.gapOf(0.44), 165, c.y - c.riseOf(0.44));
      }
      c.cliff({ drop: 360, ledges: 4 });
      c.landing();
      c.scatterFish(3, 62);
      c.checkpoint(c.at(0.5));
    },
  },
  {
    name: 'Katil Balina',
    subtitle: 'Boşluklara dikkat',
    en: { name: 'Killer Whale', subtitle: 'Mind the gaps' },
    target: 78,
    tight: 1.117,
    build: (c) => {
      c.shelf({ n: 3, gap: 0.44, w: 170 });
      for (let i = 0; i < 4; i++) {
        const before = c.x;
        c.put(c.gapOf(0.66), 155, c.y);
        c.hazard({
          kind: 'orca',
          x: before + 24,
          y: WATER - 30,
          w: 76,
          h: 60,
          period: 2.9 + i * 0.25,
          height: 260,
        });
        if (i < 3) c.slope({ n: 2, rise: 0.48, gap: 0.44, w: 150 });
      }
      c.cliff({ drop: 380, ledges: 4 });
      c.landing();
      c.scatterFish(3, 62);
      // The first coil in the game, hung over the orca run.
      //
      // It is here rather than on a quiet level on purpose. The one thing a
      // player wants while a whale is coming up through the gap is to be
      // somewhere much higher very quickly, and the fish that does exactly
      // that is floating just above their head. Nothing is behind it and the
      // gaps are all crossable without it — but nobody believes that the
      // first time, and going for it while the water moves is the moment the
      // colours stop being decoration.
      c.charged(0.46, 'coil');
      c.checkpoint(c.at(0.55));
    },
  },
  {
    name: 'Zirve',
    subtitle: 'Kıtanın tepesi',
    en: { name: 'The Peak', subtitle: 'The top of the continent' },
    target: 84,
    tight: 1.133,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 170 });
      c.summit({ height: 280, steps: 4, w: 175 });
      c.shelf({ n: 3, gap: 0.5, w: 145, types: ['crack', 'solid'] });
      c.summit({ height: 210, steps: 3, w: 165 });
      c.cliff({ drop: 460, ledges: 5, gap: 0.36 });
      c.landing();
      c.scatterFish(3, 64);
      c.sprint(0.65);
      c.checkpoint(c.at(0.6));
    },
  },
  {
    name: 'Derin Tünel',
    subtitle: 'Işık yok',
    en: { name: 'Deep Tunnel', subtitle: 'No light' },
    target: 82,
    tight: 1.15,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 170 });
      c.slope({ n: 2, rise: -0.42, gap: 0.44, w: 155 });
      c.tunnel({ n: 10, headroom: 106, gap: 0.5, w: 130, icicles: 6, types: ['solid', 'crack'] });
      // The first hush in the game, and it comes straight out of the dark.
      //
      // Ten floes of low ceiling with icicles coming down, then the tunnel
      // opens and the far side is impossibly far and impossibly high, and the
      // air between them is full of snow that has forgotten how to fall. There
      // is no sign and no tutorial. The player walks in, jumps because there is
      // nothing else to do, and goes five hundred pixels.
      //
      // Everything about the placement is about that one moment. It is on a
      // quiet level rather than a busy one, so nothing else is competing for
      // attention; it is after a tunnel, so the contrast between a hundred
      // pixels of headroom and an open sky is as wide as the chapter can make
      // it; and it is level twenty-two, by which point the player is certain
      // they know exactly how far this penguin jumps.
      c.hush({});
      c.slope({ n: 4, rise: 0.46, gap: 0.44, w: 150 });
      c.landing();
      c.scatterFish(3, 60);
      c.temptation(0.42, 'blind');
      c.temptation(0.66, 'dizzy');
      c.checkpoint(c.at(0.4));
    },
  },

  /* -------------------------------------------- 23-30 · the hurting */
  {
    name: 'Tuzak Tüneli',
    subtitle: 'Alçak ve kötü niyetli',
    en: { name: 'Trap Tunnel', subtitle: 'Low, and out to get you' },
    target: 84,
    tight: 1.167,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.42, w: 165 });
      c.slope({ n: 4, rise: 0.52, gap: 0.46, w: 140 });
      c.tunnel({ n: 8, headroom: 108, gap: 0.48, w: 138, icicles: 5, types: ['solid', 'fake', 'solid'] });
      c.put(c.gapOf(0.48), 68, c.y, 'trap');
      c.put(c.gapOf(0.42), 160, c.y);
      c.cliff({ drop: 320, ledges: 3 });
      c.landing();
      c.scatterFish(3, 60);
      c.temptation(0.6, 'dizzy');
      c.checkpoint(c.at(0.5));
    },
  },
  {
    name: 'Gayzer Zinciri',
    subtitle: 'Biri diğerini tetikler',
    en: { name: 'Geyser Chain', subtitle: 'One sets off the next' },
    target: 86,
    tight: 1.183,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.42, w: 165 });
      for (let i = 0; i < 5; i++) {
        c.put(c.gapOf(0.44), 190, c.y, 'burst', { burstPeriod: 3.1 + i * 0.35, burstPhase: i * 0.55 });
        c.put(c.gapOf(0.42), 150, c.y - c.riseOf(0.4));
      }
      c.slope({ n: 2, rise: -0.48, gap: 0.44, w: 160 });
      c.crevasse({ pillars: 3, gap: 0.66, depth: 280 });
      c.landing();
      c.scatterFish(3, 60);
      // The blink, on the one level where you spend half your time being
      // thrown. A geyser decides your height; this decides where that height
      // gets spent, and the two together are a route the level never drew.
      c.charged(0.5, 'quantum');
      c.sprint(0.4);
      c.checkpoint(c.at(0.55));
    },
  },
  {
    name: 'Rüzgârlı Yamaç',
    subtitle: 'Yokuş yukarı, rüzgâra karşı',
    en: { name: 'Windward Slope', subtitle: 'Uphill, into the wind' },
    target: 88,
    tight: 1.2,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 165 });
      const from = c.x;
      c.slope({ n: 6, rise: 0.56, gap: 0.46, w: 130 });
      c.storm(from, { period: 4.6 });
      // A climb you cannot make on your own legs, with the air doing the
      // lifting. The column is right there under the shelf, so the answer is
      // visible from the ledge you are standing on.
      c.updraft({ w: 175 });
      c.shelf({ n: 2, gap: 0.48, w: 150, types: ['crack', 'solid'] });
      // Rising air and dead air, on the same level, twenty seconds apart.
      //
      // They are opposites and the level is built so that you find that out.
      // The column gives you height while the world keeps pulling normally, so
      // the answer is to be *in* it at the right moment. The hollow takes the
      // pulling away, so the answer is to be in it at all. One is a thing you
      // time and the other is a place you stand, and putting them back to back
      // is the cheapest way to teach both.
      c.hush({});
      c.cliff({ drop: 400, ledges: 4 });
      c.landing();
      c.scatterFish(3, 60);
      c.temptation(0.55, 'heavy');
      c.checkpoint(c.at(0.55));
    },
  },
  {
    name: 'Yeraltı Nehri',
    subtitle: 'Tünelin altında su',
    en: { name: 'Underground River', subtitle: 'Water beneath the tunnel' },
    target: 90,
    tight: 1.217,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 160 });
      c.slope({ n: 3, rise: -0.44, gap: 0.44, w: 155 });
      c.tunnel({ n: 9, headroom: 104, gap: 0.5, w: 128, icicles: 6, types: ['solid', 'melt'] });
      c.crevasse({ pillars: 3, gap: 0.64, depth: 220 });
      c.slope({ n: 4, rise: 0.5, gap: 0.46, w: 140 });
      c.landing();
      c.scatterFish(3, 58);
      c.temptation(0.45, 'blind');
      // Under a hundred-and-four-pixel ceiling, where the only safe way
      // through is to stop and go. Slick takes away the stopping.
      c.temptation(0.6, 'slick');
      c.checkpoint(c.at(0.45));
    },
  },
  {
    name: 'Kırılgan Zirve',
    subtitle: 'Yukarısı da güvenli değil',
    en: { name: 'Brittle Summit', subtitle: 'The top is no safer' },
    target: 92,
    tight: 1.233,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 160 });
      c.summit({ height: 270, steps: 4, w: 160 });
      c.shelf({ n: 4, gap: 0.5, w: 138, types: ['crack', 'fake', 'solid'] });
      c.put(c.gapOf(0.44), 190, c.y, 'burst');
      c.cliff({ drop: 440, ledges: 5, gap: 0.36 });
      c.landing();
      c.scatterFish(3, 58);
      c.sprint(0.35);
      c.checkpoint(c.at(0.6));
    },
  },
  {
    name: 'Buzul Labirenti',
    subtitle: 'İn, çık, in',
    en: { name: 'Glacier Maze', subtitle: 'Down, up, down' },
    target: 96,
    tight: 1.25,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 160 });
      c.tunnel({ n: 6, headroom: 106, gap: 0.48, w: 135, icicles: 4 });
      c.slope({ n: 4, rise: 0.54, gap: 0.46, w: 132 });
      c.crevasse({ pillars: 4, gap: 0.68, depth: 260 });
      c.tunnel({ n: 6, headroom: 104, gap: 0.48, w: 130, types: ['solid', 'fake'] });
      c.cliff({ drop: 340, ledges: 4 });
      c.landing();
      c.scatterFish(3, 58);
      c.temptation(0.32, 'dizzy');
      c.temptation(0.68, 'heavy');
      // Slack, over the second tunnel — the one with the fake floors in it.
      // A floe that vanishes under you is a timing problem, and this is the
      // only thing in the game that gives you longer to solve one.
      c.charged(0.72, 'slack');
      c.checkpoint(c.at(0.45));
    },
  },
  {
    name: 'Avcılar',
    subtitle: 'Sudan ve buzdan',
    en: { name: 'Hunters', subtitle: 'From the water and the ice' },
    target: 98,
    tight: 1.267,
    build: (c) => {
      c.shelf({ n: 3, gap: 0.44, w: 160 });
      for (let i = 0; i < 4; i++) {
        const before = c.x;
        c.put(c.gapOf(0.64), 150, c.y);
        c.hazard({ kind: 'orca', x: before + 22, y: WATER - 30, w: 76, h: 60, period: 2.7 + i * 0.2, height: 265 });
        const f = c.floes[c.floes.length - 1];
        c.seal(f, { speed: 96 });
      }
      c.summit({ height: 220, steps: 3, w: 160 });
      c.cliff({ drop: 360, ledges: 4 });
      c.landing();
      c.scatterFish(3, 58);
      // Seals below, whales beneath, and a fish that takes your footing away.
      // This one is not a decision, it is a dare.
      c.temptation(0.52, 'slick');
      c.checkpoint(c.at(0.55));
    },
  },
  {
    name: 'Son Fırtına',
    subtitle: 'Her şey aynı anda',
    en: { name: 'The Last Storm', subtitle: 'Everything at once' },
    target: 102,
    tight: 1.283,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 155 });
      const from = c.x;
      c.slope({ n: 3, rise: 0.5, gap: 0.46, w: 135 });
      c.put(c.gapOf(0.44), 190, c.y, 'burst');
      c.shelf({ n: 2, gap: 0.5, w: 140, types: ['crack', 'solid'] });
      c.storm(from, { period: 4.6 });
      c.windGap({ w: 180 });
      c.tunnel({ n: 6, headroom: 104, gap: 0.48, w: 130, icicles: 4, types: ['solid', 'crack'] });
      c.crevasse({ pillars: 4, gap: 0.64, depth: 280 });
      c.cliff({ drop: 360, ledges: 4 });
      c.landing();
      c.scatterFish(3, 58);
      c.temptation(0.4, 'heavy');
      c.temptation(0.56, 'slick');
      // A coil above the storm. A wound spring and a tailwind arriving on the
      // same beat is the longest jump this chapter can produce, and the level
      // is built so that finding out is worth a run of its own.
      c.charged(0.66, 'coil');
      c.sprint(0.62);
      c.checkpoint(c.at(0.4));
      c.checkpoint(c.at(0.75));
    },
  },
  {
    name: 'Kuzeye Açılan Yol',
    subtitle: 'Salı görüyorsun',
    en: { name: 'The Road North', subtitle: 'You can see the raft' },
    target: 108,
    tight: 1.3,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.4, w: 155 });
      c.summit({ height: 290, steps: 4, w: 155 });
      c.updraft({ w: 165 });
      c.tunnel({ n: 6, headroom: 102, gap: 0.48, w: 128, icicles: 4, types: ['solid', 'fake', 'trap'] });
      c.cliff({ drop: 460, ledges: 5, gap: 0.36 });
      for (let i = 0; i < 4; i++) {
        const before = c.x;
        c.put(c.gapOf(0.62), 145, c.y, i === 1 ? 'burst' : 'solid');
        c.hazard({ kind: 'orca', x: before + 20, y: WATER - 30, w: 76, h: 60, period: 2.6 + i * 0.2, height: 270 });
      }
      c.crevasse({ pillars: 4, gap: 0.66, depth: 300 });
      // And once more at the very end, with everything already spent. By now
      // the player knows what the pale air means, so this is not a discovery —
      // it is a rest that does not feel like one, four seconds of hanging in
      // the sky at the end of the longest level on the shelf.
      c.hush({});
      c.landing({ w: 250 });
      c.scatterFish(3, 58);
      c.temptation(0.45, 'dizzy');
      /* And the fish that turns the equipment off, on the level that offers
         the most of it.
         Every other bait here makes the penguin worse at what it is already
         doing. This one takes away what the player *bought* — the glide and
         the motor, the two things somebody who has been shopping reaches for
         the moment a gap looks too wide. Put it at the far end, past the
         charged fish, where the shelf's longest crevasse is still ahead: the
         answer to being in trouble stops working at the exact moment the level
         starts asking. */
      c.temptation(0.86, 'stiff');
      // The last shelf level offers all three at once, spread wide enough that
      // taking one is choosing not to take the others. That is the exam: not
      // whether you can use them, but whether you know which one this stretch
      // of ice is asking for.
      c.charged(0.3, 'slack');
      c.charged(0.55, 'quantum');
      c.charged(0.8, 'coil');
      c.sprint(0.7);
      c.checkpoint(c.at(0.4));
      c.checkpoint(c.at(0.78));
    },
  },
];

/** Compose every plan once, at module load. */
export const LEVELS = PLANS.map((plan, i) => {
  const id = i + 1;
  const course = new Course({ scale: scaleForLevel(id), tight: plan.tight });
  plan.build(course);
  const def = course.build({
    id,
    name: plan.name,
    subtitle: plan.subtitle,
    en: plan.en,
    intro: null,
    target: plan.target,
  });
  def.menace = menaceFor((id - 1) / (PLANS.length - 1));
  // Signs are placed relative to the spawn, which the composer decides.
  def.signs = (plan.signs ?? []).map((s) => ({
    x: def.spawn.x + (s.dx ?? 0),
    y: def.spawn.y + (s.dy ?? -96),
    text: s.text,
  }));
  return def;
});
