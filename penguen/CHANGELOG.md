# Değişiklikler

Sürüm numarası yok çünkü tek bir web adresine yayınlanıyor; tarih ve ne
değiştiği yeterli. En yeni en üstte.

---

## Kamera: doğru boyda bakıyordu, yanlış yere

Şikâyet şuydu: pengu yukarıdayken aşağısı ekranda tam gözükmüyor. Ölçüldü ve
tek bir satırdan çıkıyordu.

Üst şerit ve dokunmatik tuşlar tuvalin **üstüne** çiziliyor, yani görüntünün
altı ve üstü oyuncunun değil. Kamera ise pengueni görüntünün tamamına göre
çerçeveliyordu. Yan tutulan bir telefonda görüntü 658 birim; şerit 97, tuşlar
172 alıyor, gerçekten görünen bant **389**. Tırmanışın "%64"ü o bandın
**%83'üne** denk geliyor ve ayağının altında bir buçuk gövde dünya kalıyor.
Sayı 64 diyor, ekran 83 gösteriyor, ve projede bu farkı görebilen hiçbir ölçüm
yoktu.

Üç değişiklik:

**Oran banda göre.** Masaüstünde on dokuz piksel oynuyor, yan telefonda %83 →
%58.

**Ayağının altına bir taban: en az iki gövde.** Bilerek geniş ekranların zaten
tutturduğu sayıya ayarlandı, böylece tek bir duruma dokunuyor ve masaüstü,
tablet, dik telefon bir piksel kıpırdamıyor. Yükseltmek ayrı bir karar ve
kendi başına savunulmalı; bir taban olarak kaçak geçirilmemeli.

**Düşerken aşağı bakmak.** Oyunda kör yapılan tek şey düşmekti: çerçeve
pengueni takip ettiği için dört yüz piksellik bir düşüşte ekran dururkenki
resmin aynısını gösteriyor, ineceğin buz ekranın dışından geliyordu. Oysa bu
oyunda her gidiş önden bakılıyor — koşu yana, tırmanış yukarı. Düşmek de bir
gidiş. İnerken 230 piksele kadar, zıplarken yalnızca 70 (bir zıplama kısadır
ve başladığı yerde biter), duvara tutunurken sıfır (duvardaki bir tırmanıcının
dikey hızı saniyede birkaç kez yön değiştirir ve ona cevap veren kamera deniz
tutar). Düşüş hızlandıkça takip de hızlanıyor, yoksa eğim çizilir ve hiç
varılmaz.

Ölçüm, yan tutulan telefonda saniyede 1163 piksel düşerken, penguenin ayağının
altında görünen dünya:

| | Önce | Sonra |
|---|---|---|
| Düşerken görünen zemin | **−51px** | **156px** |

Eksi işareti yazım hatası değil: eski kamerayla hızlı düşen penguen tuşların
arkasındaydı.

Ve bir de şu çıktı: kamerayı yerleştiren kod ile takip ettiren kod aynı üç
oranın iki ayrı kopyasıydı. Hiç anlaşmazlığa düşmemelerinin tek sebebi
kimsenin birini değiştirmemiş olması. Tek bir `_cameraTarget` oldu, ve
`tests/camera.mjs` ikisinin duran bir penguende aynı şeyi söylediğini de
kontrol ediyor.

### Ve aynı ölçüm arenada çok daha kötü bir şey buldu

Arena **1500** birim geniş, masaüstü görüntüsü **960**. Bölümün kendi sözleşmesi
"kol geri gider, hat buzun üstüne çizilir, o süre senindir" diyor — ama çizici,
görüntüden çıkan rakipleri tamamen atlıyordu. Bölümün kendi kurduğu duracak
yerde dururken:

| Ekran | Hattı çizen atıcı ekran dışında |
|---|---|
| Masaüstü 16:9 | **%87** |
| Telefon dik | **%100** |
| Telefon yatay | %3 |

62. bölümde — ekranında "yukarıdaki sana atıyor" yazan öğretici bölümde — sana
atan penguen ekranda değildi.

Artık gövde eleniyor, telgraf elenmiyor: ekranı kesen hat, onu çizen kol
ekranda olmasa da çiziliyor, ve kol arkasında kaldığı kenara bir işaret alıyor —
hangi yönden ve ne kadar vaktin kaldığı, tek bakışta. Hareket azaltma açıkken
de çiziliyor, çünkü o modda hat zaten çizilmiyor ve geriye kalan tek ipucu
rakibin duruşu, yani ekran dışındaki şey.

Bu bir yama. Odanın ekrandan geniş olması tasarım gerilimi olarak duruyor ve
iki yolu da bedelli; ölçü `docs/YAPILACAKLAR.md` §2.6'da.

### Ve arenada yan öncü kaldırıldı

Yan öncü — kameranın gidiş yönüne doğru öne bakması — *yolculuk* için var. Bir
tırmanış ekrandan dar, yani bakılacak bir ön yok; zaten sıfırdı. Bir arena ise
bir **oda**: tek bir sahnede bilerek ileri geri yürüyorsun, ve oyun bu farkı
zaten biliyor — kar topu bölümünde `progress` mesafe değil, kalan kapıcı
sayıyor.

