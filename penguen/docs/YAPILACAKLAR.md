# Pengu — yapılacaklar, tek yerde

Bu dosya projenin **tek** iş listesi. Üç bölümü var ve hangisine bakacağın
belli: *senin* yapman gerekenler, *kodda* açık kalanlar, ve *kapatılmış*
kararlar (bir daha tartışılmasın diye nedeniyle birlikte duruyorlar).

`docs/BILGISAYARDA.md` kurulum ve "nasıl yapılır" rehberi olarak kalıyor —
orada **adımlar** var, burada **durum** var. Bir iş bittiğinde işareti burada
değişir.

Son güncelleme: 2026-10-22 · dal `claude/penguen-game-dev-6ym6pg` · 76 bölüm ·
56 test paketi (45 node + paketleme + 11 tarayıcı)

---

## 0. Çıkmaya hazır mı

**Kod tarafı hazır. Kalan her şey senin elinde ve çoğu on dakikalık.**

Ölçülmüş hâliyle:

| | Durum |
|---|---|
| 76 bölüm, 4 chapter | Hepsi iki bağımsız katmanla geçilebilir kanıtlı |
| 56 test paketi | Yeşil (45 node + paketleme + 11 tarayıcı) |
| 24 gerçek cihaz şekli | Oynanış ve arayüz temiz, konsol temiz |
| CI + yayın | İkisi de yeşil, canlı sürüm son commit |
| Çevrimdışı | **Tek online ziyaret yetiyor** — gerçek tarayıcıda, ağ kapalı, bölüm oynanarak testli |
| Kayıt | Sürüm göçü testli |
| Başarım | Simülasyon 0,1–0,8 ms, çizim 0,7–5,3 ms (CPU ×1–×4) |
| Paylaşım kartı ve simgeler | PNG, her platformda görünür |
| İki dil | 315 metin, birebir eşit, sayı veren cümleler linte bağlı |
| Zorluk | El yapımı eğri bandında; sonsuz koşu 31. bölümün ötesine geçiyor |
| Ekonomi | İlk kozmetik 4 dk, her şey 308 gün — dakika dakika testli |
| Ritim | Ölüm → tekrar 0,72 sn · bitiş → kart 0,87 sn · sıradaki → oyun 0,02 sn |

**Bilmediğim tek teknik şey:** bu kutuda GPU yok, yani 780×1688 pikseli
*boyamanın* gerçek bir telefonda kaça mal olduğunu ölçemiyorum. Oyunun kendi
işi (yukarıdaki iki sayı) 16,7 ms bütçenin çok altında; geri kalanı donanım,
ve cevabı 1.5'te.

**Çıkmadan önce gereken, önem sırasıyla:** 1.5 (gerçek cihaz), 1.8 (yasal
onay), 1.6 (uçak modu), 1.3 ve 1.4 (dal). Hiçbiri kod işi değil.

---

## 1. Sende olanlar

| | İş | Durum | Süre |
|---|---|---|---|
| 1.1 | GitHub Pages'i aç (`meloshemo/cld`) | **bitti** — canlı, deploy #64 yeşil | — |
| 1.2 | CI'nın çalıştığını gör | **bitti** — her push'ta iki iş koşuyor | — |
| 1.3 | `main` dalını koru (status check zorunlu) | **açık** — tam tıklama yolu `BILGISAYARDA.md` §2'de, bende araç yok | 1 dk |
| 1.4 | Dalı `main`'e birleştir | **kapandı** — "şimdilik dokunma" dedin; yayın zaten cld/main'den | — |
| 1.5 | Gerçek cihazda oyna ve his notu al | **açık — en değerli iş** (listenin ilk maddesi testlendi) | 30 dk |
| 1.6 | Offline'ı doğrula (uçak modu) | **bitti** — otomatikleşti, ve bir hata buldu (2.14) | — |
| 1.7 | Kendi alan adı | **açık, isteğe bağlı** | 10 dk + DNS |
| 1.8 | Yasal metinleri okuyup onayla | **açık, senin kararın** | 10 dk |

Adımların hepsi `docs/BILGISAYARDA.md` içinde. İkisi bitti, kalanlar senin
hesabını, cihazını ya da kararını istiyor.

