/**
 * Store assets, taken from the game rather than drawn for the store.
 *
 *   node tools/store.mjs                 # everything, into store/
 *   node tools/store.mjs --target=play-phone --lang=tr
 *   node tools/store.mjs --drawn       # sadece çizilen görseller
 *   node tools/store.mjs --list
 *
 * A store listing is a set of promises in pictures, and the usual way those
 * promises go stale is that somebody mocks them up once, in a drawing program,
 * and ships the game past them. Every screenshot here is the real game, driven
 * by the same handle the browser tests use, at the exact pixel sizes Google
 * Play and the App Store demand. Change the game and these are one command
 * away from being true again — which is the only way a picture stays honest.
 *
 * The save is seeded first, because a brand new save photographs as an empty
 * grid of locked levels: the collection has nothing in it, the level list says
 * zero stars out of two hundred and twenty-eight, and the shop is a wall of
 * prices nobody can pay. That is a true picture of the first thirty seconds and
 * a false picture of the game. So the shots are taken on a save that looks like
 * somebody has been playing for a week, which is what the pictures are about.
 *
 * Nothing here is invented: the progress is written into the real save shape
 * and the game reads it the way it reads anyone's.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ sizes */

/**
 * The sizes the two stores actually ask for.
 *
 * Both stores check these to the pixel and reject the upload otherwise, so the
 * viewport is chosen with its device scale factor to land exactly on them:
 * 440 × 956 at ×3 is 1320 × 2868, which is the 6.9" iPhone frame Apple wants.
 *
 * `touch` is on for every phone and tablet target, because it is what puts the
 * on-screen controls in the picture. A store screenshot without them would be
 * showing a game the buyer cannot play.
 */
const TARGETS = [
  {
    id: 'play-phone',
    dir: 'play',
    note: 'Google Play — telefon (9:16)',
    width: 360,
    height: 640,
    scale: 3,
    touch: true,
    pixels: [1080, 1920],
  },
  {
    id: 'play-tablet',
    dir: 'play',
    note: 'Google Play — tablet (16:10, yatay)',
    width: 960,
    height: 600,
    scale: 2,
    touch: true,
    pixels: [1920, 1200],
    scenes: ['tirmanis', 'arena', 'bolumler'],
  },
  {
    id: 'iphone-69',
    dir: 'appstore',
    note: 'App Store — 6,9" iPhone',
    width: 440,
    height: 956,
    scale: 3,
    touch: true,
    pixels: [1320, 2868],
  },
  {
    id: 'ipad-13',
    dir: 'appstore',
    note: 'App Store — 13" iPad',
    width: 1032,
    height: 1376,
    scale: 2,
    touch: true,
    pixels: [2064, 2752],
    scenes: ['tirmanis', 'dalis', 'arena'],
  },
];

/* ----------------------------------------------------------------- scenes */

/**
 * What the six pictures are about, in the order a listing should read them.
 *
 * One per chapter, because the four chapters are the answer to "what is this
 * game" — then the level list for how much of it there is, and the collection
 * for what is earned. A seventh picture of a menu would be a seventh picture
 * of a menu.
 */
const SCENES = [
  { id: 'sahanlik', what: 'Buz Sahanlığı — sıçrayış' },
  { id: 'tirmanis', what: 'Zirve — tırmanış' },
  { id: 'dalis', what: 'Buz Altı — nefes' },
  { id: 'arena', what: 'Kar Topu — düello' },
  { id: 'bolumler', what: 'Bölüm listesi — 76 bölüm, 4 chapter' },
  { id: 'koleksiyon', what: 'Koleksiyon — 29 penguen' },
];

const LANGS = ['tr', 'en'];

/* ------------------------------------------------------------------- args */

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const list = (name) => {
  const v = flag(name);
  return v ? v.split(',').map((s) => s.trim()).filter(Boolean) : null;
};

if (args.includes('--list')) {
  console.log('Hedefler:');
  for (const t of TARGETS) {
    console.log(`  ${t.id.padEnd(12)} ${t.pixels.join('×').padEnd(11)} ${t.note}`);
  }
  console.log('\nSahneler:');
  for (const s of SCENES) console.log(`  ${s.id.padEnd(12)} ${s.what}`);
  process.exit(0);
}

/*
 * Outside `assets/`, and that is a deployment decision rather than tidiness.
 *
 * `tools/mirror.mjs` copies a fixed list of paths into the published
 * repository and `store/` is not on it, so none of this reaches the web
 * build. These are twenty-odd megabytes of pictures for two upload forms;
 * every visitor to the game would otherwise be paying for them in the deploy
 * artifact without ever loading one.
 */
