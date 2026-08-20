/**
 * Does the single-file build actually run?
 *
 * Everything else in the browser suite tests the game as it is served: real
 * modules, real stylesheets, a real server. The single-file build is a
 * different program. `tools/bundle.mjs` flattens thirty-two modules into one
 * script by hand, rewriting imports and exports as it goes, and that is exactly
 * the sort of transformation that can produce a perfectly valid file which does
 * nothing.
 *
 * It matters more than the file count suggests, because the single file is what
 * gets handed to people: it is the copy that opens from `file://`, the copy
 * that goes in an email, and the copy behind the published link. A broken
 * bundle with a green test suite is the worst outcome available here.
 *
 * So this opens `dist/pengu.html` over `file://` — no server, the way somebody
 * who was sent the file would open it — and asks for the three things that
 * prove the flattening worked: the game booted, a level composed, and nothing
 * went to the console.
 */

import { chromium } from 'playwright';
import { checklist } from './browser-kit.mjs';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = resolve(root, 'dist/pengu.html');
const { ok, finish } = checklist();

console.log('\nTek dosya sürümü — gerçek tarayıcıda\n');

if (!existsSync(file)) {
  console.log('  · dist/pengu.html yok (npm run build), atlandı');
  process.exit(0);
}

const b = await chromium.launch(
  process.env.PENGU_CHROMIUM ? { executablePath: process.env.PENGU_CHROMIUM } : {},
);
const p = await b.newPage({ viewport: { width: 1100, height: 760 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});

await p.goto(`file://${file}`, { waitUntil: 'domcontentloaded' });

/* 1 ------------------------------------------------------------------ */
console.log('1) Açılış');
{
  let booted = true;
  try {
    await p.waitForFunction(() => Boolean(window.__pengu), null, { timeout: 20000 });
  } catch {
    booted = false;
  }
  ok('oyun sunucusuz açılıyor', booted);
  if (!booted) {
    console.log(errors.slice(0, 3).join('\n'));
    await b.close();
    process.exit(1);
  }
  await p.waitForTimeout(500);
  ok('kayıt kuruldu', await p.evaluate(() => Boolean(window.__pengu.save?.settings)));
  ok(
    'dil seçildi',
    ['tr', 'en'].includes(await p.evaluate(() => document.documentElement.lang)),
    await p.evaluate(() => document.documentElement.lang),
  );
}

/* 2 ------------------------------------------------------------------ */
console.log('\n2) Bölüm besteleniyor');
{
  const world = await p.evaluate(() => {
    window.__pengu.save.unlocked = 999;
    window.__pengu.save.profile.greeted = true;
    window.__pengu.ui.showScreen('title');
    window.__pengu.startLevel(15);
    const w = window.__pengu.world;
    return { id: w?.def?.id, floes: w?.floes?.length ?? 0, wind: w?.def?.windGaps?.length ?? 0 };
  });
  ok('bölüm yükleniyor', world.id === 15, `id ${world.id}`);
  ok('buzlar var', world.floes > 5, `${world.floes} buz`);
  ok('rüzgâr boşluğu bestelendi', world.wind === 1, `${world.wind} tane`);
}

/* 3 ------------------------------------------------------------------ */
console.log('\n3) Simülasyon dönüyor');
{
  const before = await p.evaluate(() => window.__pengu.world.elapsed);
  await p.waitForTimeout(900);
  const after = await p.evaluate(() => window.__pengu.world.elapsed);
  ok('kronometre akıyor', after > before, `${before.toFixed(2)} → ${after.toFixed(2)}`);
}

/* 4 ------------------------------------------------------------------ */
console.log('\n4) Konsol');
ok('hata yok', errors.length === 0, errors.slice(0, 3).join(' | '));

const code = finish('tek dosya sürümü çalışıyor');
await b.close();
process.exit(code);
