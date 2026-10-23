# Değişiklikler

Sürüm numarası yok çünkü tek bir web adresine yayınlanıyor; tarih ve ne
değiştiği yeterli. En yeni en üstte.

---

## Android paketi artık bir düğme

Play'in kopyası bir TWA: yayındaki adresi tam ekran açan ince bir Android
kabuğu. İkinci bir kod tabanı yok ve olmamalı — Play'deki şey web'deki şey.

Bubblewrap'in CLI'ı etkileşimli: JDK'yı, SDK'yı, renkleri, imza anahtarını
soruyor. Bir kere elle yapan için uygun, tekrarlanabilir olması gereken bir
yapı için değil. O yüzden ayarlar `android/twa-manifest.json` içinde duruyor ve
proje, Bubblewrap'in **kendi üreticisi** doğrudan çağrılarak kuruluyor —
`init`'in kullandığı aynı kod yolu, soruları olmadan.

`.github/workflows/android.yml` elle tetikleniyor ve çıkanlar: Play'e
yüklenecek `app-release.aab`, telefona kurulabilen `app-debug.apk`, imza sırrı
tanımlıysa `assetlinks.json`, ve paketin hangi ayarlarla çıktığı.

**İlk koşu düştü, ve bu iyi oldu:** `androidbrowserhelper` kütüphanesi
`minSdk 24` beyan ediyor, Bubblewrap'in varsayılanı 21, ve manifest
birleştirici aşağı doğru birleşmiyor. Hata kırk saniyelik bir Gradle koşusunun
içinden geliyordu; artık `tools/twa.mjs` ilk saniyede söylüyor. İkinci koşu
yeşil: 5,8 MB'lık paket indirilebilir durumda.

İmzalama bilerek dışarıda: anahtar burada üretilip bir yere yazılsaydı, ona
erişen herkes bu uygulamanın güncellemesini imzalayabilirdi. Anahtar bir kere
`keytool` ile üretiliyor, dört GitHub sırrı olarak konuyor, ve ondan sonra her
koşu imzalı `.aab` veriyor.

---

## Mağaza dosyası: görseller oyunun kendisinden, metinler sayılarıyla

### 39 görsel, hiçbiri elle çizilmedi

`tools/store.mjs` iki mağazanın istediği her görseli üretiyor: Play için
telefon (1080×1920) ve tablet (1920×1200), App Store için 6,9" iPhone
(1320×2868) ve 13" iPad (2064×2752), iki dilde, altı sahne — her chapter'dan
bir tane, artı bölüm listesi ve koleksiyon. Üstüne öne çıkan görsel (1024×500,
iki dilde) ve iki simge.

Hepsi **oyunun kendisi**, tarayıcı testlerinin kullandığı tutamaçla sürülüyor.
Kayıt önce tohumlanıyor, çünkü yepyeni bir kayıt boş fotoğraflanıyor — kilitli
bölümler, sıfır yıldız, boş koleksiyon — ki bu ilk otuz saniyenin doğru,
oyunun yanlış resmi.

Üç şey ölçülerek öğrenildi:

- **Penguene zıplatmak yanlış araçtı.** Koşturup zıplatmak 20. bölümde boşluğu
  geçmedi; fotoğraf suya düşüş ve "1" yazan deneme sayacı oldu. İstenen kare
  zaten sıçrayış değilmiş: arkasında katil balina havadayken duran yarım saniye.
- **Su altında derinlik verilmez, ölçülür.** Elle seçilen derinlik deniz
  tabanının altına düştü, yüzücü kareden çıktı, seviyeye kilitli kamera
  kımıldamadı. Artık sütundaki bütün katılar sıralanıp en geniş açıklık
  bulunuyor.
- **İki simge iki zıt kural.** Apple alfa kanalı olan simgeyi reddediyor,
  Google 32 bitlik — yani alfa kanallı — PNG istiyor. Tarayıcıdan çıkan her şey
  RGBA olduğu için PNG'ler elle yazılıyor: bir IHDR, bir IDAT, bir IEND.

`tests/store.mjs` (57. paket) her dosyanın boyutunu başlığından okuyup iki
mağazanın kuralıyla karşılaştırıyor.

### Ve mağaza görselleri bir çeviri hatası buldu

İngilizce ekran görüntüsünde koleksiyon sayacı **"10 / 29 penguen"** diyordu.
Satır `ui.js` içinde elle kuruluyordu — `${owned} / ${list.length} ${trails ?
'iz' : 'penguen'}` — ve yazıldığı günden beri İngilizce oynayan herkes bunu
görüyordu.

`tests/browser-lang.mjs` her ekranı İngilizce gezip Türkçe harf arıyor ve bunu
kaçırdı, çünkü **"penguen" kelimesinde Türkçe harf yok.** Kör nokta tam bir
kelime genişliğinde: ç, ğ, ı, ö, ş, ü taraması ASCII ile yazılan Türkçe
kelimeyi göremiyor.

İki şey yapıldı: sayaç sözlüğe taşındı (`ui.collectionMeta`), ve pakete tam
kelime eşleşen bir liste eklendi — penguen, izler, kalan, deneme, puan, hedef,
seri, sonsuz, ayarlar, geri, kapat, oyna, rekor. İngilizce karşılığı olan
hiçbir kelime listeye girmedi (market, final, lig): yanlış alarm veren bir
denetim silinir. Düzeltme geri alındığında paket düşüyor.

Bulan şey bir test değildi; bir ekran görüntüsüne bakmaktı. Mağaza görsellerinin
oyunun kendisinden alınmasının ikinci faydası bu.

### Ve metinler, karakter karakter sayılı

`docs/MAGAZA.md` iki mağazanın bütün formunu tek yerde tutuyor: iki dilde ad,
kısa açıklama, tam açıklama, anahtar kelimeler, tanıtım metni, sürüm notu —
on altı alan, her biri sınırıyla birlikte yazılı ve testte sayılıyor. Üstüne
veri güvenliği, içerik derecelendirme ve gizlilik formlarının cevapları,
Bubblewrap ve Capacitor adımları.

İki şey oraya **uyarı** olarak yazıldı, çünkü ikisi de bir gün yakar:

- TWA'nın adres çubuğunu gizlemesi için Android `assetlinks.json`'ı **origin
  kökünden** okuyor. GitHub Pages proje sayfasında o kök sana ait değil —
  `meloshemo.github.io` adlı ayrı bir depo ya da kendi alan adın gerekiyor.
- Apple'ın 4.2 kuralı web sitesi sarmalayan uygulamaları reddediyor. Bu oyunun
  durumu iyi (tamamen çevrimdışı, 76 bölüm, dokunmatik ve oyun kolu) ama kararı
  inceleme ekibi veriyor.

### Yasal metinler artık birer sayfa

İki mağaza da gizlilik politikası için **açılabilir bir adres** istiyor, ve
dört metin `docs/` içinde markdown'dı: statik bir sunucu onları düz metin
olarak veriyor, yani inceleyen kişi boru işaretleri ve diyezler görüyordu.

`tools/legal.mjs` dördünü de sayfaya çeviriyor — `gizlilik.html`,
`privacy.html`, `kullanim-sartlari.html`, `terms.html` — oyunun renkleriyle,
telefonda okunur, tek dosya, stil dosyasına bağlı değil (bir hukuk sayfasının
yarım yüklenmesi okunmaz gelmesi demek).

Sayfa, metnin ikinci kopyası olduğu an ikisinden biri yanlış kalır ve hangisi
olduğunu kimse bilmez. O yüzden `lint`'in on beşinci kuralı dördünü yeniden
üretip karşılaştırıyor: bir metin değişip sayfa tazelenmezse build duruyor.

### Manifest de artık kendini gösteriyor

Chrome'un kurulum penceresi `screenshots` alanını kullanıyor: onunla oyun bir
mağaza listelemesi gibi, kendi resmiyle öneriliyor; onsuz bir satır yazı ve bir
simge. Dar ve geniş birer görsel eklendi (540×960 ve 1280×720, `assets/`
içinde, küçük tutuldu), `categories` ve `id` da yazıldı.

---

## Çevrimdışı sözü bir ziyaret eksikti

### Ölçülmüş hâli: oyunu bir kere online açmak yetmiyordu

`sw.js`'in iki kuralı da doğruydu ve `tests/offline.mjs` ikisini de sürüyordu.
Eksik olan, testin soramadığı soruydu: **ilk ziyaret.**

Gerçek bir tarayıcıda yürütüldü. Oyunu bir kere sinyalle aç, ağı kes, yenile —
ve oyun gelmiyor. Önbellekte iki kayıt var, `./` ve `./index.html`; oyunun
yapıldığı **kırk modülün hiçbiri yok.** Sebebi basit ve tamamen sıra meselesi:
modüller servis çalışanı kurulmadan önce istenmişti, yani çalışan onları hiç
görmedi. İkinci bir online ziyaret düzeltiyor — ki hiçbir teselli değil, çünkü
önemli olan ziyaret ilki: metroya inmeden önceki peronda yapılan.

Çözüm bir precache listesi **olamaz**: bu projede derleme adımı yok, elle
yazılan bir modül listesi birinin dosya eklediği gün bayatlar, ve bayat bir
liste hiç listesizlikten kötüdür (programın beşte dördünü saklar). Ama tarayıcı
sayfanın ne yüklediğini zaten biliyor ve söylüyor:
`performance.getEntriesByType('resource')`. Artık sayfa bu listeyi çalışana
veriyor, çalışan da onu saklıyor. Liste bayatlayamaz, çünkü liste değil — az
önce olan yüklemenin ölçümü.

| | Önce | Sonra |
|---|---|---|
| Tek online ziyaretten sonra önbellek | 2 dosya | **40 dosya** |
| Sinyalsiz yenileme | açılmıyor | **açılıyor, bölüm oynanıyor** |

`tests/browser-offline.mjs` (yeni, 56. paket) hikâyeyi olduğu gibi sürüyor: bir
ziyaret, ağ kapalı, bölüm oyna. Düzeltme geri alınınca paket altı kontrolden
düşüyor — yani ölçtüğü şey gerçekten bu.

Ve ısıtmanın bedeli de ölçüldü, çünkü bu iş yanlış yapılırsa **oyunun tamamını
ikinci kez indirmek** demek. `cache.add` kısa yazılışı tam olarak bunu yapıyor:
sunucuya otuz sekiz fazladan istek, hem de oyuncunun beklediği tek ziyarette.
`fetch(u, { cache: 'force-cache' })` önce tarayıcının kendi kopyasını istiyor —
sayfanın şu an üstünde çalıştığı kopyayı — ve ağa yalnızca gerçekten eksik olan
için gidiyor.

| Isıtma yöntemi | Sunucuya giden fazladan istek |
|---|---|
| `cache.add` | 38 |
| `fetch(..., force-cache)` | **1** |

Bayatlık riski yok, kurgu gereği: değişmiş bir sayfa yukarıdaki kuralla bu
önbelleği zaten boşaltıyor, yani tercih edilecek eski bir şey kalmıyor.

### Telefonu oyun sırasında çevirmek

Cihaz listesinin ilk maddesiydi ve testle cevaplanabilecek tek maddesiydi.
`tests/browser-layout.mjs`'e eklendi: 1. bölüm koşarken ekran dikeyden yataya,
sonra geri. Koşu kesilmiyor, aynı bölüm, ölüm sayısı aynı, penguen yürümeye
devam ediyor (431 → 601 → 772px), her iki yönde de ekranda, ve boyu %15'ten az
değişiyor — `tests/viewport.mjs`'in analitik olarak çivilediği özelliğin gerçek
bir sahnede, altında oynanan bir bölümle tutulmuş hâli.

### Gizlilik metni sayıyordu ama eksik sayıyordu

