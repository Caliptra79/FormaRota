# FormaRota Solo v30 — Personal Trainer

Türkiye odaklı beslenme, Full Body antrenman ve gelişim takip PWA'sı. GitHub Pages üzerinden çalışır, hesap veya ücretli AI API'si gerektirmez. Antrenman kayıtları cihazda tutulur.

## v30 · Personal Trainer

Onaylanan beş özellik **mevcut Fitness ve Gelişim ekranlarına** entegre edildi; yeni alt menü sekmesi eklenmedi.

1. **Akıllı ağırlık önerisi:** Hareket seçeneği başına iki tamamlanmış 3 setlik antrenmanı inceler. İki sefer üst tekrar aralığına aynı yükte ulaşılmışsa küçük yük artışını *değerlendirmeni* önerir. Veriler azsa bekler, teknik veya tekrar hedefi yeterli değilse artırmayı önermez. Makine/dambıl seçenekleri ayrı tutulur; vücut ağırlığı hareketlerine rastgele kg eklenmez. Artış kademesi: 1 / 2,5 / 5 kg.
2. **Haftalık antrenör planı:** Var olan 2–3 günlük Full Body sıklığını kullanır. Çarşamba basketbol için ayrılır. Henüz bir takvim seçilmediyse günler öneri olarak gösterilir, kaydedilmiş plan gibi değerlendirilmez. Kaçırılan, seçilmiş bir gün için uygun boş tarih yalnızca *önerilir*; takvim otomatik değişmez.
3. **Hareket gelişim analizi:** Mevcut gelişim grafiğinin altında karşılaştırılabilir seans, ağırlık, toplam dış yük × tekrar ve değişim bilgilerini gösterir. Hareket alternatifleri ayrıdır.
4. **Haftalık antrenör raporu:** Gelişim → Detaylı Analizler → Haftalık kişisel rapor alanında 2–3 kısa koç yorumu gösterir. Önceki haftanın raporu, gelecek tarihteki kayıtları kullanmaz.
5. **Teknik ipuçları:** 13 hareketin tümünde, mevcut GIF'lerin yanında istenirse açılan kısa teknik notlar. İki alternatif hareketin özel ipuçları da var.

Her öneri **yerel ve kural tabanlıdır**. Kamera analizi yapmaz, egzersiz formunu canlı olarak değerlendirmez, uygulama hiçbir antrenmanı, tekrar hedefini veya ağırlığı kendiliğinden değiştirmez.

## Mevcut ekranlar

- **Ana:** Günlük kalori ve protein özeti; öğün kısayolları; su ve yürüyüş.
- **Beslenme:** Kahvaltı hızlı kaydı / geri alma, yemek arama, öğün geçmişi, akşam menüsü önerileri ve tarifler.
- **Fitness:** 13 ana hareket, 2 alternatif GIF, üçer set, tekrar, ağırlık, zamanlayıcı ve yeni koç kartı.
- **Gelişim:** Kilo, ölçüler, hareket grafikleri, alışkanlıklar, uyku ve haftalık rapor; açılır detaylar.
- **Ayarlar:** Yedi tema (Gece, Okyanus, Gün Işığı, Kum, Neon Mor, Volt, Sunset) ve JSON yedekleme.

## Veriler ve uyumluluk

- Mevcut yerel depolama anahtarları, 13 hareketlik program, GIF dosyaları, kayıt biçimleri, hesaplamalar ve temalar korunur.
- Yeni tek tercih `formarota-coach-increment-v1` (`1`, `2.5` veya `5`); mevcut diğer veriler yalnızca okunur.
- JSON yedeği biçimi v7'ye yükseltildi: koçluk ağırlık kademesi de yedeklenir. Eski v6 yedekleri içe alınabilir. Üç yeni hype temanın geri yüklemesi desteklenir.
- İnternet bağlantısı olmadan kullanım için koçluk JS/CSS dosyaları v30 Service Worker önbelleğine eklendi; GIF'ler ayrı, hata toleranslı önbelleğe alınır.
- Telefonun site verilerini silme veya PWA'yı kaldırma işlemlerinden önce **Ayarlar → JSON yedeği** al.

## Geliştirici testleri

```bash
node --test tests/coach-v30.test.cjs
```

Bu testler öneri/tekrar eşikleri, eksik kayıtlar, makine/dambıl ayrımı, vücut ağırlığı, basketbol günü, ertelenen antrenman ve tarihi haftalık rapor davranışlarını kontrol eder.

Yayın: GitHub Pages, `main` dalı / depo kökü. Gerçek iPhone Safari deneyimi, uygulama güncellendikten sonra cihazda ayrıca doğrulanmalıdır.
