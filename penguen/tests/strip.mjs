/**
 * The comment stripper, which once shipped different arithmetic than the source.
 *
 * `tools/bundle.mjs` inlines every module into one file, and on the way it
 * drops comments. It used to drop this too:
 *
 *     const tail = () =>
 *       (next === 'vent' ? a() : b())
 *       * this.flowDrag;
 *
 * — because the last line, trimmed, starts with `*`, and the stripper took
 * that as the middle of a JSDoc block. Automatic semicolon insertion then
 * closed the arrow function over what was left, so the result was still valid
 * JavaScript and nothing anywhere threw. The single-file build simply
 * reserved less air than the modules did, and a dive that passed every check
 * from source refused to compose in the shipped game.
 *
 * That is the worst shape a bug can have: a build step quietly changing what
 * the program means, in a way that still parses. So the stripper gets its own
 * pack, and the pack is adversarial — it is made of the lines most likely to
 * be mistaken for comments.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// The stripper is not exported — it is an implementation detail of the
// bundler — so it is lifted out of the source the same way the bundler's own
// modules are. Testing the real text rather than a copy is the whole point.
const bundlerSrc = await readFile(join(root, 'tools/bundle.mjs'), 'utf8');
const fn = bundlerSrc.match(/function stripComments\(source\) \{[\s\S]*?\n\}/);
if (!fn) {
  console.log('✗ stripComments bulunamadı — bundler değişmiş olabilir.');
  process.exit(1);
}
const { stripComments } = await import(
  `data:text/javascript,${encodeURIComponent(`${fn[0]}\nexport { stripComments };`)}`
);

let fails = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  console.log(`  ✗ ${m}`);
  fails++;
};
const check = (cond, m) => (cond ? ok(m) : bad(m));
const kept = (src, needle, m) => check(stripComments(src).includes(needle), m);
const gone = (src, needle, m) => check(!stripComments(src).includes(needle), m);

console.log('Yorum ayıklayıcı koda dokunuyor mu?\n');

console.log('1) Yorum olmayan satırlar hayatta kalıyor');
kept(
  'const a = () =>\n  (b())\n  * this.flowDrag;\n',
  '* this.flowDrag;',
  'satır başındaki çarpma silinmiyor — bunu bir kez sürüm dosyasına soktuk',
);
kept('const half = n\n  / 2;\n', '/ 2;', 'satır başındaki bölme silinmiyor');
kept('const s = "// not a comment";\n', '// not a comment', 'metin içindeki // korunuyor');
kept('const s = `/* still text */`;\n', '/* still text */', 'şablon içindeki /* korunuyor');
kept('let x = a\n  ** 2;\n', '** 2;', 'satır başındaki üs alma silinmiyor');

console.log('\n2) Gerçek yorumlar gidiyor');
gone('// tek satır\nconst a = 1;\n', 'tek satır', 'tek satırlık yorum siliniyor');
gone('/* blok */\nconst a = 1;\n', 'blok', 'tek satırlık blok siliniyor');
gone('/**\n * uzun\n * yorum\n */\nconst a = 1;\n', 'uzun', 'çok satırlı JSDoc siliniyor');
kept('/**\n * uzun\n */\nconst a = 1;\n', 'const a = 1;', 'yorumdan sonraki kod duruyor');

console.log('\n3) Bütün kaynaklar: kod satırı kaybolmuyor');
{
  // Every line the stripper drops must be one a plain reader would call a
  // comment. The check is deliberately narrow — it only proves that nothing
  // *else* was dropped — because that is the failure that shipped.
  const modules = [...bundlerSrc.matchAll(/'(src\/[^']+)'/g)].map((m) => m[1]);
  check(modules.length > 20, `${modules.length} modül taranıyor`);
  let dropped = 0;
  let suspicious = [];
  for (const rel of modules) {
    let text;
    try {
      text = await readFile(join(root, rel), 'utf8');
    } catch {
      continue;
    }
    const out = new Set(stripComments(text).split('\n').map((l) => l.trim()));
    let inBlock = false;
    for (const line of text.split('\n')) {
      const t = line.trim();
      const wasBlock = inBlock;
      if (inBlock) {
        if (t.includes('*/')) inBlock = false;
      } else if (t.startsWith('/*') && !t.includes('*/')) {
        inBlock = true;
      }
      if (!t || out.has(t)) continue;
      dropped++;
      const isComment = wasBlock || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*/');
      if (!isComment) suspicious.push(`${rel}: ${t.slice(0, 60)}`);
    }
  }
  check(dropped > 100, `${dropped} yorum satırı ayıklandı`);
  if (suspicious.length) {
    for (const s of suspicious.slice(0, 8)) console.log(`      ${s}`);
    bad(`${suspicious.length} satır yorum olmadığı hâlde silindi`);
  } else {
    ok('silinen her satır gerçekten yorumdu');
  }
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Paketleyici kaynağın anlamını değiştirmiyor.');