Ölçüldü: tek bir noktanın doksan piksel sağına soluna beş saniye gidip
gelirken kamera öncüyle **2227**, öncüsüz **1524** piksel yol yapıyor. Tam
olarak konumları okumak üzerine kurulu bir bölümde üçte bir fazla resim
hareketi. Her fikir değiştirdiğinde savrulan bir kamera, oyunla tartışıyor
demektir.

Kalan 1524 piksel "kamera pengueni takip ediyor"dan geliyor ve cevabı bir ölü
bölge — ölçüsü alındı, yapılmadı, gerekçesi `docs/YAPILACAKLAR.md` §2.8'de:
his kararı, ve his kararı gerçek cihazda oynayanın.

Yeni paket dört gerçek ekran şeklinde, yetmiş altı bölümün hepsinde koşuyor.
54 paket (44 node + paketleme + 10 tarayıcı).

---

## Denizin bütçe modeli: denendi, ölçüldü, geri alındı

Dalış bölümünün altı seviyesi hedef bandının üstünde kolay duruyor ve şüphe
tek bir yerdeydi: **rezerv**, yani bir bacağın sonunda nefes almak için
saklanan pay. Tek bir çarpanla fiyatlanıyordu ve o çarpan sütunun **en kötü
noktasından** okunuyordu — oysa yüzeye çıkan bacak akıntı bandını yalnızca
kısmen geçiyor. Bacak, bandın tamamını bandın hızıyla ödüyordu, ve fark yirmi
puana varıyordu.

Dürüst model yazıldı: rezerv artık bacak bacak, her bacak gerçekten yüzüldüğü
yerde, `swimCost` ile fiyatlanıyor — dünyanın okuduğu zone'ların aynısıyla,
ikinci bir aritmetik kopyası olmadan. Yolda üç ayrı şey de çıktı ve üçü de
gerçek hatalardı: uzunluğu verilmemiş bir bant nokta testine sıfır genişlik
gösteriyor (büyütülmeden sorulunca rezerv durgun su okuyor), baca rezervi
`run` üstündeki üç yüz piksellik tabanı kaçırıyordu, ve baca rezervi **mevcut**
hattan okunuyordu — oysa baca *aşağıda*, yani pahalı hat buzun hemen
altındaki.

Sonra ölçüm konuştu:

| | Önce | Düzeltilmiş model |
|---|---|---|
| 52 Akıntı | %45 | %42 |
| 53 Testere Dişi | %36 | %33 |
| 54 Buzul Karnı | %22 | %25 |
| 56 Kara Su | %31 | %33 |
| 59 Leopar ve Akıntı | %2 | **bitirilemedi** |

**Pay hata değilmiş.** Çoğu, kusursuz bir hattın maliyeti ile *yüzülebilir* bir
hattın maliyeti arasındaki fark — ve eski rezerv onu kazara karşılıyordu. Payı
sıfırlayınca 59 yüz elli piksel uzadı ve çözücü, ki oyuncunun yüzdüğü gibi
yüzüyor planın çizdiği gibi değil, çıkışa ulaşamadı.

Paya bir isim verip ayarlamak da kurtarmadı: 1,12'de 57 bitirilemedi ve dört
bölüm *kolaylaştı*; 1,04'te on beşi de geçiyor ama iki bölüm üç puan sıkışırken
iki bölüm iki puan gevşiyor. Net sonuç sıfır, bedeli chapter'ın bütün bütçe
modelini yeniden akıtmak. Bu dosyanın başka bir yerinde yazdığı kuralın
aynısı: yerel olarak doğru ama her bölümü yeniden akıtan bir değişiklik
iyileştirme değildir.

Geri alındı. Kalan şey ölçüm: bu altı bölümün kolaylığı tek bir modelden
gelmiyor, ve sıkıştırmak isteyen tek tek planlara bakmalı — 58 ile 59'da işe
yarayan buydu.

---

## Arenanın sekizinci fiili: buzlu zemin

`tools/variety.mjs` ikizler turundan sonra en tekrarlı bölüm olarak **kar
topunu** gösterdi: on beş arena, **yedi** fiil, ve on beş çiftin beşi birebir
aynı dağarcık.

```
62–76   7 fiil   5/105 çift %80+ aynı  (%5)
```

Sayıyı kapatmanın iki yolu vardı ve biri yanlıştı. Ölçüyü, arenanın gerçekte
bölümleri birbirinden ayıran şeyi — düello sayısı, nişan periyodu, duruş yeri —
okuyacak şekilde genişletmek sayıyı düşürürdü ve oyunu değiştirmezdi. Bu
projenin kendi kuralı bunu zaten yazıyor: bir vekili ölçen ölçüm, vekilin
iyileştirilmesini sağlar. Chapter IV'ün dağarcığı **gerçekten** oyunun en
incesi, ve eksik olan belliydi.

### Eksik cümle

