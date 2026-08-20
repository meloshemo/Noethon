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

      return {
        docSpill: Math.round(doc.scrollWidth - vw),
        spills: spills.slice(0, 3),
        ragged,
        small: small.length,
        smallest: small.slice(0, 2).map((m) => `${m.el}:${Math.round(m.w)}×${Math.round(m.h)}`),
      };
    });

    ok(`${human}: yatay taşma yok`, report.docSpill <= 1 && !report.spills.length,
      report.spills.join(' | ') || (report.docSpill > 1 ? `${report.docSpill}px` : ''));
    if (name === 'shop' || name === 'skins') {
      ok(`${human}: kart düğmeleri hizalı`, report.ragged === 0, `${report.ragged} sıra kaçık`);
    }
    ok(
      `${human}: dokunulacak kadar büyük`,
      report.small === 0,
      report.smallest.join(' | ') || `${report.small} küçük düğme`,
    );
  }

  ok(`${label}: konsol temiz`, errors.length === 0, errors.slice(0, 2).join(' | '));
  await p.context().close();
}

const code = finish('arayüz üç boyutta da düzgün');
await b.close();
process.exit(code);
