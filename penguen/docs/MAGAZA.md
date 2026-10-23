# Mağaza dosyası — Google Play ve App Store

Bu dosya iki mağaza formunu doldurmak için gereken **her şeyi** tek yerde
tutuyor: metinler, görseller, form cevapları ve paketleme adımları.

Metinlerin uzunlukları mağazaların sınırlarıyla birlikte yazılı ve
`tests/store.mjs` her koşuda sayıyor — bir cümle büyüdüğünde form günü değil,
aynı gün öğreniliyor.

Görsellerin hepsi **oyunun kendisinden** alınıyor:

```bash
node tools/store.mjs            # hepsi → store/
node tools/store.mjs --list     # hangi hedefler, hangi sahneler
node tools/store.mjs --drawn    # sadece simgeler ve öne çıkan görsel
```

`store/` klasörü yayına **gitmiyor** (`tools/mirror.mjs` listesinde yok), yani
bu yedi megabayt oyunu açan hiç kimseye indirilmiyor.

---

## 0. Önce bilinmesi gerekenler

| | Play | App Store |
|---|---|---|
| Hesap | Play Console, **tek seferlik 25 $** | Apple Developer, **yılda 99 $** |
| Gereken makine | herhangi biri | **macOS + Xcode** |
| Paketleme | TWA (Bubblewrap) — web sürümünü sarmalar | Capacitor — WKWebView sarmalar |
| En büyük risk | Digital Asset Links (aşağıda, §6) | Apple 4.2 "yeterli işlevsellik" |
| Oyun hazır mı | **evet** | **evet**, ama §6'daki uyarıyı oku |

Oyun zaten web'de yayında ve kurulabilir (PWA): telefonda tarayıcıdan "ana
ekrana ekle" dendiğinde tam ekran, çevrimdışı çalışan bir uygulama oluyor.
Mağazalar bunun üstüne bir dağıtım kanalı; oyunun kendisi için gerekli değil.

---

## 1. Görseller — nerede, ne boyutta

Hepsi `node tools/store.mjs` ile üretiliyor, hepsi `store/` altında.

### Google Play

| Dosya | Boyut | Play'in istediği |
|---|---|---|
| `store/play/icon-512.png` | 512×512 | 32 bit PNG, **alfa kanallı** |
| `store/play/feature-graphic-tr.jpg` | 1024×500 | PNG/JPEG, şeffaflık yok |
| `store/play/feature-graphic-en.jpg` | 1024×500 | aynısı, İngilizce listeleme için |
| `store/play/play-phone-{tr,en}-*.jpg` | 1080×1920 | telefon, en az 2, en çok 8 |
| `store/play/play-tablet-{tr,en}-*.jpg` | 1920×1200 | tablet (isteğe bağlı) |

Telefon görselleri altı sahne: sahanlık, tırmanış, dalış, arena, bölüm listesi,
koleksiyon. Listelemede bu sıra kalsın — ilk iki görsel çoğu kişinin gördüğü
tek şey, ve ilk ikisi oyunun ne olduğunu söylüyor.

### App Store

| Dosya | Boyut | Apple'ın istediği |
|---|---|---|
| `store/appstore/icon-1024.png` | 1024×1024 | PNG, **alfa kanalı olmayacak** |
| `store/appstore/iphone-69-{tr,en}-*.jpg` | 1320×2868 | 6,9" iPhone — zorunlu |
| `store/appstore/ipad-13-{tr,en}-*.jpg` | 2064×2752 | 13" iPad — iPad destekleniyorsa zorunlu |

İki simge iki ayrı kuralı karşılıyor ve bu bilerek: Apple alfa kanalı olan bir
simgeyi reddediyor, Google 32 bitlik (yani alfa kanallı) PNG istiyor.
`tests/store.mjs` ikisini de dosya başlığından okuyup kontrol ediyor.

### Oyunun kendi içindekiler

`assets/screenshot-narrow.jpg` (540×960) ve `assets/screenshot-wide.jpg`
(1280×720) mağazaya değil **manifest'e** ait: Chrome kurulum penceresinde
bunları gösteriyor, yani tarayıcıdan kurulum da bir mağaza listelemesi gibi
görünüyor.

---

## 2. Metinler — Google Play

### Uygulama adı · TR (en çok 30)

```
Pengu: Antarktika'dan Kaçış
```

### Uygulama adı · EN (en çok 30)

```
Pengu: Escape from Antarctica
```