"Ne saklanıyor" listesi — iki dokümanda ve oyunun Yasal ekranında — maddeler
hâlinde yazılmış. Madde hâlinde yazmak, listenin **tam** olduğunu iddia
etmektir, ve artık değildi: kayıt büyürken istatistikler, lig puanı, günün
görevleri, yarım kalan koşunun yeri ve anıtın boyu eklendi; beşi de
listelenmemişti.

Hiçbiri cihazdan çıkmıyor, yani hiçbir test düşemezdi. Tam da bu yüzden okuyan
birine değil bir tele ihtiyacı var: kayda yeni bir alan, Yasal ekranını o anda
düşünmeyen biri tarafından, başka bir sebeple ekleniyor. `lint`'in on dördüncü
kuralı kaydın bütün alanlarını tanıyor; yeni bir alan çıktığında build duruyor
ve oyuncuya söylenip söylenmediğini soruyor.

---

## Arayüz üç yerde yalan söylüyordu, ve sonsuz modun kadranı hiç çevrilmemişti

### Oyunun oyuncuya söylediği sayılar

Sözlükteki metinlerin ikisi İngilizcede değil, **iki dilde de** yanlıştı:

| Nerede | Ne diyordu | Gerçek |
|---|---|---|
| Bölüm listesinin altı | "31 bölümden sonra sonsuz mod" | 76 |
| Koleksiyonun altı | "yirmi penguen ve on iz, iki yüz kombinasyon" | 29, 10, 290 |

İkisi de doğruydu yazıldıkları gün. Oyun büyüdü, cümleler büyümedi — ve bir
sayıyı oyuncuya söylemek bir söz vermek. O yüzden `tools/lint.mjs`'e on üçüncü
kural eklendi: sayı veren cümleler sözlükten okunup `CRAFTED_LEVELS`,
`SKINS.length`, `TRAILS.length` ve bölüm başına balık ile karşılaştırılıyor,
iki dilde. Eklendiği anda üçüncü bir kaymayı daha yakaladı — readme'nin sözlük
boyu — ki zaten varolan on ikinci kuralın işi buydu.

### Telefonu yan çevirme ipucu kaldırıldı

Oyunun dikey telefonda bir oyuncuya söylediği **ilk şey** "yan çevirirsen oyun
alanı büyür" idi. Yazıldığı gün doğruydu: görüş alanı "540 birim yüksek, en
boy oranı genişliği belirler" diye çerçeveleniyordu, yani yatay telefon boş
kenar boşluğundan başka bir şey kazandırmıyordu. `viewFor` bunu düzeltti, ve
`tests/viewport.mjs` artık ipucunun **tersini** ölçüyor: çevirmek penguenin
göründüğü boyu %15'ten az değiştiriyor ve dik tutulan telefon dünyadan *daha
fazla* görüyor.

Yani ipucu bir hatırlatma değil, oyunun kendisi hakkında yanlış bir ifadeydi —
ve başlık ekranında duruyordu. Markup'ı, CSS'i, metni ve yönelim dinleyicisi
kaldırıldı; yerinde ölçümü anlatan bir yorum var. Lig satırındaki "bu hafta
zirvedesin" de dürüstleşti: skorlar bu cihazda duruyor, kimse kimseyle
yarışmıyor, o yüzden artık "en üst kademe, bu hafta orada kaldın".

### İngilizce taraması

Üç yüz on beş anahtarın ikisi birden okunup karşılaştırıldı. Çeviri eksiği,
Türkçe kaçağı, yer tutucu uyuşmazlığı yok; düzeltilen tek şey yukarıdaki
sayılar ve lig cümlesiydi. `tests/browser-lang.mjs` her ekranı İngilizce
gezip Türkçe harf arıyor, ve sessiz.

### Sonsuz modun `tight` kadranı hiç çevrilmemişti

`floorGap` sıçrama aralığını aşağıdan kapattı, üç parça daha o tabana bağlandı,
ve sonsuz koşu hâlâ el yapımı chapter'ın sonundan gevşek ölçülüyordu. Sebebi
aralığın kendisiydi: `Course`'un `tight` kadranı kurstaki her boşluğu çarpıyor,
el yapımı sahanlık onu 0,8 → 1,3 arasında rampalıyor, **üretici hiç
geçirmiyordu.** 77. bölüm de 977. bölüm de 1,0'da — 11. bölümün değerinde —
koşuyordu.

```js
const tight = lerp(1, 1.38, depth);
```

296: 0,413 → **0,241** · 299: 0,322 → **0,257** · 302: 0,396 → **0,324** ·
305: 0,366 → **0,289**

El yapımı finalin toleransı 0,395, bandın zor ucu 0,22. Derin sonsuz bölüm artık
oyunun en zor el yapımı bölümünün ötesinde ve en dar tek sıçrayışlar 0,0456 —
yirmi giriş kombinasyonundan biri. Dördü de `validate-levels.mjs` ve
`shelf-run.mjs` ile geçilebilir kanıtlı; tavan 1,45 yerine 1,38, çünkü sonuna
kadar bastırılmış bir kadranın gidecek yeri kalmaz.

### Oyunun ritmi de ölçüldü

Zor bir oyunun ölçülmesi gereken sayısı sıçrama genişliği değil, **ölüm ile
tekrar oynanabilir olmak arasındaki süre**. Tarayıcıda, dört chapter'da:

| Geçiş | Süre |
|---|---|
| Ölüm → yeniden oynanabilir | 709–724 ms (5, 31, 40, 55 ve 70. bölümlerde) |
| Bitiş → kazanma kartı | 868 ms |
| "Sıradaki" → oynanıyor | 20 ms |

Dört chapter'da aynı, çünkü yükleme yok: bölüm bir veri yapısı, ve tekrar
denemek kontrol noktasına geri koymaktan ibaret. 0,72 saniyelik ölüm duraklaması
`config.js` içinde tek sayı — zorluk yukarı çıkarken tekrar döngüsünün bir
saniyenin altında kalması, imkansıza yaklaşan bölümlerin dayanılabilir olmasının
tek sebebi.

### Kalması kararlaştırılanlar

Ekonomi `tests/economy.mjs` ile dakika dakika yürütüldü: ilk kozmetik 4
dakikada, her şey 308 günde. Sıçrama mekaniği, hayaletle yarış ve rekorla
yarış kaldı — üçü de tutarlı ve çevrimdışı dürüst: hayalet oyuncunun kendi
koşusu, rekor oyuncunun kendi rekoru, ve ikisi de bu cihazda duruyor. Arenaya
yan rüzgâr **eklenmedi**: chapter'ın düello kanıtı düz çizgide giden atışlara
dayanıyor, ve kanıtı bozan bir fizik kuralı bir yenilik değil.

---

## Çöken taş, ve çıkmadan önceki tarama

### Dağın kendi "ağırlığa cevap veren zemin"i

Yüzen buz zamanı boğulmaya karşı takas ediyor. Duvarda boğulacak deniz yok ve
durmak günah değil: bu chapter biten bir koldan ibaret, ve bir taş kolun geri
dolduğu yer — dağın dinlenmeye verdiği tek izin.

Çöken taş o izne kira kesiyor. Üstünde durulurken çöküyor, boşalınca çıkıyor,
yani **dinlenme yükseklikten ödeniyor**: birbirinin cevabı olan iki şey, kol
dolarken taş düşüyor, ters yöne çekiyor.

Denizin sürümünden tek farkı var ve o da chapter'ların başarısızlık biçimi.
Yüzen buzun draft'ı sözünün çok ötesine gidiyor, çünkü o yolun sonu boğulmak:
temiz, anlık, ve bölüm baştan başlıyor. Dağ kimseyi boğmuyor — uzun dinlenen
bir tırmanıcı **mahsur** kalırdı, ve en kötü hâli "devam etmek için bilerek
düş" olan bir mekanik, hikâyesi olan bir hatadır. O yüzden taş sözün bittiği
yerde duruyor: 36, 38 ve 43'te, ve bir koşudaki her adım — çıkış adımı dahil —
taş tamamen çökmüş hâline göre ölçülüyor.

Çözücü taşı her adımda oyunun kuralıyla hareket ettiriyor ve **her denemede
sıfırlıyor**, ki salıncaktan farkı bu: salıncak saatin saf fonksiyonu, bu
değil — ne kadar durulduğunu hatırlıyor.

### Elli koşuda bir düşen test çözüldü

`tests/skua.mjs` bir turda bir kere düşmüş ve tekrarlanamamıştı. Sebebi
bulundu: yönetmen, ölçülen dokuz yüz adımlık uçuş sırasında rastgele **ikinci
bir kuş** fırlatabiliyor, ve `w.skuas[0]` o anda başka bir uçuş oluyor.
`ambushes`'i kapatmak yanlış araç — bütün güncellemeyi kapatıyor, havadaki kuş
donuyor; durdurulması gereken fırlatıcılar. Yirmi beş koşuda sıfır hata.

### Ve çıkmadan önceki tarama iki görünür kusur buldu

`og:image` bir SVG'ydi. WhatsApp, Messenger, Twitter ve Slack SVG kart için
hiçbir şey göstermiyor: oyunun her paylaşımı, altında başlık olan boş bir
dikdörtgendi. `apple-touch-icon` da SVG'ydi, ve Safari bunu hiç desteklemedi —
ana ekrana eklenen oyun, tam da oyunun yapıldığı cihazda gri harf yer
tutucusuyla duruyordu.

İkisi de aynı çizimden PNG'ye alındı, yani değişecek tek bir çizim var.
Manifest'teki `orientation` da `landscape`'ten `any`'ye alındı: oyun dik
tutulduğunda daha fazlasını görüyor ve bu `tests/viewport.mjs` ile ölçülü,
yani kurulumda yatayı dayatmak kendi ölçümüyle çelişiyordu.

### Başarım, ilk kez ölçüldü

| | CPU ×1 | CPU ×4 |
|---|---|---|
| Simülasyon | 0,1–0,2 ms | 0,1–0,8 ms |
| Çizim (JS) | 0,7–1,2 ms | 3,6–5,3 ms |

Onaltı buçuk milisaniyelik bütçenin çok altında, dört kat yavaşlatılmış bir
işlemcide bile. Ölçülemeyen tek şey 780×1688 pikseli gerçekten **boyamanın**
maliyeti: bu kutuda GPU yok, ve o sayı donanımın.

---

## Yüzen buz: oyunun ilk "penguen de bir şey yapar" kuralı

Bu oyundaki her buz parçası bir saat ya da bir şekildi. Çatlayan buz geriye
sayıyor, eriyen buz daire çiziyor, gayzer fırlatıyor, ipteki kütle başkasının
temposuyla sallanıyor — hepsi penguene *oluyor*. Penguen, dünyada bulunarak
hiçbir şeyi değiştirmeyen tek şeydi.

Yüzen buz değiştiriyor. Yüzen bir cisim üstündeki ağırlığın söylediği yerde
durur, yani bu buzun yüksekliği **üstünde ne kadar durduğunun** bir
fonksiyonu: oyunda geometrisi oyuncunun kendi suçu olan ilk şey. Kalkınca su
onu geri itiyor, ve asıl ikinci yarı bu — bir fitil değil, bir **ritim**.
Chapter I'deki her şey bir kere harcanınca bitiyordu; bu geri geliyor.

| | |
|---|---|
| `sink` 70 px/sn | Taşırken |
| `rise` 40 px/sn | Boşken — bilerek daha yavaş |
| `safe` 90 px | Bestecinin söz verdiği aralık |
| `draft` 200 px | Denizin üstüne geldiği derinlik |

Çıkış batıştan yavaş olmasaydı inip çıkmak bedelsiz olurdu ve bir dizi yüzen
buz, üstünde animasyon olan düz bir koridor olurdu. Yarısından biraz fazlası,
aynı buza ikinci gelişin birincisinden daha aşağıdan başlamasını sağlıyor.

