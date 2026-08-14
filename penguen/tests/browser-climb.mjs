import { chromium } from 'playwright';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message + '\n' + (e.stack ?? '')));
p.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('CONNECTION_RESET')) errors.push('console: ' + m.text());
});

await p.goto('http://localhost:8123/index.html', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(500);

const fails = [];
const ok = (name, cond, extra = '') => {
  if (cond) console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`);
  else {
    console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`);
    fails.push(name);
  }
};

// Unlock everything so any level can be started.
await p.evaluate(() => {
  window.__pengu.save.unlocked = 60;
});

/* ---------------------------------------------------------- helpers */
await p.evaluate(() => {
  const inp = window.__pengu.input;
  window.__ctl = {
    hold(a, on) {
      if (on) inp._sources.touch.add(a);
      else inp._sources.touch.delete(a);
      inp._sync();
    },
    tap(a) {
      inp._sources.touch.add(a);
      inp._sync();
      inp._emit(a);
      setTimeout(() => {
        inp._sources.touch.delete(a);
        inp._sync();
      }, 40);
    },
    release() {
      for (const a of ['left', 'right', 'jump']) inp._sources.touch.delete(a);
      inp._sync();
    },
    // A jump is an edge, not a level: `jumpPressed` only ever comes from the
    // emit, so holding the button without emitting never jumps at all.
    press(a) {
      inp._sources.touch.add(a);
      inp._sync();
      inp._emit(a);
    },
  };
});

const start = async (id) => {
  await p.evaluate((lv) => {
    const g = window.__pengu;
    window.__ctl.release();
    g.startLevel(lv);
  }, id);
  await p.waitForTimeout(300);
};

const snap = () =>
  p.evaluate(() => {
    const w = window.__pengu.world;
    const pl = w.player;
    return {
      x: Math.round(pl.x),
      y: Math.round(pl.y),
      vx: Math.round(pl.vx),
      vy: Math.round(pl.vy),
      onGround: pl.onGround,
      clinging: pl.clinging,
      climbing: pl.climbing,
      wallSide: pl.wallSide,
      stamina: +pl.stamina.toFixed(2),
      staminaMax: +pl.staminaMax.toFixed(2),
      status: w.status,
      progress: +w.progress.toFixed(3),
      metres: w.metresClimbed,
      axis: w.axis,
      camX: Math.round(w.camera.x),
      worldW: w.worldW,
    };
  });

/* ------------------------------------------------ 1 · a tower loads */
console.log('\n1) Dağ bölümü yükleniyor');
await start(32);
let s = await snap();
ok('bölüm 32 dikey', s.axis === 'up', `axis=${s.axis}`);
ok('kule ekranda ortalı', s.camX < 0 && s.worldW < 1280, `camX=${s.camX} worldW=${s.worldW}`);
ok('penguen buzun üstünde', s.onGround, JSON.stringify({ x: s.x, y: s.y }));

/* --------------------------------------------- 2 · the grip engages */
console.log('\n2) Duvara tutunma');
// The mechanics need room to be measured in, so this runs on the tallest wall
// in the game rather than on the tutorial's 96px one — on a short wall the
// penguin simply slides off the bottom before a drain rate can be read.
await start(38);
const wall = await p.evaluate(() => {
  const w = window.__pengu.world;
  const walls = w.terrain.filter((t) => t.climb);
  const target = walls.sort((a, c) => c.h - a.h)[0];
  // Which face of it is open air: a chimney's left wall is gripped from the
  // right, and pressing the wrong way just shoves the penguin off the map.
  const grip = target.x < w.worldW / 2 ? -1 : 1;
  // A stretch of that wall with nothing to land on: rest nubs and cornices sit
  // against the columns, and a measurement taken beside one measures the nub.
  const px = grip > 0 ? target.x - 50 : target.x + target.w + 2;
  let at = null;
  for (let f = 0.25; f <= 0.8; f += 0.05) {
    const y = target.y + target.h * f;
    const clear = w.floes.every(
      (fl) => fl.x > px + 90 || fl.x + fl.w < px - 20 || Math.abs(fl.y - y) > 110,
    );
    if (clear) { at = y; break; }
  }
  return { x: target.x, y: target.y, w: target.w, h: target.h, grip, at: at ?? target.y + target.h * 0.5 };
});
console.log(`   duvar: x=${wall.x} y=${wall.y} h=${wall.h}, yüz ${wall.grip > 0 ? 'sol' : 'sağ'}`);
const INTO = wall.grip > 0 ? 'right' : 'left';

