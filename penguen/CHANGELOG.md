# Değişiklikler

Sürüm numarası yok çünkü tek bir web adresine yayınlanıyor; tarih ve ne
değiştiği yeterli. En yeni en üstte.

---

## Zorluk ölçülmeye başladı, ve ölçü kötü haber verdi

"Bu bölüm kolay" bir kanaattir, ta ki biri bir sayı üretene kadar. Projede
zaten bir sayı vardı ve yanlış olanıydı: bir boşluk erişimin içindedir ya da
değildir, ve bu, oraya ulaşmanın emek isteyip istemediği hakkında hiçbir şey
söylemez.

Alet çözücülerin kendisi çıktı. İlk buldukları yolda durmalarına izin
verilmezse **kaç yol olduğunu** söylüyorlar. Yüz tuş dizisinin yaptığı bir adım
cömerttir, ikisinin yaptığı bir adım duvardır, ve ikisi de eşit derecede
geçilebilirdir: zorluk, adaletsizlik ölçülmeden ölçülüyor.

`tools/difficulty.mjs` ilk koşuşunda kendini ödedi:

- **Chapter I eksi %53 eğimliydi.** Kolaylaşıyordu.
- **Chapter III tek konusunu hiç tehdit etmiyordu.** Ciğerler hiçbir bölümde
  üçte birin altına inmiyordu.
- **Chapter II** hedeflenen rampanın üçte birinde ilerliyordu.
- **Chapter IV**'ün eğimi doğruydu, üç bölüm onu görmezden geliyordu.

Dördünün de artık tek bir sütuna sığan bir zorluk eğrisi var: `tight`,
`effort`, `breath`, `heat`. Değerler tahminle değil çözücüye sorularak
dolduruldu.

Yol boyunca öğrenilen iki şey dosyada duruyor. Birincisi: **yanlış şeyi ölçmek
hiçbir şey öğretmez.** Dağda tolerans denendi, iki kez, ve iki kez hiçbir şey
göstermedi; tırmanan kişinin hissettiği şey barın kendisi. İkincisi:
**emniyet ağları sessizce tavan olabiliyor.** Denizde nefes deliği açan
otomatik kural bütçenin %45'inde tetikleniyordu, yani bütçeyi yükseltmek
hiçbir şeyi değiştirmiyordu.

---

## Kaydedilmiş bir nokta, altındaki zeminden uzun yaşamamalı

Açılışlar düzeldikten sonra hata hâlâ duruyordu ve belirtisi başkaydı: oyun
açılır açılmaz penguen **gökten düşüyor** ve anında eleniyordu.

Sebep şuydu. "Devam et" daha önceki bir koşudan kaydedilmiş bir koordinatı geri
yüklüyor ve o koordinata körü körüne güveniyordu. Bir koordinat yalnızca onu
üreten bölümde bir koordinattır; bölümün açılışı düzeltilince aynı iki sayı
açık denizi göstermeye başladı. Penguen oraya konuyor, düşüyor, ölüyor ve ölünce
**yine aynı noktaya** konuyordu. Her açılışta, sonsuza kadar, kaydı silmekten
başka çıkışı olmadan.

Hiçbir kural çiğnenmediği için hiçbir şey fark etmiyordu: nokta, artık var
olmayan bir bölüm için kusursuz bir noktaydı.

- Oturum artık bölümün **şeklinin parmak izini** taşıyor. Tutmazsa oturum
  teklif bile edilmiyor, kayıttan siliniyor.
- Parmak izi tutsa bile nokta **bir zeminin üstünde mi** diye bakılıyor.
  Sürüklenmiş bir buz ya da erimiş bir zemin, geçerli bir noktayı geçersiz bir
  yere çevirebiliyor.
- Aynı kontrol her yeniden doğuşta da yapılıyor: bozuk bir nokta nereden gelirse
  gelsin ölüm döngüsü kuramıyor, bölümün başına düşülüyor.

Yanında küçük bir şey daha: başlık düğmesi 76. bölümden sonra "Bölüm 84"
diyordu, yani var olmayan bir bölüm. Üç ekran doğru kuralı zaten biliyordu,
dördüncüsü bilmiyordu; artık tek yerden geliyor.

