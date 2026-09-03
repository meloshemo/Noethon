/**
 * The difficulty curve, measured rather than felt.
 *
 *   node tools/difficulty.mjs
 *
 * "This level is too easy" is an opinion until somebody produces a number, and
 * the number this project already had was the wrong one: a gap is inside reach
 * or it is not, and that says nothing about whether reaching it was work.
 *
 * The solvers turn out to be the instrument. Their job is to answer "is there a
 * way"; run them without letting them stop at the first one and they answer
 * *how many* ways there are. A step a hundred inputs can do is generous. A step
 * two can do is a wall. Both are equally passable, which is the point: this
 * measures difficulty without ever measuring unfairness.
 *
 * Each chapter also has a resource that is supposed to be the source of its
 * tension, and that gets its own reading, because a chapter can be tight on
 * inputs and still be free: a dive where the lungs never drop below half is a
 * dive that never asked anything, however precise the swimming was.
 *
 *   I   · Buz Sahanlığı  tolerance: what fraction of the inputs land the jump
 *   II  · Zirve          tolerance: what fraction of the inputs make the step
 *   III · Buz Altı       breath: the lowest the lungs ever got
 *   IV  · Kar Topu       nerve: how near a snowball ever came, in pixels
 *
 * Nothing here fails a build. It is a measuring tape, and the shape it draws is
 * the thing to argue with.
 */

import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The bands moved, and they moved in one direction.
 *
 * Every one of these was set when the chapters were first measured, and what
 * they described was a game that could be finished comfortably. Played, it is
 * finished *too* comfortably — so the ends of all four curves were pulled in
 * and the starts pulled down a little with them.
 *
 * The starts moved least on purpose. A first level that punishes is not a hard
 * game, it is a game nobody reaches the hard part of; what makes a run
 * memorable is the last third, and that is where the numbers moved most. The
 * end of every chapter is now inside the range where a single mistake ends the
 * attempt.
 *
 * What did *not* move is the floor under all of it: every level is still
 * proved finishable by a solver driving the real physics with no equipment and
 * no pickups. Hard is a number here. Impossible is a build failure.
 */
