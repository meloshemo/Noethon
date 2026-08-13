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
    config.js              tüm oyun hissi sabitleri
    entities.js            buz kütleleri, tehlikeler, balıklar, kontrol noktaları
    player.js              penguen fiziği ve çarpışma çözümü
    world.js               simülasyon, kamera, kazanma/kaybetme
    levels.js              30 elle tasarlanmış bölüm
    generator.js           31+ ve günün bölümü için tohumlanmış üretici
    render.js              canvas çizimi (görsel varlık yok, hepsi prosedürel)
    missions.js            günlük görevler (tarihe göre tohumlanmış)
    game.js                oyun döngüsü, ödüller, durum makinesi
  ui/
    ui.js                  DOM'a dokunan tek yer
tests/
  validate-levels.mjs      bölüm geçilebilirlik doğrulayıcısı
```

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

## Tehlikeler

- **Buz sarkıtı** — altından geçince titrer, sonra düşer.
- **Fok** — buzda devriye gezer. Yanından değil, **üstünden** atla; üstüne
  basarsan seni yukarı fırlatır.
- **Orka** — boşluktan sıçrar. Önce yüzgeci suyu yarar, sonra kendisi çıkar.
  Suyun altındayken zararsız, havadayken ölümcül.
- **Rüzgar** — öldürmez ama havada seni iter.

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
