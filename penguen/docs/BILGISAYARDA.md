# Bilgisayarda yapılacaklar

Bu dosya, **uzaktaki oturumun yapamadığı** işlerin listesi. Her biri için ne
yapıldı, sana ne kaldı ve nasıl yapılacağı yazıyor. Sıra önemli: 1 ve 2 on
dakika sürüyor ve gerisinin çoğunu açıyor.

Kod tarafında hazırlanabilecek her şey hazırlandı — komutlar, CI dosyaları,
servis çalışanı, test koşucusu. Aşağıdakiler yalnızca **senin hesabında,
senin cihazında ya da senin kararınla** olabilecek şeyler.

---

## 0. Önce: her şeyin çalıştığını gör (5 dk)

```bash
git clone https://github.com/meloshemo/Noethon.git
cd Noethon/penguen
git checkout claude/penguen-game-dev-6ym6pg

node tools/test.mjs --no-browser     # hiçbir kurulum gerektirmez, ~7 sn
npm start                            # http://localhost:8123
```

`npm start` bağımlılık istemiyor — sunucu da bu depoda, tek dosya
(`tools/serve.mjs`). Python ya da başka bir şey kurmana gerek yok.

Tarayıcı testlerini de koşmak istersen (bir kere ~200 MB Chromium indirir):

```bash
npm install
npm run setup:browser
npm test                             # her şey: lint + node + paket + tarayıcı
```

---

## 1. GitHub Pages'i aç — `meloshemo/cld` (2 dk)

**Neden bu sende kaldı:** repo ayarlarını API'den değil, ancak sen açabilirsin.

1. https://github.com/meloshemo/cld/settings/pages
2. **Source** → `GitHub Actions` seç. (Deploy from a branch **değil**.)
3. Kaydet. Actions sekmesinde `Deploy to GitHub Pages` kendiliğinden çalışır.
4. Bittiğinde adres: `https://meloshemo.github.io/cld/`

Workflow dosyası zaten depoda: `.github/workflows/deploy.yml`. Testler
geçmeden yayına almaz.

**Kontrol:** adres açılıyorsa ve 76 bölüm görünüyorsa tamam. Açılmıyorsa
Actions sekmesindeki son çalışmanın kırmızı adımına bak.

---

## 2. CI'yı gör (1 dk)

Her `git push`'ta iki iş çalışıyor:

| İş | Ne yapıyor | Süre |
|---|---|---|
| **Bölümler ve kurallar** | lint + 10 node testi + paketleme | ~15 sn |
| **Mekanikler** | Chromium indirip 3 tarayıcı testi | ~2 dk |

- Noethon deposunda: `.github/workflows/pengu-ci.yml`
- cld deposunda: `.github/workflows/ci.yml`

**Sende kalan (isteğe bağlı, 1 dk):** `main` dalını koru.
Settings → Branches → Add rule → `main` → *Require status checks to pass* →
`Bölümler ve kurallar` seç. Böylece testi düşüren bir değişiklik main'e
giremiyor.

---

## 3. Dalı birleştir (senin kararın)

Şu an bütün iş `claude/penguen-game-dev-6ym6pg` dalında. **Pull request
açılmadı** — açmamı istemedin.

İstersen:

```bash
gh pr create --base main --head claude/penguen-game-dev-6ym6pg \
  --title "Pengu: 76 bölüm, dört chapter" --fill
```

ya da doğrudan:

```bash
git checkout main && git merge claude/penguen-game-dev-6ym6pg && git push
```

---

## 4. Gerçek cihazda oyna (30 dk — bunu atlama)

Testler mekaniği kanıtlıyor, **hissi** kanıtlamıyor. Otomatik testin
göremediği tek şey bu.

Telefonu bilgisayarla aynı ağa bağla, sonra:

```bash
npm start
# telefonda: http://<bilgisayarının-yerel-ip'si>:8123
```

Yerel IP: macOS/Linux `ipconfig getifaddr en0` ya da `hostname -I`,
Windows `ipconfig`.

Bakılacaklar, sırayla:

- [ ] **Dikey ve yatay** — telefonu çevir, oyun kesilmesin
- [ ] **Dokunmatik butonlar** — başparmak nereye düşüyor, çok küçük mü
- [ ] **Bölüm 32–46 (tırmanış)** — duvara tutunmak parmakla nasıl
- [ ] **Bölüm 47–61 (dalış)** — basılı tutmak yorucu mu
- [ ] **Bölüm 62–76 (kar topu)** — noktalı hat küçük ekranda okunuyor mu
- [ ] **Sekmeyi kapatıp aç** — kaldığın yer geri geliyor mu
- [ ] **Uçak moduna al** — bir kere online açtıysan offline çalışmalı (§5)
- [ ] **Oyun kolu** — varsa bağla, USB/Bluetooth

Bir şey kötü hissettiriyorsa not al ve söyle; ayar değerlerinin hepsi
`src/game/config.js` içinde tek yerde.

