# Play Console'da kalan işler — tarayıcıdan devam

Bu dosya, tarayıcıya erişebilen bir sohbete verilmek için yazıldı. Oyunun
paketi ve mağaza listelemesi **API ile zaten yüklendi**; kalan her şey Play
Console arayüzünden doldurulması gereken formlar.

Okuyan asistana: aşağıdaki cevapların hepsi doğrulanmış gerçeklerdir, tahmin
değildir. Bir soru burada yoksa, uydurma — sor.

---

## 0. Kimlik bilgileri

| | |
|---|---|
| Geliştirici hesabı | Meloshemo · `6076710317678420580` |
| Uygulama | **Pengu** · paket adı `com.Pengu` |
| Konsol adresi | https://play.google.com/console/u/0/developers/6076710317678420580/app/4972724539279267011/app-dashboard |
| Gizlilik politikası | https://meloshemo.github.io/cld/privacy.html |
| Kullanım şartları | https://meloshemo.github.io/cld/terms.html |
| Destek adresi | https://github.com/meloshemo/cld/issues |
| Web adresi | https://meloshemo.github.io/cld/ |
| Kaynak kodu | https://github.com/meloshemo/cld |

---

## 1. Hâlihazırda yapılmış olanlar — bunlara dokunma

Bunlar Play Developer API üzerinden yüklendi ve doğrulandı:

- **Paket:** imzalı `.aab`, internal test kanalında **taslak sürüm**,
  `versionCode 2`, `versionName 1.0.0`. (1 numaralı paket de yüklü, kullanılmadı.)
- **Mağaza listelemesi, iki dilde:**
  - `tr-TR` → ad: *Pengu: Antarktika'dan Kaçış*, kısa ve tam açıklama yazıldı
  - `en-US` → ad: *Pengu: Escape from Antarctica*, kısa ve tam açıklama yazıldı
  - Her iki dilde 6 telefon görseli, 3 tablet görseli, öne çıkan görsel
- **İmza:** Play App Signing. Yükleme anahtarının parmak izi
  `D1:01:3B:29:F1:AC:78:3E:F3:B8:46:B0:F5:11:72:4D:4A:39:89:3D:56:64:35:C0:A5:77:69:84:2F:FF:03:81`

> **Yapma:** mağaza metinlerini/görsellerini elle değiştirme, yeni paket
> yükleme, paket adını değiştirme. Sürüm güncellemesi GitHub Actions'taki
> "Play'e yükle" düğmesiyle yapılıyor.

---

## 2. Yapılacaklar — "Uygulamanı ayarla" listesi

