/**
 * Play Console'a yükleme — formu elle doldurmadan.
 *
 *   node tools/play.mjs --dry                    # hiçbir şey göndermeden denetle
 *   node tools/play.mjs --track=internal --aab=out/app-release.aab
 *
 * Google Play has an API for everything a listing is made of, and this uses
 * it: the bundle, the two languages' titles and descriptions, the release
 * notes, the screenshots, the feature graphic. One command instead of an
 * afternoon of copy-paste into forms, and — more to the point — one command
 * that produces the *same* listing every time instead of whatever got pasted
 * that day.
 *
 * It reads from the two places that already hold the truth:
 *
 *   docs/MAGAZA.md   metinler, sınırlarıyla birlikte (tests/store.mjs sayıyor)
 *   store/play/      görseller, mağazanın istediği piksel ölçülerinde
 *
 * so there is no third copy of the listing to drift.
 *
 * **What it cannot do, and nobody can:** create the Play account, pass the
 * identity check, pay the twenty-five dollars, or create the application
 * entry itself. The API edits an application that already exists. Everything
 * after that is here.
 *
 * ## Erişim — şifre değil, servis hesabı
 *
 * Bu araç hiçbir zaman bir Google şifresi görmüyor ve görmemeli. Play'in
 * kendi yolu bir **servis hesabı**: Play Console'un verdiği, yalnızca bu
 * uygulamayı yayınlamaya yetkili, istediğin an iptal edebileceğin bir anahtar.
 *
 *   1. Play Console → Setup → API access → yeni bir servis hesabı oluştur
 *   2. Google Cloud'da o hesaba bir JSON anahtar ürettir
 *   3. Play Console → Users and permissions → servis hesabına bu uygulama
 *      için "Release to testing tracks" ve "Edit store listing" yetkisi ver
 *   4. JSON'un tamamını GitHub'da `PLAY_SERVICE_ACCOUNT_JSON` sırrı olarak
 *      sakla
 *
 * Anahtar GitHub'ın sır kasasında duruyor, iş akışının içinde bir dosyaya
 * yazılıp koşu bitince siliniyor, ve kapsamı tek bir uygulamanın yayını.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback = null) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const DRY = process.argv.includes('--dry');
const AUTH_ONLY = process.argv.includes('--auth');
/*
 * `--next-code`: Play'e sor, bir fazlasını söyle.
 *
 * "This version code has already been used" is the single most common way an
 * upload fails, and it fails *after* the build — the number is baked into the
 * bundle at compile time, so by the time Play complains there is nothing to
 * do but build again. Asking Play first costs one API call and removes the
 * whole class: whatever the highest version code it has ever seen is, the
 * next one is that plus one.
 *
 * Prints the number and nothing else, so a workflow can read it.
 */
const NEXT_CODE = process.argv.includes('--next-code');
const STATUS = process.argv.includes('--status');
const QUIET = NEXT_CODE;
const TRACK = arg('track', 'internal');
const AAB = arg('aab', 'out/app-release.aab');

/* ------------------------------------------------------------- the texts */

/**
 * The listing, read out of the document that already holds it.
 *
 * `docs/MAGAZA.md` writes every field under a heading that carries its store
 * limit — "### Kısa açıklama · TR (en çok 80)" — and `tests/store.mjs` counts
 * them on every push. Reading the same headings here means the thing that is
 * uploaded is the thing that was reviewed, and that a text can only be
 * changed in one place.
 */
