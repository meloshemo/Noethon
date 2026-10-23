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
| Gereken makine | **hiçbiri** — paketi CI üretiyor | **macOS + Xcode** |
| Paketleme | Oyun paketin içinde (WebView) | Aynısı, WKWebView ile |
| En büyük risk | yok sayılır | Apple 4.2 "yeterli işlevsellik" |
| Durum | **paket hazır, üretiliyor** | ertelendi — Mac yok |

**Öncelik Android, ve oyun paketin içinde.** Uygulama bir siteyi açan kabuk
değil: `tools/bundle.mjs`'in ürettiği tek dosya sürümü — 76 bölümün tamamı,
sonsuz mod, günün bölümü — paketin içinde duruyor. Ağ izni yok, indirilecek
bir şey yok, açılması için internet gerekmiyor.

Bunun bir yan etkisi, en sinir bozucu mağaza sorununun ortadan kalkması:
uygulama yayındaki bir adrese bağlı olmadığı için `assetlinks.json`, origin
kökü, alan adı doğrulaması diye bir iş kalmıyor.

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

Oyun tamamen çevrimdışı çalışıyor: her şey uygulamanın içinde, indirilecek
hiçbir şey yok. Reklam yok, satın alma yok, hesap yok, takip yok. Uygulamanın
tek bir izni bile yok — ne ağ, ne depolama, ne konum — ve hiçbir veri
cihazından çıkmıyor.

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

The game is fully offline: everything is inside the app and there is
nothing to download. No ads, no purchases, no accounts, no tracking. The
app asks for no permissions at all — not network, not storage, not
location — and nothing ever leaves your device.

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

### App Store adı · TR (en çok 30)

```
Pengu: Antarktika Kaçışı
```

### App Store adı · EN (en çok 30)

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

## 5. Android paketi — düğmeye basmak yeterli

Bilgisayarına hiçbir şey kurman gerekmiyor; paketi CI üretiyor.

> GitHub → `meloshemo/cld` → **Actions** → *Android paketi* → **Run workflow**

İki dakika sonra koşunun altındaki **Artifacts** bölümünde `pengu-android`
duruyor:

| Dosya | Ne işe yarıyor |
|---|---|
| `app-release.aab` | Play Console'a yüklenen dosya |
| `app-debug.apk` | Telefona kurup denemek için (1.5'teki iş) |

Sürüm numarasını tetiklerken kutucuklardan verebilirsin: Play her yüklemede
artan bir `versionCode` istiyor.

### Paketin içinde ne var

`android/` küçük ve okunabilir bir Android projesi: bir activity, bir WebView,
bir dosya. O dosya `tools/bundle.mjs`'in ürettiği tek dosya sürümü — 696 KB,
oyunun tamamı — ve `tests/browser-bundle.mjs` onu gerçek tarayıcıda açıp bölüm
oynuyor. Yani mağazadaki şey ile depodaki şey ayrışamıyor; ortada ikinci bir
kopya yok.

İki ayrıntı, ikisi de ölçülmüş sebeplerle:

- Sayfa `file://` değil, `https://appassets.androidplatform.net` üstünden
  servis ediliyor. `file://` opak bir origin demek, opak origin `localStorage`
  yok demek, o da **her açılışta sıfırlanan kayıt** demek. Asset loader aynı
  baytları gerçek bir origin'den veriyor; bunun için hiçbir şey cihazdan
  çıkmıyor.
- Geri tuşu bir geçmiş tuşu değil: oynarken duraklatıyor, duraklamışken
  menüye, başka ekrandayken başlığa dönüyor, yalnızca başlıktayken uygulamayı
  kapatıyor. Bu sözleşme `tests/browser-bundle.mjs` içinde, paketlenen dosyanın
  kendisine karşı denetleniyor.

Uygulamanın **hiçbir izni yok**: ağ, depolama, konum, sensör, kimlik — hiçbiri.
Manifest'te tek bir `uses-permission` satırı yok, yani gizlilik metnindeki
"hiçbir veri cihazından çıkmıyor" cümlesi paketin kendisiyle doğrulanabiliyor.

### İmzalama — tek elle yapılması gereken şey

İmzasız paket Play'e yüklenmiyor, ve imza anahtarı **senin** olmak zorunda:
CI içinde üretilip bir yere yazılsaydı, ona erişen herkes bu uygulamanın
güncellemesini imzalayabilirdi.

Anahtarı bir kere üret (Java kuruluysa, bilgisayarında):

```bash
keytool -genkeypair -v -keystore android.keystore \
  -alias pengu -keyalg RSA -keysize 2048 -validity 10000
```

Sonra GitHub → `meloshemo/cld` → Settings → Secrets and variables → Actions:

| Sır | Değer |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 android.keystore` çıktısı |
| `ANDROID_KEYSTORE_PASSWORD` | keystore şifresi |
| `ANDROID_KEY_PASSWORD` | anahtar şifresi |
| `ANDROID_KEY_ALIAS` | `pengu` |

Bundan sonra her koşu imzalı `.aab` üretiyor. **Anahtar dosyasını yedekle:**
kaybolursa bu uygulama bir daha güncellenemez.

### Yükleme de otomatik — ama önce hesap

Paket hazır olduktan sonra formları elle doldurmak gerekmiyor: `Play'e yükle`
iş akışı paketi üretiyor, imzalıyor ve Play'e **metinleriyle, görselleriyle**
birlikte gönderiyor. Metinler `docs/MAGAZA.md`'den, görseller `store/play/`
içinden okunuyor, yani mağazadaki listeleme ile burada yazılan şey ayrışamıyor.

Sürüm **taslak** olarak iniyor: sen Play Console'da onaylamadan hiçbir şey
yayına çıkmıyor.

Gereken tek sır bir şifre değil, bir **servis hesabı**:

1. Play Console → **Setup → API access** → servis hesabı oluştur
2. Google Cloud'da o hesaba bir **JSON anahtar** ürettir
3. Play Console → **Users and permissions** → servis hesabına bu uygulama için
   *Release to testing tracks* ve *Edit store listing* yetkisi ver
4. JSON'un tamamını GitHub'da `PLAY_SERVICE_ACCOUNT_JSON` sırrı olarak sakla

Anahtar GitHub'ın sır kasasında duruyor, koşu içinde kullanılıp siliniyor,
kapsamı tek bir uygulamanın yayını, ve istediğin an Play Console'dan iptal
edebiliyorsun. **Google şifreni hiçbir yere yazma** — ne buraya, ne bir dosyaya:
bu işin doğru yolu bu değil ve gerekmiyor da.

API'nin yapamadığı iki şey var ve ikisi de senin: **hesabı açmak** (25 $,
kimlik doğrulaması) ve **uygulama kaydını oluşturmak** (Play Console → Create
app). API var olan bir uygulamayı düzenliyor.