Arenanın bütün dağarcığı **hat** hakkında bir tartışma. Kaya bir hattı yiyor,
siper o yemeye süre koyuyor, kavisli atış üstünden geçiyor, düşen buz "o kare
yanlış" diyor. Hepsi bir **yer** hakkında bir cümle — ve bölümün duracak yere
*gitmek* hakkında söyleyecek hiçbir şeyi yoktu. On beş arenanın on beşinde her
düello tek bir zemin parçasında tek bir anda duruluyor, ve oraya yürümek
bedavaydı.

Buzlu zemin o cümle. Duracak yer yerinde, kapıdakinden geçen hat eskisi kadar
temiz, ve penguen cevabın üstünden kayıyor: doğru kurulmuş bir plan yanlış
oynanıyor. Sahanlığın kaygan buzu, değiştirilmeden — aynı floe türü, aynı
sürtünme, aynı çizim.

Tek kuralı planın bitmesini bekliyor, o yüzden kaya ve siper gibi `build`
içinde yerleşiyor: **en az bir duracak yer sağlam buzda kalır.** Bütün
cevapların üstünü birden kaplayan bir yama daha zor bir arena değil, bölümün
tek sözünün geri alınması.

### Beş ikizin dördü kırıldı, biri bilerek duruyor

| Çift | Verilen | Neden o |
|---|---|---|
| 68 Çapraz Ateş ~ 73 Gözcüler | 68'e **buzlu zemin**, 73'e **siper** | 68'in kendi notu "geriye yalnızca üstünden geçtiğin zemin kalıyor" diyor — yani bölüm yolculuk hakkında. 73 "güvenli köşelere inanmayı bırak" diyor, ve bunu en iyi bir köşeyi **ödünç vererek** anlatıyor |
| 65 Kaya ~ 69 Dar Alan | 69'a **ince buz** | 69'un cevabı "iki yarı arasında durmadan hareket et" — yani bir şerit var, şerit cevap, ve cevabın bedeli yoktu |
| 64 Tepedeki ~ 74 Aynı Anda | 74'e **buzlu zemin** | Her rakip aynı vuruşta atıyor, yani bütün bölüm tek bir an: sayımda başka bir yerde ol. "Başka bir yer" ölçülmüş bir mesafe |
| 70 Sabırsızlar ~ 75 Kalabalık | 75'e **düşen buz** | Zeminde hiçbir şey, tavanda hiçbir şey: chapter'ın tek tamamen penguenlerden kurulu arenası. Tavan, bir *yerin* yanlış olduğunu söyleyebilen tek şey |

76 da aldı, çünkü oyunun son bölümü chapter'ın bildiği her kelimeyi
söyleyebilmeli.

**62 Kapıdaki ~ 63 İki Kapıcı bilerek duruyor.** İkisi de saf düello, ve 62'nin
ekranında bir tabela var: biri bir kapı, öteki iki kapı ve aralarında yarım
vuruş. Bu, chapter'ın kendini tanıtması — denizdeki 47'nin 48–51'in alt kümesi
olmasıyla birebir aynı şey, ve o da kusur değil.

```
62–76   8 fiil   1/105 çift %80+ aynı  (%1)
```

### Bir pikselin taşıdığı yük

Yama zeminle **aynı hizada** değil, bir piksel yukarıda. İlk sürüm hizalıydı ve
ölçüm onu reddetti: aynı yükseklikte iki floe varken penguenin zemini hangisi
önce cevap verirse o oluyor, ki o da arena boyu uzanan sağlam buz — yani
bölümde kaygan olmayan bir buzlu zemin çizilmişti. Kayma beş piksel çıktı,
çıplak buzun aynısı. İnce buz da aynı sebeple bir piksel yukarıda duruyor ve
yazıldığı günden beri öyle.

Ve o piksel ikinci bir kural doğurdu. `tests/checkpoint.mjs` 74. bölümde düştü:
diriliş koruması penguenin **bütün gövdesini** yere koyuyor ve gövde katı bir
şeyin içindeyse noktayı reddediyor, dolayısıyla kenarı bir bayrağa yarım gövde
yaklaşan bir yama o bayrağı her ölümde sessizce çöpe atıyor. Bayrak ile yama
**bir buçuk piksel** kaçırmıştı. Besteci artık böyle bir yamayı reddediyor, ve
planda yama iki yüzde bin sağa kaydı — çünkü besteci reddedince onu
*küçültüyor* (230px → 184px), ve istendiğinden küçük teslim edilen bir parça
bölümü tarif etmeyi bırakmış bir plandır.

### Ve çizimi, ekran görüntüsü alınana kadar yanlıştı

Kaygan buzun tek işareti üç tane sabit beyaz çizgiydi, ve bu yalnızca kaygan
buz *bütün bir floe* olduğu sürece yetiyordu: floe'nun kendisi yama, yani
oyuncu **şekli** okuyor ve çizgiler sadece hangi şekil olduğunu söylüyor.
Arenada ise bölüm boyu uzanan bir zeminin üstüne serilmiş bir bant, ve orada
şekil hiçbir şey söylemiyor — karanlık bir zeminde üç çizgi süs gibi okunuyor,
ve cevabın üstünden kayan oyuncunun bunu neyin yaptığını anlamasının yolu yok.