async function listing() {
  const whole = await readFile(resolve(root, 'docs/MAGAZA.md'), 'utf8');
  /*
   * Only the Play section, and this is not tidiness.
   *
   * The App Store's fields were once headed the same way — "Uygulama adı ·
   * TR" appeared twice, once per store — and a reader tells them apart by
   * which section they are in while a parser cannot. The dry run uploaded the
   * App Store's shorter name to Play and looked perfectly happy doing it. The
   * headings are distinct now; reading the right section as well costs one
   * line and means a future duplicate cannot do it again.
   */
  const from = whole.indexOf('## 2. Metinler — Google Play');
  const to = whole.indexOf('## 3. Metinler');
  const kit = from >= 0 && to > from ? whole.slice(from, to) : whole;
  const fields = new Map();
  for (const m of kit.matchAll(/^###\s+(.+?)\s+\(en çok (\d+)\)\s*$\n+```\n([\s\S]*?)```/gm)) {
    fields.set(m[1].trim(), { text: m[3].trimEnd(), limit: Number(m[2]) });
  }
  const pick = (name) => {
    const hit = fields.get(name);
    if (!hit) throw new Error(`docs/MAGAZA.md içinde "${name}" yok`);
    if ([...hit.text].length > hit.limit) {
      throw new Error(`"${name}" sınırı aşıyor: ${[...hit.text].length}/${hit.limit}`);
    }
    return hit.text;
  };

  return {
    'tr-TR': {
      title: pick('Uygulama adı · TR'),
      shortDescription: pick('Kısa açıklama · TR'),
      fullDescription: pick('Tam açıklama · TR'),
      releaseNotes: pick('Yeni sürüm notu · TR'),
    },
    'en-US': {
      title: pick('Uygulama adı · EN'),
      shortDescription: pick('Kısa açıklama · EN'),
      fullDescription: pick('Tam açıklama · EN'),
      releaseNotes: pick('Yeni sürüm notu · EN'),
    },
  };
}

/* ------------------------------------------------------------ the images */

/**
 * Which file goes into which slot, by name.
 *
 * Play keeps images per language, and the generator already names them that
 * way: `play-phone-tr-*.jpg` is the Turkish listing's phone set. A file that
 * does not fit a slot is left alone rather than guessed at.
 */
async function images() {
  const dir = resolve(root, 'store/play');
  let files;
  try {
    files = await readdir(dir);
  } catch {
    throw new Error('store/play yok — "node tools/store.mjs" ile üretilir');
  }
  const forLang = (lang) => ({
    phoneScreenshots: files
      .filter((f) => f.startsWith(`play-phone-${lang}-`))
      .sort()
      .map((f) => join(dir, f)),
    sevenInchScreenshots: files
      .filter((f) => f.startsWith(`play-tablet-${lang}-`))
      .sort()
      .map((f) => join(dir, f)),
    featureGraphic: files.includes(`feature-graphic-${lang}.jpg`)
      ? [join(dir, `feature-graphic-${lang}.jpg`)]
      : [],
    icon: files.includes('icon-512.png') ? [join(dir, 'icon-512.png')] : [],
  });
  return { 'tr-TR': forLang('tr'), 'en-US': forLang('en') };
}

/* --------------------------------------------------------------- the run */

const texts = await listing();
const shots = await images();

if (!QUIET) console.log('Play listelemesi hazırlanıyor...\n');
for (const [lang, t] of Object.entries(QUIET ? {} : texts)) {
  console.log(`  ${lang}`);
  console.log(`    ad            ${t.title}`);
  console.log(`    kısa açıklama ${[...t.shortDescription].length} karakter`);
  console.log(`    tam açıklama  ${[...t.fullDescription].length} karakter`);
  const im = shots[lang];
  console.log(
    `    görseller     ${im.phoneScreenshots.length} telefon · ` +
      `${im.sevenInchScreenshots.length} tablet · ` +
      `${im.featureGraphic.length ? 'öne çıkan var' : 'öne çıkan YOK'}`,
  );
  if (im.phoneScreenshots.length < 2) {
    console.log('    ✗ Play en az iki telefon görseli istiyor');
    process.exit(1);
  }
}

let aabBytes = null;
try {
  aabBytes = (await stat(resolve(root, AAB))).size;
  if (!QUIET) console.log(`\n  paket          ${AAB} · ${(aabBytes / 1024 / 1024).toFixed(1)} MB`);
} catch {
  if (!QUIET) console.log(`\n  paket          ${AAB} — yok`);
}

if (DRY) {
  console.log('\n✓ Kuru koşu: metinler ve görseller yüklenmeye hazır.');
  console.log('  Gerçekten göndermek için: PLAY_SERVICE_ACCOUNT_JSON ve --aab=<dosya>');
  process.exit(0);
}

if (!aabBytes && !AUTH_ONLY && !NEXT_CODE && !STATUS) {
  console.log('\n✗ Yüklenecek paket yok. Önce "Android paketi" iş akışını koştur.');
  process.exit(1);
}

const keyJson = process.env.PLAY_SERVICE_ACCOUNT_JSON;
if (!keyJson) {
  console.log('\n✗ PLAY_SERVICE_ACCOUNT_JSON tanımlı değil.');
  console.log('  Nasıl alınacağı bu dosyanın başında yazılı; şifre değil, servis hesabı.');
  process.exit(1);
}

let google;
try {
  ({ google } = await import('googleapis'));
} catch {
  console.log('\n✗ googleapis kurulu değil:  npm install --no-save googleapis');
  process.exit(1);
}

const credentials = JSON.parse(keyJson);
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});
const play = google.androidpublisher({ version: 'v3', auth });

