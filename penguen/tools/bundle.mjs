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
  'src/core/storage.js',
  'src/core/particles.js',
  'src/core/input.js',
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
  const code = flatten(await read(rel), rel);
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