`tests/browser-session.mjs` dört yolu birden sürüyor: geçerli oturum geri
geliyor mu, bayat olan atılıyor mu, boşluktaki nokta ölüm döngüsü kuruyor mu ve
sonsuz mod doğru adlandırılıyor mu.

---

## Bölümlerin bir arkası oldu, açılışlar saniyeyle ölçülüyor

31. bölüm başlar başlamaz öldürüyordu. Sebebi bir boşluk değildi: doğuş noktası
ilk buza **sabit seksen piksel** içeriden konuyordu. İlk buzlar iki yüz elli
piksel genişken bu doğru sayıydı, zorluk geçişinde daraltılınca sağa basan
oyuncuya üçte bir saniye kalıyordu. Sabit piksel, altındaki her şey değişirken
sessizce yanlış hâle gelen türden bir sayı.

Aramaya başlayınca ikinci bir şey çıktı ve daha kötüydü: **doğuş noktasının
arkasında hiçbir şey yoktu.** Sola yürümek 23. bölüme kadar her yerde yarım
saniyeden kısa sürede boğuyordu. Birinci bölümün tek tabelası "Yürü: ← →"
diyor. Denize düşmek oyunun kendisi; öğreticiye uyduğu için denize düşmek değil.

İkisi de mesafe hatası değildi, o yüzden mesafe kontrol eden hiçbir şey
göremezdi. Düzeltmeler yapısal:

- Açılış artık **saniye** cinsinden: her bölüm zemin bitmeden 0,6 saniye
  veriyor ve ilk buz bunu tutacak kadar geniş olmak zorunda. Piksel çürür,
  saniye çürümez.
- Her bölümün bir arkası var. İlk buz dünyanın soluna kadar uzatıldı ve arkasına
  penguenin indiği kaya yüzü kondu. Rota hiç değişmedi, çünkü rota buzun
  yalnızca sağ kenarını okuyor.
- Dağda taban genişletmek olmazdı: taban rotanın kendisi ve genişletince
  besteci iki basamağı yutup son tekmeyi dört yüz piksele çıkardı. Onun yerine
  tabanın iki yanına, suya kadar inen kaya omuzlar kondu. Fizik katı görüyor,
  rota hiç görmüyor.

İki yeni test bunu bir daha olmaz hâle getiriyor. `tests/spawn-safe.mjs`
76 bölümü gerçek `World` ile açıp üç şey deniyor: hiçbir şey yapma, sağa yürü,
sola yürü. `tests/shelf-run.mjs` ise I. chapter'ın rotasını gerçek doğuş
noktasından başlayıp gerçek `Player` ile baştan sona yürüyor. Sahanlığın
çözücüsü yoktu, diğer üç chapter'ın vardı.

Yazılırken çözücünün kendisi de bir hata verdi: fırtına fazını periyodun
yalnızca beşte biri kadar tarıyordu ve iki rüzgâr boşluğunu geçilemez sanıyordu.
Bölümler doğruydu, çözücü yanılıyordu.

---

## "Şaşırt beni" gitti, README gerçeğe döndü

Kimlik ekranındaki ikinci düğme kaldırıldı. Tek işi "bir bas ve oyna" olan bir
ekran, seni oynatmayan ikinci bir düğme sunmamalı; alan zaten uydurulmuş bir
adla dolu geliyor ve düzenlenebilir. Yasal metinler de buna göre düzeltildi:
artık "tuş bir tane uydurur" değil, "alan zaten dolu geliyor" diyor.

README baştan sona gerçekle karşılaştırıldı ve **anlattığı ama var olmayan**
şeyler ayıklandı: 20 bölüm oynayan bir bot, sanal gamepad testi, sekme kayması
ölçümü ve portre önizleme testi. Hiçbiri yoktu. Yerine gerçekten koşan yedi
tarayıcı paketinin ne ölçtüğü tek tek yazıldı.

Düzelen sayılar: tek dosya 385 KB değil 732 KB, doğrulanan buz 3.188 değil
3.271, sonsuz mod 31'den değil 77'den başlıyor, market sekiz değil dokuz eşya,
müzik dört değil beş sahne, lint dört değil sekiz kural denetliyor. Dosya ağacı
on bir modül eksikti. Zorluk tablosu yalnızca ilk chapter'ı anlatıyordu, artık
dördünü de anlatıyor.