const CHAPTERS = [
  {
    name: 'I · Buz Sahanlığı',
    from: 1,
    to: 31,
    script: 'tests/shelf-run.mjs',
    /** Higher is easier. */
    metric: 'tolerans',
    read: (tight, mean) => mean,
    format: (v) => v.toFixed(3),
    /** What the curve should look like: easiest first, hardest last. */
    /**
     * The band is narrower than it looks like it ought to be, and honestly so.
     *
     * Widening gaps moves this number and then stops moving it: past a point
     * the sweep's own shape dominates and no arrangement of ice takes a jump
     * below about a quarter of the inputs. Writing 0.10 here would make the
     * tool report failure at the thing it cannot measure rather than at the
     * thing the chapter is doing. Measured range, measured target.
     *
     * And the chapter's own dial is already spent, which is worth writing down
     * so it is not re-derived. `tight` in levels.js ramps 0.8 → 1.3 and the
     * composer caps it at 1.45; pushed to that cap, level 31 asks for 182px
     * jumps against a 163px reach and `validate-levels` refuses with
     * twenty-one errors. 1.45 × 163/182 is 1.30 — the value it already ends
     * on. Chapter I is as tight as these plans go, so the flatness this tool
     * reports here is partly the metric saturating and partly the last level
     * being built out of gentler *kinds* of jump than the middle. Making it
     * harder means editing the plans, not the ramp.
     */
    want: [0.42, 0.22],
    easier: 'up',
  },
  {
    name: 'II · Zirve',
    from: 32,
    to: 46,
    script: 'tests/climb-run.mjs',
    /**
     * Arms rather than inputs.
     *
     * Tolerance was the obvious reading and the wrong one here: how precise a
     * single kick has to be is dominated by how coarsely the solver happens to
     * sweep, and the number sat at a third whatever the chapter did. What a
     * climber actually feels is the bar, so this is the lowest it ever gets on
     * the hardest step of the climb — the mountain's version of breath.
     */
    metric: 'kalan kol gücü',
    read: (tight, spare) => spare,
    format: (v) => `%${Math.round(v * 100)}`,
    /*
     * The band moved because the number under it was being read wrong.
     *
     * `spare` used to be the *minimum* over every attempt that worked, which
     * is the clumsiest line that still happens to succeed — and on a search
     * trying a hundred and sixty combinations there is nearly always one that
     * scrapes through on an empty arm. Five of the fifteen climbs therefore
     * read "0% left" while their shafts measured comfortably inside budget:
     * the metric had bottomed out and was saying nothing.
     *
     * It is the best working line now, which is what a player actually has,
     * and the chapter reads as a curve again: a full bar at the first climb
     * down to a tenth of one at the hardest. The band is that curve.
     *
     * One level sits above the line on purpose and cannot be brought down to
     * it: the summit finishes with about a third of a bar. Its middle shaft is
     * already at the height the solver can physically climb, and its other two
     * are exactly on the budget line, so there is nowhere left to spend. The
     * flag on 46 is a fact about the ceiling, not about the plan — the same
     * kind of saturation chapter I's `tight` ramp hit, and recorded here for
     * the same reason: so it is not re-derived every time somebody reads the
     * chart.
     */
    want: [0.95, 0.1],
    easier: 'up',
  },
  {
    name: 'III · Buz Altı',
    from: 47,
    to: 61,
    script: 'tests/dive-run.mjs',
    metric: 'en az nefes',
    read: (low) => low,
    format: (v) => `%${Math.round(v * 100)}`,
    want: [0.4, 0.02],
    easier: 'up',
  },
  {
    name: 'IV · Kar Topu',
    from: 62,
    to: 76,
    script: 'tests/brawl-run.mjs',
    metric: 'en yakın top',
    read: (close) => close,
    format: (v) => `${Math.round(v)}px`,
    /*
     * Read this one as a floor, not as a dial — it does not answer to pressure.
     *
     * The number is how near a snowball came *on the route the solver chose*,
     * and a solver picks the safest route it can find. Tested directly: a
     * second lobber was hung over the finale's remaining cover, and the
     * measurement got **looser** (55px → 57px), because the extra arc pushed
     * the solver onto a different line where the balls stayed further away. A
     * denser arena can measure safer.
     *
     * So the hard end of this band is aspirational rather than achievable by
     * adding threats: across all fifteen arenas the tightest any level reaches
     * is about 34px, and the finale's 55px is a fact about where its clean
     * solution runs. Making the arena harder means closing routes — geometry —
     * and this number will only notice once the safest one is gone.
     */
    want: [95, 16],
    easier: 'up',
  },
];

function run(script) {
  return new Promise((done) => {
    const out = [];
    const child = spawn(process.execPath, [resolve(root, script), '--measure'], { cwd: root });
    child.stdout.on('data', (d) => out.push(String(d)));
    child.stderr.on('data', () => {});
    child.on('close', () => done(out.join('')));
  });
}

/** A 24-wide bar, full meaning "as hard as this chapter is meant to get". */
function bar(value, [easy, hard]) {
  const t = Math.max(0, Math.min(1, (easy - value) / (easy - hard)));
  const filled = Math.round(t * 24);
  return '█'.repeat(filled) + '·'.repeat(24 - filled);
}

/*
 * `--chapter=1` (or `--chapter=1,4`) runs only those chapters.
 *
 * Chapter I's reading takes about forty minutes: it sweeps every input of
 * every hop of thirty-one crafted levels *and* sixty generated ones, with no
 * early exit, because counting how many ways there are is the measurement.
 * The other three take seconds between them. Without a way to ask for one
 * chapter, anybody tuning the arena has to sit through the shelf — so in
 * practice the tool gets run once and then argued with from memory, which is
 * the failure mode it was written against.
 */
const pick = process.argv.find((a) => a.startsWith('--chapter='));
const wanted = pick ? new Set(pick.slice(10).split(',').map(Number)) : null;