**1.5 neden en değerli:** testler mekaniği kanıtlıyor, **hissi** kanıtlamıyor.
Otomatik bir testin göremediği tek şey bu. Kötü hissettiren her şeyin ayarı
`src/game/config.js` içinde tek yerde duruyor.

---

## 2. Kodda açık kalanlar

Hepsi ölçülmüş; yanlarındaki sayı tahmin değil, aracın okuması. Bu turdan
sonra listenin durumu:

| | Konu | Durum |
|---|---|---|
| 2.1 | Denizde iki birebir ikiz | **kapandı** — %6 → %4 |
| 2.1b | Denizin altı kolay bölümü | **denendi, kapatıldı** — model düzeltildi, net kazanç sıfır çıktı, geri alındı |
| 2.2 | Sonsuz modun sıkışmayan bölümleri | **kapandı** — ortalama 0,533 → 0,505 |
| 2.3 | Zirvenin kalan kol gücü | **tavan** — plan hakkında değil |
| 2.4 | Arenanın dağarcığı / metriği | dağarcık **kapandı** (%5 → %1), metrik bir taban |
| 2.5 | Küçük işler | biri sende (kullanıcı adı), biri tavan |
| 2.6 | Arena odası ekrandan geniş | **kapandı** — masaüstünde %87 → %0 |
| 2.7 | `skua.mjs` seyrek takılıyor | **kapandı** — sebebi bulundu, yirmi beş koşuda sıfır |
| 2.8 | Kamera ölü bölgesi | **kapandı** — 1185px → 0px |
| 2.9 | İki nefes deliği şeridin altında | **yanlış alarm** — ölçüldü, deliğin yalnızca üst kenarı kırpılıyor |
| 2.10 | Yüzen buz ve çöken taş | **geldi** — ikisi de, kalan biri için not |
| 2.11 | Paylaşım kartı ve simgeler | **kapandı** — SVG hiçbir platformda görünmüyordu |
| 2.12 | Arayüzün söylediği sayılar | **kapandı** — üçü yanlıştı, on üçüncü lint kuralı bekçisi |
| 2.13 | Sonsuz modun gevşekliği | **kapandı** — `tight` kadranı hiç çevrilmemişti |
| 2.14 | Çevrimdışı ilk ziyarette çalışmıyordu | **kapandı** — 2 dosya → 40 dosya |
| 2.15 | Gizlilik listesi eksik sayıyordu | **kapandı** — beş alan eklendi, on dördüncü lint kuralı bekçisi |

Oyunun en tekrarlı bölümü artık 47–61 (%4), ve o %4'ün tamamı 47'nin kendini
öğreten alt kümesi.

### 2.1 Denizde iki gerçek ikiz — **kapandı**

```
47–61   12 fiil   4/105 çift %80+ aynı  (%4)   ← önce %6
```

54 Buzul Karnı ile 58 Kılçık ve 59 Leopar ve Akıntı ile 61 Açık Deniz birebir
aynı dağarcığı kullanıyordu. Dördü de kendi notunun zaten iddia ettiği bir
fiil aldı: 54'e bir oluk (adı "tavan alçalıyor"), 58'e sütunun üstünde bir
akıntı bandı (sığ–derin ritminin iki ucu artık farklı şeye mal oluyor), 59'a
bir girdap (gözüne ikinci leopar kondu), 61'e bir oluk — ekleme değil, son
geçidin **takası**, çünkü o bölümde eklemeye yer yok. Zincirleme olarak 52
Akıntı da 59'un alt kümesi hâline geldi ve iki yarısının arasına bir boğaz
girdi.

Kalan dört çiftin dördü de 47'nin 48–51'in alt kümesi olması, yani chapter
kendini öğretirken her bölümün bir şey eklemesi — kusur değil.

Ayrıntısı ve ölçüm sırasında öğrenilen üç şey `CHANGELOG.md` içinde.

### 2.1b Denizin altı bölümü hedefinin üstünde kolay — **denendi, kapatıldı**

`node tools/difficulty.mjs --chapter=3` altı bölüme "kolay" diyor: 47, 50, 52,
53, 56, 60. İkizler turunda 58 (%29 → %15) ve 59 (%22 → %2) banda girdi ve
toplam sapma 3,8 → 3,0'a indi; kalanlar durdu.