Bir de **Ne var, ne yok** bölümü eklendi. İkinci yarısı daha önemli: gerçek
para, ödüllü reklam, gerçek zamanlı çok oyunculu, gerçek sıralama tablosu,
gamepad testi, Safari/Firefox testi ve gerçek cihazda oynama yok, hepsinin
sebebi yazıyor. Bir README'nin yalan söylemesinin normal yolu olmayan bir şeyi
anlatmak değil, olan bir şeyi olduğundan iyi anlatmaktır.

Ve bir test eksikti: **tek dosya sürümünün gerçekten açıldığını hiçbir şey
doğrulamıyordu.** İnsanlara verilen kopya o: e-postayla giden, `file://` ile
açılan, yayınlanan linkin arkasındaki dosya. `tests/browser-bundle.mjs` onu
sunucusuz açıp bölüm besteletiyor ve kronometrenin döndüğüne bakıyor.

---

## İki dil ve makine gibi yazmayı bırakma

Oyun artık İngilizce de konuşuyor. Türkçe bir oyunun üstüne geçirilmiş bir
katman değil: her metin iki kere yazıldı ve Türkçesi asıl. Arayüz metinleri tek
bir sözlükte, içeriğe ait olanlar (bölüm adı, penguen tanıtımı, market etiketi,
görev, lig kademesi, unvan) girdilerin kendi `en` bloğunda.

Dil ilk açılışta tarayıcıya uyuyor, sonra oyuncunun seçimi geçiyor. Seçici her
dilin adını kendi dilinde yazıyor, tam da okuyamadığı bir arayüzde kalmış olan
oyuncu için.

Yazının kendisi de elden geçti. Arayüz uzun tirelerle doluydu, cümle üstüne
cümle bir tirenin üstünde dönüyordu. Makine yazısı gibi okunuyordu, çünkü
öyleydi. Oyuncunun gördüğü her cümle virgülle, iki noktayla ya da noktayla
yeniden yazıldı ve `tools/lint.mjs` geri gelmesine izin vermiyor.

Üç denetim eksik metni görünmez olmaktan çıkarıyor: sözlüklerin anahtarları
birebir aynı olmalı, kodun istediği her anahtar sözlükte olmalı ve
`tests/browser-lang.mjs` dili değiştirip her ekranda Türkçe harf arıyor.
Sonuncusu ilk koşuşunda dört gerçek boşluk buldu.

---

## Rüzgâra bir iş verildi, sahanlık sertleşti

Rüzgâr havaydı. Esiyordu, kar yatıyordu ve bölümde hiçbir şey değişmiyordu,
çünkü doğrulayıcı fırtınanın gücünü "rüzgâr erişimi asla değiştirmemeli"
kuralıyla kısıtlıyordu. O cümle "rüzgâr asla okunmaya değmemeli" ile aynı
cümle.

Asıl sebep daha aşağıdaydı: fizik rüzgârı siliyordu. İtki doğrudan `vx`'e
ekleniyor, bir üst satırdaki yürüme kelepçesi de her karede hızı geri çekiyordu.
Fırtına pengueni dört saniye itip iniş noktasını sıfır piksel değiştirebiliyordu.
Rüzgâr artık kendi kanalında: kelepçe oyuncunun istediği hıza sahip, sürüklenme
havanın verdiği hıza, ve ikisi birbirini silemiyor.

Kural tersine çevrildi. Rüzgâr artık dört vuruşluk bir eğri (karşı, dinginlik,
arkadan, dinginlik) ve fizik, çizim, ibre ve kanıt aynı eğriyi okuyor. Duran
penguen sürüklenmiyor, yani beklemek gerçek bir cevap ve bedeli zaman.

İki parça bunun üstüne kuruldu. `windGap` zıplamanın yetmediği, kuyruk
rüzgârının rahatça yetiştirdiği bir boşluk; `updraft` zıplamanın yetmediği
yükseklikte bir raf ve altında yükselen hava sütunu. İkisi de varsayılmıyor,
kanıtlanıyor: rüzgârsız gerçekten geçilemiyor, rüzgârla payı var, üstünü
gerçekten bir fırtına örtüyor ve kuyruk rüzgârı sıçrayıştan uzun sürüyor. Üstüne
`tests/wind-run.mjs` gerçek `Player` sınıfını gerçek bölüm verisine karşı
çalıştırıp iki şeyi birden arıyor: rüzgârla geçen bir tuş dizisi bulmalı ve
rüzgârsız hiçbir dizi bulamamalı. İlk koşuşunda ikinci yarısı düştü, çünkü
doğrulayıcı boşluğu penguen gövdesi kadar kısa ölçüyordu.

