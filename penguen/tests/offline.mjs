/**
 * The service worker, driven rather than read.
 *
 * It had no test at all, which is how it kept a bug that only ever shows up
 * on the one load that matters most: the first one after a deploy.
 *
 * The two rules it was written with are both right on their own — the page is
 * network-first so a new version is never more than one launch away, and the
 * modules are cache-first so a cold start feels warm. Together they are the
 * classic mixed-version trap. The page is fetched; everything the page loads
 * is not. So a returning player got this morning's markup with last week's
 * stylesheet and last week's modules: a card that grew a new wrapper today is
 * laid out by a rule that has not arrived yet, and it looks broken until they
 * happen to open the game a second time.
 *
 * There is no browser here and there does not need to be one. A service worker
 * is a fetch handler; give it a `caches` and a `fetch` and it will tell you
 * exactly what it serves.
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails++;
}

/* A cache and a network, both small enough to hold in your head. --------- */

class FakeResponse {
  constructor(body, { status = 200, url = '' } = {}) {
    this.body = body;
    this.status = status;
    this.url = url;
    this.ok = status >= 200 && status < 300;
  }
  clone() { return new FakeResponse(this.body, { status: this.status, url: this.url }); }
  async text() { return this.body; }
}

class FakeCache {
  constructor() { this.map = new Map(); }
  async match(req) { return this.map.get(key(req))?.clone() ?? undefined; }
  async put(req, res) { this.map.set(key(req), res); }
  async delete(req) { return this.map.delete(key(req)); }
  async keys() { return [...this.map.keys()].map((url) => ({ url })); }
  async addAll(urls) { for (const u of urls) this.map.set(u, new FakeResponse('seed')); }
}

const key = (req) => (typeof req === 'string' ? req : req.url);

/** Load sw.js into a scope of our own and hand back its listeners. */
async function loadWorker() {
  const src = await readFile(resolve(root, 'sw.js'), 'utf8');
  const listeners = {};
  const caches = {
    store: new Map(),
    async open(name) {
      if (!this.store.has(name)) this.store.set(name, new FakeCache());
      return this.store.get(name);
    },
    async keys() { return [...this.store.keys()]; },
    async delete(name) { return this.store.delete(name); },
    async match(req) {
      for (const c of this.store.values()) {
        const hit = await c.match(req);
        if (hit) return hit;
      }
      return undefined;
    },
  };
  const self = {
    addEventListener: (name, fn) => { listeners[name] = fn; },
    skipWaiting: () => {},
    clients: { claim: () => {} },
    location: { origin: 'https://pengu.test' },
    caches,
  };
  const net = { map: new Map(), calls: [] };
  const fetch = async (req) => {
    const url = key(req);
    net.calls.push(url);
    if (!net.map.has(url)) throw new Error('offline');
    return net.map.get(url).clone();
  };
  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', 'URL', src)(self, caches, fetch, URL);
  return { listeners, caches, net, self };
}

/** Ask the worker for one URL and get back what it actually serves. */
async function get(w, url, { mode = 'no-cors' } = {}) {
  const request = { url, method: 'GET', mode };
  let served;
  const event = {
    request,
    respondWith: (p) => { served = p; },
    waitUntil: (p) => p,
  };
  w.listeners.fetch(event);
  return served === undefined ? undefined : await served;
}

const PAGE = 'https://pengu.test/index.html';
const MOD = 'https://pengu.test/src/game/world.js';
const CSS = 'https://pengu.test/styles/ui.css';

console.log('Çevrimdışı katman — gerçekten çalıştırılarak\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) Sayfa ağdan, modüller önbellekten');
{
  const w = await loadWorker();
  w.net.map.set(PAGE, new FakeResponse('<html>v1</html>'));
  w.net.map.set(MOD, new FakeResponse('v1 kod'));
  await get(w, PAGE, { mode: 'navigate' });
  await get(w, MOD);
  const before = w.net.calls.length;
  const again = await get(w, MOD);
  check('ikinci istek önbellekten geliyor', (await again.text()) === 'v1 kod');
  check('yine de arkada tazeleniyor', w.net.calls.length > before);
}

