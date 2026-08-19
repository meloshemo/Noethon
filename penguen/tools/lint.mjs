/**
 * Project invariants.
 *
 * Not a style checker — the formatting in this codebase is consistent because
 * it is written that way, and a tool that argues about semicolons buys nothing
 * here. What this checks is the small set of rules that have *actually gone
 * wrong* while building the game, each of which was silent until something far
 * away broke:
 *
 *   · a new module not added to the bundler's list, so the single-file build
 *     shipped without a whole chapter in it;
 *   · `CRAFTED_LEVELS` and the chapters disagreeing, so the level select ran
 *     off the end of the handcrafted set into the generator;
 *   · a debug `console.log` left in a hot loop;
 *   · the bundle quietly growing past what a phone on a bad connection will
 *     wait for.
 *
 * Everything here is cheap and runs before the tests.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** How big the single-file build may get, in kilobytes. */
const BUNDLE_BUDGET_KB = 900;

let fails = 0;
const bad = (msg) => {
  console.log(`  ✗ ${msg}`);
  fails++;
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

console.log('Proje kuralları denetleniyor...\n');

/* 1 — every module is in the bundler ------------------------------------ */
{
  const bundler = await readFile(resolve(root, 'tools/bundle.mjs'), 'utf8');
  const listed = new Set([...bundler.matchAll(/'(src\/[^']+\.js)'/g)].map((m) => m[1]));
  const onDisk = (await walk(resolve(root, 'src'))).map((f) =>
    relative(root, f).replaceAll('\\', '/'),
  );
  const missing = onDisk.filter((f) => !listed.has(f));
  const stale = [...listed].filter((f) => !onDisk.includes(f));
  if (missing.length) bad(`bundle.mjs listesinde yok: ${missing.join(', ')}`);
  if (stale.length) bad(`bundle.mjs listesinde var ama dosya yok: ${stale.join(', ')}`);
  if (!missing.length && !stale.length) ok(`paketleyici listesi tam — ${onDisk.length} modül`);
}

/* 2 — the level count matches the chapters ------------------------------ */
{
  const { CRAFTED_LEVELS } = await import('../src/game/config.js');
  const { CHAPTERS, CRAFTED_TOTAL, getCraftedLevel } = await import('../src/game/chapters.js');
  if (CRAFTED_LEVELS !== CRAFTED_TOTAL) {
    bad(`CRAFTED_LEVELS=${CRAFTED_LEVELS} ama bölümler toplamı ${CRAFTED_TOTAL}`);
  } else {
    ok(`bölüm sayısı tutarlı — ${CRAFTED_TOTAL}, ${CHAPTERS.length} chapter`);
  }
  // Ids run 1..N with no gaps and no repeats: the level select indexes into
  // this list by number, so a gap is a black screen.
  let broken = 0;
  for (let id = 1; id <= CRAFTED_TOTAL; id++) {
    const def = getCraftedLevel(id);
    if (!def) {
      bad(`${id}. bölüm yok`);
      broken++;
    } else if (def.id !== id) {
      bad(`${id}. sırada ${def.id} numaralı bölüm var (${def.name})`);
      broken++;
    }
    if (broken > 3) break;
  }
  if (!broken) ok('bölüm numaraları 1..N kesintisiz');

  // Every chapter has to actually contain something. An empty one is a heading
  // in the menu with nothing under it.
  for (const c of CHAPTERS) {
    if (!c.levels.length) bad(`${c.name} chapter'ı boş`);
    if (!c.verb) bad(`${c.name} chapter'ının fiili yazılmamış`);
  }
}

/* 3 — no debug leftovers in the shipped source -------------------------- */
{
  const files = await walk(resolve(root, 'src'));
  let hits = 0;
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    const rel = relative(root, file);
    text.split('\n').forEach((line, i) => {
      const code = line.replace(/^\s*(\/\/|\*).*/, '');
      if (/\bdebugger\b/.test(code)) {
        bad(`${rel}:${i + 1} debugger`);
        hits++;
      }
      // console.warn/error are legitimate; console.log is what gets left behind.
      if (/\bconsole\.log\s*\(/.test(code)) {
        bad(`${rel}:${i + 1} console.log`);
        hits++;
      }
      if (/\bTODO\b|\bFIXME\b|\bXXX\b/.test(line)) {
        bad(`${rel}:${i + 1} ${line.trim().slice(0, 60)}`);
        hits++;
      }
    });
  }
  if (!hits) ok(`kaynakta debug artığı yok — ${files.length} dosya`);
}

/* 4 — the single-file build is small enough to be worth having ---------- */
{
  try {
    const info = await stat(resolve(root, 'dist/pengu.html'));
    const kb = Math.round(info.size / 1024);
    if (kb > BUNDLE_BUDGET_KB) bad(`tek dosya sürümü ${kb} KB — sınır ${BUNDLE_BUDGET_KB} KB`);
    else ok(`tek dosya sürümü ${kb} KB (sınır ${BUNDLE_BUDGET_KB} KB)`);
  } catch {
    console.log('  · tek dosya sürümü henüz üretilmemiş (npm run build)');
  }
}

if (fails) {
  console.log(`\n✗ ${fails} sorun.`);
  process.exit(1);
}
console.log('\n✓ Proje kuralları sağlam.');
