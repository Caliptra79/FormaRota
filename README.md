# FormaRota Solo v19 — Düzenli sayfalar, yerel kullanım

## Yeni ekranlar

- Ana Sayfa — günlük kalori/protein, kahvaltı, su, yürüyüş, kısa yollar
- Beslenme → Günlük — öğün seçimi, beslenme toplamları ve öğün kayıtları
- Beslenme → Akşam — yemek önerisi / porsiyon ayarı / yedim onayı
- Beslenme → Besinler — besin arama, barkod ve kendi besinini ekleme
- Beslenme → Tarifler — pişmiş yemek hesaplayıcı
- Fitness → Antrenman — 13 hareket / 3 set, 15 GIF, zamanlayıcı ve hafta planı
- Fitness → Geçmiş — kaydedilen antrenman seansları
- Gelişim — kilo takibi, 14 günlük eğilim, haftalık makrolar, kişisel rekorlar
- Ayarlar — tema seçimi, JSON yedek alma ve geri yükleme

Her ekranın kendine ait `#/...` adresi vardır; uygulama çevrimdışı da bu rotalarla çalışır.

## Firebase/hesap kalıntıları

Uygulamada Firebase SDK, Firebase config, giriş/üyelik, bulut senkronizasyonu ya da Firebase'e veri aktaran kod yoktur. Önceki sürümden kalan bulut/hesap bilgilendirme şeridi kaldırıldı. Tek cihazdaki kayıtlar localStorage'dadır; kişisel GIF yüklemeleri ayrıca IndexedDB'de saklanır. Open Food Facts araması isteğe bağlı çevrimiçi besin aramasıdır, hesap servisi değildir.

## Güncelleme ve kayıtların korunması

1. Güncellemeden **önce** eski uygulamadan JSON yedeği indir.
2. ZIP arşivini aç. Tüm dosya ve `assets` klasörünü GitHub Pages deponun **köküne** yükle. `index.html`, `sw.js`, `manifest.webmanifest` eski sürüm dosyalarının üstüne yazılmalı. ZIP'i dosya olarak koyma.
3. `sw.js` v19 önbelleğine geçer; eski önbellekleri etkinleştirme sırasında temizler. iPhone'da eski ekranı görürsen Safari'de siteyi yenile ve uygulamayı kapatıp yeniden aç.
4. Aynı GitHub Pages adresinde kalırsan aynı Safari web veri alanındaki eski kayıtlar korunur. Farklı alan adına veya farklı iPhone ana ekranı kurulumuna geçersen yerel verinin otomatik taşınması garanti edilmez, JSON yedeğini geri yükle.
5. **Yerel veriyi veya Safari web sitesi verilerini silme**: JSON yedeği olmadan kayıtlar kaybolabilir.

## Notlar

Kullanıcının ilettiği 15 GIF pakettedir; telif hakkı sahibi değilsen görüntüleri herkese açık depoya yüklemek için gerekli dağıtım iznine sahip olduğunu doğrula. Hareket listesi ve düzeni değiştirilmedi.

# FormaRota Solo v17 — iPhone odaklı PWA

## Kurulum
1. ZIP dosyasını açın ve **içindeki dosyaları** bir GitHub Pages deposunun köküne yükleyin (`index.html` kökte olmalı; `assets/` klasörünü unutmayın).
2. GitHub → Settings → Pages → Deploy from a branch → main / (root).
3. iPhone Safari'de HTTPS adresinizi açın → Paylaş → Ana Ekrana Ekle.
4. Kayıtların aynı uygulama alanında kalması için uygulamayı hep ana ekran simgesinden açın. ZIP'i doğrudan açmak kalıcı PWA kurulumu değildir.

## Modüller
- **Ana sayfa**: günlük kalori/protein, kahvaltı/öğün/yürüyüş kontrolü, su (+/- 250 ml), elle yürüyüş mesafesi, yedek uyarısı.
- **Beslenme**: önceki öğün/tarif/besin arama ve haftalık kayıtlar; akşam önerisini önce planla, gramları düzelt, sonra 'Yedim' diyerek kaydet.
- **Fitness**: 13 hareket x 3 set, alternatifler, kullanıcının sağladığı 15 hareket GIF’i, odak modu, set sonrası 90 sn (veya ayarlanan) dinlenme zamanlayıcısı, çarşamba basketbol; haftalık 2/3 gün seçeneği.
- **Gelişim**: kilo, haftalık özet, grafikler, kişisel rekorlar ve yedekler.
- **Veriler**: yalnızca aynı cihazda/aynı PWA içinde localStorage. Hesap yok, Firebase yok, otomatik senkronizasyon yok.

