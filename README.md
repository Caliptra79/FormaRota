# FormaRota Solo v22 — PWA bakım ve güvenilirlik

Bu sürüm v21'in **beslenme, antrenman, gelişim, yerel kayıt ve 15 hareket GIF'i** özelliklerini korur.

## Sayfa yapısı
- Ana Sayfa: günlük özet ve hızlı işlemler
- Beslenme: günlük öğün kayıtları, akşam planı, tarifler
- Fitness: antrenman, hareket GIF'leri, set geçmişi ve zamanlayıcı
- Gelişim: kilo, takvim, analizler, uyku, vücut ölçüleri, raporlar
- Ayarlar: hedefler, görünüm ve JSON yedekleme

## v22 bakım düzeltmeleri
- Service worker'da temel HTML önbelleği zorunlu; GIF ve ikon önbelleği hata toleranslı.
- Tek GIF yükleme hatası artık tüm çevrimdışı kurulumu bozmaz.
- Eski PWA önbellekleri güncellemede temizlenir.
- HTML uygulama sürümü güncellendi.

## Veri güvenliği
Tüm kayıtlar cihazın tarayıcı depolamasındadır. Site verilerini silmeden veya iPhone ana ekran uygulamasını kaldırmadan önce **Ayarlar → JSON yedeği** alın. GitHub Pages sitesi herkes tarafından ziyaret edilebilir; kişisel kayıtlar depoya yüklenmez. iOS Safari çevrimdışı davranışı gerçek cihazda ayrıca doğrulanmalıdır.

## GitHub Pages
Ana dal `main`, yayın klasörü depo kökü `/` olacak şekilde Pages ayarlanmalıdır. `assets/` klasöründeki 15 GIF'in isimleri korunmalıdır.