console.log('\nZorluk eğrisi\n');

let drift = 0;
for (const [index, ch] of CHAPTERS.entries()) {
  if (wanted && !wanted.has(index + 1)) continue;
  const text = await run(ch.script);
  const rows = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^MEASURE (\d+) ([\d.]+) ([\d.]+) (\d+)/);
    if (!m) continue;
    rows.push({ id: Number(m[1]), a: Number(m[2]), b: Number(m[3]), n: Number(m[4]) });
  }
  if (!rows.length) {
    console.log(`${ch.name}: ölçülemedi (${ch.script})\n`);
    continue;
  }

  const [easy, hard] = ch.want;
  console.log(`${ch.name}  ·  ${ch.metric}  ·  hedef ${ch.format(easy)} → ${ch.format(hard)}`);

  /*
   * The endless levels are measured, and they are not on the ramp.
   *
   * Chapter I's solver also walks sixty generated levels, and the first
   * version of this ran the target line straight through them: the ramp is
   * defined between levels 1 and 31, so level 315 was being asked for a
   * tolerance of *minus one point six*. Every one of the eighty rows past the
   * crafted chapter was therefore reported "← kolay" against a target no level
   * can hit, and — worse — every one of them fed the headline number. The
   * total easiness drift read 392.9, of which the crafted game was a small
   * minority: an instrument whose summary figure is dominated by nonsense is
   * not a strict instrument, it is a broken one.
   *
   * The endless levels do have a standard, and it is a floor rather than a
   * ramp: the generator never gets to stop being at least as hard as the end
   * of the crafted chapter. So they are scored against `hard`, held flat, and
   * reported in their own block — and only the crafted rows move the drift,
   * because only they are what the ramp is a claim about.
   */
  const crafted = rows.filter((r) => r.id <= ch.to);
  const endless = rows.filter((r) => r.id > ch.to);
  for (const r of crafted) {
    const v = ch.read(r.a, r.b);
    const want = easy + ((hard - easy) * (r.id - ch.from)) / Math.max(1, ch.to - ch.from);
    const off = v - want;
    // Positive means easier than intended, which is the failure worth seeing.
    const flag = off > (easy - hard) * 0.2 ? ' ← kolay' : off < -(easy - hard) * 0.2 ? ' ← sert' : '';
    console.log(
      `  ${String(r.id).padStart(3)}  ${bar(v, ch.want)}  ${ch.format(v).padStart(7)}` +
        `   (hedef ${ch.format(want)})${flag}`,
    );
    drift += Math.max(0, off) / (easy - hard);
  }
  if (endless.length) {
    const vals = endless.map((r) => ch.read(r.a, r.b));
    const mean = vals.reduce((n, v) => n + v, 0) / vals.length;
    const loosest = Math.max(...vals);
    const tightest = Math.min(...vals);
    const soft = vals.filter((v) => v > hard).length;
    console.log(
      `  sonsuz (${endless.length} üretilmiş bölüm)  ·  taban ${ch.format(hard)}
` +
        `    ortalama ${ch.format(mean)} · en sıkı ${ch.format(tightest)} · en gevşek ${ch.format(loosest)}
` +
        `    ${soft}/${endless.length} bölüm tabanın gevşek tarafında` +
        `${soft > endless.length * 0.5 ? ' ← üretici bölümün sonundan kolay' : ''}`,
    );
  }

  // Does it actually get harder? A chapter whose line is flat is a chapter with
  // one level in it, played fifteen times.
  const ramp = rows.filter((r) => r.id <= ch.to);
  const first = ch.read(ramp[0].a, ramp[0].b);
  const last = ch.read(ramp[ramp.length - 1].a, ramp[ramp.length - 1].b);
  const climbed = ((first - last) / (easy - hard)) * 100;
  console.log(`  eğim: ${climbed.toFixed(0)}% (100% = hedeflenen ramp)\n`);
}

console.log(`Toplam kolaylık sapması: ${drift.toFixed(1)} (yalnızca el yapımı bölümler)\n`);
