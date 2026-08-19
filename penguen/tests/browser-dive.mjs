/**
 * The swimming mechanic, in a real browser.
 *
 * `dive-run.mjs` proves the levels can be finished; this proves the *verb*
 * behaves the way the chapter promises, in the actual page, through the actual
 * input layer — because a level that is provably passable in Node is no use if
 * the button does something else once it is wired to a keyboard.
 *
 *   npx playwright install chromium   (once)
 *   node tests/browser-dive.mjs       (with the game served on :8123)
 */

import { chromium } from 'playwright';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('CONNECTION_RESET')) errors.push('console: ' + m.text());
});

await p.goto('http://localhost:8123/index.html', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(600);

const fails = [];
const ok = (name, cond, extra = '') => {
  if (cond) console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`);
  else {
    console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`);
    fails.push(name);
  }
};

await p.evaluate(() => {
  window.__pengu.save.unlocked = 70;
  const inp = window.__pengu.input;
  window.__ctl = {
    hold(a, on) {
      if (on) inp._sources.touch.add(a);
      else inp._sources.touch.delete(a);
      inp._sync();
    },
    release() {
      for (const a of ['left', 'right', 'jump']) inp._sources.touch.delete(a);
      inp._sync();
    },
  };
});

const start = async (id) => {
  await p.evaluate((l) => window.__pengu.startLevel(l), id);
  await p.waitForTimeout(260);
  await p.evaluate(() => window.__ctl.release());
};
const read = () =>
  p.evaluate(() => {
    const w = window.__pengu.world;
    const pl = w.player;
    return {
      x: pl.x, y: pl.y, vy: pl.vy, vx: pl.vx,
      breath: pl.breath, breathMax: pl.breathMax,
      sub: pl.submerged, diving: pl.diving, breathing: pl.breathing,
      status: w.status, holes: w.airHoles.length, axis: w.axis,
      onGround: pl.onGround, clinging: pl.clinging,
    };
  });

console.log('\nBuz altı mekaniği — gerçek tarayıcıda\n');

/* 1 ------------------------------------------------------------------ */
console.log('1) Bölüm su altında başlıyor');
await start(47);
let s = await read();
ok('eksen dalış', s.axis === 'dive', s.axis);
ok('penguen suda', s.sub === true);
ok('ciğer dolu', Math.abs(s.breath - s.breathMax) < 0.2, `${s.breath.toFixed(1)}/${s.breathMax.toFixed(1)}`);
ok('nefes delikleri var', s.holes >= 2, `${s.holes} delik`);
ok('yerde değil', s.onGround === false);

/* 2 ------------------------------------------------------------------ */
console.log('\n2) Bırakınca yükseliyor, basınca iniyor');
// Put it in open water first so neither the ceiling nor the bed is in the way.
await p.evaluate(() => {
  const w = window.__pengu.world;
  w.player.x = 900;
  w.player.y = w.worldH * 0.5;
  w.player.vx = 0;
  w.player.vy = 0;
});
await p.waitForTimeout(280);
const up = await read();
ok('bırakınca yukarı', up.vy < -80, `vy=${Math.round(up.vy)}`);

await p.evaluate(() => window.__ctl.hold('jump', true));
await p.waitForTimeout(350);
const down = await read();
ok('basınca aşağı', down.vy > 120, `vy=${Math.round(down.vy)}`);
ok('dalma bayrağı', down.diving === true);
ok('iniş yükselişten hızlı', down.vy > Math.abs(up.vy), `${Math.round(down.vy)} > ${Math.round(Math.abs(up.vy))}`);
await p.evaluate(() => window.__ctl.release());

/* 3 ------------------------------------------------------------------ */
console.log('\n3) Suda karada olduğundan hızlı');
await p.evaluate(() => {
  const w = window.__pengu.world;
  w.player.x = 900;
  w.player.y = w.worldH * 0.5;
  w.player.vx = 0;
  window.__ctl.hold('right', true);
});
await p.waitForTimeout(700);
const fast = await read();
const land = await p.evaluate(() => window.__pengu.world.player.moveSpeed);
ok('yüzme koşudan hızlı', fast.vx > land * 1.2, `${Math.round(fast.vx)} vs ${Math.round(land)}`);
await p.evaluate(() => window.__ctl.release());

/* 4 ------------------------------------------------------------------ */
console.log('\n4) Nefes bitiyor');
await p.evaluate(() => {
  const w = window.__pengu.world;
  w.player.x = 900;
  w.player.y = w.worldH * 0.55;
  w.player.breath = w.player.breathMax;
});
await p.waitForTimeout(900);
const spent = await read();
ok('ciğer suda azalıyor', spent.breath < spent.breathMax - 0.4, `${spent.breath.toFixed(1)}`);

await p.evaluate(() => {
  window.__pengu.world.player.breath = 0.12;
});
await p.waitForTimeout(400);
const drowned = await read();
ok('nefes bitince ölüm', drowned.status === 'dying', drowned.status);

/* 5 ------------------------------------------------------------------ */
console.log('\n5) Delikte nefes alınıyor');
await start(47);
await p.evaluate(() => {
  const w = window.__pengu.world;
  const hole = w.airHoles[0];
  w.player.x = hole.x + hole.w / 2 - w.player.w / 2;
  w.player.y = hole.y + hole.h * 0.35;
  w.player.vx = 0;
  w.player.vy = 0;
  w.player.breath = 2;
});
await p.waitForTimeout(500);
const gasp = await read();
ok('delikte nefes bayrağı', gasp.breathing === true);
ok('ciğer doluyor', gasp.breath > 2.4, `${gasp.breath.toFixed(1)}`);

/* 6 ------------------------------------------------------------------ */
console.log('\n6) Diğer bölümler değişmedi');
await start(3);
const shelf = await read();
ok('sahanlık suda değil', shelf.sub === false);
ok('sahanlıkta yere basıyor', shelf.onGround === true || shelf.vy > 0, `vy=${Math.round(shelf.vy)}`);
await start(33);
const tower = await read();
ok('tırmanış suda değil', tower.sub === false, tower.axis);

/* 7 ------------------------------------------------------------------ */
console.log('\n7) Bir dalış gerçekten oynanıyor');
await start(52);
// You have to dive to get out of the entry hole: the ice is a ceiling and the
// hole is the one gap in it. That is the chapter teaching its own verb in the
// first second, and it is worth asserting rather than working around.
await p.evaluate(() => window.__ctl.hold('right', true));
await p.waitForTimeout(700);
const stuck = await read();
ok('delikten çıkmak için dalmak gerekiyor', stuck.x < 400, `x=${Math.round(stuck.x)}`);
await p.evaluate(() => window.__ctl.hold('jump', true));
await p.waitForTimeout(1700);
const run = await read();
await p.evaluate(() => window.__ctl.release());
ok('dalınca ilerliyor', run.x > 560, `x=${Math.round(run.x)}`);
ok('hâlâ oynuyor', run.status === 'playing', run.status);

/* 8 ------------------------------------------------------------------ */
console.log('\n8) Konsol');
ok('hata yok', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(fails.length ? `\n✗ ${fails.length} başarısız: ${fails.join(', ')}` : '\n✓ yüzme mekaniği çalışıyor');
await b.close();
process.exit(fails.length ? 1 : 0);
