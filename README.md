# FormaRota Solo v14 — Telefon için kişisel PWA

Bu sürümde **hesap açma, Firebase, Supabase ve bulut senkronizasyonu tamamen kaldırılmıştır**.

## iPhone’da kullanma
1. ZIP dosyasını açıp içeriğini **HTTPS üzerinden** yayınlayın (ör. ücretsiz GitHub Pages). `index.html`, `manifest.webmanifest`, `sw.js`, ikonlar ve `assets/` klasörü aynı dizin düzeninde kalmalı. ZIP'i doğrudan iPhone Dosyalar uygulamasında açmak, PWA kurulumunu ve bazı özellikleri sağlamaz.
2. iPhone Safari'de yayınlanan adresi açın. Paylaş → Ana Ekrana Ekle ile yükleyin.
3. Ana ekran simgesinden uygulamayı açıp kayıt girin. Dışa aktarma/içe aktarmayı **aynı ana ekran uygulamasından** kullanın. Safari sekmesi ve ana ekran uygulamasının saklama alanları farklı olabilir.
4. *Verilerim ve yedekleme* bölümünden düzenli JSON yedek indirin; iPhone Dosyalar/iCloud Drive'a kaydedin. İçe aktarma mevcut verilerin **üzerine yazar**. Önce yedek alın.
5. Uygulamayı veya Safari web sitesi verilerini silerseniz yerel kayıtlar kaybolabilir. JSON yedeği en önemli korumadır.

## Neler çalışır?
- Kahvaltı işareti (yumurta + Antep peyniri + zeytin), öğle kayıtları, akşam yemek önerileri, tarif ve kişisel besinler
- Haftalık özet, kilo eğilimi ve hedefler
- Fitness 13 hareket, 3 set, programın sabit sırası, hareket alternatifleri, GIF'ler, antrenman zamanlayıcısı, 2/3 gün seçimi (Çarşamba basket)
- 4 tema, cihaz içi veri, JSON dışa/içe aktarma

## İnternet ve güvenlik
Temel ekranlar ve paket içindeki 15 animasyon servis çalışanı (service worker) önbelleğe aldıktan sonra çevrimdışı açılır. Open Food Facts ürün/barkod sorguları ve dış FitnessProgramer bağlantıları internet gerektirir. Yerel besinler internet olmadan aranabilir. Yerel tarayıcı verileri şifreli bir kullanıcı hesabı değildir; telefona erişimi olan birisi bunlara erişebilir.

## Önceki sürümden geçiş
Önce v13 içinde **Veri doğruluğu ve kayıt → JSON dışa aktar** ile yedek alın. v14 ile aynı web adresindeki veri alanı korunursa kayıtlar okunabilir; bunun garantisi yoktur. v14'te **Yedeği içe aktar** ile taşınabilir. v11/v12 bulut kayıtları otomatik aktarılmaz.

## Kurulum testi
ZIP içeriği, JS sözdizimi, iPhone boyutunda ekran, temel yerel kayıt ve yedek işlevleri test edilmek üzere tasarlanmıştır. iPhone Safari gerçek cihaz testi ayrıca gerekir.
