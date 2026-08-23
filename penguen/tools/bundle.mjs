/**
 * Single-file bundler.
 *
 * Run with:  node tools/bundle.mjs [out.html]
 *
 * The game normally ships as ES modules, which needs a web server. This flattens
 * the whole thing — markup, styles and every module — into one self-contained
 * HTML file that runs from anywhere, including a `file://` path or a host that
 * only accepts a single document.
 *
 * It is a concatenator, not a real bundler: the modules are listed in dependency
 * order and their import/export syntax is stripped so they share one scope. That
 * only works because the codebase has no circular imports and no name clashes
 * between module top-levels — both of which this script checks and refuses to
 * paper over.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.cwd(), process.argv[2] ?? 'dist/pengu.html');

const STYLES = ['styles/tokens.css', 'styles/base.css', 'styles/ui.css'];

/** Dependency order, leaves first. */
const MODULES = [
  'src/core/util.js',
  'src/core/rewarded.mjs',
  'src/core/i18n.js',
  'src/core/storage.js',
  'src/core/particles.js',
  'src/core/input.js',
  'src/core/music.js',
  'src/core/audio.js',
  'src/game/config.js',
  'src/game/skins.js',
  'src/game/league.js',
  'src/game/daily.js',
  'src/game/store.js',
  'src/game/terrain.js',
  'src/game/levels.js',
  'src/game/tower.js',
  'src/game/climb.js',
  'src/game/deep.js',
  'src/game/dive.js',
  'src/game/arena.js',
  'src/game/brawl.js',
  'src/game/chapters.js',
  'src/game/profile.js',
  'src/game/generator.js',
  'src/game/entities.js',
  'src/game/player.js',
  'src/game/ghost.js',
  'src/game/world.js',
  'src/game/render.js',
  'src/game/missions.js',
  'src/game/game.js',
  'src/ui/ui.js',
  'src/main.js',
];

const read = (rel) => readFile(resolve(root, rel), 'utf8');

/**
 * Drop the comments, and only the comments.
 *
 * Thirty-eight percent of this project's source is prose. That is deliberate
 * and it stays deliberate — the comments are the reason anybody can pick this
 * codebase up — but they are written for a person reading the repository, not
 * for a phone downloading a game. Shipping them cost nearly three hundred
 * kilobytes and had walked the single-file build to within fifteen kilobytes
 * of the size limit, which is a build that fails on the next feature.
 *
 * Whole lines only, and that is the safety argument rather than laziness. A
 * line whose first non-space characters are `//`, `/*` or `*` is a comment in
 * every case except one: inside a multi-line template literal. So backticks
 * are counted as they go past, and nothing is touched while the count is odd.
 * Trailing comments after code are left exactly where they are, because
 * telling `//` in a string from `//` in code needs a real tokeniser and the
 * few bytes are not worth a parser.
 *
 * The proof this is safe is `tests/browser-bundle.mjs`: it opens the built
 * file in a real browser over `file://` and plays it. If a strip ever breaks
 * something, that is what says so.
 */
function stripComments(source) {
  const out = [];
  let inBlock = false;
  let inTemplate = false;
  for (const line of source.split('\n')) {
    const t = line.trim();
    if (!inTemplate) {
      if (inBlock) {
        if (t.includes('*/')) inBlock = false;
        continue;
      }
      if (t.startsWith('/*')) {
        if (!t.includes('*/')) inBlock = true;
        continue;
      }
      if (t.startsWith('//')) continue;
      if (t.startsWith('*') && !t.startsWith('*/')) continue;
    }
    // Unescaped backticks flip template state; a line with two is back where
    // it started, which is why this counts rather than toggles per line.
    let ticks = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '`' && line[i - 1] !== '\\') ticks++;
    }
    if (ticks % 2 === 1) inTemplate = !inTemplate;
    out.push(line);
  }
  // Collapse the runs of blank lines the removal leaves behind.
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

/** Remove import statements and the `export` keyword, leaving plain code. */
function flatten(source, rel) {
  let code = source
    // import ... from '...';  /  import '...';
    .replace(/^\s*import\s+[^;]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, '')
    // export const/let/function/class → plain declaration
    .replace(/^\s*export\s+(?=(const|let|var|function|class|async))/gm, '')
    // export { a, b };
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '')
    // export default
    .replace(/^\s*export\s+default\s+/gm, '');

  if (/^\s*(import|export)\b/m.test(code)) {
    throw new Error(`${rel}: an import/export survived flattening — check the syntax used there`);
  }
  return code.trim();
}

/** Top-level declarations, used to catch name clashes between modules. */
function topLevelNames(code) {
  const names = new Set();
  const re = /^(?:const|let|var|function|class|async function)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(code))) names.add(m[1]);
  return names;
}

const css = (await Promise.all(STYLES.map(read))).join('\n\n');

const seen = new Map();
const parts = [];
for (const rel of MODULES) {
  const code = flatten(stripComments(await read(rel)), rel);
  for (const name of topLevelNames(code)) {
    if (seen.has(name)) {
      throw new Error(`Name clash: "${name}" is declared in both ${seen.get(name)} and ${rel}`);
    }
    seen.set(name, rel);
  }
  parts.push(`/* ==== ${rel} ${'='.repeat(Math.max(0, 62 - rel.length))} */\n${code}`);
}

// Pull the markup out of index.html: everything the game needs, minus the
// document scaffolding, the external font and the module script tag.
const html = await read('index.html');
const body = html
  .slice(html.indexOf('<body>') + 6, html.indexOf('</body>'))
  .replace(/<script[^>]*src=[^>]*><\/script>/g, '')
  .trim();

// The single file has no siblings: no manifest to link to, no service worker
// to register, no icon on disk. Anything that reaches for one turns a page
// that works perfectly into a page with errors in its console.
const head = html.slice(0, html.indexOf('</head>'));
const links = (head.match(/<link[^>]*rel="(manifest|icon|apple-touch-icon)"[^>]*>/g) ?? []).length;

const doc = `<title>Pengu</title>
<style>
${css}
</style>

${body}

<script type="module">
globalThis.__PENGU_SINGLE = true;

${parts.join('\n\n')}
</script>
`;

await mkdir(dirname(out), { recursive: true });
await writeFile(out, doc, 'utf8');

const kb = (doc.length / 1024).toFixed(0);
console.log(`✓ ${out}`);
console.log(`  ${MODULES.length} modül + ${STYLES.length} stil dosyası → tek dosya, ${kb} KB`);
if (links) console.log(`  ${links} dış bağlantı (manifest/ikon) dışarıda bırakıldı`);
