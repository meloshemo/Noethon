/**
 * One command that runs everything.
 *
 *   npm test                  lint + node suites + build + browser suites
 *   npm run test:node         everything that needs no browser
 *   npm run test:browser      only the browser suites
 *
 * The browser half boots its own static server and shuts it down again, so
 * there is nothing to start in another terminal and nothing left running when
 * it finishes. If Playwright is not installed it says so and skips — the node
 * suites are the ones that gate the build, and they need nothing at all.
 */

import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 8123);

/** Everything that runs in plain node. Order is cheapest-first. */
const NODE_SUITES = [
  ['tools/lint.mjs', 'proje kuralları'],
  ['tests/save.mjs', 'kayıt dosyası göçü'],
  ['tests/music.mjs', 'müzik'],
  ['tests/validate-levels.mjs', 'sahanlık bölümleri'],
  ['tests/spawn-safe.mjs', 'açılış güvenliği'],
  ['tests/shelf-run.mjs', 'sahanlık çözücüsü'],
  ['tests/wind-run.mjs', 'rüzgâr çözücüsü'],
  ['tests/validate-climb.mjs', 'tırmanış geometrisi'],
  ['tests/climb-run.mjs', 'tırmanış çözücüsü'],
  ['tests/validate-dive.mjs', 'dalış geometrisi'],
  ['tests/dive-run.mjs', 'dalış çözücüsü'],
  ['tests/validate-brawl.mjs', 'arena geometrisi'],
  ['tests/brawl-run.mjs', 'arena çözücüsü'],
  ['tests/charged-fish.mjs', 'yüklü balıklar'],
  ['tests/hush.mjs', 'sessiz alan'],
  ['tests/pendulum.mjs', 'sallanan buz'],
  ['tests/lob.mjs', 'kavisli atış'],
  ['tests/trench.mjs', 'çukur'],
  ['tests/skua.mjs', 'kutup kuşu'],
  ['tests/rewarded.mjs', 'ikiye katlama'],
  ['tests/viewport.mjs', 'görüş alanı'],
  ['tests/repeatable.mjs', 'aynı bölüm iki kere'],
  ['tests/checkpoint.mjs', 'kontrol noktası sözü'],
  ['tests/offline.mjs', 'çevrimdışı katman'],
  ['tests/vent.mjs', 'deniz tabanı bacası'],
  ['tests/bank.mjs', 'kar siperi'],
  ['tests/glaze.mjs', 'cam buz'],
  ['tests/current.mjs', 'akıntı'],
  ['tests/strip.mjs', 'yorum ayıklayıcı'],
  ['tests/seal.mjs', 'deniz leoparı'],
  ['tests/flume.mjs', 'oluk'],
  ['tests/icefall.mjs', 'buz düşmesi'],
  ['tests/pose.mjs', 'ifade katmanı'],
  ['tests/economy.mjs', 'ekonomi dengesi'],
  ['tests/ghost.mjs', 'hayalet kodlaması'],
];

const BROWSER_SUITES = [
  ['tests/browser-identity.mjs', 'kimlik'],
  ['tests/browser-layout.mjs', 'arayüz düzeni'],
  ['tests/browser-climb.mjs', 'tırmanma mekaniği'],
  ['tests/browser-dive.mjs', 'yüzme mekaniği'],
  ['tests/browser-brawl.mjs', 'kar topu mekaniği'],
  ['tests/browser-charged.mjs', 'yüklü balıklar (tarayıcı)'],
  ['tests/browser-session.mjs', 'yarım kalan koşu'],
  ['tests/browser-lang.mjs', 'diller'],
  ['tests/browser-gamepad.mjs', 'kumanda kolu'],
  ['tests/browser-bundle.mjs', 'tek dosya sürümü'],
];

const args = process.argv.slice(2);
const onlyBrowser = args.includes('--only-browser');
const noBrowser = args.includes('--no-browser');
const verbose = args.includes('--verbose');

function run(file, env = {}) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [resolve(root, file)], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout?.on('data', (d) => (out += d));
    child.stderr?.on('data', (d) => (out += d));
    child.on('close', (code) => done({ code, out }));
  });
}

const started = Date.now();
const failures = [];

async function section(title, suites, env = {}) {
  console.log(`\n${title}`);
  for (const [file, label] of suites) {
    const t0 = Date.now();
    const { code, out } = await run(file, env);
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    if (code === 0) {
      console.log(`  ✓ ${label.padEnd(24)} ${secs} sn`);
    } else {
      console.log(`  ✗ ${label.padEnd(24)} ${secs} sn`);
      failures.push({ label, out });
    }
  }
}

if (!onlyBrowser) {
  await section('Node testleri', NODE_SUITES);
  console.log('\nTek dosya sürümü');
  const build = await run('tools/bundle.mjs');
  if (build.code === 0) console.log('  ✓ paketleme');
  else {
    console.log('  ✗ paketleme');
    failures.push({ label: 'paketleme', out: build.out });
  }
}

if (!noBrowser) {
  let playwright = true;
  try {
    await import('playwright');
  } catch {
    playwright = false;
  }
  if (!playwright) {
    console.log('\nTarayıcı testleri');
    console.log('  · Playwright kurulu değil — atlandı.');
    console.log('    Kurmak için:  npm install && npm run setup:browser');
  } else {
    const { serveFree } = await import('../tools/serve.mjs');
    const server = await serveFree(PORT);
    const at = server.address().port;
    if (at !== PORT) console.log(`\n(${PORT} dolu — ${at} kullanılıyor)`);
    await section('Tarayıcı testleri', BROWSER_SUITES, {
      PENGU_URL: `http://localhost:${at}`,
    });
    server.close();
  }
}

const secs = ((Date.now() - started) / 1000).toFixed(1);
if (failures.length) {
  for (const f of failures) {
    console.log(`\n──── ${f.label} ────`);
    console.log(f.out.trimEnd());
  }
  console.log(`\n✗ ${failures.length} paket düştü — ${secs} sn`);
  process.exit(1);
}
console.log(`\n✓ Hepsi geçti — ${secs} sn`);
