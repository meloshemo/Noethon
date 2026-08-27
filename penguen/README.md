# Pengu, Antarktika'dan Kaçış

Yeni doğmuş bir penguen, eriyen buzlar arasında Antarktika'dan kaçmaya çalışıyor.
Buzlar üstüne basınca çatlıyor, bazıları eriyip yok oluyor, bazıları tuzak,
bazıları altındaki gayzerle seni havaya fırlatıyor. Tepeden bir kutup kuşu
dalıyor. Bölüm ilerledikçe penguen büyüyor: daha ağır zıplıyor, daha geniş yer
istiyor.

**Bağımlılık yok, derleme adımı yok, backend yok, görsel/ses dosyası yok.**
Penguen de, buz da, kuzey ışıkları da, bütün sesler de kodla üretiliyor.
Toplam yük tek dosyada 650 KB ve çevrimdışı çalışıyor.

▶ **[Oyunu aç](https://claude.ai/code/artifact/2f6dd29b-3ad8-4d60-b4f7-c8490114b96f)**

---

## İçindekiler bir bakışta

| | |
|---|---|
| **Dört bölüm (chapter)** | Buz Sahanlığı 1–31 · Zirve 32–46 · Buz Altı 47–61 · Kar Topu 62–76 |
| **76 elle yazılmış bölüm** | 31 parkur + 15 tırmanış + 15 dalış + 15 arena, dördü ayrı fiil |
| **Tutunma** | Buz duvarına asıl, tırman, tekmele ve kollarında sınırlı güç var |
| **Sonsuz mod** | Bölüm numarasıyla tohumlanmış, 77. bölüm herkeste aynı |
| **Kimlik** | Ad, unvan ve penguen kimliği, hepsi cihazda, hesap yok |
| **Uyarlanan müzik** | Tek tema, beş kostüm; beş katman olan bitene göre geliyor |
| **10 buz türü** | sağlam · çatlak · cilalı · eriyen · sürüklenen · düşen · tuzak · **sahte** · kaçan · gayzer |
| **6 tehlike** | sarkıt · fok · fırtına kuşağı · yükselen hava sütunu · orka · serak |
| **4 yeni fiil** | **sessiz alan** (yerçekimi yarıya iner) · **sallanan buz** (ipin ucunda sarkaç) · **kavisli atış** (siperin üstünden) · **çukur** (derinlik nefese mal olur) |
| **2 pusu** | Bölümün planlamadığı anda dalan kutup kuşu · bayrağa 100 px kala kopan buzul |
| **4 çürük balık etkisi** | ağırlaşma · **ayak tutmaması** · ters kontrol · körlük |
| **3 yüklü balık** | yay (tek dev zıplama) · kuantum (havada ışınlanma) · gevşeme (senin dışında her şey yavaşlar) |
| **24 penguen + 10 iz** | 5 nadirlik seviyesi, 240 kombin |
| **4 elmas penguen** | Tek yetenek taşıyan tek tür: zıplama · hız · süzülme · mıknatıs |
| **9 market eşyası** | 3'ü penguenin *ne yapabildiğini* değiştiriyor |
| **21 günlük görev** | üç ağırlıkta, her gün birer tane |
| **289 metin, 2 dil** | Türkçe asıl, İngilizce tam; üç denetim ikisini eşit tutuyor |
| **Haftalık lig** | Bronz → Gümüş (500) → Altın (2.000) → Elmas (5.000) |
| **Günün Pengu'su** | Herkese aynı bölüm, gün boyu biriken 4 hedef |
| **Günün Teklifi** | 24 saatlik indirimli kozmetik, geri sayımlı |
| **Hayalet yarışı** | Rekorun yanında koşuyor; kodunu paylaşınca arkadaşın da |
| **Kaldığın yerden** | Sekmeyi kapatsan da son kontrol noktasından devam ediyorsun |
| **İki dil** | Türkçe ve İngilizce; ilk açılışta tarayıcıya uyuyor, sonra senin seçimin |

---

## Öne çıkan özellikler

### 🧗 Zirve, oyunun ikinci fiili
32. bölümden itibaren dağ başlıyor ve soru değişiyor. Sahanlıkta soru "oraya
yetişir miyim?"di; dağda "ne kadar tutunabilirim?". Penguen buz duvarına
gömülüp asılı kalıyor, yavaşça tırmanıyor ya da tekmeleyip karşı duvara
atlıyor. Asılmak azar azar, tırmanmak iki katından fazla, tekme bir çırpıda
tüketiyor ve bar **sadece sağlam zeminde** doluyor. Yeni tuş yok: duvara
doğru bas (tutun), BOŞLUK'u basılı tut (tırman), BOŞLUK'a dokun (tekmele).
→ [ayrıntı](#zirve-tırmanış)

### 🌊 Buz Altı, oyunun üçüncü fiili
47. bölümde buzun *altına* geçiyorsun ve oyun tersine dönüyor. Buzun üstünde
penguen bir komedyendir: kısa bacaklı, tutunamayan, her hareketi zahmetli. Suda
yüz mil çevrenin en hızlı şeyidir ve bölüm penguene daha çok iş yaptırarak
değil, **bırakarak** zorlaşıyor. Karşılığında elinden alınan tek şey var: hava.
Bırakırsan yükselirsin (penguen yüzer, yukarı bedava), basarsan dalarsın. Bir
ciğer dokuz buçuk saniye ve sadece buzdaki deliklerde doluyor. Yeni tuş yok.
→ [ayrıntı](#buz-altı-dalış)

### ❄️ Kar Topu, hiç yapmadığın bir fiil
62. bölümde koloni yolunu kesiyor ve oyun sana **hiçbir şey vermiyor**. Atma
tuşu yok, kar topu toplamak yok, yeni tuş yok. Rakip pengueler atıyor; hem de
tam **nişan aldıkları anda durduğun yere**. Bir kar topu değdiği ilk şeyde
duruyor. Gerisi tek bir fikir: *birinin arkasına geç.* Devirmek istediğin
penguen ile atıcının arasına gir, sonra top gelmeden oradan çekil.
→ [ayrıntı](#kar-topu-hizalama)

### 🎼 Tek tema, beş kostüm
Ses dosyası yok: müzik de bölümler gibi kural olarak yazılıyor. Beş notalık bir
tema penguene ait ve dört bölümün dördünde de var, ana ekranda majörde, dağda
minörde, buzun altında yarı hızda, arenada staccato. Ped, bas, arpej, perküsyon
ve tema ayrı katmanlar ve **olan bitene göre** geliyor gidiyor: iyi giden bir
bölümle neredeyse kaybedilmiş bir bölüm aynı duyulmuyor.
→ [ayrıntı](#müzik)

### 🪽 Aktif ekipman, tek tuşta iki yetenek
Markette **Planör Kanat** ve **Sırt Motoru** var. Havada zıplamayı *basılı tutmak*
kanatları açıyor ve düşüşü terminal hızın beşte birine indiriyor; *tek dokunuş*
motoru ateşliyor. İkisi de sadece yere değince doluyor, bu uçmak değil, zaten
verdiğin bir zıplama kararını havada tartışma hakkı.
→ [ayrıntı](#aktif-ekipman)

### 🦅 Kutup kuşu, bölümün planlamadığı tehlike
Bir skua tepeden dalıp pengueni kapıyor. Bölümün parçası değil, **yönetmen
olayı**: ezberlediğin parkurun dokuzuncu turda hâlâ seni korkutabilmesinin tek
yolu. Buzun üstünde bir gölge beliriyor ve yaklaştıkça daha hızlı atıyor.
Kapılmak da son değil: iki saniyen var ve **zıplama tuşuna hızlıca beş kez**
basarsan kuşun elinden kurtuluyorsun.
→ [ayrıntı](#pusu-kutup-kuşu)

### 🐟 Yüklü balıklar, zıplama tuşunun üç yeni anlamı
Oyunun tek düğmesi var, o yüzden yeni bir fiil eklemenin tek dürüst yolu o
düğmenin ne demek olduğunu birkaç saniyeliğine değiştirmek. Üç renk, üç cevap:
turuncu **yay** bir tek zıplamayı devleştiriyor, mor **kuantum** havadayken seni
üç buçuk gövde ileri ışınlıyor, turkuaz **gevşeme** sen havadayken senin dışında
her şeyi üçte bir hıza düşürüyor.
→ [ayrıntı](#yüklü-balıklar)

### 🐧 Gardırop, 24 penguen, 10 iz
Ninja, Kral, Astronot, Altın, Korsan, Ateş, Siber, Yılbaşı, Frak, Kâşif, Dalgıç,
Aşçı, Rock, Uzaylı, Hayalet, Şövalye, Kutup Işığı, Buz Kraliçesi, Gölge.
Çoğu satın alınmıyor, **kazanılıyor**. Seçtiğin penguen buzun üstünde gerçekten
o penguen, aksesuarlar canlı çiziliyor, jet havada ateşliyor, bant koşarken
savruluyor.
→ [ayrıntı](#koleksiyon)

### 💎 Elmas penguenler, yeteneği olan tek tür
Elmas *daha yükseğe zıplıyor ve buzda daha az kayıyor*, Jet *daha hızlı koşup
kuşu daha erken görüyor*, Albatros *daha uzun süzülüyor*, İmparator *balıkları
kendine çekiyor*. Etkiler küçük, kabaca bir market kademesi. Ve bir tanesi
kasten kendi başına işe yaramıyor: Albatros'un süzülme yeteneği, **Planör Kanat
yoksa sıfır**. Yetenek sahip olduğun bir şeyi iyileştiriyor, sana yeni bir şey
vermiyor.
→ [ayrıntı](#elmas-penguenler)

### 🏔️ Kıta, yamaç, uçurum, yarık, tünel
Bölümler koordinat değil **plan** olarak yazılıyor; geometri o bölümdeki gerçek
zıplama erişiminden hesaplanıyor. Tünel tavanı gerçekten katı ve zıplamayı
kısaltıyor, o yüzden tüneldeki boşluklar *tavan altındaki* erişime göre ölçülüyor.
→ [ayrıntı](#parkurlar-piksel-değil-cümle)

### 👻 Hayalet yarışı ve sıralama
Her deneme kaydediliyor. En iyi koşun bir dahaki oynayışında yanında saydam bir
penguen olarak koşuyor; HUD'daki `−0.42` o an rekordan ne kadar önde olduğunu
gösteriyor. 30 saniyelik bir koşu ~370 karakterlik bir koda dönüşüyor, mesajla
gönderilecek kadar kısa.
→ [ayrıntı](#hayalet-yarışı-ve-sıralama)

### 🏆 Haftalık lig ve Günün Pengu'su
Pazartesi puanlar sıfırlanıyor, çıktığın kademe kalıyor. Günün bölümünde dört
hedef var ve **gün boyunca birikiyorlar**: tek turda hepsini yapman gerekmiyor.
→ [ayrıntı](#haftalık-lig)

---

## Belgeler

| Bölüm | Ne anlatıyor |
|-------|--------------|
| [Çalıştırma](#çalıştırma) · [Testler](#testler) | Nasıl açılır, nasıl doğrulanır |
| [Mimari](#mimari) | Dosya düzeni ve neden böyle |
| [Zirve](#zirve-tırmanış) | Tutunma, tekme, baca, ikinci bölümün fiili |
| [Buz Altı](#buz-altı-dalış) | Dalış, nefes, akıntı, üçüncü bölümün fiili |
| [Kar Topu](#kar-topu-hizalama) | Hizalama, nişan kilidi, kaçış, dördüncü bölümün fiili |
| [Zorluk eğrisi](#zorluk-eğrisi) | Rampa tasarımı |
| [Buz türleri](#buz-türleri) · [Tehlikeler](#tehlikeler) | Oyun içi her mekanik |
| [Yüklü balıklar](#yüklü-balıklar) · [Çürük balıklar](#çürük-balıklar) | Zıplama tuşunun anlamını değiştiren üç renk ve dört lanet |
| [Sessiz alan](#sessiz-alan-yerçekiminin-değiştiği-yer) · [Sallanan buz](#sallanan-buz-ipin-ucundaki-sarkaç) · [Kavisli atış](#kavisli-atış-siperin-üstünden) · [Çukur](#çukur-derinliğin-bedeli) | Dört bölümün dört yeni fiili |
| [Pusu mekanikleri](#pusu-mekanikleri-buzun-tuzakları) · [Kutup kuşu](#pusu-kutup-kuşu) | Ani ölüm olayları |
| [Ekonomi ve market](#ekonomi-ve-market) | Balık nasıl kazanılır, neye harcanır |
| [Koleksiyon](#koleksiyon) | 24 penguen, 10 iz, nadirlikler |
| [Haftalık lig](#haftalık-lig) · [Günün Pengu'su](#günün-pengusu) | Meta sistemler |
| [Hayalet yarışı](#hayalet-yarışı-ve-sıralama) | Rekor yarışı ve paylaşım kodu |
| [Kontroller](#kontroller) | Tuşlar |
| [Arayüz](#arayüz) | Market, bölüm listesi, düzen testi |
| [Kimlik ve müzik](#kimlik) | Oyuncu profili, unvanlar, uyarlanan müzik |
| [Diller](#diller) | Türkçe ve İngilizce, sözlük ve denetimler |
| [Belgeler](docs/) | Gizlilik, kullanım şartları, bilgisayarda yapılacaklar |

---

## Adalet sözleşmesi

Bu oyunun en çok emek verilen kısmı zorluğun *adil* olması. Üç katman:

1. **Besteci** (`terrain.js`) boşlukları piksel olarak değil, erişimin yüzdesi
   olarak alıyor. İmkânsız bir boşluk yazmak mümkün değil.
2. **Fizikten türeyen sınırlar**: tuzak buzun genişliği fitilinden, gayzerinki
   uyarı süresinden, fırtınanın gücü yürüme ivmesinden hesaplanıyor. Bir plan
   "160 piksellik gayzer" isteyemez.
3. **Açılış** (`tests/spawn-safe.mjs`) 76 bölümü gerçek `World` ile açıp üç şey
   deniyor: hiçbir şey yapma, sağa yürü, sola yürü. Üçü de ilk 0,6 saniyede
   öldürmemeli. Bu testin varlık sebebi iki gerçek hata: doğuş noktası ilk buza
   **sabit 80 piksel** içeriden konuyordu ve buzlar daraltılınca 31. bölüm sağa
   basana üçte bir saniye veriyordu; ayrıca doğuş noktasının arkasında hiçbir şey
   yoktu, yani sola yürümek 23. bölüme kadar her yerde boğuyordu. İkisi de
   mesafe hatası değildi, o yüzden hiçbir mesafe kontrolü göremezdi.
4. **Doğrulayıcı** (`tests/validate-levels.mjs`) 31 elle yazılmış + 80 üretilmiş
   bölümü, 3.271 buzu analitik olarak kontrol ediyor. Geçilemez tek bir zıplama
   varsa derleme düşüyor. Rüzgârla geçilen boşluklar bu kuralın dışında değil,
   tersine iki yönlü kanıtlanıyor: rüzgârsız geçilemediği *ve* rüzgârla rahatça
   geçildiği. İkisinden biri yanlışsa ya fırtına dekordur ya bölüm duvardır.
5. **Sahanlık çözücüsü** (`tests/shelf-run.mjs`) I. chapter'ın rotasını gerçek
   doğuş noktasından başlayıp gerçek `Player` ile hop hop yürüyor: nereden
   kalkacağını, ne zaman zıplayacağını, tuşu ne kadar tutacağını ve fırtınanın
   hangi vuruşunda olduğunu tarıyor. Aritmetik "her boşluk erişim içinde" deyip
   geçebiliyordu; bu, geçilemeyen bir adım varsa söylüyor.
6. **Çözücü** (`tests/climb-run.mjs`) tırmanış bölümlerinde bir adım daha ileri
   gidiyor: *gerçek* `Player` sınıfını gerçek bölüm verisine karşı çalıştırıp
   her adım için işe yarayan bir tuş dizisi **arıyor**. Kalkış yerini, zamanını
   ve tuşu ne kadar basılı tuttuğunu tarıyor; hiçbir deneme tutmuyorsa o adımı
   kimse yapamıyordur ve bölüm yayına girmiyor. Bu kural üç gerçek oyun hatası
   yakaladı, duvar tekmesinin sessizce kesilmesi, tepeye çıkarken pengueni
   duvarın dibine ışınlayan çarpışma ve oyuncu daha yerinden kıpırdamadan
   düşen serak.

5. **Dalış çözücüsü** (`tests/dive-run.mjs`) bir adım daha ileri gidiyor ve
   sadece `Player`'ı değil **`World`'ün kendisini** çalıştırıyor: akıntı, deniz
   leoparı, nefes sayacı, ölüm kuralları ve bitiş kontrolü oyundaki halleriyle.
   Buzun altında bunlar bölümün *çevresindeki* şeyler değil, bölümün kendisi.
   Kumandası kasten aptal, düz git, bir sonraki geçit aşağıdaysa tuşa bas,
   leopar yaklaşınca üstünden ya da altından geç. Tek bir ileri-bakış sayısıyla
   çalışan bu şey geçebiliyorsa, gözü olan bir insan da geçebilir.

6. **Arena çözücüsü** (`tests/brawl-run.mjs`) kar topu bölümlerini gerçek
   `World` ile oynuyor: nişan kilidi, uçuş, kapalı çıkış, ölüm kuralları.
   Sürdüğü oyuncu kasten aptal, bölümün işaret ettiği yere yürü, biri sana
   nişan alana kadar bekle, hattan çık, kapıdakinin düşmesini izle. Nişan
   almıyor, arenayı okumuyor, doğaçlama yapmıyor. Bu kadarı yetiyorsa, noktalı
   çizgiyi görebilen bir insan da yapabilir.

Market ve ekipman bu denklemin dışında: bütün bölümler **hiçbir şeyi olmayan**
bir penguene göre doğrulanıyor, yani satın aldıkların bir parkuru asla açamaz,
sadece kolaylaştırır.

---

## Aynı bölüm iki kere

Bu bölüm bir hata anlatısı, çünkü bulunma şekli anlatmaya değer: kodu okurken
değil, **ölçerken** çıktı.

Oyundaki her tehlike — 61 bölümde 268 orka, fırtına, hava akımı, serak, saçak
ve fok — kendi döngüsündeki başlangıç noktasını `Math.random()`'dan alıyordu.
Hiçbir bölüm bir faz belirtmiyordu, yani hepsi kuruluş anında zar atıyordu.
Niyet doğruydu (tehlikeler aynı anda çalışmasın), sonucu değildi.

Bunun neden ciddi olduğu bu projeye özel. Buradaki adalet iddiası şu: bir
çözücü **gerçek `World`'ü** sürüyor ve geçen bir yol buluyor. Ama her çözücü
denemesi bölümü yeniden kuruyordu. Üç yüz parametre kombinasyonu deneyen bir
çözücü, üç yüz **farklı bölüm** çekiyor ve içlerinden biri işe yararsa "geçildi"
diyordu. "Bu bölüm geçilebilir" sessizce "bu bölüm bazı atışlarda geçilebilir"e
dönüşmüştü — ve oyuncu kendi atışını çekiyor.

Artık faz, bölümün kimliğinden ve tehlikenin oradaki sırasından türüyor. Her
tehlike çemberin kendi diliminde duruyor ve dilimin içinde sarsılıyor: dağılım
korunuyor, ama garanti ediliyor. (İlk sürüm sadece hash'liyordu, ki bu
*ortalamada* dağıtır: iki tehlikeli bir bölümde sekizde bir ihtimalle aynı
sekizde buluşurlar, ve sonsuz koşudaki bir bölümde buluştular.)

Fazlar sabitlendikten sonra bütün çözücüler ve doğrulayıcılar yine geçti — yani
hiçbir bölüm sadece şansa geçiliyor değilmiş. Düzeltmenin bedeli sıfır oldu.

Bunun sessiz bir kurbanı da **günün bölümü**ydü: tarihten tohumlanıyor, yani
herkes aynı bölümü oynuyor sanılıyordu — ama üstündeki her tehlike sonra kendi
zarını atıyordu. Birinin orkası tam vardığında yüzeye çıkıyor, diğerininki yeni
dalmış oluyordu. Sıralamada süre karşılaştıran iki kişi aynı bölümü oynamamıştı.

`tests/repeatable.mjs` üç ayrı şeyi tutuyor:

1. Oyuncuya verilen bölüm bir zardan değil, bölümden kuruluyor.
2. Simülasyonda **başka** bir zar da yok. Kasıtlı olanlar (kopan serak, kuşun
   saldırı seçimi) sabitlendiğinde, aynı girdiyle iki koşu son piksele kadar
   aynı olmak zorunda. Olmasaydı bir yerde saat ya da nesne adresi okunuyor
   demekti, ve o zaman ne kayıt, ne hayalet, ne de kanıt güvenilir olurdu.
3. Günün bölümü aynı gün herkeste aynı, başka günde başka, ve sonsuz koşunun
   derinlik rampasını devralmıyor.

## Kontrol noktası sözünü tutuyor mu

Bir kontrol noktası tek bir söz veriyor: öl, ve **buraya** dön. Dört ayrı
şekilde yalan söylüyordu. Hiçbiri hata fırlatmıyordu, hiçbiri bir testi
düşürmüyordu, hiçbiri ekranda yanlış görünmüyordu.

| Neydi | Sonucu |
|---|---|
| Dalış chapter'ı bayrakların **hepsini** atıyordu | Ölüm döngüsü koruması "6 piksel içinde buz var mı" diye soruyor; buzun altında basacak bir şey yok, çünkü pengu yüzüyor. 15 bölüm: uzun bir tüneli geçiyorsun, bayrağı alıyorsun, çanı duyuyorsun, boğuluyorsun, ve tünelin ağzında hiçbir açıklama olmadan yeniden başlıyorsun |
| Arenalar da atıyordu | Bayrakları zeminden 46 piksel yukarıya — direğin kendi boyu kadar — dikilmişti. Bayrak havada duruyordu ve noktanın altında zemin yoktu |
| 20 bayrak kırılan buzdaydı | Çatlayan, eriyen, patlayan. Zaten geri sayan bir zeminde diriliyorsun |
| 7 bayrak foku üstüne dikiyordu | Yanına değil, üstüne: diriliş seni doğduğun karede öldürüyor, sonra yine. Bundan kurtaran bir girdi yok — bölüm bitti, oyuncunun çıkması gerekiyor. 5 tanesi de saçağın altındaydı, ki 0,4 saniye sonra düşüyor |

`tests/checkpoint.mjs` sözü bir simülasyon olarak yazıyor: oyundaki **her**
diriliş noktasına pengu'yu koy, 1,2 saniye hiçbir şeye basma, ve ne olduğuna
bak. (Arena hariç: orada beş rakip sana atış yapıyor ve durmak kaybetmektir —
o bölümün kendisi, bozukluk değil.)

## Yeni sürüm bir bütün olarak geliyor

Servis çalışanının iki kuralı vardı ve ikisi de tek başına doğruydu: **sayfa
ağdan önce** (yeni sürüm bir açılıştan fazla uzakta olmasın), **gerisi
önbellekten** (soğuk açılış sıcak hissettirsin). Birlikte klasik tuzağı
kuruyorlardı: sayfa çekiliyor, sayfanın yüklediği hiçbir şey çekilmiyor.

Yani her dağıtımdan sonraki **ilk açılışta** oyuncu bu sabahın HTML'ini geçen
haftanın stil dosyası ve modülleriyle alıyordu. Bu sabah yeni bir sarmalayıcı
kazanmış bir kartı, henüz gelmemiş bir kural yerleştiriyor. Oyunu ikinci kez
açana kadar bozuk görünüyor.

Artık ağdan **değişmiş** bir sayfa dönerse, o sayfanın birazdan isteyeceği her
şey cevabı teslim etmeden önce önbellekten siliniyor. Değişmemiş sayfa hiçbir
şeyi silmiyor (yoksa her açılış soğuk olurdu), ve kötü bir cevap — bir otel
wifi'sinin giriş sayfası, yarım kalmış bir dağıtımın 404'ü — yeni sürüm sayılmıyor,
yoksa çalışan bir oyunu çevrimdışı bırakırdı.

Bunun testi yoktu; `tests/offline.mjs` artık servis çalışanını **çalıştırıyor**.
Tarayıcı gerekmiyor: bir servis çalışanı bir `fetch` işleyicisidir, ona bir
önbellek ve bir ağ verirsen ne servis ettiğini söyler.

## Çalıştırma

ES modülleri `file://` üzerinden çalışmaz, bu yüzden bir sunucu gerekiyor, ve
o da bu depoda, tek dosya, bağımlılıksız:

```bash
npm start          # → http://localhost:8123
```

Kurulum yok: `tools/serve.mjs` düz Node. Python'un ya da global bir CLI'ın olup
olmadığı ilk beş dakikayı belirlememeli.

Yayına almak için klasörü olduğu gibi herhangi bir statik hostinge koymak yeterli
(GitHub Pages, Netlify, Vercel, Cloudflare Pages). Bir `push` yeterliyse:
`.github/workflows/deploy.yml` bütün testleri koşuyor ve ancak yeşilse
yayınlıyor.

### Çevrimdışı

`sw.js` bir servis çalışanı: sayfanın kendisi **ağ öncelikli** (yeni sürüm
kaçmasın), geri kalan her şey **önbellek öncelikli, arkada tazelenen**. İlk
açılış online olmalı; sonrası uçakta da çalışır. Tek dosya sürümü kasten
kaydetmiyor, yanında `sw.js` olmayan bir sayfanın onu araması, kusursuz çalışan
bir sayfanın konsoluna hata yazmaktan başka bir işe yaramaz.

### Tek dosyalık sürüm

```bash
node tools/bundle.mjs dist/pengu.html
```

Bütün modülleri, stilleri ve işaretlemeyi tek bir HTML dosyasına düzleştirir
sunucu gerektirmez, `file://` üzerinden bile açılır, tek belge kabul eden yerlere
yüklenebilir. Gerçek bir paketleyici değil, sırayla birleştirici: modülleri
bağımlılık sırasına göre ekler ve import/export sözdizimini temizler. Bu yüzden
çakışan bir üst düzey isim ya da temizlenemeyen bir import görürse sessizce
geçmez, hata verip durur.

## Testler

Tek komut, 42 paket (33 node + paketleme + 9 tarayıcı), kendi sunucusunu
kurup kapatıyor ve portu doluysa bir yanına kayıyor:

```bash
npm test               # lint + node testleri + paketleme + tarayıcı testleri
npm run test:node      # hiçbir kurulum gerektirmez, ~7 sn
npm run test:browser   # sadece tarayıcı (bir kere: npm run setup:browser)
```

Ayrı ayrı:

```bash
node tools/lint.mjs              # proje kuralları (aşağıda)
node tests/save.mjs              # kayıt dosyası: her eski sürüm kayıpsız açılıyor
node tests/music.mjs             # ızgara, katmanlar, sahne geçişi, tema
node tests/spawn-safe.mjs        # açılışlar: ilk 0,6 sn hiçbir tuş öldürmemeli
node tests/validate-levels.mjs   # sahanlık bölümleri: geçilebilirlik
node tests/shelf-run.mjs         # sahanlık rotası: gerçek Player ile baştan sona
node tests/wind-run.mjs          # rüzgâr boşlukları: gerçek Player ile çözücü
node tests/validate-climb.mjs    # tırmanış bölümleri: geometri
node tests/climb-run.mjs         # tırmanış bölümleri: gerçek fizikle çözücü
node tests/validate-dive.mjs     # dalış bölümleri: geometri ve nefes bütçesi
node tests/dive-run.mjs          # dalış bölümleri: gerçek World ile çözücü
node tests/validate-brawl.mjs    # arenalar: her kapıcının temiz atış hattı var mı
node tests/brawl-run.mjs         # arenalar: gerçek World ile çözücü
node tests/economy.mjs           # ekonomi dengesi simülasyonu
node tests/ghost.mjs             # paylaşım kodu çözücüsü
node tools/bundle.mjs            # tek dosyaya paketle (isim çakışmasını da yakalar)
```

Tarayıcı tarafı (önce bir kere `npm run setup:browser`):

```bash
node tests/browser-identity.mjs  # ilk açılış, ad temizleme, dışa aktarma, dış istek yok
node tests/browser-layout.mjs    # üç boyutta taşma ve hizalama
node tests/browser-climb.mjs     # tutunma, tırmanma, tekme, bar
node tests/browser-dive.mjs      # dalma, yükselme, nefes, delik
node tests/browser-brawl.mjs     # nişan, atış, çarpma, kilitli çıkış
node tests/browser-session.mjs   # yarım kalan koşu geri geliyor mu, bayatı atılıyor mu
node tests/browser-lang.mjs      # dil değişince her ekran gerçekten çevriliyor mu
node tests/browser-bundle.mjs    # tek dosya sürümü file:// üzerinden gerçekten açılıyor mu
```

### Proje kuralları (`tools/lint.mjs`)

Biçim denetleyicisi değil, bu kod zaten tutarlı yazılıyor ve noktalı virgül
tartışan bir araç burada hiçbir şey satın almıyor. Denetlenen şey, **gerçekten
başa gelmiş** ve her seferinde sessizce bozulmuş on bir kural:

| Kural | Bozulunca ne oluyordu |
|---|---|
| Her modül `bundle.mjs` listesinde | Tek dosya sürümü bir chapter eksik çıkıyordu |
| `CRAFTED_LEVELS` = chapter toplamı, numaralar 1..N kesintisiz | Bölüm seçimi elle yazılan setin ucundan taşıyordu |
| Son unvan son bölümde kazanılıyor | 76 bölümlük oyunda 90. bölümde verilen unvan |
| Kaynakta `console.log`/`debugger`/`TODO` yok | Sıcak döngüde unutulmuş debug |
| Hiçbir dosyada dış adres yok | Yazı tipi Google'dan çekiliyordu, gizlilik metni yalan oluyordu |
| Tek dosya ≤ 900 KB | Kötü bağlantıdaki telefonun beklemeyeceği boyut |
| İki sözlükte birebir aynı anahtarlar | Bir dilde eksik metin, sessizce diğerine düşer |
| Kodun istediği her anahtar sözlükte | Ekranda anahtar adı görünür |
| Arayüz metninde uzun tire yok | Yazı yeniden makine gibi okunmaya başlar |
| Readme'nin test sayısı koşucununkiyle aynı | Belge yirmi dört paket diyordu, gerçek otuzdu |
| Readme özet tablosundaki her sayı gerçek | Aynı tabloda üç ayrı sayı kaymıştı: paket sayısı, sözlük boyu, dosya boyutu |
| Tuvale doğrudan metin yazılmıyor | Arenadaki sayaç Türkçe sabitti, İngilizce oynayan Türkçe okuyordu |

### Sürekli entegrasyon

Her `push`'ta iki iş: **Bölümler ve kurallar** (kurulumsuz, ~15 sn) ve
**Mekanikler** (Chromium indirip üç tarayıcı testi, ~2 dk). `main`'e giden
yol yeşil olmadan yayına çıkmıyor.

Bilgisayarda yapılması gerekenler, Pages'i açmak, gerçek cihazda oynamak,
mağaza ve ödeme kararları, ayrı bir dosyada:
**[`docs/BILGISAYARDA.md`](docs/BILGISAYARDA.md)**.

**Doğrulayıcı** oynamadan, analitik olarak, her bölümdeki her sıçramanın
penguenin o bölümdeki gerçek erişim mesafesi içinde olduğunu doğrular. 31 elle
yazılmış bölümü ve üretilen bölümlerden 80'lik bir örneklemi kapsar: **3.271
buz**. Ayrıca kaya-buz çakışması, tavan yüksekliği, fok devriyesinin kalkış
kenarını kapatması, orkanın buzun altında kalması, fırtınanın dinginlik ve
kuyruk pencerelerinin yeterince uzun olması, rüzgâr boşluklarının iki yönden
de doğru boyutta olması, dikey çeşitlilik ve parkur uzunluğu gibi kuralları da
kontrol eder, biri tutmazsa derleme düşer.

**Hayalet testi** 30 saniyelik bir koşuyu örnek örnek gidip geliyor mu, on bir
çeşit bozuk yapıştırma sessizce reddediliyor mu, isim değişikliği koşuyu koruyor
mu diye bakar.

**Sahanlık çözücüsü artık üretilmiş bölümleri de yürüyor.** 76'dan sonra oyun
sonsuza kadar üretilmiş bölümlerle devam ediyor, ve onların *sadece* aritmetik
kanıtı vardı — ki bu ters: kimsenin bakmadığı bölüm, birinin yürümeyi denemesine
en çok ihtiyaç duyanıdır. Üretecin şekilleri her 20 kimlikte tekrarlıyor, o
yüzden örnekleme kimlikler boyunca **art arda** gidiyor. İlk yazdığım hâli
beşer beşer atlıyordu — yani tam olarak o döngüyle örtüşüyordu ve yirmi şeklin
dördünü kırk kez test edip 77'den 272'ye uzanan bir yelpaze bildiriyordu.

Tarayıcı tarafı dokuz paket, hepsi `playwright` ile gerçek Chromium'da:

| Paket | Ne ölçüyor |
|---|---|
| `browser-identity` | İlk açılışın bir kere çıkması, adın temizlenmesi, kimliğin değişmemesi, kaydın dosyaya inmesi, gömülü sayfada metne düşmesi ve **sayfanın kendi dosyaları dışında tek bir istek yapmaması** |
| `browser-layout` | Telefon dik, telefon yatık ve masaüstünde **on dört ekranda** yatay taşma, kart hizası ve ana düğmenin katlanma çizgisinin üstünde kalması; ayrıca dokunmatik kumandanın ekranın beşte birini geçmemesi, her tuşun parmak kadar olması, üst şeride binmemesi ve hiçbir bölümün pengu'yu arayüzün altında başlatmaması |
| `browser-climb` | Tutunma, asılı kalmanın azar azar, tırmanmanın iki katından fazla, tekmenin bir çırpıda tüketmesi, barın yalnızca yerde dolması, sahanlıkta tutunmanın olmaması |
| `browser-dive` | Bırakınca yükselme, basınca inme, suda karadan hızlı olma, nefesin bitmesi ve delikte dolması |
| `browser-brawl` | Nişan alıp atma, kar topunun ilk değdiği şeyde durması, oyuncuyu öldürmesi, ölünce arenanın sıfırlanması, kilitli çıkışın gerçekten kilitli olması |
| `browser-session` | Yarım kalan koşunun geri gelmesi, başka bir şekle ait olanın atılması, boşluktaki noktanın ölüm döngüsü kurmaması |
| `browser-lang` | Dil değişince sekiz ekranın her birinde diğer dilden harf kalmaması ve seçimin yeniden açılışta hatırlanması |
| `browser-bundle` | `dist/pengu.html`'in **sunucusuz**, `file://` üzerinden açılması, bölüm bestelemesi ve kronometrenin dönmesi |

Hepsi bittiğinde konsolun temiz olduğuna bakıyor: sessiz bir hata, hiç olmamış
bir hata değil.

Sonuncusu geç eklendi ve eksikliği ciddiydi: tek dosya sürümü aslında **başka
bir program**. Paketleyici otuz iki modülü elle düzleştiriyor, import ve export
sözdizimini yeniden yazıyor, ve bu tam da geçerli ama hiçbir şey yapmayan bir
dosya üretebilecek türden bir dönüşüm. İnsanlara verilen kopya da o: e-postayla
gidenler, `file://` ile açılanlar ve yayınlanan linkin arkasındaki dosya. Yeşil
bir test takımıyla bozuk bir paket, buradaki en kötü sonuç.

---

## Mimari

```
index.html                 tek sayfa, tüm ekranlar gerçek HTML olarak
manifest.webmanifest       telefona "uygulama" olarak eklenebilsin diye
sw.js                      servis çalışanı: sayfa ağ öncelikli, gerisi önbellekten
styles/
  tokens.css               renk, tipografi, boşluk, hareket, tek kaynak
  base.css                 reset + sayfa iskeleti
  ui.css                   bileşenler (HUD, ekranlar, düğmeler, kartlar)
src/
  main.js                  bootstrap: parçaları birbirine bağlar
  core/
    util.js                matematik, easing, deterministik rastgelelik
    i18n.js                iki dilin sözlüğü, dil seçimi, DOM'u boyama
    input.js               klavye + dokunmatik + gamepad → tek girdi durumu
    audio.js               Web Audio ile sentezlenen ses (dosya yok)
    music.js               uyarlanan müzik: tek tema, beş sahne, beş katman
    storage.js             localStorage, sürümlü ve bozulmaya dayanıklı
    particles.js           havuzlanmış parçacık sistemi (çöp üretmez)
  game/
    config.js              tüm oyun hissi sabitleri + erişim matematiği (reachFor, reachWithWind, crossableGap)
    chapters.js            dört chapter, hangi bölüm hangisine ait
    profile.js             ad temizleme, penguen kimliği, unvanlar
    skins.js               24 penguen + 10 iz: palet, aksesuar çizimi, açılma şartları
    store.js               Günün Teklifi ve gerçek para kataloğu (kapalı)
    league.js              haftalık lig: puanlama, kademeler, hafta anahtarı
    daily.js               Günün Pengu'su: güne göre seçilen hedefler
    missions.js            21 günlük görev (tarihe göre tohumlanmış)
    terrain.js             I. chapter bestecisi: raf, yamaç, uçurum, yarık, tünel, rüzgâr
    tower.js               II. chapter bestecisi: duvar, baca, çıkıntı
    deep.js                III. chapter bestecisi: koridor, delik, akıntı
    arena.js               IV. chapter bestecisi: atış hatları ve siperler
    levels.js              1–31 elle yazılmış bölüm planları
    climb.js               32–46 tırmanış planları
    dive.js                47–61 dalış planları
    brawl.js               62–76 arena planları
    generator.js           77+ ve günün bölümü için tohumlanmış üretici
    entities.js            buz kütleleri, tehlikeler, balıklar, kontrol noktaları
    player.js              penguen fiziği, sürüklenme kanalı ve çarpışma çözümü
    ghost.js               koşu kaydı, hayalet oynatma, paylaşım kodu
    world.js               simülasyon, kamera, kazanma/kaybetme
    render.js              canvas çizimi (görsel varlık yok, hepsi prosedürel)
    game.js                oyun döngüsü, ödüller, durum makinesi
  ui/
    ui.js                  DOM'a dokunan tek yer
tests/
  browser-kit.mjs          tarayıcı testlerinin ortak tesisatı
  save.mjs                 kayıt dosyası göçü
  music.mjs                ızgara, katmanlar, sahne geçişi
  validate-levels.mjs      I. chapter geçilebilirlik doğrulayıcısı
  spawn-safe.mjs           açılışlar: ilk saliseler öldürmüyor
  shelf-run.mjs            I. chapter rotası: gerçek Player ile çözücü
  wind-run.mjs             rüzgâr boşlukları ve sütunlar: gerçek Player ile çözücü
  validate-climb.mjs       II. chapter geometrisi
  climb-run.mjs            II. chapter çözücüsü
  validate-dive.mjs        III. chapter geometrisi ve nefes bütçesi
  dive-run.mjs             III. chapter çözücüsü
  validate-brawl.mjs       IV. chapter atış hatları
  brawl-run.mjs            IV. chapter çözücüsü
  economy.mjs              ekonomi dengesi simülasyonu
  ghost.mjs                paylaşım kodu çözücüsü
  viewport.mjs             hangi ekranın ne kadarını gördüğü
  browser-*.mjs            kimlik, düzen, tırmanma, yüzme, kar topu, yüklü balık, koşu, diller, paket
tools/
  serve.mjs                bağımlılıksız statik sunucu
  bundle.mjs               tek dosyaya düzleştirme
  lint.mjs                 proje kuralları
  test.mjs                 hepsini koşan tek komut
  difficulty.mjs           ölçülen zorluk eğrisi (testi düşürmez, alet)
  mirror.mjs               bağımsız depoya kopyalama
docs/
  GIZLILIK.md · PRIVACY.md          gizlilik, iki dilde
  KULLANIM-SARTLARI.md · TERMS.md   kullanım şartları, iki dilde
  BILGISAYARDA.md                   uzaktan yapılamayan işler
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

İki tür katı var. **Buzlar** rotadır, inilen her şey. **Arazi** (`terrain`)
kıtadır: uçurum yüzleri, tünel tavanları, sütunlar. Fizik ikisini de katı görür
(çarpışma zaten yandan itiyor ve tavana kafa vurduruyor), ama doğrulayıcının
yürüdüğü yol yalnızca buzlardan geçer. Böylece bir tünel tavanı gerçekten tavan
oluyor, bölüm yolunu ise bulandırmıyor.

Tavan alçaldığında zıplama da kısalıyor: `reachFor(scale, maxHeight)` tepe
noktası sınırlı bir zıplayışın ne kadar uzağa gittiğini veriyor ve tüneldeki her
boşluk o sayıya göre ölçülüyor.

### Neden bu yapı

- **Arayüz canvas'a çizilmiyor, gerçek HTML.** Tipografi, odak yönetimi, ekran
  okuyucu etiketleri ve duyarlı yerleşim bedavaya geliyor.
- **Simülasyon ve çizim ayrı.** `world.js` hiçbir şey çizmez, `render.js` hiçbir
  şeyi değiştirmez. Biri bozulduğunda diğerine bakmaya gerek kalmıyor.
- **Sabit adımlı fizik (1/120 s).** 60 Hz, 120 Hz ve 144 Hz ekranlarda oyun aynı
  hissettiriyor; arka planda kalan sekme geri geldiğinde penguen ışınlanmıyor.
- **Görsel/ses varlığı yok.** Penguen, buzlar, kuzey ışıkları, su ve bütün sesler
  kodla üretiliyor. Tek dosya sürümü 650 KB ve çevrimdışı çalışıyor.
- **Metin koddan ayrı.** Arayüz metinleri tek sözlükte, içeriğe ait metinler
  girdinin kendi `en` bloğunda. Bir dil eklemek bir tablo eklemek.

---

## Zorluk eğrisi

Oyunun en çok emek verilen kısmı bu. Kural:

| Bölüm | Ne oluyor |
|-------|-----------|
| 1–3   | Sadece yürüme ve zıplama. Geniş buzlar, sıfır tehlike, ama boşluklar ilk hâlinden geniş: en baştan bir şey isteniyor. |
| 4–8   | Bölüm başına **tek** yeni buz türü. Her yeni şey güvenli bir buzdan tanıtılır ve hemen ardından sağlam bir buz gelir. |
| 9–13  | Kıta geliyor: yamaç, yarık, tünel, sarkıt, fok. Mekanikler birleşmeye başlar, kontrol noktaları girer. |
| 14–18 | Gerçek baskı: sahte zemin, fırtına, çürük yem, uçurum, kaçan buz. **15. bölüm** kuyruk rüzgârını öğretir: beş sahanlık boyunca aynı rüzgâr seni ittikten sonra, ancak rüzgârla geçilen bir boşluk gelir. |
| 19–22 | Pusu mekanikleri: gayzer ve orka. Her biri yine kendi öğretici bölümünü alır. |
| 23–31 | Hiçbir şeye güvenilmez. Tuzak tüneli, zincirleme gayzer, avcılar, hepsi bir arada. **25. bölüm** yükselen hava sütununu öğretir; 30 ve 31 ikisini de bildiğini varsayar. |
| 32–46 | **Zirve.** Fiil değişiyor: tutunma, tırmanma, tekme ve tükenen kol gücü. |
| 47–61 | **Buz Altı.** Fiil yine değişiyor: dalma, yükselme ve biten nefes. |
| 62–76 | **Kar Topu.** Elinde hiçbir şey yok; hizalanıp çekilmek. |
| 77+   | Üretilen sonsuz mod; zorluk 20 bölümde artıp sabitlenir. |

Penguen büyüyor: 1. bölümde ölçek 1,00, 31'de 1,58, 76'da 1,62. Daha ağır
zıplıyor ve daha geniş yer istiyor, o yüzden her boşluk **o bölümdeki** erişime
göre ölçülüyor, sabit bir piksele göre değil.

### Zorluk ölçülüyor, tartışılmıyor

"Bu bölüm kolay" bir kanaattir, ta ki biri bir sayı üretene kadar. Bu projede
zaten bir sayı vardı ve yanlış olanıydı: bir boşluk erişimin içindedir ya da
değildir, ve bu, oraya ulaşmanın *emek* isteyip istemediği hakkında hiçbir şey
söylemez.

Alet çözücülerin kendisi çıktı. İşleri "bir yol var mı" sorusuna cevap vermek;
ilk buldukları yolda durmalarına izin verilmezse **kaç yol olduğunu** söylüyorlar.
Yüz farklı tuş dizisinin yaptığı bir adım cömerttir, ikisinin yaptığı bir adım
duvardır, ve ikisi de eşit derecede geçilebilirdir. Mesele bu: zorluk,
adaletsizlik ölçülmeden ölçülüyor.

Her chapter'ın ayrıca kendi gerilim kaynağı var ve onun kendi okuması:

| Chapter | Ne ölçülüyor | Neden bu |
|---|---|---|
| I · Sahanlık | tolerans | Bir sıçrayışı kaç tuş dizisi yapabiliyor |
| II · Zirve | kalan kol gücü | Tırmanan kişinin hissettiği şey bar, tekmenin hassasiyeti değil |
| III · Buz Altı | en az nefes | Chapter'ın konusu zaten bu |
| IV · Kar Topu | en yakın top | Hattan çıkmak için ne kadar zaman kaldığı |

`node tools/difficulty.mjs` dördünü birden koşuyor ve eğriyi olması gereken
şekle karşı çiziyor. İlk koşuşunda kendini ödedi:

- **Chapter I eksi %53 eğimliydi.** Kolaylaşıyordu. 1–11. bölümler 27–31'den
  zordu ve chapter'ın en bağışlayıcı bölümü 28'di.
- **Chapter III tek konusunu hiç tehdit etmiyordu.** Ciğerler hiçbir bölümde
  üçte birin altına inmiyordu, final yarım nefesle bitiyordu.
- **Chapter II hedeflenen rampanın üçte birinde** ilerliyordu.
- **Chapter IV'ün eğimi doğruydu**, üç bölüm onu görmezden geliyordu.

Her chapter'ın artık tek bir sayıdan ibaret bir zorluk sütunu var: sahanlıkta
`tight` (boşluk çarpanı), dağda `effort` (baca yüksekliği çarpanı), denizde
`breath` (bir nefeste harcanabilecek ciğer oranı), arenada `heat` (atış
temposu). Bu sütunlar tahminle değil, çözücüye sorularak dolduruldu: bir bölüm
çözücünün reddettiği yere kadar sertleştirilip bir adım geri alınıyor. Üç bölüm
komşularından belirgin biçimde daha yumuşak, çünkü fizik daha fazlasını
vermiyor ve bu, dosyada üzeri örtülecek değil yazılacak bir bilgi.

Ayrıca oyuncunun tarafında olan şeyler:

- **Coyote time (0.13 s)**: kenardan düştükten sonra hâlâ zıplayabilirsin.
- **Zıplama tamponu (0.15 s)**: yere değmeden basılan tuş unutulmaz.
- **Değişken yükseklik**: tuşu bırakınca alçak, basılı tutunca yüksek zıplar.
- **Kolay mod**: aynı bölümde 4 kez ölünce kendiliğinden teklif edilir; buzlar
  daha geç kırılır, tuzaklar yavaşlar. İstendiği an ayarlardan açılıp kapanır.
- **Rüzgârda durmak**: fırtına seni geri itiyorsa durmak gerçek bir cevap.
  Duran penguen sürüklenmiyor ve dinginlik birkaç saniyede bir geliyor.
- **Açılış vuruşu**: her bölüm, oyuncuya zemin bitmeden önce **0,6 saniye**
  veriyor ve bu piksel değil saniye cinsinden yazılmış, çünkü piksel çürüyor.
  Ayrıca her bölümün bir *arkası* var: sola yürümek artık boğulmak değil.
- **Kontrol noktaları**: uzun bölümlerde ölünce en baştan başlamazsın.
- **Ölünce bütün buzlar sıfırlanır**: kırık bir yol yüzünden bölüm kilitlenmez.

### Adaletin kodla korunması

Zorluk elle ayarlanınca kolayca haksız hale gelir, o yüzden kurallar
`tests/validate-levels.mjs` içinde yazılı ve her değişiklikte kontrol ediliyor:

- Her aralık ve her yükseliş, penguenin **o bölümdeki boyutundaki** gerçek
  sıçrama menzilinin içinde olmalı.
- Kısa fitilli buzlar (tuzak, düşen buz) basamak taşıdır: üstünde yürünmesi
  gerekmemeli, indiğin yerden zıplamak yetmeli.
- Zamanlama isteyen buzlardan (eriyen buz, yana kayan buz) önce **beklenebilir**
  bir buz olmalı. Çatlayan buzda beklemek yazı tura demektir; kaygan buzda ise
  yerinde durulamaz, ikisi de sayılmaz.
- Fok, üstünde olduğu buzun sağ şeridini kapatmamalı; orası bir sonraki sıçrama
  için nişan alınan yer.
- Hiçbir buz penguenden dar olamaz, hiçbiri suyun içinde olamaz, sal her zaman
  son buzun üstünde olmalı.

Bu doğrulayıcı geliştirme sırasında dokuz gerçek adaletsizlik yakaladı, geçilmesi
matematiksel olarak imkânsız üç sıçrama dahil.

---

## Buz türleri

On tür var ve hepsi `src/game/terrain.js` içinden geçiyor; tek tek listesi
`config.js` değil, buzun kendisi. Oyun içindeki **Nasıl oynanır → Buz türleri**
kartı aynı listeyi çiziyor.

| Tür | Görünüm | Davranış |
|-----|---------|----------|
| Sağlam | Düz beyaz | Hiç kırılmaz |
| Çatlak | Mavi çatlak çizgileri | Basınca çatlar, kısa süre sonra kırılır, sonra geri gelir |
| Tuzak | Kızıl damar | Neredeyse anında kırılır, bas ve geç |
| Sahte | **Sağlam buzdan farksız** | Hiçbir işareti yok, basınca gider (aşağıda) |
| Eriyen | Soluk, damlayan | Kendi döngüsünde erir ve geri donar |
| Cilalı | Üstünde parlama çizgileri | Kaygan, fren mesafesi uzun |
| Sürüklenen | Ok işaretleri | Bir yol boyunca gider gelir, üstündekini taşır |
| Düşen | Kesik çizgi | Basınca aşağı kaçar |
| Gayzer | Kabarcıklar, basınç halkası | Basınca tıslar; yarım saniye sonra seni havaya fırlatır |
| Kaçan | İnce bir çatlak çizgisi | Alçak ve cazip; tam inerken kaybolur |

## Hız balığı

Bölüm başına bir tane: kırmızı gövde, altın şimşek, göz kırpan bir hale. Yuttuğun
an penguen kızıla dönüyor, arkasında iz bırakıyor ve **%50 daha hızlı** koşuyor
4,5 saniye boyunca. Son bir saniyede yanıp sönerek bitmek üzere olduğunu söylüyor.

Hep ana hattın dışında duruyor, yani almak bir bahis: sapmanın maliyeti var ama
kazandığı süre çok daha fazla, eğer bir buçuk kat hızda inişlerini
tutturabilirsen. Doğrulayıcı hem erişilebilir olduğunu hem de yol üstünde
durmadığını kontrol ediyor.

## Sessiz alan: yerçekiminin değiştiği yer

Oyundaki bütün sayılar tek bir sayıya göre ölçülüyor: yerçekimi. Sessiz alan
onu değiştiren tek şey.

İçeride yerçekimi normalin **%42'si**, son hız da onunla birlikte düşüyor. Yani
menzil iki yöne birden ikiye katlanıyor ve penguen havada **bir buçuk saniye**
kalıyor:

| | Yatay | Dikey | Havada |
|---|---|---|---|
| Dışarıda | 213 px | 141 px | 0,66 sn |
| İçeride | 507 px | 337 px | 1,58 sn |

Rüzgâr bir zıplamanın *nereye* düşeceğini değiştiriyor, gayzer *nasıl
başladığını*; bu **zıplamanın ne olduğunu** değiştiriyor.

Tek bir açıklıkta iki imkânsızlık birden var, çünkü yarım bir sessiz alanın
içine girmeye değmez: karşıya geçiş hiçbir zıplamanın yetişemeyeceği kadar
geniş, öbür taraftaki raf hiçbir zıplamanın çıkamayacağı kadar yüksek, ve ikisini
de aynı hava cebi çözüyor. Bu onu bir *yer* yapıyor, bir güç değil: alıp
taşımıyorsun, içine girip duruyorsun ve oradayken bacaklarının anlamı değişiyor.

Kenarı yumuşak bir geçiş değil, keskin parlak bir çizgi — çünkü yerçekimi bir
sınırda değişir, bir gradyan boyunca değil, ve nerede başladığını yanlış
hesaplayan oyuncu kendi gözlerinden değil çizimden yanılmış olurdu. İçindeki kar
normalin beşte bir hızıyla düşüyor, ve o kontrast mekanizmayı tek kelime
kullanmadan anlatıyor.

**Dağda sessiz alan yok, ve bu bir karar.** Beş yüz piksellik bir uçuş altı yüz
piksellik bir şaftın içine sığmıyor; yay bir sonraki rafın içinden geçip karşı
duvarın dibine iniyor, ve sığdırmanın tek yolu çevresindeki her adımı kendi
sınırına dayamak. Sebep, fiilin duracağı yere yazıldı.

## Sallanan buz: ipin ucundaki sarkaç

Dağın kendi yeni fiili, ve sahanlığınkinin tam tersi. Sessiz alan beş yüz piksel
açık gökyüzü istiyor ve dağda hiç yok; sarkaç ise asılacak bir tavan ve geçilecek
dar bir boşluk istiyor, ki bir şaft **zaten budur**.

Periyot bir ayar değil: **`2π√(L/g)`**, o ip boyundaki gerçek sarkaç periyodu.
Bu göründüğünden önemli, çünkü hızı yazılmış bir sabit olan sallanan platform
sadece eğri yollu bir platformdur; hızı boyundan gelen ise **sarkaçtır**, ve
insanlar sarkaçları doğru okur — hayatları boyunca izlediler. Uzun ip yavaş,
kısa ip hızlı, kimseye söylemeye gerek yok.

İp şaftın genişliğine göre kesiliyor. Kalkış rafı, iniş rafı ve buzun kendisi
paylarını aldıktan sonra geriye ne kalıyorsa yay o, ve periyot boydan geldiği
için **dar şaft kısa ve hızlı ip, geniş şaft uzun ve yavaş ip** veriyor. Kimse
seçmedi, fizik verdi.

Kanıt yerleşimin içinde: kalkış rafı yayın yakın ucuna, iniş rafı uzak ucuna
sıradan bir zıplama mesafesinde — ikisi de buzun **bir an için durduğu** uçlarda
ölçülü. Yani hiç durmayan bir şeyin geçilebilirliği duran aritmetikle
kanıtlanıyor, ve ucunu bekleyen oyuncudan asla göremeyeceği bir zamanlama
istenmiyor. Hızlı ortasından binmek daha çabuk ve çok daha zor; hiçbir zaman
gerekli değil.

## Kavisli atış: siperin üstünden

Kar topu bölümü baştan sona **görüş hatlarından** kurulu, ve görüş hatlarından
kurulu bir bölümün tek bir statik cevabı var: bir şeyin arkasına geç. Oyuncu
bunu bir kez öğrendiğinde kaya bütün fikrin sert karşıtı oluyor ve on beş
bölümün dördü soru sormayı bırakıyor.

Kavisli atış kayanın üstünden geçiyor. Aynı atıcı, aynı hazırlık, aynı işaret —
sadece elden bir açıyla çıkıp yerçekimiyle iniyor, yani duvar olan siper artık
**terk edilmesi gereken bir yer**.

Takas bilinçli ve adaleti sağlayan şey o: kavis düz atıştan çok daha yavaş.

| | Uçuş | Kaçış penceresi |
|---|---|---|
| Düz atış (600 px) | 1,11 sn | 1,73 sn |
| Kavis (600 px) | 1,49 sn | 2,11 sn |

Yani bedava cevabı elinden alıyor ve karşılığını **saniyeyle ödüyor**. Üstelik
hazırlık boyunca çizilen işaret düz bir çizgi değil, topun gerçekten izleyeceği
**yayın kendisi** artı yere inecek noktanın halkası — çünkü kavisli bir atış için
düz çizgi yardımcı olmamakla kalmaz, yalan söyler: topun aşacağı kayayı gösterir.

Açık zeminde tek başına duran bir kavis sadece yavaş bir kar topudur ve düz
atıştan kesinlikle daha naziktir. O yüzden hep siperle **eşleştiriliyor**: bir
tarafta düz atıcı, öbür tarafta kavisli atıcı, ve birinin cevabı öbüründe seni
öldüren şey.

## Balık: neden daha yavaş geliyor

Bir para birimi ancak isteyecek bir şey kaldığı sürece ilginç. Ölçüldüğünde bu
para birimi fazla hızlı ödüyordu: iyi bir oyuncu marketin yarısına **uzun bir
hafta sonunda** sahip oluyordu. Bu cömertlik değil, ekonominin **bitmesi** — o
noktadan sonra toplanan her balık hiçbir şey etmiyor ve market oynamak için bir
sebep olmaktan çıkıyor.

Rutin gelir kabaca yarıya indi, orta seviye kostümler %70 civarı pahalandı:

| | Önce | Sonra |
|---|---|---|
| İlk market eşyası | 4 dk | 4 dk |
| Marketin yarısı | 16 saat | **24 saat** |
| Marketin tamamı | 34 saat / 80 gün | **49 saat / 116 gün** |
| Bütün kostümler | 40 saatte ulaşılamadı | **115 saat / 273 gün** |

İlk alım hâlâ ilk on dakikada, çünkü erken harcayamadığın bir para birimi de
hiç gerçek olmuyor. Değişen şey ondan sonraki eğim.

Simülatörün ufku 40 saatten 220 saate çıktı, ve bunun sebebi yazmaya değer:
ödemeler düşünce son iki kilometre taşı koşunun dışında kaldı, ve
`Infinity < 20 saat` diye okunan bir kontrol hiçbir şey ifade etmeden geçer. Bu,
çalışan bir ekonomiyi kanıtlamak yerine bozuk olanı gizleyen türden bir yeşil
tiktir.

### İkiye katlama teklifi

Bölüm sonunda, kazanç ekrandayken: **balığını iki katına çıkar.** Ödüllü videonun
dürüst kısmının tamamı burada — sadece kayda değer bir kazançta çıkan bir teklif,
günde üç hak, ve yalnızca sonuna kadar izleyene bir kez ödeyen bir ödeme.

**Burada reklam ağı yok.** SDK yok, hesap yok, izin akışı yok, para yok.
`src/core/rewarded.mjs` bir dikiş yeri: içindeki varsayılan sağlayıcı beş
saniyelik bir sayaç, hiçbir ağa dokunmuyor, ve buton bunu **açıkça yazıyor**.
Gerçek bir sağlayıcı takmak tek bir metot yazmak demek:

```js
setProvider({ available: () => boolean, show: () => Promise<boolean> })
```

Günlük sınır bir detay değil, tasarımın kendisi: sınırsız bir katlama bonus
değil ekonominin ta kendisi olurdu, ve ekonomi az önce bilerek yavaşlatıldı.

## Bölümler birbirini tekrar ediyor mu

`tools/variety.mjs` bir kanaati sayıya çeviriyor: her bölümün bestecide
*hangi fiilleri çağırdığını* okuyup, aynı chapter içinde kelime dağarcığının
%80'ini paylaşan bölüm çiftlerini sayıyor. İki bölüm kelimelerinin beşte
dördünü paylaşıyorsa, içlerindeki sayılar ne kadar farklı olursa olsun, tek bir
fikrin iki düzenlemesidir.

| Chapter | Fiil (önce → sonra) | Tekrar (önce → sonra) |
|---|---|---|
| I. Sahanlık (1–31) | 18 | %6 → %6 |
| II. Zirve (32–46) | 8 → **9** | %15 → **%11** |
| III. Buz Altı (47–61) | 9 → **10** | %33 → **%23** |
| IV. Kar Topu (62–76) | 5 → **6** | %16 → **%10** |

Sıralama işi yönlendirdi: en tekrarlı chapter'a yeni bir fiil (baca), en ince
dağarcıklı chapter'a bir başkası (kar siperi), dağa bir üçüncüsü (cam buz).
Yeni bir mekanik eklemeden önce ve ekledikten sonra çalıştırılıyor, çünkü "bu
bölümler aynı geliyor" cümlesi biri sayı üretene kadar bir kanaat.

**I. chapter'a dokunulmadı.** 18 fiil, %6 tekrar — ölçüm "burada yapacak iş
yok" dedi ve iş yapılmadı. Sağlıklı bir sayıya iyileştirme yapmak, sayıyı
değil kodu bozar.

### Ölçüm bir kere de beni durdurdu

Cam buzu ilk hâlinde dört bölüme birden koydum. Tekrar oranı **düştü değil,
yükseldi**: %15'ten %17'ye.

Sebebi ölçüldüğünde bariz. Metrik Jaccard: iki bölüm kelimelerinin beşte
dördünü paylaşıyorsa ikizler. Bir bölüm başka bir bölüm **artı bir kelimeyse**
hâlâ 5/6 = 0,83 ikizdir; ve aynı yeni kelimeyi tutan dört bölüm birbirinin
aynısı olur. Yeni bir oyuncak dağıtmak bölümleri birbirine benzetiyor.

Ayırt edicilik oyuncakta değil, **birleşimde**. Bütün yerleşimleri tarayınca
(dört aday bölüm × iki nadir fiil) en iyi düzen çıktı: **37. bölüm ikisini
birden alıyor** — düz duvar *ve* cam buz, çıkıntının altında — ve chapter %11'e
iniyor. İki nadir kelimeyi tek bölümde üst üste koymak, bir kelimeyi dört
bölüme yaymaktan iyi.

| Düzen | Tekrar |
|---|---|
| Hiç değişmemiş | 16/105 (%15) |
| Cam buz dört bölüme yayılmış | 15/105 (%14) |
| **Cam buz + düz duvar 37'de, cam buz 36'da** | **12/105 (%11)** |

Ve bir yerde de kanıt "hayır" dedi. **41. Cilalı Sırt** cam buz için mükemmel
bir aday: adı Cilalı Sırt, alt başlığı "ayak tutmuyor", ve bu şimdiye kadar
yalnızca zeminle ilgiliydi. Aynı zamanda chapter'ın en zor tırmanışı (effort
0,962), her yatay geçişin altında cilalı buz var, ve çözücü iki duvarda da her
yükseklikte bandı reddetti. Bu bölümde geri alamayacağın bir hamle için
kalmış dayanma gücü yok. Bir bölümün ödeyemediği iyi fikir, o bölüm için iyi
fikir değil.

## Cam buz: geri dönüşü olmayan hamle

Dağın sekiz fiili, *ne kadar tutunabilirsin* sorusunun sekiz sorulma biçimi:
bir duvar, bir baca, bir yatay geçiş, sallanan bir buz, bir fırtına. Ortak
noktaları cevap değil — dağdaki **her hamlenin yarıda bırakılabilmesi**.
Tutunuyorsun, düşünüyorsun, biraz kayıyorsun, gidiyorsun.

Chapter'ın **kararlılık** diye bir kelimesi yoktu.

Cam buz, duvarın orada olması ve tutulacak hiçbir şeyin olmaması. Tek bir
duvarda bu sadece ortasında delik olan bir duvar olurdu — banda tırmanırsın,
tutuş gider, düşersin — o yüzden **bacaya** konuyor, karşıda başka bir duvar
varken. Bandın yüksekliğini karşı tarafta tek seferde kazanman gerekiyor, ve bu
dağdaki geri alamayacağın tek hamle: ortasında duramazsın, çünkü ortası
tutmayan kısım.

İki inşa-zamanı reddi, ikisi de aritmetik: bant tek bir tırmanıştan kısa olmalı
(yoksa karşı taraf kapatamaz ve baca çıkmaz sokak olur) ve bacanın ağzıyla
tepesi arasına sığmalı (yoksa bant değil, kısa bir bacadır).

**Ve kanıtın bunu hissetmesi gerekiyordu.** `climb-run.mjs` gerçek `Player`'ı
sürüyor ama niyeti kendisi kuruyor — üstelik dört ayrı çağrı yerinde. Dördü de
sessizlik bölgesi için `gravity` geçirmeyi hatırlıyordu; üçü ikinci bir bölge
türünden habersizdi. Bir commit boyunca bu çözücünün pengueni, oyuncunun
pengueninin tutunamayacağı bir duvara tutunabiliyordu, ve iki bölümü kimsenin
yapamayacağı bir hamleyle "tırmanılabilir" ilan etti. Oyundan güçlü olmasına
izin verilen bir kanıt hiçbir şeyin kanıtı değil. Niyet artık tek bir
fonksiyonda kuruluyor, ki bir sonraki bölge bir kere bağlansın.

## Kar siperi: süresi olan siper

Chapter dört, on beş bölüm için beş kelimeye sahipti — oyundaki en ince
dağarcık — ve beşi de tek bir fikrin düzenlemesiydi: *hiçbir şeyin sana hattı
olmayacağı yer neresi*. Kaya sütunu bu sorunun cevabı, ve oyuncu bir sütun
bulduğunda bölüm yürümek dışında bitmiş oluyor.

Kar siperi, üstünde saat olan bir sütun — ve saati sana atanlar kuruyor. Üç
isabet ve yerde kar oluyor. Yani bölümün en güvenli yeri, tükenmekte olan yer.
Saklanmak bir çözüm değil, bir kaynak. Chapter nihayet kamp yapmaya "siperi
kaldırdık" olmayan bir cevap veriyor.

Üç şeyin doğru olması gerekiyor, ve ikisi yolda kırıldı:

**Yalnızca zaman verebilir.** Katı yapıldığında aynı zamanda bir duvardı, ve
iki duruş noktası arasındaki yürüyüşün zaten kaçış penceresine göre ayarlandığı
bir bölümde, o yürüyüşün ortasındaki bir duvar kazanılabilir bir arenayı
kazanılamaz hâle getirdi. Artık gevşek kar: kar topu içine gömülüyor, penguen
içinden geçiyor.

**Asla cevabın üstünde durmaz.** Bu chapter'ın bilmecesi, oyuncunun atacak
hiçbir şeyi olmaması: *sana* atılan bir topun başka bir rakibin içinden geçtiği
yere duruyorsun ve işi onlara bıraktın. O hatlardan birinin üstündeki bir siper
demek, topun kara saplanması ve kimsenin devrilmemesi demek. İlk sürüm bunu
**henüz kurulmamış** bir plana karşı denetliyordu (`duel()` yalnızca istek
kaydediyor; atıcılar `build()` içinde yerleşiyor), iki bölümde siperi tam
duruş noktasının üstüne bıraktı, ve bestecideki her kuralı geçti.

**Ölünce geri gelir**, yoksa siperin arkasında ölen oyuncu kendisine verilenden
daha az siperli bir bölüme dirilirdi.

Hangi bölümler: **64 Tepedeki** (oyundaki ilk siper, konusu hiç durmadan sana
atan biri olan bölümde — arkasına geçmek bariz hamle ve yanlış olanı), **71 Dört
Kapı** (üç atışlık tek bir nefes alma yeri), **74 Aynı Anda** (herkesin aynı
vuruşta attığı bölümde iki siper: burada siper aşınmıyor, yıkılıyor — siper
başına bir yaylım).

Ölçüm sonrası: arena chapter'ının tekrarı **%16 → %10**, fiil sayısı 5 → 6.

## Pengu'ya bir ışık

İfade katmanı penguenin nasıl *hareket ettiğini* çözdü ve nasıl *çizildiğine*
hiç dokunmadı — ve çizim tamamen düz doluydu. Gövde için tek lacivert, karın
için tek beyaz, gaga için tek turuncu. Düz dolgu çıkartma gibi okunur, ve bir
karakterin asla benzememesi gereken tek şey çıkartmadır.

Artık bir ışık var: üstte ve biraz önde, buzun ve gökyüzünün zaten aydınlandığı
yönde. Yeni bir şekil yok; hep orada olan şekillere nihayet güneşin nerede
olduğu söylendi.

- **Form** — gövde ve kafa kendi renginin açığından koyusuna. Işık bütün
  boyuna yayıldığında yıkanmış bir griye dönüşüyordu: ışık, açının değil
  boyanın değişmesi gibi okunuyordu, ve neredeyse siyah olmayan bir penguen
  penguen değildir. Şimdi kendi rengi erken geliyor ve gövdenin çoğunu tutuyor.
- **Buzdan seken ışık** — en altta gövde biraz açılıyor. Beyaz bir zeminde
  duran hiçbir şeyin gölge tarafı karedeki en koyu şey değildir.
- **Kenar ışığı, şeklin *içine* çizilmiş** — yol üstünde çizilince çizginin
  yarısı dışarı taşıyor, ve koyu bir kafanın dışındaki geniş parlak çizgi
  eğriye vuran ışık gibi değil, **cam bir kask** gibi okunuyor. Önce aynı yola
  kırpınca o yarı atılıyor ve yalnızca istenen kalıyor.
- **Boyun** — kafanın omuza oturduğu yerde bir gölge. Boyun çoğunlukla bir
  gölgedir; onsuz kafa, gövdenin üstünde dengelenmiş ikinci bir toptur.
- **Çenenin gölgesi** karnın üstüne düşüyor, yoksa karın gövdenin önü değil,
  önüne yapıştırılmış bir çıkartmadır.
- **Gaga** yüksekliği boyunca aydınlatılıyor. İlk deneme her yarıya ayrı ton
  veriyordu ve hiçbir işe yaramadı: gaga kapalıyken iki yarı *aynı üçgen*,
  yani ikincisi birincinin üstünü boyuyor ve yalnızca koyu ton görünüyordu —
  ki kapalı gaga oyunun çoğunda taktığı yüz.
- **Ayaklar** parmaklı. İki turuncu leke, bir ayağın çok uzaktan göründüğü
  şeydir; üç parmak, yakından göründüğü şey.
- **Uzaktaki göz daha küçük** — üç-çeyrek görünüşün tamamı bu. Yan yana iki
  özdeş daire, tam karşıdan görülen bir yüzdür; oysa bu kafa karşıdan değil,
  gaga bir yanından çıkıyor. Aynı boyda çizilince gagayla hangi yöne baktığı
  konusunda kavga ediyorlardı.
- **Güneş yuvarlanmıyor.** Penguen dönüyor — koşuya yatıyor, dalışa burnunu
  eğiyor — ve bu geçişler o dönmenin *içinde* kuruluyor. Kendi hâline
  bırakılınca güneş onunla yuvarlanıyor ve dik bir dalış alttan aydınlanmış
  hâlde bitiyordu. `down`, dünyanın dikeyinin onun kendi koordinatlarındaki
  karşılığı: nasıl dönerse dönsün gölgeleme yerinde kalıyor.

Ve yol üstünde bir hata: `shade()` yalnızca `#rrggbb` okuyordu, oysa penguenin
gövde rengi oyunun çoğunda bir `rgb(...)` dizgisi — civciv büyüdükçe ve hızlanınca
ara değerlerle üretiliyor. Öylesine beslendiğinde `parseInt` `NaN` veriyor, her
kanal sıfırlanıyordu, ve sonuç kuşla hiç ilgisi olmayan düz bir griydi: kendi
renginin bir ton koyusu olması gereken uzak kanat, lacivert de olsa kızıl da
olsa altın da olsa hep aynı macun grisi çiziliyordu.

### Ve bir siluet

Işık gövdeye hacim verdi ama dış hat hâlâ üst üste iki elipsti — ve üst üste
iki elips bir şekildir, hayvan değil. Hangi yöne dönerse dönsün dış hattı
aynıydı, ve hangi yöne baktığını bilmeyen bir dış hat, içi ne kadar özenle
gölgelenirse gölgelensin ucuz okunan şeydir.

- **Kuyruk** — arkada, su hizasında, küt bir kama. Küçük, her şeyin arkasında,
  ve önü ile arkası olan bir siluetle olmayan arasındaki fark.
- **Karın boğaza doğru daralıyor** — yukarısı dar, aşağısı geniş ve yuvarlak.
  Kendi ayakları üstünde duran bir kuşun önü gerçekten bunu yapar; düz elips
  düz elipstir. İlk deneme simetrik değildi ve daralma gibi değil, **önlüğünü
  yamuk bağlamış** bir kuş gibi okunuyordu.

Kare süresi 16.7 ms — altmış kare, değişmedi.

## Oluk: denizin beşinci fiili

Dört fiil ve on beş bölümden sonra dalış chapter'ının tekrarı hâlâ %19'du, ve
kalan ikizler artık düzenlemeyle çözülmüyordu: `seal`, `current`, `trench`,
`vent` — dördünün mümkün olan bütün ikili birleşimi ya kullanılmıştı ya da
başka bir bölümle çakışıyordu. Kombinatorik tükenmişti. Yeni bir fiil
gerekiyordu, ve hangisi olduğu chapter'ın kendi cümlesinde yazılıydı.

Denizin dilbilgisi tek cümle: **yükselmek bedava, dalmak tuşa mal oluyor.**
Kaldırma kuvveti kuşu bedavaya yukarı taşıyor; aşağı inmek ödediği tek şey. On
beş dalış bu asimetrinin düzenlemeleri. Diğer dört fiil cümleye *uymayı*
zorlaştırıyor — geometri yolu daraltıyor, deniz leoparı seni yoldan kovalıyor,
çukur derin kısmı pahalılaştırıyor, akıntı suyun kendisini uzatıyor. Oluk
cümleyi **söküyor**.

Yukarı akan su, ödediğin yönü karşılanamaz kılıyor: tuşu basılı tut, yine de
zar zor batıyorsun. Aşağı akan su daha acımasız, çünkü **bedava** olan yönü
alıyor — ve yukarı için bir tuş yok, hiç olmadı.

Adı akıntı değil oluk, çünkü bir *yer*, hava durumu değil: üç buçuk penguen
boyu bir kanal, içinden su geçiyor, ve orada durgun olan tek şey ortadaki hat.
Bu da onu chapter'ın **ilk saf kontrol sınavı** yapıyor. Diğer her fiil nereye
gittiğinle ilgili; bu, zaten olduğun yerde kalıp kalamayacağınla.

### Fizik iki kez yazıldı

İlk hâl iki kelepçeyi kaydırıyordu — "yukarı ve aşağı seyir hızları suya
görelidir", ki doğru bir cümle ve tam doğru terminal hıza oturuyor. Gerçek bir
olukta ölçüldüğünde neredeyse hiçbir şey yapmıyordu: tuşu bırakan bir yüzücü
3.4 boyluk kanaldan **oyundaki en güçlü suda 0.22 saniyede**, hiç suyu
olmayanda **0.23 saniyede** çıkıyordu.

Sebep kaldırma kuvvetinin sertliği. Serbest yükselişe altıda bir saniyede
varıyor ve bunu yaparken yalnızca yirmi piksel alıyor — yani dar bir kanalda
yüzücü **her zaman ivme rampasında** ve hiçbir kelepçeye hiç varmıyor. Rampa
da iki durumda da aynı: kaldırma kuvveti. **Varılmayan bir kelepçe, config
dosyasındaki bir sayıdır.**

Su bir cismi ilk kareden itibaren taşır. Yani yatay akıntının yaşadığı yerde
yaşıyor: suyu sekizde bir saniyede kovalayan bir drift kanalında, ve
kelepçeler eskiden ne idiyse ona geri döndü. Aynı biçim, aynı gerekçe, tek bir
vektörün iki yarısı. `_resolveY` de artık gerçek hareket yönüne bakıyor
(`vy + driftY`), tıpkı `_resolveX`'in kuyruk rüzgârı için yaptığı gibi.

### İçinden geçen rota bilerek düz

Bu chapter'daki her derinlik değişimi `reachFor` ile denetleniyor, ve o
durgun suyu biliyor — dikey suyun içinde sessizce yanlış olurdu. Kurala
olukları öğretmek yerine parça hiç derinlik değişimi *istemiyor*. Bedeli,
denizdeki her bedelin alındığı yerden alınıyor: `swimCost` içinde. Kanıtı da
her bedelin kanıtlandığı yerden: yüzülerek.

Kanal derinliğini `at` ile seçiyor, `gate` gibi — ve `gate`'in bunu öğrenmek
zorunda kaldığı sebeple. İlk hâli kanalı hattın olduğu yere açıyordu; nefesten
hemen sonra bu yüzey demek, kanal suyun tepesine kırpılıyor, ve hat **kendi
tavanının üstünde** kalıyordu: kimsenin çizmediği bir duvarı olan bölüm.

### Nereye konduğu

**48 Aşağı Bas** — yukarı akan su, nefesten hemen sonra, yükselmenin ne kadar
ucuz olduğunun yeni hatırlatıldığı yerde. İçeride tuş zar zor çalışıyor.
Chapter'da ilk kez, çok yukarıda olmanın cevabı "aşağı bas" değil — ve bu, ilk
yarısını sana hep öyle olduğunu öğreterek geçiren bölümde oluyor.

**57 İki Ciğer** — aşağı akan su, yukarı çıkmakla ilgili bölümde. Acımasız yön,
en acımasız yere. Bu chapter'da her şeyin cevabı tuşu bırakmak olabilir: kuş
yüzer, buz yukarıdadır, ve bu ilk dalıştan beri bedava. Burada su **yanlış
yöne** itiyor. İkinci ciğerde duruyor — bölümün kendi notunun "iyi harcanmalı"
dediği ciğerde — yani çok derinde olmanın cevabı, tam olarak çok derinde
olmanın bütün problem olduğu anda çalışmayı bırakıyor.

Ölçüm sonrası: dalış chapter'ının tekrarı **%19 → %12**, fiil sayısı 10 → 11,
ve 48 ile 57 ikiz listesinden çıktı. Chapter artık oyundaki en tekrarlı bölüm
değil.

## Etkisiz mekanik taraması

Akıntı onarıldıktan sonra sorulması gereken soru şuydu: **başka kaç tanesi
böyle?** Bir mekanik, hiçbir çözücünün ve hiçbir doğrulayıcının haber
veremeyeceği bir biçimde oyundan eksik olabilir — bölümler yine besteleniyor,
biri yine bitiriyor, ve tek belirti chapter'ın düz hissettirmesi.

Her mekanik tek tek ölçüldü: rüzgâr `drift` kanalında 200 itiş için saniyede
98 piksel taşıyor; sessiz alan zıplamayı gerçekten büyütüyor; cam buz tutuşu
gerçekten kesiyor; çukur, baca, siper, sarkaç, kavisli atış hepsi ısırıyor.

Ve tarama kendi cevabını da verdi: **akıntı, kendi paketi olmayan tek
mekanikti.** Kapsamdaki tek boşluk, hatanın yaşadığı yerin ta kendisiydi.

Geriye bir tane kalmıştı — deniz leoparı — ve o da ancak elle ölçülmüştü, ki
bu akıntının onarımdan önceki durumunun aynısı. Artık `tests/seal.mjs` var ve
üç kural kanıtlıyor: devriye geziyor (kımıldamayan bir tehlike, çarpışma
kutusu olan dekordur), temasta öldürüyor, ve **suyun altında üstüne
basılamıyor** — buzun üstünde bir tehlikeye atlamak oyunun cesarete verdiği
ödül, ama suda küçük olan penguen. `world.js` bunu bir yorumda söylüyordu, ve
bir yorum test değildir.

## Akıntı gerçek olunca iki bölüm yeniden yazıldı

Akıntı çalışmaya başlayınca `tools/variety.mjs`'in yıllardır söylediği şey
anlam kazandı: dalış chapter'ının ikizleri, ayırt edici fiili boş olan
bölümlerdi. Onarım tek başına oyunu değiştirdi, ama iki bölüm hâlâ *aynı
soruyu* soruyordu. İkisi de yeniden yazıldı — yeni bir fiil eklemeden, var
olanları daha önce hiç denenmemiş biçimde üst üste koyarak.

**52 Akıntı — üst üste iki nehir.** Eskiden önce seninle sonra sana karşı,
arka arkaya: yani sana *olan* bir akıntı, karar yok, sadece hızlı bir bölüm
ve yavaş bir bölüm. Şimdi ikisi aynı anda ve üst üste. Sığ nehir sana karşı,
derin nehir seninle. Bu chapter'da derinlik ilk dalıştan beri tuşa basmaya
mal oluyordu ve karşılığında hiçbir şey vermiyordu; burada ilk kez **satın
alınmaya değer**. Geçitler hangi nehirde olduğunu umursamıyor, yani seçim iki
tarafta da gerçek: tuşu basılı tut ve havanın uzak olduğu derinlikte hızlan,
ya da yukarıda yavaş suda kal, ihtiyacın olacak buzun yanında.

İkinci yarı bu cevabı ters çeviriyor: iki nehir de sana karşı ve **derin olan
daha sert**. Az önce işe yarayan cevap, ciğerin zaten azaldığı yarıda pahalı
olanı hâline geliyor.

Bunun için besteciye `at` geldi — bandı su sütununda sabit bir yere koyuyor,
`gate`'in yaptığı gibi — ve aynı anda birden fazla açık bant taşıyabilmesi.

**56 Kara Su — akıntının içinde bir baca.** Bölümün ikinci yarısında buzda
delik yok: tek hava, tabanda saatle nefes alan bir çatlak, ve **üstünden bir
akıntı geçiyor**. Chapter'daki her baca *durmanı* istiyor, ki bedeli sadece
bir bekleme. Bu baca, suyun aktığı yerde durmanı istiyor — havanın olduğu bir
metrekarede kalmak işin kendisi hâline geliyor. Adı Kara Su olan bölüm nihayet
denizin nerede olduğuna karar verdiği, senin ise çok kesin bir yerde olmaya
çalıştığın bir ana sahip.

Ölçüm sonrası: dalış chapter'ının tekrarı **%23 → %19**, ve 56 ikiz
listesinden tamamen çıktı. 47–49 kasıtlı olarak listede kalıyor: onlar
chapter'ın dilbilgisini öğreten üçlü, ve bir öğretme sırasını bir metriği
düşürmek için bozmak, ölçmenin amacını kaçırmak olur.

## Sürüm dosyasının sessizce değiştirdiği çarpma

Akıntı onarımı bittiğinde node paketlerinin hepsi geçiyordu ve **tek dosya
sürümü açılmıyordu**. Aynı kod, aynı bölüm, iki farklı sonuç:

```
52. Akıntı: çıkışa nefes yetmiyor: 3418px, bir ciğer 3347px
```

`config.js`, `deep.js` ve `dive.js` — üçü de sürüm dosyasında kaynakla
**birebir aynıydı**. Modül sırası da aynıydı; hepsini sırayla node'da içe
aktarmak hiçbir şeyi bozmadı. Sonunda besteci iki koşuda adım adım
karşılaştırıldı, ve fark `stretch`'in yedek payındaydı:

```js
    const tail = () =>
      (next === 'vent' ? this.ventRunFrom(this.lane) : this.surfaceRunFrom(this.lane))
      * this.flowDrag;
```

Sürüm dosyasında **son satır yoktu.**

`tools/bundle.mjs` modülleri tek dosyaya alırken yorumları ayıklıyor, ve
ayıklayıcıda şu satır vardı:

```js
if (t.startsWith('*') && !t.startsWith('*/')) continue;
```

Yani "`*` ile başlayan satır JSDoc'un ortasıdır". Blok yorumun içindeyken bu
zaten üstteki dal tarafından hallediliyordu — yani satır **gereksizdi**. Blok
yorumun *dışında* ise `*` ile başlayan bir satır yorum değil, **devam eden bir
ifadedir**.

Ve en kötüsü bu: satır silindikten sonra geriye kalan şey hâlâ geçerli
JavaScript. Otomatik noktalı virgül ekleme ok fonksiyonunu kapatıyor, hiçbir
yerde hata fırlamıyor, sürüm dosyası sessizce **başka bir çarpma** yapıyor.
Besteci sürüm dosyasında modüllerdekinden daha az hava ayırıyordu.

İkinci bir kurban da vardı ve onu ancak test buldu: `world.js` içinde

```js
      flow = flowAt(this.zones, this.player.centerX, this.player.y + this.player.h / 2)
        * this.player.swimSpeed;
```

Aynı şekilde son satırı siliniyordu — yani sürüm dosyasında akıntı, saniyede
piksel yerine **kesir** olarak uygulanıyordu: yeni onarılmış mekanik, indirilen
oyunda yaklaşık beş yüz kat zayıf olacaktı.

Onarım ayıklayıcıdaki o satırı silmek. Yanına da `tests/strip.mjs` geldi:
yorum sanılmaya en müsait satırlardan kurulu bir paket — satır başında `*`,
`/`, `**`, metin içinde `//`, şablon içinde `/*` — ve bütün kaynaklar üzerinde
tek bir iddia: **silinen her satır gerçekten yorum olmalı.**

Bir hatanın alabileceği en kötü biçim budur: bir derleme adımının programın
anlamını, hâlâ ayrıştırılabilir kalacak şekilde değiştirmesi.

## Hiç var olmamış akıntı

Bu chapter'ın üçüncü fiili yazıldığı günden beri oradaydı, beş bölüm onun
üstüne kurulmuştu, ikisinin adı oydu — ve **hiçbir şey yapmıyordu**.

Ölçüm şu: oyundaki en güçlü akıntı, `power: -240`, chapter'ın duvarı olması
gereken bölümde, penguenin hızını saniyede **480 pikselden 478'e** düşürüyordu.
Yüzde dört onda bir.

Sebep tek bir satırın sırasıydı. Yüzme dalında yatay hız her karede seyir
hızına kırpılıyor, ve akıntı kırpmadan *sonra* ekleniyordu — yani bir akıntı
hiçbir zaman tek bir karelik itişten fazlasını taşıyamıyordu. Üstündeki yorum
"akıntı rüzgâr değildir, yüzücüyü iter, o yüzden `vx`'te yaşar" diyordu. Doğru
bir cümle, ve yanlış sonuç: `vx` kırpılan kanal. Rüzgârın `drift` kanalında
olmasının sebebi tam olarak budur.

Üç ayrı eksiklik birbirini koruyordu. Akıntı **çizilmiyordu**, o yüzden kimse
yokluğunu görmedi. **Fiyatlandırılmıyordu**, o yüzden besteci durgun suya göre
koridor seriyordu. Ve **çalışmıyordu**, o yüzden bölümler rahat geçiliyordu —
ki bir çözücünün göremeyeceği tek hata türü budur. `validate-dive` koridorun
doğru şekilde olduğunu kanıtlıyordu ve öyleydi; `dive-run` birinin bitirdiğini
kanıtlıyordu ve bitiriyordu. Chapter'ın bütün kontrolleri bir şeyin *mümkün*
olduğunu soruyordu, ve etkisiz bir tehlike hepsini kolayca geçer.

`tools/variety.mjs` bu bölümleri var olduğu günden beri sade bölümlerin ikizi
olarak işaretliyordu. Haklıydı, ve göremediği tam sebepten: **ayırt edici tek
fiili hiçbir şey yapmayan bir bölüm, sade bölümün ta kendisidir.**

Onarım birimde. `flow` artık isimsiz birimlerde bir ivme değil, yüzücünün kendi
seyir hızının bir **kesri**: 0.4'te su, penguenin yüzdüğü hızın onda dördüyle
akıyor, karşısına yüzmek `1/(1-0.4)` kadar sürüyor, ve bu chapter havayı
mesafeyle ölçtüğü için üçte iki fazla **hava** demek. Kesir olması penguen
büyüdükçe de doğru kalmasını sağlıyor.

Dört yerde birden gerçek oldu:

- **Fizik** — akıntı kırpmayı atlatan `drift` kanalına taşındı, ama rüzgâr gibi
  bir sürüklenme terimine karşı birikerek değil: sudaki bir cisim sonunda
  suyun gittiği hızda gider, o yüzden kanal akıntıya doğru *kovalıyor*.
- **Fiyat** — `swimCost`, chapter'ın her bacağı fiyatlandırdığı tek fonksiyon,
  artık akıntıyı da örnekliyor. Akıntıya karşı bir bacak, gerçekten olduğu
  daha uzun yüzüş olarak yazılıyor; çukurun ödendiği yöntemin aynısı.
- **Yedek** — `stretch`'in yüzeye çıkış payı mesafeydi, `swimSince` ise bedel.
  Bandın *içinde* doğru piksel, yanlış saniye ayrılıyordu. Şimdi pay, çıkışın
  geçeceği bütün su sütunundaki en kötü akıntıyla çarpılıyor.
- **Görüntü** — su nihayet çiziliyor: gerçek hızında kayan çizgiler, gerçek
  yönünde, kenarında kesikli bir çizgiyle. Hızını yarıya indiren bir tehlikeyi
  görememek tehlike değil, pusudur.

Sonuç bir **reddediliş** oldu, ki sistemin çalıştığının kanıtı: **61 Açık
Deniz** artık ilk ciğerini karşılamıyordu — sütunun iki ucunda birer geçit ve
bir deniz leoparı, hepsi akıntıya karşı, 3927 piksellik ciğere karşı 4836
piksel. Bölümün açılışı artık *geçilen* bir bant, finali ise *içinde
yaşadığın* bir geçit.

Ve yeni bir paket: `tests/current.mjs`. Diğerlerinin sorduğu "geçilebilir mi"
yerine bunun sorduğu soru **"ısırıyor mu"**.

## Deniz tabanındaki baca: denizin "ne zaman"ı

`tools/variety.mjs` bir kanaati sayıya çevirdi ve sayı acıtıcıydı: dalış
chapter'ı oyundaki en tekrarlı bölümdü. Aynı chapter içindeki her üç bölüm
çiftinden biri, kelime dağarcığının %80'ini paylaşıyordu.

Sebep tembel besteleme değildi. Sebep şuydu: on beş bölümün hepsi **tek bir
soruyu** soruyordu — *bir sonraki deliğe ne kadar hızlı varırsın*. Geometri,
deniz leoparı, akıntı ve soğuk çukur; bunu zorlaştırmanın dört yolu, ve
hiçbiri farklı bir soru değil.

Denizin **"ne zaman"** diye bir kelimesi yoktu. Orada hiçbir şeyin saati yok;
sadece elinden geldiğince hızlı yüzüyorsun, on beş bölüm boyunca.

Baca bunun cevabı. Buzdaki delik gibi hava veriyor, ama sadece **üflerken**,
ve döngüsünün beşte ikisinde üflüyor. Üstüne daha hızlı yüzmek hiçbir şey
yapmıyor. Varıyorsun, ve bekliyorsun. Beklemek de yüzmekle tam olarak aynı
şeye mal oluyor, çünkü burada her şeyin bedeli aynı ciğerden ödeniyor.

Ve **tabanda**. Bu chapter'da hava ilk bölümden beri tavanda, ve ona doğru
yükselmek penguenin sahip olduğu tek bedava şey; aşağı inmek tuşa basmayı
gerektiriyor. Bir baca, ekranda olduğu sürece chapter'ın bütün geometrisini
baş aşağı çeviriyor.

**Sırtın üstünde, tabanda değil.** İlk hâli tabandaydı ve yanlıştı: buzun
hemen altındaki hattan dört yüz piksellik bir iniş, ve bu chapter her dalışı
gerçekten mal olduğu yatay mesafe olarak fiyatlandırdığı için, beklemek daha
başlamadan bir ciğerin çoğu gidiyordu. Besteci oyundaki **her** yerleşimi
reddetti. Şimdi çatlak, tabandan yükselen bir kaya sırtında.

| Sayı | Değer | Neden |
|---|---|---|
| Döngü | 3,6 sn | 4,2'de en kötü bekleme 2,8 sn'ydi — bir ciğerin üçte biri — ve baca yalnızca havanın hemen ardına konabiliyordu, ki bir bacanın anlamsız olduğu tek yer orası |
| Üfleme payı | 0,42 | En kötü bekleme 2,09 sn: karar olacak kadar uzun, bir yere sığacak kadar kısa |
| Doldurma hızı | ×1,5 | Cömert görünüyor, değil. Üfleme bir buçuk saniye sürüyor ve açılıp sönüyor, yani altındaki *alan* zirvesinin yaklaşık yedide yedisi. Besteci bacayı bir nefes olarak fiyatlandırıyor — ciğeri delik gibi sıfırlıyor — ve bunun **doğru** olması gerekiyor. 0,78'de bir üfleme seni 9,5'ten 8'e getiriyordu, ve aritmetiği "dolu" derken suyun "tam değil" dediği bir besteci, bu projenin iki kere kazıp çıkardığı her hatanın şekli |

Hangi bölümler: **53 Testere Dişi** (yukarı-aşağı-yukarı: testerenin dibi
nihayet gidilmeye değer bir yer), **54 Buzul Karnı** (tavanın hiç yükselmediği
bölümde hava yukarıda olmayı bırakıyor), **58 Kılçık** (bölümün notu "hiç
dinlenecek yer yok" diyor; artık tek dinlenme var ve kira istiyor).

Ölçüm sonrası: dalış chapter'ının tekrarı **%33 → %23**.

### Ve bu arada ortaya çıkan bir yalan

**57. bölümün adı "İki Ciğer".** `breathRange` ile ölçünce geçişi *bir*
ciğerin 0,99'uydu. Ortasında isteğe bağlı bir delik ve hattın üstünde, yüzüşü
kısaltan tek eşya olan bir hız balığı olan tek ciğerlik bir bölümdü. Yazıldığı
günden beri öyleydi ve hiçbir şey göremezdi, çünkü chapter'daki her kural bir
stretch'in yeterince **kısa** olduğunu denetliyor ve hiçbiri bir bölümün adını
hak edecek kadar **uzun** olduğunu denetlemiyor. Bütçe yükseldi, kestirme
gitti: şimdi 1,40 ciğer.

`tests/vent.mjs` neyi tutuyor: üfleme eğrisinin sözleşmesi, tek üflemenin
gerçekten bir nefes ettiği, sessizken hava vermediği, **on ayrı fazın hepsinde**
bölümün bitirilebildiği (adalet iddiası bu — tek bir faza güvenmek değil), ve
bacanın süs olmadığı — yani bölümün, hiç ona uğramadan geçilemeyecek kadar
uzun olduğu.

## Çukur: derinliğin bedeli

Buz altındaki on beş bölüm baştan sona **bir ciğer** üzerine kurulu, ve bugüne
kadar derinliğin kendisi bedavaydı. Koridor nereye gideceğine karar veriyordu,
saat saniyede bir saniye sayıyordu, ve o saniyelerden birini dipte sürünerek
harcamakla tavana yapışarak harcamak tamamen aynı fiyattaydı. 53. bölümün kendi
yorumu "bu bölümde asıl maliyet derinliktir" diyordu ve **doğru değildi**.

Artık öyle. Çukur, su sütununun dibindeki soğuk siyah bir kuşak, ve içinde bir
ciğer iki buçuk katı hızla tükeniyor. Düz bir anahtar değil, **basınç gibi
derinlikle artan bir eğim**:

| Kuşağın neresinde | Tüketim |
|---|---|
| Dudağın üstünde | ×1,00 |
| Dörtte bir aşağıda | ×1,40 |
| Yarısında | ×1,80 |
| Dipte | ×2,60 |

Koridor **ne kadar derine inmek zorunda olduğuna** karar veriyor; onun altındaki
her piksel senin kararın. Bölümün dikey eksende sunduğu ilk gerçek seçim bu.

Çizimde tek bir şey kritik: **dudak**. Yumuşak bir geçiş, kuşağın sunduğu tek
kararı gizlerdi. O yüzden suyun üstünde sert soğuk bir çizgi, altında sayılabilir
bantlar hâlinde koyulaşan karanlık, ve nefes çubuğunun kendisi soğuk bir çerçeve
alıp **tüketim hızında** yanıp sönüyor.

Bir de şu var: **çukur göründüğünden uzundur.** Bölümdeki her kural bir ciğeri
*mesafeyle* ölçüyor, o yüzden dört ayrı yere ikinci bir para birimi öğretmek
yerine soğuk sudan geçen bir bacak gerçekte olduğu kadar uzun sayılıyor. Bütün
eski kurallar dokunulmadan çalışıyor, ve okunuşu da doğru: çukur sadece acıtmaz,
**daha uzaktır**.

## Tek dosya sürümü neden küçüldü

Bu projenin kaynağının **%38'i yorum**, ve bu bilerek öyle: bu kod tabanını
birinin eline alabilmesinin sebebi o yorumlar. Ama yorumlar **depoyu okuyan bir
insan** için yazılıyor, oyunu indiren bir telefon için değil.

Yollanmaları 295 KB tutuyordu ve tek dosya sürümünü 900 KB sınırının **15 KB
yakınına** getirmişti — yani bir sonraki özellikte kırılacak bir build. Paketleyici
artık yorumları kaldırıyor:

| | Önce | Sonra |
|---|---|---|
| Tek dosya | 885 KB | **589 KB** |

Yalnızca **tam satırlar** siliniyor, ve bu tembellik değil güvenlik argümanı: ilk
karakterleri `//`, `/*` veya `*` olan bir satır, **çok satırlı bir şablon dizesinin
içi hariç**, her durumda yorumdur. O yüzden ters tırnaklar sayılıyor ve sayı tekken
hiçbir şeye dokunulmuyor. Koddan sonra gelen satır sonu yorumları olduğu gibi
bırakılıyor, çünkü dizedeki `//` ile koddaki `//` ayırmak gerçek bir çözümleyici
ister ve o birkaç bayt bir parser'a değmez.

Bunun güvenli olduğunun kanıtı `tests/browser-bundle.mjs`: paketlenmiş dosyayı
gerçek bir tarayıcıda `file://` üzerinden açıp oynuyor.

## Sonsuz koşu 97. bölümde duruyordu

Ölçüm basit: ürete ürete git ve kadranlara bak.

| Bölüm aralığı | Tehlike | Buz | menace | En geniş boşluk | 3-yıldız hedefi |
|---|---|---|---|---|---|
| 77-96 | 2,8 | 26,4 | 1,05 | 174 | 76 sn |
| 97-116 | 5,6 | 31,6 | **1,25** | 248 | **95 sn** |
| 137-156 | 5,3 | 31,8 | **1,25** | 234 | **95 sn** |
| 337-356 | 5,3 | 32,6 | **1,25** | 242 | **95 sn** |
| 977-996 | 5,5 | 34,0 | **1,25** | 223 | **95 sn** |

977. bölüm, 117. bölümle **aynı**. Sonsuz koşu yirmi bölüm sonra koşu olmaktan
çıkıyordu — ve 76'dan sonraki tek içerik o.

Geometri cevap olamaz: buradaki en geniş boşluk zaten koşarak atlamanın tam
karşılığı, `menace`'ın var olma sebebi de bu. O yüzden ikinci rampa mesafeye
dokunmayan iki şeyi harcıyor: tehlikenin saati (`validate-levels.mjs`'in
tehlike tehlike kanıtladığı tavana kadar) ve üçüncü yıldızın bedeli — ki bu bir
puan, sonsuza kadar sıkılabilir ve hiçbir bölümü geçilmez yapmaz.

| Bölüm aralığı | menace | 3-yıldız hedefi |
|---|---|---|
| 97-116 | 1,256 | 94 sn |
| 187-206 | 1,306 | 85 sn |
| 257-276 | 1,345 | 79 sn |
| 297+ | 1,350 (tavan) | 78 sn |

Yüz seksen bölümde bir uçtan diğerine — kasıtlı olarak yavaş. Bu, birinin bir
ay sonra hâlâ oynadığı kısım; oraya vardığında gidecek bir yeri kalmalı.

Tavan (`MENACE_CEILING`) artık `config.js`'de duruyor ve doğrulayıcı oradan
okuyor: `menace` sayısını koyan ile onu denetleyen kural ayrı yerlerde iki
farklı fikre sahip olamaz. Doğrulayıcının üretilmiş bölüm örneklemi de rampanın
**iki ucunu** birden alıyor — eskiden 156'da bitiyordu, ki her şey 97'den sonra
aynıyken sorun değildi ve saat sıkılmaya başladığı anda sorun oldu.

## Zorluk: geometri tavana vurdu, o yüzden zaman kısaldı

Bölümlerin zorluk kadranı ölçüldü ve **tavana vurmuş** çıktı. Sahanlıkta `tight`
boşlukları, en genişi tam olarak koşarak atlanabilecek kadar açıyor — 31. bölüm
bir süredir o kenarda duruyor, ve %5 daha zorlarsan besteci penguenin fiziksel
olarak geçemeyeceği bir boşluk üretiyor. O zor bölüm değil, bozuk bölüm.

Zirvede de aynı: `effort`'u %3 artırmak iki tırmanış adımını çözülemez yapıyor.

O yüzden son üçte bir farklı bir yoldan zorlaştı: **`menace`**. Hareket eden her
şeyi hızlandırıyor — foklar daha hızlı devriye geziyor, sarkıtlar daha erken
düşüyor, orkalar daha kısa saatte çıkıyor. **Tek bir mesafeye dokunmuyor**, yani
`tests/` içindeki bütün geometrik kanıtlar aynen geçerli kalıyor, ve bölümler
"bu atlayışı yapabilir miyim" olmaktan çıkıp "**şimdi** yapabilir miyim" oluyor.

Bölüm sırasından türetiliyor, elle yazılmıyor: ilk üçte ikide hiç yok, son
bölümde %25. Kolay modda devre dışı, çünkü kolay modun anlamı aynı anda daha az
şey olması.

Ve tabanı var, doğrulayıcıda:

- sarkıt uyarısı, altından bir gövde çıkacak kadar uzun kalmalı;
- fok penguenden yavaş kalmalı, yoksa aynı buzda olmak ne yaparsan yap ölüm;
- orka, boşluğu geçmenin sürdüğünden uzun süre suyun altında kalmalı.

## Yüklü balıklar

Yeşil çürük balık uzun süre oyundaki en ilginç şeydi ve sebebi şu: oyuncuya
verebileceğin başka her şey bir *sayı*, sayı ise fiil değil. Yön algısını ters
çevirmek fiildi.

Üç yüklü balık aynı fikrin iyi tarafı. Hepsi zıplama tuşunun ne demek olduğunu
birkaç saniyeliğine değiştiriyor, çünkü tek düğmeli bir oyuna ikinci düğme
eklemeden fiil eklemenin başka yolu yok.

| | Renk | Süre | Zıplama tuşu ne oluyor | Ödül |
|---|---|---|---|---|
| **Yay** | Turuncu | 7 sn | Bir sonraki zıplama iki katı güçte. Tek zıplama. | 14 |
| **Kuantum** | Mor | 6,5 sn | Havada bas: üç buçuk gövde ileri ışınlanıyorsun. | 16 |
| **Gevşeme** | Turkuaz | 5,5 sn | Sen havadayken senin dışında her şey %34 hızda. | 16 |

Üçünün de bir kancası var, ve kancalar tesadüf değil:

- **Yay harcanmazsa kendi kendine boşalıyor.** Sessizce buharlaşan bir yay
  balığı bedava hediye yapardı; oysa bunların hepsi *saati işleyen bir karar*
  olmalı. Yanlış anda yutulan bir yay seni senin seçmediğin bir yere fırlatıyor.
  Ayağının altındaki halka daralarak bunu söylüyor.
- **Kuantum havada bir kez.** Yoksa uçmak olurdu, uçmak da bu oyunun sahip
  olduğu bir fiil değil. Hızını koruduğu için asla yükseltmiyor, sadece taşıyor:
  hiçbir zıplamanın yetişemeyeceği bir boşluğu geçebiliyor ama kendi başına bir
  metre bile tırmanamıyor. Duvarın içine de sokmuyor, çünkü ışınlanma
  adım adım süpürülüyor ve son *boş* nokta kazanıyor.
- **Gevşeme yerde çalışmıyor.** Genel bir ağır çekim düğmesi her bölümü
  kolaylaştırır ve hiçbirini ilginçleştirmez. Havaya bağlı olunca tek bir an
  için alet oluyor: gayzerin, fokun ve boşluğun aynı anda geldiği zıplama.
  Su altında da çalışmıyor, çünkü orada düğme zaten derinlik kumandası.

**Hiçbiri gerekli değil.** Bütün bölümler hiçbir şeye sahip olmayan ve hiçbir
şey toplamayan bir penguene göre kanıtlanıyor; yüklü balıklar hız balığı gibi
ana hattın dışında duruyor. `charged-fish.mjs` bunu tek tek ölçüyor: hiçbiri
buzun içinde değil, hiçbiri koşu hattının bir gövde yakınında değil.

## Çürük balıklar

Hız balığının karşı ağırlığı ve "her şeyi topla"nın bedava strateji olmaktan
çıkmasının sebebi. Bunlar hattın *üstünde* duruyor, yani kaçınmak bir zıplamaya
veya bir sapmaya mal oluyor.

| | Renk | Süre | Ne oluyor |
|---|---|---|---|
| **Ağırlaşma** | Kurşuni mor | 5 sn | Zıplama %22, hız %18 düşüyor |
| **Cilalı** | Yeşil | 4,2 sn | Bütün buz cilalı buz gibi davranıyor: duramıyorsun |
| **Sersemleme** | Yeşil | 3,2 sn | Sol sağ oluyor |
| **Körlük** | Yeşil | 4 sn | Görüş alanı kapanıyor |

Cilalı olan dördüncüsü ve tek farkı şu: diğer üçü *pengueni* değiştiriyor, bu
**zeminin ne olduğunu** değiştiriyor. Hızın, zıplaman, menzilin aynı kalıyor;
hiç düşünmediğin tek şeyi kaybediyorsun, durabilmeyi. Alçak tavanlı tünellerde
ve fokların üstünde bunun bedelini oyun sana ayrıca açıklamıyor.

## Tehlikeler

- **Buz sarkıtı**: altından geçince titrer, sonra düşer.
- **Fok**: buzda devriye gezer. Yanından değil, **üstünden** atla; üstüne
  basarsan seni yukarı fırlatır.
- **Orka**: boşluktan sıçrar. Önce yüzgeci suyu yarar, sonra kendisi çıkar.
  Suyun altındayken zararsız, havadayken ölümcül.
- **Fırtına**: dar bir sütun değil, geniş bir kuşak, ve dört vuruşluk bir
  soluk: önce sana karşı, sonra dinginlik, sonra arkandan, sonra yine
  dinginlik. Dördü de `windAt` içinde tek bir eğri, çünkü oyuncunun *gördüğü*
  rüzgârla *hissettiği* rüzgârın bir onda saniye ayrışması, ibre olmamasından
  daha kötü. Başının üstündeki ibre hangi vuruşta olduğunu ve bir sonraki
  kuyruk rüzgârının ne zaman geleceğini gösteriyor. Duran penguen
  sürüklenmiyor: rüzgâra karşı verilen cevap durup beklemek, bedeli de oyunun
  her yerde aldığı şey, zaman.
- **Yükselen hava**: sütun hâlinde çizilen ve yukarı taşıyan bir akım.
  Kasten sabit: fırtına zamanladığın şey, bu kullandığın şey ve havadayken
  gücü değişen bir alet alet değildir.
- **Serak** (yalnızca dağda): yukarıdan kopup gelen buz kütlesi. Sarkıttan farkı
  senin nerede olduğuna bakmaması. Duvarda duramaz ve yana çekilemezsin, o
  yüzden tek adil hâli öğrenilebilir bir saati olması: çatlak hep aynı uzunlukta
  ve hep aynı aralıkla geliyor. Sen şafta girene kadar da saat başlamıyor,
  yoksa ilk yaptığı şey daha kıpırdamamış birinin üstüne düşmek olurdu.

Rüzgâr uzun süre dekor kaldı çünkü **fizik onu siliyordu**. İtki doğrudan
`vx`'e ekleniyordu ve bir üst satırdaki yürüme kelepçesi her karede hızı yürüme
hızına geri çekiyordu: fırtına pengueni dört saniye itebiliyor ve iniş noktasını
sıfır piksel değiştiriyordu. Rüzgâr artık kendi kanalında (`player.drift`).
Kelepçe oyuncunun istediği hıza, sürüklenme de havanın verdiği hıza sahip ve
ikisi birbirini silemiyor. Sürtünme terimi kaçmayı engelliyor: sürüklenme
`itki / sürtünme` değerine yaklaşıp orada duruyor ve yerde havadakinin üç katı,
çünkü ayak tutar hava tutmaz.

Rüzgârın işi var, dekor değil. İki parça bunun üstüne kurulu:

- **`windGap`**: zıplamanın yetmediği, kuyruk rüzgârının rahatça yetiştirdiği
  bir boşluk. Doğrulayıcı dördünü birden kanıtlıyor: rüzgârsız gerçekten
  geçilmiyor, rüzgârla payı var, üstünü gerçekten bir fırtına örtüyor ve
  kuyruk rüzgârı sıçrayışın süresinden uzun. Beklenecek yer geniş ve sağlam.
- **`updraft`**: zıplamanın yetmediği yükseklikteki bir raf ve altında yükselen
  hava sütunu. Aynı kanıt yukarı doğru, artı bir sınır: akım yerçekiminin
  %60'ını geçemiyor, yoksa penguen uçmaya başlar.

Dördü de iki katmanlı: `validate-levels.mjs` aritmetiği, `wind-run.mjs` ise
**gerçek `Player` sınıfını** gerçek bölüm verisine karşı çalıştırıp iki şeyi
birden arıyor. Rüzgârla geçen bir tuş dizisi bulmalı ve rüzgârsız hiçbir dizi
bulamamalı. İkinci yarısı olmayan bir kanıt kanıt değil, çünkü fırtınanın
dekor olduğu durum tam da testin sessizce geçtiği durumdur. İlk koşuşunda
yakaladığı şey de buydu: boşluklar rüzgârsız da geçiliyordu, çünkü doğrulayıcı
boşluğu penguen *gövdesi* kadar kısa ölçüyordu.

---

## Sahte buz ve bayraktaki çöküş

İki tane bilerek "haksız hisseden" mekanik var. İkisi de aynı sözleşmeye tabi:
**ilk sefer şok, öğrendikten sonra kaçılabilir.**

**Sahte buz (`fake`).** Sağlam buzdan hiçbir farkı yok, ne kızıl damar, ne
renk, ne çatlak. Bastığında 0.46 saniye sonra gidiyor. Fitil, besteci
tarafından *koşarak geçilebilecek* genişliği garantiliyor: durup etrafına
bakan ölür, koşmaya devam eden geçer. Bilmemeyi değil, tereddüt etmeyi
cezalandırıyor. 23. bölümden itibaren.

**Bayraktaki çöküş.** Sala son 100–200 px kala yukarıdaki uçurumdan bir buzul
kopuyor. Oyunun en zalim şeyi ve bilerek öyle: bir bölümün son dört saniyesi
dikkatin düştüğü yerdir, seni orada da alabilen bir bölüm uykuda oynanmaz.

Coin-flip olmasını engelleyen üç şey: her yaklaşımda değil, yarısında
tetikleniyor; düşmeden önce buza gölge düşürüyor; ve **salın kendisine değil,
salın önündeki buza** iniyor, smashladığı şey hâlâ geçmen gereken zemin.
Varlığını bilen her seferinde geçer. Bilmeyen öğrenir. 8. bölümden itibaren,
kolay modda hem daha seyrek hem daha uzun uyarılı.

---

## Pusu mekanikleri: buzun tuzakları

Oyunun "sinir bozucu ama adil" olması gereken kısmı. İkisinin de tek bir kuralı
var: **oyuncu bir kez öğrendikten sonra bir daha aynı şekilde ölmemeli.**
(Bölümün planlamadığı üçüncü pusu için → [kutup kuşu](#pusu-kutup-kuşu).)

**Gayzer buzu.** Üstüne bastığın an buz tıslamaya, kabarcıklar büyümeye ve buz
titremeye başlar. Yarım saniye sonra su sütunu patlar ve pengueni havaya
fırlatır, genellikle denize. Yarım saniye, o hızda bir buçuk buz boyu demek:
tepki verirsen kurtulursun, oyalanırsan uçarsın. Bazı gayzerler ise sen
basmadan, kendi saatlerine göre patlar; onların ritmini saymak gerekir.

**Kaçan buz.** Alçakta duran, tam ihtiyacın olan yerde beliren küçük bir buz.
Üstüne inmeye başladığın anda, ayağın değmeden hemen önce, kayboluyor.
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

Bölümü tekrar oynamak yalnızca *yeni* ilerleme için ödeme yapar, ilk bölümü
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

Üçü penguenin **ne yapabildiğini** değiştiriyor, [Aktif ekipman](#aktif-ekipman):

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
bitmiştir, o andan sonra topladığın her balık değersizdir.

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
gelir ve geldiğinde para birimi ölür, bir daha balık toplamanın anlamı kalmaz.

Bu yüzden hiç bitmeyen tek bir şey var: **Buzul Anıtı**. Blok blok fonladığın
bir buz yığını; her blok bir öncekinden %35 pahalı, karşılığında sadece bir
rütbe ve daha yüksek bir anıt alıyorsun. Hiçbir işe yaramıyor, sonsuz
olabilmesinin ve oyunu bozmamasının sebebi tam olarak bu.

İlk 40 blok **233 milyon balık** eder. Pratikte bitmez; her zaman balığı
koyacak bir yer var.

Bu ölçüm ilk çalıştırıldığında Planör Kanat'ın **9 dakikada** alınabildiğini
gösterdi, oyunun en ilginç eşyası, oyuncu daha kuşla tanışmadan. Fiyatlar buna
göre yeniden yazıldı.

---

## Günün Teklifi

Her gün bir kozmetik, indirimli, 24 saatliğine. Tarihe göre seçiliyor, yani o
gün herkes aynı teklifi görüyor. Kartın üstünde geri sayım var.

Normalde **kazanılan** kozmetikler de teklife giriyor, teklifin asıl anlamı bu:
belki hiç sağlayamayacağın bir şartın kısayolu. Ama nadirliğe göre fiyatlanıyor,
yani kısayol hiçbir zaman ucuz değil (Yaygın 260, Nadir 620, Efsanevi 1400,
Mitik 2600 balık; indirim %25–40).

---

## Para modeli

**Oyunun tamamı ücretsiz ve öyle kalıyor:** dört chapter ve 76 bölüm, sonsuz
mod, Günün Bölümü, görevler, hayalet yarışı, lig, koleksiyonun tamamı. Satılan
tek şey kısayol.

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
> bilerek kapalı, yalan söyleyen bir düğme göstermek yerine dürüst bir cümle
> döndürüyor.
>
> Arka uç geldiğinde bu fonksiyon şuna dönüşür: SKU'yu POST et, imzalı makbuzu
> al, sunucuda doğrula, eşyayı sunucu versin. Oyunda başka hiçbir şey
> değişmiyor, kozmetikler zaten tek bir fonksiyondan veriliyor.

### Reklamlar

Ödüllü reklam (`CONTINUE`, `DOUBLE FISH`, `LUCKY START`) doğru fikir: banner
değil, oyuncunun kendi seçtiği reklam. Ama bir reklam SDK'sı (AdMob, IronSource)
gerçek bir uygulama kimliği ve ağ bağlantısı ister, bu yüzden **henüz
bağlanmadı**. Bağlandığında mekanikler hazır olacak şekilde tasarlandı:
ödül kaynağı tek bir adaptör.

### İnternet gerekiyor mu

**Bugün: hayır.** Oyun bir kere yüklendikten sonra tamamen çevrimdışı çalışıyor
bölümler, kayıt, hayalet, lig, görevler, gardırop, hepsi cihazda.

**Gerçek para ve ödüllü reklam devreye girdiğinde: evet**, ama sadece o iki iş
için. Doğru mimari şu: oyun çevrimdışı oynanabilir kalır, ağ sadece iki noktada
gerekir, ödeme doğrulaması (`canPurchase`) ve reklam gösterimi. Ağ yoksa o iki
düğme kapanır, oyunun geri kalanı hiç etkilenmez. İkisi de bilerek tek
fonksiyonun arkasına toplandı ki bağlantı kontrolü tek yerde yaşasın.

---

## Geri gelme sebepleri

Oyunun kendisi bir sebep, ama tek sebep olmamalı. Beş katman:

- **Günün Pengu'su**: tarihe göre tohumlanır, o gün herkes aynı bölümü oynar.
  Dört hedefi var ve **gün boyunca birikirler**: hızlı bitir, balıkları topla,
  ölmeden geç, çürük balığa dokunma. Tek turda hepsini yapmak gerekmez, beşinci
  denemeyi başlatmaya değer kılan da bu.
- **Seri**: arka arkaya gün oynadıkça büyür, bir gün atlayınca sıfırlanır.
  Yedi günlük seri Altın Penguen'i açar.
- **Günlük görevler**: 21 görevlik havuzdan tarihe göre çekilen üç görev: bir
  kolay, bir orta, bir zor. Üç kolay görev hedefsiz bir gün demek; üç zor görev
  insanların atladığı gün demek. Aynı olayı izleyen iki görev seçilmez.
  Almadığın ekipmanı isteyen görevler listeye hiç girmez.
- **Haftalık lig**: puanlar pazartesi sıfırlanır, çıktığın kademe kalır. Pazar
  gecesi son bir hamle yapmaya değer olmasının sebebi bu.
- **Koleksiyon**: 20 penguen ve 10 iz, çoğu kazanılıyor. "Bir bölüm daha
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
değiştiriyor, hem de aynı zıplama tuşuyla:

- **Planör Kanat**: havada zıplamayı **basılı tut**: kanatlar açılır, düşüş
  yavaşlar, biraz da ileri süzülürsün.
- **Sırt Motoru**: havada zıplamaya **bas**: motor bir kez yukarı ateşler.
- **Kuş Radarı**: kuş dalışa geçmeden önce sana daha uzun uyarı verir.

Basmak ile basılı tutmak arasındaki fark, ikisinin de tek tuşa sığmasının
sebebi: dokunmatikte üçüncü bir düğme yok ve olmamalı.

İkisi de yalnızca **yere değince** doluyor. Yani bunlar uçmak değil: zaten
verdiğin bir zıplama kararını havada tartışma hakkı. HUD'daki çubuk kararın
kendisi, bu boşluk için mi harcayacaksın, sonraki için mi sakla?

Bütün bölümler **hiçbir ekipmanı olmayan** bir penguene göre doğrulanıyor, yani
ekipman bir parkuru asla açamaz, sadece kolaylaştırır.

## Pusu: kutup kuşu

Bir skua, gerçekten yavru penguen kapan iri bir kutup martısı. Bölümün parçası
değil, **yönetmen olayı**: bölümün seçmediği bir anda geliyor. Ezberlediğin bir
parkurun dokuzuncu turda hâlâ seni korkutabilmesinin tek yolu bu.

Buzun üstünde bir gölge beliriyor ve **yaklaştıkça daha hızlı atıyor**. Bu
kasıtlı. Uyarısız anlık ölüm yazı-turadır ve insanlar oyunu bırakır; *başka bir
şeyle uğraşırken fark etmen gereken* bir uyarı ise "bir daha deneyeyim"
dedirtir. Pencere gerçekten dar.

Adaleti koruyan kurallar:
- vuruş noktası gölge çıktığı an kilitleniyor, kaçmak işe yarıyor;
- doğuştan/checkpoint'ten sonra `grace` süresi boyunca asla gelmiyor;
- iki dalış arasında bekleme süresi var;
- kapılırsan bölümü değil, kontrol noktasını kaybediyorsun;
- kolay modda sıklığı yarıya iniyor, uyarı uzuyor, kapatılmıyor.

### Kuş avlanmayı öğrendi

Tek dalış, tek sabit nokta, tek kaçış: bu yürüyerek kazanılan bir yazı-turadır.
Artık üç ayrı geliş var, ve hangisinin geldiği kararını vermeden önce okunabiliyor:

| | Ne yapıyor | Cevabı |
|---|---|---|
| **Kilitli** | Gölge çıkınca nişan kilitleniyor | Kımılda, ıskalar |
| **Şaşırtma** | Dalıyor, son anda vazgeçiyor, dönüp öbür taraftan tekrar geliyor | Iskaladı diye rahatlama |
| **Avcı** | Boyunca nişan alıyor, kaçış yok | Boğuşma |

**Avcı kaçınılmaz ve bu bilerek öyle.** Cevabı yana adım değil, boğuşma — bu
yüzden uyarısı daha uzun ve gölgesi kehribar rengi, kuşun kendisi de kahverengi.
Kaçamayacağın bir şeyin *geldiğini görebildiğin* bir şey olması gerekiyor.

**24. bölümden sonra ikili geliyorlar**, ikincisi bir vuruş sonra **ters taraftan**
— çünkü tek kuşun cevabı kaçmak, ve kaçmanın bir yönü var. Asla iki avcı birden:
o bir soru değil, infaz. Ve asla ikisi birden taşımıyor.

Saldırı sıklığı iki katına çıktı, bekleme süresi 6,5 saniyeden 3,8'e indi.
Karışım bölüme göre değişiyor: 12'de her zaman sade dalış, sahanlığın sonunda
dörtte biri avcı.

### Kapılmak son değil

Eskiden kuş seni kapardı ve iş biterdi: bir saniye havada taşınma, sonra ölüm,
ve arada yapabileceğin hiçbir şey yok. Cevap veremediğin bir pusu, üstüne uzun
bir animasyon giydirilmiş yazı-turadır.

Artık **boğuşma**. Kuş seni bölümden çıkarana kadar 2,1 saniyen var ve tek
yapman gereken her zaman yapabildiğin şey: düğmeye basmak. Beş iyi basış seni
kurtarıyor. Basışlar arasında kavrama geri sıkıştığı için beşi *hızlı* olmak
zorunda; yavaş tıklamak sönümlemeyle yarışır ve asla yetişmez. Kuşun etrafında
kapanan halka ne kadar yaklaştığını söylüyor.

Kurtulmak güvende olmak değil. Kuşun kendi momentumuyla, yana ve yukarı
savrularak çıkıyorsun, o an altında ne varsa onun üstüne, ki bu çoğu zaman
deniz. Seni en yakın buza nazikçe bırakan bir kurtuluş, bütün olayı fazladan
adımı olan bir formaliteye çevirirdi.

12. bölümden önce hiç görünmüyor: oyuncu önce oyunu öğrenmeli.

## Koleksiyon

Penguen her karede sıfırdan çiziliyor, yani bir "skin" görsel dosyası değil
bir palet artı küçük bir aksesuar çizeri. Bu yüzden her penguen birkaç yüz bayt,
her büyüme ölçeğinde çalışıyor ve gövdenin ezilip uzamasına kendiliğinden uyuyor.

**İki slot var** ve mesele bu: **24 penguen × 10 iz = 240 kombin**. Bir gardırobu
liste olmaktan çıkarıp gardırop yapan şey, ikisinin birden *senin seçimin*
olması.

### Penguenler

Nadirlik bir güç seviyesi değil, her şey kozmetik ve öyle kalacak. Nadirlik
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

Yirmi penguen kozmetik. Dördü değil ve fark **kasten** dördüyle sınırlı, çünkü
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
   göre hesaplıyor, yani elmas penguen hiçbir bölümü açmıyor, sadece açık olanı
   biraz rahatlatıyor.
2. **Yetenek sahip olduğun şeyi iyileştiriyor.** Albatros'un +0.7 saniyesi
   `glideMax`'e ekleniyor, ama `glideMax` kanat yoksa zaten 0, yani Albatros'u
   giyip Planör Kanat'ı almadıysan hiçbir şey kazanmıyorsun. Test bunu ayrıca
   doğruluyor.
3. **Fiyatlar ekonominin en üstünde.** En ucuz elmas, marketin tamamından pahalı.
   Simülatöre göre ortalama oyuncu ilk elması ~10. saatte görüyor.

Yetenekler `world.js`'te market yükseltmeleriyle *toplanıyor*, çarpılmıyor:
kayma azaltma 0.92'de tavanlanıyor ki hiçbir kombinasyon buzu asfalta çevirmesin.

### İzler

Ayrı bir slot: penguenin arkasında ne bıraktığı. Oyuncunun son konumlarından
çiziliyor, yani bir izin maliyeti on sekiz nesnelik bir halka tampon, o kadar.

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
parkurun üstünde bir hedef listesi var, hızlı bitir, balıkları topla, ölmeden
geç, çürük balığa dokunma ve hedefler **gün boyunca birikiyor**, tek turda
hepsini yapmak gerekmiyor. Beşinci denemeyi başlatmaya değer kılan da bu.

Hedefler tarihten seçiliyor, yani aynı gün herkeste aynı liste çıkıyor.

## Hayalet yarışı ve sıralama

Sunucusuz bir oyunda gerçek bir küresel liderlik tablosu olamaz, o bir arka uç
ister. Ama *yarışmak* istemez.

Her deneme kaydediliyor: penguenin konumu saniyede 20 kez örnekleniyor. Bir
bölümü bitirdiğinde en iyi koşun saklanıyor ve bir dahaki oynayışında yanında
saydam bir penguen olarak koşuyor. HUD'daki `−0.42` / `+1.08` o an bulunduğun
noktada rekordan ne kadar önde ya da geride olduğunu gösteriyor.

Koşular taşınabiliyor. Bir koşu kısa bir koda dönüşüyor, her örnek bir öncekinden
farkı kadar, çoğu fark tek bayta sığıyor, başlıkta bölüm, süre ve koşan kişinin adı
var. 30 saniyelik bir koşu ~370 karakter: mesajla gönderilecek kadar kısa. Gelen
kodu **Sıralama** ekranına yapıştırınca o kişi tabloya giriyor ve hayaleti buzun
üstünde beliriyor.

Sıralama gerçek bir sıralama; sadece sunucu yerine paylaşım koduyla dolaşıyor.

## Zirve, tırmanış

Otuz bir bölüm boyunca oyun tek bir soru sordu: **oraya yetişir miyim?** Yeni buz
türü eklemek o soruyu değiştirmiyor, sadece süslüyor. 32. bölümde soru değişiyor:
**ne kadar tutunabilirim?**

### Fiil

Penguen buz duvarına gömülüp asılı kalabiliyor. Asılmak bir bar tüketiyor ve bar
**sadece sağlam zeminde** doluyor. Üç hareket, sıfır yeni tuş:

| | |
|---|---|
| Duvara doğru bas | Tutun, yavaşça kayarsın, bar azar azar iner |
| Tutunurken BOŞLUK'u **basılı tut** | Tırman, 96 px/sn yukarı, bar iki katından hızlı iner |
| Tutunurken BOŞLUK'a **dokun** | Tekmele, duvardan itip karşıya fırla |
| Tepeye varınca | Kendiliğinden kenardan yukarı çekiliyorsun |

Ve asıl karar burada: **tekme sürünmekten çok daha verimli.** Bir bar 4,4 saniye;
sürünerek 338 piksel çıkarsın, tekmeleyerek 690. Ama tekme karşı duvarı
tutturmayı gerektiriyor, ıskalarsan bacanın dibine kadar düşersin. Güvenli olan
yavaş, hızlı olan riskli. Bir tırmanışın olması gereken şey tam olarak bu.

### Baca

İki karşılıklı duvar ve aralarında basacak hiçbir şey yok. Zıplayarak geçilmiyor;
tek yol tutunmak ve tutunma tükeniyor. Uzun bacalarda **duvarın kendisi
kırılıyor**: sütun bir yerde bitiyor, başı sağlam zemin oluyor ve bir boy hava
sonra buz yeniden başlıyor. Barı orada doldurup ikinci nefese başlıyorsun, ve
o rafa çıkma hareketi, bacadan çıkma hareketinin aynısı.

Tepede baca öylece bitiyor: **duvarın başı sağlam zemin**, üstüne çekilip
çıkıyorsun. Bu, ilk denediğim tasarım değildi, şaftın içine asılı bir saçak
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
ve orada yeterince doğru; dağda değil, bu yüzden ikisi birlikte hesaplanıyor.

### Yayına giren ve girmeyen

`climb.js` içinde on beş tırmanış planı var ve **on beşi de** hem geometri
doğrulayıcısını hem de fizik çözücüsünü geçiyor: **32–46**. Kural değişmedi
*kimsenin çıkabildiğini kanıtlayamadığım bir bölümü oyuna koymam*. Geçemeyen bir
plan dosyada `ship: false` ile durur, oyuna girmez ve `node tests/climb-run.mjs
--all` onu yine de dener: hatasını raporlar, derlemeyi düşürmez. Şu an o listede
kimse yok.

Bu sayı ölçümle büyüdü, tahminle değil: beşten ona, ondan on beşe. Ve her
sıçramayı getiren şey yeni bir bölüm yazmak değil, **çözücünün gösterdiği bir
tasarım hatasını düzeltmek** oldu.

Son turda üç taneydi:

1. **Baca, penguenin durduğu buzun üstünde değildi.** Besteci şaftı imlecin o
   anki yerine sabitliyor, sonra ağzı fazla yüksekse yukarı doğru basamak
   ekliyordu ve o basamaklar imleci kaydırıyordu. Sonuçta oyuncunun kalktığı
   buz, bacanın *yanında* kalıyordu, bazen iki yüz piksel yanında. Altında
   durmadığın bacaya giremezsin. Artık şaft ile kalkış buzu birlikte
   kararlaştırılıyor, her basamakta yeniden.

2. **Mola rafları tırmanılan yüzü kapatıyordu.** Duvara yapıştırılmış bir raf
   çizimde iyi durur; oyunda tırmanışın karşılaştığı ilk şey rafın *altı*
   olur. Ölçüm nettir: raflı her baca tam rafın hizasında ölüyordu, dört ayrı
   bölümde, yirmi piksel içinde. Artık **duvarın kendisi kırılıyor**: sütunun
   alt parçası rafta bitiyor, penguen oraya bacadan çıktığı gibi çıkıyor
   (tutun, kendini çek, doğrul, nefeslen), üstünde bir boy hava var ve buz
   yeniden başlıyor. Aynı fiil, bacada üç kez, öğrenilecek yeni bir şey yok.

3. **Çözücü, tepeye çıkacağı duvarı tekmeleyip bırakıyordu.** Çıkışın olduğu
   sütuna tutunmuş, hedefi görüyor ve tekmeleyip karşıya atlıyordu. Şaftın
   iki yüz piksel üstüne kadar zıplayıp "bu baca çıkılmaz" diyordu, oysa
   çıkıştaydı ve elini bırakmıştı.

Bu, bir eksiği saklamak yerine ölçmenin sonucu. Kolay olanı yapıp on beşini de
körlemesine göndermek, oyuncuyu geçilemeyen bir duvara çarptırmak olurdu; onun
yerine duvarın kendisi düzeldi.

---

## Buz Altı, dalış

Sahanlık "oraya yetişir miyim?" diye sordu. Dağ "ne kadar tutunabilirim?" diye
sordu. 47. bölümde soru üçüncü kez değişiyor: **nefesim ne kadar yeter?**

### Tersine çevirme

Bu bölüm oyunun tek gerçek tersine çevirmesi. Buzun üstünde penguen bir
komedyendir, kısa bacaklı, tutunamayan, her hareketi zahmetli. Suda yüz mil
çevrenin en hızlı şeyidir. Bu yüzden Buz Altı zorluğunu penguene **daha çok iş
yaptırarak** kurmuyor; tam tersine, otuz bölümdür kısıtladığı şeyi serbest
bırakıyor: suda yürüme hızının bir buçuk katıyla gidiyorsun, durmak yok, sürtünme
yok, su seni taşıyor. Karşılığında elinden alınan tek şey hava.

### Fiil

| | |
|---|---|
| Hiçbir şeye basma | **Yüksel.** Penguen yüzer; yukarı bedava ve sürekli |
| BOŞLUK'u basılı tut | **Dal.** Aşağı emek ister, o yüzden basılı olan bu |
| ← → | Sağa sola, daha hızlı ve bıraktığında bir saniye daha sürüyor |
| Buzdaki delik | Kafanı çıkar, nefes al |

Yeni tuş yok, yeni kural yok. Buton artık *derinlik*. Ve ilk saniyede kendini
öğretiyor: giriş deliğinden çıkmanın tek yolu dalmak, çünkü buz bir tavan ve
delik o tavandaki tek boşluk.

### Nefes

Bir ciğer 9,5–9,8 saniye, büyüyen penguenin ciğeri de büyüyor ve bu, oyunda
irileşmenin katıksız iyi haber olduğu tek yer. Sayaç sen hareket etmesen de
işliyor: **dağ acele etmeni cezalandırıyordu, deniz oyalanmanı cezalandırıyor.**
Doldurmanın tek yolu buzdaki bir delikten kafanı çıkarmak.

Delikler geniş, kasten. İlk hallerinde bir kapı genişliğindeydiler ve seyir
hızında içlerinden 0,38 saniyede geçiliyordu: bu bir nefes değil, bir yudum.
Çözücü dört bölümü, çıkış görünürken, ciğeri sıfırlanmış halde kaybetti. Artık
bir delik yavaşlayıp kafanı çıkaracak kadar uzun.

### Koridorun kuralı

Tavan ile deniz tabanı arasındaki boşluk her parçada aynı yükseklikte başlıyor
ve bitiyor; bir geçit koridoru **daraltabilir, asla taşamaz**. Bu bir estetik
tercih değil: taşan bir geçit, bir sonraki parçanın başladığı yerde tabanda bir
basamak bırakıyor ve tabandaki bir basamak duvardır. Penguen geçidin içinden
kusursuz bir çizgi çizip ekin dibinde duruyordu. Çözücü bunu buldu.

### Bunun matematiği de tahmin değil

`swimReach(ölçek, dy)` mesafeyi ve derinliği tek bütçede birleştiriyor
dağdaki `reachAt`'in denizdeki karşılığı. Yükselmek yavaş ve bedava, dalmak
hızlı ve emekli, yani **iki yön gerçekten farklı geometri**: yukarıdan kolay
girilen bir geçide aşağıdan girmek çoğu zaman imkânsız. `breathRange` de ciğeri
piksele çeviriyor ve besteci bir ciğerin taşıyamayacağı iki delik arasını
**kurmayı reddediyor**: dahası, gerektiğinde buzda kendi deliğini açıyor. Bir
planın hatırlamak zorunda olduğu söz, tutulmayan sözdür.

---

## Kar Topu, hizalama

Üç bölüm boyunca oyun penguene bir fiil verdi: zıpla, tutun, dal. Dördüncüsü
hepsini geri alıyor ve yerine bir **konum** veriyor.

### Elinde hiçbir şey yok

Atma tuşu yok. Kar topu toplamak yok. Yeni tuş yok, bu bölümde penguenin
yapabildiği tek şey bir yerde durmak. Ama:

- Rakipler **nişan aldıkları anda durduğun yere** atıyor, sonrasına bakmıyor.
- Bir kar topu **değdiği ilk şeyde** duruyor: bir penguen, sen ya da buz.

Bu iki cümleden çıkan tek fikir bütün bölüm: **birinin arkasına geç.** Yolu
kapatan pengueni atıcıyla arana koy, at sinyalini bekle, sonra o hattan çekil.
Kırmızı atkılı olanlar kapıyı tutuyor, hepsi düşmeden sal açılmıyor. Mavi
atkılılar sadece sana atıyor; onları devirmek zorunda değilsin, ama sana
duracak yeri onlar dar ediyor.

### Nişan neden kilitleniyor

Çünkü kilitlenmezse baştan aşağı farklı bir oyun oluyor. Seni takip eden bir
nişanla yapabileceğin tek şey kaçmak; **kilitli** bir nişanla yapabileceğin şey
*hattı seçmek*. Wind-up 0,62 saniye sürüyor ve o süre boyunca hat buzun üstüne
noktalı çiziliyor, hem de hedefinin çok ötesine kadar, çünkü oyuncunun
düzenlediği şey topun **içinden geçtiği** şey.

### Neden düz atıyorlar

Bir parabolü gözle hizalayamazsın. Bu bölümün tamamı hizalamaksa ve oyuncu
hattı göremiyorsa ortada bulmaca değil şans vardır. O yüzden atış sert ve düz.

### Buz sivrileri

Rakipler raf üstünde değil, ince buz sivrilerinin tepesinde duruyor ve bu bir
görsel tercih değil, geometrinin dayattığı şey. Kar topu değdiği ilk buzda
durduğu için, geniş bir rafın üstündeki birinin içinden geçen hat birkaç piksel
sonra o rafa çarpıyor: oyuncunun kusursuz hizaladığı atış yerde patlıyor. Raf ne
kadar dar olursa hat o kadar dik olabilir. `SLOPE_MAX` bu yüzden seçilmiş değil,
**türetilmiş**: kar topunun yarıçapı, penguenin boyu ve sivrinin genişliği.

### Besteci çözümü kurarak yapıyor

`Arena` bir arena kurup "umarım vardır" demiyor. Her düello **cevabından geriye
doğru** kuruluyor: oyuncunun duracağı yeri seç, kapıdakini yerleştir, ikisinden
geçen hattı çiz, atıcıyı o hattın üstüne koy. Sonra sıra önemli, kapıcılar ve
manzara önce, atıcılar tek tek en son ve her yeni atıcı daha önce çizilmiş
bütün hatları yeniden kontrol ediyor. Çünkü ikinci düellonun sivrisi birincinin
atış hattına düşüyor: bakması hoş, oynaması bozuk.

Kayalar da bu yüzden **yukarıdan sarkıyor**, yerden yükselmiyor. Zemin bu
bölümde her şeyin oynandığı yer, bütün duracak noktalar orada ve zeminden
çıkan bir sütun cevabın iki parçası arasına duvar koyuyor. Tavandan sarkınca
getirildiği işi yapıyor: hatları yiyor, altından yürüyüp geçiyorsun.

---

## Arayüz

Oyunun kendisi kadar üstünde durulan ikinci şey. Her ekran üç boyutta (telefon dik 390×844, telefon
yatık 844×390, masaüstü 1280×800) ekran görüntüsü alınıp *bakılarak* gözden
geçirildi ve bulunanların çoğu okuyarak fark edilmeyecek türdendi.

### Bulunan ve düzeltilenler

| Neydi | Ne oldu |
|---|---|
| Ana ekranda tanıtım yazısı telefonun iki kenarından da taşıyordu | Bir flex öğesi içeriğinin altına inemiyordu, `min-width: 0` |
| Bölüm listesinin üçüncü sütunu ekranın 20px dışındaydı | Aynı sebep, iki eleman ötedeki bir başlıktan |
| Market ve koleksiyonda bir satırdaki düğmeler üç farklı hizadaydı | Kartlar metne göre boyutlanıyordu; artık aksiyon alta sabit |
| Rozetler düğmenin dışında, kırpılıyordu | İçeri alındı |
| Menüde altı düğme üç-iki-bir şeklinde dağınık sarıyordu | Eşit hücreli ızgara |
| Satır içi bağlantılar parmakla tutulamayacak kadar küçüktü | Görünmez `::after` ile dokunma alanı büyütüldü |
| Aynı adı yazan üç ayrı alan vardı | Tek kaynak: Kimlik ekranı; sıralama oraya yönlendiriyor |
| Sıralamanın boş hâli bir cümle ve bomboş bir sayfaydı | Simge, tek satır ve çıkış yolu olan bir düğme |
| Bir koşu dışında kazanılan penguen "Kilitli" görünüyordu | Koleksiyon açılırken hak edilenler teslim ediliyor |
| Yatay telefonda alttaki kumanda ekranın %29'unu kaplıyordu | Boyut sahnenin yüksekliğinden geliyor; %29 → %17 → (fazla küçüktü) %21 |
| Dalış chapter'ının on dört bölümü pengu'yu bölüm rozetinin altında başlatıyordu | Kamera artık arayüzün durduğu şeritleri biliyor |
| Arenanın sayacı "2 kaldı" ekranın kenarında kesiliyordu | Görüntünün içine kaydırılıyor |
| Aynı sayaç her dilde Türkçe yazıyordu | Sözlüğe alındı, `lint` tuvale yazılan metni artık yakalıyor |
| Ses açılışı yarım kalabiliyordu: bağlam kuruluyor, kazanç düğümü kurulamıyor | Kenarda kuruluyor, ancak bütünken yayınlanıyor. Sessizlik iyi bir sonuç, her zıplamada hata atan bir oyun değil |
| Telefonda gelen bir çağrı zıplama tuşunu basılı bırakabiliyordu | `visibilitychange` de her şeyi bırakıyor; `blur` telefonda hep gelmiyor |
| Bölüm sonu kartı hiçbir ekrana sığmıyordu, "Sıradaki bölüm" katlanma çizgisinin altındaydı | Genişlik varsa üç sütun, yoksa sıkıştırma; testi de var |
| Duraklatma, karşılama, ad sorma, yardım ve bölüm sonu ekranları hiç ölçülmemişti | Beşi de düzen testine girdi |

### Telefonu yan çevirince

Bunu bir ekran görüntüsü buldu, çünkü elimdeki hiçbir sayı göstermiyordu.

Görüntü şöyle kuruluyordu: yükseklik 540 birime sabit, genişlik ekranın oranına
göre. 16:9'a kadar doğru, ondan sonrası sessizce yanlış. Yan çevrilmiş bir
telefon 2,16:1 — yani fazladan gelen her piksel **genişliğe** gidiyordu, ve bir
tırmanış bölümü zaten ekrandan dar. O genişlik iki yana boş gökyüzü olarak
dağılırken, zıplayacağın buz ekranın üst kenarının yukarısında kalıyordu.

Sayılar bunu gizliyordu, hatta tersini söylüyordu: yatay tutulmuş telefon
masaüstünden **daha geniş** bir görüntü bildiriyordu (1169'a karşı 960). Daha
çok gören bir ekran gibi okunuyor. Aynı telefonda aynı bölüm: dik tutunca altı
buz, yan tutunca iki.

Artık 16:9'un ötesindeki genişlik yüksekliği de satın alıyor — dünyanın üçte
bir kadar fazlası, ki bu kabaca **penguenin telefonu çevirdiğinde aynı boyutta
kaldığı** nokta. Oyuncunun gerçekten hissettiği özellik bir en ya da boy değil,
tam olarak bu.

| Ekran | Önce | Sonra |
|---|---|---|
| iPhone 14 yatay 844×390 | 1169×540 | **1423×657** |
| Pixel 7 yatay 892×412 | 1169×540 | **1424×658** |
| Masaüstü 16:9 | 960×540 | 960×540 *(değişmedi)* |
| Telefon dik 390×844 | 600×900 | **600×1298** |

Sondaki satır ikinci bir hata: dik tutulan telefonda çizilen 1298 birimdi ama
görüntü kendini 900 diye bildiriyordu, çünkü genişlik tabanına çarpınca kutu
ekranın şeklinde olmaktan çıkıyordu. Kamera da o yanlış sayıya yaslanıyordu, ve
her dik bölümde altta dört yüz birim boş suya kadar kayıyordu. Tuval zaten
kenardan kenara çiziliyor; artık görüntü de gerçekten çizdiği kadarını söylüyor.

Karar `viewFor` içinde, tek bir saf fonksiyonda (`src/game/config.js`), ve
`tests/viewport.mjs` on ekran şeklinde tarayıcı açmadan kontrol ediyor: oran
esnemiyor, tasarlanan 16:9 hiç değişmiyor, çevirince ölçek sapması %15'in
altında, geniş ekran en az %20 fazlasını görüyor, ve ölçülemeyen bir sahne
görüntüyü bozmuyor.

### Bölüm sonu kartı hiçbir ekrana sığmıyormuş

Bunu, yatay modu düzeltirken *ölçtüğüm için* buldum. Kart 950 piksel: başlık,
yıldızlar, dört sonuç, bir ödeme kutusu (toplam **ve** döküm **ve** ikiye
katlama teklifi **ve** markete giden yol), lig kutusu, ipucu ve alt alta üç
düğme. Hiçbir cihazda o kadar yükseklik yok:

| Ekran | Sahne yüksekliği | Kart |
|---|---|---|
| Telefon yatay | 390 | 950 |
| Telefon dik | 844 | 950 |
| Masaüstü (sahne 16:9 bir kart) | 693 | 950 |

Yani **her cihazda**, her bölüm bittiğinde, "Sıradaki bölüm"e ulaşmak için
kaydırmak gerekiyordu. Oyunun en sık görülen ekranı bu.

Çözüm genişlik, nerede varsa: sahne 44rem'i geçtiğinde üç blok yan yana
duruyor ve kart 351 piksele iniyor. Dik tutulan telefonun takas edecek
genişliği yok, orada da düğmeler tek sıraya geçiyor ve sayılar sıkışıyor —
797 piksel, sığıyor.

`browser-layout` artık kartlarda ana düğmenin ekranın içinde olmasını şart
koşuyor. Listelerde (market, bölüm listesi) kaydırma tasarımın kendisi, orada
şart koşmuyor: kartta kaydırmak zorunda kalmak, kartın sığmaması demek.

### Market: dokuz düz dikdörtgenden bir vitrine

Marketteki her şey doğruydu ve hiçbiri bakmaya değmiyordu — ki oyuncunun
*açmak isteyeceği* ekran için tuhaf bir durum. Yeniden kurgu daha çok renk
değil; **durum, derinlik ve tek bir vurgu**:

- Her kart bir cam levha: üstünden geçen bir parlaklık, üst kenarında bir
  kıl payı ışık, altında bir gölge. Sayfaya *basılmış* olmak yerine sayfanın
  üstünde duruyor.
- Üç durum üç ayrı şeye benziyor. **Alınabilir**: kenarı yanıyor, arkasında
  vurgu rengi bir hâle var, ekranın öbür ucundan ilk o okunuyor. **Uzak**:
  soğumuş, ve üstünde ne kadar yaklaştığını gösteren bir çubuk taşıyor.
  **Bitmiş**: nane yeşili ve mühürlü.
- Seviyeler üç nokta değil bir ray: kazanılan bölmeler yanıyor, bir sonraki
  nefes alıyor — karttaki tek animasyon, ve karttaki tek düğmeyi işaret ediyor.
- Grup başlıkları bir sayı yerine bir ölçü taşıyor. "3/8" okunacak bir gerçek;
  üçte biri dolu bir çubuk, doldurduğun bir raf.
- Cüzdan artık altın bir nesne: üstten ışıklı, altta gömük, kenarının içinde
  bir halka. Oyunda oyuncunun yükselişini izlediği tek sayı bu.

Altın yalnızca paraya, nane yalnızca "tamam"a ayrılmış durumda. Dokuz kartlı
bir ekranın kumar makinesine dönüşmesini engelleyen tek şey bu.

"240 balık daha" ise kafanda tutup gidip fiyata bakman gereken bir sayıydı;
neredeyse dolmuş bir çubuk bir **his**, ve bu ekrana insanı geri getiren şey o
his. Bu arada `buildShop()` artık cüzdanı da tazeliyor: kartlar keseyi
okuyorken köşedeki jetonun başka bir yerde doldurulması, ikisinin aynı ekranda
farklı sayı göstermesinden bir tazeleme uzaktı.

### Market

Dokuz kart, hepsi tam genişlikte parlak bir "Al" düğmesiyle: hepsi aynı sesle
bağırınca hiçbiri konuşmuyor ve telefonda tek bir yükseltme bir buçuk ekran
kaplıyordu. Şimdi:

- **Üç başlık**: Hareket (bot, hızlı ayak, krampon), Dayanma (kalın tüy,
  mıknatıs, rüzgâr yeleği, kuş radarı), Ekipman (planör kanat, sırt motoru).
  Dokuz kartlık düz bir ızgara bir duvar; üç başlık onu bir listeye çeviriyor.
- **Fiyat bir çip**, slab değil. Kart kahraman, fiyat sessiz bir teklif.
- **Yetmiyorsa kartın üstünde yazıyor**: "820 balık daha". Basınca öğrenilen
  bir şey değil, "az kaldı" ile "çok uzak" farklı duygular ve oyuncunun
  doğrusunu hissetmeye hakkı var.
- **Telefonda kart bir satır**: simge, ne olduğu, ne tuttuğu. Ekranda bir buçuk
  yerine dört tane.
- **`2/3` yazıyor**, üç nokta değil. Sayı okunur, nokta deseni sayılır.

### Markete erişim

Bir dükkâna giden tek bir kapı yeterli değil. Üç tane var:

1. Ana ekrandaki **Market** düğmesi, kaç şey alabileceğini rozetle söylüyor
2. **Cüzdana dokunmak**: parana dokunmak paranın gittiği yere götürüyor;
   insanların ilk denediği hareket buydu ve hiçbir şey yapmıyordu
3. **Bölüm sonu ekranı**: balığı yeni kazandığın ve rakamı gördüğün an,
   *ve yalnızca gerçekten bir şey alabiliyorsan*

### Bölüm listesi

En fazla 88 kart: 76 elle yazılmış bölüm, artı açtığın kadar sonsuz bölüm
(en çok 12 tanesi gösteriliyor, sonsuz bir listenin sonu olmaz). Gezilebilir
olmasını sağlayan üç şey: en üstte **chapter çipleri** (dağa ya da denize tek
dokunuşla), kaydırırken **tepede yapışık kalan başlıklar** (51. bölümdeyken
hangi chapter'da olduğunu bilmek), ve
oynayacağın tek bölümün üstünde **"Sıradaki"**. Sonuncusu olmadan liste "ne
yaptım"ı cevaplıyor, "nerede kalmıştım"ı hiç.

Süreler de değişti: koşarkenki kronometre sabit genişlikte kalıyor (`00:21.40`
rakamlar oynarken zıplamasın), ama bir *rekor* listesinde baştaki `00:`
her satırda iki karakter gürültü. Rekorlar artık `21.40 sn`.

### Bunu koruyan test

`tests/browser-layout.mjs` dokuz ekranı (ana ekran, bölümler, market,
koleksiyon, sıralama, nasıl oynanır, ayarlar, kimlik, yasal) üç boyutta açıp
bir tasarımcının gözle bakacağı şeyleri ölçüyor: viewport dışına taşan bir şey
var mı (yatay kaydırma alanının içindekiler hariç, orada taşmak işin kendisi),
bir satırdaki kart düğmeleri aynı hizada mı ve parmakla tutulamayacak kadar
küçük düğme var mı. Yukarıdaki tablodaki dokuz hatanın hepsi bu testin
yakaladığı türden.

---

## Kimlik

Oyun ilk açıldığında sorduğu tek şey: **sana ne diyelim?** Ad, unvan, penguen
kimliği ve o günden beri geçen zaman bir kimlik kartında toplanıyor; kart ana
ekranda, giydiğin penguenin portresiyle duruyor.

Bunun bir hesap olmadığını söylemek önemli, çünkü oyun bir "kullanıcı"
yaratıyor ve oyuncunun bunu doğru anlaması gerekiyor:

- Ad **yalnızca bu cihazda** saklanıyor. Sunucu yok, giriş yok, doğrulama yok.
- Kimlik (`PNG-XXXXX`) bir etiket, sır değil: aynı adı taşıyan iki oyuncu
  sıralamada birbirine karışmasın diye var. Bir kere üretiliyor ve bir daha
  değişmiyor, düzeltilebilen bir etiket etiket değildir.
- Ad, ancak **sen bir hayalet kodu paylaşırsan** cihazdan çıkar. Kodun içinde
  ne olduğu [gizlilik metninde](docs/GIZLILIK.md) tek tek yazıyor.

**Unvanlar** bölüm bitirerek kazanılıyor, biriktirerek değil: *Yeni Yumurta*,
*Buz Çırağı*, *Sahanlık Kaşifi*, *Duvar Tırmanıcısı*, *Zirve Sahibi*,
*Derin Dalgıç*, *Koloni Efsanesi*. Eşikler chapter sonlarına oturuyor ve
`tools/lint.mjs` son unvanın gerçekten ulaşılabilir olduğunu kontrol ediyor
76 bölümlük bir oyunda 90. bölümde verilen bir unvan, kimsenin görmediği bir
metindir.

Ad alanı **hazır dolu geliyor**: uydurulmuş bir ad zaten içinde, o yüzden
"geç" ile "kabul et" aynı düğme ve oyuncu ile oyun arasında bir karar eksiliyor.
İkinci bir "yeniden üret" düğmesi vardı, kaldırıldı: tek işi "bir bas ve oyna"
olan bir ekran, seni oynatmayan ikinci bir düğme sunmamalı ve alan zaten
düzenlenebilir. Öneri listesi de dile göre değişiyor, kelime kelime çeviri
değil aynı yöntemle kurulmuş İngilizce parçalardan.

Ad sanitize ediliyor: kontrol karakterleri, yön değiştiren görünmez işaretler ve
açılı parantezler siliniyor. Ad hem DOM'a hem paylaşım koduna yazılıyor ve ikisi
de "ne yazdıysa odur" güveninin yanlış olduğu yerler.

---

## Müzik

Oyunda ses dosyası yok ve olmayacak; müzik de bölümler gibi **kural olarak**
yazıldı. Yerini aldığı şey tek bir dört akorluk arpejdi: her bölümde aynı, ve
`setInterval` üstünde çalıştığı için duvar saati ile ses saati arasında yavaşça
kayıyordu.

### Tek tema, beş kostüm

Beş nota, dörtlü yukarı, adım adım geri, eve. Penguene ait, bölüme değil.
Beş sahne var ve tema beşinde de aynı tema: ana ekranda majörde ve ağır;
sahanlıkta aynı majör, 100 vuruşta ve shaker'lı; dağda minörde, çıplak bir
beşlinin üstünde; buzun altında yarı hızda, lidyen ve gecikmeye boğulmuş; kar
topu arenasında dorian ve staccato. Kimsenin bunu fark etmesi gerekmiyor. Beş
bambaşka parçanın tek bir oyun gibi duymasının sebebi bu.

Sayılar `src/core/music.js` içindeki `SCENES` tablosunda: her sahnenin kendi
tempo, kök nota, dizi, dalga biçimi, filtre kesimi, perküsyonu ve swing'i var.

### Katman, parça değil

Ped, bas, arpej, perküsyon ve tema beş ayrı ses ve her biri kendi başına
geliyor gidiyor, neyin olduğuna bakarak. Ped hep var; davul yalnızca işler
kötüye gidince. **İyi giden bir bölüm ile neredeyse kaybedilmiş bir bölüm aynı
duyulmuyor** ve ikisi de ayrı ayrı bestelenmedi.

Sıcaklık (`_heat`) kasten oyuncunun *hissettiği* şeylerden yapılıyor: ne kadar
ilerlediğin, seni öldürecek şeyin ne kadar yakın olduğu, o chapter'ın senden
aldığı kaynaktan ne kadar kaldığı. Dalışta nefes, tırmanışta kol gücü,
arenada havada uçan kar topu.

### Ses saatinde planlanıyor

25 ms'de bir uyanan bir ileri-bakış zamanlayıcısı, sonraki beşte bir saniyenin
notalarını tam zamanlarıyla kuyruğa koyuyor. `setInterval` bunu yapamaz: ana
iş parçacığı ne kadar meşgulse o kadar geç kalır ve bir chapter dolusu buzun
çizildiği karede **çok** geç kalır, yani ritim tam da oyun heyecanlandığında
tökezler.

Efektler müziği kısıyor (`duck`): buz kırılırken müziğin üstüne binmesi,
oyuncunun duyması gereken tek sesi bastırmak demek.

Testi `tests/music.mjs`: Web Audio sayaçlarla taklit ediliyor ve ızgaranın
tam, katmanların yoğunlukla geldiği, sahne geçişinin vuruşa oturduğu ve temanın
her bölümde çaldığı ölçülüyor. Müzik, okuyarak kontrol edilemeyen tek parça
ve sessizce bozulan tek parça.

---

## Diller

Oyun Türkçe yazıldı ve öyle kalıyor: her metin iki kere var, Türkçesi asıl,
İngilizcesi çeviri. Arayüz metinleri `src/core/i18n.js` içindeki tek sözlükte
adla duruyor; bir içeriğe ait olan her şey (bölüm adı, penguen tanıtımı, market
etiketi, görev, lig kademesi, unvan) o girdinin kendi `en` bloğunda, çünkü adı
çiziminden üç dosya uzakta duran bir penguen, yeniden adlandırılması unutulan
penguendir.

İlk açılışta tarayıcının dili seçiliyor; biri elle seçim yapınca o seçim
kalıyor. Seçici her dilin adını kendi dilinde yazıyor, tam da okuyamadığı bir
arayüzde kalan oyuncu için.

Eksik bir metin çökme değil, sessizce diğer dile düşme demek, o yüzden üç
denetim var:

| Denetim | Ne yapıyor |
|---|---|
| `tools/lint.mjs` | İki sözlükte birebir aynı anahtarlar var mı |
| `tools/lint.mjs` | Kodun istediği her anahtar sözlükte var mı |
| `tests/browser-lang.mjs` | Dili değiştirip her ekranda Türkçe harf arıyor |

Sonuncusu ilk koşuşunda dört gerçek boşluk buldu: chapter başlıkları, market
grup adları, HUD'daki bölüm adı ve market kademe sayacı.

Uzun yasal metinlerin İngilizcesi `docs/PRIVACY.md` ve `docs/TERMS.md`
dosyalarında; Türkçeleriyle birebir aynı şeyi söylüyorlar.

---

## Kontroller

| | |
|---|---|
| ← → veya A D | Yürü, *buz duvarına doğru basılıysa: tutun* · *suda: yüz* |
| Boşluk / ↑ / W | Zıpla, basılı tut, yükseğe çık · *suda: basılı tut, dal* |
| Boşluk **havada basılı tut** | Kanatları aç, süzül *(Planör Kanat gerekir)* |
| Boşluk **havada tek dokunuş** | Sırt motorunu ateşle *(Sırt Motoru gerekir)* |
| Boşluk **tutunurken basılı tut** | Duvarı tırman |
| Boşluk **tutunurken dokun** | Duvardan tekmele |
| R | Bölümü baştan başlat |
| Esc veya P | Duraklat |

Dokunmatik ekranda alttaki üç tuş, ayrıca gamepad desteği var. Ekipmanların
ikisi de aynı zıplama tuşuna bindi, çünkü dokunmatikte dördüncü bir düğme
olmamalı ve "bas" ile "basılı tut" zaten iki farklı niyet.

### Tuşlar ekranı kaplamıyor

Tuşlar tek bir kurala bağlıydı: 460 ile 560 piksel arası yükseklikte küçül.
Yan tutulan hiçbir telefon o aralıkta değil — modern bir cihaz yatayken 375 ile
430 arası, yani kuralın **tabanının altında**. Sonuç: her yatay telefon
masaüstü boyundaki tuşları alıyordu. Alttaki şerit 390 piksellik bir ekranda
115 pikseldi; oyunun neredeyse üçte biri, oyunun kendi düğmeleriyle kapalıydı.

Artık boyut `cqh` ile sahnenin yüksekliğinden geliyor, yani her telefonda
kademesiz olarak ölçekleniyor — tahmin edilmesi gereken bir kırılma noktası
yok. Üst sınır eskisi: masaüstü ve dik tutulan telefon hiç değişmiyor.

**Ama ilk ayar tuşları fazla küçülttü, ve sebebi yazmaya değer.** 44 pikseli
hedefliyordu — bir parmağın güvenle basabileceği en küçük hedef — ve *bir alt
sınır bir boyut değildir*. Ölçüldüğünde yan tutulan her telefon 44 ile 49
piksel arasına düşüyordu: bu, kumandanın teknik olarak basılabilir olduğu
sürece rahatsız olmasına izin verdiğinize karar verdiğinizde seçtiğiniz
sayıdır. Oysa bu, dakikalarca iki elle tutulan bir oyun; formdaki bir bağlantı
değil.

Ama bu da yetmedi, ve **ikinci ayar sebebini buldu: bütçelenen sayı yanlış
şeyi ölçüyordu.** Ölçüt, `#touch` kabının yüksekliğinin sahneye oranıydı ve
beşte birle sınırlıydı. Oysa o kap bütün genişliği kaplarken tuşlar onun iki
alt köşesinde duruyor — ölçüldüğünde **ortası %74 boştu**. Yani tuşlar bir
kutu dolusu havanın parasını ödüyor, hiç yaklaşmadıkları bir tavanın altında
kalsınlar diye küçültülüyorlardı: gerçek kaplamaları ekranın **%3.9**'uydu.

Bir test vekil bir sayıyı ölçerse, optimize edilen o vekil olur. Ölçüt artık
oyuncunun gerçekten kaybettiği şey: tuşların gerçekte kapladığı alan, en uzun
tuşun köşeyi yutup yutmadığı, ve ortanın boş kalması.

| | ilk hâl | birinci ayar | **şimdi** |
|---|---|---|---|
| iPhone SE yatay | 44 / 54 | 58 / 71 | **75 / 92** |
| iPhone 14 yatay | 45 / 57 | 60 / 74 | **78 / 96** |
| Pixel yatay | 47 / 60 | 64 / 78 | **80 / 96** |
| iPhone 14 Pro Max yatay | 49 / 62 | 67 / 82 | **80 / 96** |

Yatay telefonda gerçek kaplama **%6.5**, iki tuş grubu arasında genişliğin
**%68**'i hâlâ boş.

Kamera bu işte yardıma ihtiyaç duymuyor: şeridin gerçek ölçülen yüksekliğini
okuyor, yani tuşlar büyüyünce pengu kendiliğinden yukarı çıkıyor. Üst şerit de
aynı sebeple daralıyor, ve yatay telefonda tuşlar bir parmak üstlerine gelene
kadar biraz geri çekiliyor.

Alt sınırlar artık var olan hiçbir telefonun altında — olması gereken boyutta
değil. Sebebi şu: var olan her telefondan kısa bir sahne bile şeridi beşte
birin ötesine itemesin diye duruyorlar. İlk denemede 300 piksel yükseklikte
tam **%22.0** çıkıyordu, ki bu bir pay değil, bir tesadüftür. 320 pikselin
üstünde hiçbir şey onlara değmiyor.

Bunun testi yoktu, o yüzden olabildi. Artık `browser-layout` üç boyutta da
gerçek kaplamaya, en uzun tuşun yüksekliğine, ortanın boş kaldığına, her tuşun
44 pikselden büyük olduğuna, sahnenin dışına taşmadığına ve üst şeride
binmediğine bakıyor.

Ve test artık **dokunmatik cihaz gibi davranıyor**. Önce tuşları elle
görünür yapıyordu, ki bu var olmayan bir oyunu ölçmek demek: arayüz, işaretçi
kaba değilken her ekran değişiminde tuşları yeniden gizliyor — masaüstü
Chromium kaba değil — yani bir sonraki `startLevel`'da tuşlar kayboluyor ve
tam o anda yeniden ölçmesi söylenen kamera **sıfır piksellik** bir şerit
kaydediyordu. Tuşlar ekrandaydı, kamera olmadıklarını sanıyordu. Şimdi test
`_isTouch`'ı çeviriyor ve gerisini arayüze bırakıyor, tıpkı bir telefon gibi.
Bu sayede yetmiş altı bölümün hepsi üç boyutta da denetleniyor.

**Gamepad**: sol çubuk ve D-pad yürütüyor, A/B/X/Y zıplatıyor, Start
duraklatıyor (`src/core/input.js`, `pollGamepad`). Tarayıcı `getGamepads()`
çağrısı hata atarsa kare düşmüyor, o kare klavyeye düşülüyor.

> Dürüst olmak gerekirse: gamepad yolu **otomatik test edilmiyor**. Klavye ve
> dokunmatik testlerden geçiyor, gamepad yalnızca gerçek bir kolla denenebilir
> ve o [`docs/BILGISAYARDA.md`](docs/BILGISAYARDA.md) listesinde duruyor.

---

## Arka plan ve kaldığın yer

Üç ayrı şey:

**Sekme arkaya alınınca** oyun duraklıyor. Önemli olan sadece durması değil,
*kronometrenin akmaması*: `visibilitychange` geldiğinde döngü duruyor ve
geri dönünce biriktirici sıfırlanıyor, yani beş dakika başka sekmedeysen
süren beş dakika artmıyor.

**Pencere odağını kaybedince** basılı tuşlar bırakılıyor. Alt+Tab yaparken sağ
ok basılıysa penguen sonsuza kadar sağa yürümüyor.

**Sekmeyi kapatınca** koşu kaydediliyor, kontrol noktasına her değdiğinde,
duraklatınca, ölünce ve `pagehide`'da. Geri geldiğinde ana ekrandaki düğme
**"Devam et · Bölüm 7 · 00:12.53"** diyor ve bastığında bıraktığın kontrol
noktasında, aynı süreyle, aynı ölüm ve balık sayısıyla başlıyorsun. Kayıt 36
saat sonra kendini siliyor, bölümü bitirince de siliniyor.

Kayıtla birlikte bölümün **şeklinin parmak izi** de saklanıyor, çünkü bir
koordinat yalnızca onu üreten bölümde bir koordinattır. Bölüm değişirse aynı
iki sayı açık denizi gösterebiliyor: oyun açılır açılmaz penguen gökten
düşüyor, ölüyor ve ölünce aynı noktaya geri konuyor. Sonsuza kadar, kaydı
silmekten başka çıkışı olmadan. Parmak izi tutmazsa oturum atılıyor; tutsa
bile nokta hâlâ bir zeminin üstünde mi diye bakılıyor.

Aynı emniyet ağı oyun içinde de var: her yeniden doğuşta nokta *o an*
basılabilir mi diye kontrol ediliyor. Sürüklenmiş bir buzun üstündeki kontrol
noktası ya da erimiş bir zemin, ölüm döngüsü kuramıyor.

> Bu özellik yazılırken **gerçekten bozuktu** ve testle bulundu: başlık ekranı
> UI kurucusunda, yani `game` nesnesi var olmadan önce çiziliyordu, bu yüzden
> yarım kalmış koşuyu bilmesine imkân yoktu ve "Devam et" hiç görünmüyordu.
> `main.js` artık `attach()` sonrasında başlığı bir kez daha çiziyor.

---

## Ne var, ne yok

Bu bölüm depoda **gerçekten çalışan** şeyin listesi ve ikinci yarısı daha
önemli: bir README'nin yalan söylemesinin normal yolu, olmayan bir şeyi
anlatmak değil, olan bir şeyi olduğundan iyi anlatmaktır.

### Var ve çalışıyor

| | |
|---|---|
| Bölümler | 76 elle yazılmış (31 + 15 + 15 + 15) + sonsuz üretici + Günün Bölümü |
| Fiiller | Koş-zıpla · tutun-tırman-tekmele · dal-yüksel-nefes al · hizalan-çekil |
| Buz | 10 tür |
| Tehlike | 6 tür (sarkıt, fok, orka, fırtına, yükselen hava, serak) |
| Rüzgâr | Dört vuruşluk eğri, kendi sürüklenme kanalı, ibre, `windGap`, `updraft` |
| Koleksiyon | 24 penguen, 10 iz, 5 nadirlik, 4'ünde yetenek var |
| Market | 9 eşya, 19 kademe, 3 başlık, bitmeyen Buzul Anıtı |
| Meta | 21 günlük görev, 4 günlük hedef, haftalık lig (4 kademe), Günün Teklifi |
| Kimlik | Ad, `PNG-XXXXX` kimliği, 7 unvan, hepsi cihazda |
| Hayalet | Kendi rekorun yanında koşuyor, paylaşım koduyla arkadaşınki de |
| Müzik | Tek tema, 5 sahne, 5 katman, ses saatinde planlanıyor, ses dosyası yok |
| Dil | Türkçe ve İngilizce, 307 metin, tarayıcıdan seçiliyor |
| Kayıt | Tek sürümlü JSON, ileri göç, dosyaya aktarma, tek tuşla silme |
| Çevrimdışı | Servis çalışanı + tek dosya sürümü (650 KB) |
| Girdi | Klavye, dokunmatik, gamepad |
| Test | 33 node + paketleme + 9 tarayıcı paketi, hepsi tek komutta |
| Zorluk | Ölçülen eğri: `node tools/difficulty.mjs` |

### Yok, ve neden

| | |
|---|---|
| **Gerçek para ile satın alma** | Katalog `store.js` içinde veri olarak duruyor ama `canPurchase()` kapalı. Tarayıcı bir makbuzu güvenle doğrulayamaz; sunucu, Stripe hesabı ve bir kullanıcı kavramı gerekiyor. |
| **Ödüllü reklam** | Mekanikler için hazır ama SDK'lar uygulama kimliği istiyor ve web'de ödüllü reklam desteği zayıf. |
| **Gerçek zamanlı çok oyunculu** | Kar topu chapter'ı yerel yapay zekâ rakiplerle. Gerçek online için WebSocket sunucusu, eşleştirme ve gecikme telafisi gerekir; hayalet yarışı bunun asenkron karşılığı. |
| **Gerçek sıralama tablosu** | Süreler cihazda duruyor, paylaşım koduyla dolaşıyor. Lig kademeleri bir hedef, bir sıralama değil. |
| **Gamepad testi** | Kod var, otomatik testi yok. Gerçek bir kolla denenmeli. |
| **Safari ve Firefox testi** | Otomatik testler yalnızca Chromium'da. |
| **Gerçek cihazda oynama** | Hiçbir otomatik test bunun yerine geçmiyor ve hâlâ yapılmadı: [`docs/BILGISAYARDA.md`](docs/BILGISAYARDA.md) §4. |
| **Tehlike zamanlaması çözücüde yok** | Çözücüler zeminin ulaşılabilir olduğunu kanıtlıyor; gayzerin patlama anı, orkanın sıçrama anı ve fokun devriyesi saat meselesi ve `validate-levels.mjs` içinde kontrol ediliyor. |

---

## Tarayıcı desteği

Modern Chrome, Safari, Firefox ve Edge (masaüstü + mobil). ES modülleri, Canvas
2D, Web Audio ve `localStorage` kullanıyor. Ses yoksa ya da kayıt yapılamıyorsa
oyun yine de oynanır; ikisi de isteğe bağlı. Yazı tipi zaten indirilmiyor,
işletim sisteminin kendi yığını kullanılıyor.

Otomatik testler yalnızca Chromium'da koşuyor. Safari ve Firefox elle
denenmeli, bu da yapılacaklar listesinde duruyor.
