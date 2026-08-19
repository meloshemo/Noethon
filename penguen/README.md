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
| **İki bölüm (chapter)** | Buz Sahanlığı 1–31 · Zirve 32–41 — ikisi ayrı fiil |
| **41 elle yazılmış bölüm** | 31 sahanlık parkuru + 10 dikey tırmanış |
| **Tutunma** | Buz duvarına asıl, tırman, tekmele — ve kollarında sınırlı güç var |
| **Sonsuz mod** | Bölüm numarasıyla tohumlanmış — 42. bölüm herkeste aynı |
| **10 buz türü** | sağlam · çatlak · cilalı · eriyen · sürüklenen · düşen · tuzak · **sahte** · kaçan · gayzer |
| **4 tehlike** | sarkıt · fok · fırtına kuşağı · orka |
| **2 pusu** | Bölümün planlamadığı anda dalan kutup kuşu · bayrağa 100 px kala kopan buzul |
| **3 çürük balık etkisi** | ağırlaşma · ters kontrol · körlük |
| **24 penguen + 10 iz** | 5 nadirlik seviyesi, 240 kombin |
| **4 elmas penguen** | Tek yetenek taşıyan tek tür: zıplama · hız · süzülme · mıknatıs |
| **9 market eşyası** | 3'ü penguenin *ne yapabildiğini* değiştiriyor |
| **21 günlük görev** | üç ağırlıkta, her gün birer tane |
| **Haftalık lig** | Bronz → Gümüş (500) → Altın (2.000) → Elmas (5.000) |
| **Günün Pengu'su** | Herkese aynı bölüm, gün boyu biriken 4 hedef |
| **Günün Teklifi** | 24 saatlik indirimli kozmetik, geri sayımlı |
| **Hayalet yarışı** | Rekorun yanında koşuyor; kodunu paylaşınca arkadaşın da |
| **Kaldığın yerden** | Sekmeyi kapatsan da son kontrol noktasından devam ediyorsun |

---

## Öne çıkan özellikler

