# FormaRota Solo v26 — sade arayüz, set odaklı fitness

Kişisel kullanıma yönelik, GitHub Pages üzerinde çalışan, hesap veya Firebase gerektirmeyen beslenme ve antrenman takip PWA'sı.

## Ekranlar
- **Ana sayfa**: günlük kalori/protein, öğün kısayolları, su ve yürüyüş.
- **Beslenme**: öğün kayıtları, kalan hedef, akşam planı ve tarifler.
- **Fitness**: 13 ana hareket (2 alternatif seçeneği), 3 set, tekrar, ağırlık ve dinlenme sayaçları. Hareket adları büyütüldü. Görsel yükleme, GIF önizlemesi ve kaynak GIF düğmeleri arayüzden kaldırıldı.
- **Gelişim**: kilo, ölçüler, grafikler, alışkanlık takvimi ve haftalık rapor; isteğe bağlı açılır alanlar.
- **Ayarlar**: görünüm, hedefler ve JSON yedekleme.

## v26 tasarım değişiklikleri
- Gece, Okyanus, Açık ve Kum temaları korundu; renkler sakinleştirildi ve kontrast yükseltildi.
- En önemli sayılar ve hareket isimleri büyütüldü; kartlar ve alt menü sadeleştirildi.
- Alt menü ikonları renkli emoji yerine tek renk çizgi ikonlarla değiştirildi.
- Fitness görünümünden GIF yükleme, silme, gösterim ve harici GIF bağlantıları kaldırıldı. Antrenman alternatifleri, set/tekrar/ağırlık kayıtları ve zamanlayıcılar korunuyor.
- Fitness ana akışında sayaç ve hareket kartları ön planda; haftalık plan, önceki kayıtlar ve harekete özel sayaç ayarları açılır bölümlere alındı.
- PWA çevrimdışı önbelleği artık 15 GIF dosyasını indirmiyor. Önceki `assets/*.gif` dosyaları depoda **geri dönüş amacıyla korunmuştur**; bu sürümde kullanılmaz.

## Kayıt güvenliği
Kayıtlar cihazdaki yerel depoda tutulur; Firebase veya hesap senkronizasyonu yoktur. v21–v25 besin, antrenman ve diğer kayıt anahtarları değiştirilmemiştir. Veri kaybına karşı güncellemeden önce **Ayarlar → JSON yedeği** alın. Kişisel GIF'lerin eski IndexedDB depolaması otomatik silinmez, ancak v26 tarafından gösterilmez veya kullanılmaz.

## GitHub Pages
`main` dalı, depo kökü (`/`) yayın kaynağı olmalı. Manifest, Service Worker, ikonlar, ana HTML, `assets/ui-compact-v23.*`, `assets/progress-compact-v25.*` ve `assets/*-v26.*` dosyaları birlikte yayınlanmalıdır.

## Doğrulama
Kod bütünlüğü, responsive fitness set yerleşimi, set kaydı, dinlenme başlatma ve odak modu Chromium ortamında kontrol edilmiştir. Gerçek iPhone Safari'de görünüm ve arka planda çalışan ses/titreşim ayrıca kullanıcı tarafından doğrulanmalıdır.