// Teleport beside the wall's lower half and drop into it — this is a mechanics
// test, not a pathfinding test, so getting there is not the thing being checked.
await p.evaluate((wl) => {
  const pl = window.__pengu.world.player;
  pl.x = wl.grip > 0 ? wl.x - pl.w - 2 : wl.x + wl.w + 2;
  pl.y = wl.at;
  pl.vx = 0;
  pl.vy = 0;
  pl.onGround = false;
}, wall);
await p.evaluate((d) => window.__ctl.hold(d, true), INTO);
await p.waitForTimeout(220);
s = await snap();
ok('duvara basınca tutunuyor', s.clinging && s.wallSide === wall.grip, JSON.stringify({ clinging: s.clinging, side: s.wallSide }));
const hangStart = s.stamina;

/* ----------------------------------------- 3 · hanging costs, slowly */
console.log('\n3) Asılı durmak azar azar tüketiyor');
await p.waitForTimeout(700);
let s2 = await snap();
const hangDrain = hangStart - s2.stamina;
ok('asılıyken bar iniyor', hangDrain > 0.2 && hangDrain < 0.9, `${hangDrain.toFixed(2)} birim / 0.7 sn`);
ok('asılıyken yavaş kayıyor', s2.y > s.y, `${s.y} → ${s2.y}`);

/* ------------------------------------------ 4 · climbing costs more */
console.log('\n4) Tırmanmak daha pahalı ve yukarı götürüyor');
const beforeClimb = await snap();
await p.evaluate(() => window.__ctl.hold('jump', true));
await p.waitForTimeout(700);
const afterClimb = await snap();
await p.evaluate(() => window.__ctl.hold('jump', false));
const climbDrain = beforeClimb.stamina - afterClimb.stamina;
ok('tırmanırken yukarı çıkıyor', afterClimb.y < beforeClimb.y - 40, `${beforeClimb.y} → ${afterClimb.y}`);
ok('tırmanmak asılmaktan pahalı', climbDrain > hangDrain * 1.6, `tırmanma ${climbDrain.toFixed(2)} vs asılma ${hangDrain.toFixed(2)}`);
ok('tırmanma bayrağı açık', afterClimb.climbing, `climbing=${afterClimb.climbing}`);

/* ---------------------------------------------- 5 · the kick throws */
console.log('\n5) Tekme');
// Down the wall, clear of the cornice at the top and the rest ledge in the
// middle — a kick taken under either of those hits something 13px later and
// measures nothing.
await p.evaluate(() => window.__ctl.release());
await p.evaluate((wl) => {
  const pl = window.__pengu.world.player;
  pl.x = wl.grip > 0 ? wl.x - pl.w - 2 : wl.x + wl.w + 2;
  pl.y = wl.at;
  pl.vx = 0;
  pl.vy = 0;
  pl.onGround = false;
}, wall);
await p.evaluate((d) => window.__ctl.hold(d, true), INTO);
await p.waitForTimeout(180);
const beforeKick = await snap();
await p.evaluate(() => window.__ctl.press('jump'));
await p.waitForTimeout(45);
const afterKick = await snap();
await p.evaluate(() => window.__ctl.release());
ok('tekme duvardan uzağa atıyor', afterKick.vx * wall.grip < -120, `vx=${afterKick.vx}`);
ok('tekme yukarı atıyor', afterKick.vy < -300, `vy=${afterKick.vy}`);
ok('tekme tutunmayı bitiriyor', !afterKick.clinging);
ok('tekmenin bir bedeli var', afterKick.stamina < beforeKick.stamina, `${beforeKick.stamina} → ${afterKick.stamina}`);

