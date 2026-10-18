# Pengu — yapılacaklar, tek yerde

Bu dosya projenin **tek** iş listesi. Üç bölümü var ve hangisine bakacağın
belli: *senin* yapman gerekenler, *kodda* açık kalanlar, ve *kapatılmış*
kararlar (bir daha tartışılmasın diye nedeniyle birlikte duruyorlar).

`docs/BILGISAYARDA.md` kurulum ve "nasıl yapılır" rehberi olarak kalıyor —
orada **adımlar** var, burada **durum** var. Bir iş bittiğinde işareti burada
değişir.

Son güncelleme: 2026-10-18 · dal `claude/penguen-game-dev-6ym6pg` · 76 bölüm ·
52 test paketi (42 node + paketleme + 10 tarayıcı)

---

## 1. Sende olanlar

| | İş | Durum | Süre |
|---|---|---|---|
| 1.1 | GitHub Pages'i aç (`meloshemo/cld`) | **bitti** — canlı, deploy #64 yeşil | — |
| 1.2 | CI'nın çalıştığını gör | **bitti** — her push'ta iki iş koşuyor | — |
| 1.3 | `main` dalını koru (status check zorunlu) | **açık** | 1 dk |
| 1.4 | Dalı `main`'e birleştir | **açık, senin kararın** | 2 dk |
| 1.5 | Gerçek cihazda oyna ve his notu al | **açık — en değerli iş** | 30 dk |
| 1.6 | Offline'ı doğrula (uçak modu) | **açık** | 2 dk |
| 1.7 | Kendi alan adı | **açık, isteğe bağlı** | 10 dk + DNS |
| 1.8 | Yasal metinleri okuyup onayla | **açık, senin kararın** | 10 dk |

Adımların hepsi `docs/BILGISAYARDA.md` içinde. İkisi bitti, kalanlar senin
hesabını, cihazını ya da kararını istiyor.

**1.5 neden en değerli:** testler mekaniği kanıtlıyor, **hissi** kanıtlamıyor.
Otomatik bir testin göremediği tek şey bu. Kötü hissettiren her şeyin ayarı
`src/game/config.js` içinde tek yerde duruyor.

---

## 2. Kodda açık kalanlar

Hepsi ölçülmüş; yanlarındaki sayı tahmin değil, aracın okuması.

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

### 2.1b Denizin altı bölümü hâlâ hedefinin üstünde kolay

`node tools/difficulty.mjs --chapter=3` altı bölüme "kolay" diyor: 47, 50, 52,
53, 56, 60. İkizler turunda 58 (%29 → %15) ve 59 (%22 → %2) banda girdi ve
toplam sapma 3,8 → 3,0'a indi, ama kalanlar durdu.

Nedeni ölçüldü ve tek bir yerde: bestecinin bir bacak için tahmini ile o
bacağın **gerçek** maliyeti arasında yirmi puana varan bir pay var, ve pay
akıntı bandı olan bacaklarda en büyük (bir bant rezervi, sütunun geçilecek en
kötü noktasından fiyatlanıyor). Bacağa parça eklemek bu yüzden bir yere kadar
işe yarıyor: besteci bütçe dolduğu için reddediyor, oyuncu ise hâlâ yüzde
yirmi nefesle çıkıyor. Kapatmak isteyen önce o payı küçültmeli, bölümlere
parça eklemeye çalışmamalı.

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

Taban hedefi 0,22; dördü de hâlâ gevşek tarafta, ama artık dördü de dialin
ucunda. Kalanı 2.1b ile aynı cins bir iş.

### 2.3 Zirvenin kalan kol gücü hedefin üstünde — ve kaldırılamıyor

46 üçte bir barla bitiyor, hedef bant onda bir diyor. Orta bacası çözücünün
fiziksel olarak tırmanabildiği yükseklikte (415'i geçemiyor), diğer iki
bacası tam bütçe çizgisinde. Üçüncü bacaya kırk piksel eklendi ve sayı
kımıldamadı, çünkü belirleyici adım başka yerde ve o da bir sınıra dayanmış.
**Bayrak tavan hakkında bir gerçek, plan hakkında değil.**

### 2.4 Arenanın "en yakın top"u bir kadran değil

Final 55px, hedef 16px. Baskı eklemek **işe yaramıyor**: ikinci bir lobber
asıldığında sayı kötüleşti (55 → 57px), çünkü metrik çözücünün seçtiği rotayı
ölçüyor ve çözücü en güvenli rotayı seçiyor. Arenayı zorlaştırmak rota kapatmak
demek — yani geometri.

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

---

## 4. Nasıl ölçülür

```bash
node tools/test.mjs --no-browser   # 42 paket, ~2 dk, kurulumsuz
node tools/lint.mjs                # proje kuralları
node tools/variety.mjs --twins     # tekrar: hangi bölümler birbirine benziyor
node tools/difficulty.mjs --chapter=2,3,4   # zorluk eğrisi (I kırk dakika sürer)
```

Bir şey "düzeldi" demeden önce ölçüsü olmalı. Bu projede kural bu ve dosyanın
her satırı bir ölçünün sonucu.