### Kısa açıklama · TR (en çok 80)

```
76 el yapımı bölüm. Her sıçrayış ölçülü, her bölüm bitirilebilir kanıtlı.
```

### Kısa açıklama · EN (en çok 80)

```
76 handmade levels. Every jump measured, every level proven finishable.
```

### Tam açıklama · TR (en çok 4000)

```
Buzlar eriyor. Yeni doğmuş bir penguensin ve kuzeye açılan sala ulaşman
gerek. Ama her buz seni taşımaz.

Pengu dört bölümlük, 76 el yapımı bölümden oluşan bir platform oyunu.
Her bölüm elle tasarlandı, her bölümün geçilebilir olduğu iki ayrı
yöntemle kanıtlandı: bir analitik doğrulayıcı ve oyunun gerçek fiziğini
süren bir çözücü. Yani zor bölümler zor; imkânsız bölüm yok.

DÖRT CHAPTER, DÖRT AYRI OYUN

• Buz Sahanlığı (1-31) — koş, zıpla, buzun ne olduğunu öğren. Çatlayan
  buz, kayan buz, ağırlığınla batan buz, akıntı, katil balina.
• Zirve (32-46) — yukarı. Duvara tutun, tekme at, kol gücün bitmeden
  bir sonraki çıkıntıya ulaş.
• Buz Altı (47-61) — nefesin kadar yolun var. Hava delikleri, deniz
  tabanındaki bacalar, deniz leoparı, akıntı.
• Kar Topu (62-76) — bir oda, atıcılar ve noktalı bir hat. Varmak
  yetmez; doğru yerde durmak gerek.

VE SONRASI BİTMİYOR

76. bölümden sonra sonsuz mod başlıyor: bölüm numarasıyla tohumlanmış,
herkeste aynı, ve derinleştikçe el yapımı bölümlerin ötesine geçiyor.
Günün bölümü her gün herkes için aynı; dört hedef, bir seri.

İNTERNETSİZ, REKLAMSIZ, HESAPSIZ

Oyun bir kere açıldıktan sonra tamamen çevrimdışı çalışıyor. Reklam yok,
satın alma yok, hesap yok, takip yok. Hiçbir veri cihazından çıkmıyor —
oyunun ağ üzerinden konuştuğu tek bir adres bile yok ve bu kaynak kodunda
denetleniyor.

29 penguen ve 10 iz kazanılıyor, satın alınmıyor. Balıkları topla,
rekorları kır, hayaletinle yarış, arkadaşının rekorunu koda çevirip
paylaş.

ERİŞİLEBİLİRLİK

Kolay mod, az hareket seçeneği, tek elle oynanabilen dokunmatik kumanda,
oyun kolu desteği, Türkçe ve İngilizce.

Açık kaynak. Her satırı okunabilir.
```

### Tam açıklama · EN (en çok 4000)

```
The ice is melting. You are a newly hatched penguin and you need to reach
the raft heading north. Not every floe will carry you.

Pengu is a platformer in four chapters and 76 handmade levels. Every
level was designed by hand, and every level is proven finishable two
separate ways: an analytical validator and a solver that drives the
game's real physics. Hard levels are hard. There are no impossible ones.

FOUR CHAPTERS, FOUR DIFFERENT GAMES

• The Ice Shelf (1-31) — run, jump, learn what ice is. Cracking ice,
  glazed ice, ice that sinks under your weight, currents, killer whales.
• The Summit (32-46) — upward. Cling to the wall, kick off it, reach
  the next ledge before your arms give out.
• Under the Ice (47-61) — your breath is the length of the level. Air
  holes, vents in the seabed, a leopard seal, the current.
• Snowball (62-76) — one room, throwers and a dotted line. Arriving is
  not enough; you have to stand in the right place.

AND IT DOES NOT STOP

After level 76 the endless run begins: seeded from the level number, the
same for everybody, and deep into it the levels go past anything in the
handmade chapters. The daily level is the same for everyone that day —
four objectives and a streak.

OFFLINE, NO ADS, NO ACCOUNT

One online launch and the game is yours offline for good. No ads, no
purchases, no accounts, no tracking. Nothing leaves your device — the
game has no address it talks to at all, and that is checked in the
source.

29 penguins and 10 trails are earned, not bought. Collect fish, beat
records, race your own ghost, turn a friend's record into a code and
share it.

ACCESSIBILITY

Easy mode, reduced motion, one-handed touch controls, gamepad support,
Turkish and English.

Open source. Every line of it readable.
```

