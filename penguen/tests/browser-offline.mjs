/**
 * The offline promise, kept by a browser rather than by a comment.
 *
 * `tests/offline.mjs` drives the service worker's fetch handler directly: it
 * is fast, it is precise, and it proved the two caching rules behave. What it
 * cannot see is the one thing a player actually does — open the game once with
 * a signal, lose the signal, open it again — because that story is about *when*
 * the worker exists, not about what it serves once it does.
 *
 * Driven here, the story failed. After a single online visit the cache held
 * two entries, `./` and `./index.html`, and the forty modules the game is made
 * of were not among them: every one of them was fetched before the worker had
 * installed, so the worker never saw them. Reloading with the network off gave
 * a page that could not load its own code. A second online visit fixed it,
 * which is no comfort at all — the visit that matters is the first one, on the
 * platform, before the train goes under.
 *
 * So the page now hands the worker the list of what it just loaded (see
 * `sw.js`), and this is the pack that says so in the only way that counts: one
 * visit, network off, play a level.
 */

import { launch, LANG, URL } from './browser-kit.mjs';
import { checklist } from './browser-kit.mjs';

const b = await launch();
const { ok, finish } = checklist();

console.log('\nSinyalsiz açılış — gerçek tarayıcıda\n');

/*
 * A context of this suite's own, because the shared one blocks workers.
 *
 * Every other browser pack asks for `serviceWorkers: 'block'`, and rightly:
 * a suite quietly served yesterday's modules out of a cache is a suite that
 * passes for the wrong reason. This one is about the cache, so it is the one
 * place that has to let it run.
 */
const ctx = await b.newContext({
  viewport: { width: 1100, height: 760 },
  locale: LANG === 'tr' ? 'tr-TR' : 'en-GB',
  serviceWorkers: 'allow',
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

/* 1 — one visit, with a signal ------------------------------------------ */
console.log('1) Tek bir online ziyaret');

await page.goto(`${URL}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__pengu), null, { timeout: 15000 });

const controlled = await page
  .waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 })
  .then(() => true)
  .catch(() => false);
ok('servis çalışanı sayfayı devraldı', controlled);

/**
 * Wait for the warm-up rather than sleeping through it.
 *
 * It is a `postMessage` away in another thread fetching forty files; a fixed
 * wait is either too short on a loaded machine or wasted time on a quiet one.
 * The cache itself is the signal.
 */
const held = async () =>
  page.evaluate(async () => {
    const c = await caches.open('pengu-v1');
    return (await c.keys()).map((k) => new globalThis.URL(k.url).pathname);
  });

const deadline = Date.now() + 15000;
let cached = await held();
while (cached.length < 10 && Date.now() < deadline) {
  await page.waitForTimeout(250);
  cached = await held();
}

ok('sayfanın yüklediği her şey önbellekte', cached.length >= 10, `${cached.length} dosya`);
ok(
  'modüller de orada',
  cached.some((u) => u.endsWith('/src/main.js')) && cached.some((u) => u.endsWith('/src/game/world.js')),
);
ok('stil de orada', cached.some((u) => u.endsWith('.css')));
ok(
  'dışarıdan hiçbir şey saklanmadı',
  cached.every((u) => u.startsWith('/')),
);

/* 2 — the train goes under ---------------------------------------------- */
console.log('\n2) Sinyal gidiyor');

await ctx.setOffline(true);

let booted = false;
try {
  await page.reload({ waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => Boolean(window.__pengu), null, { timeout: 15000 });
  booted = true;
} catch {
  booted = false;
}
ok('oyun sinyalsiz açıldı', booted);

/* 3 — and it is the whole game, not a shell ----------------------------- */
console.log('\n3) Ve açılan şey oyunun kendisi');

if (booted) {
  const played = await page.evaluate(async () => {
    const g = window.__pengu;
    g.save.unlocked = 999;
    g.save.name ||= 'Testçi';
    g.save.profile.greeted = true;
    g.startLevel(3);
    await new Promise((r) => setTimeout(r, 400));
    const before = g.world.player.x;
    window.__pengu.input._sources.touch.add('right');
    window.__pengu.input._sync();
    await new Promise((r) => setTimeout(r, 500));
    window.__pengu.input._sources.touch.delete('right');
    window.__pengu.input._sync();
    return {
      state: g.state,
      status: g.world.status,
      moved: Math.round(g.world.player.x - before),
      name: g.world.def.name,
    };
  });
  ok('bölüm başladı', played.state === 'playing' && played.status === 'playing', played.name);
  ok('penguen yürüyor', played.moved > 20, `${played.moved}px`);
} else {
  ok('bölüm başladı', false);
  ok('penguen yürüyor', false);
}

ok('konsol temiz', errors.length === 0, errors.slice(0, 2).join(' | '));

await ctx.close();
await b.close();
process.exit(finish('sinyalsiz açılış sağlam'));