### Create app formu — alan alan

Bu form API'den doldurulamıyor, ve iki dakikalık. Yazılacaklar:

| Alan | Değer |
|---|---|
| App name | `Pengu: Antarktika'dan Kaçış` |
| Default language | Türkçe (Türkiye) — İngilizcesini API yazıyor |
| App or game | **Game** |
| Free or paid | **Free** — sonradan ücretliye çevrilemiyor, tersi serbest |
| Declarations | Developer Program Policies ✓ · US export laws ✓ |

Uygulama kaydı açıldıktan sonra Play'in "Set up your app" listesi çıkıyor.
Cevapların hepsi §4'te; konsoldan doldurulması gerekenler şunlar:

| Görev | Cevap |
|---|---|
| App access | Tüm içerik açık, giriş gerekmiyor |
| Ads | Uygulama reklam içermiyor |
| Content rating | Anket — §4'teki gerçek durum |
| Target audience | 13+ (içerik herkese uygun) |
| News app | Hayır |
| Data safety | Veri toplanmıyor, paylaşılmıyor (§4) |
| Government apps | Hayır |
| Financial features | Hiçbiri |
| Privacy policy | `https://meloshemo.github.io/cld/privacy.html` |

Store listing (ad, açıklamalar, görseller) ve sürüm yüklemesi **elle
yapılmasın** — `Play'e yükle` iş akışı ikisini de yapıyor.

### Önce bağlantı testi

Sır konduktan sonra, bir şey yüklemeden önce: Actions → **Play bağlantı
testi**. Play'de bir düzenleme açıp hemen siliyor; mağazada hiçbir şey
değişmiyor ama anahtarın geçerli olduğunu, bu geliştirici hesabına bağlı
olduğunu ve bu uygulamaya yetkili olduğunu kanıtlıyor.

### Play Console'da sıra

1. Hesap (25 $, kimlik doğrulaması birkaç gün sürebiliyor)
2. "Create app" → ad, dil, oyun, ücretsiz
3. §2'deki metinler, §1'deki görseller
4. §4'teki formlar (veri güvenliği, içerik derecelendirme)
5. Internal testing → `.aab` yükle → kendi telefonunda dene
6. Production → gönder

---

## 6. iOS — ertelendi, ama aynı yoldan

Aynı yaklaşım iPhone'da da çalışıyor: WKWebView içinde aynı tek dosya. Fark,
Apple'ın istedikleri:

- **macOS + Xcode** gerekiyor, uzaktan yapılamıyor.
- Apple Developer üyeliği yılda 99 $.
- 4.2 "minimum functionality" kuralı web sarmalayıcıları reddedebiliyor. Bu
  oyunun durumu iyi — tamamen çevrimdışı, 76 bölüm, dokunmatik kumanda ve oyun
  kolu desteği, hiçbir şey sunucudan gelmiyor — ama kararı inceleme ekibi
  veriyor. §3'teki inceleme notu tam da bunun için yazıldı: "uçak modunda açıp
  bölüm oynayın" cümlesi gerçekten işe yarıyor.

Mac olduğu gün yapılacak iş: `android/` projesinin iOS karşılığı (bir
`WKWebView`, `assets/pengu.html`, aynı geri tuşu sözleşmesi) ve
`store/appstore/` içindeki hazır görseller.


## 7. Gönderim öncesi son liste

- [ ] Android paketi üretildi (Actions → *Android paketi (TWA)*)
- [ ] `node tools/test.mjs` yeşil
- [ ] `node tools/store.mjs` ile görseller tazelendi
- [ ] `node tools/legal.mjs` ile yasal sayfalar tazelendi
- [ ] Gizlilik adresi tarayıcıda açılıyor
- [ ] Gerçek telefonda oynandı (yapılacaklar 1.5)
- [ ] Uçak modunda açıldı
- [ ] İmza anahtarı üretildi, sırlar konuldu ve anahtar yedeklendi (§5)
- [ ] İmzalı `.aab` indirildi (ya da `Play'e yükle` iş akışı koşturuldu)
- [ ] Debug APK telefonda açıldı ve bir bölüm oynandı
