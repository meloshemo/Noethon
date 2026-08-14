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
import { scaleForLevel } from './config.js';

export const WATER_Y = WATER;
export const GROUND_Y = SEA_LEVEL;

/**
 * @typedef {{name:string, subtitle:string, target:number, build:(c:Course)=>void}} Plan
 * @type {Plan[]}
 */
const PLANS = [
  /* ---------------------------------------------------- 1–3 · verbs */
  {
    name: 'İlk Adımlar',
    subtitle: 'Buzul kıyısı',
    target: 30,
    signs: [{ dx: 90, dy: -96, text: 'Yürü: ← →  •  Zıpla: BOŞLUK' }],
    build: (c) => {
      c.shelf({ n: 4, gap: 0.26, w: 250 });
      c.landing({ w: 250 });
      c.scatterFish(3, 58);
    },
  },
  {
    name: 'Açık Sular',
    subtitle: 'Buzlar seyreliyor',
    target: 34,
    build: (c) => {
      c.shelf({ n: 3, gap: 0.4, w: 200, wave: 16 });
      c.slope({ n: 2, rise: 0.3, gap: 0.34, w: 190 });
      c.slope({ n: 2, rise: -0.3, gap: 0.32, w: 190 });
      c.landing({ w: 230 });
      c.scatterFish(3, 60);
    },
  },
  {
    name: 'Basamaklar',
    subtitle: 'Yukarı, aşağı',
    target: 40,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 210 });
      c.slope({ n: 3, rise: 0.4, gap: 0.36, w: 150 });
      c.shelf({ n: 2, gap: 0.34, w: 170 });
      c.slope({ n: 3, rise: -0.4, gap: 0.34, w: 160 });
      c.landing({ w: 230 });
      c.scatterFish(3, 60);
    },
  },

  /* ------------------------------------------------ 4–8 · the ice */
  {
    name: 'Çatlak',
    subtitle: 'Ayağının altında',
    target: 42,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.32, w: 200 });
      c.slope({ n: 2, rise: 0.34, gap: 0.36, w: 180 });
      c.shelf({ n: 4, gap: 0.42, w: 165, types: ['crack', 'solid'] });
      c.slope({ n: 3, rise: -0.3, gap: 0.36, w: 170, types: ['solid', 'crack'] });
      c.landing();
      c.scatterFish(3, 62);
    },
  },
  {
    name: 'Cilalı Buz',
    subtitle: 'Fren yok',
    target: 44,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.32, w: 195 });
      c.slope({ n: 3, rise: 0.34, gap: 0.36, w: 175, type: 'slip' });
      c.shelf({ n: 3, gap: 0.4, w: 200, types: ['slip', 'solid'] });
      c.slope({ n: 3, rise: -0.3, gap: 0.34, w: 190, type: 'slip' });
      c.landing();
      c.scatterFish(3, 62);
    },
  },
  {
    name: 'Eriyen Zemin',
    subtitle: 'Bekle, sonra geç',
    target: 48,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.32, w: 200 });
      c.slope({ n: 2, rise: 0.4, gap: 0.36, w: 175 });
      for (let i = 0; i < 3; i++) {
        c.put(c.gapOf(0.44), 165, c.y, 'melt', { meltPhase: i * 0.33, meltPeriod: 3.4 });
        c.put(c.gapOf(0.36), 175, c.y - (i === 1 ? c.riseOf(0.36) : 0));
      }
      c.slope({ n: 2, rise: -0.34, gap: 0.34, w: 180 });
      c.landing();
      c.scatterFish(3, 62);
    },
  },
  {
    name: 'Akıntı',
    subtitle: 'Buz da yolculuk eder',
    target: 50,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 200 });
      for (let i = 0; i < 3; i++) {
        c.put(c.gapOf(0.36), 155, c.y, 'move', { ax: 74, period: 3.6, phase: i * 1.1 });
        c.put(c.gapOf(0.34), 175, c.y - c.riseOf(0.3));
      }
      c.slope({ n: 3, rise: -0.32, gap: 0.34, w: 180 });
      c.landing();
      c.scatterFish(3, 62);
    },
  },
  {
    name: 'Düşen Buz',
    subtitle: 'Bastığın an kaçar',
    target: 50,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 200 });
      c.shelf({ n: 3, gap: 0.42, w: 150, types: ['fall', 'solid'] });
      c.slope({ n: 3, rise: 0.4, gap: 0.38, w: 155 });
      c.shelf({ n: 3, gap: 0.42, w: 150, types: ['fall', 'solid'] });
      c.slope({ n: 2, rise: -0.34, gap: 0.34, w: 170 });
      c.landing();
      c.scatterFish(3, 62);
    },
  },

  /* ------------------------------------------ 9–13 · the continent */
  {
    name: 'Yamaç',
    subtitle: 'Kıta yükseliyor',
    target: 55,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 190 });
      c.slope({ n: 5, rise: 0.5, gap: 0.4, w: 130 });
      c.shelf({ n: 2, gap: 0.36, w: 170, types: ['crack', 'solid'] });
      c.cliff({ drop: 300, ledges: 4 });
      c.landing();
      c.scatterFish(3, 62);
      c.checkpoint(c.at(0.5));
    },
  },
  {
    name: 'Yarık',
    subtitle: 'Altında dip yok',
    target: 58,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.32, w: 195 });
      c.slope({ n: 3, rise: 0.42, gap: 0.36, w: 165 });
      c.crevasse({ pillars: 2, gap: 0.6, depth: 240 });
      c.shelf({ n: 2, gap: 0.36, w: 170 });
      c.crevasse({ pillars: 3, gap: 0.62, depth: 280 });
      c.slope({ n: 2, rise: -0.36, gap: 0.34, w: 175 });
      c.landing();
      c.scatterFish(3, 64);
      c.checkpoint(c.at(0.45));
    },
  },
  {
    name: 'Buz Tüneli',
    subtitle: 'Tavan alçak',
    target: 60,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 190 });
      c.slope({ n: 2, rise: -0.3, gap: 0.34, w: 175 });
      c.tunnel({ n: 5, headroom: 116, gap: 0.46, w: 150 });
      c.slope({ n: 2, rise: 0.36, gap: 0.36, w: 165 });
      c.landing();
      c.scatterFish(3, 62);
      c.checkpoint(c.at(0.35));
    },
  },
  {
    name: 'Sarkıtlar',
    subtitle: 'Yukarıdan düşen',
    target: 62,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 190 });
      c.slope({ n: 2, rise: 0.4, gap: 0.36, w: 170 });
      c.tunnel({ n: 6, headroom: 122, gap: 0.46, w: 150, icicles: 3 });
      c.slope({ n: 3, rise: -0.36, gap: 0.34, w: 175, type: 'crack' });
      c.landing();
      c.scatterFish(3, 62);
      c.checkpoint(c.at(0.3));
    },
  },
  {
    name: 'Foklar',
    subtitle: 'Yolun üstünde',
    target: 62,
    build: (c) => {
      c.shelf({ n: 3, gap: 0.34, w: 205 });
      c.seal(c.at(0.35), { speed: 66 });
      c.slope({ n: 3, rise: 0.42, gap: 0.38, w: 160 });
      c.seal(undefined, { speed: 76 });
      c.shelf({ n: 2, gap: 0.38, w: 180 });
      c.cliff({ drop: 260, ledges: 3 });
      c.landing();
      c.scatterFish(3, 62);
      c.checkpoint(c.at(0.5));
    },
  },

  /* ------------------------------------------- 14–18 · the pressure */
  {
    name: 'Sahte Zemin',
    subtitle: 'Göründüğü gibi değil',
    target: 62,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 185 });
      c.slope({ n: 3, rise: 0.42, gap: 0.36, w: 165 });
      c.put(c.gapOf(0.42), 72, c.y, 'trap');
      c.put(c.gapOf(0.34), 175, c.y);
      c.slope({ n: 3, rise: 0.34, gap: 0.4, w: 155, types: ['solid', 'fake'] });
      c.put(c.gapOf(0.42), 72, c.y, 'trap');
      c.put(c.gapOf(0.34), 180, c.y);
      c.cliff({ drop: 340, ledges: 4 });
      c.landing();
      c.scatterFish(3, 62);
      c.temptation(0.55, 'heavy');
      c.checkpoint(c.at(0.5));
    },
  },
  {
    name: 'Fırtına Kıyısı',
    subtitle: 'Rüzgâr geri itiyor',
    target: 66,
    build: (c) => {
      c.shelf({ n: 3, gap: 0.32, w: 195 });
      const from = c.x;
      c.shelf({ n: 4, gap: 0.36, w: 180 });
      c.storm(from, { period: 3.8 });
      c.slope({ n: 3, rise: 0.4, gap: 0.36, w: 160 });
      c.landing();
      c.scatterFish(3, 62);
      c.sprint(0.55);
      c.checkpoint(c.at(0.45));
    },
  },
  {
    name: 'Çürük Yem',
    subtitle: 'Her balık iyi balık değil',
    target: 64,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.34, w: 190 });
      c.slope({ n: 3, rise: 0.44, gap: 0.36, w: 160 });
      c.tunnel({ n: 4, headroom: 118, gap: 0.44, w: 155 });
      c.cliff({ drop: 260, ledges: 3 });
      c.shelf({ n: 2, gap: 0.4, w: 170, types: ['crack', 'solid'] });
      c.landing();
      c.scatterFish(3, 62);
      c.temptation(0.4, 'dizzy');
      c.temptation(0.72, 'heavy');
      c.checkpoint(c.at(0.45));
    },
  },
  {
    name: 'Uçurum Yolu',
    subtitle: 'Aşağısı çok aşağı',
    target: 68,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 185 });
      c.summit({ height: 230, steps: 3, w: 200 });
      c.shelf({ n: 2, gap: 0.4, w: 150, types: ['crack', 'solid'] });
      c.cliff({ drop: 340, ledges: 4, gap: 0.32 });
      c.crevasse({ pillars: 2, gap: 0.6, depth: 220 });
      c.landing();
      c.scatterFish(3, 62);
      c.sprint(0.3);
      c.checkpoint(c.at(0.55));
    },
  },
  {
    name: 'Kaçan Buz',
    subtitle: 'Tam inerken',
    target: 66,
    build: (c) => {
      c.shelf({ n: 3, gap: 0.34, w: 185 });
      for (let i = 0; i < 3; i++) {
        // The snap floe hangs low and inviting beside the real route, which is
        // the only reason anybody ever lands on one.
        const bait = { x: c.x + c.gapOf(0.3), y: c.y + 46, w: 96, type: 'snap' };
        c.floes.push(bait);
        c.put(c.gapOf(0.46), 175, c.y);
      }
      c.slope({ n: 3, rise: 0.4, gap: 0.36, w: 165 });
      c.tunnel({ n: 3, headroom: 120, gap: 0.44, w: 155 });
      c.cliff({ drop: 280, ledges: 3 });
      c.landing();
      c.scatterFish(3, 62);
      c.checkpoint(c.at(0.5));
    },
  },

  /* ------------------------------------------ 19–22 · the ambushes */
  {
    name: 'Gayzer',
    subtitle: 'Buz tıslamaya başlarsa',
    target: 70,
    build: (c) => {
      c.shelf({ n: 3, gap: 0.32, w: 190 });
      for (let i = 0; i < 3; i++) {
        c.put(c.gapOf(0.38), 200, c.y, 'burst');
        c.put(c.gapOf(0.36), 185, c.y - c.riseOf(0.38));
      }
      c.cliff({ drop: 320, ledges: 4 });
      c.landing();
      c.scatterFish(3, 62);
      c.checkpoint(c.at(0.45));
    },
  },
  {
    name: 'Katil Balina',
    subtitle: 'Boşluklara dikkat',
    target: 72,
    build: (c) => {
      c.shelf({ n: 3, gap: 0.34, w: 185 });
      for (let i = 0; i < 3; i++) {
        const before = c.x;
        c.put(c.gapOf(0.56), 170, c.y);
        c.hazard({
          kind: 'orca',
          x: before + 24,
          y: WATER - 30,
          w: 76,
          h: 60,
          period: 3.2 + i * 0.3,
          height: 250,
        });
        if (i < 2) c.slope({ n: 2, rise: 0.42, gap: 0.36, w: 165 });
      }
      c.cliff({ drop: 340, ledges: 4 });
      c.landing();
      c.scatterFish(3, 62);
      c.checkpoint(c.at(0.5));
    },
  },
  {
    name: 'Zirve',
    subtitle: 'Kıtanın tepesi',
    target: 78,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 185 });
      c.summit({ height: 250, steps: 4, w: 190 });
      c.shelf({ n: 2, gap: 0.38, w: 160, types: ['crack', 'solid'] });
      c.summit({ height: 180, steps: 3, w: 180 });
      c.cliff({ drop: 420, ledges: 5, gap: 0.3 });
      c.landing();
      c.scatterFish(3, 64);
      c.sprint(0.65);
      c.checkpoint(c.at(0.55));
    },
  },
  {
    name: 'Derin Tünel',
    subtitle: 'Işık yok',
    target: 76,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 180 });
      c.slope({ n: 2, rise: -0.34, gap: 0.34, w: 170 });
      c.tunnel({ n: 8, headroom: 112, gap: 0.44, w: 145, icicles: 4, types: ['solid', 'crack'] });
      c.slope({ n: 3, rise: 0.4, gap: 0.36, w: 160 });
      c.landing();
      c.scatterFish(3, 60);
      c.temptation(0.5, 'blind');
      c.checkpoint(c.at(0.35));
    },
  },

  /* -------------------------------------------- 23–30 · the hurting */
  {
    name: 'Tuzak Tüneli',
    subtitle: 'Alçak ve kötü niyetli',
    target: 78,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.32, w: 180 });
      c.slope({ n: 3, rise: 0.44, gap: 0.36, w: 155 });
      c.tunnel({ n: 6, headroom: 114, gap: 0.42, w: 150, icicles: 3, types: ['solid', 'fake', 'solid'] });
      c.put(c.gapOf(0.4), 72, c.y, 'trap');
      c.put(c.gapOf(0.34), 170, c.y);
      c.cliff({ drop: 280, ledges: 3 });
      c.landing();
      c.scatterFish(3, 60);
      c.temptation(0.6, 'dizzy');
      c.checkpoint(c.at(0.45));
    },
  },
  {
    name: 'Gayzer Zinciri',
    subtitle: 'Biri diğerini tetikler',
    target: 80,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.32, w: 180 });
      for (let i = 0; i < 4; i++) {
        c.put(c.gapOf(0.36), 200, c.y, 'burst', { burstPeriod: 3.4 + i * 0.4, burstPhase: i * 0.6 });
        c.put(c.gapOf(0.34), 165, c.y - c.riseOf(0.34));
      }
      c.slope({ n: 2, rise: -0.4, gap: 0.34, w: 175 });
      c.crevasse({ pillars: 2, gap: 0.6, depth: 260 });
      c.landing();
      c.scatterFish(3, 60);
      c.sprint(0.4);
      c.checkpoint(c.at(0.5));
    },
  },
  {
    name: 'Rüzgârlı Yamaç',
    subtitle: 'Yokuş yukarı, rüzgâra karşı',
    target: 82,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 180 });
      const from = c.x;
      c.slope({ n: 5, rise: 0.46, gap: 0.36, w: 145 });
      c.storm(from, { period: 3.6 });
      c.shelf({ n: 2, gap: 0.38, w: 160, types: ['crack', 'solid'] });
      c.cliff({ drop: 360, ledges: 4 });
      c.landing();
      c.scatterFish(3, 60);
      c.temptation(0.55, 'heavy');
      c.checkpoint(c.at(0.5));
    },
  },
  {
    name: 'Yeraltı Nehri',
    subtitle: 'Tünelin altında su',
    target: 84,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 175 });
      c.slope({ n: 3, rise: -0.36, gap: 0.34, w: 165 });
      c.tunnel({ n: 7, headroom: 110, gap: 0.44, w: 140, icicles: 4, types: ['solid', 'melt'] });
      c.crevasse({ pillars: 2, gap: 0.58, depth: 200 });
      c.slope({ n: 3, rise: 0.42, gap: 0.36, w: 155 });
      c.landing();
      c.scatterFish(3, 58);
      c.temptation(0.45, 'blind');
      c.checkpoint(c.at(0.4));
    },
  },
  {
    name: 'Kırılgan Zirve',
    subtitle: 'Yukarısı da güvenli değil',
    target: 86,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 175 });
      c.summit({ height: 240, steps: 4, w: 175 });
      c.shelf({ n: 3, gap: 0.4, w: 150, types: ['crack', 'fake', 'solid'] });
      c.put(c.gapOf(0.36), 200, c.y, 'burst');
      c.cliff({ drop: 400, ledges: 5, gap: 0.3 });
      c.landing();
      c.scatterFish(3, 58);
      c.sprint(0.35);
      c.checkpoint(c.at(0.55));
    },
  },
  {
    name: 'Buzul Labirenti',
    subtitle: 'İn, çık, in',
    target: 90,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 175 });
      c.tunnel({ n: 4, headroom: 112, gap: 0.42, w: 145, icicles: 2 });
      c.slope({ n: 3, rise: 0.44, gap: 0.36, w: 145 });
      c.crevasse({ pillars: 3, gap: 0.6, depth: 240 });
      c.tunnel({ n: 4, headroom: 110, gap: 0.42, w: 140, types: ['solid', 'fake'] });
      c.cliff({ drop: 300, ledges: 4 });
      c.landing();
      c.scatterFish(3, 58);
      c.temptation(0.35, 'dizzy');
      c.temptation(0.7, 'heavy');
      c.checkpoint(c.at(0.35));
      c.checkpoint(c.at(0.7));
    },
  },
  {
    name: 'Avcılar',
    subtitle: 'Sudan ve buzdan',
    target: 92,
    build: (c) => {
      c.shelf({ n: 3, gap: 0.34, w: 175 });
      for (let i = 0; i < 3; i++) {
        const before = c.x;
        c.put(c.gapOf(0.54), 165, c.y);
        c.hazard({ kind: 'orca', x: before + 22, y: WATER - 30, w: 76, h: 60, period: 2.9 + i * 0.2, height: 260 });
        const f = c.floes[c.floes.length - 1];
        c.seal(f, { speed: 84 });
      }
      c.summit({ height: 200, steps: 3, w: 170 });
      c.cliff({ drop: 340, ledges: 4 });
      c.landing();
      c.scatterFish(3, 58);
      c.checkpoint(c.at(0.5));
    },
  },
  {
    name: 'Son Fırtına',
    subtitle: 'Her şey aynı anda',
    target: 96,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 170 });
      const from = c.x;
      c.slope({ n: 3, rise: 0.42, gap: 0.36, w: 145 });
      c.put(c.gapOf(0.36), 200, c.y, 'burst');
      c.shelf({ n: 2, gap: 0.4, w: 150, types: ['crack', 'solid'] });
      c.storm(from, { period: 3.4 });
      c.tunnel({ n: 5, headroom: 110, gap: 0.42, w: 140, icicles: 3, types: ['solid', 'crack'] });
      c.crevasse({ pillars: 3, gap: 0.58, depth: 260 });
      c.cliff({ drop: 320, ledges: 4 });
      c.landing();
      c.scatterFish(3, 58);
      c.temptation(0.4, 'heavy');
      c.sprint(0.62);
      c.checkpoint(c.at(0.35));
      c.checkpoint(c.at(0.72));
    },
  },
  {
    name: 'Kuzeye Açılan Yol',
    subtitle: 'Salı görüyorsun',
    target: 100,
    build: (c) => {
      c.shelf({ n: 2, gap: 0.3, w: 170 });
      c.summit({ height: 260, steps: 4, w: 165 });
      c.tunnel({ n: 5, headroom: 108, gap: 0.42, w: 138, icicles: 3, types: ['solid', 'fake', 'trap'] });
      c.cliff({ drop: 420, ledges: 5, gap: 0.3 });
      for (let i = 0; i < 3; i++) {
        const before = c.x;
        c.put(c.gapOf(0.52), 155, c.y, i === 1 ? 'burst' : 'solid');
        c.hazard({ kind: 'orca', x: before + 20, y: WATER - 30, w: 76, h: 60, period: 2.8 + i * 0.2, height: 265 });
      }
      c.crevasse({ pillars: 3, gap: 0.6, depth: 280 });
      c.landing({ w: 260 });
      c.scatterFish(3, 58);
      c.temptation(0.45, 'dizzy');
      c.sprint(0.7);
      c.checkpoint(c.at(0.4));
      c.checkpoint(c.at(0.75));
    },
  },
];

/** Compose every plan once, at module load. */
export const LEVELS = PLANS.map((plan, i) => {
  const id = i + 1;
  const course = new Course({ scale: scaleForLevel(id) });
  plan.build(course);
  const def = course.build({
    id,
    name: plan.name,
    subtitle: plan.subtitle,
    intro: null,
    target: plan.target,
  });
  // Signs are placed relative to the spawn, which the composer decides.
  def.signs = (plan.signs ?? []).map((s) => ({
    x: def.spawn.x + (s.dx ?? 0),
    y: def.spawn.y + (s.dy ?? -96),
    text: s.text,
  }));
  return def;
});

export function getCraftedLevel(id) {
  return LEVELS[id - 1] ?? null;
}
