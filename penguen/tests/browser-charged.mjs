/**
 * The charged fish, in a real browser.
 *
 * `charged-fish.mjs` drives the `Player` and `World` classes directly, which
 * proves the physics and nothing else. This opens the actual page, walks the
 * penguin into an actual fish and watches the actual canvas, because the three
 * things most likely to be wrong are exactly the three that a headless test
 * cannot see: whether the pickup renders without throwing, whether the effect
 * survives a real frame loop at a real frame rate, and whether the hint that
 * tells the player what just happened ever appears.
 *
 *   node tests/browser-charged.mjs    (with the game served on :8123)
 */

import { launch, openGame, checklist } from './browser-kit.mjs';

const b = await launch();
const { page: p, errors } = await openGame(b, { width: 1280, height: 720 });
const { ok, finish } = checklist();

const start = async (id) => {
  await p.evaluate((l) => window.__pengu.startLevel(l), id);
  await p.waitForTimeout(260);
};

/** Put the penguin on top of the nth charged fish and let a frame run. */
const eat = (n = 0) =>
  p.evaluate(async (idx) => {
    const w = window.__pengu.world;
    const f = w.charged[idx];
    if (!f) return null;
    w.player.x = f.x + f.w / 2 - w.player.w / 2;
    w.player.y = f.y + f.h / 2 - w.player.h / 2;
    w.player.vx = 0;
    w.player.vy = 0;
    await new Promise((r) => setTimeout(r, 120));
    const pl = w.player;
    return {
      kind: f.kind,
      taken: f.taken,
      coil: +pl.coil.toFixed(2),
      armed: pl.coilArmed,
      quantum: +pl.quantum.toFixed(2),
      slack: +pl.slack.toFixed(2),
      hint: w.hint ?? '',
      value: w.chargedValue,
    };
  }, n);

console.log('\nYüklü balıklar — gerçek tarayıcıda\n');

/* 1 ------------------------------------------------------------------ */
console.log('1) Balıklar bölüme yerleşmiş');
await start(31);
const placed = await p.evaluate(() => {
  const w = window.__pengu.world;
  return w.charged.map((f) => ({ kind: f.kind, x: Math.round(f.x), y: Math.round(f.y) }));
});
ok('31. bölümde üç renk birden var', placed.length === 3, JSON.stringify(placed.map((f) => f.kind)));
ok(
  'üçü de farklı yerlerde',
  new Set(placed.map((f) => f.x)).size === placed.length,
  placed.map((f) => f.x).join(', '),
);

/* 2 ------------------------------------------------------------------ */
console.log('\n2) Yemek işe yarıyor');
const first = await eat(0);
ok('balık alındı', first?.taken === true, JSON.stringify(first));
ok(
  'etki başladı',
  (first?.coil ?? 0) > 0 || (first?.quantum ?? 0) > 0 || (first?.slack ?? 0) > 0,
  JSON.stringify(first),
);
ok('oyuncuya söylendi', typeof first?.hint === 'string' && first.hint.length > 0, first?.hint);
ok('para kazandırdı', (first?.value ?? 0) > 0, String(first?.value));

/* 3 ------------------------------------------------------------------ */
console.log('\n3) Çizim patlamıyor');
// The fish, the halo, the orbiting ring and the aura under the penguin are all
// new canvas work and all of it runs every frame. Two seconds of real frames
// with an effect active is the cheapest way to find out it never throws.
await p.waitForTimeout(2000);
const alive = await p.evaluate(() => {
  const w = window.__pengu.world;
  return { status: w.status, frames: w.time > 0 };
});
ok('oyun dönmeye devam ediyor', alive.frames === true);
ok('konsol temiz', errors.length === 0, errors.join(' | '));

/* 4 ------------------------------------------------------------------ */
console.log('\n4) Kuşun elinden kurtulmak');
await start(20);
const wrestle = await p.evaluate(async () => {
  const w = window.__pengu.world;
  w.ambushes = true;
  w.skuaCooldown = 0;
  w._launchSkua();
  w.skua.state = 'carry';
  w.skua.t = 0;
  w.skua.x = w.player.centerX;
  w.skua.y = w.player.y;
  w.player.alive = false;
  const deaths = w.deaths;
  // A person mashing the key, through the real input layer.
  for (let i = 0; i < 10; i++) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await new Promise((r) => setTimeout(r, 40));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    await new Promise((r) => setTimeout(r, 40));
    if (!w.skua) break;
  }
  return { escaped: w.skuasEscaped, alive: w.player.alive, died: w.deaths > deaths };
});
ok('boğuşma kazanılabiliyor', wrestle.escaped === 1 && wrestle.alive === true, JSON.stringify(wrestle));
ok('kurtulan ölmedi', wrestle.died === false);

await b.close();
finish('Yüklü balıklar ve boğuşma tarayıcıda çalışıyor.');
