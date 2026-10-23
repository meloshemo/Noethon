/**
 * The Android application's one build step.
 *
 *   node tools/android.mjs                       # oyunu pakete koy
 *   node tools/android.mjs --code=4 --name=1.1.0 # sürümü de damgala
 *   node tools/android.mjs --check               # sadece denetle
 *
 * The application is a WebView around one file, and that file is the game's
 * own single-file build — the same artifact `tests/browser-bundle.mjs` opens
 * in a real browser and plays a level in. So "building the Android app" is:
 * build that file, put it in `assets/`, and let Gradle do the rest.
 *
 * Which means the thing on Play cannot drift from the thing in the repository.
 * There is no second copy of the game to forget to update.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gradle = resolve(root, 'android/app/build.gradle');
const asset = resolve(root, 'android/app/src/main/assets/pengu.html');

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

let build = await readFile(gradle, 'utf8');

/* ------------------------------------------------------------- the stamp */

const code = arg('code');
const name = arg('name');

if (code !== null) {
  if (!/^\d+$/.test(code)) {
    console.log(`  ✗ versionCode tamsayı olmalı: ${code}`);
    process.exit(1);
  }
  build = build.replace(/versionCode \d+/, `versionCode ${code}`);
}
if (name !== null) {
  // Play refuses an upload whose versionCode repeats an earlier one, and a
  // version name that is not x.y.z is the kind of thing that is noticed by a
  // reviewer rather than by a tool.
  if (!/^\d+\.\d+\.\d+$/.test(name)) {
    console.log(`  ✗ sürüm adı x.y.z olmalı: ${name}`);
    process.exit(1);
  }
  build = build.replace(/versionName '[^']*'/, `versionName '${name}'`);
}
if (code !== null || name !== null) await writeFile(gradle, build);

const has = {
  code: build.match(/versionCode (\d+)/)?.[1],
  name: build.match(/versionName '([^']*)'/)?.[1],
  id: build.match(/applicationId '([^']*)'/)?.[1],
  min: build.match(/minSdk (\d+)/)?.[1],
};

const problems = [];
if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(has.id ?? '')) {
  problems.push(`applicationId Android kurallarına uymuyor: ${has.id}`);
}
if (!/^\d+\.\d+\.\d+$/.test(has.name ?? '')) problems.push(`versionName x.y.z olmalı: ${has.name}`);
if (!(Number(has.code) >= 1)) problems.push(`versionCode en az 1 olmalı: ${has.code}`);
// The WebView on anything older is not updatable as a system component, and
// the game draws with things that arrived well after it.
if (!(Number(has.min) >= 24)) problems.push(`minSdk en az 24 olmalı: ${has.min}`);

for (const p of problems) console.log(`  ✗ ${p}`);
if (problems.length) {
  console.log(`\n✗ ${problems.length} sorun — android/app/build.gradle`);
  process.exit(1);
}
console.log(`  ✓ ${has.id} · ${has.name} (${has.code}) · minSdk ${has.min}`);

if (process.argv.includes('--check')) {
  console.log('\n✓ Android ayarları sağlam.');
  process.exit(0);
}

/* -------------------------------------------------------------- the game */

const { build: bundle, sizeKB } = await import('./bundle.mjs');
const { doc } = await bundle();
await mkdir(dirname(asset), { recursive: true });
await writeFile(asset, doc);
console.log(`  ✓ oyun pakete kondu — assets/pengu.html, ${sizeKB(doc)} KB`);

/*
 * A sanity check that costs nothing and catches the worst possible build: a
 * package that installs, opens, and shows an empty screen because the asset
 * was written from a half-finished bundle.
 */
const text = await readFile(asset, 'utf8');
const looksRight =
  text.includes('__PENGU_SINGLE') && text.includes('<canvas') && text.length > 300_000;
if (!looksRight) {
  console.log('  ✗ paketlenen dosya oyuna benzemiyor');
  process.exit(1);
}
console.log('  ✓ dosya oyunun kendisi — tek dosya sürümü, çevrimdışı');
console.log('\n✓ Gradle paketleyebilir:  cd android && gradle bundleRelease assembleDebug');