/* ------------------------------------- 6 · the bar really runs out */
console.log('\n6) Bar bitince tutunma bitiyor');
// Watched frame by frame rather than sampled after a fixed wait: the penguin
// slips, falls, lands and starts refilling in well under a second, so a single
// late reading shows a healthy bar and proves nothing.
await start(38); // the kick above left the penguin falling; start clean
const slip = await p.evaluate(async (wl) => {
  const w = window.__pengu.world;
  const pl = w.player;
  pl.x = wl.grip > 0 ? wl.x - pl.w - 2 : wl.x + wl.w + 2;
  pl.y = wl.at;
  pl.vx = 0;
  pl.vy = 0;
  pl.onGround = false;
  pl.stamina = 0.35;
  window.__ctl.hold(wl.grip > 0 ? 'right' : 'left', true);

  let held = false;
  let out = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 1500) {
    await new Promise((r) => setTimeout(r, 25));
    if (pl.clinging) held = true;
    if (held && !pl.clinging) {
      out = { stamina: +pl.stamina.toFixed(3), vy: Math.round(pl.vy), onGround: pl.onGround };
      break;
    }
  }
  window.__ctl.release();
  return { held, out };
}, wall);
ok('önce tutundu', slip.held);
ok('bar bitti', slip.out && slip.out.stamina <= 0.001, JSON.stringify(slip.out));
ok('tutunma koptu ve düşüyor', slip.out && slip.out.vy > 60 && !slip.out.onGround, JSON.stringify(slip.out));

/* --------------------------------------- 7 · the ground gives it back */
console.log('\n7) Yerde bar doluyor');
await p.evaluate(() => {
  const w = window.__pengu.world;
  w.player.reset(w.spawn.x, w.spawn.y);
  w.player.stamina = 0;
});
await p.waitForTimeout(700);
const rested = await snap();
ok('yerde doluyor', rested.stamina > 1.5, `${rested.stamina} / ${rested.staminaMax}`);

/* ------------------------ 8 · ordinary walls are still not climbable */
console.log('\n8) Sahanlık bölümlerinde tutunma yok');
await start(30);
const shelfGrip = await p.evaluate(async () => {
  const w = window.__pengu.world;
  const grippable = w.terrain.filter((t) => t.climb).length;
  // Press into every rock face in the level and see if anything grips.
  const pl = w.player;
  let gripped = false;
  for (const t of w.terrain.slice(0, 14)) {
    pl.x = t.x - pl.w - 2;
    pl.y = t.y + Math.min(30, t.h * 0.4);
    pl.vy = 0;
    pl.onGround = false;
    window.__ctl.hold('right', true);
    await new Promise((r) => setTimeout(r, 90));
    if (pl.clinging) gripped = true;
  }
  window.__ctl.release();
  return { grippable, gripped, axis: w.axis };
});
ok('sahanlıkta tırmanılabilir yüzey yok', shelfGrip.grippable === 0, `${shelfGrip.grippable} yüzey`);
ok('kayaya tutunulamıyor', !shelfGrip.gripped);
ok('bölüm 30 hâlâ yatay', shelfGrip.axis === 'across');

/* --------------------------- 9 · a whole climb is proven elsewhere */
// Driving a full ascent from inside the browser needs a climbing AI, and a bad
// one reports fair levels as impossible — which is worse than no test at all.
// `tests/climb-run.mjs` proves passability properly: it runs the same Player
// class against the same level data and *searches* for an input sequence for
// every step of every shipped route. What is checked here is that the level
// still runs, which the browser is the only place that can answer.
console.log('\n9) Bölüm gerçekten oynanıyor');
await start(38);
await p.evaluate(() => {
  window.__ctl.hold('right', true);
  window.__ctl.press('jump');
});
await p.waitForTimeout(1200);
await p.evaluate(() => window.__ctl.release());
const alive = await snap();
ok('dünya adım atıyor', alive.status === 'playing' || alive.status === 'dying', alive.status);
ok('tırmanış metresi sayılıyor', typeof alive.metres === 'number', `${alive.metres} m`);

/* ------------------------------------------------ 10 · no explosions */
console.log('\n10) Konsol');
await start(38);
await p.evaluate(() => {
  window.__ctl.hold('right', true);
  window.__ctl.hold('jump', true);
});
await p.waitForTimeout(2500);
await p.evaluate(() => window.__ctl.release());
ok('hata yok', errors.length === 0, errors.slice(0, 3).join(' | '));

await b.close();
console.log(fails.length ? `\n✗ ${fails.length} başarısız: ${fails.join(', ')}` : '\n✓ tırmanma mekaniği çalışıyor');
process.exit(fails.length ? 1 : 0);
