/**
 * Copy the game into a standalone repository.
 *
 *   node tools/mirror.mjs ../cld
 *
 * This project lives in `penguen/` inside a bigger site repository, and is
 * also published on its own where the game *is* the root. Keeping the two in
 * step by hand is exactly the kind of job that goes quietly wrong: the first
 * time it was done from memory the workflows were left behind, so the mirror
 * had no CI for a week and nobody noticed, because everything it was supposed
 * to catch was already green.
 *
 * So the list lives here, in one place, reviewable. Anything not on it is not
 * published — which is the right default for a mirror: `dist/` is a build
 * output, `node_modules/` is enormous, and a scratch file is nobody's business.
 */

import { cp, rm, readdir, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dest = process.argv[2] && resolve(process.cwd(), process.argv[2]);

if (!dest) {
  console.error('Kullanım: node tools/mirror.mjs <hedef-klasör>');
  process.exit(1);
}

/** Everything the standalone repository needs, and nothing else. */
const PUBLISH = [
  'src',
  'styles',
  'tests',
  'tools',
  'assets',
  'docs',
  '.github',
  // The Android application's sources: the package is built from these, in
  // CI, in the published repository.
  'android',
  /*
   * And the store images, which are not web content and were deliberately
   * left out of here — until the Play upload failed on their absence.
   *
   * The uploader runs in *this* repository, because that is where the
   * workflows live, and it hands Play the screenshots along with the bundle.
   * Keeping them out of the copy kept them away from the one job that needs
   * them. They stay out of the *deploy* instead: `deploy.yml` drops this
   * folder before the site is published, so no player downloads seven
   * megabytes of pictures meant for an upload form.
   */
  'store',
  'index.html',
  // The four legal pages, because a store listing points a reviewer at one of
  // them by URL. `tools/legal.mjs` writes them from the markdown in docs/.
  'gizlilik.html',
  'privacy.html',
  'kullanim-sartlari.html',
  'terms.html',
  'manifest.webmanifest',
  'sw.js',
  'package.json',
  'README.md',
  'CHANGELOG.md',
  '.gitignore',
  '.nojekyll',
];

await mkdir(dest, { recursive: true });
for (const rel of PUBLISH) {
  const from = join(root, rel);
  const to = join(dest, rel);
  // Replaced rather than merged: a file deleted here has to disappear there
  // too, and a merge leaves the old one behind forever.
  await rm(to, { recursive: true, force: true });
  await cp(from, to, { recursive: true });
}

const files = [];
for (const rel of PUBLISH) {
  try {
    const entries = await readdir(join(dest, rel), { recursive: true });
    files.push(...entries.filter((e) => e.includes('.')));
  } catch {
    files.push(rel);
  }
}
console.log(`✓ ${dest}`);
console.log(`  ${PUBLISH.length} yol · ${files.length} dosya`);
