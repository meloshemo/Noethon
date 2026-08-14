# Pengu — Antarktika'dan Kaçış

Yeni doğmuş bir penguen, eriyen buzlar arasında Antarktika'dan kaçmaya çalışıyor.
Buzlar üstüne basınca çatlıyor, bazıları eriyip yok oluyor, bazıları tuzak,
bazıları altındaki gayzerle seni havaya fırlatıyor. Tepeden bir kutup kuşu
dalıyor. Bölüm ilerledikçe penguen büyüyor: daha ağır zıplıyor, daha geniş yer
istiyor.

**Bağımlılık yok, derleme adımı yok, backend yok, görsel/ses dosyası yok.**
Penguen de, buz da, kuzey ışıkları da, bütün sesler de kodla üretiliyor.
Toplam yük tek dosyada ~385 KB ve çevrimdışı çalışıyor.

▶ **[Oyunu aç](https://claude.ai/code/artifact/2f6dd29b-3ad8-4d60-b4f7-c8490114b96f)**

---

## İçindekiler bir bakışta

| | |
|---|---|
| **31 elle yazılmış bölüm** | 1.600–5.400 px arası parkurlar, 481 buz kütlesi |
| **Sonsuz mod** | Bölüm numarasıyla tohumlanmış — 42. bölüm herkeste aynı |
| **9 buz türü** | sağlam · çatlak · cilalı · eriyen · sürüklenen · düşen · tuzak · kaçan · gayzer |
| **4 tehlike** | sarkıt · fok · fırtına kuşağı · orka |
| **1 pusu** | Bölümün planlamadığı anda dalan kutup kuşu |
| **3 çürük balık etkisi** | ağırlaşma · ters kontrol · körlük |
| **20 penguen + 10 iz** | 4 nadirlik seviyesi, 200 kombin |
| **9 market eşyası** | 3'ü penguenin *ne yapabildiğini* değiştiriyor |
| **21 günlük görev** | üç ağırlıkta, her gün birer tane |
| **Haftalık lig** | Bronz → Gümüş (500) → Altın (2.000) → Elmas (5.000) |
| **Günün Pengu'su** | Herkese aynı bölüm, gün boyu biriken 4 hedef |
| **Günün Teklifi** | 24 saatlik indirimli kozmetik, geri sayımlı |
| **Hayalet yarışı** | Rekorun yanında koşuyor; kodunu paylaşınca arkadaşın da |

---

## Öne çıkan özellikler

### 🪽 Aktif ekipman — tek tuşta iki yetenek
Markette **Planör Kanat** ve **Sırt Motoru** var. Havada zıplamayı *basılı tutmak*
kanatları açıyor ve düşüşü terminal hızın beşte birine indiriyor; *tek dokunuş*
motoru ateşliyor. İkisi de sadece yere değince doluyor — bu uçmak değil, zaten
verdiğin bir zıplama kararını havada tartışma hakkı.
→ [ayrıntı](#aktif-ekipman)

### 🦅 Kutup kuşu — bölümün planlamadığı tehlike
Bir skua tepeden dalıp pengueni kapıyor. Bölümün parçası değil, **yönetmen
olayı**: ezberlediğin parkurun dokuzuncu turda hâlâ seni korkutabilmesinin tek
yolu. Buzun üstünde bir gölge beliriyor ve yaklaştıkça daha hızlı atıyor.
→ [ayrıntı](#pusu-kutup-kuşu)

### 🐧 Gardırop — 20 penguen, 10 iz
Ninja, Kral, Astronot, Altın, Korsan, Ateş, Siber, Yılbaşı, Frak, Kâşif, Dalgıç,
Aşçı, Rock, Uzaylı, Hayalet, Şövalye, Kutup Işığı, Buz Kraliçesi, Gölge.
Çoğu satın alınmıyor, **kazanılıyor**. Seçtiğin penguen buzun üstünde gerçekten
o penguen — aksesuarlar canlı çiziliyor, jet havada ateşliyor, bant koşarken
savruluyor.
→ [ayrıntı](#koleksiyon)

### 🏔️ Kıta — yamaç, uçurum, yarık, tünel
Bölümler koordinat değil **plan** olarak yazılıyor; geometri o bölümdeki gerçek
zıplama erişiminden hesaplanıyor. Tünel tavanı gerçekten katı ve zıplamayı
kısaltıyor, o yüzden tüneldeki boşluklar *tavan altındaki* erişime göre ölçülüyor.
→ [ayrıntı](#parkurlar-piksel-değil-cümle)

### 👻 Hayalet yarışı ve sıralama
Her deneme kaydediliyor. En iyi koşun bir dahaki oynayışında yanında saydam bir
penguen olarak koşuyor; HUD'daki `−0.42` o an rekordan ne kadar önde olduğunu
gösteriyor. 30 saniyelik bir koşu ~370 karakterlik bir koda dönüşüyor — mesajla
gönderilecek kadar kısa.
→ [ayrıntı](#hayalet-yarışı-ve-sıralama)

### 🏆 Haftalık lig ve Günün Pengu'su
Pazartesi puanlar sıfırlanıyor, çıktığın kademe kalıyor. Günün bölümünde dört
hedef var ve **gün boyunca birikiyorlar** — tek turda hepsini yapman gerekmiyor.
→ [ayrıntı](#haftalık-lig)

---

## Belgeler

| Bölüm | Ne anlatıyor |
|-------|--------------|
| [Çalıştırma](#çalıştırma) · [Testler](#testler) | Nasıl açılır, nasıl doğrulanır |
| [Mimari](#mimari) | Dosya düzeni ve neden böyle |
| [Zorluk eğrisi](#zorluk-eğrisi) | 31 bölümün rampa tasarımı |
| [Buz türleri](#buz-türleri) · [Tehlikeler](#tehlikeler) | Oyun içi her mekanik |
| [Pusu mekanikleri](#pusu-mekanikleri-buzun-tuzakları) · [Kutup kuşu](#pusu-kutup-kuşu) | Ani ölüm olayları |
| [Ekonomi ve market](#ekonomi-ve-market) | Balık nasıl kazanılır, neye harcanır |
| [Koleksiyon](#koleksiyon) | 20 penguen, 10 iz, nadirlikler |
| [Haftalık lig](#haftalık-lig) · [Günün Pengu'su](#günün-pengusu) | Meta sistemler |
| [Hayalet yarışı](#hayalet-yarışı-ve-sıralama) | Rekor yarışı ve paylaşım kodu |
| [Kontroller](#kontroller) | Tuşlar |

---

## Adalet sözleşmesi

Bu oyunun en çok emek verilen kısmı zorluğun *adil* olması. Üç katman:

1. **Besteci** (`terrain.js`) boşlukları piksel olarak değil, erişimin yüzdesi
   olarak alıyor. İmkânsız bir boşluk yazmak mümkün değil.
2. **Fizikten türeyen sınırlar**: tuzak buzun genişliği fitilinden, gayzerinki
   uyarı süresinden, fırtınanın gücü yürüme ivmesinden hesaplanıyor. Bir plan
   "160 piksellik gayzer" isteyemez.
3. **Doğrulayıcı** (`tests/validate-levels.mjs`) 31 elle yazılmış + 80 üretilmiş
   bölümü, 3.188 buzu analitik olarak kontrol ediyor. Geçilemez tek bir zıplama
   varsa derleme düşüyor.

Market ve ekipman bu denklemin dışında: bütün bölümler **hiçbir şeyi olmayan**
bir penguene göre doğrulanıyor, yani satın aldıkların bir parkuru asla açamaz,
sadece kolaylaştırır.

---

## Çalıştırma

ES modülleri `file://` üzerinden çalışmaz, bu yüzden bir sunucu gerekiyor:

```bash
python3 -m http.server 8000
# tarayıcıda: http://localhost:8000
```

Yayına almak için klasörü olduğu gibi herhangi bir statik hostinge koymak yeterli
(GitHub Pages, Netlify, Vercel, Cloudflare Pages).

### Tek dosyalık sürüm

```bash
node tools/bundle.mjs dist/pengu.html
```

Bütün modülleri, stilleri ve işaretlemeyi tek bir HTML dosyasına düzleştirir —
sunucu gerektirmez, `file://` üzerinden bile açılır, tek belge kabul eden yerlere
yüklenebilir. Gerçek bir paketleyici değil, sırayla birleştirici: modülleri
bağımlılık sırasına göre ekler ve import/export sözdizimini temizler. Bu yüzden
çakışan bir üst düzey isim ya da temizlenemeyen bir import görürse sessizce
geçmez, hata verip durur.

## Testler

```bash
node tests/validate-levels.mjs   # bölüm geçilebilirlik doğrulayıcısı
node tests/ghost.mjs             # paylaşım kodu çözücüsü
node tests/economy.mjs           # ekonomi dengesi simülasyonu
node tools/bundle.mjs            # tek dosyaya paketle (isim çakışmasını da yakalar)
```

**Doğrulayıcı** oynamadan — analitik olarak — her bölümdeki her sıçramanın
penguenin o bölümdeki gerçek erişim mesafesi içinde olduğunu doğrular. 31 elle
yazılmış bölümü ve üretilen bölümlerden 80'lik bir örneklemi kapsar: **3.188
buz**. Ayrıca kaya-buz çakışması, tavan yüksekliği, fok devriyesinin kalkış
kenarını kapatması, orkanın buzun altında kalması, fırtınanın havada savurması,
dikey çeşitlilik ve parkur uzunluğu gibi kuralları da kontrol eder — biri
tutmazsa derleme düşer.

**Hayalet testi** 30 saniyelik bir koşuyu örnek örnek gidip geliyor mu, on bir
çeşit bozuk yapıştırma sessizce reddediliyor mu, isim değişikliği koşuyu koruyor
mu diye bakar.

Tarayıcı tarafı testler `playwright` ile yürütülüyor: bot 20 bölüm oynuyor,
ekipman fiziği ölçülüyor, kuş uyarı→dalış→çekiliş döngüsü izleniyor, 20 portre
ve 10 iz önizlemesinin gerçekten piksel bastığı doğrulanıyor.

---

## Mimari

```
index.html                 tek sayfa, tüm ekranlar gerçek HTML olarak
manifest.webmanifest       telefona "uygulama" olarak eklenebilsin diye
styles/
  tokens.css               renk, tipografi, boşluk, hareket — tek kaynak
  base.css                 reset + sayfa iskeleti
  ui.css                   bileşenler (HUD, ekranlar, düğmeler, kartlar)
src/
  main.js                  bootstrap: parçaları birbirine bağlar
  core/
    util.js                matematik, easing, deterministik rastgelelik
    input.js               klavye + dokunmatik + gamepad → tek girdi durumu
    audio.js               Web Audio ile sentezlenen ses (dosya yok)
    storage.js             localStorage, sürümlü ve bozulmaya dayanıklı
    particles.js           havuzlanmış parçacık sistemi (çöp üretmez)
  game/
    config.js              tüm oyun hissi sabitleri + zıplama erişimi (reachFor)
    skins.js               penguen koleksiyonu: palet, aksesuar çizimi, açılma şartları
    league.js              haftalık lig: puanlama, kademeler, hafta anahtarı
    daily.js               Günün Pengu'su: güne göre seçilen hedefler
    terrain.js             parkur bestecisi: raf, yamaç, uçurum, yarık, tünel
    entities.js            buz kütleleri, tehlikeler, balıklar, kontrol noktaları
    player.js              penguen fiziği ve çarpışma çözümü
    ghost.js               koşu kaydı, hayalet oynatma, paylaşım kodu
    world.js               simülasyon, kamera, kazanma/kaybetme
    levels.js              31 elle yazılmış bölüm planı
    generator.js           32+ ve günün bölümü için tohumlanmış üretici
    render.js              canvas çizimi (görsel varlık yok, hepsi prosedürel)
    missions.js            günlük görevler (tarihe göre tohumlanmış)
    game.js                oyun döngüsü, ödüller, durum makinesi
  ui/
    ui.js                  DOM'a dokunan tek yer
tests/
  validate-levels.mjs      bölüm geçilebilirlik doğrulayıcısı
  ghost.mjs                paylaşım kodu çözücüsü testleri
```

### Parkurlar piksel değil, cümle

Bölümler koordinat listesi olarak yazılmıyor. Bir bölüm planı "iki raf, sonra
bir yamaç, sonra içinde çatlak buz olan bir tünel, sonra uçurumdan iniş" der;
`terrain.js` bunu o bölümün büyüme ölçeğindeki **gerçek zıplama erişiminden**
geometriye çevirir.

```js
c.shelf({ n: 2, gap: 0.32, w: 190 });   // boşluk = erişimin %32'si
c.slope({ n: 3, rise: 0.44 });          // yükseliş = zıplama yüksekliğinin %44'ü
c.tunnel({ n: 6, headroom: 114, icicles: 3 });
c.cliff({ drop: 280, ledges: 3 });
```

Kimse piksel cinsinden boşluk yazmadığı için kimse imkânsız bir boşluk yazamıyor.
Aynı sözlüğü üretici de kullanıyor: sonsuz mod artık rastgele dikdörtgen dizmiyor,
elle yazılan bölümlerle aynı segmentlerden cümle kuruyor.

Besteci ayrıca fizikten türeyen sınırları kendisi uyguluyor: tuzak buzun genişliği
fitilinden, gayzerin genişliği uyarı süresinden, fırtınanın gücü yürüme ivmesinden
hesaplanıyor. Bir plan "160 piksellik gayzer" isteyemez, çünkü fitil onu taşımaz.

### Kıta: buz kütleleri ve rota ayrı

İki tür katı var. **Buzlar** rotadır — inilen her şey. **Arazi** (`terrain`)
kıtadır: uçurum yüzleri, tünel tavanları, sütunlar. Fizik ikisini de katı görür
(çarpışma zaten yandan itiyor ve tavana kafa vurduruyor), ama doğrulayıcının
yürüdüğü yol yalnızca buzlardan geçer. Böylece bir tünel tavanı gerçekten tavan
oluyor, bölüm yolunu ise bulandırmıyor.

Tavan alçaldığında zıplama da kısalıyor: `reachFor(scale, maxHeight)` tepe
noktası sınırlı bir zıplayışın ne kadar uzağa gittiğini veriyor, ve tüneldeki her
boşluk o sayıya göre ölçülüyor.

### Neden bu yapı

- **Arayüz canvas'a çizilmiyor, gerçek HTML.** Tipografi, odak yönetimi, ekran
  okuyucu etiketleri ve duyarlı yerleşim bedavaya geliyor.
- **Simülasyon ve çizim ayrı.** `world.js` hiçbir şey çizmez, `render.js` hiçbir
  şeyi değiştirmez. Biri bozulduğunda diğerine bakmaya gerek kalmıyor.
- **Sabit adımlı fizik (1/120 s).** 60 Hz, 120 Hz ve 144 Hz ekranlarda oyun aynı
  hissettiriyor; arka planda kalan sekme geri geldiğinde penguen ışınlanmıyor.
- **Görsel/ses varlığı yok.** Penguen, buzlar, kuzey ışıkları, su ve bütün sesler
  kodla üretiliyor. Toplam yük birkaç yüz KB, çevrimdışı çalışıyor.

---

## Zorluk eğrisi

Oyunun en çok emek verilen kısmı bu. Kural:

| Bölüm | Ne oluyor |
|-------|-----------|
| 1–3   | Sadece yürüme ve zıplama. Geniş buzlar, küçük aralıklar, sıfır tehlike. |
| 4–8   | Bölüm başına **tek** yeni mekanik. Her yeni şey güvenli bir buzdan tanıtılır ve hemen ardından sağlam bir buz gelir. |
| 9–13  | Mekanikler birleşmeye başlar, kontrol noktaları girer. |
| 14–18 | Gerçek baskı: tuzaklar, zincirler, dar pencereler. |
| 19–22 | Pusu mekanikleri: gayzer ve orka. Her biri yine kendi öğretici bölümünü alır. |
| 23–30 | Hiçbir şeye güvenilmez. Kaçan buz, zincirleme gayzer, hepsi bir arada. |
| 31+   | Üretilen sonsuz mod; zorluk 20 bölümde artıp sabitlenir. |

Ayrıca oyuncunun tarafında olan şeyler:

- **Coyote time (0.13 s)** — kenardan düştükten sonra hâlâ zıplayabilirsin.
- **Zıplama tamponu (0.15 s)** — yere değmeden basılan tuş unutulmaz.
- **Değişken yükseklik** — tuşu bırakınca alçak, basılı tutunca yüksek zıplar.
- **Kolay mod** — aynı bölümde 4 kez ölünce kendiliğinden teklif edilir; buzlar
  daha geç kırılır, tuzaklar yavaşlar. İstendiği an ayarlardan açılıp kapanır.
- **Kontrol noktaları** — uzun bölümlerde ölünce en baştan başlamazsın.
- **Ölünce bütün buzlar sıfırlanır** — kırık bir yol yüzünden bölüm kilitlenmez.

### Adaletin kodla korunması

Zorluk elle ayarlanınca kolayca haksız hale gelir, o yüzden kurallar
`tests/validate-levels.mjs` içinde yazılı ve her değişiklikte kontrol ediliyor:

- Her aralık ve her yükseliş, penguenin **o bölümdeki boyutundaki** gerçek
  sıçrama menzilinin içinde olmalı.
- Kısa fitilli buzlar (tuzak, düşen buz) basamak taşıdır: üstünde yürünmesi
  gerekmemeli, indiğin yerden zıplamak yetmeli.
- Zamanlama isteyen buzlardan (eriyen buz, yana kayan buz) önce **beklenebilir**
  bir buz olmalı. Çatlayan buzda beklemek yazı tura demektir; kaygan buzda ise
  yerinde durulamaz — ikisi de sayılmaz.
- Fok, üstünde olduğu buzun sağ şeridini kapatmamalı; orası bir sonraki sıçrama
  için nişan alınan yer.
- Hiçbir buz penguenden dar olamaz, hiçbiri suyun içinde olamaz, sal her zaman
  son buzun üstünde olmalı.

Bu doğrulayıcı geliştirme sırasında dokuz gerçek adaletsizlik yakaladı — geçilmesi
matematiksel olarak imkânsız üç sıçrama dahil.

---

## Buz türleri

| Tür | Görünüm | Davranış |
|-----|---------|----------|
| Sağlam | Düz beyaz | Hiç kırılmaz |
| Çatlak | Mavi çatlak çizgileri | Basınca çatlar, kısa süre sonra kırılır, sonra geri gelir |
| Sahte (tuzak) | Kızıl damar | Neredeyse anında kırılır — bas ve geç |
| Eriyen | Soluk, damlayan | Kendi döngüsünde erir ve geri donar |
| Cilalı | Üstünde parlama çizgileri | Kaygan, fren mesafesi uzun |
| Sürüklenen | Ok işaretleri | Bir yol boyunca gider gelir, üstündekini taşır |
| Düşen | Kesik çizgi | Basınca aşağı kaçar |
| Gayzer | Kabarcıklar, basınç halkası | Basınca tıslar; yarım saniye sonra seni havaya fırlatır |
| Kaçan | İnce bir çatlak çizgisi | Alçak ve cazip; tam inerken kaybolur |

## Hız balığı

Bölüm başına bir tane: kırmızı gövde, altın şimşek, göz kırpan bir hale. Yuttuğun
an penguen kızıla dönüyor, arkasında iz bırakıyor ve **%50 daha hızlı** koşuyor —
4,5 saniye boyunca. Son bir saniyede yanıp sönerek bitmek üzere olduğunu söylüyor.

Hep ana hattın dışında duruyor, yani almak bir bahis: sapmanın maliyeti var ama
kazandığı süre çok daha fazla — eğer bir buçuk kat hızda inişlerini
tutturabilirsen. Doğrulayıcı hem erişilebilir olduğunu hem de yol üstünde
durmadığını kontrol ediyor.

## Tehlikeler

- **Buz sarkıtı** — altından geçince titrer, sonra düşer.
- **Fok** — buzda devriye gezer. Yanından değil, **üstünden** atla; üstüne
  basarsan seni yukarı fırlatır.
- **Orka** — boşluktan sıçrar. Önce yüzgeci suyu yarar, sonra kendisi çıkar.
  Suyun altındayken zararsız, havadayken ölümcül.
- **Rüzgar** — öldürmez ama havada seni iter.
- **Fırtına** — dar bir sütun değil, geniş bir kuşak. Rüzgar sürekli sana karşı
  ve dalgalar hâlinde geliyor: sertken yürürken bile geri püskürtüyor, dinince
  yol veriyor. Sabit essin isteseydik sadece yavaş bir yürüyüş olurdu; dalgalı
  olunca karar hâline geliyor — dinginlikte koş, sertlikte sağlam buzda bekle.

---

## Pusu mekanikleri: buzun tuzakları

Oyunun "sinir bozucu ama adil" olması gereken kısmı. İkisinin de tek bir kuralı
var: **oyuncu bir kez öğrendikten sonra bir daha aynı şekilde ölmemeli.**
(Bölümün planlamadığı üçüncü pusu için → [kutup kuşu](#pusu-kutup-kuşu).)

**Gayzer buzu.** Üstüne bastığın an buz tıslamaya, kabarcıklar büyümeye ve buz
titremeye başlar. Yarım saniye sonra su sütunu patlar ve pengueni havaya
fırlatır — genellikle denize. Yarım saniye, o hızda bir buçuk buz boyu demek:
tepki verirsen kurtulursun, oyalanırsan uçarsın. Bazı gayzerler ise sen
basmadan, kendi saatlerine göre patlar; onların ritmini saymak gerekir.

**Kaçan buz.** Alçakta duran, tam ihtiyacın olan yerde beliren küçük bir buz.
Üstüne inmeye başladığın anda — ayağın değmeden hemen önce — kayboluyor.
Adaleti şuradan geliyor: **hiçbir zaman zorunlu değil.** Doğrulayıcı, her kaçan
buzun bulunduğu boşluğun o buz olmadan da geçilebildiğini kontrol ediyor. Yani
o buz bir yol değil, bir yem. Ayrıca denemede yalnızca bir kez kaçar; geri
donduktan sonra o denemede gerçek bir platformdur.

---

## Ekonomi ve market

Balıklar hem yıldız hem para. Kazanma yolları bilinçli olarak çeşitlendirildi;
tek kaynak olsaydı market kısa sürede anlamını yitirirdi:

| Kaynak | Kazanç |
|--------|--------|
| Toplanan balık | her biri 3 |
| Bir bölümü ilk kez bitirmek | 12 |
| Yeni kazanılan her yıldız | 8 |
| Hiç ölmeden bitirmek | 15 |
| Günün bölümü | 40 + seri başına 5 (en fazla 50) |
| Günlük görevler | 25–110 |
| Günün Pengu'su hedefleri | her biri 30 |

Bölümü tekrar oynamak yalnızca *yeni* ilerleme için ödeme yapar — ilk bölümü
sonsuza kadar tekrarlayarak para basmak mümkün değil.

Markette dokuz eşya var. Altısı sayı büyütüyor:

| Eşya | Etkisi | Seviye |
|------|--------|--------|
| Kar Botu | +%5 → %16 zıplama | 3 |
| Hızlı Ayak | +%5 → %15 hız | 3 |
| Krampon | cilalı buzda kayma %45 → %75 az | 2 |
| Kalın Tüy | her denemede bir kez ölümden kurtarır | 1 |
| Balık Mıknatısı | 90 → 165 px çekim | 2 |
| Rüzgâr Yeleği | fırtına savurması %55 az | 1 |

Üçü penguenin **ne yapabildiğini** değiştiriyor — [Aktif ekipman](#aktif-ekipman):

| Eşya | Etkisi | Seviye |
|------|--------|--------|
| Planör Kanat | havada basılı tut: 1.1 → 2.9 sn süzülme | 3 |
| Sırt Motoru | havada dokun: 1 → 2 ateşleme | 2 |
| Kuş Radarı | kuş uyarısı +0.35 → +0.7 sn | 2 |

**Hiçbiri bir bölümü açmaz.** Doğrulayıcı bütün bölümleri yükseltmesiz ve
ekipmansız temel değerlerle kontrol ediyor; market rahatlık ve hız satıyor,
erişim değil.

### Denge tahminle değil, ölçümle

Bir para biriminin tek önemli sorusu şu: **istenecek bir şey kalmayana kadar ne
kadar sürüyor?** Çeyrek saatte marketi bitiren bir ekonomi cömert değil,
bitmiştir — o andan sonra topladığın her balık değersizdir.

`tests/economy.mjs` oyunu kâğıt üstünde oynuyor: simüle edilmiş bir oyuncuyu
kampanyadan sonsuz moda kadar dakika dakika yürütüyor, gerçek ödül tablosunun
ödediğini ödüyor ve her kilometre taşına ne zaman ulaşıldığını yazıyor.
200 koşunun medyanı:

| Kilometre taşı | Süre | Gün | Bölüm |
|---|---|---|---|
| İlk market eşyası | 4 dk | 1 | 1 |
| İlk aktif ekipman (Planör Kanat) | 47 dk | 2 | 20 |
| Marketin yarısı | 7.4 saat | 18 | 119 |
| Marketteki her şey | 15.1 saat | 36 | 229 |
| Market + kozmetikler | 18.6 saat | 44 | 279 |

Dosyanın sonundaki eşikler **tasarımın kendisi** ve denge kayarsa derlemeyi
düşürüyorlar: ilk alım 3–12 dakika arasında olmalı, Planör Kanat en az 45
dakika uzakta olmalı, marketin tamamı en az 8 saat ve 10 gün sürmeli.

Bu ölçüm ilk çalıştırıldığında Planör Kanat'ın **9 dakikada** alınabildiğini
gösterdi — oyunun en ilginç eşyası, oyuncu daha kuşla tanışmadan. Fiyatlar buna
göre yeniden yazıldı.

---

## Günün Teklifi

Her gün bir kozmetik, indirimli, 24 saatliğine. Tarihe göre seçiliyor, yani o
gün herkes aynı teklifi görüyor. Kartın üstünde geri sayım var.

Normalde **kazanılan** kozmetikler de teklife giriyor — teklifin asıl anlamı bu:
belki hiç sağlayamayacağın bir şartın kısayolu. Ama nadirliğe göre fiyatlanıyor,
yani kısayol hiçbir zaman ucuz değil (Yaygın 260, Nadir 620, Efsanevi 1400,
Mitik 2600 balık; indirim %25–40).

---

## Para modeli

**Oyunun tamamı ücretsiz ve öyle kalıyor:** 31 bölüm, sonsuz mod, Günün
Bölümü, görevler, hayalet yarışı, lig, koleksiyonun tamamı. Satılan tek şey
kısayol.

Fiyat basamakları `src/game/store.js` içinde **veri olarak** duruyor:

| SKU | Fiyat | Ne veriyor |
|-----|-------|------------|
| `trail.single` | $0.99 | 1 iz |
| `skin.rare` | $1.99 | 1 nadir/efsanevi penguen |
| `skin.mythic` | $2.99 | 1 mitik penguen |
| `bundle.daily` | $2.99 | Günün teklifi + 500 balık |
| `bundle.full` | $4.99 | Penguen + iz + 1500 balık |

> **Hiçbiri şu an para almıyor ve alamaz.** Tarayıcı bir ödemeyi güvenle
> doğrulayamaz: oyuncu ile bedava alım arasındaki tek engel kendi
> localStorage'ındaki bir bayrak olurdu. `canPurchase()` bu yüzden tek kapı ve
> bilerek kapalı — yalan söyleyen bir düğme göstermek yerine dürüst bir cümle
> döndürüyor.
>
> Arka uç geldiğinde bu fonksiyon şuna dönüşür: SKU'yu POST et, imzalı makbuzu
> al, sunucuda doğrula, eşyayı sunucu versin. Oyunda başka hiçbir şey
> değişmiyor — kozmetikler zaten tek bir fonksiyondan veriliyor.

### Reklamlar

Ödüllü reklam (`CONTINUE`, `DOUBLE FISH`, `LUCKY START`) doğru fikir: banner
değil, oyuncunun kendi seçtiği reklam. Ama bir reklam SDK'sı (AdMob, IronSource)
gerçek bir uygulama kimliği ve ağ bağlantısı ister — bu yüzden **henüz
bağlanmadı**. Bağlandığında mekanikler hazır olacak şekilde tasarlandı:
ödül kaynağı tek bir adaptör.

---

## Geri gelme sebepleri

Oyunun kendisi bir sebep, ama tek sebep olmamalı. Beş katman:

- **Günün Pengu'su** — tarihe göre tohumlanır, o gün herkes aynı bölümü oynar.
  Dört hedefi var ve **gün boyunca birikirler**: hızlı bitir, balıkları topla,
  ölmeden geç, çürük balığa dokunma. Tek turda hepsini yapmak gerekmez — beşinci
  denemeyi başlatmaya değer kılan da bu.
- **Seri** — arka arkaya gün oynadıkça büyür, bir gün atlayınca sıfırlanır.
  Yedi günlük seri Altın Penguen'i açar.
- **Günlük görevler** — 21 görevlik havuzdan tarihe göre çekilen üç görev: bir
  kolay, bir orta, bir zor. Üç kolay görev hedefsiz bir gün demek; üç zor görev
  insanların atladığı gün demek. Aynı olayı izleyen iki görev seçilmez.
  Almadığın ekipmanı isteyen görevler listeye hiç girmez.
- **Haftalık lig** — puanlar pazartesi sıfırlanır, çıktığın kademe kalır. Pazar
  gecesi son bir hamle yapmaya değer olmasının sebebi bu.
- **Koleksiyon** — 20 penguen ve 10 iz, çoğu kazanılıyor. "Bir bölüm daha
  oynayayım" cümlesinin en somut karşılığı: 50. ölümsüz bölüm Ninja'yı,
  1000. balık Kral'ı, 5000. metre Astronot'u açıyor.

### Örnek görevler

| Ağırlık | Görev | Ödül |
|---------|-------|------|
| Kolay | 12 balık topla | 30 |
| Orta | Bir kuşun pençesinden kıl payı kurtul | 55 |
| Orta | Kanatlarınla 6 saniye süzül | 50 |
| Zor | Bir bölümü hiç durmadan bitir | 70 |
| Zor | Üç kuş dalışını boşa çıkar | 110 |
| Zor | Bir tüneli hiç ölmeden geç | 60 |

---

## Aktif ekipman

Marketin geri kalanı sayıları büyütüyor. Bu ikisi penguenin *ne yapabildiğini*
değiştiriyor — hem de aynı zıplama tuşuyla:

- **Planör Kanat** — havada zıplamayı **basılı tut**: kanatlar açılır, düşüş
  yavaşlar, biraz da ileri süzülürsün.
- **Sırt Motoru** — havada zıplamaya **bas**: motor bir kez yukarı ateşler.
- **Kuş Radarı** — kuş dalışa geçmeden önce sana daha uzun uyarı verir.

Basmak ile basılı tutmak arasındaki fark, ikisinin de tek tuşa sığmasının
sebebi: dokunmatikte üçüncü bir düğme yok ve olmamalı.

İkisi de yalnızca **yere değince** doluyor. Yani bunlar uçmak değil: zaten
verdiğin bir zıplama kararını havada tartışma hakkı. HUD'daki çubuk kararın
kendisi — bu boşluk için mi harcayacaksın, sonraki için mi sakla?

Bütün bölümler **hiçbir ekipmanı olmayan** bir penguene göre doğrulanıyor, yani
ekipman bir parkuru asla açamaz, sadece kolaylaştırır.

## Pusu: kutup kuşu

Bir skua, gerçekten yavru penguen kapan iri bir kutup martısı. Bölümün parçası
değil — **yönetmen olayı**: bölümün seçmediği bir anda geliyor. Ezberlediğin bir
parkurun dokuzuncu turda hâlâ seni korkutabilmesinin tek yolu bu.

Buzun üstünde bir gölge beliriyor ve **yaklaştıkça daha hızlı atıyor**. Bu
kasıtlı. Uyarısız anlık ölüm yazı-turadır ve insanlar oyunu bırakır; *başka bir
şeyle uğraşırken fark etmen gereken* bir uyarı ise "bir daha deneyeyim"
dedirtir. Pencere gerçekten dar.

Adaleti koruyan kurallar:
- vuruş noktası gölge çıktığı an kilitleniyor — kaçmak işe yarıyor;
- doğuştan/checkpoint'ten sonra `grace` süresi boyunca asla gelmiyor;
- iki dalış arasında bekleme süresi var;
- kapılırsan bölümü değil, kontrol noktasını kaybediyorsun;
- kolay modda sıklığı yarıya iniyor, uyarı uzuyor — kapatılmıyor.

12. bölümden önce hiç görünmüyor: oyuncu önce oyunu öğrenmeli.

## Koleksiyon

Penguen her karede sıfırdan çiziliyor, yani bir "skin" görsel dosyası değil —
bir palet artı küçük bir aksesuar çizeri. Bu yüzden her penguen birkaç yüz bayt,
her büyüme ölçeğinde çalışıyor ve gövdenin ezilip uzamasına kendiliğinden uyuyor.

**İki slot var**, ve mesele bu: **20 penguen × 10 iz = 200 kombin**. Bir gardırobu
liste olmaktan çıkarıp gardırop yapan şey, ikisinin birden *senin seçimin*
olması.

### Penguenler

Nadirlik bir güç seviyesi değil — her şey kozmetik ve öyle kalacak. Nadirlik
"bunu elde etmek ne kadar zordu"nun dilbilgisi:

| | Penguen | Şart |
|---|---|---|
| Yaygın | Penguen | Başlangıç |
| Nadir | Ninja · Korsan · Yılbaşı · Frak · Kâşif · Dalgıç · Aşçı | 50 ölümsüz bölüm · 20×3 yıldız · Aralık/240 balık · 300 balık · 120 bölüm · 150 ölüm · 380 balık |
| Efsanevi | Kral · Astronot · Ateş · Rock · Uzaylı · Hayalet · Şövalye | 1000 balık · 5000 m · 15 hız balığı · 60 hız balığı · 5 gece turu · 400 ölüm · 25 kuş dalışı |
| Mitik | Altın · Siber · Kutup Işığı · Buz Kraliçesi · Gölge | 7 günlük seri · Elmas lig · 300 sn süzülme · 45×3 yıldız · 15 penguen topla |

Aksesuarlar gerçekten çiziliyor: astronotun kaskı ve havada ateşleyen jeti,
ninjanın koşarken savrulan bandı, şövalyenin miğferi ve sorguçu, aşçının
sallanan kepi, uzaylının zıplayan antenleri, hayaletin dalgalanan eteği, Buz
Kraliçesi'nin omuzlarından çıkan kristaller.

### İzler

Ayrı bir slot: penguenin arkasında ne bıraktığı. Oyuncunun son konumlarından
çiziliyor — yani bir izin maliyeti on sekiz nesnelik bir halka tampon, o kadar.

Kar tozu, kabarcık, kıvılcım, buz kırığı, kalp, nota, alev izi, kutup ışığı ve
Boşluk (geçtiğin yerde ışık bırakmayan mitik iz).

## Haftalık lig

Sezon bir hafta. Puan uzun oynamaktan değil iyi oynamaktan geliyor: bölümü
bitirmek az, yıldızlar ve ölümsüz turlar daha çok, günün bölümü en çok. Pazartesi
puanlar sıfırlanıyor, **çıktığın kademe kalıyor**.

Bronz → Gümüş (500) → Altın (2.000) → Elmas (5.000).

Burada da dürüst olmak gerek: sunucu olmadan sıralanacak başka oyuncu yok, yani
kademeler bir *hedef*, bir sıralama değil. "Bu hafta Elmas'a çıkacağım" dedirten
şey merdivenin kendisi. Arka uç geldiğinde aynı puanlar hiçbir değişiklik
gerekmeden gerçek bir tabloyu besler.

## Günün Pengu'su

Günün bölümü tek parkur ve tek kronometreydi; bir kez yapılan bir şey. Artık aynı
parkurun üstünde bir hedef listesi var — hızlı bitir, balıkları topla, ölmeden
geç, çürük balığa dokunma — ve hedefler **gün boyunca birikiyor**, tek turda
hepsini yapmak gerekmiyor. Beşinci denemeyi başlatmaya değer kılan da bu.

Hedefler tarihten seçiliyor, yani aynı gün herkeste aynı liste çıkıyor.

## Hayalet yarışı ve sıralama

Sunucusuz bir oyunda gerçek bir küresel liderlik tablosu olamaz — o bir arka uç
ister. Ama *yarışmak* istemez.

Her deneme kaydediliyor: penguenin konumu saniyede 20 kez örnekleniyor. Bir
bölümü bitirdiğinde en iyi koşun saklanıyor ve bir dahaki oynayışında yanında
saydam bir penguen olarak koşuyor. HUD'daki `−0.42` / `+1.08` o an bulunduğun
noktada rekordan ne kadar önde ya da geride olduğunu gösteriyor.

Koşular taşınabiliyor. Bir koşu kısa bir koda dönüşüyor — her örnek bir öncekinden
farkı kadar, çoğu fark tek bayta sığıyor, başlıkta bölüm, süre ve koşan kişinin adı
var. 30 saniyelik bir koşu ~370 karakter: mesajla gönderilecek kadar kısa. Gelen
kodu **Sıralama** ekranına yapıştırınca o kişi tabloya giriyor ve hayaleti buzun
üstünde beliriyor.

Sıralama gerçek bir sıralama; sadece sunucu yerine paylaşım koduyla dolaşıyor.

## Kontroller

| | |
|---|---|
| ← → veya A D | Yürü |
| Boşluk / ↑ / W | Zıpla — basılı tut, yükseğe çık |
| Boşluk **havada basılı tut** | Kanatları aç, süzül *(Planör Kanat gerekir)* |
| Boşluk **havada tek dokunuş** | Sırt motorunu ateşle *(Sırt Motoru gerekir)* |
| R | Bölümü baştan başlat |
| Esc veya P | Duraklat |

Dokunmatik ekranda alttaki üç tuş, ayrıca gamepad desteği var. Ekipmanların
ikisi de aynı zıplama tuşuna bindi — çünkü dokunmatikte dördüncü bir düğme
olmamalı, ve "bas" ile "basılı tut" zaten iki farklı niyet.

---

## Tarayıcı desteği

Modern Chrome, Safari, Firefox ve Edge (masaüstü + mobil). ES modülleri, Canvas
2D, Web Audio ve `localStorage` kullanıyor. Ses yoksa, kayıt yapılamıyorsa veya
yazı tipi yüklenemiyorsa oyun yine de oynanır — hepsi isteğe bağlı.
