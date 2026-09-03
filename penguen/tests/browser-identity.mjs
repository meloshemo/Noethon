/**
 * Who is playing, in a real browser.
 *
 * The game creates a player the moment somebody opens it, and the promise made
 * on that screen — *this stays on your device* — is the one claim in the whole
 * project that would be genuinely bad to get wrong. So this suite checks the
 * promise as literally as it can: the introduction appears once, the name is
 * cleaned before it is stored anywhere, the id never moves, and nothing in the
 * page reaches for the network.
 */

import { launch, openGame, checklist } from './browser-kit.mjs';

const b = await launch();
const { page: p, errors } = await openGame(b, { width: 1000, height: 700, fresh: true });
const { ok, finish } = checklist();

const screen = () => p.evaluate(() => document.getElementById('overlay').dataset.screen);
const save = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__pengu.save)));

console.log('\nKimlik — gerçek tarayıcıda\n');

/* 1 ------------------------------------------------------------------ */
console.log('1) İlk açılış');
{
  ok('kimlik ekranı açılıyor', (await screen()) === 'identity', await screen());
  const filled = await p.inputValue('#idName');
  ok('alan hazır dolu', filled.length >= 2, `"${filled}"`);
  const s = await save();
  ok('kimlik numarası verilmiş', /^PNG-[0-9A-Z]{5}$/.test(s.profile.id), s.profile.id);
  ok('başlangıç tarihi gerçek', new Date(s.profile.created).getFullYear() > 2020);
  ok('henüz tanışılmamış', s.profile.greeted === false);
}

/* 2 ------------------------------------------------------------------ */
console.log('\n2) Ad doğrulama');
{
  await p.fill('#idName', 'a');
  await p.click('#idSave');
  await p.waitForTimeout(120);
  ok('çok kısa ad reddediliyor', (await screen()) === 'identity');
  ok('sebebi yazıyor', (await p.textContent('#idHint')).includes('En az'), await p.textContent('#idHint'));
  ok('kaydedilmedi', (await save()).name === '');

  // No dice button any more: the field arrives filled in, so "skip" and
  // "accept" are the same press. Reopening has to keep giving a usable name.
  await p.evaluate(() => {
    window.__pengu.save.name = '';
    window.__pengu.ui.openIdentity();
  });
  const offered = await p.inputValue('#idName');
  ok('alan hazır bir adla geliyor', offered.length >= 4, offered);
}