Yüzey artık boyanıyor (uzaktan görülebilen kısım bu), çizgiler sayıyla değil
**genişliğe göre** aralanıyor, ve iki ucuna birer dikme çiziliyor — çünkü
aslında okunması gereken şey buzun nerede **başladığı** ve nerede **bittiği**:
fren yapacak oyuncunun ihtiyacı kenar, orta değil. Oluğun iki ucundaki kesik
çizgilerle aynı gerekçe.

Düzeltme sahanlığı da düzeltti: 5. bölüm Cilalı Buz'da kaygan floe'lar artık
sağlam olanlardan ilk bakışta ayrılıyor.

Bu arada bir hata da ekran görüntüsünden çıktı: yeni çizim floe'nun yüksekliğini
`h` diye okuyordu, ve o fonksiyona `h` hiç geçirilmiyor. 43 node paketinin
hepsi yeşilken oyun tarayıcıda açılmıyordu. Hiçbir node testi tuvale bakmıyor;
bakan tek şey gözdü.

`tests/slick.mjs` altı şeyi kontrol ediyor: istenen arenalara ulaştı mı, kırılan
değil kaygan bir zemin mi, her arenada sağlam buzda duracak bir yer kaldı mı,
başlangıç temiz mi, her bayraktan bir gövde uzakta mı, hiçbir atış hattının
altından çıkıyor mu — ve gerçek `World` içinde penguen buzda 45 piksel, sağlam
buzda 5 piksel kayıyor.

---

## Sonsuz modun tabanı üç parçaya daha ulaştı

`floorGap` derinleşen koşuda sıçrama aralığının **alt** ucunu kapatıyor: en
kolay sıçrama kolay olmaktan çıkıyor, en zoru hiç kımıldamıyor. Ölçüldüğünde
dört örnek bölümden ikisi kımıldamıştı, ikisi kımıldamamıştı — ve neden dialde
değildi:

- `summit` basamaklarını, kendisine ne verilirse verilsin, düz 0,36'ya koyuyordu
- `geysers` zaten bir `gap` alıyordu, üretici hiç geçirmiyordu
- `bait` çıkış basamağını sabit 0,26'ya koyuyordu

Üçü birlikte derin kursların yarısında çıkıyor. Yani tabanın hiç uygulanmadığı
bir parça, kursların yarısında vardı. Planların ulaşamadığı bir dial, kimsenin
çeviremediği bir dialdir.

| Bölüm | Önce | Sonra |
|---|---|---|
| 296 | 0,434 | **0,384** |
| 299 | 0,515 | **0,448** |
| 302 | 0,454 | 0,455 |
| 305 | 0,428 | **0,353** |

Üstleri düz parçaların kullandığından dar tutuldu (0,46 ve 0,42), çünkü üçü de
**yükselen** bir sıçrama istiyor ve yükseliş aynı erişimden harcıyor. Her
tohumda son sözü doğrulayıcı ile `shelf-run` veriyor; ikisi de yeşil.

Yolda `bait` içinde bir isim çakışması çıktı: verbin kendi `gap`'i ile yemin
boşluk içindeki yerini tutan yerel `gap` aynı addı. Yerel olan `into` oldu —
biri bir sıçrama, öteki o sıçramanın içindeki bir yer.

---

## Denizdeki iki ikiz kırıldı

`tools/variety.mjs` aylardır aynı şeyi söylüyordu: oyunun en tekrarlı bölümü
denizin altı, ve orada **birebir aynı** dağarcığa sahip iki çift var.

- 54 Buzul Karnı ile 58 Kılçık — altı fiil, aynı altı fiil
- 59 Leopar ve Akıntı ile 61 Açık Deniz — yedi fiil, aynı yedi fiil

Bir çifti kırmak için ikisine de **ayrı birer** fiil gerekiyor: tek ekleme
6/7 = 0,86 yapar ve eşik 0,80. Dördü de aldı, ve dördünde de eklenen şey
bölümün kendi notunun zaten iddia ettiği şeydi:

| Bölüm | Eklenen | Neden o |
|---|---|---|
| 54 Buzul Karnı | `flume` | Adı "tavan alçalıyor". Geçit bir metrelik alçak tavan; oluk üç yüz metrelik, ve suyu yukarı itiyor — bu bölümün havası tabanda |
| 58 Kılçık | `current` | Sığ–derin diye giden ritmin iki ucu bugüne kadar aynı şeye mal oluyordu. Bant sütunun üstünde, yani sığ yarısı akıntıda, derin yarısı durgun suda |
| 59 Leopar ve Akıntı | `eddy` | Girdabın gözü denizdeki tek "cevabı bir yer olan" parça. Dış halkaya ikinci leopar konunca göz dinlenme olmaktan çıkıp karara dönüşüyor |
| 61 Açık Deniz | `flume` | Buzun bittiği yer bitmiyor, **daralıyor**. Sütunun üst ucundaki geçit bir boğaza takas edildi |
| 52 Akıntı | `flume` | Zincirleme: 59 girdabı alınca 52 onun alt kümesi oldu. İki yarısının arasına bir boğaz girdi |

