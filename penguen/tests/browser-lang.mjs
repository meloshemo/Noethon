/**
 * Two languages, in a real browser.
 *
 * A translation layer that is only checked by reading the dictionary is a
 * translation layer that quietly stops covering half the screen. So this drives
 * the actual game: it switches language from the settings screen and then walks
 * every screen looking for anything still in the other language.
 *
 * The check that matters most is the last one. A key with no entry falls back
 * rather than throwing, so a missed string does not break anything — it just
 * sits there in Turkish on an English screen until somebody notices. This
 * notices.
 */

import { launch, openGame, checklist } from './browser-kit.mjs';

const b = await launch();
const { page: p, errors } = await openGame(b, { width: 1100, height: 800 });
const { ok, finish } = checklist();

/** Letters that only ever appear in Turkish words. */
const TURKISH = /[çğıöşüÇĞİÖŞÜ]/;

const screens = ['title', 'levels', 'howto', 'shop', 'skins', 'board', 'settings', 'profile'];

/** Everything a player can read on one screen, as one string. */
async function textOf(name) {
  return p.evaluate((which) => {
    const ui = window.__pengu.ui;
    if (which === 'levels') ui.buildLevelGrid();
    if (which === 'shop') ui.buildShop();
    if (which === 'skins') ui.buildSkins('skins');
    if (which === 'board') ui.buildBoard();
    if (which === 'profile') ui.buildProfile();
    ui.showScreen(which);
    const el = document.querySelector(`.screen[data-name="${which}"]`);
    return el ? el.innerText.replace(/\s+/g, ' ').trim() : '';
  }, name);
}

const lang = () => p.evaluate(() => document.documentElement.lang);

console.log('\nDil — gerçek tarayıcıda\n');

/* 1 ------------------------------------------------------------------ */
console.log('1) Başlangıç Türkçe');
{
  ok('sayfa dili tr', (await lang()) === 'tr', await lang());
  const title = await textOf('title');
  ok('başlık ekranı Türkçe', TURKISH.test(title), title.slice(0, 60));
}

/* 2 ------------------------------------------------------------------ */
console.log('\n2) İngilizceye geçiş');
{
  await p.evaluate(() => {
    window.__pengu.ui.showScreen('settings');
    document.querySelector('.lang[data-lang="en"]').click();
  });
  await p.waitForTimeout(200);
  ok('sayfa dili en', (await lang()) === 'en', await lang());
  ok('seçim kaydedildi', (await p.evaluate(() => window.__pengu.save.settings.lang)) === 'en');
  ok(
    'düğme işaretlendi',
    await p.evaluate(() => document.querySelector('.lang[data-lang="en"]').classList.contains('is-on')),
  );
}

/* 3 ------------------------------------------------------------------ */
console.log('\n3) Her ekran İngilizce');
for (const name of screens) {
  const text = await textOf(name);
  const leaked = (text.match(/[^\s]*[çğıöşüÇĞİÖŞÜ][^\s]*/g) ?? []).filter(
    // The player's own name is whatever they typed, and the test harness types
    // a Turkish one. It is data, not interface.
    // The player's name is data, and the language picker deliberately says
    // "Türkçe" in Turkish so somebody stranded in the wrong language can find
    // the way back.
    (w) => !w.includes('Testçi') && w !== 'Türkçe',
  );
  ok(`${name} ekranında Türkçe kalmadı`, leaked.length === 0, leaked.slice(0, 4).join(' · '));
}

/* 4 ------------------------------------------------------------------ */
console.log('\n4) Oyun içi metinler');
{
  await p.evaluate(() => window.__pengu.startLevel(15));
  await p.waitForTimeout(600);
  const hud = await p.evaluate(() => document.getElementById('hud').innerText.replace(/\s+/g, ' '));
  ok('HUD İngilizce', !TURKISH.test(hud), hud.slice(0, 60));
  const legend = await p.evaluate(() => {
    window.__pengu.ui.showScreen('howto');
    return document.getElementById('iceLegend').innerText.replace(/\s+/g, ' ');
  });
  ok('buz sözlüğü İngilizce', !TURKISH.test(legend), legend.slice(0, 70));
}

/* 5 ------------------------------------------------------------------ */
console.log('\n5) Geri dönüş');
{
  await p.evaluate(() => {
    window.__pengu.ui.showScreen('settings');
    document.querySelector('.lang[data-lang="tr"]').click();
  });
  await p.waitForTimeout(200);
  ok('tekrar tr', (await lang()) === 'tr', await lang());
  const title = await textOf('title');
  ok('başlık yeniden Türkçe', TURKISH.test(title), title.slice(0, 60));
}

/* 6 ------------------------------------------------------------------ */
console.log('\n6) Seçim kalıcı');
{
  await p.evaluate(() => {
    window.__pengu.ui.showScreen('settings');
    document.querySelector('.lang[data-lang="en"]').click();
    window.__pengu.saveSession?.();
  });
  await p.waitForTimeout(200);
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => Boolean(window.__pengu), null, { timeout: 15000 });
  await p.waitForTimeout(400);
  ok('yeniden açılışta en', (await lang()) === 'en', await lang());
}

ok('konsol temiz', errors.length === 0, errors.slice(0, 3).join(' | '));

const code = finish('iki dil de eksiksiz');
await b.close();
process.exit(code);