Şüphe şuradaydı: bestecinin bir bacak için tahmini ile o bacağın **gerçek**
maliyeti arasında yirmi puana varan bir pay var. Rezerv — yani nefes almak için
saklanan pay — tek bir çarpanla fiyatlanıyordu ve o çarpan **sütunun en kötü
noktasından** okunuyordu, oysa yüzeye çıkan bacak bandı yalnızca kısmen
geçiyor. Yani bacak, bandın tamamını bandın hızıyla ödüyordu.

Yazıldı ve ölçüldü. Rezerv artık bacak bacak, her bacak gerçekten yüzüldüğü
yerde, `swimCost` ile fiyatlanıyor — yani dünyanın okuduğu zone'ların aynısıyla.
Sonuç:

| | Önce | Düzeltilmiş model |
|---|---|---|
| 52 Akıntı | %45 | %42 |
| 53 Testere Dişi | %36 | %33 |
| 54 Buzul Karnı | %22 | %25 |
| 56 Kara Su | %31 | %33 |
| 59 Leopar ve Akıntı | %2 | **bitirilemedi** |

**Pay hata değilmiş.** Çoğu, *kusursuz bir hattın* maliyeti ile *yüzülebilir*
bir hattın maliyeti arasındaki fark. Payı sıfırlayınca 59 yüz elli piksel
uzadı ve çözücü — ki oyuncunun yüzdüğü gibi yüzüyor, planın çizdiği gibi değil
— çıkışa ulaşamadı. Paya bir isim verip (`SWIM_MARGIN`) ayarlamak da işe
yaramadı: 1,12'de 57 bitirilemedi ve dört bölüm *kolaylaştı*; 1,04'te on beşi
de geçiyor ama iki bölüm üç puan sıkışırken iki bölüm iki puan gevşiyor. Net
sonuç sıfır, bedeli chapter'ın bütün bütçe modelini yeniden akıtmak.

Değişiklik **geri alındı**. Bu bölümlerin kolaylığı tek bir modelden gelmiyor;
sıkıştırmak isteyen tek tek planlara bakmalı — 58 ile 59'da işe yarayan buydu.

### 2.2 Sonsuz modun iki bölümü sıkışmıyor — **kapandı**

`floorGap` üretilmiş bölümlerin boşluk aralığını aşağıdan kapatıyor ve 302 ile
305'i sıktı; 296 ile 299 kımıldamıyordu. Neden dialin kendisi değildi: üç parça
onu **göremiyordu**.

- `summit` basamaklarını, planın ne dediğine bakmadan, düz 0,36'ya koyuyordu
- `geysers` bir `gap` parametresi alıyordu ve üretici hiç geçirmiyordu
- `bait` çıkış basamağını sabit 0,26'ya koyuyordu

Üçü birlikte derin kursların yaklaşık yarısında çıkıyor, yani yarısında tabanın
hiç uygulanmadığı bir parça vardı. Üçü de artık `gap` alıyor ve üretici
geçiriyor; üstleri düz parçalardan dar, çünkü üçü de **yükselen** bir sıçrama
istiyor ve yükseliş aynı erişimden harcıyor.

| Bölüm | Önce | Sonra |
|---|---|---|
| 296 | 0,434 | **0,384** |
| 299 | 0,515 | **0,448** |
| 302 | 0,454 | 0,455 |
| 305 | 0,428 | **0,353** |

Altmış üretilmiş bölümün tamamı da kıpırdadı: **ortalama 0,533 → 0,505**, en
sıkı bölüm 0,355 → 0,326.

Taban hedefi 0,22; altmışın altmışı hâlâ gevşek tarafta, ama artık hepsi dialin
ucunda. Buradan sonrası yeni parça ister, dial değil — çünkü `crevasse` ile
`orcaGap` zaten tabanın üstünde sabit duruyor ve kalan gevşeklik sıçramanın
kendisinde değil, kursun **ritminde**: bir avuç zor sıçrama, aralarında bol
bol kolay zemin.

Buradan sonrası 2.13'te: kadran gerçekten vardı, üretici onu hiç çevirmiyordu.

### 2.3 Zirvenin kalan kol gücü hedefin üstünde — ve kaldırılamıyor

