/**
 * How much does each chapter repeat itself?
 *
 * "These levels feel the same" is a kanaat until somebody produces a number,
 * and the number turns out to be easy: read the composer verbs each level
 * actually calls, and count how many pairs of levels within a chapter use
 * almost the same set. Two levels sharing eighty percent of their vocabulary
 * are two arrangements of one idea, however different the numbers in them are.
 *
 * Run before adding a mechanic, and again after:
 *
 *   node tools/variety.mjs
 *   node tools/variety.mjs --twins    (which levels, not just how many)
 *
 * The first run of this said chapter two had seven verbs for fifteen levels
 * and chapter four had four, which is not lazy composition — it is not having
 * enough words. That reading is what the hush, the pendulum, the lob and the
 * trench were written in answer to.
 *
 * One caution, learned the hard way: the composer's variable name is read out
 * of `build: (x) =>` rather than assumed. An earlier version guessed at a
 * short list of likely names, the dive chapter calls its composer `d`, and the
 * chapter that turned out to be the *most* repetitive in the game reported
 * zero verbs and looked perfect. A measurement that can silently return
 * nothing is worse than no measurement, because it gets believed.
 */

import { readFileSync } from 'node:fs';
import { CHAPTERS } from '../src/game/chapters.js';

const SOURCE = {
  1: 'src/game/levels.js',
  32: 'src/game/climb.js',
  47: 'src/game/dive.js',
  62: 'src/game/brawl.js',
};

/**
 * Not counted as vocabulary.
 *
 * Placing a fish or a checkpoint says nothing about what a level *is* — every
 * level in the game does it, so counting it would make every level look like
 * every other one and hide the thing being measured.
 */
const FURNITURE = new Set([
  'checkpoint', 'checkpointAt', 'scatterFish', 'temptation', 'charged',
  'fishAt', 'fishAbove', 'fishInGap', 'sign', 'at',
]);

const TWINS = process.argv.includes('--twins');
const SAME = 0.8;

const verbs = new Map();
const names = new Map();
for (const [start, file] of Object.entries(SOURCE)) {
  const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  src.split("  {\n    name: '").slice(1).forEach((block, i) => {
    const body = block.slice(0, block.indexOf('\n  },'));
    const composer = body.match(/build:\s*\((\w+)\)\s*=>/);
    if (!composer) throw new Error(`${file}: ${+start + i}. bölümün bestecisi okunamadı`);
    const calls = [...body.matchAll(new RegExp(`\\b${composer[1]}\\.(\\w+)\\(`, 'g'))];
    const words = calls.map((m) => m[1]).filter((v) => !FURNITURE.has(v));
    /*
     * Verbs, plus the things a plan names that are verbs in all but syntax.
     *
     * Reading only the method names undercounts, and it undercounts in a way
     * that matters: three of the mountain's climbs came out with an identical
     * vocabulary — `base steps chimney traverse crown` — while one of them is
     * built on ice you cannot stand still on, one is a plain teaching shaft and
     * one hangs rock over a kick. Those are different things to meet. They are
     * simply passed as arguments rather than called as methods.
     *
     * So a `types: ['slip', 'fake']`, a `hazard: 'shards'`, a `lip` and a
     * `rests` count as vocabulary too. The test is whether a player would
     * describe it as a different thing on the way past, and slippery footing
     * plainly is.
     */
    for (const m of body.matchAll(/types:\s*\[([^\]]*)\]/g)) {
      for (const kind of m[1].matchAll(/'(\w+)'/g)) if (kind[1] !== 'solid') words.push(kind[1]);
    }
    for (const m of body.matchAll(/hazard:\s*'(\w+)'/g)) words.push(m[1]);
    for (const m of body.matchAll(/\b(lip|rests):/g)) words.push(m[1]);
    verbs.set(+start + i, new Set(words));
    names.set(+start + i, block.slice(0, block.indexOf("'")));
  });
}

console.log('Bölümler ne kadar birbirini tekrar ediyor?\n');
let worst = null;
for (const ch of CHAPTERS) {
  const ids = [];
  for (let i = ch.from; i <= ch.to; i++) if (verbs.has(i)) ids.push(i);
  const all = new Set(ids.flatMap((i) => [...verbs.get(i)]));
  const twins = new Map(ids.map((i) => [i, 0]));
  let pairs = 0;
  for (const a of ids) {
    for (const b of ids) {
      if (a >= b) continue;
      const A = verbs.get(a);
      const B = verbs.get(b);
      const shared = [...A].filter((v) => B.has(v)).length;
      const union = new Set([...A, ...B]).size;
      if (union && shared / union >= SAME) {
        pairs++;
        twins.set(a, twins.get(a) + 1);
        twins.set(b, twins.get(b) + 1);
      }
    }
  }
  const total = (ids.length * (ids.length - 1)) / 2;
  const ratio = total ? pairs / total : 0;
  console.log(
    `${String(ch.from).padStart(2)}–${ch.to}  ${String(all.size).padStart(2)} fiil  ` +
      `${String(pairs).padStart(3)}/${total} çift %${(SAME * 100).toFixed(0)}+ aynı  ` +
      `(%${(ratio * 100).toFixed(0)})`,
  );
  console.log(`        ${[...all].join(' ')}`);
  if (TWINS) {
    const ranked = ids.filter((i) => twins.get(i) > 0).sort((a, b) => twins.get(b) - twins.get(a));
    for (const i of ranked.slice(0, 5)) {
      console.log(`        L${i} ${names.get(i)} — ${twins.get(i)} ikiz`);
    }
  }
  if (!worst || ratio > worst.ratio) worst = { ch, ratio };
}
console.log(`\nEn tekrarlı bölüm: ${worst.ch.from}–${worst.ch.to} (%${(worst.ratio * 100).toFixed(0)})`);
console.log('Yeni bir fiil eklemeden önce ve ekledikten sonra çalıştır.');
