# FormaRota Solo v33 — Personal Trainer güvenilirliği + sade tasarım

## Geliştirme dalında: Türk yemekleri ve kişisel akşam önerileri

- **84 yeni Türk yemeği** `assets/turkish-foods.js` içinde, 100 g pişmiş/servis edilmiş yemek için **tahmini** kcal/protein/karbonhidrat/yağ içerir. Bunlar TürKomp'tan kopyalanmış veya laboratuvarda doğrulanmış veriler değildir. Tarif, yağ miktarı ve pişirme yöntemi sonucu değiştirebilir.
- Mevcut yerel arama, kişisel tarifler, kahvaltı, kayıtlar ve Open Food Facts ayrı kalır. Yeni kayıtlar `tr-*` kimlikleri ile eklenir. Önceki veriler dönüştürülmez veya otomatik değiştirilmez.
- Akşam menüleri 5'ten 20'ye çıkarıldı. `assets/dinner-coach.js` bugünün kaydedilmiş bütün öğünlerini ve kalan kalori/protein hedeflerini kullanır. Porsiyonları temkinli şekilde ölçekler, son 7 gündeki benzer akşam yemeklerine öncelik düşürür ve neden seçtiğini kısa metinle açıklar.
- İsteğe bağlı **et ve balık içermeyen menüler** tercihi vardır. Bu, alerjen/cross-contact garantisi değildir.
- Hızlı üç öneriden seçilen menü **aynı porsiyonuyla** akşam planına yazılır; kullanıcı gramajı yeniden değiştirebilir. Planlanmış yemek, `Yedim` onayından önce günlük toplamda sayılmaz.
- Akşam için çok az kalori hedefi kaldığında uygulama gereksiz tam menü önermemeyi tercih eder; bu bir tıbbi beslenme kararı değildir.
- Eski program, tüm GIF'ler, temalar, mevcut kayıt biçimi ve teknik sürüm etiketlerini kullanıcıdan gizleme kararı korunur.

Test: `node --test tests/*.test.cjs`. Otomatik testler gerçek iPhone Safari dokunma/önbellek doğrulamasının yerini tutmaz. Kullanıcı verileri telefondadır; mevcut uygulamayı kaldırmadan veya site verilerini temizlemeden önce JSON yedeği alın.

Türkiye odaklı beslenme, Full Body antrenman ve gelişim takip PWA'sı. GitHub Pages üzerinden çalışır, hesap veya ücretli AI API'si gerektirmez. Antrenman kayıtları cihazda tutulur.

## Koçluk önerilerinde yeni doğruluk kontrolleri

- Aynı gün içinde iki tam hareket seansı kaydedilse bile artış hesabı **iki ayrı antrenman günü** bekler. Aynı tarihteki birden fazla tam kayıttan sonuncusu seçilir.
- İki farklı günde aynı ağırlıkla tüm setlerde üst tekrar sınırına ulaşmak hâlâ yalnızca **isteğe bağlı** artış değerlendirmesi üretir.
- Seçilen 1 / 2,5 / 5 kg artış kademesi mevcut çalışma ağırlığının **%10'undan büyükse**, koç artışı önermek yerine bu kademenin çok büyük olduğunu belirtir. %10 burada uygulamanın temkinli kuralıdır; kişiye özel klinik sınır veya ekipman uygunluğu garantisi değildir. Artış büyüklüğü sessizce değiştirilmez.
- Fitness set kayıtlarında **boş kg** alanı makine/dambıl hareketi için kaydedilmez; önce açıkça kg girilmesi istenir. Gerçekten 0 kg ise kullanıcı **0** yazabilir. Vücut ağırlığı calf raise için boş kg, önceden olduğu gibi 0 olarak kaydedilebilir.
- Eski antrenman verileri, hareketler, görseller, temalar, yemekler ve JSON yedekleri **değiştirilmez**. Personal Trainer'ın mevcut 28 günlük veri güncelliği, hareket alternatifi ayrımı ve açıklanabilir öneri alanı korunur.
- Yeni koç motoru: `assets/coach-engine-v35.js`; uygulama kullanıcı arayüzünde sürüm gösterilmez.

