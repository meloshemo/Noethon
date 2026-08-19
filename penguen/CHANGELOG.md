# Değişiklikler

Sürüm numarası yok çünkü tek bir web adresine yayınlanıyor; tarih ve ne
değiştiği yeterli. En yeni en üstte.

---

## Bölüm IV — Kar Topu · 62–76

Oyunun dördüncü fiili, ve penguenin *yapmadığı* ilk fiil. Atma tuşu yok, kar
topu toplamak yok, yeni tuş yok. Rakipler nişan aldıkları anda durduğun yere
atıyor ve bir kar topu değdiği ilk şeyde duruyor — gerisi tek fikir: **yolu
kapatan pengueni atıcıyla arana koy, sonra oradan çekil.**

- `Arena` bestecisi, `brawl.js` içinde 15 plan
- `validate-brawl.mjs`: her atış hattı bölüm verisinden yeniden yürünüyor
- `brawl-run.mjs`: arenalar gerçek `World` ile oynanıp kazanılıyor
- `browser-brawl.mjs`: kurallar gerçek sayfada

İki geometri kararı ölçümle çıktı: rakipler **ince buz sivrilerinde** duruyor
(geniş raf, hattı birkaç piksel sonra kendi zeminine gömüyordu) ve kayalar
**yukarıdan sarkıyor** (zeminden çıkan sütun, cevabın iki parçası arasına duvar
koyuyordu).

## Bölüm III — Buz Altı · 47–61

Tersine çevirme: buzun üstünde penguen komedyen, suda çevrenin en hızlı şeyi.
Bölüm penguene daha çok iş yaptırarak değil **bırakarak** zorlaşıyor; elinden
alınan tek şey hava. Bırak yüksel, bas dal; bir ciğer 9,5 saniye ve sadece
buzdaki deliklerde doluyor.

- `Deep` bestecisi, `dive.js` içinde 15 plan
- `validate-dive.mjs` (geometri + nefes bütçesi), `dive-run.mjs` (gerçek
  `World`: akıntı, deniz leoparı, nefes sayacı)
- Beş hata testlerden çıktı; en kötüsü negatif modulo yüzünden geriye sayan
  bir çizim döngüsüydü ve ilk su altı bölümü oyunu donduruyordu

## Bölüm II — Zirve · 32–46

Tutunma: duvara asıl, tırman, tekmele — ve kollarındaki güç sadece sağlam
zeminde doluyor. On beş tırmanışın hepsi hem geometri doğrulayıcısını hem fizik
çözücüsünü geçiyor.

- Baca artık penguenin durduğu buzun **üstünde** kuruluyor (şaft ile kalkış
  buzu birlikte kararlaştırılıyor)
- Mola rafları için **duvarın kendisi kırılıyor**; raf, sütunun başı oluyor
- Çözücü, çıkacağı duvarı tekmeleyip bırakmıyor

## Altyapı

- `npm start` · `npm test` · `npm run build` — bağımlılıksız sunucu ve tek
  komutluk test koşucusu (`tools/serve.mjs`, `tools/test.mjs`)
- `tools/lint.mjs`: paketleyici listesi, bölüm sayısı tutarlılığı, debug artığı,
  paket boyutu
- `tests/save.mjs`: v1'den bugüne her kayıt sürümü kayıpsız açılıyor
- `sw.js`: bir kere online açtıktan sonra offline oynanıyor
- GitHub Actions: her push'ta bütün testler, yayına almadan önce yeşil şart
- `docs/BILGISAYARDA.md`: bilgisayarda yapılması gereken işlerin listesi
