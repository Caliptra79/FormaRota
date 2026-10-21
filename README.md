# FormaRota — marka ve tema sürümü v13

**Uygulama adı:** FormaRota  
**Slogan:** Kendi ritmin, kendi rotan.  
**Temalar:** Gece · Lime, Okyanus · Turkuaz, Gün ışığı · Yeşil, Kum · Bakır. Tema seçimi cihazda saklanır; kişisel kayıtlarla karışmaz.

## Önemli: yükseltme ve mevcut verileri koruma

- Uygulamayı daha önce GitHub Pages'te yayınladıysan **aynı repository ve aynı URL** üzerinde tüm dosyaları güncelle. Repo adını değiştirirsen önce JSON yedeği al; tarayıcıdaki yerel kayıtlar alan adı / yol değişiminde kendiliğinden taşınmaz.
- Veri kaybını önlemek için önce JSON yedek indir. İç yerel veri anahtarları (kocluk-...) **bilerek değiştirilmedi**, bu bir hata değil: eski kayıtlar yeni sürümde açılabilsin diye.
- Firebase kullanmak zorunlu değil; yapılandırılmamışken uygulama yerel çalışır. Canlı Firebase projesi henüz bağlı değildir.
- GitHub Pages için ZIP içeriğini çıkartıp dosyaları repository kök dizinine yükle; ZIP'i tek başına yükleme.
- Bu sürümde tema seçimi anında değişir, kullanıcı tercihi aynı cihazda kalır; Firebase üzerinden eşitlenmez.

## Kurulumun durumu

- Bu ZIP yayına hazır **statik site dosyalarını** ve Firestore kurallarını içerir.
- Kullanıcı GitHub hesabında bir repository oluşturmalı, Settings → Pages üzerinden ana branch/root seçmeli.
- Firebase tarafında proje oluşturulup Authentication, Firestore ve güvenlik kuralları etkinleştirilmeli.
- Firebase web yapılandırmasını uygulamadaki bulut alanına yapıştır; admin/service-account özel anahtarlarını asla paylaşma.
- Telefon ve PC arasında canlı senkronizasyon ancak gerçek projeyle test edilebilir.

---

# FormaRota v13 — Beslenme + Fitness + Firebase

## Kurulum (0 TL başlangıç)

1. https://console.firebase.google.com/ adresinden **Spark (ücretsiz)** planında bir proje açın. Ücretli Blaze planına geçmek gerekli değildir.
2. Build → Authentication → Sign-in method → **Email/Password** sağlayıcısını açın.
3. Build → Firestore Database → **Create database** → bir bölge seçin. Production mode seçin. Firestore **Rules** sekmesine paket içindeki `firestore.rules` içeriğini yapıştırıp Publish edin. **Test mode kurallarıyla bırakmayın.**
4. Project settings → Your apps → **Web** uygulaması ekleyin. `firebaseConfig` içindeki `apiKey`, `authDomain`, `projectId`, `appId` (ve diğer web alanları) JSON'unu kopyalayın.
5. Authentication → Settings → Authorized domains kısmına GitHub Pages alan adınızı (`kullanici.github.io`) ekleyin; proje varsayılan alanlarına güvenmeyin.
6. GitHub Pages'e paket dosyalarını kök klasörde yayınlayın; uygulama açılınca **☁️ Hesap ve bulut senkronizasyonu** bölümünü açın, JSON'u yapıştırıp kaydedin. Dilerseniz `cloud-config.js` içinde `window.COACH_FIREBASE` değerini doldurabilirsiniz.
7. E-posta/şifreyle hesap oluşturun, giriş yapın. İkinci cihazda aynı GitHub Pages adresini açıp aynı hesapla giriş yapın.

## Yerel kayıtlardan geçiş / v11 Supabase

- **ÖNEMLİ:** v11 Supabase hesabı açıksa v12 yüklemeden önce v11 içinden JSON yedek indir. Oturumdaki v11 yerel kayıtları, yeni Firebase hesabına otomatik aktarılmaz. v12 içinde JSON yedeğini içe aktar; ilk girişten önce yedeğini sakla. V11 Supabase hesabı silinmez veya etkilenmez.
- v11 Supabase hesabındaki veriler **otomatik olarak Firebase'e taşınmaz**. V11'in JSON yedeğini dışa aktarın ve v12'nin yedek içe aktarma bölümünden alın. Öncesinde v12'deki verileri JSON olarak yedekleyin.
- İki cihazda farklı sürüm tespit edildiğinde otomatik üzerine yazılmaz; açık seçim ve kurtarma arşivi vardır.

## Veri güvenliği / limitler

- Her kullanıcı yalnızca `coaching_snapshots/{kendi UID}` belgesine erişebilir. Firestore Security Rules zorunlu.
- Bu **istemci tarafı / senkronize bütün uygulama durumunu taşıyan tek belge** tasarımıdır. Firestore'un 1 MiB belge üst sınırı vardır; çok uzun süreli büyüyen kayıtlarda parçalı belge mimarisine geçmek gerekir.
- Eşitleme önce uzaktaki revizyonu kontrol eder, yazma `runTransaction` ile revizyon doğrulayarak yapılır.
- Eşitlemeler internet varsa yapılır; internet yoksa kayıtlar tarayıcıda kalır. Hesap açık kalırken tarayıcı verisini silmek çevrimdışı değişiklikleri yok edebilir.
- Çakışma halinde sürümleri otomatik birleştirme yoktur; tercih edilen sürüm seçilir, önceki sürüm yerel kurtarma arşivine alınır.
- Supabase için hazırlanmış eski bilgiler v12'de kullanılmaz; Firebase hesabı ayrı olacaktır.
- JSON yedeklemeyi düzenli kullanın. Spark planında yönetilen otomatik yedekleme hizmetlerini ücretsiz varsaymayın.
- Firebase web yapılandırması istemci tarafında görünür; Admin SDK özel anahtarı **kesinlikle** yüklemeyin.
- Otomatik e-posta doğrulama bağlantısını göndermede projeye göre kota veya izin kısıtları olabilir; e-posta doğrulaması erişim kuralı olarak zorunlu tutulmamıştır.
- Firebase projesini kullanıcının kurması gerekir; canlı bulut sunucusuna bağlanmadan uçtan uca senkronizasyon doğrulanmış sayılmaz.

## PWA

GitHub Pages altında HTTPS ile kurulur. Telefonun ve bilgisayarın aynı siteyi ve Firebase projesini kullanması gerekir. Geliştirmede file:// yerine HTTP local server kullanın.
