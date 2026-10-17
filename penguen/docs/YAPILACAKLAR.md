# Pengu — yapılacaklar, tek yerde

Bu dosya projenin **tek** iş listesi. Üç bölümü var ve hangisine bakacağın
belli: *senin* yapman gerekenler, *kodda* açık kalanlar, ve *kapatılmış*
kararlar (bir daha tartışılmasın diye nedeniyle birlikte duruyorlar).

`docs/BILGISAYARDA.md` kurulum ve "nasıl yapılır" rehberi olarak kalıyor —
orada **adımlar** var, burada **durum** var. Bir iş bittiğinde işareti burada
değişir.

Son güncelleme: 2026-10-17 · dal `claude/penguen-game-dev-6ym6pg` · 76 bölüm ·
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

### 2.1 Denizde iki gerçek ikiz — `tools/variety.mjs`

```
47–61   12 fiil   6/105 çift %80+ aynı  (%6)   ← oyunun en tekrarlı chapter'ı
```

Altı çiftin dördü 47 ile 48–51 arasında, ve bu **kusur değil**: 47'nin
dağarcığı diğerlerinin alt kümesi, yani chapter kendini öğretirken her bölüm
bir şey ekliyor. Geriye iki gerçek ikiz kalıyor:

- **54 Buzul Karnı ~ 58 Kılçık** — altı fiil, birebir aynı
- **59 Leopar ve Akıntı ~ 61 Açık Deniz** — yedi fiil, birebir aynı

Bir çifti kırmak için **ikisine de ayrı birer fiil** gerekiyor: tek ekleme
6/7 = 0,86 yapıyor ve eşik 0,80.

### 2.2 Sonsuz modun iki bölümü sıkışmıyor

`floorGap` üretilmiş bölümlerin boşluk aralığını aşağıdan kapatıyor ve 302
ile 305'i sıktı (0,55 → 0,44 ve 0,61 → 0,40). 296 ile 299 kımıldamadı: onların
gevşekliği `summit`, `geysers` ve `bait` gibi **boşluk parametresi olmayan**
parçalardan geliyor.

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