Sayılar: III. bölümün tekrar oranı **%6 → %4**, ve kalan dört çiftin dördü de
47'nin 48–51'in alt kümesi olması — yani chapter kendini öğretirken her bölümün
bir şey eklemesi, kusur değil.

### Üç şey ölçüm sırasında öğrenildi

**Bir fiil eklemek, eklendiği bacağın bütçesini ister.** 58'in akıntısı ilk
olarak açılıştaki dört geçidin üstüne kondu ve besteci piksel sayarak reddetti:
4100px'lik bacak, 3927px'lik ciğer. Sığdırana kadar zayıflatmak, fark
edilmeyecek bir akıntı bıraktı. İkinci bacakta hem yer vardı hem de zorluk
aracının "gevşek" dediği bacak oydu; bant iki sayının birden istediği yere
gitti. Bölüm %29'dan **%15**'e indi (hedef %10).

**61'e nefes vermek onu kolaylaştırdı — ve geri alınamadı.** Açılış bacağı
eskiden tek ciğerin tamamıydı ve bölümün en zor bacağıydı. Oraya bir `vent`
konunca bacak ikiye bölündü, bölüm **%4'ten %32'ye** çıktı ve sonraki bacağa
hiçbir şey eklenerek geri indirilemedi: bestecinin o bacak için tahmini zaten
bütçe sınırında, gerçek maliyeti ise tahminin yirmi puan altında. Yani sınır
tahminde, oynanışta değil. `vent` geri alındı ve son geçit bir `flume`'a
**takas** edildi — ekleme değil takas, çünkü eklemeye yer yok. Bölüm %4 → %2
oldu, yani biraz da zorlaştı.

**Bir ikizi kırmak bir başkasını doğurabilir.** 59 girdabı alınca 52 Akıntı
onun alt kümesi hâline geldi (0,875) — çünkü 59 artık tam olarak 52 + leopar.
Girdabı 61'e taşımak işe yaramıyor: 61 de akıntı + leopar, yani aynı şey oradan
çıkıyor. Yani 52 kaçınılmaz olarak bir fiil almak zorundaydı, ve `open` gibi
anlamsız bir ekleme ölçüyü kandırmaktan başka bir şey olmazdı. 52'nin iki
yarısının **arasına** bir oluk kondu: ilk yarı derinliğin bir seçim olduğunu
öğretiyor, ikinci yarı bunu tersine çeviriyor, ve aradaki üç yüz piksellik
boğazda seçilecek derinlik yok.

İlk denemesi ilk yarıdaydı ve `tests/current.mjs` onu yakaladı. Uzunluğu
verilmemiş bir bant başladığı yerden **sonraki nefese** kadar uzuyor, ve
açılıştaki iki bandın ikisi de öyle — dolayısıyla ilk yarıya kazılan bir kanal,
duvarlarının üstünden akıntı bandı geçerek çizilmiş oluyor. Oyunda bir şey
bozulmuyor, çünkü boğazın üstündeki su katı buzun içinde ve hiçbir şey yapmıyor;
ama o test denizin penguen taşıdığını kanıtlamak için gerçek penguen'i ilk
bandın tam ortasına bırakıyor, ve bandın ortası duvar olmuştu. Nefes deliğinin
kapağı bantları kapatıyor; oluk kapağın öbür tarafında durgun suda, ve orada
bir nehrin içindeki delik gibi değil, boğaz gibi okunuyor.

Zorluk eğrisinin toplam sapması 3,8 → **3,0**.

---

## Ölçüm aleti kalıcı oldu, ve dördüncü fiil geldi

`tools/variety.mjs` artık projenin bir parçası. Her bölümün gerçekten çağırdığı
besteci fiillerini okuyup, aynı bölümdeki kaç çift bölümün neredeyse aynı
kelime dağarcığını kullandığını sayıyor. Yeni bir mekanik eklemeden önce ve
ekledikten sonra çalıştırılıyor.

Bir uyarı da dosyanın içine yazıldı: bestecinin değişken adı `build: (x) =>`
içinden **okunuyor**, tahmin edilmiyor. Önceki sürüm olası adları listeliyordu,
dalış bölümü bestecisine `d` diyor, ve oyunun **en tekrarlı bölümü** sıfır fiil
bildirip kusursuz göründü. Sessizce boş dönebilen bir ölçüm, ölçüm olmamasından
kötüdür, çünkü ona inanılır.

Sayılar, bu turdan önce ve sonra:

| Bölüm | Önce | Sonra |
|---|---|---|
| I (1–31) | %6 | %6 |
| II (32–46) | %48 | **%15** |
| III (47–61) | %60 | **%33** |
| IV (62–76) | %21 | **%16** |

### Çukur