/* 3 ------------------------------------------------------------------ */
console.log('\n3) Ad temizleniyor');
{
  // Angle brackets, a script tag's worth of punctuation, and a right-to-left
  // override — the invisible character that makes a name render backwards.
  await p.fill('#idName', '<img src=x> ‮kötü‬   ad');
  await p.click('#idSave');
  await p.waitForTimeout(200);
  const s = await save();
  ok('tehlikeli karakterler silindi', !/[<>&"'`\\]/.test(s.name), JSON.stringify(s.name));
  ok('görünmez yön işaretleri silindi', !/[‪-‮⁦-⁩]/.test(s.name));
  ok('boşluklar toplandı', !/\s{2,}/.test(s.name), JSON.stringify(s.name));
  ok('uzunluk sınırı', s.name.length <= 14, `${s.name.length} karakter`);
  ok('ad DOM'.replace('DOM', "DOM'a metin olarak yazıldı"), await p.evaluate(() => document.getElementById('whoName').children.length === 0));
}

/* 4 ------------------------------------------------------------------ */
console.log('\n4) Kayıt ve karşılama');
{
  await p.evaluate(() => window.__pengu.ui.openIdentity());
  await p.fill('#idName', 'Buzkanat');
  await p.click('#idSave');
  await p.waitForTimeout(250);
  const s = await save();
  ok('başlığa dönüldü', (await screen()) === 'title', await screen());
  ok('ad kaydedildi', s.name === 'Buzkanat', s.name);
  ok('tanışıldı işareti', s.profile.greeted === true);
  ok('kartta görünüyor', (await p.textContent('#whoName')) === 'Buzkanat');
  ok('kimlik kartta yazıyor', (await p.textContent('#whoId')) === s.profile.id);
}

/* 5 ------------------------------------------------------------------ */
console.log('\n5) Kimlik ekranı');
{
  const before = (await save()).profile.id;
  await p.click('#whoChip');
  await p.waitForTimeout(200);
  ok('profil açılıyor', (await screen()) === 'profile', await screen());
  ok('unvan var', (await p.textContent('#profTitle')).includes('·'), await p.textContent('#profTitle'));
  ok('ilerleme var', (await p.textContent('#profLevels')).includes('/'), await p.textContent('#profLevels'));

  await p.fill('#profNameInput', 'Karayak');
  await p.click('#profSave');
  await p.waitForTimeout(200);
  const s = await save();
  ok('ad değiştirilebiliyor', s.name === 'Karayak', s.name);
  ok('kimlik numarası değişmiyor', s.profile.id === before, `${before} → ${s.profile.id}`);
}

/* 6 ------------------------------------------------------------------ */
console.log('\n6) Yasal ekran');
{
  await p.click('#profLegal');
  await p.waitForTimeout(200);
  ok('yasal ekran açılıyor', (await screen()) === 'legal', await screen());
  const blocks = await p.evaluate(() =>
    [...document.querySelectorAll('.legal__block summary')].map((s) => s.textContent.trim()),
  );
  ok('bütün başlıklar var', blocks.length >= 5, blocks.join(' · '));
  const text = await p.textContent('.legal');
  for (const word of ['localStorage', 'KVKK', 'Çocuklar', 'hayalet']) {
    ok(`"${word}" geçiyor`, text.includes(word));
  }
}

/* 7 ------------------------------------------------------------------ */
console.log('\n7) Kaydı dışa aktarma');
{
  const download = p.waitForEvent('download', { timeout: 4000 }).catch(() => null);
  await p.click('#legalExport');
  const file = await download;
  ok('dosya iniyor', Boolean(file), file ? file.suggestedFilename() : 'inmedi');
  if (file) {
    ok(
      'adı anlamlı',
      /^pengu-kayit-\d{4}-\d{2}-\d{2}\.json$/.test(file.suggestedFilename()),
      file.suggestedFilename(),
    );
  }

  // Embedded in another page — a viewer, an iframe — downloads are blocked and
  // do not throw. The button has to say something rather than nothing.
  const frameOk = await p.evaluate(async () => {
    const box = document.createElement('iframe');
    box.src = location.href;
    document.body.append(box);
    await new Promise((r) => box.addEventListener('load', r, { once: true }));
    const w = box.contentWindow;
    await new Promise((r) => setTimeout(r, 1200));
    w.__pengu.ui.showScreen('legal');
    w.document.getElementById('legalExport').click();
    const fallback = w.document.getElementById('dataFallback');
    const out = Boolean(fallback && !fallback.hidden && fallback.value.includes('profile'));
    box.remove();
    return out;
  });
  ok('gömülü sayfada metin olarak veriliyor', frameOk);
}

/* 8 ------------------------------------------------------------------ */
console.log('\n8) İkinci açılış');
{
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => Boolean(window.__pengu), null, { timeout: 15000 });
  await p.waitForTimeout(400);
  ok('kimlik ekranı bir daha çıkmıyor', (await screen()) === 'title', await screen());
  const s = await save();
  ok('ad hatırlandı', s.name === 'Karayak', s.name);
  ok('kimlik hatırlandı', /^PNG-/.test(s.profile.id), s.profile.id);
}

/* 9 ------------------------------------------------------------------ */
console.log('\n9) Söz: hiçbir yere gitmiyor');
{
  // Every request the page has made since it loaded, minus its own files.
  const outside = await p.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .filter((u) => !u.startsWith(location.origin)),
  );
  ok('dış istek yok', outside.length === 0, outside.slice(0, 3).join(' | '));
  ok('konsol temiz', errors.length === 0, errors.slice(0, 3).join(' | '));
}

const code = finish('kimlik çalışıyor ve cihazdan çıkmıyor');
await b.close();
process.exit(code);
