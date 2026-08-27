/**
 * The interface, at the sizes people actually hold.
 *
 * Every bug this file exists to catch was found by taking a screenshot and
 * looking at it, which is a terrible way to find a bug that will come back:
 *
 *   · the title screen's text ran off both edges of a phone, because one
 *     flex item would not shrink below its content;
 *   · the level grid's third column hung twenty pixels past the right edge,
 *     for the same reason, from a header two elements away;
 *   · shop and collection cards put their buttons at three different heights
 *     in one row, because the cards were sized by their text.
 *
 * None of those threw, none of them showed up in any other test, and all three
 * are the kind of thing a player notices in the first ten seconds. So: open
 * every screen at a phone, a landscape phone and a desktop, and assert the
 * things a designer would check by eye.
 */

import { launch, openGame, checklist } from './browser-kit.mjs';

const SIZES = [
  ['telefon', 390, 844],
  ['yatay', 844, 390],
  ['masaüstü', 1280, 800],
];

/** Screens worth checking, and how to get to each one. */
const SCREENS = [
  ['title', 'Ana ekran'],
  ['levels', 'Bölümler'],
  ['shop', 'Market'],
  ['skins', 'Koleksiyon'],
  ['board', 'Sıralama'],
  ['howto', 'Nasıl oynanır'],
  ['settings', 'Ayarlar'],
  ['profile', 'Kimlik'],
  ['legal', 'Yasal'],
  // The five that only appear mid-run, and so were the five nobody checked.
  // The win card is the screen a player sees more than any other except the
  // game itself, and it had grown a rewarded-video offer since this file was
  // written without ever being measured at a phone.
  ['intro', 'Karşılama'],
  ['identity', 'Ad sorma'],
  ['pause', 'Duraklatma'],
  ['assist', 'Yardım teklifi'],
  ['complete', 'Bölüm sonu'],
];

const b = await launch();
const { ok, finish } = checklist();

console.log('\nArayüz düzeni — üç boyutta\n');

