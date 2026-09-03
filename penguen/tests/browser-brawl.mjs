/**
 * The snowball fight, in a real browser.
 *
 * `brawl-run.mjs` proves the arenas can be won; this proves the *rules* behave
 * the way the chapter promises, in the actual page. Most of it is about one
 * sentence — a snowball stops at the first thing it touches — because every
 * other claim the chapter makes rests on that one being true.
 *
 *   node tests/browser-brawl.mjs      (with the game served on :8123)
 */

import { launch, openGame, checklist } from './browser-kit.mjs';

const b = await launch();
const { page: p, errors } = await openGame(b, { width: 1280, height: 720 });
const { ok, finish } = checklist();

const start = async (id) => {
  await p.evaluate((l) => window.__pengu.startLevel(l), id);
  await p.waitForTimeout(240);
};
const read = () =>
  p.evaluate(() => {
    const w = window.__pengu.world;
    return {
      brawl: w.brawl,
      rivals: w.rivals.length,
      guards: w.rivals.filter((r) => r.guard).length,
      down: w.rivals.filter((r) => r.out).length,
      balls: w.snowballs.length,
      locked: w.exitLocked,
      status: w.status,
      aiming: w.rivals.filter((r) => r.aim).length,
      progress: +w.progress.toFixed(2),
    };
  });

console.log('\nKar topu mekaniği — gerçek tarayıcıda\n');

/* 1 ------------------------------------------------------------------ */
console.log('1) Arena kuruluyor');
await start(62);
let s = await read();
ok('kar topu modu', s.brawl === true);
ok('rakipler var', s.rivals >= 2, `${s.rivals} rakip`);
ok('kapıda biri var', s.guards >= 1, `${s.guards} kapıcı`);
ok('çıkış kilitli', s.locked === true);

/* 2 ------------------------------------------------------------------ */
console.log('\n2) Nişan alıp atıyorlar');
// Polled rather than sampled once: a snowball crosses the arena in under two
// seconds, so a single look at the wrong moment sees an empty sky.
let seen = 0;
for (let i = 0; i < 24; i++) {
  await p.waitForTimeout(180);
  const now = await read();
  seen = Math.max(seen, now.balls + now.down);
  if (seen) break;
}
ok('atış oluyor', seen > 0, `${seen} top/devrilen`);
const locked = await p.evaluate(() => {
  const w = window.__pengu.world;
  const r = w.rivals.find((x) => !x.guard);
  r.state = 'wait';
  r.timer = 0;
  w.player.x = 400;
  w.player.y = w.floes[0].y - w.player.h;
  w.update(1 / 120, { axis: 0, jumpHeld: false, jumpPressed: false });
  const before = r.aim ? { ...r.aim } : null;
  // Move a long way and step again: the aim must not follow.
  w.player.x = 1000;
  for (let i = 0; i < 20; i++) w.update(1 / 120, { axis: 0, jumpHeld: false, jumpPressed: false });
  return { before, after: r.aim ? { ...r.aim } : null };
});
ok('nişan kilitleniyor', Boolean(locked.before), locked.before ? `x=${Math.round(locked.before.x)}` : 'nişan yok');
ok(
  'nişan oyuncuyu takip etmiyor',
  !locked.after || Math.abs(locked.after.x - locked.before.x) < 1,
  locked.after ? `x=${Math.round(locked.after.x)}` : 'atıldı',
);

