/**
 * The store assets, measured rather than eyeballed.
 *
 * Both stores reject an upload whose pixels are off by one, and they do it
 * after the forms are filled in, at the end of an afternoon. Worse, neither of
 * them says "this is 1079 wide": the message is a generic complaint about the
 * image, and the natural next move is to blame the picture rather than the
 * number.
 *
 * So the numbers live here. Every file `tools/store.mjs` writes is opened and
 * its real dimensions are read out of the file header — PNG says so in the
 * first chunk, JPEG in whichever frame marker comes first — and checked
 * against what the store asks for.
 *
 * The other half is the manifest. `screenshots` there is a promise of the same
 * kind: Chrome reads the declared `sizes` and quietly ignores an entry whose
 * image does not match, which means the install prompt silently loses its
 * pictures and nothing anywhere says why.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails++;
}

/* ------------------------------------------------------------ the headers */

/** A PNG says its size in the IHDR chunk, which is always first. */
function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), colour: buf[25] };
}

/**
 * A JPEG says its size in a frame header, and a file can carry several
 * markers before it, so the segments are walked rather than guessed at.
 */
function jpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let at = 2;
  while (at < buf.length - 9) {
    if (buf[at] !== 0xff) {
      at++;
      continue;
    }
    const marker = buf[at + 1];
    // SOF0..SOF15, minus the four that are not frame headers.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { h: buf.readUInt16BE(at + 5), w: buf.readUInt16BE(at + 7) };
    }
    at += 2 + buf.readUInt16BE(at + 2);
  }
  return null;
}

async function sizeOf(path) {
  const buf = await readFile(path);
  const size = path.endsWith('.png') ? pngSize(buf) : jpegSize(buf);
  return size ? { ...size, bytes: buf.length } : null;
}

console.log('Mağaza görselleri — gerçek boyutlarıyla\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) Ekran görüntüleri istenen piksele oturuyor');

/** What each file name prefix is allowed to be, to the pixel. */
const RULES = [
  { prefix: 'play/play-phone-', w: 1080, h: 1920, least: 2 },
  { prefix: 'play/play-tablet-', w: 1920, h: 1200, least: 2 },
  { prefix: 'appstore/iphone-69-', w: 1320, h: 2868, least: 3 },
  { prefix: 'appstore/ipad-13-', w: 2064, h: 2752, least: 3 },
];

const storeDir = resolve(root, 'store');
let present = true;
try {
  await stat(storeDir);
} catch {
  present = false;
}

if (!present) {
  /*
   * Skipped rather than failed, and the distinction is the whole point.
   *
   * `tools/mirror.mjs` does not copy `store/` into the published repository,
   * because those files are inputs to two upload forms and have no business
   * in a web deploy. So the published repository runs this pack without them
   * and must not go red for it; what it *can* still check — the manifest's
   * screenshots, which are part of the site — runs below either way.
   */
  console.log('  · store/ burada yok — bu depo yayın kopyası, görseller geliştirme deposunda');
} else {
  const files = [];
  for (const dir of ['play', 'appstore']) {
    for (const f of await readdir(join(storeDir, dir))) files.push(`${dir}/${f}`);
  }

  for (const rule of RULES) {
    const mine = files.filter((f) => f.startsWith(rule.prefix));
    check(
      `${rule.prefix}* en az ${rule.least} görsel`,
      mine.length >= rule.least,
      `${mine.length} dosya`,
    );
    let bad = null;
    for (const f of mine) {
      const size = await sizeOf(join(storeDir, f));
      if (!size || size.w !== rule.w || size.h !== rule.h) {
        bad = `${f} → ${size ? `${size.w}×${size.h}` : 'okunamadı'}`;
        break;
      }
    }
    check(`${rule.prefix}* ${rule.w}×${rule.h}`, !bad, bad ?? `${mine.length} dosya`);
  }

  /* 2 ------------------------------------------------------------------- */
  console.log('\n2) Simgeler ve öne çıkan görsel');

  const feature = await sizeOf(join(storeDir, 'play/feature-graphic-tr.jpg'));
  check(
    'öne çıkan görsel tam 1024×500',
    feature?.w === 1024 && feature?.h === 500,
    feature ? `${feature.w}×${feature.h}` : 'yok',
  );
  check(
    'öne çıkan görselin İngilizcesi de var',
    Boolean(await sizeOf(join(storeDir, 'play/feature-graphic-en.jpg'))),
  );

  const playIcon = await sizeOf(join(storeDir, 'play/icon-512.png'));
  check(
    'Play simgesi 512×512 PNG',
    playIcon?.w === 512 && playIcon?.h === 512,
    playIcon ? `${playIcon.w}×${playIcon.h}` : 'yok',
  );
  // Play wants the alpha channel; colour type 6 is truecolour *with* it.
  check('Play simgesinde alfa kanalı var', playIcon?.colour === 6, `tip ${playIcon?.colour}`);

  const appIcon = await sizeOf(join(storeDir, 'appstore/icon-1024.png'));
  check(
    'App Store simgesi 1024×1024 PNG',
    appIcon?.w === 1024 && appIcon?.h === 1024,
    appIcon ? `${appIcon.w}×${appIcon.h}` : 'yok',
  );
  /*
   * And the opposite rule, which is the one that costs an afternoon: Apple
   * rejects an icon that has an alpha channel at all, however opaque it is.
   * Colour type 2 is truecolour without one.
   */
  check('App Store simgesinde alfa kanalı yok', appIcon?.colour === 2, `tip ${appIcon?.colour}`);
}

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Manifest ekran görüntüleri gerçekten o boyutta');

