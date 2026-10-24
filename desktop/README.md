# FormaRota — kişisel Windows sürümü

Bu, iPhone/PWA sürümünün çevrimdışı dosyalarını Electron içinde çalışan bir Windows masaüstü uygulamasına dönüştürür. **Kişisel kullanım için ücretsizdir; satın alınmış bir kod imzalama sertifikası içermez.**

## İki dosya

- **FormaRota-Portable.exe** — kurulumsuz taşınabilir sürüm. Dosyayı Windows'ta çalıştırın; kişisel kullanım için önerilen seçenek budur.
- **FormaRota-Setup.exe** — Başlat menüsü / masaüstü kısayolu içeren kullanıcı hesabına özel kurulum; yönetici yetkisi amaçlanmaz.

İkisini de aynı anda kullanmak gerekmez. Veriler varsayılan olarak Windows kullanıcı hesabının `%APPDATA%\FormaRota` klasöründe, Chromium'un yerel depolamasındadır. Taşınabilir `.exe` dosyasını taşısanız da veriler bu klasörde kalır. Program klasörünü silmek verileri otomatik silmez; buna güvenmek yerine uygulama içinden düzenli JSON yedeği alın.

## İlk açılış

1. Windows için hazırlanan .exe dosyasını **kendi GitHub deponuzdaki** [Windows kişisel sürümünden](https://github.com/Caliptra79/FormaRota/releases/tag/windows-personal) indirin.
2. Bir kerelik Windows SmartScreen uyarısı görülebilir; sebebi sertifika satın alınmamasıdır. Kaynağı ve dosyayı doğrulamadan bu uyarıyı aşmayın. Koruma ayarlarını genel olarak kapatmayın.
3. FormaRota'nın **Ayarlar → Verilerim ve yedekleme** bölümünden veri aktarımını yapabilirsiniz.
4. Telefon uygulamasında oluşturduğunuz JSON yedeğini Windows uygulamasında içe aktarabilirsiniz. **Telefon ve Windows verileri otomatik senkronize olmaz.** Var olan kayıtları içe aktarmadan önce Windows'tan da yedek alın.

**İnternet gerektirmeyen:** Yerel Türk yemekleri, öğün kayıtları, Full Body programı, hareket GIF'leri, grafikler, kişisel tarifler, JSON yedekler.

**İnternet gerektiren:** Open Food Facts çevrimiçi ürün arama ve barkod sorgusu (veri servisinin erişimi/CORS politikalarına tabidir).

## Alternatif: hiç .exe indirmeden Windows'a kurma

Microsoft Edge ile `https://caliptra79.github.io/FormaRota/` adresini açın, menüden **Uygulamalar → Bu siteyi uygulama olarak yükle** seçeneğini kullanın. Bu resmi PWA kurulum yolu, SmartScreen'in imzasız .exe uyarısını gerektirmez; masaüstü kısayolu oluşturulabilir. Web PWA kaydı, yukarıdaki Electron uygulamasının veri deposundan ayrıdır.

## Geliştirici

Uygulamayı Windows'ta derlemek:

```powershell
npm install --no-package-lock
node desktop/build-assets.cjs
python -m pip install Pillow==11.3.0
python desktop/make-icon.py
node --test desktop/desktop.test.cjs
npm run dist:win
```

GitHub Actions `Windows personal desktop` iş akışı Windows x64 üzerinde `.exe` üretir, 30 gün saklanan build artifact yükler ve `main` dalındaki başarılı Windows derlemesini ayrıca [GitHub Releases](https://github.com/Caliptra79/FormaRota/releases/tag/windows-personal) sayfasında sunar.

### Koruma

- Uygulama `app://formarota` şeklinde **sabit, güvenli, standart** bir origin kullanır; yerel depolama bu origin üzerinde saklanır.
- Render katmanında Node.js entegrasyonu yoktur (`nodeIntegration:false`), context izolasyonu, sandbox ve web güvenliği açıktır.
- Paketlenmiş uygulama için PWA Service Worker kaydı kapalıdır; önceki çevrimdışı servis worker'ının eski dosyalar göstermesi önlenir.
- Dosyalar yalnızca paketlenmiş uygulama dizininden okunur; program dosyalarının dışına çıkmayı engelleyen yol denetimleri bulunur.
- Haricî bağlantılar uygulama içinde açılmaz; yalnızca HTTPS bağlantıları Windows'un tarayıcısına devredilir.

Bu program tıbbi tavsiye yerine geçmez; besin değerleri yaklaşık olabilir.