Dalış bölümünün eksiği, kendi bölüm yorumlarının zaten iddia ettiği şeydi.
Derinlik bedavaydı. Artık su sütununun dibi soğuk ve bir ciğeri iki buçuk katı
hızla tüketiyor, üstelik basınç gibi derinlikle artan bir eğimle.

Yolda çıkan üç hatanın üçüncüsü en öğreticisi:

- İlk sürüm deniz tabanına çukur kazıyordu. Bölümün kendi adalet kuralı bunu
  anında reddetti: tavan hizasındaki bir yüzücünün beş yüz piksel inmesi
  gerekiyordu, ki bu yedi yüz piksel koşu ister — üç yüz piksellik bir parça
  dört bine çıkıp üç ciğer yedi.
- **Çukur göründüğünden uzundur.** Bölümdeki her kural bir ciğeri mesafeyle
  ölçüyor, o yüzden soğuk sudan geçen bacak gerçekte olduğu kadar uzun
  sayılıyor. Bütün eski kurallar dokunulmadan çalışıyor.
- O maliyet ilk olarak **düğüm başına etiket** olarak yazılmıştı: her rota
  düğümü, durduğu yerdeki hızı taşıyor. Her kontrolden geçiyor ve oyuncuyu
  boğuyor. Çukur bir *yer*, ve bir bacak ona girip çıkıyor; bacağı tek ucundan
  fiyatlamak çıkış yolunu ucuza sayıyor. 60. bölüm tertemiz doğrulanıp
  bitirilemiyordu. `swimCost` artık bacak boyunca örnekliyor, hem de dünyanın
  her karede çağırdığı fonksiyonla.

Ve bir dördüncüsü, tek tek bölüm ayarlamaktan kurtaran: **plan ideal bir yüzüşü
fiyatlıyordu.** Rota çizimi çukurun dudağına yapışır, kusursuz derinlik tutar,
hiç aşmaz. Kimse öyle yüzmez. Buz altında duramaz ve asılı kalamazsın, yani
gerçek bir penguen kendi çizgisinin biraz altındadır — ve eğim olduğu için
"biraz" bütün geçiş boyunca birikir. `TRENCH.sag` artık her fiyatı, kendi
planının bu kadar altında yüzen biri için veriyor. İki bölüm elle ayarlanmıştı;
ikisi de bir sonraki değişiklikte yine bozulacaktı, çünkü hata o bölümlerde
değildi.

---

## Denetim: on bulgu, onu da kapandı

Bir üst düzey tarama istendi ve "her şey okey" çıkmadı. On bulgu, ikisi gerçek
hata, ikisi yalan söyleyen yorum, ikisi ürün boşluğu, biri işletme riski.

### Gerçek hatalar

- **Ödüllü video hatası butonu yutuyordu.** `await doubleUp(...)` bir `try/catch`
  içinde değildi. Yerinde duran sayaç asla hata vermediği için görünmüyordu —
  ama gerçek bir SDK'nın ilk yaptığı şey reject etmektir, ve o an buton donmuş
  bir geri sayımla sonsuza kadar kilitli kalırdı. Artık hata butonu olduğu gibi
  geri koyuyor: hiçbir şey ödenmiyor, hiçbir hak harcanmıyor.
- **Nefes çubuğundaki soğuk halka takılı kalıyordu.** `drain` erken `return`'ün
  altında hesaplanıyordu, yani çukurun içindeki bir delikten nefes alırken
  ölçek "bu sana iki katına mal oluyor" demeye devam ediyordu. Hiçbir şeyin
  mal olmadığı anda öyle diyen bir gösterge, göstergesizlikten kötüdür.

### Yalan söyleyen yorumlar

- `TRENCH.tint` "yalnızca çizici okur" diyordu ve **kimse okumuyordu**. Artık
  soğuğun rengi gerçekten oradan geliyor.
- `skuasEscaped` "bir görev bunu istiyor" diyordu ve **hiçbir görev istemiyordu**.
  Dahası `skua` görevinin metni ("pençesinden kıl payı kurtul") tam olarak
  boğuşmayı tarif edip **dalış ıskasını** sayıyordu. Metin ve sayaç artık aynı
  şeyden bahsediyor, ve boğuşmanın kendi görevi var.

### Ürün boşlukları

- **Sonsuz mod bütün yeni işi kaçırıyordu.** Sessiz alan, yem, rüzgâr boşluğu,
  yükselen hava, cilalı lanet, yüklü balıklar, hız çarpanı — hiçbiri yoktu. 76.
  bölümü bitiren, yani en sadık oyuncu, elle yapılmış bölümlerden belirgin
  şekilde fakir bir oyun oynuyordu. Hepsi eklendi.
- **Dört yeni mekanikten üçü hiç konuşmuyordu.** En kötüsü çukurdu: nefesin daha
  hızlı bitiyor ve sebebini söyleyen hiçbir şey yok, yani oyuncu öğrenmiyor,
  sadece ölüyor. Dört mekanik de artık ilk karşılaşmada bir kez konuşuyor.
