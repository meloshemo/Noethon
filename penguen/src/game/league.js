/**
 * The weekly league.
 *
 * A season is a week. Points come from playing well rather than from playing
 * long: a clear is worth a little, stars and clean runs are worth more, and the
 * daily challenge is worth most. At the end of the week the points reset and
 * the tier you reached is kept.
 *
 * Be clear about what this is. Without a server there is nobody else to be
 * ranked against, so the tiers are *targets*, not standings — the thing that
 * makes you say "this week I'm getting to Diamond" is the ladder, not the
 * neighbours. When there is a backend, the same points feed a real table with
 * no changes to how they are earned.
 */

export const TIERS = [
  { id: 'bronze', name: 'Bronz', at: 0, color: '#c98a52', en: { name: 'Bronze' } },
  { id: 'silver', name: 'Gümüş', at: 500, color: '#c3ced9', en: { name: 'Silver' } },
  { id: 'gold', name: 'Altın', at: 2000, color: '#ffd23f', en: { name: 'Gold' } },
  { id: 'diamond', name: 'Elmas', at: 5000, color: '#7ce8ff', en: { name: 'Diamond' } },
];

/** Points awarded for one finished run. */
export const POINTS = {
  clear: 20,
  perStar: 25,
  flawless: 40,
  allFish: 20,
  underTarget: 35,
  daily: 120,
  dailyObjective: 45,
  /** Endless levels pay by distance, so a long course is worth more. */
  perHundredMeters: 6,
};

/**
 * ISO-ish week key: year plus week number, Monday-based.
 * Used as the season identifier, so a season turns over at local midnight on
 * Monday rather than at some server's midnight.
 */
export function weekKey(d = new Date()) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // Thursday decides the year a week belongs to — the standard ISO trick that
  // stops the last days of December landing in week 1 of the wrong year.
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day + 3);
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const fday = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - fday + 3);
  const week = 1 + Math.round((date - firstThursday) / (7 * 86400000));
  return `${date.getFullYear()}-H${String(week).padStart(2, '0')}`;
}

/** Index into TIERS for a points total. */
export function tierFor(points) {
  let i = 0;
  for (let t = 0; t < TIERS.length; t++) if (points >= TIERS[t].at) i = t;
  return i;
}

/** What the league card needs to draw itself. */
export function standing(league) {
  const points = league?.points ?? 0;
  const i = tierFor(points);
  const tier = TIERS[i];
  const next = TIERS[i + 1] ?? null;
  const span = next ? next.at - tier.at : 1;
  return {
    points,
    index: i,
    tier,
    next,
    /** 0..1 through the current tier; 1 when there is nothing above. */
    pct: next ? Math.min(1, (points - tier.at) / span) : 1,
    toNext: next ? Math.max(0, next.at - points) : 0,
  };
}

/**
 * Score a finished run.
 * @returns {{points:number, rows:Array<{label:string, value:number}>}}
 */
export function scoreRun(result) {
  const rows = [];
  const add = (label, value) => {
    if (value > 0) rows.push({ label, value });
  };

  if (result.daily) {
    add('Günün bölümü', POINTS.daily);
    const done = result.objectivesDone ?? 0;
    add(`Günün hedefleri ×${done}`, done * POINTS.dailyObjective);
  } else {
    add('Bölüm tamam', POINTS.clear);
  }
  add(`${result.stars} yıldız`, (result.stars ?? 0) * POINTS.perStar);
  if (result.deaths === 0) add('Ölmeden', POINTS.flawless);
  if (result.fish >= result.totalFish && result.totalFish > 0) add('Tüm balıklar', POINTS.allFish);
  if (result.time <= result.target) add('Süre altında', POINTS.underTarget);
  if (result.meters > 0) {
    add(`${Math.round(result.meters)} m`, Math.round((result.meters / 100) * POINTS.perHundredMeters));
  }

  return { points: rows.reduce((n, r) => n + r.value, 0), rows };
}