/* 3 ------------------------------------------------------------------ */
console.log('\n3) Kar topu ilk değdiği şeyde duruyor');
const hitRival = await p.evaluate(() => {
  const w = window.__pengu.world;
  const guard = w.rivals.find((r) => r.guard);
  // A ball fired straight at the guard from just beside it.
  const from = { x: guard.x - 200, y: guard.y + guard.h / 2 };
  const to = { x: guard.x + guard.w / 2, y: guard.y + guard.h / 2 };
  w.snowballs.push(new (Object.getPrototypeOf(w.snowballs).constructor || Object)());
  w.snowballs.length = 0;
  // Use the world's own class by making a rival throw along that line.
  const shooter = w.rivals.find((r) => !r.guard);
  const saved = { x: shooter.x, y: shooter.y };
  shooter.x = from.x - shooter.w / 2;
  shooter.y = from.y - shooter.h * 0.34;
  shooter.state = 'windup';
  shooter.aim = to;
  shooter.timer = 0;
  for (let i = 0; i < 120 && !guard.out; i++) {
    w.update(1 / 120, { axis: 0, jumpHeld: false, jumpPressed: false });
  }
  const res = { out: guard.out, locked: w.exitLocked, balls: w.snowballs.length };
  shooter.x = saved.x;
  shooter.y = saved.y;
  return res;
});
ok('kapıdaki devriliyor', hitRival.out === true);
ok('devrilince kar topu duruyor', hitRival.balls === 0, `${hitRival.balls} top`);
ok('son kapıcı düşünce çıkış açılıyor', hitRival.locked === false);

/* 4 ------------------------------------------------------------------ */
console.log('\n4) Oyuncuya değen kar topu öldürüyor');
await start(64);
const killed = await p.evaluate(() => {
  const w = window.__pengu.world;
  const shooter = w.rivals.find((r) => !r.guard);
  const pl = w.player;
  shooter.state = 'windup';
  shooter.aim = { x: pl.x + pl.w / 2, y: pl.y + pl.h / 2 };
  shooter.timer = 0;
  for (let i = 0; i < 300 && w.status === 'playing'; i++) {
    w.update(1 / 120, { axis: 0, jumpHeld: false, jumpPressed: false });
  }
  return w.status;
});
ok('vurulunca ölüyor', killed === 'dying', killed);

/* 5 ------------------------------------------------------------------ */
console.log('\n5) Ölünce arena sıfırlanıyor');
await start(63);
const reset = await p.evaluate(() => {
  const w = window.__pengu.world;
  w.rivals[0].knockOut();
  const downBefore = w.rivals.filter((r) => r.out).length;
  w.die('snowball');
  for (let i = 0; i < 200; i++) w.update(1 / 120, { axis: 0, jumpHeld: false, jumpPressed: false });
  return { downBefore, downAfter: w.rivals.filter((r) => r.out).length, status: w.status };
});
ok('ölmeden önce biri düşmüştü', reset.downBefore === 1);
ok('ölünce hepsi kalkıyor', reset.downAfter === 0, `${reset.downAfter} yatıyor`);

/* 6 ------------------------------------------------------------------ */
console.log('\n6) Kilitli çıkış gerçekten kilitli');
await start(62);
const gate = await p.evaluate(() => {
  const w = window.__pengu.world;
  w.player.x = w.goal.x + 60;
  w.player.y = w.floes[0].y - w.player.h;
  for (let i = 0; i < 60; i++) w.update(1 / 120, { axis: 0, jumpHeld: false, jumpPressed: false });
  const blocked = w.status;
  for (const r of w.rivals) if (r.guard) r.knockOut();
  for (let i = 0; i < 60; i++) w.update(1 / 120, { axis: 0, jumpHeld: false, jumpPressed: false });
  return { blocked, opened: w.status };
});
ok('kapıcılar ayaktayken bitmiyor', gate.blocked === 'playing', gate.blocked);
ok('kapıcılar düşünce bitiyor', gate.opened === 'won', gate.opened);

/* 7 ------------------------------------------------------------------ */
console.log('\n7) Diğer bölümler değişmedi');
await start(5);
const shelf = await read();
ok('sahanlıkta kar topu yok', shelf.brawl === false && shelf.rivals === 0);
await start(50);
const dive = await read();
ok('dalışta kar topu yok', dive.brawl === false && dive.rivals === 0);

/* 8 ------------------------------------------------------------------ */
console.log('\n8) Konsol');
ok('hata yok', errors.length === 0, errors.slice(0, 3).join(' | '));

const code = finish('kar topu mekaniği çalışıyor');
await b.close();
process.exit(code);