for (const [label, width, height] of SIZES) {
  console.log(`${label} (${width}×${height})`);
  const { page: p, errors } = await openGame(b, { width, height });

  // A save with enough in it that every screen has something to draw.
  await p.evaluate(() => {
    const s = window.__pengu.save;
    s.unlocked = 52;
    s.coins = 4200;
    s.upgrades = { boots: 2, speed: 1 };
    s.skins = { gold: true };
    s.skin = 'gold';
    for (let i = 1; i <= 51; i++) {
      s.levels[i] = { stars: (i % 3) + 1, bestTime: 20 + i, deaths: i % 5, fish: 3 };
    }
    s.stats.totalFish = 640;
    window.__pengu.ui.refreshTitle();
  });

  const show = (name) =>
    p.evaluate((n) => {
      const u = window.__pengu.ui;
      ({
        title: () => u.showScreen('title'),
        levels: () => (u.buildLevelGrid(), u.showScreen('levels')),
        shop: () => (u.buildShop(), u.showScreen('shop')),
        skins: () => (u.buildSkins('skins'), u.showScreen('skins')),
        board: () => (u.buildBoard(), u.showScreen('board')),
        howto: () => u.showScreen('howto'),
        settings: () => (u._syncSettings(), u.showScreen('settings')),
        profile: () => (u.buildProfile(), u.showScreen('profile')),
        legal: () => u.showScreen('legal'),
        intro: () => u.showScreen('intro'),
        identity: () => u.showScreen('identity'),
        // Driven through the real code paths rather than posed: a win card
        // built from a made-up result would be a picture of a screen that
        // cannot happen.
        pause: () => {
          window.__pengu.startLevel(3);
          window.__pengu.togglePause();
        },
        assist: () => u.offerAssist(),
        complete: () => {
          window.__pengu.startLevel(3);
          window.__pengu._onWin();
        },
      })[n]();
    }, name);

  for (const [name, human] of SCREENS) {
    await show(name);
    await p.waitForTimeout(120);

    const report = await p.evaluate(() => {
      const doc = document.documentElement;
      const screen = document.querySelector('.screen:not([hidden])');
      const vw = window.innerWidth;

      // Anything sticking out past the edge of the viewport — except what is
      // inside something you can scroll sideways, where sticking out is the
      // whole point. A chapter chip off the right of a chip rail is a rail
      // doing its job; the same chip off the right of the page is a bug.
      const scrollable = (el) => {
        for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
          const ox = getComputedStyle(n).overflowX;
          if (ox === 'auto' || ox === 'scroll') return true;
        }
        return false;
      };
      const spills = [];
      for (const el of screen.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.right <= vw + 1.5 && r.left >= -1.5) continue;
        if (scrollable(el)) continue;
        spills.push(`${el.className || el.tagName}:${Math.round(r.left)}..${Math.round(r.right)}`);
      }

      // Buttons in a row of cards should share a baseline.
      const rows = new Map();
      for (const card of screen.querySelectorAll('.item, .skin')) {
        const action = card.querySelector('.btn, .item__done, .skin__worn');
        if (!action) continue;
        const cardTop = Math.round(card.getBoundingClientRect().top);
        const y = Math.round(action.getBoundingClientRect().bottom);
        const row = rows.get(cardTop) ?? [];
        row.push(y);
        rows.set(cardTop, row);
      }
      const ragged = [...rows.values()]
        .filter((ys) => ys.length > 1)
        .filter((ys) => Math.max(...ys) - Math.min(...ys) > 2).length;

      // Anything too small to hit with a thumb. An inline link is measured by
      // its hit area rather than its text: the visible underline is the size
      // of the words around it, and growing that would push the sentence
      // apart, so the target is grown invisibly instead.
      const small = [...screen.querySelectorAll('button:not([hidden])')]
        .map((el) => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return null;
          const after = getComputedStyle(el, '::after');
          const grow = (v) => Math.max(0, -parseFloat(v || '0'));
          const w = r.width + grow(after.left) + grow(after.right);
          const h = r.height + grow(after.top) + grow(after.bottom);
          return { el: el.className || el.tagName, w, h };
        })
        .filter((m) => m && (m.h < 28 || m.w < 28));

      /*
       * The other direction, which nothing here was looking at.
       *
       * A screen that is too wide announces itself — a chip hangs off the
       * edge and the checks above catch it. A screen that is too *tall* looks
       * perfect and simply cuts the bottom off, and the bottom is where the
       * button is. That is exactly how "Oyna" ended up below the fold on a
       * sideways phone: the logo alone was taking two hundred and seventy of
       * three hundred and ninety pixels.
       *
       * So: whatever this screen's main action is has to be on the screen,
       * unless it is inside something the player can scroll to reach it.
       */
      const stage = document.querySelector('.stage').getBoundingClientRect();
      const scrollableY = (el) => {
        for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
          const st = getComputedStyle(n);
          if ((st.overflowY === 'auto' || st.overflowY === 'scroll')
            && n.scrollHeight > n.clientHeight + 1) return true;
        }
        return false;
      };
      const action = screen.querySelector('.btn--primary:not(:disabled), .btn--xl:not(:disabled)')
        ?? screen.querySelector('.btn:not(:disabled)');
      // On a list — the shop, the level grid — scrolling to the bottom is the
      // design, so a button below the fold there is not a fault. On a card it
      // is: a win card you have to scroll to leave is a win card that does not
      // fit, and the whole point of the card is the button at the end of it.
      const isCard = screen.classList.contains('screen--sheet')
        || screen.classList.contains('screen--title')
        || screen.classList.contains('screen--intro');
      let sunk = '';
      if (action && (isCard || !scrollableY(action))) {
        const r = action.getBoundingClientRect();
        if (r.bottom > stage.bottom + 1 || r.top < stage.top - 1) {
          sunk = `${action.className}:${Math.round(r.top)}..${Math.round(r.bottom)} / ${Math.round(stage.bottom)}`;
        }
      }

      return {
        docSpill: Math.round(doc.scrollWidth - vw),
        spills: spills.slice(0, 3),
        ragged,
        small: small.length,
        smallest: small.slice(0, 2).map((m) => `${m.el}:${Math.round(m.w)}×${Math.round(m.h)}`),
        sunk,
      };
    });

    ok(`${human}: yatay taşma yok`, report.docSpill <= 1 && !report.spills.length,
      report.spills.join(' | ') || (report.docSpill > 1 ? `${report.docSpill}px` : ''));
    if (name === 'shop' || name === 'skins') {
      ok(`${human}: kart düğmeleri hizalı`, report.ragged === 0, `${report.ragged} sıra kaçık`);
    }
    ok(`${human}: ana düğme ekranın içinde`, report.sunk === '', report.sunk);
    ok(
      `${human}: dokunulacak kadar büyük`,
      report.small === 0,
      report.smallest.join(' | ') || `${report.small} küçük düğme`,
    );
  }

  /*
   * The on-screen controls, which had no test at all — and so shipped with a
   * single rule keyed to heights between 460 and 560 pixels, a band that no
   * phone held sideways is in. Every landscape handset fell below the floor of
   * it and got the desktop-sized pads: a hundred and fifteen pixel strip
   * across a three-hundred-and-ninety pixel screen.
   *
   * The first version of this test then measured the wrong thing, and the
   * wrong thing is instructive. It took the height of the `#touch` container
   * as the share of the game the controls were covering, and capped it at a
   * fifth. But that container spans the whole width while the pads sit in its
   * two bottom corners: measured, it was **74% empty in the middle**. So the
   * test was charging the pads for a rectangle of air, the pads were shrunk to
   * stay under the cap, and every landscape phone ended up with 44 to 49 pixel
   * buttons while the real coverage was 3.9% of the screen.
   *
   * A test that measures a proxy will get the proxy optimised. So this one
   * measures what a player actually loses:
   *
   *   1. the area the pads really cover, added up — a fifteenth of the screen;
   *   2. how tall the tallest one is, because a pad can be small in area and
   *      still swallow a corner;
   *   3. that the middle stays clear, which the container metric could never
   *      see and is the thing that actually matters on a wide screen;
   *   4. and the floor, unchanged: below 44 pixels a thumb cannot reliably hit
   *      anything. That one was always right — it was being used as a target
   *      rather than a floor, which is a different mistake.
   */
  /*
   * Made to behave like a touch device rather than having the pads forced
   * visible behind the interface's back.
   *
   * Setting `hidden = false` by hand was what the first version did, and it
   * measured a game that does not exist. The interface re-hides the pads on
   * every screen change when the pointer is not coarse — desktop Chromium is
   * not — so they blinked out again on the next `startLevel`, and the camera,
   * which is told to re-measure at that same moment, recorded a strip zero
   * pixels tall. The pads were on screen and the camera believed they were
   * not, so the test reported the penguin starting underneath controls the
   * real game would have framed him above.
   *
   * `_isTouch` is the one switch the whole behaviour hangs off, so the test
   * flips that and lets the interface do the rest, exactly as a phone does.
   */
  await p.evaluate(() => {
    window.__pengu.ui._isTouch = true;
    window.__pengu.startLevel(3);
  });
  await p.waitForTimeout(160);

  const pads = await p.evaluate(() => {
    const stage = document.querySelector('.stage').getBoundingClientRect();
    const bar = document.getElementById('touch').getBoundingClientRect();
    const each = ['padLeft', 'padRight', 'padJump'].map((id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      return { id, w: Math.round(r.width), h: Math.round(r.height), rect: r.toJSON() };
    });
    const hud = document.querySelector('.hud__bar').getBoundingClientRect();
    const hits = (a, b) =>
      a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    // The pads never overlap each other, so the area they cover is just the
    // sum — no need to work out a union of rectangles that cannot intersect.
    const covered = each.reduce((sum, e) => sum + e.w * e.h, 0);
    const leftEnd = Math.max(
      document.getElementById('padLeft').getBoundingClientRect().right,
      document.getElementById('padRight').getBoundingClientRect().right,
    );
    const jumpStart = document.getElementById('padJump').getBoundingClientRect().left;
    return {
      cover: covered / (stage.width * stage.height),
      tallest: Math.max(...each.map((e) => e.h)) / stage.height,
      gap: (jumpStart - leftEnd) / stage.width,
      share: bar.height / stage.height,
      barH: Math.round(bar.height),
      stageH: Math.round(stage.height),
      smallest: Math.min(...each.map((e) => Math.min(e.w, e.h))),
      tiny: each.filter((e) => Math.min(e.w, e.h) < 44).map((e) => `${e.id}:${e.w}×${e.h}`),
      outside: each
        .filter((e) => e.rect.left < stage.left - 1 || e.rect.right > stage.right + 1
          || e.rect.bottom > stage.bottom + 1)
        .map((e) => e.id),
      onHud: each.filter((e) => hits(e.rect, hud)).map((e) => e.id),
    };
  });

  ok(`${label}: kumandanın gerçek kapladığı yer küçük`, pads.cover <= 0.09,
    `ekranın %${(pads.cover * 100).toFixed(1)}'i`);
  ok(`${label}: en uzun tuş köşeyi yutmuyor`, pads.tallest <= 0.28,
    `yüksekliğin %${(pads.tallest * 100).toFixed(0)}'i`);
  // On a phone held upright the two groups are much closer, because the screen
  // is narrow rather than because the pads grew: the threshold has to clear the
  // tightest case, and that is portrait at about a quarter.
  ok(`${label}: ekranın ortası boş`, pads.gap >= 0.18,
    `iki grup arası genişliğin %${Math.round(pads.gap * 100)}'i`);
  ok(`${label}: her tuş parmak kadar büyük`, pads.tiny.length === 0,
    pads.tiny.join(' | ') || `en küçüğü ${pads.smallest}px`);
  ok(`${label}: tuşlar sahnenin içinde`, pads.outside.length === 0, pads.outside.join(' | '));
  ok(`${label}: tuşlar üst şeritle çakışmıyor`, pads.onHud.length === 0, pads.onHud.join(' | '));

  /*
   * And the penguin has to be somewhere the player can see him, on every one
   * of the seventy-six levels, at the moment the level starts.
   *
   * This was wrong for the whole diving chapter and nobody noticed, because
   * nothing was wrong: no error, no failed test, no misplaced element. The
   * camera had simply run out of level to scroll at the top of a dive and
   * stopped with the penguin twenty-seven pixels down a screen whose first
   * fifty pixels are the level chip. You start the level behind the interface.
   */
  const hidden = await p.evaluate(() => {
    const g = window.__pengu;
    const bar = document.querySelector('.hud__bar').getBoundingClientRect();
    const pads = document.getElementById('touch').getBoundingClientRect();
    const stage = document.querySelector('.stage').getBoundingClientRect();
    const out = [];
    for (let lv = 1; lv <= 76; lv++) {
      g.startLevel(lv);
      const w = g.world;
      const r = g.renderer;
      const x = (w.player.centerX - w.camera.x) * r.viewScale + r.offsetX + stage.left;
      const y = (w.player.y - w.camera.y) * r.viewScale + r.offsetY + stage.top;
      const under = (b) => x > b.left && x < b.right && y > b.top && y < b.bottom;
      if (y < stage.top || y > stage.bottom || under(bar) || under(pads)) {
        out.push(`L${lv}@${Math.round(x)},${Math.round(y)}`);
      }
    }
    return out;
  });
  ok(`${label}: hiçbir bölüm pengu'yu arayüzün altında başlatmıyor`,
    hidden.length === 0, hidden.slice(0, 4).join(' | ') || '76 bölüm');

  ok(`${label}: konsol temiz`, errors.length === 0, errors.slice(0, 2).join(' | '));
  await p.context().close();
}

const code = finish('arayüz üç boyutta da düzgün');
await b.close();
process.exit(code);
