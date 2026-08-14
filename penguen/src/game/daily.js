/**
 * Daily Pengu.
 *
 * The daily level was one course and one clock. That is a thing you do once.
 * This turns it into a set of objectives on the same course — finish quickly,
 * collect the fish, do it without dying, take the speed fish — so the same
 * level is worth playing four or five times, each run chasing a different
 * thing, and the day's list is the reason to come back tomorrow.
 *
 * Objectives are picked from the date, so everybody in the world gets the same
 * list on the same day. Two are always fixed (finish it, and finish it fast)
 * and the rest rotate, which keeps the day recognisable without making it
 * repetitive.
 */

const ROTATING = [
  {
    id: 'nodeath',
    text: 'Hiç ölmeden bitir',
    icon: 'skull',
    test: (r) => r.deaths === 0,
  },
  {
    id: 'allfish',
    text: 'Bütün balıkları topla',
    icon: 'fish',
    test: (r) => r.totalFish > 0 && r.fish >= r.totalFish,
  },
  {
    id: 'boost',
    text: 'Hız balığını kullan',
    icon: 'bolt',
    test: (r) => (r.boosts ?? 0) > 0,
  },
  {
    id: 'stars',
    text: '3 yıldız al',
    icon: 'star',
    test: (r) => r.stars >= 3,
  },
  {
    id: 'clean',
    text: 'Çürük balığa dokunma',
    icon: 'shield',
    test: (r) => (r.rotten ?? 0) === 0,
  },
  {
    id: 'fast90',
    text: 'Hedef sürenin %90\'ında bitir',
    icon: 'clock',
    test: (r) => r.time <= r.target * 0.9,
  },
];

function seedOf(str) {
  return [...str].reduce((n, c) => (n * 33 + c.charCodeAt(0)) >>> 0, 5381);
}

/**
 * The day's objective list: always "finish it", always "beat the target", plus
 * two from the pool chosen by the date.
 */
export function dailyObjectives(dateKey, target) {
  const seed = seedOf(dateKey);
  const picks = [];
  const pool = [...ROTATING];
  for (let i = 0; i < 2 && pool.length; i++) {
    picks.push(pool.splice((seed >> (i * 5)) % pool.length, 1)[0]);
  }
  return [
    { id: 'finish', text: 'Bölümü bitir', icon: 'flag', test: () => true },
    {
      id: 'target',
      text: `${Math.round(target)} saniyenin altında bitir`,
      icon: 'clock',
      test: (r) => r.time <= r.target,
    },
    ...picks,
  ];
}

/**
 * Fold a finished run into the day's record. Objectives stay done once done —
 * you are collecting them across the day's attempts, not in a single perfect
 * run, which is what makes a fifth attempt worth starting.
 *
 * @returns {{done:string[], newly:string[]}}
 */
export function applyRun(dateKey, target, previous, result) {
  const list = dailyObjectives(dateKey, target);
  const already = new Set(previous ?? []);
  const newly = [];
  for (const o of list) {
    if (already.has(o.id)) continue;
    if (o.test(result)) {
      already.add(o.id);
      newly.push(o.id);
    }
  }
  return { done: [...already], newly };
}