const manifest = JSON.parse(await readFile(resolve(root, 'manifest.webmanifest'), 'utf8'));
const shots = manifest.screenshots ?? [];
check('manifest iki ekran görüntüsü veriyor', shots.length >= 2, `${shots.length} tane`);
check(
  'biri dar biri geniş',
  shots.some((s) => s.form_factor === 'narrow') && shots.some((s) => s.form_factor === 'wide'),
);

for (const shot of shots) {
  const size = await sizeOf(resolve(root, shot.src));
  const [w, h] = (shot.sizes ?? '').split('x').map(Number);
  check(
    `${shot.src} ${shot.sizes}`,
    size?.w === w && size?.h === h,
    size ? `${size.w}×${size.h}` : 'dosya yok',
  );
}

/* 4 --------------------------------------------------------------------- */
console.log('\n4) Ve ağırlıkları makul');
// Not a store rule — a repository rule. These are build inputs for two upload
// forms, and the day one of them is a ten megabyte PNG is the day somebody
// waits for a clone that has no reason to be slow.
if (present) {
  let heaviest = { f: null, bytes: 0 };
  for (const dir of ['play', 'appstore']) {
    for (const f of await readdir(join(storeDir, dir))) {
      const { size } = await stat(join(storeDir, dir, f));
      if (size > heaviest.bytes) heaviest = { f: `${dir}/${f}`, bytes: size };
    }
  }
  check(
    'en büyük dosya 1 MB altında',
    heaviest.bytes < 1024 * 1024,
    `${heaviest.f} ${(heaviest.bytes / 1024).toFixed(0)} KB`,
  );
}

/* 5 --------------------------------------------------------------------- */
console.log('\n5) Listeleme metinleri sınırların içinde');

/*
 * Both stores count characters and refuse the field, which is a thing to
 * learn on a Tuesday rather than on the afternoon the forms are being filled
 * in. `docs/MAGAZA.md` writes each limit into its own heading — "(en çok
 * 30)" — and keeps the text itself in the fenced block under it, so the
 * document is the single copy and this is the ruler held against it.
 */
{
  const kit = await readFile(resolve(root, 'docs/MAGAZA.md'), 'utf8');
  const pattern = /^###\s+(.+?)\s+\(en çok (\d+)\)\s*$\n+```\n([\s\S]*?)```/gm;
  const found = [];
  for (const m of kit.matchAll(pattern)) {
    found.push({ name: m[1], limit: Number(m[2]), text: m[3].trimEnd() });
  }
  check('metinler sınırlarıyla birlikte yazılı', found.length >= 10, `${found.length} alan`);
  const over = found.filter((f) => [...f.text].length > f.limit);
  check(
    'hiçbiri sınırı aşmıyor',
    over.length === 0,
    over.map((f) => `${f.name}: ${[...f.text].length}/${f.limit}`).join(' | ') ||
      found.map((f) => `${[...f.text].length}/${f.limit}`).join(' '),
  );
  // An empty block would pass a length check and fail a store form.
  check('hiçbiri boş değil', found.every((f) => f.text.trim().length > 0));
}

/* 6 --------------------------------------------------------------------- */
console.log("\n6) Play'e yüklenecek şey eksiksiz");
/*
 * `tools/play.mjs` hands Play the listing out of `docs/MAGAZA.md` and
 * `store/play/`. Its dry run is the same code path as the real upload, minus
 * the network, so running it here means a missing field or a vanished
 * screenshot is a failed test rather than a half-written listing on a store.
 *
 * It also guards a bug this pack would otherwise have missed entirely: the
 * App Store's fields were once headed exactly like Play's, and the uploader
 * cheerfully picked the App Store's shorter name for the Play listing.
 */
{
  const { spawnSync } = await import('node:child_process');
  const run = spawnSync(process.execPath, [resolve(root, 'tools/play.mjs'), '--dry'], {
    cwd: root,
    encoding: 'utf8',
  });
  const out = `${run.stdout}${run.stderr}`;
  check('kuru koşu geçiyor', run.status === 0, out.trim().split('\n').slice(-1)[0]);
  check(
    "Play'in adı Play'den geliyor",
    out.includes("Pengu: Antarktika'dan Kaçış") && out.includes('Pengu: Escape from Antarctica'),
    out.match(/ad\s+(.*)/)?.[1] ?? '',
  );
  check(
    'iki dilde de altı telefon görseli',
    (out.match(/6 telefon/g) ?? []).length === 2,
  );
}

if (fails) {
  console.log(`\n✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('\n✓ Mağaza görselleri iki mağazanın da istediği ölçülerde.');