- **Hız çarpanı yalnızca I. bölümdeydi.** "Son üçte bir hızlanır" kuralı oyunun
  dörtte birine uygulanmıştı. Dördünde de var, ve dağdaki serak kanıtı artık
  oyunun gerçekten çalıştığı saate bakıyor.

### Ve sonsuz mod, yemin kendi hatasını gösterdi

Yem fiili üretilen bölümlerde çağrılınca **yirmi sekiz bölümde** kaçan buzu
sağlam buzun altına koydu — yani tam olarak o fiilin önlemek için yazıldığı hata,
fiilin kendisi tarafından geri getirildi. Sebebi: yem, buz koyup imleci
ilerletmeyen tek şeydi. Sadece yer ayırtmak daha da kötüydü — sonraki buzu bir
zıplamanın ötesine itti ve doğrulayıcı sonucu anında yakaladı: karşıya geçmenin
tek yolu kaybolan buza basmak oluyordu. **Zorunlu yem, tuzak değil, hikâyesi olan
duvardır.** Parça artık `hush` ve `pendulum` gibi kendi karşı yakasını da koyuyor.

### İşletme riski

Tek dosya sürümü 885 KB'a çıkmıştı, sınır 900. Kaynağın %38'i yorum ve bu bilerek
öyle — ama yorumlar depoyu okuyan insan için, oyunu indiren telefon için değil.
Paketleyici artık yorumları kaldırıyor: **885 KB → 589 KB.** Yalnızca tam satırlar,
şablon dizelerinin içine dokunmadan, ve güvenli olduğunun kanıtı paketlenmiş
dosyayı gerçek tarayıcıda açıp oynayan test.

Bir de: readme'nin "24 paket" iddiası gerçekte 30'du. Sayı düzeltildi **ve**
denetlenebilir hale getirildi — belgeye yazılan bir sayı kayar, o yüzden artık
lint çalıştırıcıyla karşılaştırıyor.

---

## Üç bölüme üç yeni fiil, çünkü sorun tembellik değil kelime yokluğuydu

Bölümlerin birbirine benzemesi bir kanaatti; ölçüldü ve sayı çıktı. Her bölümün
kullandığı besteci fiillerini çıkarıp karşılaştırınca:

| Bölüm | Kaç fiil | %80+ aynı çift |
|---|---|---|
| I (1–31) | 17 | 30 |
| II (32–46) | **7** | **50** |
| IV (62–76) | **4** | **22** |

Bu tembel besteleme değil, **söyleyecek kelime yokluğu**. On beş bölümü dört
fiille birbirinden ayıramazsın. Cevap bölümleri karıştırmak değil, fiil eklemek.

- **Sessiz alan** (sahanlık): içeride yerçekimi %42'ye iniyor, menzil iki yöne
  birden ikiye katlanıyor, penguen havada bir buçuk saniye kalıyor. Oyunda
  bütün öteki sayıların ölçüldüğü sayıyı değiştiren tek şey.
- **Sallanan buz** (dağ): ipin ucunda bir buz kütlesi, periyodu `2π√(L/g)` —
  yani ipin boyundan geliyor, bir ayardan değil. Uçlarda duruyor, ortada
  penguenden hızlı geçiyor.
- **Kavisli atış** (arena): kayanın üstünden aşan kar topu. Bölümün tek statik
  cevabı olan "siperin arkasına geç"i elinden alıyor ve karşılığını saniyeyle
  ödüyor, çünkü kavis düz atıştan çok daha yavaş.

Ölçüm sonrası: dağda 50 → 37, arenada 4 → 5 fiil.

### Kanıtlar üçünü de öğrenmek zorunda kaldı, ve bu gerçek hatalar açığa çıkardı

Çözücüler dünyayı `World` kurmak yerine kendileri modelliyor — hızlı, ve tam da
çürüyen türden bir tekrar:

- **Yerçekimini sabit sanıyorlardı.** Sessiz alanı olan her bölümü geçilemez
  ilan ettiler. Artık yerçekimi terimi dünyanın kendi çağırdığı `hushAt`
  fonksiyonundan geliyor.
- **Geometriyi fotoğraf sanıyorlardı.** Buzlar bestecinin koyduğu yerde durur ve
  hiç kımıldamazdı. Sarkaç, konumu mekanizmanın kendisi olan ilk şey, o yüzden
  fotoğrafın film olması gerekti.
- **Kar toplarını hep düz sanıyorlardı.** Kavisli atış eklenince iki arena
  kazanılamaz oldu: çözücü yayın kafasının üstünden geçtiğini görüp "bir şey
  gelmiyor" dedi ve tepesine inerken bekledi.
- **Tırmanış çözücüsünün en uzun basılı tutması yarım saniyeydi**, çünkü o
  bölümdeki her zıplama üçte iki saniyede biter. Oyuncunun bariz biçimde
  yapacağı şeyi — basılı tutmaya devam etmeyi — ifade edemiyordu.

### Ve iki şey bilerek yapılmadı

