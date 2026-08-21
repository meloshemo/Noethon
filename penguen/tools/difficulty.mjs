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
    want: [0.55, 0.1],
    easier: 'up',
  },
  {
    name: 'II · Zirve',
    from: 32,
    to: 46,
    script: 'tests/climb-run.mjs',
    metric: 'tolerans',
    read: (tight, mean) => mean,
    format: (v) => v.toFixed(3),
    want: [0.5, 0.12],
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
    want: [0.5, 0.06],
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
    want: [110, 26],
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

console.log('\nZorluk eğrisi\n');

let drift = 0;
for (const ch of CHAPTERS) {
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
  for (const r of rows) {
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

  // Does it actually get harder? A chapter whose line is flat is a chapter with
  // one level in it, played fifteen times.
  const first = ch.read(rows[0].a, rows[0].b);
  const last = ch.read(rows[rows.length - 1].a, rows[rows.length - 1].b);
  const climbed = ((first - last) / (easy - hard)) * 100;
  console.log(`  eğim: ${climbed.toFixed(0)}% (100% = hedeflenen ramp)\n`);
}

console.log(`Toplam kolaylık sapması: ${drift.toFixed(1)}\n`);