Tekrarlanabilir test: `node --test tests/coach-precision.test.cjs`. Diğer koçluk / arayüz / yedekleme regresyonları dahil toplam **78** test kontrolü.

### Gerçek geçmişe göre kişiselleştirme

İleri kişisel kalibrasyon için telefondaki yalnızca `fitness.history` kayıtlarının ayrıca incelenmesi gerekir. Uygulama bu yerel verilere uzaktan erişmez; beslenme veya kilo bilgilerini göndermek gerekmez. Koçluk motoru teknik, ağrı ve RPE/RIR ölçümü yapmaz.

## Uygulamada sürüm etiketi yok

FormaRota'nın kullanıcıya görünen web başlığı ve telefona kurulum adı sürüm numarası taşımaz: **FormaRota Solo** / **FormaRota**. JSON yedeğini içe aktarma ekranındaki teknik şema sürümü kullanıcıya gösterilmez; yedek dosyasındaki `version` alanı ve eski yedek uyumluluğu korunur. Teknik yayın sürümleri ve PWA önbellek etiketleri yalnızca kaynak kodu/GitHub takibi içindir.

## v33 · Temkinli ve açıklanabilir Personal Trainer

Bu sürüm, kullanıcının onayladığı altı kalite iyileştirmesini uygular; 13 hareket, 15 GIF, yedi tema, beslenme/fitness verileri, JSON yedek sistemi ve Full Body programı değiştirilmez.

1. **Haftalık rapor tutarlılığı:** Hem eski genel rapor, hem Personal Trainer raporu aynı tam Full Body doğrulamasını kullanır. Tam Full Body için 13 hareket × 3 geçerli set gerekir. Haftalık 2 veya 3 *gün* hedefi, farklı tamamlanmış takvim günlerinden hesaplanır. Aynı gün iki seans kaydı ayrı tutulur ama hedefe yalnızca bir gün olarak katkı yapar.
2. **Temkinli güncellik:** Aynı hareket alternatifi için iki tam, karşılaştırılabilir kaydın en fazla 28 gün arayla yapılmış olması; son tamamlanmış kaydın değerlendirme tarihine göre en fazla 28 günlük olması gerekir. Daha eski verilerden artış üretilmez, güncel yeniden değerlendirme önerilir. Geçmiş haftalık raporlar seçilen haftanın sonuna kadar olan kayıtları kullanır.
3. **Veri doğrulaması:** Boş, uygunsuz veya sınır dışı kilogram/tekrar kayıtları otomatik 0 kg sayılmaz. Kullanıcının geçmiş kaydı değiştirilmez ve geçersiz son denemeden ağırlık artırma önerisi verilmez. Atlanmış hareket, başarısız hareket olarak değerlendirilmez.
4. **Haftalık plan:** Hedef 2 veya 3 günün tamamı seçilmeden plan `hazır` değildir; eksik plandan “antrenman kaçırıldı” uyarısı türetilmez. Çarşamba basketbol günü korunur. Telafi tarihleri otomatik uygulanmaz.
5. **Açıklanabilir öneriler:** Hareket kartlarındaki “Bu öneri neden verildi?” açılır alanı iki karşılaştırılabilir seansın tarih, ağırlık ve tekrarlarını; veri durumunu ve sınırları gösterir. Koç teknik, ağrı ve gerçek zorlanmayı ölçemez; hiçbir ağırlığı kendiliğinden değiştirmez.
6. **Alternatifler ve rapor:** Cable/Dumbbell Row ve Pec/Incline Dumbbell Fly geçmişleri ayrı değerlendirilir. Haftalık koç notları yalnızca rapor haftasında gerçekten çalışılmış hareketlerin alternatifi üzerinden oluşturulur.

### v33 doğrulama

```bash
node --test tests/coach-v33.test.cjs tests/coach-v33-ui.test.cjs tests/coach-v33-integration.test.cjs
node --test tests/coach-v30.test.cjs tests/coach-v31.test.cjs tests/refinement-v32.test.cjs tests/refinement-v32-dom.test.cjs
```

Yeni v33 testleri: 23 motor senaryosu, 4 UI davranışı, 7 kaynak/rapor/PWA entegrasyonu. Geçmiş sürümlerin 24 regresyon testi ayrıca çalıştırılır. Gerçek iPhone Safari görüntüsü ve dokunmatik kullanım bu ortamdan doğrulanamaz, cihazda kontrol gerekir.