const OUT = resolve(root, flag('out', 'store'));
const wantTargets = list('target');
const wantLangs = list('lang') ?? LANGS;
const wantScenes = list('scene');

/* --------------------------------------------------------------- the save */

/**
 * A week of play, written into the real save shape.
 *
 * Stars and times are the shape of somebody who has finished the shelf and is
 * partway up the mountain — which is where the pictures are taken, so the
 * level list in picture five matches the levels in pictures one to four.
 */
function demoSave() {
  const levels = {};
  for (let id = 1; id <= 44; id++) {
    const stars = id <= 31 ? 3 : id <= 40 ? 2 : 1;
    levels[id] = {
      stars,
      bestTime: 18 + ((id * 7) % 40) + (id % 3) * 0.37,
      deaths: 2 + (id % 9),
      fish: id <= 31 ? 3 : 2,
    };
  }
  return {
    unlocked: 45,
    levels,
    coins: 1240,
    name: 'Pengu',
    skin: 'explorer',
    trail: 'sparks',
    skins: {
      normal: true,
      explorer: true,
      diver: true,
      ninja: true,
      frost: true,
      chef: true,
      aurora: true,
      pirate: true,
    },
    trails: { none: true, snow: true, sparks: true, ice: true },
    league: { points: 880, bestTier: 3 },
    daily: { streak: 6, bestStreak: 9 },
  };
}

/* --------------------------------------------------------------- the shot */

/** Hold a control the way the game's own input layer hears it. */
const HOLD = (page, action, on) =>
  page.evaluate(
    ([a, down]) => {
      const i = window.__pengu.input;
      if (down) i._sources.touch.add(a);
      else i._sources.touch.delete(a);
      i._sync();
    },
    [action, on],
  );

const JUMP = (page) => page.evaluate(() => window.__pengu.input._emit('jump'));

/**
 * Put the penguin somewhere worth photographing.
 *
 * Walking him there was the first attempt and it is the wrong tool: holding
 * *right* for a second on a shelf level walks into the water, and a store
 * screenshot of the death flash is a promise of a different kind. So he is
 * placed — on a chosen floe, at a chosen depth — and only the last fraction of
 * a second is played, which is the part that has to look alive.
 */
async function place(page, level, { floe = null, at = null, dx = 0.5, launch = null } = {}) {
  await page.evaluate(
    ([lv, idx, frac, d, up]) => {
      const g = window.__pengu;
      g.startLevel(lv);
      const w = g.world;
      const p = w.player;
      if (idx !== null) {
        const solid = [...w.floes]
          .filter((f) => f.type !== 'snap')
          .sort((a, b) => a.x - b.x);
        const f = solid[Math.min(idx, solid.length - 1)];
        if (f) {
          p.x = f.x + f.w * d - p.w / 2;
          p.y = f.y - p.h - 1;
        }
      } else if (frac !== null) {
        /*
         * Under the ice there is nothing to stand on, so a depth has to be
         * found rather than given. A number picked by hand photographed as an
         * empty sea: it was below the seabed, the swimmer sank out of frame,
         * and the camera — which is clamped to the level — stayed where it
         * was. So the free water is measured: every solid that spans this
         * column, sorted, and the widest gap between them is where a swimmer
         * can actually be.
         */
        const x = (w.goal?.x ?? 3000) * frac;
        const bottom = w.def.worldH ?? 800;
        const spans = w.solids
          .filter((s2) => x + p.w > s2.x && x < s2.x + s2.w)
          .map((s2) => [s2.y, s2.y + s2.h])
          .sort((a, c) => a[0] - c[0]);
        let best = null;
        let cursor = w.waterY ?? -100;
        for (const [top, base] of spans) {
          if (!best || top - cursor > best[1] - best[0]) best = [cursor, top];
          cursor = Math.max(cursor, base);
        }
        if (!best || bottom - cursor > best[1] - best[0]) best = [cursor, bottom];
        p.x = x;
        p.y = (best[0] + best[1]) / 2 - p.h / 2;
      }
      p.vx = 0;
      p.vy = 0;
      /*
       * Launched rather than jumped, and for a reason worth writing down.
       *
       * The first version ran him up to the edge and pressed jump. Whether
       * that clears the gap depends on the run-up, the floe, and the level —
       * and on level twenty it did not, so the picture came out as a splash
       * and a retry counter reading one. Driving the arc directly means the
       * frame is chosen rather than hoped for: this is the same velocity the
       * jump gives him, applied at a point where the gap is underneath him.
       */
      if (up) {
        p.vy = up.vy;
        p.vx = up.vx;
        p.onGround = false;
      }
      w.respawn = { x: p.x, y: p.y };
      w._centerCamera?.();
    },
    [level, floe, at, dx, launch],
  );
  await page.waitForTimeout(launch ? 0 : 220);
}