Konsolda **Test edin ve yayınlayın → Uygulamanızı ayarlayın** (ya da
Dashboard'daki görev listesi) altında şu maddeler var. Sırayla:

### 2.1 Uygulama erişimi (App access)

> **Tüm işlevler özel erişim olmadan kullanılabilir**
> *(All functionality is available without special access)*

Giriş, hesap, şifre, davet kodu yok. Oyun açılır açılmaz tamamı oynanabilir.

### 2.2 Reklamlar (Ads)

> **Hayır, uygulamam reklam içermiyor**

Reklam SDK'sı yok, reklam kimliği (AD_ID) izni yok, hiçbir reklam ağı yok.

### 2.3 İçerik derecelendirme (Content rating)

Anket adım adım açılıyor. Gerçekler:

| Soru alanı | Cevap |
|---|---|
| Kategori | **Oyun** |
| Şiddet (gerçekçi) | Hayır |
| Şiddet (karikatür/fantastik) | **Evet, çok hafif** — karakter bir yırtıcıya (katil balina, deniz leoparı) yakalanabilir ya da kar topuyla vurulabilir; sonuç bir parlama ve bölümün baştan başlaması. Kan yok, yara yok, ceset yok, insan figürü yok |
| Cinsellik / çıplaklık | Hayır |
| Küfür, argo | Hayır |
| Uyuşturucu, alkol, tütün | Hayır |
| Kumar (gerçek ya da simüle) | Hayır |
| Korku / rahatsız edici içerik | Hayır |
| Kullanıcılar arası iletişim (sohbet, forum, kullanıcı içeriği) | Hayır |
| Konum paylaşımı | Hayır |
| Kişisel bilgi paylaşımı | Hayır |
| Satın alma (gerçek para) | Hayır |
| Dijital satın alma gösterimi | Hayır — oyun içi "balık" para birimi yalnızca oynayarak kazanılıyor, satılmıyor |

Beklenen sonuç: herkes / 3+ (PEGI 3, ESRB Everyone).

### 2.4 Hedef kitle ve içerik (Target audience)

- Yaş grupları: **13-15, 16-17, 18+** işaretle.
  (Çocuklara yönelik değil; 13 altını işaretlersen Play "Çocuklar için
  tasarlanmış uygulamalar" kurallarını devreye sokar ve ek beyanlar ister.)
- "Uygulamanız çocuklara mı yönelik?" → **Hayır**
- Çocukların ilgisini çekebilecek görseller var mı? → **Hayır** diye cevapla;
  oyun sevimli ama çocuklara yönelik pazarlanmıyor.

### 2.5 Veri güvenliği (Data safety)

Bu formun özeti: **hiçbir veri toplanmıyor, hiçbir veri paylaşılmıyor.**

| Soru | Cevap |
|---|---|
| Uygulamanız kullanıcı verisi topluyor veya paylaşıyor mu? | **Hayır** |
| Veriler aktarım sırasında şifreleniyor mu? | Soru çıkmaz (aktarım yok); çıkarsa "Evet, hiçbir veri aktarılmıyor" seçeneğini seç |
| Kullanıcılar verilerinin silinmesini isteyebiliyor mu? | Veri toplanmadığı için geçerli değil. Soru zorunlu çıkarsa: oyun içindeki **Ayarlar → İlerlemeyi sıfırla** her şeyi siler |

Dayanağı: uygulamanın **hiçbir izni yok** (ne internet, ne depolama, ne konum),
oyun tamamen cihazda çalışıyor, kayıt yalnızca cihazın kendi deposunda tutuluyor.
Doğrulamak istersen: https://meloshemo.github.io/cld/privacy.html

### 2.6 Diğer beyanlar

| Soru | Cevap |
|---|---|
| Haber uygulaması mı? | Hayır |
| COVID-19 temas takibi? | Hayır |
| Devlet uygulaması mı? | Hayır |
| Finansal özellikler var mı? | Hiçbiri |
| Sağlık uygulaması mı? | Hayır |
| Yapay zekâ üretimli içerik? | Hayır |

### 2.7 Mağaza ayarları (Store settings)

| Alan | Değer |
|---|---|
| Uygulama kategorisi | **Oyun → Arcade** |
| Etiketler (en çok 5) | platform, arcade, tek oyunculu, çevrimdışı, beceri |
| E-posta | hesap sahibinin iletişim adresi (Play bunu listelemede herkese gösterir) |
| Web sitesi | https://meloshemo.github.io/cld/ |
| Gizlilik politikası | https://meloshemo.github.io/cld/privacy.html |

### 2.8 Ülkeler / dağıtım

Tüm ülkeler açık bırakılabilir. İstenirse önce Türkiye ile sınırlanıp sonra
genişletilebilir — oyun iki dilde (Türkçe, İngilizce).

---

## 3. Internal test ve ilk kurulum

1. **Test edin ve yayınlayın → Test → Dahili test**
2. **Test kullanıcıları** sekmesi → e-posta listesi oluştur → hesap sahibinin
   kendi Gmail adresini ekle → kaydet
3. **Sürümler** sekmesinde `1.0.0 (2)` taslak sürümü duruyor →
   **Sürümü düzenle → İncele → Dahili teste sun**
4. Sayfadaki **katılım bağlantısını** kopyala, telefonda aç, "Testçi ol" de,
   sonra Play Store'dan kur

Bu kurulum aynı zamanda projenin yapılacaklar listesindeki en değerli maddeyi
kapatıyor: oyunu gerçek bir cihazda oynamak.

**Telefonda bakılacaklar:**
- Dokunmatik kumanda parmağa göre mi
- Dikey ve yatayda oyun kesiliyor mu (çevirince devam etmeli)
- Uçak modunda açılıyor mu (açılmalı — oyun tamamen paketin içinde)
- Geri tuşu: oynarken duraklatmalı, duraklamışken menüye, başlıkta çıkmalı
- Sesler ve müzik kulaklıkla

---

## 4. Üretime çıkarma (sonra)

Dahili testte sorun yoksa: **Üretim → Yeni sürüm oluştur → aynı paketi seç
→ İncele → Üretime sun**. İlk üretim sürümü için Play birkaç gün inceleme
yapıyor.

---

## 5. Sorun çıkarsa

- **"Bu sürüm numarası zaten kullanılmış"** → paket GitHub Actions'tan
  üretiliyor, numarayı Play'e sorup kendisi artırıyor; konsoldan elle paket
  yükleme.
- **Mağaza metni yanlış görünüyor** → metinler depodaki `docs/MAGAZA.md`
  dosyasından geliyor; elle düzeltme, orada düzeltilip tekrar yüklenmeli.
- **İzin hatası (403)** → servis hesabının (`pengu-publisher@...`) iki izni
  olmalı: *Test kanallarına sürüm yayınla* ve *Mağaza kaydını düzenle*.

Sürüm güncellemesi her zaman tek düğme:
**GitHub → meloshemo/cld → Actions → "Play'e yükle" → Run workflow**
(sürüm adını yaz, versionCode'u boş bırak.)