v33 dosyaları: `assets/coach-engine-v33.js`, `assets/coach-ui-v33.js`, `assets/coach-quality-v33.css`. PWA çevrimdışı shell + GIF cache sürümü v33'e yükseltildi. Önceki koç motoru, tarihsel testler için repoda tutulur.

## v32 · Tasarım ve sadelik

Kullanıcının özellikle istediği gibi **GIF'ler büyük kalır**: telefonlarda kare görsel en fazla 240 px, daha geniş ekranda 138 px. Hiçbir hareket veya GIF kaldırılmaz.

- **Fitness:** Görsel boyutları aynı; set/dinlenme kontrolleri ve tipografi daha tutarlı. Haftalık planın açılır alanı, koç özetiyle yan yana sıralamaya alınır; düğmeye basınca 13 hareketin sonuna atlamaz.
- **Beslenme:** Tüketilen ve kalan kalori/protein aynı panelde. Planlı kahvaltı ve öğün kısayolları yukarıda, uzun kahvaltı açıklamaları açılır alanda. Mevcut arama/öğün kayıtları korunur.
- **Ana ekran:** Kalori/protein bir bakışta öne çıkar, su/yürüyüş izleyicileri ve üç sık kullanılan öğün düğmesi daha belirgindir.
- **Gelişim:** Kilo/hedef/değişim sayıları üstte; veri girişi ve isteğe bağlı profil alanları altta. Grafikler ve raporlar kaldırılmadı.
- **7 tema:** Gece, Okyanus, Gün Işığı, Kum, Neon Mor, Volt, Sunset korunur. Ortak köşe, boşluk, erişilebilir odak ve düğme stili güncellendi. Temel renkler değiştirilmedi.
- **Altyapı:** Eski, kullanılmayan odak-modu CSS ve genel GIF gizleme kuralı kaldırıldı. Yeni düzenleme yalnızca DOM yerleşimi ve stil içerir; veri anahtarları ve hesaplamalar değişmez.

Çevrimdışı önbellek **v32** olarak yenilendi. Yeni dosyalar: `assets/refinement-v32.css`, `assets/refinement-v32.js`.

## v32 testleri

```bash
node --test tests/refinement-v32.test.cjs
node --test tests/coach-v30.test.cjs tests/coach-v31.test.cjs
```

Yerleşim kodu için DOM simülasyonu: Beslenme hedefi, kahvaltı katlama, kilo istatistikleri ve Fitness planı yerleşimi kontrolleri. Ayrıca 7 temanın metin/düğme kontrastı ve 320/350/375/390/430/620/640/768/1024 px hedefli CSS kuralları denetlenir. **Gerçek iPhone Safari ve gerçek tarayıcı ekran görüntüsü** ek ayrıca test gerektirir; mevcut ortamda otomatik son kullanıcı Safari oturumu kullanılamaz.

## v31 · Koçluk güvenilirliği ve arayüz düzeltmeleri

- Son karşılaştırılabilir seans yarım veya durdurulmuşsa ağırlık artışı ertelenir.
- Yalnızca 39/39 tamamlanmış setli, `finished` durumlu seanslar tam Full Body sayılır; diğerleri eksik/yarım seans olarak ayrıca belirtilir. Bütün kaydedilmiş set sayıları gösterilir.
- Ağırlık artış kademesi değişince hareket kartı önerileri de anında yeniden hesaplanır.
- Sıfır kilogram yalnızca tanımlı vücut ağırlığı hareketleri için kullanılır; makine egzersizlerinde 0 kg'dan artış çıkarılmaz.
- Gelişim grafiğinde seçenekli hareketler makine/dambıl seçimine göre filtrelenir; koçluk analizi aynı seçenekle eşleşir.
- Fitness üstündeki tekrar eden tanıtım paneli ve gereksiz hareket açıklamaları gizlendi. GIF, hareket, tekrar, kilogram ve sayaç alanları korunur.
- Tekrarlanabilir regresyon testleri: `node --test tests/coach-v30.test.cjs tests/coach-v31.test.cjs`.

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