### Yeni sürüm notu · TR (en çok 500)

```
İlk sürüm. 76 el yapımı bölüm, dört chapter, sonsuz mod ve günün bölümü.
Çevrimdışı çalışıyor, reklam ve satın alma yok.
```

### Yeni sürüm notu · EN (en çok 500)

```
First release. 76 handmade levels in four chapters, an endless mode and a
daily level. Works offline, no ads and no purchases.
```

---

## 3. Metinler — App Store

### Uygulama adı · TR (en çok 30)

```
Pengu: Antarktika Kaçışı
```

### Uygulama adı · EN (en çok 30)

```
Pengu: Escape Antarctica
```

### Alt başlık · TR (en çok 30)

```
Buzdan buza, nefesin kadar
```

### Alt başlık · EN (en çok 30)

```
Ice-hopping, breath by breath
```

### Anahtar kelimeler · TR (en çok 100)

```
penguen,platform,buz,zıplama,arcade,çevrimdışı,zor,bölüm,antarktika,beceri,koşu,dalış
```

### Anahtar kelimeler · EN (en çok 100)

```
penguin,platformer,ice,jump,arcade,offline,hard,levels,antarctica,skill,runner,diving
```

### Tanıtım metni · TR (en çok 170)

```
76 el yapımı bölüm, dört chapter, sonsuz mod. Çevrimdışı çalışır, reklam
yoktur, hiçbir veri cihazından çıkmaz.
```

### Tanıtım metni · EN (en çok 170)

```
76 handmade levels, four chapters, an endless run. Works offline, has no
ads, and nothing ever leaves your device.
```

App Store açıklaması için Play'in tam açıklaması birebir kullanılabilir;
Apple'ın sınırı da 4000.

---

## 3b. Kalan küçük alanlar

Formların geri kalanı tek satırlık şeyler, ama her biri bir yerde isteniyor.

| Alan | Değer |
|---|---|
| Sürüm | `1.0.0` · Android `versionCode: 1` · iOS `build: 1` |
| Paket adı / Bundle ID | `io.github.meloshemo.pengu` |
| Kategori | Play: Oyun → Arcade · App Store: Games → Arcade (ikincil: Action) |
| Etiketler (Play, en çok 5) | platform, arcade, tek oyunculu, çevrimdışı, beceri |
| Destek adresi | `https://github.com/meloshemo/cld/issues` |
| Pazarlama / web adresi | `https://meloshemo.github.io/cld/` |
| Gizlilik politikası | `https://meloshemo.github.io/cld/privacy.html` |
| Kullanım şartları | `https://meloshemo.github.io/cld/terms.html` |

**Destek e-postası:** Play bunu listelemede **herkese açık** gösteriyor. Günlük
adresini vermek istemezsen yeni bir adres açmak beş dakika; vereceksen bilerek
ver.

**Telif satırı (App Store "Copyright"):** `2026 <adın soyadın>` — mağaza burada
bir kişi ya da şirket adı istiyor, rumuz kabul edilmiyor.

### Apple inceleme notu · EN (en çok 4000)

```
No account, no login, no server. Everything runs on the device.

The game is a browser-based game packaged with Capacitor. It is fully
playable offline: all 76 levels, the endless mode and the daily level are
generated on the device, and no network request is made at any point.

To verify the offline behaviour: launch once, enable Airplane Mode, then
relaunch. The game starts and plays normally.

There is no user-generated content, no chat, no advertising and no
purchases. Nothing is collected or transmitted.
```

### Play uygulama erişimi notu · TR (en çok 500)

```
Giriş gerekmiyor. Oyunun tamamı ilk açılıştan itibaren erişilebilir; hesap,
şifre veya özel bir kod yok.
```

---

## 4. Form cevapları

### Play — Veri güvenliği (Data safety)

| Soru | Cevap |
|---|---|
| Uygulama kullanıcı verisi topluyor mu? | **Hayır** |
| Uygulama kullanıcı verisi paylaşıyor mu? | **Hayır** |
| Veri aktarımda şifreleniyor mu? | Aktarım yok |
| Kullanıcı verisinin silinmesini isteyebiliyor mu? | Veri yalnızca cihazda; **Ayarlar → İlerlemeyi sıfırla** hepsini siler |