Üç soru, üç cevap: ilk bir saniyede kalkarsan sıradan bir sıçrayış (besteci
boşlukları düz zeminden değil, doksan piksel batmış bir zeminden istiyor, ve
doksan bir zıplamanın 141'inin rahatça içinde); geç kalkarsan aynı sıçrayış
bir tırmanışa dönüşüyor; kalkmazsan deniz üstüne geliyor.

### Kanıt üç yerde, ve biri hiç çalışmıyormuş

`validate-levels.mjs` artık yüzen buzdan yapılan her sıçrayışı batmış hâlden
ölçüyor — dosyadaki hâlini okumak, kimsenin oynamadığı bir bölümü doğrulamak
olurdu, çünkü buz üstünden atlanırken asla boş su hattında değil.

`shelf-run.mjs` çözücüsü bıraktığı buzun kendi kopyasını her adımda oyunun
kuralıyla hareket ettiriyor. İlk sürümü kimliğe (`===`) bakıyordu ve
`solidsOf` kopya dağıttığı için **hiç çalışmayan** bir koddu: testi koşmayarak
geçiriyordu. Geometriyle eşleşince ölçü de ortaya çıktı.

`tests/buoy.mjs` altı şeyi tutuyor, ve beşincisi iki kere ders verdi. "Vaktinde
kalkan geçer" kontrolü önce 20. bölümde koşuyordu ve üç koşunun ikisinde
düşüyordu — o bölümde çürük balık, bobin ve üç katil balina var, ve düz
yürüyen bir penguen kare sayısının önüne koyduğuyla karşılaşıyor. Kendi
kursunda koşunca da beşte bir düşmeye devam etti: on ikinci bölümden sonra buz
sahanlığı yazı tura ile arkandan çöküyor, sekizinciden sonra kuş rastgele bir
anda geliyor. İkisi de iyi; ikisi de yüzen buz değil. Altıncı bölüm numarası
alan bir kursta on beş koşuda sıfır hata.

### Ölçülen fark

20. bölüm, tolerans ortalaması **0,483 → 0,385**. En dar sıçrayış değişmedi
(0,181), yani bölüm hâlâ geçilebilir; değişen şey kaç yolla geçilebildiği — ki
bu chapter'ın zorluk ölçüsü zaten tam olarak o.

20, 26 ve 30. bölümlerde var; sonsuz modda kurs başına bir kere, ve `floorGap`
onu da görüyor. 55 paket (45 node + paketleme + 10 tarayıcı).

---

## Yirmi dört cihaz tarandı, üç şey çıktı

"Her telefon her cihaz sorun çıkarmasın" diye yirmi dört gerçek ekran şekli
tarandı: SE1'den 4K'ya, katlanır telefonun kapalı hâlinden iPad Pro'ya, her
biri hem dik hem yan.

**Oynanış katmanı yirmi dördünde de temiz.** Hiçbir bölümde penguen arayüzün
altında başlamıyor, hiçbir tuş kırk pikselin altına düşmüyor, hiçbir ekranda
yatay taşma ya da konsol hatası yok. Arenanın geri çekilmesi de her ekranda
mantıklı davranıyor: dar telefonlarda ×1,00, tablet ve masaüstünde ×1,56–1,60,
ve penguen 26 pikselin altına hiç inmiyor (o da 280 piksel genişliğindeki
katlanır telefonun kapalı hâli, ki orada başka türlüsü yok).

Üç şey çıktı ve üçü de düzeltildi.

### Yeni oyuncunun gördüğü ilk ekranın düğmesi ekranda değildi

Ad sorma kartı, yan tutulan **her** kısa telefonda taşıyordu: 568×320'de
"Başla" düğmesi altı yedi piksel aşağıda. Bu, oyunu ilk açan birinin gördüğü
ilk ekran ve tek eylemi o düğme.

Kaydırmak yerine sıkıştırıldı, ve sırası önemli: önce boşluklar ve iç kenar
payı (okumaya hiçbir bedeli yok), sonra portre, sonra başlığın altındaki
açıklama — "Adın" yazan bir kutuya ad yazarken bir oyuncunun vazgeçebileceği
tek satır o. Küçük punto **kalıyor**: adın cihazdan çıkmadığını söyleyen cümle
o, ve küçük ekranda kaybolan bir gizlilik sözü, sözsüzlükten kötüdür.

### Bölüm sonu kartı yan telefonda tek sütuna düşüyordu

Kart üç sütuna 44 rem genişlikte geçiyor; altında tek sütun oluyor. 667×375'te
o tek sütun **630 piksel**, ekran 375 — ve sonraki bölümü başlatan düğme 22
piksel aşağıda.

Kart o ekranlarda geniş değil, **yüksek**: yan tutulan telefonun 568 pikselik
genişliği boş dururken bir sütun alttan taşıyor. Artık satır düzeni "yeterince
geniş **ya da** gerçekten kısa" ekranlarda da geçerli — ki o telefonlar tam
olarak bu şekil. 568×320'de kart 586 pikselden 393'e indi.

### Arena ilk karesinde yanlış kutuya göre çerçeveleniyordu

`startLevel` kamerayı tek bir kare çizilmeden önce ortalıyor, geri çekilme ise
ilk `draw` içinde hesaplanıyor — yani arenanın ilk karesi 960 birimlik görüntü
için çerçevelenmiş, sonra görüntü 1410 oluyordu. Bölüm yanlış yere bakarak
açılıp yarım saniyede yerine kayıyordu. Geri çekilme değişince kamera yeniden
yerleştiriliyor.

### Ve kalıcı test yedi şekle çıktı

Beş şekil geçerken dört gerçek telefon geçmiyordu: 390'dan **kısa** her yan
telefon. Listeye ikisi eklendi — hâlâ kullanımda olan en kısa yan telefon
(568×320) ve hemen üstündeki (667×375).

---

## Arena bir odaymış: kamera geri çekildi, ve resim durdu

Önceki turda iki şey ölçülmüş, yazılmış ve **yapılmamıştı**, çünkü ikisi de
tasarım kararıydı. İkisi de yapıldı.

### Oda ekrandan genişti, ve daraltılamıyor

Arena 1500 birim, masaüstü görüntüsü 960. Bölümün kendi kurduğu duracak yerde
dururken hattı çizen atıcı masaüstünde **%87** oranında ekran dışındaydı.

Önce ucuz yol denendi — arenaları daraltmak, yeni hiçbir makine istemiyor — ve
**besteci reddetti**: 1300 birimde 74. bölüme temiz hat kuramıyor, 1150'de
71'i, 960'ta 67'yi kaybediyor. Bir düello cevabından geriye doğru kuruluyor ve
hat o yeri istiyor. Genişlik dolgu değil, chapter'ın kendisi.

O yüzden kamera geri çekiliyor, ve yalnızca kar topu bölümünde, çünkü yalnızca
orası bir oda; geri kalan her şey bir yol, ve bir yol ekran ekran varılmak
üzere yapılmıştır. Sonsuza kadar da değil: penguen gerçek ekranda 34 pikselden
küçülmeyecek kadar. Tek cümle, üç ekranda üç farklı doğru cevap:

| Ekran | Geri çekilme | Penguen | Atıcı ekran dışında |
|---|---|---|---|
| Masaüstü 1280×720 | ×1,47 | 45px | **%87 → %0** |
| Telefon yatay 844×390 | ×1,00 | 33px | %3 |
| Telefon dikey 390×844 | ×1,05 | 34px | %100 |

Dik telefonda oda bakılmaya değer hiçbir ölçekte sığmıyor ve orada doğru cevap
**geri çekilmemek**; o ekranı hattın kenar işaretleri taşıyor. Masaüstünde ise
76. bölümün tamamı tek ekranda: beş kapıcı, iki gözcü, kaya, ince buz, buzlu
zemin, üç yüklü balık ve bütün hatlar.

### Ve kamera her adımı takip etmeyi bıraktı

Bir arenada tek bir noktanın doksan piksel sağına soluna beş saniye gidip
gelince kamera **1185 piksel** yol yapıyordu — yan öncü kaldırıldıktan sonra
bile. Hiç durmayan bir resim oynanmaz, okunur.

Artık ekranın ortasında kameranın cevap vermediği bir kutu var: içindeyken
kamera kıpırdamıyor, dışına çıkınca kutuyu itiyorsun. Aynı ölçüm **1185px →
0px**.

Kutu eksen ve chapter başına ayrı, çünkü risk her yerde aynı değil:

| | Yatay | Dikey |
|---|---|---|
| Sahanlık | 86 | 28 |
| Arena | 120 | 40 |
| Dağ | 44 | 30 |
| Deniz | 70 | **0** |

Yatay kutu koşarken kapanıyor — koşmak gerçekten gitmektir — ama arenada
kapanmıyor, çünkü bir odada hızlı gitmek bir yere gitmek değil. Dikey kutu
düşerken açılıyor, çünkü düşüş öncüsü zemini göstermek için var ve kutu onun
ilk yarısını yerdi.

**Denizin sıfırı tahmin değil.** Kural şöyle kuruldu: *kutu, görünen bir şeyi
gizlemeyecek.* Sonra yetmiş altı bölümün her buzunun üstüne penguen kondu,
kamera oturtuldu ve kutunun izin verdiği en kötü yöne itildi. Sahanlıkta en dar
tepe payı 40 piksel, dağda 44 — ikisi de kutuya yer bırakıyor. Denizde nefes
deliği masaüstünde tam şeridin kenarında çıkıyor, yani orada harcanacak pay
yok. Riskli olduğunu tahmin etmiştim; hangi sayıda riskli olduğunu ölçüm
söyledi.

Aynı tarama bir şey daha gösterdi, ve ölçülünce **yanlış alarm** çıktı: 53 ve
61. bölümlerde birer nefes deliği yan tutulan telefonda şeridin altında
görünüyordu, ama delik ekranda 65–175 arasında ve şerit 97'de bitiyor — üst
kenarının otuz iki pikseli kırpılıyor, kalan yetmiş sekiz piksel ve içine
girilen ağzı görünüyor. Tarama deliğin tavandaki üst kenarını okuyordu, oysa
yüzücünün baktığı yer orası değil. `docs/YAPILACAKLAR.md` §2.9'da duruyor ki
bir dahaki sefere yeniden keşfedilmesin.

---

## Kamera: doğru boyda bakıyordu, yanlış yere

Şikâyet şuydu: pengu yukarıdayken aşağısı ekranda tam gözükmüyor. Ölçüldü ve
tek bir satırdan çıkıyordu.

Üst şerit ve dokunmatik tuşlar tuvalin **üstüne** çiziliyor, yani görüntünün
altı ve üstü oyuncunun değil. Kamera ise pengueni görüntünün tamamına göre
çerçeveliyordu. Yan tutulan bir telefonda görüntü 658 birim; şerit 97, tuşlar
172 alıyor, gerçekten görünen bant **389**. Tırmanışın "%64"ü o bandın
**%83'üne** denk geliyor ve ayağının altında bir buçuk gövde dünya kalıyor.
Sayı 64 diyor, ekran 83 gösteriyor, ve projede bu farkı görebilen hiçbir ölçüm
yoktu.

Üç değişiklik:

**Oran banda göre.** Masaüstünde on dokuz piksel oynuyor, yan telefonda %83 →
%58.

**Ayağının altına bir taban: en az iki gövde.** Bilerek geniş ekranların zaten
tutturduğu sayıya ayarlandı, böylece tek bir duruma dokunuyor ve masaüstü,
tablet, dik telefon bir piksel kıpırdamıyor. Yükseltmek ayrı bir karar ve
kendi başına savunulmalı; bir taban olarak kaçak geçirilmemeli.

**Düşerken aşağı bakmak.** Oyunda kör yapılan tek şey düşmekti: çerçeve
pengueni takip ettiği için dört yüz piksellik bir düşüşte ekran dururkenki
resmin aynısını gösteriyor, ineceğin buz ekranın dışından geliyordu. Oysa bu
oyunda her gidiş önden bakılıyor — koşu yana, tırmanış yukarı. Düşmek de bir
gidiş. İnerken 230 piksele kadar, zıplarken yalnızca 70 (bir zıplama kısadır
ve başladığı yerde biter), duvara tutunurken sıfır (duvardaki bir tırmanıcının
dikey hızı saniyede birkaç kez yön değiştirir ve ona cevap veren kamera deniz
tutar). Düşüş hızlandıkça takip de hızlanıyor, yoksa eğim çizilir ve hiç
varılmaz.

Ölçüm, yan tutulan telefonda saniyede 1163 piksel düşerken, penguenin ayağının
altında görünen dünya:

| | Önce | Sonra |
|---|---|---|
| Düşerken görünen zemin | **−51px** | **156px** |

Eksi işareti yazım hatası değil: eski kamerayla hızlı düşen penguen tuşların
arkasındaydı.

Ve bir de şu çıktı: kamerayı yerleştiren kod ile takip ettiren kod aynı üç
oranın iki ayrı kopyasıydı. Hiç anlaşmazlığa düşmemelerinin tek sebebi
kimsenin birini değiştirmemiş olması. Tek bir `_cameraTarget` oldu, ve
`tests/camera.mjs` ikisinin duran bir penguende aynı şeyi söylediğini de
kontrol ediyor.

### Ve aynı ölçüm arenada çok daha kötü bir şey buldu

Arena **1500** birim geniş, masaüstü görüntüsü **960**. Bölümün kendi sözleşmesi
"kol geri gider, hat buzun üstüne çizilir, o süre senindir" diyor — ama çizici,
görüntüden çıkan rakipleri tamamen atlıyordu. Bölümün kendi kurduğu duracak
yerde dururken:

| Ekran | Hattı çizen atıcı ekran dışında |
|---|---|
| Masaüstü 16:9 | **%87** |
| Telefon dik | **%100** |
| Telefon yatay | %3 |

62. bölümde — ekranında "yukarıdaki sana atıyor" yazan öğretici bölümde — sana
atan penguen ekranda değildi.

Artık gövde eleniyor, telgraf elenmiyor: ekranı kesen hat, onu çizen kol
ekranda olmasa da çiziliyor, ve kol arkasında kaldığı kenara bir işaret alıyor —
hangi yönden ve ne kadar vaktin kaldığı, tek bakışta. Hareket azaltma açıkken
de çiziliyor, çünkü o modda hat zaten çizilmiyor ve geriye kalan tek ipucu
rakibin duruşu, yani ekran dışındaki şey.

Bu bir yama. Odanın ekrandan geniş olması tasarım gerilimi olarak duruyor ve
iki yolu da bedelli; ölçü `docs/YAPILACAKLAR.md` §2.6'da.

### Ve arenada yan öncü kaldırıldı

Yan öncü — kameranın gidiş yönüne doğru öne bakması — *yolculuk* için var. Bir
tırmanış ekrandan dar, yani bakılacak bir ön yok; zaten sıfırdı. Bir arena ise
bir **oda**: tek bir sahnede bilerek ileri geri yürüyorsun, ve oyun bu farkı
zaten biliyor — kar topu bölümünde `progress` mesafe değil, kalan kapıcı
sayıyor.

Ölçüldü: tek bir noktanın doksan piksel sağına soluna beş saniye gidip
gelirken kamera öncüyle **2227**, öncüsüz **1524** piksel yol yapıyor. Tam
olarak konumları okumak üzerine kurulu bir bölümde üçte bir fazla resim
hareketi. Her fikir değiştirdiğinde savrulan bir kamera, oyunla tartışıyor
demektir.

Kalan 1524 piksel "kamera pengueni takip ediyor"dan geliyor ve cevabı bir ölü
bölge — ölçüsü alındı, yapılmadı, gerekçesi `docs/YAPILACAKLAR.md` §2.8'de:
his kararı, ve his kararı gerçek cihazda oynayanın.

Yeni paket dört gerçek ekran şeklinde, yetmiş altı bölümün hepsinde koşuyor.
54 paket (44 node + paketleme + 10 tarayıcı).

---

## Denizin bütçe modeli: denendi, ölçüldü, geri alındı

Dalış bölümünün altı seviyesi hedef bandının üstünde kolay duruyor ve şüphe
tek bir yerdeydi: **rezerv**, yani bir bacağın sonunda nefes almak için
saklanan pay. Tek bir çarpanla fiyatlanıyordu ve o çarpan sütunun **en kötü
noktasından** okunuyordu — oysa yüzeye çıkan bacak akıntı bandını yalnızca
kısmen geçiyor. Bacak, bandın tamamını bandın hızıyla ödüyordu, ve fark yirmi
puana varıyordu.

Dürüst model yazıldı: rezerv artık bacak bacak, her bacak gerçekten yüzüldüğü
yerde, `swimCost` ile fiyatlanıyor — dünyanın okuduğu zone'ların aynısıyla,
ikinci bir aritmetik kopyası olmadan. Yolda üç ayrı şey de çıktı ve üçü de
gerçek hatalardı: uzunluğu verilmemiş bir bant nokta testine sıfır genişlik
gösteriyor (büyütülmeden sorulunca rezerv durgun su okuyor), baca rezervi
`run` üstündeki üç yüz piksellik tabanı kaçırıyordu, ve baca rezervi **mevcut**
hattan okunuyordu — oysa baca *aşağıda*, yani pahalı hat buzun hemen
altındaki.

Sonra ölçüm konuştu:

| | Önce | Düzeltilmiş model |
|---|---|---|
| 52 Akıntı | %45 | %42 |
| 53 Testere Dişi | %36 | %33 |
| 54 Buzul Karnı | %22 | %25 |
| 56 Kara Su | %31 | %33 |
| 59 Leopar ve Akıntı | %2 | **bitirilemedi** |

**Pay hata değilmiş.** Çoğu, kusursuz bir hattın maliyeti ile *yüzülebilir* bir
hattın maliyeti arasındaki fark — ve eski rezerv onu kazara karşılıyordu. Payı
sıfırlayınca 59 yüz elli piksel uzadı ve çözücü, ki oyuncunun yüzdüğü gibi
yüzüyor planın çizdiği gibi değil, çıkışa ulaşamadı.

Paya bir isim verip ayarlamak da kurtarmadı: 1,12'de 57 bitirilemedi ve dört
bölüm *kolaylaştı*; 1,04'te on beşi de geçiyor ama iki bölüm üç puan sıkışırken
iki bölüm iki puan gevşiyor. Net sonuç sıfır, bedeli chapter'ın bütün bütçe
modelini yeniden akıtmak. Bu dosyanın başka bir yerinde yazdığı kuralın
aynısı: yerel olarak doğru ama her bölümü yeniden akıtan bir değişiklik
iyileştirme değildir.

Geri alındı. Kalan şey ölçüm: bu altı bölümün kolaylığı tek bir modelden
gelmiyor, ve sıkıştırmak isteyen tek tek planlara bakmalı — 58 ile 59'da işe
yarayan buydu.

---

## Arenanın sekizinci fiili: buzlu zemin

`tools/variety.mjs` ikizler turundan sonra en tekrarlı bölüm olarak **kar
topunu** gösterdi: on beş arena, **yedi** fiil, ve on beş çiftin beşi birebir
aynı dağarcık.

```
62–76   7 fiil   5/105 çift %80+ aynı  (%5)
```

Sayıyı kapatmanın iki yolu vardı ve biri yanlıştı. Ölçüyü, arenanın gerçekte
bölümleri birbirinden ayıran şeyi — düello sayısı, nişan periyodu, duruş yeri —
okuyacak şekilde genişletmek sayıyı düşürürdü ve oyunu değiştirmezdi. Bu
projenin kendi kuralı bunu zaten yazıyor: bir vekili ölçen ölçüm, vekilin
iyileştirilmesini sağlar. Chapter IV'ün dağarcığı **gerçekten** oyunun en
incesi, ve eksik olan belliydi.

### Eksik cümle

Arenanın bütün dağarcığı **hat** hakkında bir tartışma. Kaya bir hattı yiyor,
siper o yemeye süre koyuyor, kavisli atış üstünden geçiyor, düşen buz "o kare
yanlış" diyor. Hepsi bir **yer** hakkında bir cümle — ve bölümün duracak yere
*gitmek* hakkında söyleyecek hiçbir şeyi yoktu. On beş arenanın on beşinde her
düello tek bir zemin parçasında tek bir anda duruluyor, ve oraya yürümek
bedavaydı.

Buzlu zemin o cümle. Duracak yer yerinde, kapıdakinden geçen hat eskisi kadar
temiz, ve penguen cevabın üstünden kayıyor: doğru kurulmuş bir plan yanlış
oynanıyor. Sahanlığın kaygan buzu, değiştirilmeden — aynı floe türü, aynı
sürtünme, aynı çizim.

Tek kuralı planın bitmesini bekliyor, o yüzden kaya ve siper gibi `build`
içinde yerleşiyor: **en az bir duracak yer sağlam buzda kalır.** Bütün
cevapların üstünü birden kaplayan bir yama daha zor bir arena değil, bölümün
tek sözünün geri alınması.

### Beş ikizin dördü kırıldı, biri bilerek duruyor

| Çift | Verilen | Neden o |
|---|---|---|
| 68 Çapraz Ateş ~ 73 Gözcüler | 68'e **buzlu zemin**, 73'e **siper** | 68'in kendi notu "geriye yalnızca üstünden geçtiğin zemin kalıyor" diyor — yani bölüm yolculuk hakkında. 73 "güvenli köşelere inanmayı bırak" diyor, ve bunu en iyi bir köşeyi **ödünç vererek** anlatıyor |
| 65 Kaya ~ 69 Dar Alan | 69'a **ince buz** | 69'un cevabı "iki yarı arasında durmadan hareket et" — yani bir şerit var, şerit cevap, ve cevabın bedeli yoktu |
| 64 Tepedeki ~ 74 Aynı Anda | 74'e **buzlu zemin** | Her rakip aynı vuruşta atıyor, yani bütün bölüm tek bir an: sayımda başka bir yerde ol. "Başka bir yer" ölçülmüş bir mesafe |
| 70 Sabırsızlar ~ 75 Kalabalık | 75'e **düşen buz** | Zeminde hiçbir şey, tavanda hiçbir şey: chapter'ın tek tamamen penguenlerden kurulu arenası. Tavan, bir *yerin* yanlış olduğunu söyleyebilen tek şey |

76 da aldı, çünkü oyunun son bölümü chapter'ın bildiği her kelimeyi
söyleyebilmeli.

**62 Kapıdaki ~ 63 İki Kapıcı bilerek duruyor.** İkisi de saf düello, ve 62'nin
ekranında bir tabela var: biri bir kapı, öteki iki kapı ve aralarında yarım
vuruş. Bu, chapter'ın kendini tanıtması — denizdeki 47'nin 48–51'in alt kümesi
olmasıyla birebir aynı şey, ve o da kusur değil.

```
62–76   8 fiil   1/105 çift %80+ aynı  (%1)
```

### Bir pikselin taşıdığı yük

Yama zeminle **aynı hizada** değil, bir piksel yukarıda. İlk sürüm hizalıydı ve
ölçüm onu reddetti: aynı yükseklikte iki floe varken penguenin zemini hangisi
önce cevap verirse o oluyor, ki o da arena boyu uzanan sağlam buz — yani
bölümde kaygan olmayan bir buzlu zemin çizilmişti. Kayma beş piksel çıktı,
çıplak buzun aynısı. İnce buz da aynı sebeple bir piksel yukarıda duruyor ve
yazıldığı günden beri öyle.

Ve o piksel ikinci bir kural doğurdu. `tests/checkpoint.mjs` 74. bölümde düştü:
diriliş koruması penguenin **bütün gövdesini** yere koyuyor ve gövde katı bir
şeyin içindeyse noktayı reddediyor, dolayısıyla kenarı bir bayrağa yarım gövde
yaklaşan bir yama o bayrağı her ölümde sessizce çöpe atıyor. Bayrak ile yama
**bir buçuk piksel** kaçırmıştı. Besteci artık böyle bir yamayı reddediyor, ve
planda yama iki yüzde bin sağa kaydı — çünkü besteci reddedince onu
*küçültüyor* (230px → 184px), ve istendiğinden küçük teslim edilen bir parça
bölümü tarif etmeyi bırakmış bir plandır.

### Ve çizimi, ekran görüntüsü alınana kadar yanlıştı

Kaygan buzun tek işareti üç tane sabit beyaz çizgiydi, ve bu yalnızca kaygan
buz *bütün bir floe* olduğu sürece yetiyordu: floe'nun kendisi yama, yani
oyuncu **şekli** okuyor ve çizgiler sadece hangi şekil olduğunu söylüyor.
Arenada ise bölüm boyu uzanan bir zeminin üstüne serilmiş bir bant, ve orada
şekil hiçbir şey söylemiyor — karanlık bir zeminde üç çizgi süs gibi okunuyor,
ve cevabın üstünden kayan oyuncunun bunu neyin yaptığını anlamasının yolu yok.

Yüzey artık boyanıyor (uzaktan görülebilen kısım bu), çizgiler sayıyla değil
**genişliğe göre** aralanıyor, ve iki ucuna birer dikme çiziliyor — çünkü
aslında okunması gereken şey buzun nerede **başladığı** ve nerede **bittiği**:
fren yapacak oyuncunun ihtiyacı kenar, orta değil. Oluğun iki ucundaki kesik
çizgilerle aynı gerekçe.

Düzeltme sahanlığı da düzeltti: 5. bölüm Cilalı Buz'da kaygan floe'lar artık
sağlam olanlardan ilk bakışta ayrılıyor.

Bu arada bir hata da ekran görüntüsünden çıktı: yeni çizim floe'nun yüksekliğini
`h` diye okuyordu, ve o fonksiyona `h` hiç geçirilmiyor. 43 node paketinin
hepsi yeşilken oyun tarayıcıda açılmıyordu. Hiçbir node testi tuvale bakmıyor;
bakan tek şey gözdü.

`tests/slick.mjs` altı şeyi kontrol ediyor: istenen arenalara ulaştı mı, kırılan
değil kaygan bir zemin mi, her arenada sağlam buzda duracak bir yer kaldı mı,
başlangıç temiz mi, her bayraktan bir gövde uzakta mı, hiçbir atış hattının
altından çıkıyor mu — ve gerçek `World` içinde penguen buzda 45 piksel, sağlam
buzda 5 piksel kayıyor.

---

## Sonsuz modun tabanı üç parçaya daha ulaştı

`floorGap` derinleşen koşuda sıçrama aralığının **alt** ucunu kapatıyor: en
kolay sıçrama kolay olmaktan çıkıyor, en zoru hiç kımıldamıyor. Ölçüldüğünde
dört örnek bölümden ikisi kımıldamıştı, ikisi kımıldamamıştı — ve neden dialde
değildi:

- `summit` basamaklarını, kendisine ne verilirse verilsin, düz 0,36'ya koyuyordu
- `geysers` zaten bir `gap` alıyordu, üretici hiç geçirmiyordu
- `bait` çıkış basamağını sabit 0,26'ya koyuyordu

Üçü birlikte derin kursların yarısında çıkıyor. Yani tabanın hiç uygulanmadığı
bir parça, kursların yarısında vardı. Planların ulaşamadığı bir dial, kimsenin
çeviremediği bir dialdir.

| Bölüm | Önce | Sonra |
|---|---|---|
| 296 | 0,434 | **0,384** |
| 299 | 0,515 | **0,448** |
| 302 | 0,454 | 0,455 |
| 305 | 0,428 | **0,353** |

Üstleri düz parçaların kullandığından dar tutuldu (0,46 ve 0,42), çünkü üçü de
**yükselen** bir sıçrama istiyor ve yükseliş aynı erişimden harcıyor. Her
tohumda son sözü doğrulayıcı ile `shelf-run` veriyor; ikisi de yeşil.

Yolda `bait` içinde bir isim çakışması çıktı: verbin kendi `gap`'i ile yemin
boşluk içindeki yerini tutan yerel `gap` aynı addı. Yerel olan `into` oldu —
biri bir sıçrama, öteki o sıçramanın içindeki bir yer.

---

## Denizdeki iki ikiz kırıldı

`tools/variety.mjs` aylardır aynı şeyi söylüyordu: oyunun en tekrarlı bölümü
denizin altı, ve orada **birebir aynı** dağarcığa sahip iki çift var.

- 54 Buzul Karnı ile 58 Kılçık — altı fiil, aynı altı fiil
- 59 Leopar ve Akıntı ile 61 Açık Deniz — yedi fiil, aynı yedi fiil

Bir çifti kırmak için ikisine de **ayrı birer** fiil gerekiyor: tek ekleme
6/7 = 0,86 yapar ve eşik 0,80. Dördü de aldı, ve dördünde de eklenen şey
bölümün kendi notunun zaten iddia ettiği şeydi:

| Bölüm | Eklenen | Neden o |
|---|---|---|
| 54 Buzul Karnı | `flume` | Adı "tavan alçalıyor". Geçit bir metrelik alçak tavan; oluk üç yüz metrelik, ve suyu yukarı itiyor — bu bölümün havası tabanda |
| 58 Kılçık | `current` | Sığ–derin diye giden ritmin iki ucu bugüne kadar aynı şeye mal oluyordu. Bant sütunun üstünde, yani sığ yarısı akıntıda, derin yarısı durgun suda |
| 59 Leopar ve Akıntı | `eddy` | Girdabın gözü denizdeki tek "cevabı bir yer olan" parça. Dış halkaya ikinci leopar konunca göz dinlenme olmaktan çıkıp karara dönüşüyor |
| 61 Açık Deniz | `flume` | Buzun bittiği yer bitmiyor, **daralıyor**. Sütunun üst ucundaki geçit bir boğaza takas edildi |
| 52 Akıntı | `flume` | Zincirleme: 59 girdabı alınca 52 onun alt kümesi oldu. İki yarısının arasına bir boğaz girdi |

Sayılar: III. bölümün tekrar oranı **%6 → %4**, ve kalan dört çiftin dördü de
47'nin 48–51'in alt kümesi olması — yani chapter kendini öğretirken her bölümün
bir şey eklemesi, kusur değil.

### Üç şey ölçüm sırasında öğrenildi

**Bir fiil eklemek, eklendiği bacağın bütçesini ister.** 58'in akıntısı ilk
olarak açılıştaki dört geçidin üstüne kondu ve besteci piksel sayarak reddetti:
4100px'lik bacak, 3927px'lik ciğer. Sığdırana kadar zayıflatmak, fark
edilmeyecek bir akıntı bıraktı. İkinci bacakta hem yer vardı hem de zorluk
aracının "gevşek" dediği bacak oydu; bant iki sayının birden istediği yere
gitti. Bölüm %29'dan **%15**'e indi (hedef %10).

**61'e nefes vermek onu kolaylaştırdı — ve geri alınamadı.** Açılış bacağı
eskiden tek ciğerin tamamıydı ve bölümün en zor bacağıydı. Oraya bir `vent`
konunca bacak ikiye bölündü, bölüm **%4'ten %32'ye** çıktı ve sonraki bacağa
hiçbir şey eklenerek geri indirilemedi: bestecinin o bacak için tahmini zaten
bütçe sınırında, gerçek maliyeti ise tahminin yirmi puan altında. Yani sınır
tahminde, oynanışta değil. `vent` geri alındı ve son geçit bir `flume`'a
**takas** edildi — ekleme değil takas, çünkü eklemeye yer yok. Bölüm %4 → %2
oldu, yani biraz da zorlaştı.

**Bir ikizi kırmak bir başkasını doğurabilir.** 59 girdabı alınca 52 Akıntı
onun alt kümesi hâline geldi (0,875) — çünkü 59 artık tam olarak 52 + leopar.
Girdabı 61'e taşımak işe yaramıyor: 61 de akıntı + leopar, yani aynı şey oradan
çıkıyor. Yani 52 kaçınılmaz olarak bir fiil almak zorundaydı, ve `open` gibi
anlamsız bir ekleme ölçüyü kandırmaktan başka bir şey olmazdı. 52'nin iki
yarısının **arasına** bir oluk kondu: ilk yarı derinliğin bir seçim olduğunu
öğretiyor, ikinci yarı bunu tersine çeviriyor, ve aradaki üç yüz piksellik
boğazda seçilecek derinlik yok.

İlk denemesi ilk yarıdaydı ve `tests/current.mjs` onu yakaladı. Uzunluğu
verilmemiş bir bant başladığı yerden **sonraki nefese** kadar uzuyor, ve
açılıştaki iki bandın ikisi de öyle — dolayısıyla ilk yarıya kazılan bir kanal,
duvarlarının üstünden akıntı bandı geçerek çizilmiş oluyor. Oyunda bir şey
bozulmuyor, çünkü boğazın üstündeki su katı buzun içinde ve hiçbir şey yapmıyor;
ama o test denizin penguen taşıdığını kanıtlamak için gerçek penguen'i ilk
bandın tam ortasına bırakıyor, ve bandın ortası duvar olmuştu. Nefes deliğinin
kapağı bantları kapatıyor; oluk kapağın öbür tarafında durgun suda, ve orada
bir nehrin içindeki delik gibi değil, boğaz gibi okunuyor.

Zorluk eğrisinin toplam sapması 3,8 → **3,0**.

---

## Ölçüm aleti kalıcı oldu, ve dördüncü fiil geldi

`tools/variety.mjs` artık projenin bir parçası. Her bölümün gerçekten çağırdığı
besteci fiillerini okuyup, aynı bölümdeki kaç çift bölümün neredeyse aynı
kelime dağarcığını kullandığını sayıyor. Yeni bir mekanik eklemeden önce ve
ekledikten sonra çalıştırılıyor.

Bir uyarı da dosyanın içine yazıldı: bestecinin değişken adı `build: (x) =>`
içinden **okunuyor**, tahmin edilmiyor. Önceki sürüm olası adları listeliyordu,
dalış bölümü bestecisine `d` diyor, ve oyunun **en tekrarlı bölümü** sıfır fiil
bildirip kusursuz göründü. Sessizce boş dönebilen bir ölçüm, ölçüm olmamasından
kötüdür, çünkü ona inanılır.

Sayılar, bu turdan önce ve sonra:

| Bölüm | Önce | Sonra |
|---|---|---|
| I (1–31) | %6 | %6 |
| II (32–46) | %48 | **%15** |
| III (47–61) | %60 | **%33** |
| IV (62–76) | %21 | **%16** |

### Çukur

Dalış bölümünün eksiği, kendi bölüm yorumlarının zaten iddia ettiği şeydi.
Derinlik bedavaydı. Artık su sütununun dibi soğuk ve bir ciğeri iki buçuk katı
hızla tüketiyor, üstelik basınç gibi derinlikle artan bir eğimle.

Yolda çıkan üç hatanın üçüncüsü en öğreticisi:

- İlk sürüm deniz tabanına çukur kazıyordu. Bölümün kendi adalet kuralı bunu
  anında reddetti: tavan hizasındaki bir yüzücünün beş yüz piksel inmesi
  gerekiyordu, ki bu yedi yüz piksel koşu ister — üç yüz piksellik bir parça
  dört bine çıkıp üç ciğer yedi.
- **Çukur göründüğünden uzundur.** Bölümdeki her kural bir ciğeri mesafeyle
  ölçüyor, o yüzden soğuk sudan geçen bacak gerçekte olduğu kadar uzun
  sayılıyor. Bütün eski kurallar dokunulmadan çalışıyor.
- O maliyet ilk olarak **düğüm başına etiket** olarak yazılmıştı: her rota
  düğümü, durduğu yerdeki hızı taşıyor. Her kontrolden geçiyor ve oyuncuyu
  boğuyor. Çukur bir *yer*, ve bir bacak ona girip çıkıyor; bacağı tek ucundan
  fiyatlamak çıkış yolunu ucuza sayıyor. 60. bölüm tertemiz doğrulanıp
  bitirilemiyordu. `swimCost` artık bacak boyunca örnekliyor, hem de dünyanın
  her karede çağırdığı fonksiyonla.

Ve bir dördüncüsü, tek tek bölüm ayarlamaktan kurtaran: **plan ideal bir yüzüşü
fiyatlıyordu.** Rota çizimi çukurun dudağına yapışır, kusursuz derinlik tutar,
hiç aşmaz. Kimse öyle yüzmez. Buz altında duramaz ve asılı kalamazsın, yani
gerçek bir penguen kendi çizgisinin biraz altındadır — ve eğim olduğu için
"biraz" bütün geçiş boyunca birikir. `TRENCH.sag` artık her fiyatı, kendi
planının bu kadar altında yüzen biri için veriyor. İki bölüm elle ayarlanmıştı;
ikisi de bir sonraki değişiklikte yine bozulacaktı, çünkü hata o bölümlerde
değildi.

---

## Denetim: on bulgu, onu da kapandı

Bir üst düzey tarama istendi ve "her şey okey" çıkmadı. On bulgu, ikisi gerçek
hata, ikisi yalan söyleyen yorum, ikisi ürün boşluğu, biri işletme riski.

### Gerçek hatalar

- **Ödüllü video hatası butonu yutuyordu.** `await doubleUp(...)` bir `try/catch`
  içinde değildi. Yerinde duran sayaç asla hata vermediği için görünmüyordu —
  ama gerçek bir SDK'nın ilk yaptığı şey reject etmektir, ve o an buton donmuş
  bir geri sayımla sonsuza kadar kilitli kalırdı. Artık hata butonu olduğu gibi
  geri koyuyor: hiçbir şey ödenmiyor, hiçbir hak harcanmıyor.
- **Nefes çubuğundaki soğuk halka takılı kalıyordu.** `drain` erken `return`'ün
  altında hesaplanıyordu, yani çukurun içindeki bir delikten nefes alırken
  ölçek "bu sana iki katına mal oluyor" demeye devam ediyordu. Hiçbir şeyin
  mal olmadığı anda öyle diyen bir gösterge, göstergesizlikten kötüdür.

### Yalan söyleyen yorumlar

- `TRENCH.tint` "yalnızca çizici okur" diyordu ve **kimse okumuyordu**. Artık
  soğuğun rengi gerçekten oradan geliyor.
- `skuasEscaped` "bir görev bunu istiyor" diyordu ve **hiçbir görev istemiyordu**.
  Dahası `skua` görevinin metni ("pençesinden kıl payı kurtul") tam olarak
  boğuşmayı tarif edip **dalış ıskasını** sayıyordu. Metin ve sayaç artık aynı
  şeyden bahsediyor, ve boğuşmanın kendi görevi var.

### Ürün boşlukları

- **Sonsuz mod bütün yeni işi kaçırıyordu.** Sessiz alan, yem, rüzgâr boşluğu,
  yükselen hava, cilalı lanet, yüklü balıklar, hız çarpanı — hiçbiri yoktu. 76.
  bölümü bitiren, yani en sadık oyuncu, elle yapılmış bölümlerden belirgin
  şekilde fakir bir oyun oynuyordu. Hepsi eklendi.
- **Dört yeni mekanikten üçü hiç konuşmuyordu.** En kötüsü çukurdu: nefesin daha
  hızlı bitiyor ve sebebini söyleyen hiçbir şey yok, yani oyuncu öğrenmiyor,
  sadece ölüyor. Dört mekanik de artık ilk karşılaşmada bir kez konuşuyor.
- **Hız çarpanı yalnızca I. bölümdeydi.** "Son üçte bir hızlanır" kuralı oyunun
  dörtte birine uygulanmıştı. Dördünde de var, ve dağdaki serak kanıtı artık
  oyunun gerçekten çalıştığı saate bakıyor.

### Ve sonsuz mod, yemin kendi hatasını gösterdi

Yem fiili üretilen bölümlerde çağrılınca **yirmi sekiz bölümde** kaçan buzu
sağlam buzun altına koydu — yani tam olarak o fiilin önlemek için yazıldığı hata,
fiilin kendisi tarafından geri getirildi. Sebebi: yem, buz koyup imleci
ilerletmeyen tek şeydi. Sadece yer ayırtmak daha da kötüydü — sonraki buzu bir
zıplamanın ötesine itti ve doğrulayıcı sonucu anında yakaladı: karşıya geçmenin
tek yolu kaybolan buza basmak oluyordu. **Zorunlu yem, tuzak değil, hikâyesi olan
duvardır.** Parça artık `hush` ve `pendulum` gibi kendi karşı yakasını da koyuyor.

### İşletme riski

Tek dosya sürümü 885 KB'a çıkmıştı, sınır 900. Kaynağın %38'i yorum ve bu bilerek
öyle — ama yorumlar depoyu okuyan insan için, oyunu indiren telefon için değil.
Paketleyici artık yorumları kaldırıyor: **885 KB → 589 KB.** Yalnızca tam satırlar,
şablon dizelerinin içine dokunmadan, ve güvenli olduğunun kanıtı paketlenmiş
dosyayı gerçek tarayıcıda açıp oynayan test.

Bir de: readme'nin "24 paket" iddiası gerçekte 30'du. Sayı düzeltildi **ve**
denetlenebilir hale getirildi — belgeye yazılan bir sayı kayar, o yüzden artık
lint çalıştırıcıyla karşılaştırıyor.

---

## Üç bölüme üç yeni fiil, çünkü sorun tembellik değil kelime yokluğuydu

Bölümlerin birbirine benzemesi bir kanaatti; ölçüldü ve sayı çıktı. Her bölümün
kullandığı besteci fiillerini çıkarıp karşılaştırınca:

| Bölüm | Kaç fiil | %80+ aynı çift |
|---|---|---|
| I (1–31) | 17 | 30 |
| II (32–46) | **7** | **50** |
| IV (62–76) | **4** | **22** |

Bu tembel besteleme değil, **söyleyecek kelime yokluğu**. On beş bölümü dört
fiille birbirinden ayıramazsın. Cevap bölümleri karıştırmak değil, fiil eklemek.

- **Sessiz alan** (sahanlık): içeride yerçekimi %42'ye iniyor, menzil iki yöne
  birden ikiye katlanıyor, penguen havada bir buçuk saniye kalıyor. Oyunda
  bütün öteki sayıların ölçüldüğü sayıyı değiştiren tek şey.
- **Sallanan buz** (dağ): ipin ucunda bir buz kütlesi, periyodu `2π√(L/g)` —
  yani ipin boyundan geliyor, bir ayardan değil. Uçlarda duruyor, ortada
  penguenden hızlı geçiyor.
- **Kavisli atış** (arena): kayanın üstünden aşan kar topu. Bölümün tek statik
  cevabı olan "siperin arkasına geç"i elinden alıyor ve karşılığını saniyeyle
  ödüyor, çünkü kavis düz atıştan çok daha yavaş.

Ölçüm sonrası: dağda 50 → 37, arenada 4 → 5 fiil.

### Kanıtlar üçünü de öğrenmek zorunda kaldı, ve bu gerçek hatalar açığa çıkardı

Çözücüler dünyayı `World` kurmak yerine kendileri modelliyor — hızlı, ve tam da
çürüyen türden bir tekrar:

- **Yerçekimini sabit sanıyorlardı.** Sessiz alanı olan her bölümü geçilemez
  ilan ettiler. Artık yerçekimi terimi dünyanın kendi çağırdığı `hushAt`
  fonksiyonundan geliyor.
- **Geometriyi fotoğraf sanıyorlardı.** Buzlar bestecinin koyduğu yerde durur ve
  hiç kımıldamazdı. Sarkaç, konumu mekanizmanın kendisi olan ilk şey, o yüzden
  fotoğrafın film olması gerekti.
- **Kar toplarını hep düz sanıyorlardı.** Kavisli atış eklenince iki arena
  kazanılamaz oldu: çözücü yayın kafasının üstünden geçtiğini görüp "bir şey
  gelmiyor" dedi ve tepesine inerken bekledi.
- **Tırmanış çözücüsünün en uzun basılı tutması yarım saniyeydi**, çünkü o
  bölümdeki her zıplama üçte iki saniyede biter. Oyuncunun bariz biçimde
  yapacağı şeyi — basılı tutmaya devam etmeyi — ifade edemiyordu.

### Ve iki şey bilerek yapılmadı

**Dağda sessiz alan yok.** Beş yüz piksellik uçuş altı yüz piksellik şafta
sığmıyor; sığdırmanın tek yolu çevresindeki her adımı sınırına dayamak, ki bu
tam da bu dosyanın uzun uğraşla temizlediği kırılganlık. Sebep, fiilin duracağı
yere yazıldı.

**Her adımın iki yanını hesaplayıp ucuz olanı seçen sürüm çöpe atıldı.** Sınıra
dayanmış bir adımı kurtarıyordu, ve on iki sağlam adımı yeniden yönlendiriyordu;
iki bölüm daha yukarıda çözülemez oldu. Buradaki geometri bir zincir. Yerel
olarak daha iyi ve genel olarak kanıtsız olan şey daha iyi değildir.

---

## Zıplama tuşu dört şey demeye başladı

Yeşil çürük balık uzun süre oyundaki en ilginç pikaptı ve sebebi tek cümleyle
söylenebilir: oyuncuya verebileceğin başka her şey bir sayıdır, sayı ise fiil
değildir. Yön algısını ters çevirmek fiildi.

Üç yeni renk aynı fikrin iyi tarafı. Hepsi zıplama tuşunun ne demek olduğunu
birkaç saniyeliğine değiştiriyor, çünkü tek düğmeli bir oyuna ikinci düğme
eklemeden fiil eklemenin başka yolu yok:

- **Yay** (turuncu): bir tek zıplama, iki katı. Harcanmazsa kendi kendine
  boşalıyor, yani yanlış anda yutulan bir yay seni senin seçmediğin bir yere
  fırlatıyor. Sessizce buharlaşan bir yay bedava hediye olurdu.
- **Kuantum** (mor): havada bir kez bas, üç buçuk gövde ileridesin. Hızını
  koruduğu için asla yükseltmiyor, sadece taşıyor; hiçbir zıplamanın
  yetişemeyeceği bir boşluğu geçiyor ve kendi başına bir metre tırmanamıyor.
  Duvarın içine de sokmuyor: ışınlanma çeyrek gövdelik adımlarla süpürülüyor,
  son *boş* nokta kazanıyor.
- **Gevşeme** (turkuaz): sen havadayken senin dışında her şey üçte bir hızda.
  Yerde çalışmıyor, çünkü genel bir ağır çekim düğmesi her bölümü kolaylaştırır
  ve hiçbirini ilginçleştirmez. Su altında da çalışmıyor, çünkü orada düğme
  zaten derinlik kumandası.

Dördüncü bir lanet de geldi: **cilalı**. Diğer üç çürük balık pengueni
değiştiriyor, bu zeminin *ne olduğunu* değiştiriyor. Hızın, zıplaman ve menzilin
aynı kalıyor; hiç düşünmediğin tek şeyi kaybediyorsun, durabilmeyi.

### Kuşun elinden kurtulmak

Skua seni kapardı ve iş biterdi: bir saniye taşınma, sonra ölüm, arada
yapabileceğin hiçbir şey yok. Cevap veremediğin bir pusu, üstüne uzun bir
animasyon giydirilmiş yazı-turadır.

Artık boğuşma. İki saniyen var, beş hızlı basış seni kurtarıyor, basışlar
arasında kavrama geri sıkışıyor, yani yavaş tıklamak sönümlemeyle yarışır ve
asla yetişmez. Kurtulmak da güvende olmak değil: kuşun kendi momentumuyla, o an
altında ne varsa onun üstüne savruluyorsun.

### Adalet sözleşmesi aynı kaldı

Bütün bölümler hiçbir şeye sahip olmayan ve hiçbir şey toplamayan bir penguene
göre kanıtlanıyor. Dört çözücü ve iki doğrulayıcı hiçbir balığa dokunmadığı
için değişmedi bile: `worldRate` hiçbir balık yokken tam olarak 1, yani
`dt * 1` son bitine kadar `dt`. Bu bir optimizasyon değil, emniyet özelliğinin
kendisi.

`charged-fish.mjs` yirmi iddiayı gerçek `Player` ve gerçek `World` üstünde
ölçüyor, `browser-charged.mjs` aynısını gerçek sayfada yapıyor. İkisi birlikte
yazıldıkları gün iki gerçek hata buldu:

- **Kendi kendine boşalan yay üçte birine kırpılıyordu.** Değişken yükseklikli
  zıplama, düğmeyi bırakan oyuncunun sıçrayışını kısar; düğmeye hiç basmamış
  biri de tanımı gereği onu bırakmış sayılıyor. İstemsiz fırlatma, istemsiz
  olduğu için cezalandırılıyordu.
- **İki balık buzun içine düşmüştü.** Bölümler plandan besteleniyor, yani "şu
  buzun bir zıplama üstü" bir yer değil bir yükseklik: aynı satır bir bölümde
  açık havaya, diğerinde tünel tavanına denk geliyor. `nudgeClear` artık hepsini
  açığa taşıyor, hem de bestecinin *en sonunda*: ilk denemede her balık
  konduğu anda kontrol ediliyordu ve 76. bölüm balığı bir rakibin henüz var
  olmayan tüneğine koymuştu.

---

## Zorluk ölçülmeye başladı, ve ölçü kötü haber verdi

"Bu bölüm kolay" bir kanaattir, ta ki biri bir sayı üretene kadar. Projede
zaten bir sayı vardı ve yanlış olanıydı: bir boşluk erişimin içindedir ya da
değildir, ve bu, oraya ulaşmanın emek isteyip istemediği hakkında hiçbir şey
söylemez.

Alet çözücülerin kendisi çıktı. İlk buldukları yolda durmalarına izin
verilmezse **kaç yol olduğunu** söylüyorlar. Yüz tuş dizisinin yaptığı bir adım
cömerttir, ikisinin yaptığı bir adım duvardır, ve ikisi de eşit derecede
geçilebilirdir: zorluk, adaletsizlik ölçülmeden ölçülüyor.

`tools/difficulty.mjs` ilk koşuşunda kendini ödedi:

- **Chapter I eksi %53 eğimliydi.** Kolaylaşıyordu.
- **Chapter III tek konusunu hiç tehdit etmiyordu.** Ciğerler hiçbir bölümde
  üçte birin altına inmiyordu.
- **Chapter II** hedeflenen rampanın üçte birinde ilerliyordu.
- **Chapter IV**'ün eğimi doğruydu, üç bölüm onu görmezden geliyordu.

Dördünün de artık tek bir sütuna sığan bir zorluk eğrisi var: `tight`,
`effort`, `breath`, `heat`. Değerler tahminle değil çözücüye sorularak
dolduruldu.

Yol boyunca öğrenilen iki şey dosyada duruyor. Birincisi: **yanlış şeyi ölçmek
hiçbir şey öğretmez.** Dağda tolerans denendi, iki kez, ve iki kez hiçbir şey
göstermedi; tırmanan kişinin hissettiği şey barın kendisi. İkincisi:
**emniyet ağları sessizce tavan olabiliyor.** Denizde nefes deliği açan
otomatik kural bütçenin %45'inde tetikleniyordu, yani bütçeyi yükseltmek
hiçbir şeyi değiştirmiyordu.

---

## Kaydedilmiş bir nokta, altındaki zeminden uzun yaşamamalı

Açılışlar düzeldikten sonra hata hâlâ duruyordu ve belirtisi başkaydı: oyun
açılır açılmaz penguen **gökten düşüyor** ve anında eleniyordu.

Sebep şuydu. "Devam et" daha önceki bir koşudan kaydedilmiş bir koordinatı geri
yüklüyor ve o koordinata körü körüne güveniyordu. Bir koordinat yalnızca onu
üreten bölümde bir koordinattır; bölümün açılışı düzeltilince aynı iki sayı
açık denizi göstermeye başladı. Penguen oraya konuyor, düşüyor, ölüyor ve ölünce
**yine aynı noktaya** konuyordu. Her açılışta, sonsuza kadar, kaydı silmekten
başka çıkışı olmadan.

Hiçbir kural çiğnenmediği için hiçbir şey fark etmiyordu: nokta, artık var
olmayan bir bölüm için kusursuz bir noktaydı.

- Oturum artık bölümün **şeklinin parmak izini** taşıyor. Tutmazsa oturum
  teklif bile edilmiyor, kayıttan siliniyor.
- Parmak izi tutsa bile nokta **bir zeminin üstünde mi** diye bakılıyor.
  Sürüklenmiş bir buz ya da erimiş bir zemin, geçerli bir noktayı geçersiz bir
  yere çevirebiliyor.
- Aynı kontrol her yeniden doğuşta da yapılıyor: bozuk bir nokta nereden gelirse
  gelsin ölüm döngüsü kuramıyor, bölümün başına düşülüyor.

Yanında küçük bir şey daha: başlık düğmesi 76. bölümden sonra "Bölüm 84"
diyordu, yani var olmayan bir bölüm. Üç ekran doğru kuralı zaten biliyordu,
dördüncüsü bilmiyordu; artık tek yerden geliyor.

`tests/browser-session.mjs` dört yolu birden sürüyor: geçerli oturum geri
geliyor mu, bayat olan atılıyor mu, boşluktaki nokta ölüm döngüsü kuruyor mu ve
sonsuz mod doğru adlandırılıyor mu.

---

## Bölümlerin bir arkası oldu, açılışlar saniyeyle ölçülüyor

31. bölüm başlar başlamaz öldürüyordu. Sebebi bir boşluk değildi: doğuş noktası
ilk buza **sabit seksen piksel** içeriden konuyordu. İlk buzlar iki yüz elli
piksel genişken bu doğru sayıydı, zorluk geçişinde daraltılınca sağa basan
oyuncuya üçte bir saniye kalıyordu. Sabit piksel, altındaki her şey değişirken
sessizce yanlış hâle gelen türden bir sayı.

Aramaya başlayınca ikinci bir şey çıktı ve daha kötüydü: **doğuş noktasının
arkasında hiçbir şey yoktu.** Sola yürümek 23. bölüme kadar her yerde yarım
saniyeden kısa sürede boğuyordu. Birinci bölümün tek tabelası "Yürü: ← →"
diyor. Denize düşmek oyunun kendisi; öğreticiye uyduğu için denize düşmek değil.

İkisi de mesafe hatası değildi, o yüzden mesafe kontrol eden hiçbir şey
göremezdi. Düzeltmeler yapısal:

- Açılış artık **saniye** cinsinden: her bölüm zemin bitmeden 0,6 saniye
  veriyor ve ilk buz bunu tutacak kadar geniş olmak zorunda. Piksel çürür,
  saniye çürümez.
- Her bölümün bir arkası var. İlk buz dünyanın soluna kadar uzatıldı ve arkasına
  penguenin indiği kaya yüzü kondu. Rota hiç değişmedi, çünkü rota buzun
  yalnızca sağ kenarını okuyor.
- Dağda taban genişletmek olmazdı: taban rotanın kendisi ve genişletince
  besteci iki basamağı yutup son tekmeyi dört yüz piksele çıkardı. Onun yerine
  tabanın iki yanına, suya kadar inen kaya omuzlar kondu. Fizik katı görüyor,
  rota hiç görmüyor.

İki yeni test bunu bir daha olmaz hâle getiriyor. `tests/spawn-safe.mjs`
76 bölümü gerçek `World` ile açıp üç şey deniyor: hiçbir şey yapma, sağa yürü,
sola yürü. `tests/shelf-run.mjs` ise I. chapter'ın rotasını gerçek doğuş
noktasından başlayıp gerçek `Player` ile baştan sona yürüyor. Sahanlığın
çözücüsü yoktu, diğer üç chapter'ın vardı.

Yazılırken çözücünün kendisi de bir hata verdi: fırtına fazını periyodun
yalnızca beşte biri kadar tarıyordu ve iki rüzgâr boşluğunu geçilemez sanıyordu.
Bölümler doğruydu, çözücü yanılıyordu.

---

## "Şaşırt beni" gitti, README gerçeğe döndü

Kimlik ekranındaki ikinci düğme kaldırıldı. Tek işi "bir bas ve oyna" olan bir
ekran, seni oynatmayan ikinci bir düğme sunmamalı; alan zaten uydurulmuş bir
adla dolu geliyor ve düzenlenebilir. Yasal metinler de buna göre düzeltildi:
artık "tuş bir tane uydurur" değil, "alan zaten dolu geliyor" diyor.

README baştan sona gerçekle karşılaştırıldı ve **anlattığı ama var olmayan**
şeyler ayıklandı: 20 bölüm oynayan bir bot, sanal gamepad testi, sekme kayması
ölçümü ve portre önizleme testi. Hiçbiri yoktu. Yerine gerçekten koşan yedi
tarayıcı paketinin ne ölçtüğü tek tek yazıldı.

Düzelen sayılar: tek dosya 385 KB değil 732 KB, doğrulanan buz 3.188 değil
3.271, sonsuz mod 31'den değil 77'den başlıyor, market sekiz değil dokuz eşya,
müzik dört değil beş sahne, lint dört değil sekiz kural denetliyor. Dosya ağacı
on bir modül eksikti. Zorluk tablosu yalnızca ilk chapter'ı anlatıyordu, artık
dördünü de anlatıyor.

Bir de **Ne var, ne yok** bölümü eklendi. İkinci yarısı daha önemli: gerçek
para, ödüllü reklam, gerçek zamanlı çok oyunculu, gerçek sıralama tablosu,
gamepad testi, Safari/Firefox testi ve gerçek cihazda oynama yok, hepsinin
sebebi yazıyor. Bir README'nin yalan söylemesinin normal yolu olmayan bir şeyi
anlatmak değil, olan bir şeyi olduğundan iyi anlatmaktır.

Ve bir test eksikti: **tek dosya sürümünün gerçekten açıldığını hiçbir şey
doğrulamıyordu.** İnsanlara verilen kopya o: e-postayla giden, `file://` ile
açılan, yayınlanan linkin arkasındaki dosya. `tests/browser-bundle.mjs` onu
sunucusuz açıp bölüm besteletiyor ve kronometrenin döndüğüne bakıyor.

---

## İki dil ve makine gibi yazmayı bırakma

Oyun artık İngilizce de konuşuyor. Türkçe bir oyunun üstüne geçirilmiş bir
katman değil: her metin iki kere yazıldı ve Türkçesi asıl. Arayüz metinleri tek
bir sözlükte, içeriğe ait olanlar (bölüm adı, penguen tanıtımı, market etiketi,
görev, lig kademesi, unvan) girdilerin kendi `en` bloğunda.

Dil ilk açılışta tarayıcıya uyuyor, sonra oyuncunun seçimi geçiyor. Seçici her
dilin adını kendi dilinde yazıyor, tam da okuyamadığı bir arayüzde kalmış olan
oyuncu için.

Yazının kendisi de elden geçti. Arayüz uzun tirelerle doluydu, cümle üstüne
cümle bir tirenin üstünde dönüyordu. Makine yazısı gibi okunuyordu, çünkü
öyleydi. Oyuncunun gördüğü her cümle virgülle, iki noktayla ya da noktayla
yeniden yazıldı ve `tools/lint.mjs` geri gelmesine izin vermiyor.

Üç denetim eksik metni görünmez olmaktan çıkarıyor: sözlüklerin anahtarları
birebir aynı olmalı, kodun istediği her anahtar sözlükte olmalı ve
`tests/browser-lang.mjs` dili değiştirip her ekranda Türkçe harf arıyor.
Sonuncusu ilk koşuşunda dört gerçek boşluk buldu.

---

## Rüzgâra bir iş verildi, sahanlık sertleşti

Rüzgâr havaydı. Esiyordu, kar yatıyordu ve bölümde hiçbir şey değişmiyordu,
çünkü doğrulayıcı fırtınanın gücünü "rüzgâr erişimi asla değiştirmemeli"
kuralıyla kısıtlıyordu. O cümle "rüzgâr asla okunmaya değmemeli" ile aynı
cümle.

Asıl sebep daha aşağıdaydı: fizik rüzgârı siliyordu. İtki doğrudan `vx`'e
ekleniyor, bir üst satırdaki yürüme kelepçesi de her karede hızı geri çekiyordu.
Fırtına pengueni dört saniye itip iniş noktasını sıfır piksel değiştirebiliyordu.
Rüzgâr artık kendi kanalında: kelepçe oyuncunun istediği hıza sahip, sürüklenme
havanın verdiği hıza, ve ikisi birbirini silemiyor.

Kural tersine çevrildi. Rüzgâr artık dört vuruşluk bir eğri (karşı, dinginlik,
arkadan, dinginlik) ve fizik, çizim, ibre ve kanıt aynı eğriyi okuyor. Duran
penguen sürüklenmiyor, yani beklemek gerçek bir cevap ve bedeli zaman.

İki parça bunun üstüne kuruldu. `windGap` zıplamanın yetmediği, kuyruk
rüzgârının rahatça yetiştirdiği bir boşluk; `updraft` zıplamanın yetmediği
yükseklikte bir raf ve altında yükselen hava sütunu. İkisi de varsayılmıyor,
kanıtlanıyor: rüzgârsız gerçekten geçilemiyor, rüzgârla payı var, üstünü
gerçekten bir fırtına örtüyor ve kuyruk rüzgârı sıçrayıştan uzun sürüyor. Üstüne
`tests/wind-run.mjs` gerçek `Player` sınıfını gerçek bölüm verisine karşı
çalıştırıp iki şeyi birden arıyor: rüzgârla geçen bir tuş dizisi bulmalı ve
rüzgârsız hiçbir dizi bulamamalı. İlk koşuşunda ikinci yarısı düştü, çünkü
doğrulayıcı boşluğu penguen gövdesi kadar kısa ölçüyordu.

İbre pengueni takip ediyor, köşede durmuyor: bir iğne hangi yöne ne kadar
estiğini, altındaki vuruş şeridi de bir sonraki kuyruk rüzgârının ne zaman
geleceğini gösteriyor. "İyi rüzgârı bekle" ancak geldiğini görebiliyorsan bir
karardır.

İlk otuz bir bölüm baştan sona sertleşti: boşluklar genişledi, buzlar daraldı,
tüneller uzadı ve tavandan daha çok şey düşüyor, yem arttı, foklar hızlandı,
orkalar çoğaldı, kontrol noktaları geriye alındı. 15. bölüm kuyruk rüzgârını,
25. bölüm sütunu öğretiyor; 30 ve 31 ikisini de bildiğini varsayıyor.

---

## Arayüz elden geçti

Her ekran telefon dik / telefon yatık / masaüstü olarak ekran görüntüsü alınıp
gözden geçirildi. Bulunan dokuz hatanın hiçbiri okuyarak fark edilecek türden
değildi ve hepsi ilk on saniyede görülüyordu: ana ekranda taşan yazı, bölüm
listesinin ekran dışında kalan üçüncü sütunu, bir satırda üç farklı hizada
duran kart düğmeleri, kırpılan rozetler, parmakla tutulamayan bağlantılar.

**Market** yeniden kuruldu: üç başlık, slab yerine fiyat çipi, yetmediğinde
kartın üstünde "820 balık daha", telefonda kart yerine satır (ekranda 1,5
yerine 4 tane) ve üç nokta yerine `2/3`.

**Markete üç kapı**: ana ekran düğmesi, cüzdana dokunmak (parana dokunmak
paranın gittiği yere götürsün, insanların ilk denediği hareketti ve hiçbir şey
yapmıyordu) ve bölüm sonunda balığı yeni kazandığın an, yalnızca gerçekten
bir şey alabiliyorsan.

**Bölüm listesi**: chapter çipleri, yapışık başlıklar, "Sıradaki" işareti, ve
rekorlarda `00:21.40` yerine `21.40 sn`.

Ad artık tek bir yerden değişiyor (Kimlik); sıralama oraya yönlendiriyor.
Koleksiyon açılırken hak edilmiş ama teslim edilmemiş penguenler veriliyor.

`tests/browser-layout.mjs` bunu koruyor: dokuz ekran, üç boyut, taşma /
hizalama / dokunma alanı.

## Kimlik, yasal metinler ve müzik

**Kimlik.** Oyun ilk açılışta tek bir şey soruyor: sana ne diyelim? Ad, unvan,
penguen kimliği (`PNG-XXXXX`) ve başlangıç tarihi bir kimlik kartında; kart ana
ekranda, giydiğin penguenin portresiyle. Unvanlar chapter sonlarında kazanılıyor
(*Yeni Yumurta* → *Koloni Efsanesi*) ve `tools/lint.mjs` son unvanın gerçekten
ulaşılabilir olduğunu kontrol ediyor. Ad sanitize ediliyor: kontrol karakterleri,
görünmez yön işaretleri ve açılı parantezler siliniyor, ad hem DOM'a hem
paylaşım koduna gidiyor.

**Yasal.** Oyun içinde *Ayarlar → Yasal ve veri*: ne saklanıyor, paylaşınca ne
gidiyor, kullanım şartları, çocuklar, KVKK/GDPR. Tam metinler `docs/GIZLILIK.md`
ve `docs/KULLANIM-SARTLARI.md`. Kaydını JSON olarak indirme ve her şeyi silme
tuşları aynı ekranda.

**Google Fonts kaldırıldı.** Kimlik testi yakaladı: oyun her açılışta, tek
piksel çizilmeden önce iki başka şirketin sunucusuna bağlanıyordu, gizlilik
ekranının "hiçbir şey cihazdan çıkmıyor" dediği bir sayfada. Artık cihazın kendi
yazı tipleri kullanılıyor; hem söz doğru oldu hem açılış hızlandı. `lint` ve
tarayıcı testi bunun böyle kalmasını sağlıyor.

**Müzik baştan yazıldı.** Yerini aldığı şey `setInterval` üstünde dönen tek bir
dört akorluk arpejdi. Şimdi: beş notalık tek bir tema dört bölümde dört ayrı
kostümle (majör / minör / yarı hız + gecikme / staccato), ped-bas-arpej-perküsyon-tema
olarak beş katman ve katmanlar **olan bitene göre** geliyor gidiyor, dalışta
nefes, tırmanışta kol gücü, arenada havadaki kar topu. Ses saatinde 25 ms'lik
ileri-bakış zamanlayıcısıyla planlanıyor, efektler müziği kısıyor.
`tests/music.mjs` Web Audio'yu sayaçlarla taklit edip ızgarayı, katmanları,
sahne geçişini ve temayı ölçüyor.

## Bölüm IV, Kar Topu · 62–76

Oyunun dördüncü fiili ve penguenin *yapmadığı* ilk fiil. Atma tuşu yok, kar
topu toplamak yok, yeni tuş yok. Rakipler nişan aldıkları anda durduğun yere
atıyor ve bir kar topu değdiği ilk şeyde duruyor, gerisi tek fikir: **yolu
kapatan pengueni atıcıyla arana koy, sonra oradan çekil.**

- `Arena` bestecisi, `brawl.js` içinde 15 plan
- `validate-brawl.mjs`: her atış hattı bölüm verisinden yeniden yürünüyor
- `brawl-run.mjs`: arenalar gerçek `World` ile oynanıp kazanılıyor
- `browser-brawl.mjs`: kurallar gerçek sayfada

İki geometri kararı ölçümle çıktı: rakipler **ince buz sivrilerinde** duruyor
(geniş raf, hattı birkaç piksel sonra kendi zeminine gömüyordu) ve kayalar
**yukarıdan sarkıyor** (zeminden çıkan sütun, cevabın iki parçası arasına duvar
koyuyordu).

## Bölüm III, Buz Altı · 47–61

Tersine çevirme: buzun üstünde penguen komedyen, suda çevrenin en hızlı şeyi.
Bölüm penguene daha çok iş yaptırarak değil **bırakarak** zorlaşıyor; elinden
alınan tek şey hava. Bırak yüksel, bas dal; bir ciğer 9,5 saniye ve sadece
buzdaki deliklerde doluyor.

- `Deep` bestecisi, `dive.js` içinde 15 plan
- `validate-dive.mjs` (geometri + nefes bütçesi), `dive-run.mjs` (gerçek
  `World`: akıntı, deniz leoparı, nefes sayacı)
- Beş hata testlerden çıktı; en kötüsü negatif modulo yüzünden geriye sayan
  bir çizim döngüsüydü ve ilk su altı bölümü oyunu donduruyordu

## Bölüm II, Zirve · 32–46

Tutunma: duvara asıl, tırman, tekmele ve kollarındaki güç sadece sağlam
zeminde doluyor. On beş tırmanışın hepsi hem geometri doğrulayıcısını hem fizik
çözücüsünü geçiyor.

- Baca artık penguenin durduğu buzun **üstünde** kuruluyor (şaft ile kalkış
  buzu birlikte kararlaştırılıyor)
- Mola rafları için **duvarın kendisi kırılıyor**; raf, sütunun başı oluyor
- Çözücü, çıkacağı duvarı tekmeleyip bırakmıyor

## Altyapı

- `npm start` · `npm test` · `npm run build`, bağımlılıksız sunucu ve tek
  komutluk test koşucusu (`tools/serve.mjs`, `tools/test.mjs`)
- `tools/lint.mjs`: paketleyici listesi, bölüm sayısı tutarlılığı, debug artığı,
  paket boyutu
- `tests/save.mjs`: v1'den bugüne her kayıt sürümü kayıpsız açılıyor
- `sw.js`: bir kere online açtıktan sonra offline oynanıyor
- GitHub Actions: her push'ta bütün testler, yayına almadan önce yeşil şart
- `docs/BILGISAYARDA.md`: bilgisayarda yapılması gereken işlerin listesi