// The application id has one home: the Gradle file the package is built from.
const gradle = await readFile(resolve(root, 'android/app/build.gradle'), 'utf8');
const packageName = gradle.match(/applicationId '([^']*)'/)?.[1];
const versionCode = Number(gradle.match(/versionCode (\d+)/)?.[1]);
if (!packageName || !versionCode) {
  console.log('\n✗ applicationId / versionCode okunamadı — android/app/build.gradle');
  process.exit(1);
}
if (!QUIET) {
  console.log(`\n  uygulama       ${packageName} (versionCode ${versionCode})`);
  console.log(`  kanal          ${TRACK}`);
}

/*
 * The three read-only modes, restored after an edit deleted them.
 *
 * They were lost in the rewrite that split the upload in two — and the way
 * that showed up is worth keeping: the workflow's "ask Play for the version
 * number" step sat there for fifty-four seconds and then failed, because
 * without its branch the script fell through into the upload path and tried
 * to send a bundle that had not been built yet.
 */
if (NEXT_CODE || STATUS || AUTH_ONLY) {
  const { data: edit } = await play.edits.insert({ packageName });
  const editId = edit.id;

  if (NEXT_CODE) {
    // Every bundle Play has ever accepted for this application: a version code
    // is spent for good, whatever happened to the release that used it.
    const { data } = await play.edits.bundles.list({ packageName, editId });
    const seen = (data.bundles ?? []).map((b) => Number(b.versionCode));
    await play.edits.delete({ packageName, editId });
    console.log(String(Math.max(0, ...seen) + 1));
    process.exit(0);
  }

  if (STATUS) {
    const tracks = await play.edits.tracks.list({ packageName, editId });
    const bundles = await play.edits.bundles.list({ packageName, editId });
    console.log(
      `\n  yüklü paketler ${(bundles.data.bundles ?? []).map((b) => b.versionCode).join(', ') || '(yok)'}`,
    );
    for (const t of tracks.data.tracks ?? []) {
      for (const r of t.releases ?? []) {
        console.log(
          `  ${t.track.padEnd(12)} ${r.status} · ${(r.versionCodes ?? []).join(',') || '—'}`,
        );
      }
    }
    for (const lang of ['tr-TR', 'en-US']) {
      try {
        const { data } = await play.edits.listings.get({ packageName, editId, language: lang });
        console.log(`  ${lang.padEnd(12)} ${data.title}`);
      } catch {
        console.log(`  ${lang.padEnd(12)} (henüz yazılmamış)`);
      }
    }
    await play.edits.delete({ packageName, editId });
    console.log('\n✓ Durum okundu. Hiçbir şey değiştirilmedi.');
    process.exit(0);
  }

  // AUTH_ONLY: opening an edit already proves the key is valid, the service
  // account is linked to this developer account and it has rights on this
  // application. Throwing it away changes nothing on the store.
  const tracks = await play.edits.tracks.list({ packageName, editId });
  console.log('  ✓ anahtar geçerli ve bu uygulamaya yetkili');
  console.log(
    `  ✓ kanallar      ${(tracks.data.tracks ?? []).map((t) => t.track).join(', ') || '(henüz yok)'}`,
  );
  await play.edits.delete({ packageName, editId });
  console.log('\n✓ Bağlantı sağlam. Hiçbir şey değiştirilmedi.');
  process.exit(0);
}