**Dağda sessiz alan yok.** Beş yüz piksellik uçuş altı yüz piksellik şafta
sığmıyor; sığdırmanın tek yolu çevresindeki her adımı sınırına dayamak, ki bu
tam da bu dosyanın uzun uğraşla temizlediği kırılganlık. Sebep, fiilin duracağı
yere yazıldı.

**Her adımın iki yanını hesaplayıp ucuz olanı seçen sürüm çöpe atıldı.** Sınıra
dayanmış bir adımı kurtarıyordu, ve on iki sağlam adımı yeniden yönlendiriyordu;
iki bölüm daha yukarıda çözülemez oldu. Buradaki geometri bir zincir. Yerel
olarak daha iyi ve genel olarak kanıtsız olan şey daha iyi değildir.

---

## Zıplama tuşu dört şey demeye başladı

Yeşil çürük balık uzun süre oyundaki en ilginç pikaptı ve sebebi tek cümleyle
söylenebilir: oyuncuya verebileceğin başka her şey bir sayıdır, sayı ise fiil
değildir. Yön algısını ters çevirmek fiildi.

Üç yeni renk aynı fikrin iyi tarafı. Hepsi zıplama tuşunun ne demek olduğunu
birkaç saniyeliğine değiştiriyor, çünkü tek düğmeli bir oyuna ikinci düğme
eklemeden fiil eklemenin başka yolu yok:

- **Yay** (turuncu): bir tek zıplama, iki katı. Harcanmazsa kendi kendine
  boşalıyor, yani yanlış anda yutulan bir yay seni senin seçmediğin bir yere
  fırlatıyor. Sessizce buharlaşan bir yay bedava hediye olurdu.
- **Kuantum** (mor): havada bir kez bas, üç buçuk gövde ileridesin. Hızını
  koruduğu için asla yükseltmiyor, sadece taşıyor; hiçbir zıplamanın
  yetişemeyeceği bir boşluğu geçiyor ve kendi başına bir metre tırmanamıyor.
  Duvarın içine de sokmuyor: ışınlanma çeyrek gövdelik adımlarla süpürülüyor,
  son *boş* nokta kazanıyor.
- **Gevşeme** (turkuaz): sen havadayken senin dışında her şey üçte bir hızda.
  Yerde çalışmıyor, çünkü genel bir ağır çekim düğmesi her bölümü kolaylaştırır
  ve hiçbirini ilginçleştirmez. Su altında da çalışmıyor, çünkü orada düğme
  zaten derinlik kumandası.

Dördüncü bir lanet de geldi: **cilalı**. Diğer üç çürük balık pengueni
değiştiriyor, bu zeminin *ne olduğunu* değiştiriyor. Hızın, zıplaman ve menzilin
aynı kalıyor; hiç düşünmediğin tek şeyi kaybediyorsun, durabilmeyi.

### Kuşun elinden kurtulmak

Skua seni kapardı ve iş biterdi: bir saniye taşınma, sonra ölüm, arada
yapabileceğin hiçbir şey yok. Cevap veremediğin bir pusu, üstüne uzun bir
animasyon giydirilmiş yazı-turadır.

Artık boğuşma. İki saniyen var, beş hızlı basış seni kurtarıyor, basışlar
arasında kavrama geri sıkışıyor, yani yavaş tıklamak sönümlemeyle yarışır ve
asla yetişmez. Kurtulmak da güvende olmak değil: kuşun kendi momentumuyla, o an
altında ne varsa onun üstüne savruluyorsun.

### Adalet sözleşmesi aynı kaldı

Bütün bölümler hiçbir şeye sahip olmayan ve hiçbir şey toplamayan bir penguene
göre kanıtlanıyor. Dört çözücü ve iki doğrulayıcı hiçbir balığa dokunmadığı
için değişmedi bile: `worldRate` hiçbir balık yokken tam olarak 1, yani
`dt * 1` son bitine kadar `dt`. Bu bir optimizasyon değil, emniyet özelliğinin
kendisi.

`charged-fish.mjs` yirmi iddiayı gerçek `Player` ve gerçek `World` üstünde
ölçüyor, `browser-charged.mjs` aynısını gerçek sayfada yapıyor. İkisi birlikte
yazıldıkları gün iki gerçek hata buldu:

- **Kendi kendine boşalan yay üçte birine kırpılıyordu.** Değişken yükseklikli
  zıplama, düğmeyi bırakan oyuncunun sıçrayışını kısar; düğmeye hiç basmamış
  biri de tanımı gereği onu bırakmış sayılıyor. İstemsiz fırlatma, istemsiz
  olduğu için cezalandırılıyordu.
- **İki balık buzun içine düşmüştü.** Bölümler plandan besteleniyor, yani "şu
  buzun bir zıplama üstü" bir yer değil bir yükseklik: aynı satır bir bölümde
  açık havaya, diğerinde tünel tavanına denk geliyor. `nudgeClear` artık hepsini
  açığa taşıyor, hem de bestecinin *en sonunda*: ilk denemede her balık
  konduğu anda kontrol ediliyordu ve 76. bölüm balığı bir rakibin henüz var
  olmayan tüneğine koymuştu.

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