Doğrulama: `tools/lint.mjs` kaynakta tek bir dış adres bile bulursa build
düşüyor, `tests/browser-identity.mjs` oyunu gerçek tarayıcıda açıp oyunun
kendi dosyaları dışında **tek bir istek** olmadığını okuyor.

### Play — İçerik derecelendirme (IARC anketi)

Anket soruları tek tek cevaplanıyor; bu oyun için gerçek durum:

- Şiddet: gerçekçi şiddet yok. Karakter **avlanabiliyor** (katil balina,
  deniz leoparı) ve kar topuyla vurulabiliyor; sonucu bir parlama, bir su
  sıçraması ve bölümün baştan başlaması. Kan yok, yara yok, insan figürü yok.
- Cinsellik, çıplaklık, küfür, uyuşturucu, kumar: **yok.**
- Kullanıcılar arası iletişim: **yok** (sohbet, kullanıcı içeriği, sunucu yok).
- Konum paylaşımı, kişisel bilgi toplama: **yok.**
- Reklam: **yok.** Uygulama içi satın alma: **yok.**

Bu cevaplarla beklenen derecelendirme: herkes / 3+. Anketi senin
doldurman gerekiyor — buradaki liste, soruların cevabı belli olsun diye.

### Play — diğer beyanlar

| Soru | Cevap |
|---|---|
| Kategori | Oyun → Arcade (alt tür: platform) |
| Reklam içeriyor mu | Hayır |
| Uygulama içi satın alma | Yok |
| Hedef kitle | 13+ seçilebilir; içerik herkese uygun |
| Giriş gerekiyor mu (App access) | Hayır, her şey açık |
| Devlet uygulaması / finansal özellik | Hayır |
| Gizlilik politikası adresi | `https://meloshemo.github.io/cld/privacy.html` |

### App Store — App Privacy

| Soru | Cevap |
|---|---|
| Veri topluyor musunuz? | **Data Not Collected** |
| Takip (tracking) | Yok, IDFA kullanılmıyor |
| Yaş derecelendirmesi | 4+ (yukarıdaki IARC gerekçesiyle aynı) |
| Kategori | Games → Arcade (ikincil: Action) |
| Gizlilik politikası | `https://meloshemo.github.io/cld/privacy.html` |
| Destek adresi | `https://github.com/meloshemo/cld/issues` |
| Pazarlama adresi | `https://meloshemo.github.io/cld/` |
| İhracat uyumluluğu (şifreleme) | Yalnızca standart HTTPS; özel şifreleme yok |

Yasal metinlerin sayfaları `tools/legal.mjs` ile markdown'dan üretiliyor ve
`gizlilik.html`, `privacy.html`, `kullanim-sartlari.html`, `terms.html`
adresleriyle yayınla birlikte gidiyor. Bir metin değişirse `lint` sayfanın
eskidiğini söylüyor.

---

## 5. Play'e paketleme (TWA) — düğmeye basmak yeterli

Oyun zaten bir PWA, yani Play için ayrı bir sürüm yazmak gerekmiyor: TWA
(Trusted Web Activity) yayındaki adresi tam ekran, tarayıcı çubuğu olmadan
gösteren ince bir Android paketi. **Kurulu bir şey gerekmiyor, paketi CI
üretiyor.**

> GitHub → `meloshemo/cld` → **Actions** → *Android paketi (TWA)* →
> **Run workflow**

İki dakika sonra koşunun altındaki **Artifacts** bölümünde `pengu-android`
duruyor; içinde:

| Dosya | Ne işe yarıyor |
|---|---|
| `app-release.aab` | Play Console'a yüklenen dosya |
| `app-debug.apk` | Telefona kurup denemek için (1.5'teki iş) |
| `assetlinks.json` | İmza sırrı tanımlıysa, siteye konacak dosya |
| `twa-manifest.json` | O paketin hangi ayarlarla çıktığı |

Ayarlar `android/twa-manifest.json` içinde ve okunabilir: uygulama kimliği
`io.github.meloshemo.pengu`, tam ekran, yönelim serbest, durum çubuğu
`#08132a`, açılış ekranı `#050d1c`, `minSdkVersion` 24. Sürüm numarasını
tetiklerken kutucuktan verebilirsin (Play her yüklemede artan bir
`versionCode` istiyor).

### İmzalama — tek elle yapılması gereken şey

İmzasız paket Play'e yüklenmiyor, ve imza anahtarı **senin** olmak zorunda:
burada üretilip bir yere yazılsa, o anahtara erişen herkes senin uygulamanın
güncellemesini imzalayabilirdi.

Anahtarı bir kere üret (bilgisayarında, Java kuruluysa):

```bash
keytool -genkeypair -v -keystore android.keystore \
  -alias pengu -keyalg RSA -keysize 2048 -validity 10000
```

Sonra GitHub → `meloshemo/cld` → Settings → Secrets and variables → Actions,
ve dört sır:

| Sır | Değer |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 android.keystore` çıktısı |
| `ANDROID_KEYSTORE_PASSWORD` | keystore şifresi |
| `ANDROID_KEY_PASSWORD` | anahtar şifresi |
| `ANDROID_KEY_ALIAS` | `pengu` |

Bundan sonra her koşu imzalı `.aab` üretiyor. **Anahtar dosyasını yedekle:**
kaybolursa bu uygulama bir daha güncellenemez.

### Elle yapmak istersen

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://meloshemo.github.io/cld/manifest.webmanifest
bubblewrap build
```

Aynı sonucu veriyor; farkı, soruları senin cevaplaman ve makinende bir JDK ile
Android SDK istemesi.

---

## 6. Dikkat: Digital Asset Links, ve Pages'in tuzağı

TWA'nın adres çubuğunu gizlemesi için Android, **origin kökünden** bir dosya
okuyor:

```
https://meloshemo.github.io/.well-known/assetlinks.json
```

Dikkat: `/cld/` değil, **kökten**. GitHub Pages'te proje sayfasının kökü sana
ait değil — `meloshemo.github.io` adresinin kökünü `meloshemo.github.io` adlı
depo yayınlıyor. Yani iki yoldan biri gerekiyor:

1. **`meloshemo.github.io` adlı bir depo aç** ve içine tek dosya koy:
   `.well-known/assetlinks.json`
2. **Kendi alan adını al** (yapılacaklar 1.7) ve oyunu onun köküne yayınla.

Dosyanın içeriğini `bubblewrap` üretiyor (`assetlinks.json`), içinde imza
anahtarının SHA-256 parmak izi var:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "io.github.meloshemo.pengu",
    "sha256_cert_fingerprints": ["<bubblewrap'in verdiği parmak izi>"]
  }
}]
```

Bu dosya yoksa uygulama yine çalışıyor — ama üstünde oyunun adresini yazan
bir çubukla, yani tam ekran değil. Mağazaya göndermeden önce telefonda bir
kere bakmaya değer.

---

## 7. App Store'a paketleme (Capacitor)

iOS'ta bir PWA doğrudan gönderilemiyor; bir kabuk gerekiyor.

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init Pengu io.github.meloshemo.pengu --web-dir=.
npx cap add ios
npx cap open ios          # Xcode açılır; macOS gerekiyor
```

Xcode tarafında: `store/appstore/icon-1024.png` simge olarak, yönelim hepsi
açık, durum çubuğu gizli, arka plan `#050d1c`.

**Dürüst uyarı:** Apple'ın 4.2 "minimum functionality" kuralı, bir web
sitesini sarmalamaktan ibaret uygulamaları reddediyor. Bu oyunun durumu
iyi — tamamen çevrimdışı çalışıyor, 76 bölümü var, dokunmatik kumandası ve
oyun kolu desteği var, hiçbir şeyi sunucudan çekmiyor — ama kararı veren
inceleme ekibi. Reddedilirse ilk bakılacak yer, uygulamanın çevrimdışı
açıldığını göstermek: inceleme notuna "uçak modunda açıp bölüm oynayın"
yazmak gerçekten işe yarıyor.

Sırası gelmişse: Play'i önce yapmak mantıklı. Ucuz, makine istemiyor ve
oyunun mağazada nasıl göründüğünü bir kere görmek, App Store'un 99 dolarına
karar vermeyi kolaylaştırıyor.

---

## 8. Gönderim öncesi son liste

- [ ] Android paketi üretildi (Actions → *Android paketi (TWA)*)
- [ ] `node tools/test.mjs` yeşil
- [ ] `node tools/store.mjs` ile görseller tazelendi
- [ ] `node tools/legal.mjs` ile yasal sayfalar tazelendi
- [ ] Gizlilik adresi tarayıcıda açılıyor
- [ ] Gerçek telefonda oynandı (yapılacaklar 1.5)
- [ ] Uçak modunda açıldı
- [ ] Bubblewrap imza anahtarı yedeklendi
- [ ] `assetlinks.json` origin kökünde yayında (§6)