/* 2 --------------------------------------------------------------------- */
console.log('\n2) Sinyal yokken oyun açılıyor');
{
  const w = await loadWorker();
  w.net.map.set(PAGE, new FakeResponse('<html>v1</html>'));
  w.net.map.set(MOD, new FakeResponse('v1 kod'));
  await get(w, PAGE, { mode: 'navigate' });
  await get(w, MOD);
  w.net.map.clear(); // metroya girdi
  const page = await get(w, PAGE, { mode: 'navigate' });
  const mod = await get(w, MOD);
  check('sayfa önbellekten servis ediliyor', page && (await page.text()) === '<html>v1</html>');
  check('modül önbellekten servis ediliyor', mod && (await mod.text()) === 'v1 kod');
}

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Yeni sürüm gelince eski modüller kalmıyor');
// The bug this file was written for.
{
  const w = await loadWorker();
  w.net.map.set(PAGE, new FakeResponse('<html>v1</html>'));
  w.net.map.set(MOD, new FakeResponse('v1 kod'));
  w.net.map.set(CSS, new FakeResponse('v1 stil'));
  await get(w, PAGE, { mode: 'navigate' });
  await get(w, MOD);
  await get(w, CSS);

  // Deploy.
  w.net.map.set(PAGE, new FakeResponse('<html>v2</html>'));
  w.net.map.set(MOD, new FakeResponse('v2 kod'));
  w.net.map.set(CSS, new FakeResponse('v2 stil'));

  const page = await get(w, PAGE, { mode: 'navigate' });
  check('sayfa yeni', (await page.text()) === '<html>v2</html>');
  const mod = await get(w, MOD);
  const css = await get(w, CSS);
  check('modül de yeni', (await mod.text()) === 'v2 kod', await mod.text());
  check('stil de yeni', (await css.text()) === 'v2 stil', await css.text());
}

/* 4 --------------------------------------------------------------------- */
console.log('\n4) Değişmeyen sayfa önbelleği boşaltmıyor');
// Emptying on every launch would turn a warm start cold for nothing.
{
  const w = await loadWorker();
  w.net.map.set(PAGE, new FakeResponse('<html>v1</html>'));
  w.net.map.set(MOD, new FakeResponse('v1 kod'));
  await get(w, PAGE, { mode: 'navigate' });
  await get(w, MOD);
  await get(w, PAGE, { mode: 'navigate' });
  const cache = await w.caches.open('pengu-v1');
  const kept = await cache.match(MOD);
  check('modül önbellekte duruyor', Boolean(kept));
}

/* 5 --------------------------------------------------------------------- */
console.log('\n5) Kötü bir cevap oyunu silmiyor');
// A captive portal's login page, or a 404 from a half-finished deploy, is not
// a new version — and throwing the cache away for one would take the game
// offline for somebody who had it working a second ago.
{
  const w = await loadWorker();
  w.net.map.set(PAGE, new FakeResponse('<html>v1</html>'));
  w.net.map.set(MOD, new FakeResponse('v1 kod'));
  await get(w, PAGE, { mode: 'navigate' });
  await get(w, MOD);
  w.net.map.set(PAGE, new FakeResponse('<html>giriş yapın</html>', { status: 302 }));
  await get(w, PAGE, { mode: 'navigate' });
  const cache = await w.caches.open('pengu-v1');
  check('modül hâlâ orada', Boolean(await cache.match(MOD)));
  check('sayfanın iyi kopyası korunuyor',
    (await (await cache.match(PAGE)).text()) === '<html>v1</html>');
}

/* 6 --------------------------------------------------------------------- */
console.log('\n6) Başkasının adresine karışmıyor');
{
  const w = await loadWorker();
  const served = await get(w, 'https://example.com/tracker.js');
  check('dış adres dokunulmadan geçiyor', served === undefined);
}

if (fails) {
  console.log(`\n✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('\n✓ Çevrimdışı çalışıyor, ve yeni sürüm bir bütün olarak geliyor.');