### 🧗 Zirve — oyunun ikinci fiili
32. bölümden itibaren dağ başlıyor ve soru değişiyor. Sahanlıkta soru "oraya
yetişir miyim?"di; dağda "ne kadar tutunabilirim?". Penguen buz duvarına
gömülüp asılı kalıyor, yavaşça tırmanıyor, ya da tekmeleyip karşı duvara
atlıyor. Asılmak azar azar, tırmanmak iki katından fazla, tekme bir çırpıda
tüketiyor — ve bar **sadece sağlam zeminde** doluyor. Yeni tuş yok: duvara
doğru bas (tutun), BOŞLUK'u basılı tut (tırman), BOŞLUK'a dokun (tekmele).
→ [ayrıntı](#zirve--tırmanış)

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

### 🐧 Gardırop — 24 penguen, 10 iz
Ninja, Kral, Astronot, Altın, Korsan, Ateş, Siber, Yılbaşı, Frak, Kâşif, Dalgıç,
Aşçı, Rock, Uzaylı, Hayalet, Şövalye, Kutup Işığı, Buz Kraliçesi, Gölge.
Çoğu satın alınmıyor, **kazanılıyor**. Seçtiğin penguen buzun üstünde gerçekten
o penguen — aksesuarlar canlı çiziliyor, jet havada ateşliyor, bant koşarken
savruluyor.
→ [ayrıntı](#koleksiyon)

### 💎 Elmas penguenler — yeteneği olan tek tür
Elmas *daha yükseğe zıplıyor ve buzda daha az kayıyor*, Jet *daha hızlı koşup
kuşu daha erken görüyor*, Albatros *daha uzun süzülüyor*, İmparator *balıkları
kendine çekiyor*. Etkiler küçük — kabaca bir market kademesi. Ve bir tanesi
kasten kendi başına işe yaramıyor: Albatros'un süzülme yeteneği, **Planör Kanat
yoksa sıfır**. Yetenek sahip olduğun bir şeyi iyileştiriyor, sana yeni bir şey
vermiyor.
→ [ayrıntı](#elmas-penguenler)

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
| [Zirve](#zirve--tırmanış) | Tutunma, tekme, baca — ikinci bölümün fiili |
| [Zorluk eğrisi](#zorluk-eğrisi) | Rampa tasarımı |
| [Buz türleri](#buz-türleri) · [Tehlikeler](#tehlikeler) | Oyun içi her mekanik |
| [Pusu mekanikleri](#pusu-mekanikleri-buzun-tuzakları) · [Kutup kuşu](#pusu-kutup-kuşu) | Ani ölüm olayları |
| [Ekonomi ve market](#ekonomi-ve-market) | Balık nasıl kazanılır, neye harcanır |
| [Koleksiyon](#koleksiyon) | 24 penguen, 10 iz, nadirlikler |
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
   bölümü, 3.172 buzu analitik olarak kontrol ediyor. Geçilemez tek bir zıplama
   varsa derleme düşüyor.
4. **Çözücü** (`tests/climb-run.mjs`) tırmanış bölümlerinde bir adım daha ileri
   gidiyor: *gerçek* `Player` sınıfını gerçek bölüm verisine karşı çalıştırıp
   her adım için işe yarayan bir tuş dizisi **arıyor**. Kalkış yerini, zamanını
   ve tuşu ne kadar basılı tuttuğunu tarıyor; hiçbir deneme tutmuyorsa o adımı
   kimse yapamıyordur ve bölüm yayına girmiyor. Bu kural üç gerçek oyun hatası
   yakaladı — duvar tekmesinin sessizce kesilmesi, tepeye çıkarken pengueni
   duvarın dibine ışınlayan çarpışma, ve oyuncu daha yerinden kıpırdamadan
   düşen serak.

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
node tests/validate-levels.mjs   # sahanlık bölümleri: geçilebilirlik
node tests/validate-climb.mjs    # tırmanış bölümleri: geometri
node tests/climb-run.mjs         # tırmanış bölümleri: gerçek fizikle çözücü
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
ekipman fiziği ölçülüyor, kuş uyarı→dalış→çekiliş döngüsü izleniyor, 24 portre
ve 10 iz önizlemesinin gerçekten piksel bastığı doğrulanıyor.

Ayrıca **dayanıklılık** testi: sanal bir gamepad takılıyor (yön, zıplama, ölü
bölge, ve `getGamepads()` hata attığında karenin hayatta kalması), sekme arkaya
alınıp kronometrenin kaymadığı ölçülüyor, odak kaybında tuşların bırakıldığı
görülüyor, sayfa kapatılıp yeniden açılıyor ve pengueninin **aynı kontrol
noktasında, aynı süreyle** başladığı piksel piksel doğrulanıyor. Elmas
penguenlerin yetenekleri de burada fiziğe ulaştıkları yerden ölçülüyor —
Albatros'un kanatsızken 0 kazandırdığı dahil.

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

## Sahte buz ve bayraktaki çöküş

İki tane bilerek "haksız hisseden" mekanik var. İkisi de aynı sözleşmeye tabi:
**ilk sefer şok, öğrendikten sonra kaçılabilir.**

**Sahte buz (`fake`).** Sağlam buzdan hiçbir farkı yok — ne kızıl damar, ne
renk, ne çatlak. Bastığında 0.46 saniye sonra gidiyor. Fitil, besteci
tarafından *koşarak geçilebilecek* genişliği garantiliyor: durup etrafına
bakan ölür, koşmaya devam eden geçer. Bilmemeyi değil, tereddüt etmeyi
cezalandırıyor. 23. bölümden itibaren.

**Bayraktaki çöküş.** Sala son 100–200 px kala yukarıdaki uçurumdan bir buzul
kopuyor. Oyunun en zalim şeyi ve bilerek öyle: bir bölümün son dört saniyesi
dikkatin düştüğü yerdir, seni orada da alabilen bir bölüm uykuda oynanmaz.

Coin-flip olmasını engelleyen üç şey: her yaklaşımda değil, yarısında
tetikleniyor; düşmeden önce buza gölge düşürüyor; ve **salın kendisine değil,
salın önündeki buza** iniyor — smashladığı şey hâlâ geçmen gereken zemin.
Varlığını bilen her seferinde geçer. Bilmeyen öğrenir. 8. bölümden itibaren,
kolay modda hem daha seyrek hem daha uzun uyarılı.

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
| İlk aktif ekipman (Planör Kanat) | 1.9 saat | 5 | 40 |
| Marketin yarısı | 17 saat | 40 | 256 |
| Marketteki her şey | 34 saat | 81 | 498 |
| Market + kozmetikler | 37.5 saat | 89 | 547 |

Dosyanın sonundaki eşikler **tasarımın kendisi** ve denge kayarsa derlemeyi
düşürüyorlar: ilk alım 3–12 dakika arasında olmalı, Planör Kanat en az 90
dakika uzakta olmalı, marketin tamamı en az 20 saat ve 40 gün sürmeli.

### Ama asıl mesele: ekonomi bitmemeli

Fiyat yükseltmek her şeyi sahiplenme gününü sadece **erteler**. O gün yine
gelir ve geldiğinde para birimi ölür — bir daha balık toplamanın anlamı kalmaz.

Bu yüzden hiç bitmeyen tek bir şey var: **Buzul Anıtı**. Blok blok fonladığın
bir buz yığını; her blok bir öncekinden %35 pahalı, karşılığında sadece bir
rütbe ve daha yüksek bir anıt alıyorsun. Hiçbir işe yaramıyor — sonsuz
olabilmesinin ve oyunu bozmamasının sebebi tam olarak bu.

İlk 40 blok **233 milyon balık** eder. Pratikte bitmez; her zaman balığı
koyacak bir yer var.

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

### İnternet gerekiyor mu

**Bugün: hayır.** Oyun bir kere yüklendikten sonra tamamen çevrimdışı çalışıyor —
bölümler, kayıt, hayalet, lig, görevler, gardırop, hepsi cihazda.

**Gerçek para ve ödüllü reklam devreye girdiğinde: evet**, ama sadece o iki iş
için. Doğru mimari şu: oyun çevrimdışı oynanabilir kalır, ağ sadece iki noktada
gerekir — ödeme doğrulaması (`canPurchase`) ve reklam gösterimi. Ağ yoksa o iki
düğme kapanır, oyunun geri kalanı hiç etkilenmez. İkisi de bilerek tek
fonksiyonun arkasına toplandı ki bağlantı kontrolü tek yerde yaşasın.

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

**İki slot var**, ve mesele bu: **24 penguen × 10 iz = 240 kombin**. Bir gardırobu
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
| Elmas | Elmas · Jet · Albatros · İmparator | 6.500 · 7.200 · 8.000 · 9.000 balık |

Aksesuarlar gerçekten çiziliyor: astronotun kaskı ve havada ateşleyen jeti,
ninjanın koşarken savrulan bandı, şövalyenin miğferi ve sorguçu, aşçının
sallanan kepi, uzaylının zıplayan antenleri, hayaletin dalgalanan eteği, Buz
Kraliçesi'nin omuzlarından çıkan kristaller.

### Elmas penguenler

Yirmi penguen kozmetik. Dördü değil — ve fark **kasten** dördüyle sınırlı, çünkü
"en pahalı penguen en güçlü penguendir" kuralı bir gardırobu bir güç merdivenine
çevirir.

| Penguen | Yetenek | Fiyat |
|---|---|---|
| 💎 Elmas | +%8 zıplama · kaymayı %30 azaltır | 6.500 |
| 🚀 Jet | +%10 hız · +0.20 sn kuş uyarısı | 7.200 |
| 🕊️ Albatros | +0.7 sn süzülme | 8.000 |
| 👑 İmparator | 120 px balık çekimi · +%5 zıplama | 9.000 |

Üç tasarım kuralı:

1. **Etki bir market kademesi kadar.** Elmas'ın zıplaması, Zıplama Botu'nun ilk
   kademesiyle aynı büyüklükte. Bölüm doğrulayıcısı erişimi *yeteneksiz* penguene
   göre hesaplıyor — yani elmas penguen hiçbir bölümü açmıyor, sadece açık olanı
   biraz rahatlatıyor.
2. **Yetenek sahip olduğun şeyi iyileştiriyor.** Albatros'un +0.7 saniyesi
   `glideMax`'e ekleniyor, ama `glideMax` kanat yoksa zaten 0 — yani Albatros'u
   giyip Planör Kanat'ı almadıysan hiçbir şey kazanmıyorsun. Test bunu ayrıca
   doğruluyor.
3. **Fiyatlar ekonominin en üstünde.** En ucuz elmas, marketin tamamından pahalı.
   Simülatöre göre ortalama oyuncu ilk elması ~10. saatte görüyor.

Yetenekler `world.js`'te market yükseltmeleriyle *toplanıyor*, çarpılmıyor:
kayma azaltma 0.92'de tavanlanıyor ki hiçbir kombinasyon buzu asfalta çevirmesin.

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

## Zirve — tırmanış

Otuz bir bölüm boyunca oyun tek bir soru sordu: **oraya yetişir miyim?** Yeni buz
türü eklemek o soruyu değiştirmiyor, sadece süslüyor. 32. bölümde soru değişiyor:
**ne kadar tutunabilirim?**

### Fiil

Penguen buz duvarına gömülüp asılı kalabiliyor. Asılmak bir bar tüketiyor ve bar
**sadece sağlam zeminde** doluyor. Üç hareket, sıfır yeni tuş:

| | |
|---|---|
| Duvara doğru bas | Tutun — yavaşça kayarsın, bar azar azar iner |
| Tutunurken BOŞLUK'u **basılı tut** | Tırman — 96 px/sn yukarı, bar iki katından hızlı iner |
| Tutunurken BOŞLUK'a **dokun** | Tekmele — duvardan itip karşıya fırla |
| Tepeye varınca | Kendiliğinden kenardan yukarı çekiliyorsun |

Ve asıl karar burada: **tekme sürünmekten çok daha verimli.** Bir bar 4,4 saniye;
sürünerek 338 piksel çıkarsın, tekmeleyerek 690. Ama tekme karşı duvarı
tutturmayı gerektiriyor — ıskalarsan bacanın dibine kadar düşersin. Güvenli olan
yavaş, hızlı olan riskli. Bir tırmanışın olması gereken şey tam olarak bu.

### Baca

İki karşılıklı duvar ve aralarında basacak hiçbir şey yok. Zıplayarak geçilmiyor;
tek yol tutunmak, ve tutunma tükeniyor. Uzun bacalarda duvara yapışık küçük
**mola çıkıntıları** var — barı orada doldurup ikinci nefese başlıyorsun.

Tepede baca öylece bitiyor: **duvarın başı sağlam zemin**, üstüne çekilip
çıkıyorsun. Bu, ilk denediğim tasarım değildi — şaftın içine asılı bir saçak
koymuştum ve son tekme onu sıyırıp yetmiş piksellik bir rafa konmak zorundaydı.
Kâğıtta çalışıyordu, pratikte defalarca beş pikselle ıskalıyordu. Çözücü bunu
gördü, ben de bölümün payı en dar hareketini tamamen kaldırdım.

### Bunun matematiği tahmin değil

Bir tekmenin gerçekte ne kadar yükselttiği `kickGain(ölçek, genişlik)` ile
fizikten türetiliyor: dar bacada karşı duvara *tepe noktasından önce* varırsın ve
yüksekliği korursun, geniş bacada düşerken varırsın ve hiçbir şey kazanmazsın.
Besteci, tekmenin sıfır ya da eksi kazandırdığı bir bacayı **kurmayı reddediyor**.

Aynı şekilde `reachAt(ölçek, yükseliş)`: 110 piksel yükselen bir zıplamanın
yatayda neredeyse hiç yolu kalmaz. Sahanlıkta mesafe ve yükseklik ayrı bütçelerdi
ve orada yeterince doğru; dağda değil — bu yüzden ikisi birlikte hesaplanıyor.

### Yayına giren ve girmeyen

`climb.js` içinde on beş tırmanış planı var. Onu hem geometri doğrulayıcısını
hem de fizik çözücüsünü geçiyor ve oyunda: **32–41**. Diğer beşinde çözücünün
bir yol bulamadığı en az bir adım var, ve *kimsenin çıkabildiğini kanıtlayamadığım
bir bölümü oyuna koymam*. Dosyada `ship: false` ile duruyorlar; besteci düzeldikçe
açılacaklar — `node tests/climb-run.mjs --all` hepsini birden dener ve
yayındakiler dışındakilerin hatalarını raporlar ama derlemeyi düşürmez.

Bu sayı ölçümle büyüyor, tahminle değil. Bir turda beşten ona çıktı ve çıkaran
şey tek bir geometri değişikliğiydi: **bir duvarın çıkış buzu artık o duvarın
tepesinin üstünü örtüyor.** Eskiden bitişikti, ve tepeye yeni çekilmiş bir
penguen tam o dikişte duruyordu — teknik olarak duvarda, teknik olarak buzda
değil, ikisinden de bir piksel uzakta. Örtüşünce "tepeye çıkmak" ile "varmak"
aynı şey oldu ve beş bölüm birden açıldı.

Bu, bir eksiği saklamak yerine ölçmenin sonucu. Kolay olanı yapıp on beşini de
göndermek, oyuncuyu geçilemeyen bir duvara çarptırmak olurdu.

---

## Kontroller

| | |
|---|---|
| ← → veya A D | Yürü — *buz duvarına doğru basılıysa: tutun* |
| Boşluk / ↑ / W | Zıpla — basılı tut, yükseğe çık |
| Boşluk **havada basılı tut** | Kanatları aç, süzül *(Planör Kanat gerekir)* |
| Boşluk **havada tek dokunuş** | Sırt motorunu ateşle *(Sırt Motoru gerekir)* |
| Boşluk **tutunurken basılı tut** | Duvarı tırman |
| Boşluk **tutunurken dokun** | Duvardan tekmele |
| R | Bölümü baştan başlat |
| Esc veya P | Duraklat |

Dokunmatik ekranda alttaki üç tuş, ayrıca gamepad desteği var. Ekipmanların
ikisi de aynı zıplama tuşuna bindi — çünkü dokunmatikte dördüncü bir düğme
olmamalı, ve "bas" ile "basılı tut" zaten iki farklı niyet.

**Gamepad**: sol çubuk ve D-pad yürütüyor (%35 ölü bölge), A/B/X/Y zıplatıyor,
Start duraklatıyor. Tarayıcı `getGamepads()` çağrısı hata atarsa kare düşmüyor —
o kare klavyeye düşülüyor, oyun devam ediyor.

---

## Arka plan ve kaldığın yer

Üç ayrı şey, üçü de ayrı ayrı test ediliyor:

**Sekme arkaya alınınca** oyun duraklıyor. Önemli olan sadece durması değil,
*kronometrenin akmaması*: `visibilitychange` geldiğinde döngü duruyor ve
geri dönünce biriktirici sıfırlanıyor, yani beş dakika başka sekmedeysen
süren beş dakika artmıyor (test ölçtü: `0 sn` kayma).

**Pencere odağını kaybedince** basılı tuşlar bırakılıyor. Alt+Tab yaparken sağ
ok basılıysa penguen sonsuza kadar sağa yürümüyor.

**Sekmeyi kapatınca** koşu kaydediliyor — kontrol noktasına her değdiğinde,
duraklatınca, ölünce ve `pagehide`'da. Geri geldiğinde ana ekrandaki düğme
**"Devam et · Bölüm 7 · 00:12.53"** diyor ve bastığında bıraktığın kontrol
noktasında, aynı süreyle, aynı ölüm ve balık sayısıyla başlıyorsun. Kayıt 36
saat sonra kendini siliyor, bölümü bitirince de siliniyor.

> Bu özellik yazılırken **gerçekten bozuktu** ve testle bulundu: başlık ekranı
> UI kurucusunda, yani `game` nesnesi var olmadan önce çiziliyordu — bu yüzden
> yarım kalmış koşuyu bilmesine imkân yoktu ve "Devam et" hiç görünmüyordu.
> `main.js` artık `attach()` sonrasında başlığı bir kez daha çiziyor.

---

## Tarayıcı desteği

Modern Chrome, Safari, Firefox ve Edge (masaüstü + mobil). ES modülleri, Canvas
2D, Web Audio ve `localStorage` kullanıyor. Ses yoksa, kayıt yapılamıyorsa veya
yazı tipi yüklenemiyorsa oyun yine de oynanır — hepsi isteğe bağlı.