---

## 5. Offline çalışıyor mu (2 dk)

Yeni eklendi: `sw.js`. İlk açılış **online** olmalı, sonrası offline.

1. `npm start` ile aç, bir bölüm oyna
2. DevTools → Application → Service Workers → `pengu-v1` görünmeli
3. Network sekmesinde **Offline** işaretle, sayfayı yenile
4. Oyun açılmalı

Açılmıyorsa: `file://` üzerinden bakıyor olabilirsin (servis çalışanı orada
çalışmaz) ya da tek dosya sürümüne (`dist/pengu.html` kasten kaydetmiyor).

---

## 6. Tek dosya sürümü (1 dk)

```bash
npm run build          # → dist/pengu.html, ~590 KB
```

Sunucu istemez, `file://` ile bile açılır, e-postayla gönderilebilir.
WhatsApp'tan birine oyunu göndermek istersen bu dosya.

---

## 7. Kendi alan adın (isteğe bağlı, 10 dk + DNS beklemesi)

Ana depoda zaten bir `CNAME` var. Oyuna ayrı bir adres istersen:

1. Alan adı sağlayıcında `CNAME` kaydı: `oyun` → `meloshemo.github.io`
2. cld deposu → Settings → Pages → Custom domain → `oyun.alanadın.com`
3. *Enforce HTTPS* işaretle (sertifika 15–60 dk sürebilir)

---

## 8. Yapılmayanlar — ve neden

Bunlar teknik olarak eksik değil; **hesap, anahtar ve para** gerektiriyor.
Uzaktaki bir oturumun bunları yapması mümkün değil ve senin adına hesap
açması da doğru olmaz.

### Gerçek para ile satın alma
Oyun içi market tamamen yerel: balık topluyorsun, harcıyorsun, hepsi
`localStorage`'da. Gerçek para almak için gereken üç şey:

1. **Sunucu** — makbuzu doğrulayacak bir uç nokta (Stripe Checkout + webhook
   en hızlısı). Sunucusuz doğrulama yapılamaz; tarayıcıdaki her şey
   değiştirilebilir.
2. **Hesap** — Stripe hesabı, vergi bilgisi, banka hesabı.
3. **Kimlik** — kimin ne aldığını bilmek için giriş sistemi. Şu an oyunun
   kullanıcı kavramı yok.

**Tavsiyem:** şimdilik yapma. Oyun ücretsiz ve tek seferlik; oynayan sayısı
üç haneyi geçmeden ödeme altyapısı kurmak, kurulum ve bakım masrafı olarak
geri döner. İstersen "bir kahve ısmarla" bağlantısı (Ko-fi / Buy Me a
Coffee) beş dakikada eklenir ve hiçbir altyapı gerektirmez.

### Ödüllü reklam
Aynı sebep: bir reklam SDK'sı (AdMob, Unity Ads) uygulama kimliği istiyor ve
web için ödüllü reklam desteği zayıf. Web'de karşılığı Google AdSense ve o da
"ödüllü" değil. **Tavsiyem:** eklemeyelim; oyunun ritmini bozar.

### Uygulama mağazası (App Store / Google Play)
Mümkün: Capacitor ile bu oyun bir hafta içinde paketlenir. Gerekenler:

- Apple Developer hesabı ($99/yıl), Google Play ($25 tek seferlik)
- Mac (iOS derlemesi için zorunlu)
- İkon setleri, ekran görüntüleri, gizlilik politikası metni

**Tavsiyem:** önce web sürümünü paylaş, oynayan olursa mağazayı düşün.

### Gerçek zamanlı çok oyunculu kar topu
Sen "online kar topu savaşı" demiştin; Bölüm IV yerel yapay zekâ rakiplerle
yapıldı ve bunu baştan söyledim. Gerçek online için gerekenler: WebSocket
sunucusu, eşleştirme, gecikme telafisi (rollback), hile koruması. Bu, oyunun
geri kalanı kadar iş demek. Hayalet yarışı (`ghost.js`) zaten paylaşım koduyla
asenkron bir "başkasına karşı oynama" veriyor — çoğu oyuncu için farkı bu.

---

## 9. Elindeki komutlar

```bash
npm start              # sunucu → http://localhost:8123
npm test               # hepsi (tarayıcı dahil)
npm run test:node      # kurulumsuz, ~7 sn
npm run test:browser   # sadece tarayıcı testleri
npm run lint           # proje kuralları
npm run build          # dist/pengu.html
npm run setup:browser  # Chromium indir (bir kere)
```

Tek bir testi ayrı koşmak:

```bash
node tests/climb-run.mjs --list        # geçen tırmanışları yaz
node tests/climb-run.mjs --trace=44,9  # bir adımı kare kare izle
node tests/dive-run.mjs --trace=52
node tests/brawl-run.mjs --trace=67
```
