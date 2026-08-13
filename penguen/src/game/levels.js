/**
 * Handcrafted levels.
 *
 * Design rules for the ramp (the single most important thing in this game):
 *   1–3   pure movement. Wide floes, tiny gaps, zero hazards, no way to lose
 *         except walking into the sea on purpose. The player learns the verbs.
 *   4–8   one new mechanic per level, always introduced on a safe floe with a
 *         solid landing right after it, and always announced by a world sign.
 *   9–13  the mechanics start combining, checkpoints appear.
 *   14–18 real pressure: traps, chains, tighter windows.
 *   19+   procedurally generated (see generator.js).
 *
 * Coordinates: y grows downward. A floe's `y` is its top surface.
 */

/** Floe shorthand: F(x, y, w, type, extra). */
const F = (x, y, w, type = 'solid', extra = {}) => ({ x, y, w, type, ...extra });

const GROUND = 430;
const WATER = 508;

export const LEVELS = [
  /* -------------------------------------------------------------- 1 */
  {
    id: 1,
    name: 'İlk Adımlar',
    subtitle: 'Buzul kıyısı',
    intro: 'Sağa doğru ilerle ve kaçış salına ulaş.',
    target: 26,
    worldW: 1240,
    spawn: { x: 110, y: GROUND },
    goal: { x: 1090, y: GROUND },
    floes: [
      F(30, GROUND, 280),
      F(370, GROUND, 250),
      F(680, GROUND, 240),
      F(980, GROUND, 230),
    ],
    fish: [{ x: 335, y: 372 }, { x: 645, y: 372 }, { x: 940, y: 372 }],
    signs: [
      { x: 120, y: GROUND - 96, text: 'Yürü: ← →  •  Zıpla: BOŞLUK' },
      { x: 700, y: GROUND - 96, text: 'Aferin! Salı hedefle.' },
    ],
  },

  /* -------------------------------------------------------------- 2 */
  {
    id: 2,
    name: 'Açık Sular',
    subtitle: 'Buzlar seyreliyor',
    intro: 'Aralar açılıyor. Zıplamadan önce hızlan.',
    target: 30,
    worldW: 1560,
    spawn: { x: 100, y: GROUND },
    goal: { x: 1420, y: GROUND },
    floes: [
      F(30, GROUND, 240),
      F(370, GROUND, 190),
      F(660, GROUND, 180),
      F(940, GROUND, 180),
      F(1220, GROUND, 260),
    ],
    fish: [{ x: 320, y: 366 }, { x: 855, y: 350 }, { x: 1145, y: 366 }],
    signs: [{ x: 110, y: GROUND - 96, text: 'Koşarken zıplarsan daha uzağa gidersin' }],
  },

  /* -------------------------------------------------------------- 3 */
  {
    id: 3,
    name: 'Basamaklar',
    subtitle: 'Yukarı, aşağı',
    intro: 'Zıplama tuşunu basılı tutarsan daha yükseğe çıkarsın.',
    target: 34,
    worldW: 1700,
    spawn: { x: 100, y: GROUND },
    goal: { x: 1560, y: 300 },
    floes: [
      F(30, GROUND, 230),
      F(340, 396, 180),
      F(620, 348, 180),
      F(900, 300, 180),
      F(1180, 348, 170),
      F(1440, 300, 220),
    ],
    fish: [{ x: 300, y: 340 }, { x: 960, y: 236 }, { x: 1400, y: 292 }],
    signs: [
      { x: 110, y: GROUND - 96, text: 'Tuşu bırakırsan alçak, basılı tutarsan yüksek zıplarsın' },
    ],
  },

  /* -------------------------------------------------------------- 4 */
  {
    id: 4,
    name: 'Çatlayan Buz',
    subtitle: 'Yeni: çatlak buz',
    intro: 'Mavi çizgili buzlar üstüne basınca çatlar. Oyalanma!',
    target: 32,
    worldW: 1760,
    spawn: { x: 100, y: GROUND },
    goal: { x: 1600, y: GROUND },
    floes: [
      F(30, GROUND, 250),
      F(360, GROUND, 200, 'crack', { delay: 1.6 }),
      F(650, GROUND, 240),
      F(960, GROUND, 180, 'crack', { delay: 1.4 }),
      F(1230, GROUND, 200),
      F(1500, GROUND, 230),
    ],
    fish: [{ x: 320, y: 366 }, { x: 900, y: 360 }, { x: 1440, y: 366 }],
    signs: [
      { x: 300, y: GROUND - 100, text: 'Çatlayan buzda durma, hemen zıpla' },
    ],
  },

  /* -------------------------------------------------------------- 5 */
  {
    id: 5,
    name: 'Kırılgan Yol',
    subtitle: 'Ritmi yakala',
    intro: 'Çatlak buzlar sıklaşıyor. Her birinin ardında sağlam bir buz var.',
    target: 34,
    worldW: 1900,
    spawn: { x: 100, y: GROUND },
    goal: { x: 1700, y: 396 },
    // Deliberately crack → solid → crack: at this stage the player still gets a
    // safe floe to land on after every risk.
    floes: [
      F(30, GROUND, 220),
      F(340, GROUND, 150, 'crack'),
      F(580, GROUND, 170),
      F(840, 404, 150, 'crack'),
      F(1080, 404, 180),
      F(1350, 396, 150, 'crack'),
      F(1590, 396, 220),
    ],
    fish: [{ x: 285, y: 360 }, { x: 1025, y: 340 }, { x: 1295, y: 332 }],
    signs: [{ x: 110, y: GROUND - 96, text: 'Durma — zıpla, bas, zıpla' }],
  },

  /* -------------------------------------------------------------- 6 */
  {
    id: 6,
    name: 'Kaygan Zemin',
    subtitle: 'Yeni: cilalı buz',
    intro: 'Parlak buzda kayarsın. Fren erken başlar.',
    target: 36,
    worldW: 1900,
    spawn: { x: 100, y: GROUND },
    goal: { x: 1740, y: GROUND },
    floes: [
      F(30, GROUND, 220),
      F(330, GROUND, 300, 'slip'),
      F(760, GROUND, 180),
      F(1040, GROUND, 320, 'slip'),
      F(1460, 396, 170, 'crack'),
      F(1680, GROUND, 200),
    ],
    fish: [{ x: 700, y: 360 }, { x: 1000, y: 350 }, { x: 1400, y: 330 }],
    signs: [{ x: 340, y: GROUND - 100, text: 'Kaygan! Erken yavaşla' }],
  },

  /* -------------------------------------------------------------- 7 */
  {
    id: 7,
    name: 'Sürüklenen Buzlar',
    subtitle: 'Yeni: hareketli buz',
    intro: 'Akıntıdaki buzlar seni de taşır. Zamanlamayı bekle.',
    target: 42,
    worldW: 2000,
    spawn: { x: 100, y: GROUND },
    goal: { x: 1840, y: GROUND },
    floes: [
      F(30, GROUND, 230),
      F(360, GROUND, 150, 'move', { ax: 0, ay: 60, period: 3.4 }),
      F(640, GROUND, 160),
      F(880, 400, 150, 'move', { ax: 110, ay: 0, period: 4, phase: 0.25 }),
      F(1240, GROUND, 160),
      F(1490, 384, 150, 'move', { ax: 0, ay: 70, period: 3, phase: 0.5 }),
      F(1760, GROUND, 210),
    ],
    fish: [{ x: 600, y: 350 }, { x: 1080, y: 330 }, { x: 1700, y: 340 }],
    signs: [{ x: 110, y: GROUND - 96, text: 'Buz sana doğru gelirken zıpla' }],
  },

  /* -------------------------------------------------------------- 8 */
  {
    id: 8,
    name: 'Eriyen Buz',
    subtitle: 'Yeni: eriyen buz',
    intro: 'Bazı buzlar kendi kendine erir ve geri donar. Saymayı öğren.',
    target: 44,
    worldW: 2080,
    spawn: { x: 100, y: GROUND },
    goal: { x: 1920, y: GROUND },
    floes: [
      F(30, GROUND, 230),
      F(350, GROUND, 170, 'melt', { meltPeriod: 3.6, meltPhase: 0 }),
      F(630, GROUND, 180),
      F(910, 404, 170, 'melt', { meltPeriod: 3.6, meltPhase: 0.5 }),
      F(1190, GROUND, 160),
      F(1440, 396, 160, 'melt', { meltPeriod: 3.2, meltPhase: 0.25 }),
      F(1690, GROUND, 160),
      F(1880, GROUND, 180),
    ],
    fish: [{ x: 600, y: 356 }, { x: 1150, y: 330 }, { x: 1660, y: 330 }],
    signs: [{ x: 360, y: GROUND - 100, text: 'Erimeye başlayınca soluklaşır — bekle, geri gelir' }],
  },

  /* -------------------------------------------------------------- 9 */
  {
    id: 9,
    name: 'Sarkıtlar',
    subtitle: 'Yeni: buz sarkıtı',
    intro: 'Tavandaki sarkıtlar altından geçince düşer. Titrediğinde kaç.',
    target: 46,
    worldW: 2200,
    spawn: { x: 100, y: GROUND },
    goal: { x: 2040, y: GROUND },
    checkpoints: [{ x: 1120, y: GROUND }],
    floes: [
      F(30, GROUND, 240),
      F(370, GROUND, 200, 'crack'),
      F(660, GROUND, 180),
      F(930, GROUND, 240),
      F(1270, GROUND, 190, 'crack'),
      F(1550, 396, 170),
      F(1810, GROUND, 400),
    ],
    hazards: [
      { kind: 'icicle', x: 700, y: 150, w: 24, h: 46 },
      { kind: 'icicle', x: 990, y: 150, w: 24, h: 46 },
      { kind: 'icicle', x: 1880, y: 150, w: 24, h: 46 },
    ],
    fish: [{ x: 620, y: 350 }, { x: 1230, y: 340 }, { x: 1760, y: 330 }],
    signs: [{ x: 640, y: GROUND - 110, text: 'Yukarı bak!' }],
  },

  /* ------------------------------------------------------------- 10 */
  {
    id: 10,
    name: 'Fok Devriyesi',
    subtitle: 'Yeni: fok',
    intro: 'Foklar buzda gezinir. Üstünden atla, yanından değil.',
    target: 48,
    worldW: 2260,
    spawn: { x: 100, y: GROUND },
    goal: { x: 2100, y: GROUND },
    checkpoints: [{ x: 1300, y: GROUND }],
    floes: [
      F(30, GROUND, 240),
      F(360, GROUND, 320),
      F(760, GROUND, 200, 'crack'),
      F(1040, GROUND, 320),
      F(1440, 396, 180, 'slip'),
      F(1700, GROUND, 200, 'crack'),
      F(1980, GROUND, 250),
    ],
    // Introduction level: both seals patrol the far half of their floe, so the
    // player always lands somewhere safe and can watch the pattern first.
    hazards: [
      { kind: 'seal', x: 500, y: GROUND - 30, w: 44, h: 30, range: 60, speed: 52 },
      { kind: 'seal', x: 1160, y: GROUND - 30, w: 44, h: 30, range: 50, speed: 60 },
      { kind: 'icicle', x: 1760, y: 150, w: 24, h: 46 },
    ],
    fish: [{ x: 700, y: 348 }, { x: 1380, y: 330 }, { x: 1930, y: 340 }],
    signs: [{ x: 370, y: GROUND - 106, text: 'Fokun üstünden zıpla' }],
  },

  /* ------------------------------------------------------------- 11 */
  {
    id: 11,
    name: 'Kutup Rüzgarı',
    subtitle: 'Yeni: rüzgar',
    intro: 'Rüzgar seni havada iter. Karşı yöne yaslan.',
    target: 50,
    worldW: 2300,
    spawn: { x: 100, y: GROUND },
    goal: { x: 2140, y: 396 },
    checkpoints: [{ x: 1200, y: GROUND }],
    floes: [
      F(30, GROUND, 230),
      F(350, GROUND, 170, 'crack'),
      F(640, 404, 170),
      F(910, GROUND, 160, 'melt', { meltPeriod: 3.4 }),
      F(1160, GROUND, 220),
      F(1480, 396, 170, 'crack'),
      F(1760, 396, 160),
      F(2020, 396, 240),
    ],
    hazards: [
      { kind: 'gust', x: 520, y: 180, w: 130, h: 330, power: -300 },
      { kind: 'gust', x: 1330, y: 180, w: 140, h: 330, power: 340 },
      { kind: 'icicle', x: 1820, y: 130, w: 24, h: 46 },
    ],
    fish: [{ x: 580, y: 340 }, { x: 1100, y: 330 }, { x: 1930, y: 330 }],
    signs: [{ x: 360, y: GROUND - 106, text: 'Rüzgara karşı yön ver' }],
  },

  /* ------------------------------------------------------------- 12 */
  {
    id: 12,
    name: 'Zemin Kaçtı',
    subtitle: 'Yeni: düşen buz',
    intro: 'Bu buzlar kırılmaz — düşerler. Üstünde kalma.',
    target: 50,
    worldW: 2400,
    spawn: { x: 100, y: GROUND },
    goal: { x: 2170, y: GROUND },
    checkpoints: [{ x: 1250, y: GROUND }],
    // Falling floes are narrow on purpose: you land and leave, you never walk.
    floes: [
      F(30, GROUND, 230),
      F(370, GROUND, 100, 'fall'),
      F(560, GROUND, 190),
      F(880, 404, 100, 'fall'),
      F(1070, GROUND, 220),
      F(1420, GROUND, 100, 'fall'),
      F(1610, 396, 150, 'crack'),
      F(1880, GROUND, 100, 'fall'),
      F(2070, GROUND, 200),
    ],
    hazards: [{ kind: 'seal', x: 1120, y: GROUND - 30, w: 44, h: 30, range: 50, speed: 86 }],
    fish: [{ x: 515, y: 360 }, { x: 1025, y: 336 }, { x: 1820, y: 336 }],
    signs: [{ x: 370, y: GROUND - 106, text: 'Düşen buz: bas ve hemen devam et' }],
  },

  /* ------------------------------------------------------------- 13 */
  {
    id: 13,
    name: 'Tuzak',
    subtitle: 'Yeni: sahte buz',
    intro: 'Kızıl damarlı buzlar son anda kırılır. Üstünde durma, değ ve geç.',
    target: 52,
    worldW: 2420,
    spawn: { x: 100, y: GROUND },
    goal: { x: 2240, y: GROUND },
    checkpoints: [{ x: 1240, y: GROUND }],
    // Traps are deliberately narrow stepping stones — landing on one and
    // jumping straight back off is always enough to clear the next gap.
    floes: [
      F(30, GROUND, 230),
      F(380, GROUND, 70, 'trap'),
      F(550, GROUND, 200),
      F(860, 404, 170, 'crack'),
      F(1140, GROUND, 220),
      F(1480, GROUND, 70, 'trap'),
      F(1650, 396, 180, 'slip'),
      F(1960, GROUND, 70, 'trap'),
      F(2130, GROUND, 210),
    ],
    hazards: [
      { kind: 'icicle', x: 690, y: 140, w: 24, h: 46 },
      { kind: 'icicle', x: 1560, y: 140, w: 24, h: 46 },
    ],
    fish: [{ x: 500, y: 360 }, { x: 1085, y: 340 }, { x: 1885, y: 336 }],
    signs: [{ x: 370, y: GROUND - 106, text: 'Damarlı buz = tuzak. Değ ve geç.' }],
  },

  /* ------------------------------------------------------------- 14 */
  {
    id: 14,
    name: 'Çözülme',
    subtitle: 'Her şey bir arada',
    intro: 'Erime hızlanıyor. Ritim ve sabır.',
    target: 58,
    worldW: 2860,
    spawn: { x: 100, y: GROUND },
    goal: { x: 2650, y: 396 },
    checkpoints: [{ x: 1660, y: GROUND }],
    // Rule that holds from here on: never put a melting floe straight after a
    // cracking one. You would have to stand on breaking ice to wait out a melt
    // cycle, which is a coin flip rather than a skill.
    floes: [
      F(30, GROUND, 220),
      F(350, GROUND, 160, 'crack'),
      F(620, 404, 190),
      F(920, 404, 160, 'melt', { meltPeriod: 3, meltPhase: 0.1 }),
      F(1190, 396, 150, 'move', { ax: 0, ay: 60, period: 3.6 }),
      F(1480, GROUND, 220),
      F(1810, 404, 160, 'melt', { meltPeriod: 2.8, meltPhase: 0.45 }),
      F(2100, GROUND, 70, 'trap'),
      F(2270, 396, 160, 'crack'),
      F(2540, 396, 220),
    ],
    hazards: [
      { kind: 'gust', x: 1350, y: 160, w: 130, h: 360, power: 320 },
      { kind: 'seal', x: 1540, y: GROUND - 30, w: 44, h: 30, range: 40, speed: 92 },
    ],
    fish: [{ x: 560, y: 340 }, { x: 1135, y: 336 }, { x: 2200, y: 330 }],
  },

  /* ------------------------------------------------------------- 15 */
  {
    id: 15,
    name: 'Dar Geçit',
    subtitle: 'Küçük hedefler',
    intro: 'Buzlar küçüldü, sen büyüdün. Nokta atışı.',
    target: 58,
    worldW: 2700,
    spawn: { x: 100, y: GROUND },
    goal: { x: 2470, y: 404 },
    checkpoints: [{ x: 1520, y: 396 }],
    floes: [
      F(30, GROUND, 200),
      F(330, 404, 110, 'crack'),
      F(550, 372, 110, 'crack'),
      F(770, 404, 110),
      F(990, 356, 110, 'crack'),
      F(1210, 404, 120),
      F(1430, 396, 190),
      F(1730, 372, 110, 'slip'),
      F(1950, 404, 110, 'crack'),
      F(2190, 372, 70, 'trap'),
      F(2360, 404, 220),
    ],
    hazards: [{ kind: 'icicle', x: 1030, y: 130, w: 24, h: 46 }],
    fish: [{ x: 480, y: 320 }, { x: 1150, y: 300 }, { x: 2100, y: 320 }],
  },

  /* ------------------------------------------------------------- 16 */
  {
    id: 16,
    name: 'Kırık Sürüsü',
    subtitle: 'Durma, akış içinde kal',
    intro: 'Hiçbir buz seni beklemez.',
    target: 60,
    worldW: 2760,
    spawn: { x: 100, y: GROUND },
    goal: { x: 2540, y: 396 },
    checkpoints: [{ x: 1540, y: GROUND }],
    floes: [
      F(30, GROUND, 200),
      F(330, GROUND, 130, 'crack', { delay: 0.7 }),
      F(560, 404, 130, 'crack', { delay: 0.7 }),
      F(790, 380, 130, 'crack', { delay: 0.7 }),
      F(1040, 404, 70, 'trap'),
      F(1210, GROUND, 130, 'crack', { delay: 0.7 }),
      F(1440, GROUND, 200),
      F(1740, 396, 130, 'melt', { meltPeriod: 2.6 }),
      F(1970, 372, 130, 'crack', { delay: 0.7 }),
      F(2200, 396, 130, 'move', { ax: 0, ay: 60, period: 2.6 }),
      F(2430, 396, 220),
    ],
    hazards: [
      { kind: 'gust', x: 1660, y: 160, w: 130, h: 360, power: -340 },
      { kind: 'icicle', x: 2020, y: 130, w: 24, h: 46 },
    ],
    fish: [{ x: 490, y: 330 }, { x: 1160, y: 330 }, { x: 2150, y: 320 }],
  },

  /* ------------------------------------------------------------- 17 */
  {
    id: 17,
    name: 'Sisli Kıyı',
    subtitle: 'Görüş kısıtlı',
    intro: 'Sis bastı. İleriyi az göreceksin — dinle ve hisset.',
    target: 62,
    worldW: 2720,
    fog: 0.55,
    spawn: { x: 100, y: GROUND },
    goal: { x: 2520, y: GROUND },
    checkpoints: [{ x: 1510, y: GROUND }],
    floes: [
      F(30, GROUND, 210),
      F(340, 404, 140, 'crack'),
      F(600, GROUND, 70, 'trap'),
      F(770, 380, 140),
      F(1010, 404, 140, 'melt', { meltPeriod: 3 }),
      F(1250, GROUND, 130, 'crack'),
      F(1480, GROUND, 190),
      // Vertical drift, not horizontal: in fog a floe that slides away from
      // under your landing spot is unreadable, one that bobs is a rhythm.
      F(1770, 396, 140, 'move', { ax: 0, ay: 60, period: 3.2 }),
      F(2020, 380, 70, 'trap'),
      F(2190, 404, 130, 'crack'),
      F(2420, GROUND, 200),
    ],
    hazards: [
      { kind: 'icicle', x: 820, y: 130, w: 24, h: 46 },
      { kind: 'icicle', x: 2230, y: 130, w: 24, h: 46 },
    ],
    fish: [{ x: 510, y: 340 }, { x: 1180, y: 330 }, { x: 2140, y: 320 }],
  },

  /* ------------------------------------------------------------- 18 */
  {
    id: 18,
    name: 'Son Buzul',
    subtitle: 'Antarktika seni bırakmak istemiyor',
    intro: 'Her şey burada. Salı gör, nefes al, git.',
    target: 68,
    worldW: 3100,
    spawn: { x: 100, y: GROUND },
    goal: { x: 2780, y: 372 },
    checkpoints: [{ x: 1180, y: GROUND }, { x: 2050, y: 396 }],
    floes: [
      F(30, GROUND, 200),
      F(330, 404, 130, 'crack', { delay: 0.7 }),
      F(560, 372, 140),
      F(800, 404, 130, 'melt', { meltPeriod: 2.8, meltPhase: 0.2 }),
      F(1030, GROUND, 240),
      F(1320, 396, 130, 'move', { ax: 0, ay: 70, period: 2.8 }),
      F(1550, 372, 120, 'crack', { delay: 0.7 }),
      F(1770, 404, 120, 'slip'),
      F(1990, 396, 180),
      F(2290, 372, 70, 'trap'),
      F(2460, 396, 120, 'crack', { delay: 0.7 }),
      F(2680, 372, 240),
    ],
    hazards: [
      { kind: 'gust', x: 950, y: 150, w: 120, h: 370, power: 360 },
      { kind: 'seal', x: 1100, y: GROUND - 30, w: 44, h: 30, range: 50, speed: 100 },
      { kind: 'icicle', x: 1600, y: 120, w: 24, h: 46 },
      { kind: 'icicle', x: 2300, y: 120, w: 24, h: 46 },
      { kind: 'gust', x: 2380, y: 150, w: 110, h: 370, power: -300 },
    ],
    fish: [{ x: 500, y: 320 }, { x: 1265, y: 320 }, { x: 2400, y: 310 }],
  },
];

export const WATER_Y = WATER;
export const GROUND_Y = GROUND;

export function getCraftedLevel(id) {
  return LEVELS.find((l) => l.id === id) ?? null;
}
