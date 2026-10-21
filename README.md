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
