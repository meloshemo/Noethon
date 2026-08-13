# Pengu — Antarktika'dan Kaçış

Yeni doğmuş bir penguen, eriyen buzlar arasında Antarktika'dan kaçmaya çalışıyor.
Buzlar üstüne basınca çatlıyor, bazıları eriyip yok oluyor, bazıları tuzak.
Bölüm ilerledikçe penguen büyüyor: daha ağır zıplıyor, daha geniş yer istiyor.

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
bölümdeki gerçek erişim mesafesi içinde olduğunu doğrular. 18 elle tasarlanmış
bölümü ve üretilen bölümlerden 80'lik bir örneklemi kapsar.

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
    levels.js              18 elle tasarlanmış bölüm
    generator.js           19+ için tohumlanmış üretici
    render.js              canvas çizimi (görsel varlık yok, hepsi prosedürel)
    game.js                oyun döngüsü ve durum makinesi
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
| 19+   | Üretilen sonsuz mod; zorluk 20 bölümde artıp sabitlenir. |

Ayrıca oyuncunun tarafında olan şeyler:

- **Coyote time (0.14 s)** — kenardan düştükten sonra hâlâ zıplayabilirsin.
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

Bu doğrulayıcı geliştirme sırasında altı gerçek adaletsizlik yakaladı — geçilmesi
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

## Tehlikeler

- **Buz sarkıtı** — altından geçince titrer, sonra düşer.
- **Fok** — buzda devriye gezer. Yanından değil, **üstünden** atla; üstüne
  basarsan seni yukarı fırlatır.
- **Rüzgar** — öldürmez ama havada seni iter.

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