/** Open a menu screen with the game shut down behind it. */
async function screen(page, name) {
  await page.evaluate((s) => {
    const g = window.__pengu;
    g.quitToMenu();
    if (s === 'levels') g.ui.buildLevelGrid?.();
    if (s === 'skins') g.ui.buildSkinGrid?.();
    g.ui.showScreen(s);
  }, name);
  await page.waitForTimeout(420);
}

/** The six scenes, each left on the frame that gets photographed. */
const COMPOSE = {
  async sahanlik(page) {
    /*
     * Standing on the ice while a killer whale breaches behind him.
     *
     * Three versions of this picture were thrown away before this one. Running
     * him up to the edge and pressing jump put him in the water (whether a
     * given run-up clears a given gap is a question about level twenty), and
     * launching the arc by hand put him in the water a little later. The
     * frame worth having was never the jump anyway: it is the half second
     * before it, with the whale in the air and the gap still to cross.
     *
     * The whale's phase comes from the level id rather than a die roll — see
     * `hazardPhase` — so this frame is the same frame every time.
     */
    await place(page, 20, { floe: 2 });
    await page.waitForTimeout(260);
  },
  async tirmanis(page) {
    await place(page, 40, { floe: 2, dx: 0.55 });
    await page.waitForTimeout(240);
  },
  async dalis(page) {
    // Swimming down and forward, because a penguin who only holds *right*
    // floats up against the ceiling: the lungs are the chapter, and the
    // picture should have water under him as well as ice over him.
    await place(page, 59, { at: 0.45 });
    await HOLD(page, 'right', true);
    await HOLD(page, 'down', true);
    await page.waitForTimeout(520);
    await HOLD(page, 'right', false);
    await HOLD(page, 'down', false);
    await page.waitForTimeout(100);
  },
  async arena(page) {
    await place(page, 70, { floe: 1, dx: 0.5 });
    await HOLD(page, 'right', true);
    await page.waitForTimeout(420);
    await HOLD(page, 'right', false);
    await page.waitForTimeout(200);
  },
  async bolumler(page) {
    await screen(page, 'levels');
  },
  async koleksiyon(page) {
    await screen(page, 'skins');
  },
};

/* -------------------------------------------------------------- the drive */

async function shoot(browser, target, lang, scenes, serverUrl) {
  const ctx = await browser.newContext({
    viewport: { width: target.width, height: target.height },
    deviceScaleFactor: target.scale,
    hasTouch: target.touch,
    isMobile: target.touch,
    locale: lang === 'tr' ? 'tr-TR' : 'en-GB',
    // Yesterday's modules out of a cache would photograph just as well as
    // today's, which is exactly the problem.
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${serverUrl}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.__pengu), null, { timeout: 20000 });
  await page.evaluate(
    ([want, save]) => {
      const g = window.__pengu;
      Object.assign(g.save, save);
      g.save.profile = { ...g.save.profile, id: 'PNG-47182', created: Date.now() - 9e8, greeted: true };
      g.save.settings.lang = want;
      g.ui.applyLang(want);
      g.ui.showScreen('title');
      g.ui.refreshTitle?.();
    },
    [lang, demoSave()],
  );
  await page.waitForTimeout(300);

  const made = [];
  for (const scene of scenes) {
    await COMPOSE[scene](page);
    /*
     * JPEG, and both stores take it.
     *
     * The same frame is 393 KB as Chromium's PNG and 113 KB at quality 92,
     * and this is a flat-colour game with no gradients fine enough to band.
     * Thirty screenshots is the difference between a repository somebody
     * clones and one they wait for.
     */
    const file = `${target.id}-${lang}-${scene}.jpg`;
    const path = resolve(OUT, target.dir, file);
    await page.screenshot({ path, type: 'jpeg', quality: 92 });
    made.push(`${target.dir}/${file}`);
  }
  await ctx.close();
  return { made, errors };
}

