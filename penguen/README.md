# Pengu — Antarktika'dan Kaçış

Yeni doğmuş bir penguen, eriyen buzlar arasında Antarktika'dan kaçmaya çalışıyor.
Buzlar üstüne basınca çatlıyor, bazıları eriyip yok oluyor, bazıları tuzak, bazıları
altındaki gayzerle seni havaya fırlatıyor. Bölüm ilerledikçe penguen büyüyor:
daha ağır zıplıyor, daha geniş yer istiyor.

30 elle tasarlanmış bölüm, sonsuz mod, günün bölümü, günlük görevler ve balıkla
alışveriş yapılan bir market var.

Bağımlılık yok, derleme adımı yok, backend yok. Sadece HTML + CSS + JavaScript.

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
node tests/validate-levels.mjs
```

Bu, oynamadan — analitik olarak — her bölümdeki her sıçramanın penguenin o
bölümdeki gerçek erişim mesafesi içinde olduğunu doğrular. 30 elle tasarlanmış
bölümü ve üretilen bölümlerden 80'lik bir örneklemi kapsar (1800'den fazla buz).

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

## Pusu mekanikleri

Oyunun "sinir bozucu ama adil" olması gereken kısmı. İkisinin de tek bir kuralı
var: **oyuncu bir kez öğrendikten sonra bir daha aynı şekilde ölmemeli.**

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
| Günlük görevler | 25–50 |

Bölümü tekrar oynamak yalnızca *yeni* ilerleme için ödeme yapar — ilk bölümü
sonsuza kadar tekrarlayarak para basmak mümkün değil.

Markette altı yükseltme var: Kar Botu (zıplama), Hızlı Ayak (hız), Krampon
(kayma), Kalın Tüy (denemede bir can), Balık Mıknatısı (balık çekimi) ve Rüzgar
Yeleği. **Hiçbiri bir bölümü açmaz.** Doğrulayıcı bütün bölümleri yükseltmesiz
temel değerlerle kontrol ediyor; market rahatlık ve hız satıyor, erişim değil.

> Not: bunlar oyun içi balıkla yapılan alımlar. Gerçek parayla satın alma bir
> ödeme sağlayıcısı ve sunucu tarafı doğrulama gerektirir — statik bir sitede
> güvenli biçimde yapılamaz, ayrı bir backend ister.

---

## Geri gelme sebepleri

- **Günün bölümü** — tarihe göre tohumlanır, yani o gün herkes aynı bölümü
  oynar. Süre karşılaştırmak ancak böyle anlam taşır.
- **Seri** — arka arkaya gün oynadıkça büyür, bir gün atlayınca sıfırlanır.
- **Günlük görevler** — havuzdan tarihe göre çekilen üç görev. Aynı olayı
  izleyen iki görev seçilmez, yoksa gün tek görevin üç kat ödediği bir güne
  dönerdi.

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
| Boşluk / ↑ / W | Zıpla (basılı tut, yükseğe çık) |
| R | Bölümü baştan başlat |
| Esc veya P | Duraklat |

Dokunmatik ekranda alttaki tuşlar, ayrıca gamepad desteği var.

---

## Tarayıcı desteği

Modern Chrome, Safari, Firefox ve Edge (masaüstü + mobil). ES modülleri, Canvas
2D, Web Audio ve `localStorage` kullanıyor. Ses yoksa, kayıt yapılamıyorsa veya
yazı tipi yüklenemiyorsa oyun yine de oynanır — hepsi isteğe bağlı.