İbre pengueni takip ediyor, köşede durmuyor: bir iğne hangi yöne ne kadar
estiğini, altındaki vuruş şeridi de bir sonraki kuyruk rüzgârının ne zaman
geleceğini gösteriyor. "İyi rüzgârı bekle" ancak geldiğini görebiliyorsan bir
karardır.

İlk otuz bir bölüm baştan sona sertleşti: boşluklar genişledi, buzlar daraldı,
tüneller uzadı ve tavandan daha çok şey düşüyor, yem arttı, foklar hızlandı,
orkalar çoğaldı, kontrol noktaları geriye alındı. 15. bölüm kuyruk rüzgârını,
25. bölüm sütunu öğretiyor; 30 ve 31 ikisini de bildiğini varsayıyor.

---

## Arayüz elden geçti

Her ekran telefon dik / telefon yatık / masaüstü olarak ekran görüntüsü alınıp
gözden geçirildi. Bulunan dokuz hatanın hiçbiri okuyarak fark edilecek türden
değildi ve hepsi ilk on saniyede görülüyordu: ana ekranda taşan yazı, bölüm
listesinin ekran dışında kalan üçüncü sütunu, bir satırda üç farklı hizada
duran kart düğmeleri, kırpılan rozetler, parmakla tutulamayan bağlantılar.

**Market** yeniden kuruldu: üç başlık, slab yerine fiyat çipi, yetmediğinde
kartın üstünde "820 balık daha", telefonda kart yerine satır (ekranda 1,5
yerine 4 tane) ve üç nokta yerine `2/3`.

**Markete üç kapı**: ana ekran düğmesi, cüzdana dokunmak (parana dokunmak
paranın gittiği yere götürsün, insanların ilk denediği hareketti ve hiçbir şey
yapmıyordu) ve bölüm sonunda balığı yeni kazandığın an, yalnızca gerçekten
bir şey alabiliyorsan.

**Bölüm listesi**: chapter çipleri, yapışık başlıklar, "Sıradaki" işareti, ve
rekorlarda `00:21.40` yerine `21.40 sn`.

Ad artık tek bir yerden değişiyor (Kimlik); sıralama oraya yönlendiriyor.
Koleksiyon açılırken hak edilmiş ama teslim edilmemiş penguenler veriliyor.

`tests/browser-layout.mjs` bunu koruyor: dokuz ekran, üç boyut, taşma /
hizalama / dokunma alanı.

## Kimlik, yasal metinler ve müzik

**Kimlik.** Oyun ilk açılışta tek bir şey soruyor: sana ne diyelim? Ad, unvan,
penguen kimliği (`PNG-XXXXX`) ve başlangıç tarihi bir kimlik kartında; kart ana
ekranda, giydiğin penguenin portresiyle. Unvanlar chapter sonlarında kazanılıyor
(*Yeni Yumurta* → *Koloni Efsanesi*) ve `tools/lint.mjs` son unvanın gerçekten
ulaşılabilir olduğunu kontrol ediyor. Ad sanitize ediliyor: kontrol karakterleri,
görünmez yön işaretleri ve açılı parantezler siliniyor, ad hem DOM'a hem
paylaşım koduna gidiyor.

**Yasal.** Oyun içinde *Ayarlar → Yasal ve veri*: ne saklanıyor, paylaşınca ne
gidiyor, kullanım şartları, çocuklar, KVKK/GDPR. Tam metinler `docs/GIZLILIK.md`
ve `docs/KULLANIM-SARTLARI.md`. Kaydını JSON olarak indirme ve her şeyi silme
tuşları aynı ekranda.

**Google Fonts kaldırıldı.** Kimlik testi yakaladı: oyun her açılışta, tek
piksel çizilmeden önce iki başka şirketin sunucusuna bağlanıyordu, gizlilik
ekranının "hiçbir şey cihazdan çıkmıyor" dediği bir sayfada. Artık cihazın kendi
yazı tipleri kullanılıyor; hem söz doğru oldu hem açılış hızlandı. `lint` ve
tarayıcı testi bunun böyle kalmasını sağlıyor.

