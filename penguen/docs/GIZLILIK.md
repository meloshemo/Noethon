# Gizlilik Politikası

**Son güncelleme:** 19 Ağustos 2026
**Ürün:** Pengu — Antarktika'dan Kaçış (web oyunu)

## Kısası

Bu oyun senin hakkında **hiçbir şey toplamıyor.** Sunucusu yok, hesap sistemi
yok, çerez kullanmıyor, reklam göstermiyor, analitik çalıştırmıyor. Oyunun
ağ üzerinden konuştuğu tek bir adres yok.

Bu bir söz değil, **test edilen bir gerçek.** Depoda `fetch`,
`XMLHttpRequest`, `WebSocket` ya da üçüncü taraf bir script çağrısı yok, ve iki
ayrı kontrol bunun böyle kalmasını sağlıyor:

- `tools/lint.mjs` her dosyada dış adres arıyor ve bulursa derlemeyi düşürüyor.
- `tests/browser-identity.mjs` oyunu gerçek bir tarayıcıda açıp `performance`
  kayıtlarına bakıyor: kendi dosyaları dışında **tek bir istek** olmamalı.

Bu kontroller boşuna değil. İlk hâlinde oyun yazı tipini Google Fonts'tan
çekiyordu — yani her açılışta, tek piksel çizilmeden önce, iki başka şirketin
sunucusuna bağlanıyordu. Test bunu yakaladı; yazı tipi kaldırıldı ve yerine
cihazın kendi yazı tipleri kullanılıyor.

## Ne saklanıyor, nerede

Her şey **senin tarayıcında**, `localStorage` içinde, `pengu.save.v1` adlı tek
bir kayıtta duruyor. İçindekiler:

| Ne | Neden |
|---|---|
| Adın | Rekorlarında ve paylaştığın hayalet kodlarında görünsün diye |
| Penguen kimliğin (`PNG-XXXXX`) | Aynı adı taşıyan iki oyuncu birbirine karışmasın diye |
| Başladığın tarih | Kimlik kartındaki "başladığın gün" |
| Bölüm ilerlemen | Yıldızlar, rekor süreler, deneme sayısı, toplanan balık |
| Balığın ve aldıkların | Market ve koleksiyon |
| Giydiğin penguen ve iz | Görünüşün |
| Ayarların | Ses, müzik, az hareket, kolay mod |
| Günün görevleri ve serin | Günlük içerik |
| Hayalet kayıtların | Kendi rekor koşuların, tekrar izlenebilsin diye |
| İçe aktardığın rakip kodları | Sıralama tablosu |

Bunların hiçbiri cihazından çıkmıyor.

## Kişisel veri

Adı **sen** yazıyorsun ve gerçek adın olmak zorunda değil — "Şaşırt beni" tuşu
bir tane uyduruyor. Oyun IP adresi, konum, cihaz kimliği, kişi listesi,
fotoğraf ya da benzeri hiçbir şeye erişmiyor; tarayıcıdan böyle bir izin
istemiyor.

Oyunun eriştiği tek tarayıcı yeteneği:

- **localStorage** — kaydın için
- **Web Audio** — sesler için (mikrofon değil; yalnızca ses üretiyor)
- **Gamepad API** — oyun kolu bağlıysa (yalnızca tuşlarını okur)
- **Tam ekran ve ekran yönü** — istediğinde

## Paylaştığında ne gidiyor

Bir bölümü bitirince "Kodunu paylaş" diyebilirsin. O kodun içinde şunlar var:

- Yazdığın ad
- Bölüm numarası ve süren
- Koşunun sıkıştırılmış hareket kaydı (hayaletin)

Kod bir metin dizisi; nereye yapıştıracağına sen karar veriyorsun. Oyun bu
kodu kendiliğinden **hiçbir yere göndermiyor** ve senden kimseye ait bir kod
istemiyor — birinin kodunu yapıştırırsan onun hayaletiyle yarışırsın, o kadar.

## Barındırma

Oyun GitHub Pages üzerinde yayınlanıyor. Herhangi bir web sitesini açtığında
olduğu gibi, GitHub'ın sunucuları isteği karşılarken IP adresini ve tarayıcı
bilgini standart erişim kayıtlarında görür. Bu, siteyi *indirmenin* kaçınılmaz
sonucu; oyun bir kere yüklendikten sonra bir daha hiçbir istek yapmıyor. Bu, oyunun değil barındırma
hizmetinin işlemesi: [GitHub Gizlilik Bildirimi](https://docs.github.com/site-policy/privacy-policies/github-privacy-statement).

Oyunu tek dosya olarak indirip (`dist/pengu.html`) çevrimdışı oynarsan bu da
ortadan kalkar.

## Çocuklar

Oyun her yaşa uygun. Sohbet yok, kullanıcı içeriği yok, harcama yok, reklam
yok. Kişisel veri toplanmadığı için ebeveyn onayı gerektiren bir işleme de
yok. 13 yaş altı için de aynı: toplanan bir şey olmadığından COPPA anlamında
"toplama" gerçekleşmiyor.

## Haklarının karşılığı

Veriler bir "veri sorumlusuna" aktarılmadığı için KVKK ve GDPR'ın tanımladığı
anlamda bir işleme yapılmıyor. Yine de aynı sonuçları veren tuşlar var:

| Hakkın | Karşılığı |
|---|---|
| Erişim / taşınabilirlik | **Ayarlar → Yasal ve veri → Kaydımı dosyaya aktar** (JSON indirir) |
| Silme | **Ayarlar → İlerlemeyi sıfırla** — kaydın tamamen silinir, geri alınamaz |
| Düzeltme | Adını **Kimlik** ekranından istediğin zaman değiştirirsin |
| İtiraz | İşleme yok; oyunu kapatmak yeterli |

Tarayıcının site verilerini temizlemek de aynı işi görür.

## Değişiklikler

Bu metin değişirse en üstteki tarih değişir ve değişiklik depo geçmişinde
görünür. Oyun sürüm numarası taşımıyor; yayınlanan her şey depodaki `main`
dalının o anki hâli.

## İletişim

Soru, hata bildirimi ve talepler için: depodaki *Issues* bölümü.