/*
 * Two edits rather than one, and the reason is a 403.
 *
 * Play applies nothing until the commit, and it checks permissions *there* —
 * so a single edit holding both a release and a listing fails as a whole with
 * "The caller does not have permission" and says nothing about which of the
 * two the account was missing. An afternoon can go into guessing.
 *
 * Split, each half names itself when it fails: the listing needs *Edit store
 * listing*, the release needs *Release to testing tracks*. And when only one
 * permission is missing, the other half still lands.
 */
async function withEdit(what, body) {
  const { data: edit } = await play.edits.insert({ packageName });
  try {
    await body(edit.id);
    await play.edits.commit({ packageName, editId: edit.id });
    console.log(`  ✓ ${what} — işlendi`);
    return true;
  } catch (e) {
    const code = e?.code ?? e?.response?.status;
    console.log(`  ✗ ${what} — ${code === 403 ? 'izin yok' : e.message}`);
    if (code === 403) {
      console.log(
        `    Play Console → Kullanıcılar ve izinler → servis hesabı → Pengu →\n` +
          `    "${what === 'listeleme' ? 'Mağaza kaydını düzenle' : 'Test kanallarına sürüm yayınla'}" kutusu işaretli olmalı.`,
      );
    }
    try {
      await play.edits.delete({ packageName, editId: edit.id });
    } catch {
      /* already gone */
    }
    return false;
  }
}

const { createReadStream } = await import('node:fs');

/* --- the listing: texts and pictures ---------------------------------- */
const listingOk = await withEdit('listeleme', async (editId) => {
  for (const [language, t] of Object.entries(texts)) {
    await play.edits.listings.update({
      packageName,
      editId,
      language,
      requestBody: {
        language,
        title: t.title,
        shortDescription: t.shortDescription,
        fullDescription: t.fullDescription,
      },
    });
    for (const [imageType, files] of Object.entries(shots[language])) {
      if (!files.length) continue;
      // Replaced rather than added: without this every run would stack another
      // six screenshots onto the listing until Play refused the ninth.
      await play.edits.images.deleteall({ packageName, editId, language, imageType });
      for (const file of files) {
        await play.edits.images.upload({
          packageName,
          editId,
          language,
          imageType,
          media: {
            mimeType: file.endsWith('.png') ? 'image/png' : 'image/jpeg',
            body: createReadStream(file),
          },
        });
      }
    }
    console.log(`    ${language}: metin + ${shots[language].phoneScreenshots.length} telefon görseli`);
  }
});

/* --- the release: the bundle itself ----------------------------------- */
const releaseOk = await withEdit('sürüm', async (editId) => {
  const bundle = await play.edits.bundles.upload({
    packageName,
    editId,
    media: { mimeType: 'application/octet-stream', body: createReadStream(resolve(root, AAB)) },
  });
  const uploaded = bundle.data.versionCode;
  console.log(`    paket yüklendi — versionCode ${uploaded}`);
  await play.edits.tracks.update({
    packageName,
    editId,
    track: TRACK,
    requestBody: {
      track: TRACK,
      releases: [
        {
          versionCodes: [String(uploaded)],
          status: 'draft',
          releaseNotes: Object.entries(texts).map(([language, t]) => ({
            language,
            text: t.releaseNotes,
          })),
        },
      ],
    },
  });
});

if (!listingOk || !releaseOk) {
  console.log('\n✗ Yarım kaldı. Eksik izni verdikten sonra aynı düğmeye tekrar bas.');
  process.exit(1);
}

console.log('\n✓ Gönderildi. Play Console → Release → sürümü incele ve yayına al.');
console.log('  Sürüm "taslak" durumda: hiçbir şey sen onaylamadan yayınlanmıyor.');
process.exit(0);