/* ------------------------------------------------------- the drawn assets */

/**
 * A PNG with no alpha channel at all, written here because nothing else can.
 *
 * Apple's upload check rejects an app icon that carries an alpha channel, and
 * every route a browser offers — `page.screenshot`, `canvas.toDataURL` — hands
 * back RGBA. So the pixels come out of a canvas as raw bytes, the fourth one
 * of every four is dropped, and this writes the file: one IHDR with colour
 * type 2, one zlib-deflated IDAT of rows each prefixed with filter byte 0, one
 * IEND. It is the smallest legal PNG that says what it means.
 */
function png(width, height, rgba, { alpha = false } = {}) {
  const crcTable = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })();
  const crc = (buf) => {
    let c = -1;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  // Colour type 2 is truecolour; 6 is truecolour with an alpha channel. The
  // two stores want one each, so this writes either.
  ihdr[9] = alpha ? 6 : 2;
  // 10..12 stay zero: deflate, adaptive filtering, no interlace.

  const stride = alpha ? 4 : 3;
  const raw = Buffer.alloc(height * (1 + width * stride));
  let at = 0;
  for (let y = 0; y < height; y++) {
    raw[at++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw[at++] = rgba[i];
      raw[at++] = rgba[i + 1];
      raw[at++] = rgba[i + 2];
      if (alpha) raw[at++] = rgba[i + 3];
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * The pictures that are not screenshots.
 *
 * Drawn from the same two SVGs the site already uses — the social card's
 * artwork and the favicon — so there is one drawing to change rather than
 * four copies to forget about.
 */
async function drawn(browser) {
  const made = [];
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });

  // Play's feature graphic: 1024 × 500, and the listing's banner. JPEG,
  // because Play asks for no transparency and a browser's PNG always carries
  // an alpha channel whether or not anything in it is transparent.
  const card = await readFile(resolve(root, 'store/feature-graphic.svg'), 'utf8');
  const page = await ctx.newPage();
  // One banner per listing language, from one drawing: Play shows the feature
  // graphic per locale, and a Turkish subtitle on the English listing is the
  // same mistake as an English one on the Turkish listing.
  for (const [lang, sub] of [
    ['tr', "ANTARKTİKA'DAN KAÇIŞ"],
    ['en', 'ESCAPE FROM ANTARCTICA'],
  ]) {
    await page.setContent(
      `<!doctype html><meta charset="utf-8">
       <style>html,body{margin:0;padding:0;background:#050d1c}svg{display:block}</style>
       ${card.replace('{{SUB}}', sub)}`,
      { waitUntil: 'load' },
    );
    await page.waitForTimeout(250);
    const file = `play/feature-graphic-${lang}.jpg`;
    await page.screenshot({ path: resolve(OUT, file), type: 'jpeg', quality: 95 });
    made.push(file);
  }
  await page.close();

  /*
   * Both icons, and they want opposite things.
   *
   * Apple rejects an app icon that carries an alpha channel at all. Google
   * asks for a 32-bit PNG, which is to say one that does. The same drawing
   * therefore goes out twice, and the rasteriser hands back raw pixels so
   * either file can be written from them.
   */
  const icon = await readFile(resolve(root, 'assets/favicon.svg'), 'utf8');
  const ip = await ctx.newPage();
  const raster = async (size) => {
    await ip.setViewportSize({ width: size, height: size });
    await ip.setContent(
      `<!doctype html><meta charset="utf-8">
       <style>html,body{margin:0;background:#08132a}canvas{display:block}</style>
       <canvas id="c" width="${size}" height="${size}"></canvas>`,
      { waitUntil: 'load' },
    );
    return ip.evaluate(
      async ([svg, px]) => {
        const img = new Image();
        await new Promise((done, fail) => {
          img.onload = done;
          img.onerror = fail;
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        });
        const g = document.getElementById('c').getContext('2d');
        // Painted on the game's own background rather than left transparent:
        // a home-screen icon with see-through corners picks up whatever the
        // launcher puts behind it.
        g.fillStyle = '#08132a';
        g.fillRect(0, 0, px, px);
        g.drawImage(img, 0, 0, px, px);
        return [...g.getImageData(0, 0, px, px).data];
      },
      [icon, size],
    );
  };

  const big = Uint8Array.from(await raster(1024));
  await writeFile(resolve(OUT, 'appstore/icon-1024.png'), png(1024, 1024, big));
  made.push('appstore/icon-1024.png');

  const small = Uint8Array.from(await raster(512));
  await writeFile(resolve(OUT, 'play/icon-512.png'), png(512, 512, small, { alpha: true }));
  made.push('play/icon-512.png');

  await ctx.close();
  return made;
}

/**
 * And two pictures that are not for a store at all.
 *
 * A manifest may carry `screenshots`, and Chrome uses them for the install
 * prompt: with them the game is offered the way a store offers an app, with a
 * picture of itself; without them it is a line of text and an icon. These are
 * the only two that belong in `assets/`, because they are part of the site —
 * so they are small on purpose, half the resolution of the store set.
 */
async function pwa(browser, serverUrl) {
  const made = [];
  for (const [file, scene, size, factor] of [
    ['assets/screenshot-narrow.jpg', 'sahanlik', { width: 540, height: 960 }, 'narrow'],
    ['assets/screenshot-wide.jpg', 'tirmanis', { width: 1280, height: 720 }, 'wide'],
  ]) {
    const ctx = await browser.newContext({
      viewport: size,
      deviceScaleFactor: 1,
      hasTouch: factor === 'narrow',
      isMobile: factor === 'narrow',
      locale: 'tr-TR',
      serviceWorkers: 'block',
    });
    const page = await ctx.newPage();
    await page.goto(`${serverUrl}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.__pengu), null, { timeout: 20000 });
    await page.evaluate((save) => {
      const g = window.__pengu;
      Object.assign(g.save, save);
      g.save.profile = { ...g.save.profile, id: 'PNG-47182', created: Date.now() - 9e8, greeted: true };
      g.ui.showScreen('title');
    }, demoSave());
    await page.waitForTimeout(250);
    await COMPOSE[scene](page);
    await page.screenshot({ path: resolve(root, file), type: 'jpeg', quality: 88 });
    await ctx.close();
    made.push(file);
  }
  return made;
}

/* -------------------------------------------------------------------- run */

let playwright;
try {
  playwright = await import('playwright');
} catch {
  console.log('Playwright kurulu değil. Kurmak için: npm install && npm run setup:browser');
  process.exit(1);
}

const onlyDrawn = args.includes('--drawn');
const targets = onlyDrawn ? [] : TARGETS.filter((t) => !wantTargets || wantTargets.includes(t.id));
if (!targets.length && !onlyDrawn) {
  console.log('Böyle bir hedef yok. Listesi: node tools/store.mjs --list');
  process.exit(1);
}

const { serveFree } = await import('./serve.mjs');
const server = await serveFree(8131);
const url = `http://localhost:${server.address().port}`;

const browser = await playwright.chromium.launch(
  process.env.PENGU_CHROMIUM ? { executablePath: process.env.PENGU_CHROMIUM } : {},
);

console.log('Mağaza görselleri üretiliyor...\n');
const started = Date.now();
let count = 0;
const problems = [];

for (const dir of new Set([...targets.map((t) => t.dir), 'play', 'appstore'])) {
  await mkdir(resolve(OUT, dir), { recursive: true });
}

for (const target of targets) {
  const scenes = (target.scenes ?? SCENES.map((s) => s.id)).filter(
    (s) => !wantScenes || wantScenes.includes(s),
  );
  if (!scenes.length) continue;
  for (const lang of wantLangs) {
    const { made, errors } = await shoot(browser, target, lang, scenes, url);
    count += made.length;
    for (const f of made) console.log(`  ✓ ${f}`);
    if (errors.length) problems.push(`${target.id}/${lang}: ${errors[0]}`);
  }
}

if (onlyDrawn || (!wantTargets && !wantScenes)) {
  for (const f of await drawn(browser)) {
    console.log(`  ✓ ${f}`);
    count++;
  }
  for (const f of await pwa(browser, url)) {
    console.log(`  ✓ ${f}`);
    count++;
  }
}

await browser.close();
server.close();

const secs = ((Date.now() - started) / 1000).toFixed(1);
if (problems.length) {
  console.log('\nKonsol hataları:');
  for (const p of problems) console.log(`  ✗ ${p}`);
}
console.log(`\n✓ ${count} dosya — ${secs} sn — ${OUT.replace(root + '/', '')}`);
await writeFile(
  resolve(OUT, 'URETILDI.txt'),
  `Bu klasördeki her şey "node tools/store.mjs" ile üretildi.\nSon üretim: ${new Date().toISOString()}\nDosya sayısı: ${count}\n`,
);
