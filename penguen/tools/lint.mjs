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

  // The last player title has to be reachable. A title granted at level 76 in
  // a game with 61 levels is a title nobody ever sees, and nothing else in the
  // codebase would ever mention it again.
  const { LAST_TITLE_AT } = await import('../src/game/profile.js');
  if (LAST_TITLE_AT !== CRAFTED_TOTAL) {
    bad(`son unvan ${LAST_TITLE_AT}. bölümde ama oyunda ${CRAFTED_TOTAL} bölüm var`);
  } else {
    ok(`son unvan son bölümde — ${LAST_TITLE_AT}`);
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

/* 4 — nothing reaches off the machine ----------------------------------- */
{
  // The legal screen promises the game talks to nobody. That promise is only
  // worth making if it cannot quietly stop being true — and it did once
  // already: a Google Fonts link meant every launch called two other
  // companies' servers before drawing a pixel.
  const files = [
    'index.html',
    'sw.js',
    ...(await walk(resolve(root, 'src'))).map((f) => relative(root, f)),
    ...['tokens.css', 'base.css', 'ui.css'].map((f) => `styles/${f}`),
  ];
  const offenders = [];
  for (const rel of files) {
    const text = await readFile(resolve(root, rel), 'utf8');
    for (const [i, line] of text.split('\n').entries()) {
      // Comments are allowed to mention a URL; code is not.
      if (/^\s*(\/\/|\*|<!--|-->)/.test(line)) continue;
      const m = line.match(/https?:\/\/[^\s'"`)]+/);
      if (!m) continue;
      if (/w3\.org|schema\.org|localhost/.test(m[0])) continue;
      offenders.push(`${rel}: ${m[0].slice(0, 60)}`);
    }
  }
  if (offenders.length) offenders.forEach((o) => bad(`dış adres: ${o}`));
  else ok('hiçbir dosya dışarı bağlanmıyor');
}

/* 5 — the single-file build is small enough to be worth having ---------- */
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

/* 6 — both languages say all the same things ---------------------------- */
{
  const { KEYS } = await import(new URL('../src/core/i18n.js', import.meta.url));
  const base = KEYS.tr;
  let clean = true;
  for (const [id, keys] of Object.entries(KEYS)) {
    if (id === 'tr') continue;
    const missing = base.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !base.includes(k));
    if (missing.length) {
      bad(`${id} sözlüğünde eksik: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}`);
      clean = false;
    }
    if (extra.length) {
      bad(`${id} sözlüğünde fazla: ${extra.slice(0, 6).join(', ')}${extra.length > 6 ? '…' : ''}`);
      clean = false;
    }
  }
  if (clean) ok(`sözlükler eşit — ${Object.keys(KEYS).length} dil, ${base.length} metin`);
}

/* 7 — every key the code asks for actually exists ------------------------ */
{
  const { KEYS } = await import(new URL('../src/core/i18n.js', import.meta.url));
  const known = new Set(KEYS.tr);
  const unknown = new Set();
  for (const file of await walk(resolve(root, 'src'))) {
    const text = await readFile(file, 'utf8');
    // Only the literal calls. A key built at runtime (`ice.${type}`) cannot be
    // checked here, so those have a template-literal form the regex skips.
    for (const m of text.matchAll(/\bt\('([a-zA-Z][\w.]*)'/g)) {
      if (!known.has(m[1])) unknown.add(`${relative(root, file)}: ${m[1]}`);
    }
  }
  if (unknown.size) bad(`sözlükte olmayan anahtar: ${[...unknown].slice(0, 6).join(', ')}`);
  else ok('kullanılan bütün anahtarlar sözlükte');
}

/* 8 — user-facing text has no em dashes --------------------------------- */
{
  // The em dash reads as machine writing in both languages here, and it had
  // spread through every screen. Sentences say what they mean with a comma, a
  // colon or a full stop; code comments are free to do as they like.
  const files = ['index.html', 'src/core/i18n.js'];
  const found = [];
  for (const file of files) {
    const text = await readFile(resolve(root, file), 'utf8');
    for (const line of text.split('\n')) {
      if (line.includes('—') && !line.trimStart().startsWith('*') && !line.trimStart().startsWith('//')) {
        found.push(`${file}: ${line.trim().slice(0, 50)}`);
      }
    }
  }
  if (found.length) bad(`arayüz metninde uzun tire: ${found.slice(0, 4).join(' | ')}`);
  else ok('arayüz metninde uzun tire yok');
}

/* 9 — the readme's test count is the runner's test count ---------------- */
{
  /**
   * A number typed into a document drifts, and this one had: the readme
   * promised twenty-four packs while the runner had thirty. The project's own
   * rule is that the readme describes only what actually exists, so the rule
   * gets a check rather than a good intention.
   */
  const runner = await readFile(resolve(root, 'tools/test.mjs'), 'utf8');
  const packs = [...runner.matchAll(/\['tests\/([\w-]+)\.mjs'/g)].map((m) => m[1]);
  const browser = packs.filter((p) => p.startsWith('browser')).length;
  const node = packs.length - browser;
  const readme = await readFile(resolve(root, 'README.md'), 'utf8');
  const claim = readme.match(/(\d+) paket \((\d+) node \+ paketleme \+ (\d+) tarayıcı\)/);
  if (!claim) {
    bad('readme test sayısını hiç söylemiyor');
  } else if (+claim[1] !== packs.length || +claim[2] !== node || +claim[3] !== browser) {
    bad(
      `readme ${claim[1]} paket (${claim[2]}+${claim[3]}) diyor, gerçek ` +
        `${packs.length} (${node}+${browser})`,
    );
  } else {
    ok(`readme test sayısı doğru — ${packs.length} paket`);
  }
}

if (fails) {
  console.log(`\n✗ ${fails} sorun.`);
  process.exit(1);
}
console.log('\n✓ Proje kuralları sağlam.');