46 üçte bir barla bitiyor, hedef bant onda bir diyor. Orta bacası çözücünün
fiziksel olarak tırmanabildiği yükseklikte (415'i geçemiyor), diğer iki
bacası tam bütçe çizgisinde. Üçüncü bacaya kırk piksel eklendi ve sayı
kımıldamadı, çünkü belirleyici adım başka yerde ve o da bir sınıra dayanmış.
**Bayrak tavan hakkında bir gerçek, plan hakkında değil.**

### 2.4 Arenanın dağarcığı açıldı, metriği hâlâ bir taban

**Dağarcık kapandı.** İkizler turundan sonra en tekrarlı bölüm kar topuydu: on
beş arena, yedi fiil, beş birebir çift. Sekizinci fiil geldi — **buzlu zemin**,
sahanlığın kaygan buzu değiştirilmeden — ve bölümün *varmak* hakkındaki ilk
cümlesi oldu: duracak yer yerinde, hat temiz, penguen cevabın üstünden kayıyor.
Beş çiftin dördü kırıldı (68, 69, 73, 74, 75 ve finale 76 birer fiil aldı);
62 ile 63 bilerek duruyor, çünkü ikisi chapter'ın kendini tanıtması.

```
62–76   8 fiil   1/105 çift %80+ aynı  (%1)   ← önce 7 fiil, %5
```

**Metrik hâlâ kıpırdamıyor, ve bu dosyada kalıyor.** Final 55px, hedef 16px.
Sayı, çözücünün seçtiği rotada bir topun ne kadar yaklaştığını ölçüyor ve
çözücü en güvenli rotayı seçiyor; ölçüldü, ikinci bir lobber asıldığında sayı
**kötüleşti** (55 → 57px). Buzlu zemin de onu kıpırdatmadı, çünkü kayma
rotayı değiştirmiyor, rotanın bedelini değiştiriyor. Arenayı zorlaştırmak rota
kapatmak demek — yani geometri — ve bu sayı yalnızca en güvenli rota
kapandığında kıpırdar.

### 2.6 Arena odası ekrandan geniş — **kapandı**

Arena 1500 birim, masaüstü görüntüsü 960'tı. Bölümün kendi kurduğu duracak
yerde dururken hattı çizen atıcı masaüstünde %87 oranında ekran dışında
kalıyordu.

İki yol vardı. **Arenaları daraltmak denendi ve besteci reddetti:** 1300
birimde 74. bölüme temiz hat kuramıyor, 1150'de 71'i, 960'ta 67'yi kaybediyor.
Bir düello cevabından geriye doğru kuruluyor ve hat o yeri istiyor.

O yüzden **kamera geri çekiliyor** — yalnızca kar topu bölümünde, çünkü
yalnızca orası bir oda. Görüntü kutusu oda sığana kadar büyüyor, ama penguen
gerçek ekranda 34 pikselden küçülmeyecek kadar.

| Ekran | Geri çekilme | Penguen | Atıcı ekran dışında |
|---|---|---|---|
| Masaüstü 1280×720 | ×1,47 | 45px | **%87 → %0** |
| Telefon yatay 844×390 | ×1,00 | 33px | %3 |
| Telefon dikey 390×844 | ×1,05 | 34px | %100 |

Dik telefonda oda bakılmaya değer hiçbir ölçekte sığmıyor ve doğru cevap geri
çekilmemek; o ekranı hattın kenar işaretleri taşıyor.

### 2.8 Ölü bölge — **kapandı**

Kamera penguenin her adımını takip ediyordu: bir arenada tek bir noktanın
doksan piksel sağına soluna beş saniye gidip gelince kamera 1185 piksel yol
yapıyordu. Artık ekranın ortasında kameranın cevap vermediği bir kutu var —
aynı ölçüm **1185px → 0px**.

Kutu eksen ve chapter başına ayrı, çünkü risk her yerde aynı değil:

| | Yatay | Dikey |
|---|---|---|
| Sahanlık | 86 | 28 |
| Arena | 120 | 40 |
| Dağ | 44 | 30 |
| Deniz | 70 | **0** |

Yataydaki kutu koşarken kapanıyor (koşmak gerçekten gitmektir), arenada
kapanmıyor (bir odada hızlı gitmek bir yere gitmek değil). Dikey kutu düşerken
açılıyor, çünkü düşüş öncüsü zemini göstermek için var.

Denizin sıfırı tahmin değil: her bölümün her buzunun üstünde, kutunun izin
verdiği en kötü yöne itildiğinde masaüstünde bir nefes deliği tam şeridin
kenarında çıkıyor — orada harcanacak pay yok. Kural `tests/camera.mjs` içinde:
**kutu, görünen bir şeyi gizlemeyecek.**

### 2.9 İki nefes deliği — **yanlış alarmmış**

Ölü bölge taramasında 53 ve 61. bölümlerde birer nefes deliğinin yan tutulan
telefonda şeridin altında kaldığı çıkmıştı. Ölçünce öyle değil: delik ekranda
65–175 arasında, şerit 97'de bitiyor. Yani **üst kenarının 32 pikseli** şeridin
arkasında, geri kalan 78 piksel görünüyor — ve içine girilen ağzı zaten altta.

Tarama deliğin `y`'sini, yani tavandaki üst kenarını okuyordu; yüzücünün
baktığı yer orası değil. Kayıt duruyor ki bir dahaki sefere yeniden
keşfedilmesin: **bu bir kusur değil.**

### 2.7 `tests/skua.mjs` seyrek takılıyor — **kapandı**

Elli koşuda bir düşüyordu ve bir daha tetiklenemiyordu. Sebebi bulundu:
yönetmen, ölçülen dokuz yüz adımlık uçuş sırasında rastgele **ikinci bir kuş**
fırlatabiliyor, ve o anda `w.skuas[0]` artık ölçülen uçuş değil.

`ambushes`'i kapatmak yanlış araçtı — bütün güncellemeyi kapatıyor, yani
havadaki kuş da donuyor. Durdurulması gereken şey fırlatıcılar. Yirmi beş
koşuda sıfır hata.

Not olarak duruyor, çünkü aynı tuzak bu projede üçüncü kez çıktı: bir testin
ölçtüğü şeyin, ölçmek istediği şey olduğundan emin olmak gerekiyor. Yüzen buz
paketi de iki kere aynı sebeple düştü.

### 2.10 Yüzen buz geldi — bir sonraki fizik kuralı için not

Chapter I'in yeni fiili `buoys`: ağırlığa cevap veren tek zemin. 20, 26 ve 30.
bölümlerde, ve sonsuz modda kurs başına bir kere. Ayrıntısı `README.md` ve
`CHANGELOG.md` içinde.

Sırada ne var sorusunun ölçülmüş cevabı: aynı cins bir kural (dünyanın oyuncuya
cevap vermesi) her chapter'da farklı bir şey olurdu ve ikisi şu an **yok**:

- **Dağda ağırlıkla inen tutamak.** İpteki kütlenin makinesi zaten var; tutunca
  inen, bırakınca çıkan bir tutamak chapter II'nin para birimiyle (koldaki bar)
  birebir aynı cümleyi söyler.
- **Arenada rüzgârda sapan kar topu.** Kavisli atışın balistiği zaten
  çiziliyor; yan rüzgâr hattı büker ve hat zaten ekrana çiziliyor, yani
  okunabilir kalır.

İkisi de yapılmadı, çünkü yüzen buz tek başına üç bölümü ve sonsuz modu
değiştirdi ve bir turda bir fizik kuralı yeterli. Sıradaki tur için not.

### 2.11 Paylaşım kartı ve ev ekranı simgesi — **kapandı**

Çıkmadan önceki taramada çıktı ve ikisi de görünür kusurdu:

- `og:image` bir **SVG**'ydi. WhatsApp, Messenger, Twitter ve Slack SVG
  `og:image` için hiçbir şey göstermiyor — yani oyunun her paylaşımı altında
  başlık olan boş bir dikdörtgendi.
- `apple-touch-icon` da SVG'ydi. Safari bunu hiç desteklemedi, yani ana ekrana
  eklenen oyun, tam da oyunun yapıldığı cihazda gri harf yer tutucusuyla
  duruyordu.

İkisi de aynı çizimden PNG'ye alındı (1200×630 kart, 192 ve 512 simge), yani
değişecek tek bir çizim var. Manifest'teki `orientation` da `landscape`'ten
`any`'ye alındı: oyun dik tutulduğunda **daha fazlasını** görüyor ve bu
`tests/viewport.mjs` ile ölçülü, yani kurulumda yatayı dayatmak ölçümle
çelişiyordu.

Kalan tek belirsizlik: `og:image` göreli bir yol. Modern kazıyıcılar sayfa
adresine göre çözüyor, ama bazıları mutlak adres istiyor. Kendi alan adını
(1.7) alırsan mutlak yazmak beş saniyelik iş.

### 2.12 Arayüzün oyuncuya söylediği sayılar — **kapandı**

Üçü yanlıştı, ve ikisi iki dilde birden:

| Nerede | Ne diyordu | Gerçek |
|---|---|---|
| Bölüm listesi | "31 bölümden sonra sonsuz mod" | 76 |
| Koleksiyon | "yirmi penguen, iki yüz kombinasyon" | 29 ve 290 |
| Readme özeti | "316 metin" | 315 |

Üçü de yazıldıkları gün doğruydu. Oyun büyüdü, cümleler büyümedi. `lint`'in on
üçüncü kuralı artık sözlükten okuyup `CRAFTED_LEVELS`, `SKINS.length`,
`TRAILS.length` ve bölüm başına balıkla karşılaştırıyor — iki dilde, her
push'ta.

Aynı taramada **yan çevirme ipucu** kaldırıldı: dikey telefondaki bir oyuncuya
oyunun söylediği ilk şey, `tests/viewport.mjs`'in tersini ölçtüğü bir tavsiyeydi
(çevirmek penguenin boyunu %15'ten az değiştiriyor, dik telefon daha fazlasını
görüyor). Lig satırındaki "bu hafta zirvedesin" de "en üst kademe, bu hafta
orada kaldın" oldu — skorlar bu cihazda duruyor, kimse kimseyle yarışmıyor.

Üç yüz on beş anahtarın İngilizcesi bir bütün olarak da okundu: eksik metin,
Türkçe kaçağı ya da yer tutucu uyuşmazlığı yok.

### 2.13 Sonsuz koşu el yapımı oyundan gevşekti — **kapandı**

`Course`'un `tight` kadranı kurstaki **her** boşluğu çarpıyor; el yapımı
sahanlık onu 0,8 → 1,3 arasında rampalıyor; üretici hiç geçirmiyordu. Yani
sonsuz koşunun tamamı — 77. bölüm de 977. bölüm de — 11. bölümün değerinde,
**1,0'da** koşuyordu. 2.2'de aranan gevşekliğin asıl sebebi buydu: taban
eksikti ama ölçek hiç başlamamıştı.

```js
const tight = lerp(1, 1.38, depth);
```

| Bölüm | Önce | Sonra |
|---|---|---|
| 296 | 0,413 | **0,241** |
| 299 | 0,322 | **0,257** |
| 302 | 0,396 | **0,324** |
| 305 | 0,366 | **0,289** |

Taban hedefi 0,22, el yapımı finalin toleransı 0,395. Derin sonsuz bölüm artık
oyunun en zor el yapımı bölümünün ötesinde; en dar tek sıçrayışlar 0,0456, yani
yirmi giriş kombinasyonundan biri. "Çok çok çok imkansız bölüm" sorusunun
cevabı burası — ve dördü de iki katmanla geçilebilir kanıtlı, çünkü doğrulayıcı
üretilmiş her bölümü de görüyor.

Tavan `Course`'un sınırı olan 1,45 değil 1,38: sonuna kadar bastırılmış bir
kadranın, birinin daha fazlasını istediği gün gidecek yeri kalmaz.

### 2.14 Çevrimdışı söz bir ziyaret eksikti — **kapandı**

Uçak modu kontrolü (1.6) otomatikleştirilince ortaya çıktı: oyunu **bir kere**
sinyalle açmak yetmiyordu. Önbellekte iki kayıt vardı, `./` ve `./index.html`;
kırk modülün hiçbiri yoktu, çünkü hepsi servis çalışanı kurulmadan önce
istenmişti. İkinci online ziyaret düzeltiyordu — ama önemli olan ziyaret ilki.

Precache listesi çözüm değil: derleme adımı olmayan bir projede elle yazılan
liste bayatlar. Tarayıcı ne yüklediğini zaten biliyor; sayfa artık
`performance.getEntriesByType('resource')` çıktısını çalışana veriyor.

| | Önce | Sonra |
|---|---|---|
| Tek ziyaretten sonra önbellek | 2 dosya | **40 dosya** |
| Sinyalsiz yenileme | açılmıyor | **bölüm oynanıyor** |

`tests/browser-offline.mjs` 56. paket. Düzeltme geri alınınca altı kontrolden
düşüyor.

### 2.15 Gizlilik metni eksik sayıyordu — **kapandı**

"Ne saklanıyor" listesi madde madde yazılmış, yani tam olduğunu iddia ediyor.
Değildi: istatistikler, lig puanı, günün görevleri, yarım kalan koşunun yeri ve
anıtın boyu kayda sonradan eklendi, listeye eklenmedi. Hiçbiri cihazdan
çıkmadığı için hiçbir test düşemezdi.

İki doküman ve oyunun Yasal ekranı tamamlandı; `lint`'in on dördüncü kuralı
kaydın yirmi alanını tanıyor ve yenisi çıkarsa build duruyor.

### 2.5 Küçük işler

- Sütun başları penguenden dar (44px baş, 49px gövde, 21 yerde). Durmak
  çalışıyor, sıçramak artık %24–62 ile iniyor, ama şekil hâlâ tuhaf.
  Genişletme denendi: baş dışa büyüyünce sıçrayış uzuyor ve ölçüm kötüleşiyor.
- "Bir kahve ısmarla" bağlantısı (Ko-fi / BMC) — beş dakikalık iş ama
  **senin kullanıcı adını** istiyor. Verirsen eklenir.

---

## 3. Kapatılmış kararlar

Bunlar eksik değil; **bilerek yapılmadı**. Yeniden açmak istersen gerekçeyi de
tartışman gerekir.

| Konu | Karar | Neden |
|---|---|---|
| Gerçek parayla satın alma | **yapılmadı** | Sunucu + Stripe hesabı + kimlik sistemi ister; oyunun kullanıcı kavramı yok |
| Ödüllü reklam | **yapılmadı** | Web'de ödüllü reklam desteği zayıf, ritmi bozar |
| Uygulama mağazası | **ertelendi** | Capacitor ile bir hafta; önce web sürümü oynansın |
| Gerçek zamanlı çok oyunculu | **yapılmadı** | WebSocket + eşleştirme + rollback + hile koruması = oyunun geri kalanı kadar iş. `ghost.js` asenkron karşılığını veriyor |
| Sıçrama mekaniği, hayaletle yarış, rekorla yarış | **kaldı** | Üçü de tutarlı ve çevrimdışı dürüst: hayalet oyuncunun kendi koşusu, rekor kendi rekoru, ikisi de bu cihazda. Kaldırmak oyunun tek "tekrar oyna" sebebini alır |
| Arenaya yan rüzgâr | **yapılmadı** | Chapter'ın düello kanıtı düz çizgide giden atışlara dayanıyor; kanıtı bozan bir fizik kuralı yenilik değil |
| El yapımı chapter'ları daha da sıkmak | **tavan** | I'in `tight`'ı 1,30'da doyuyor (1,45'te doğrulayıcı yirmi bir hata veriyor), II'nin 46'sı çözücünün tırmanabildiği yükseklikte, IV'ün metriği yoğunlukla gevşiyor. Sıkmak plan plan geometri ister — ve sonsuz koşu o işi 2.13'ten sonra zaten yapıyor |

---

## 4. Nasıl ölçülür

```bash
node tools/test.mjs --no-browser   # 45 paket, ~2 dk, kurulumsuz
node tools/lint.mjs                # proje kuralları
node tools/variety.mjs --twins     # tekrar: hangi bölümler birbirine benziyor
node tools/difficulty.mjs --chapter=2,3,4   # zorluk eğrisi (I kırk dakika sürer)
```

Bir şey "düzeldi" demeden önce ölçüsü olmalı. Bu projede kural bu ve dosyanın
her satırı bir ölçünün sonucu.