## Güvenlik ve yedek
- Gelişim → Yedeği indir (JSON). Haftada bir iCloud Drive/Dosyalar'a aktarılması önerilir.
- Yedeği içe aktar: önce kaydın içeriğini önizler; ayrı 'Kurtarma yedeğini indir' düğmesiyle mevcut verileri kaydettirir, ardından geri yüklemeyi açar.
- v14 dahil eski yedek dosyaları desteklenir. Eski yedeklerde olmayan su/yürüyüş alanları boş başlatılır.
- Depolama Safari/iOS tarafından temizlenirse yedek olmadan kayıtlar kurtarılamaz.
- iOS arka planda JS zamanlayıcılarını durdurabilir. Geri sayım Date.now üzerinden hesaplanır; arka plan bitişinde kesin alarm/ses garanti edilmez.

## Notlar
- Makro, kalori ve akşam menüsü değerleri yaklaşık; kişisel tıbbi öneri değildir.
- Hareket GIF’leri kullanıcının yüklediği Görseller.zip dosyasından alınmıştır; FitnessProgramer hareket kaynak bağlantıları ayrıca korunur.
- Çevrimdışı PWA dosyaları service worker ile saklanır. Paketli ürün araması için internet gerekir.
- Bir GitHub Pages yolunu/alan adını değiştirmek tarayıcının veri alanını değiştirebilir; taşınmadan önce JSON yedeği alın.

## Hareket GIF’leri (v17)
- Kullanıcının yüklediği `Görseller.zip` dosyasındaki **15 hareket GIF’i** ilgili 13 hareket ve iki alternatifine birebir yerleştirildi.
- **Fitness → Hareket sırası** ve **odak modunda** GIF’ler internet olmadan çalışır; ilk HTTPS ziyaretinde PWA önbelleğine alınır.
- Seated Cable Row / Dumbbell Row ve Pec Deck Fly / Incline Dumbbell Fly alternatifleri ayrı GIF kullanır.
- Önceden telefondan elle bir GIF yüklediysen o GIF, pakettekinin üstünde görünür. **Paket GIF’ine dön** seçeneğiyle geri dönebilirsin.
- Telefona özel sonradan yüklediğin GIF dosyaları JSON yedeğine eklenmez. Paketteki 15 GIF ise ZIP içinde gelir; ayrıca yüklemen gerekmez.
- **Paylaşım/telif:** Sağlanan görseller üçüncü taraf eserleri olabilir. Herkese açık GitHub Pages deposuna veya sunucuya yüklersen URL’ye erişen herkes GIF dosyalarını indirebilir. Yayımlamadan önce kullanım/dağıtım hakkını doğrula; yalnızca kişisel kullanımın olması herkese açık dağıtımı otomatik yetkili kılmaz.

## Kaynak arşiv eşleştirme
Ayrıntılı liste: `GIF_ESLESTIRME.md`.


## v18 — Yeni uygulama simgesi
FormaRota FR simgesi, PWA 192/512 px ve iPhone ana ekran simgesi güncellendi. Uygulama içindeki marka simgesi de eşitlendi. Mevcut kayıt anahtarları değişmedi.

## v20 — Öğün kartları ve kare animasyonlar
- Beslenme ekranındaki öğle, akşam, ara öğün kartından besin arayıp kaydet.
- Kaydedilen öğün günün kalori ve protein toplamını günceller.
- Ayrı Besinler sekmesi kaldırıldı; arama yemek ekranında açılır. Kişisel besin oluşturma Tarifler bölümünde durur.
- Hareket GIF alanları kare olarak gösterilir.
- Mobil tarih taşmaları giderildi ve gereksiz üst ayar butonu kaldırıldı.
- Eski cihaz kayıtları ve yedek formatı aynen korunur.

## v21
12 özellik: geçmiş besin tekrar kaydı, kalan makrolar, 3 akşam önerisi, son antrenman setleri, hareket grafikleri, 7 ölçüm ortalamalı kilo grafiği, alışkanlık takvimi, dinlenme sayacı, vücut ölçüleri, porsiyon hesaplama, uyku/enerji ve haftalık rapor. Yeni veriler `formarota-measurements-v1`, `formarota-sleep-energy-v1`, `formarota-rest-by-exercise-v1`; v20 anahtarları aynı kaldı. JSON yedek v6 yeni alanları içerir, v20 yedekleri içe alınır. iPhone arka planda ses/titreşim garanti edilmez.
