/**
 * Offline play.
 *
 * The game has no backend, no accounts and no assets to speak of — it is a
 * few hundred kilobytes of text that draws everything it needs. There is no
 * good reason for it to stop working on the underground, and one very good
 * reason to care: it is played on phones, and phones lose signal.
 *
 * The strategy is two rules, and both of them exist to avoid the classic
 * service-worker failure where somebody is stuck on a version from last month
 * with no way to say so:
 *
 *   · **The page itself is network-first.** A new deploy is picked up the next
 *     time the game is opened with a signal, every time, no version dance.
 *   · **Everything else is cache-first and refreshed in the background.** The
 *     modules are content the page already asked for; serving them instantly
 *     and fetching a fresh copy behind the scenes is what makes a cold start
 *     feel like a warm one.
 *
 * Nothing is precached beyond the page: the first run has to be online, and
 * after it the whole game is on the device. Precaching a hand-written list of
 * modules would mean a list that goes stale the day somebody adds a file, and
 * this project deliberately has no build step to generate one.
 */

const CACHE = 'pengu-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['./', './index.html']))
      // A failed precache must not block the install: on a flaky connection
      // that would leave the worker permanently unable to take over, which is
      // worse than having nothing cached yet.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Only our own origin. Anything else is somebody else's cache to manage.
  if (url.origin !== self.location.origin) return;

  const isPage = request.mode === 'navigate' || url.pathname.endsWith('/index.html');

  if (isPage) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit ?? caches.match('./index.html'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      const fresh = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit ?? fresh;
    }),
  );
});
