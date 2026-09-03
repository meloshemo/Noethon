/**
 * Does an interrupted run come back where it was left, and only when it can?
 *
 * "Devam et" restores a coordinate that was saved during an earlier run. A
 * coordinate is only meaningful on the level that produced it, and levels
 * change: a floe moves, an opening is widened, a chapter is rebalanced. The
 * same two numbers then name open water.
 *
 * That is not a theoretical worry. It happened, and the shape of it was as bad
 * as this kind of bug gets: opening the game put the penguin in the sky above
 * the level it used to be standing on, it fell, it died, and dying put it back
 * at the same point. Every launch, for ever, with no way out but wiping the
 * save. Nothing in the game noticed, because no rule was broken. The point was
 * a perfectly good point for a level that no longer existed.
 *
 * So a session now carries a fingerprint of the shape it belonged to, and the
 * restored point is checked against the ground underneath it. This drives both
 * paths in a real browser: a session that still fits comes back, and one that
 * does not is thrown away rather than trusted.
 */

import { launch, openGame, checklist } from './browser-kit.mjs';

const b = await launch();
const { page: p } = await openGame(b, { width: 1100, height: 760 });
const { ok, finish } = checklist();

const KEY = 'pengu.save.v1';

/** Rewrite the stored save, then reload into it. */
async function withSave(mutate) {
  await p.evaluate((fn) => {
    // The game writes a session on `pagehide`, so a running game would
    // overwrite the one being planted here on the way out of the page.
    window.__pengu.state = 'menu';
    const raw = JSON.parse(localStorage.getItem(fn.key));
    raw.unlocked = 999;
    raw.name = 'Testçi';
    raw.profile = { ...(raw.profile ?? {}), greeted: true };
    raw.session = fn.session;
    localStorage.setItem(fn.key, JSON.stringify(raw));
  }, mutate);
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => Boolean(window.__pengu), null, { timeout: 15000 });
  await p.waitForTimeout(500);
}

const sub = () => p.textContent('#playSub');

console.log('\nYarım kalan koşu — gerçek tarayıcıda\n');

/* 1 ------------------------------------------------------------------ */
console.log('1) Geçerli bir oturum geri geliyor');
{
  // Play a little of level 15, let it checkpoint, and read back what was saved.
  await p.evaluate(() => {
    window.__pengu.startLevel(15);
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    window.__pengu.world.elapsed = 7.25;
    window.__pengu.saveSession();
  });
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('pengu.save.v1')).session);
  ok('oturum kaydedildi', Boolean(saved), JSON.stringify(saved).slice(0, 80));
  ok('şeklin parmak izi var', typeof saved?.stamp === 'string' && saved.stamp.length > 0, saved?.stamp);

  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => Boolean(window.__pengu), null, { timeout: 15000 });
  await p.waitForTimeout(500);
  ok('başlıkta teklif ediliyor', (await sub()).includes('15'), (await sub()).trim());

  await p.click('#playBtn');
  await p.waitForTimeout(700);
  const st = await p.evaluate(() => ({
    id: window.__pengu.world?.def?.id,
    elapsed: Math.round(window.__pengu.world?.elapsed ?? 0),
    onGround: window.__pengu.world?.player?.onGround,
    status: window.__pengu.world?.status,
  }));
  ok('doğru bölüm açıldı', st.id === 15, `id ${st.id}`);
  ok('süre geri geldi', st.elapsed >= 7, `${st.elapsed} sn`);
  ok('zemine basıyor', st.onGround === true);
  ok('yaşıyor', st.status === 'playing', st.status);
}

/* 2 ------------------------------------------------------------------ */
console.log('\n2) Başka bir şekle ait oturum atılıyor');
{
  // Exactly what an older build would have written: no fingerprint at all, and
  // a point that is now over open water.
  await withSave({
    key: KEY,
    session: { level: 31, daily: false, x: 2100, y: 220, elapsed: 12.5, deaths: 2, fish: 1, at: Date.now() },
  });
  ok('başlıkta teklif edilmiyor', !(await sub()).includes('12.50'), (await sub()).trim());
  ok(
    'kayıttan silindi',
    (await p.evaluate(() => JSON.parse(localStorage.getItem('pengu.save.v1')).session)) === null,
  );
}

/* 3 ------------------------------------------------------------------ */
console.log('\n3) Parmak izi doğru ama nokta boşlukta');
{
  // The level is the shape it says it is, and the point is still wrong. The
  // fallback is the level's own start, not a fall into the sea.
  await p.evaluate(() => {
    window.__pengu.startLevel(31);
  });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const g = window.__pengu;
    g.world.respawn = { x: 2100, y: 220 };
    g.saveSession();
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => Boolean(window.__pengu), null, { timeout: 15000 });
  await p.waitForTimeout(500);
  await p.click('#playBtn');
  await p.waitForTimeout(1600);
  const st = await p.evaluate(() => ({
    status: window.__pengu.world?.status,
    deaths: window.__pengu.world?.deaths ?? 0,
    onGround: window.__pengu.world?.player?.onGround,
  }));
  ok('gökten düşmüyor', st.status === 'playing', st.status);
  ok('ölüm döngüsü yok', st.deaths === 0, `${st.deaths} ölüm`);
  ok('zemine basıyor', st.onGround === true);
}

/* 4 ------------------------------------------------------------------ */
console.log('\n4) Sonsuz mod doğru adlandırılıyor');
{
  await withSave({ key: KEY, session: null });
  await p.evaluate(() => {
    window.__pengu.save.unlocked = 84;
    window.__pengu.ui.refreshTitle();
  });
  const text = (await sub()).trim();
  ok('"Bölüm 84" demiyor', !text.includes('84') || !text.includes('Bölüm'), text);
}

const code = finish('yarım kalan koşu güvenli');
await b.close();
process.exit(code);
