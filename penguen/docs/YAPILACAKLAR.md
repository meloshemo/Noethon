# Pengu — yapılacaklar, tek yerde

Bu dosya projenin **tek** iş listesi. Üç bölümü var ve hangisine bakacağın
belli: *senin* yapman gerekenler, *kodda* açık kalanlar, ve *kapatılmış*
kararlar (bir daha tartışılmasın diye nedeniyle birlikte duruyorlar).

`docs/BILGISAYARDA.md` kurulum ve "nasıl yapılır" rehberi olarak kalıyor —
orada **adımlar** var, burada **durum** var. Bir iş bittiğinde işareti burada
değişir.

Son güncelleme: 2026-10-18 · dal `claude/penguen-game-dev-6ym6pg` · 76 bölüm ·
54 test paketi (44 node + paketleme + 10 tarayıcı)

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
| 2.6 | `skua.mjs` seyrek takılıyor | **açık** — elli koşuda bir, tekrarlanamadı |

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

### 2.6 `tests/skua.mjs` seyrek takılıyor

Kamera turunda elli koşuda bir kere düştü ve bir daha tekrarlanamadı: arka
arkaya elli koşuda sıfır hata, değişiklikten önceki kodda da sıfır. Kuşun
kanat salınımı `Math.random()` ile başlıyor, yani paket gerçekten
deterministik değil.

Tahmin yürütüp tetiklenmesini göremediğim bir testi değiştirmek, hatayı
düzeltmek değil gizlemek olur. Buraya yazılıyor ki bir dahaki sefere
"bilinmeyen bir şey" değil, **bilinen bir şey** olsun: düşerse önce kuşun
tohumuna bakılmalı.

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
node tools/test.mjs --no-browser   # 44 paket, ~2 dk, kurulumsuz
node tools/lint.mjs                # proje kuralları
node tools/variety.mjs --twins     # tekrar: hangi bölümler birbirine benziyor
node tools/difficulty.mjs --chapter=2,3,4   # zorluk eğrisi (I kırk dakika sürer)
```

Bir şey "düzeldi" demeden önce ölçüsü olmalı. Bu projede kural bu ve dosyanın
her satırı bir ölçünün sonucu.