**Müzik baştan yazıldı.** Yerini aldığı şey `setInterval` üstünde dönen tek bir
dört akorluk arpejdi. Şimdi: beş notalık tek bir tema dört bölümde dört ayrı
kostümle (majör / minör / yarı hız + gecikme / staccato), ped-bas-arpej-perküsyon-tema
olarak beş katman ve katmanlar **olan bitene göre** geliyor gidiyor, dalışta
nefes, tırmanışta kol gücü, arenada havadaki kar topu. Ses saatinde 25 ms'lik
ileri-bakış zamanlayıcısıyla planlanıyor, efektler müziği kısıyor.
`tests/music.mjs` Web Audio'yu sayaçlarla taklit edip ızgarayı, katmanları,
sahne geçişini ve temayı ölçüyor.

## Bölüm IV, Kar Topu · 62–76

Oyunun dördüncü fiili ve penguenin *yapmadığı* ilk fiil. Atma tuşu yok, kar
topu toplamak yok, yeni tuş yok. Rakipler nişan aldıkları anda durduğun yere
atıyor ve bir kar topu değdiği ilk şeyde duruyor, gerisi tek fikir: **yolu
kapatan pengueni atıcıyla arana koy, sonra oradan çekil.**

- `Arena` bestecisi, `brawl.js` içinde 15 plan
- `validate-brawl.mjs`: her atış hattı bölüm verisinden yeniden yürünüyor
- `brawl-run.mjs`: arenalar gerçek `World` ile oynanıp kazanılıyor
- `browser-brawl.mjs`: kurallar gerçek sayfada

İki geometri kararı ölçümle çıktı: rakipler **ince buz sivrilerinde** duruyor
(geniş raf, hattı birkaç piksel sonra kendi zeminine gömüyordu) ve kayalar
**yukarıdan sarkıyor** (zeminden çıkan sütun, cevabın iki parçası arasına duvar
koyuyordu).

## Bölüm III, Buz Altı · 47–61

Tersine çevirme: buzun üstünde penguen komedyen, suda çevrenin en hızlı şeyi.
Bölüm penguene daha çok iş yaptırarak değil **bırakarak** zorlaşıyor; elinden
alınan tek şey hava. Bırak yüksel, bas dal; bir ciğer 9,5 saniye ve sadece
buzdaki deliklerde doluyor.

- `Deep` bestecisi, `dive.js` içinde 15 plan
- `validate-dive.mjs` (geometri + nefes bütçesi), `dive-run.mjs` (gerçek
  `World`: akıntı, deniz leoparı, nefes sayacı)
- Beş hata testlerden çıktı; en kötüsü negatif modulo yüzünden geriye sayan
  bir çizim döngüsüydü ve ilk su altı bölümü oyunu donduruyordu

## Bölüm II, Zirve · 32–46

Tutunma: duvara asıl, tırman, tekmele ve kollarındaki güç sadece sağlam
zeminde doluyor. On beş tırmanışın hepsi hem geometri doğrulayıcısını hem fizik
çözücüsünü geçiyor.

- Baca artık penguenin durduğu buzun **üstünde** kuruluyor (şaft ile kalkış
  buzu birlikte kararlaştırılıyor)
- Mola rafları için **duvarın kendisi kırılıyor**; raf, sütunun başı oluyor
- Çözücü, çıkacağı duvarı tekmeleyip bırakmıyor

## Altyapı

- `npm start` · `npm test` · `npm run build`, bağımlılıksız sunucu ve tek
  komutluk test koşucusu (`tools/serve.mjs`, `tools/test.mjs`)
- `tools/lint.mjs`: paketleyici listesi, bölüm sayısı tutarlılığı, debug artığı,
  paket boyutu
- `tests/save.mjs`: v1'den bugüne her kayıt sürümü kayıpsız açılıyor
- `sw.js`: bir kere online açtıktan sonra offline oynanıyor
- GitHub Actions: her push'ta bütün testler, yayına almadan önce yeşil şart
- `docs/BILGISAYARDA.md`: bilgisayarda yapılması gereken işlerin listesi
