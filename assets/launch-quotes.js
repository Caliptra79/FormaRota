/* FormaRota opening inspiration. Brief, independently phrased Turkish translations
 * of passages in public-domain classical texts. Source + passage are retained
 * for attribution. No network access, no personal data, no extra permissions.
 */
(function(root){
 'use strict';
 const KEY='formarota-launch-last-quote-v1';
 const QUOTES=Object.freeze([
  Object.freeze({text:'Uzun bir yolculuk bile tek bir adımla başlar.',author:'Laozi',work:'Dao De Jing · 64',source:'https://classics.mit.edu/Lao/taote.2.ii.html'}),
  Object.freeze({text:'Koca bir ağaç, küçücük bir filizden büyür.',author:'Laozi',work:'Dao De Jing · 64',source:'https://classics.mit.edu/Lao/taote.2.ii.html'}),
  Object.freeze({text:'Bazı şeyler bize bağlıdır, bazıları değildir.',author:'Epiktetos',work:'El Kitabı · 1',source:'https://mouseia.org/texts/enchiridion/chapter-1'}),
  Object.freeze({text:'Büyük şeyler bir anda ortaya çıkmaz.',author:'Epiktetos',work:'Söylevler · I.15',source:'https://en.wikisource.org/wiki/Epictetus,_the_Discourses_as_reported_by_Arrian,_the_Manual,_and_Fragments/Book_1/Chapter_15'}),
  Object.freeze({text:'Dalgaların çarptığı kayalık gibi sağlam dur.',author:'Marcus Aurelius',work:'Kendime Düşünceler · IV.49',source:'https://texts.stoameditation.com/read/meditations/4/49'}),
  Object.freeze({text:'Zihin, önündeki engeli yeni bir adıma dönüştürebilir.',author:'Marcus Aurelius',work:'Kendime Düşünceler · V.20',source:'https://texts.stoameditation.com/read/meditations/5/20'}),
  Object.freeze({text:'Erteledikçe hayat akıp gider.',author:'Seneca',work:'Lucilius’a Mektuplar · 1',source:'https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_1'}),
  Object.freeze({text:'Bugünün işine sarıl; yarına daha az bağımlı kalırsın.',author:'Seneca',work:'Lucilius’a Mektuplar · 1',source:'https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_1'}),
  Object.freeze({text:'Sözlerin yaptıklarının önüne geçmesin.',author:'Konfüçyüs',work:'Konuşmalar · XIV.29',source:'https://confucius-analects.org/en/books/14/29/'}),
  Object.freeze({text:'İyi bir zihne sahip olmak yetmez; onu iyi kullanmak gerekir.',author:'René Descartes',work:'Yöntem Üzerine Konuşma · I',source:'https://sourcebooks.web.fordham.edu/mod/1637descartes-method-excerpts.asp'}),
  Object.freeze({"text":"Bir adım atmadan önce, neye gücünün yettiğini hatırla.","author":"Epiktetos","work":"El Kitabı · 1","source":"https://epictetus-enchiridion.org/en/read/"}),
  Object.freeze({"text":"Seni zorlayan olay kadar, ona verdiğin anlam da önemlidir.","author":"Epiktetos","work":"El Kitabı · 5","source":"https://epictetus-enchiridion.org/en/read/"}),
  Object.freeze({"text":"Her işe, doğasını bilerek ve hazırlıklı başlayabilirsin.","author":"Epiktetos","work":"El Kitabı · 4","source":"https://epictetus-enchiridion.org/en/read/"}),
  Object.freeze({"text":"Önüne çıkanlar karşısında hangi gücünü kullanacağını düşün.","author":"Epiktetos","work":"El Kitabı · 10","source":"https://epictetus-enchiridion.org/en/read/"}),
  Object.freeze({"text":"Küçük kayıplar karşısında sakin kalmayı öğrenerek başla.","author":"Epiktetos","work":"El Kitabı · 12","source":"https://epictetus-enchiridion.org/en/read/"}),
  Object.freeze({"text":"Gelişmek istiyorsan, başkalarının övgüsüne bağımlı kalma.","author":"Epiktetos","work":"El Kitabı · 13","source":"https://epictetus-enchiridion.org/en/read/"}),
  Object.freeze({"text":"Seni inciten sözden önce, onun hakkındaki yargını gözden geçir.","author":"Epiktetos","work":"El Kitabı · 20","source":"https://epictetus-enchiridion.org/en/read/"}),
  Object.freeze({"text":"Davranış ilkelerini belirle ve her yerde onlara bağlı kal.","author":"Epiktetos","work":"El Kitabı · 33","source":"https://epictetus-enchiridion.org/en/read/"}),
  Object.freeze({"text":"Olanı değiştiremiyorsan, ona nasıl yaklaşacağını seçebilirsin.","author":"Epiktetos","work":"El Kitabı · 8","source":"https://epictetus-enchiridion.org/en/read/"}),
  Object.freeze({"text":"Büyük işleri, henüz küçükken ele almak kolaydır.","author":"Laozi","work":"Dao De Jing · 63","source":"https://classics.mit.edu/Lao/taote.2.ii.html"}),
  Object.freeze({"text":"Zor olan işe, kolay yanından başlayabilirsin.","author":"Laozi","work":"Dao De Jing · 63","source":"https://classics.mit.edu/Lao/taote.2.ii.html"}),
  Object.freeze({"text":"Önemsiz görünen adımları hafife alma; büyük değişimler birikir.","author":"Laozi","work":"Dao De Jing · 63","source":"https://classics.mit.edu/Lao/taote.2.ii.html"}),
  Object.freeze({"text":"Bir kule, toprağa konan ilk sepetle yükselmeye başlar.","author":"Laozi","work":"Dao De Jing · 64","source":"https://classics.mit.edu/Lao/taote.2.ii.html"}),
  Object.freeze({"text":"İşe başlarken gösterdiğin dikkati sonuna kadar koru.","author":"Laozi","work":"Dao De Jing · 64","source":"https://classics.mit.edu/Lao/taote.2.ii.html"}),
  Object.freeze({"text":"Yolun sonuna yaklaşınca, başlangıçtaki özenini unutma.","author":"Laozi","work":"Dao De Jing · 64","source":"https://classics.mit.edu/Lao/taote.2.ii.html"}),
  Object.freeze({"text":"Öğrendiğini düzenli olarak uygulamak da başlı başına bir sevinçtir.","author":"Konfüçyüs","work":"Konuşmalar · I.1","source":"https://mouseia.org/read/analects/trn_analects_plain"}),
  Object.freeze({"text":"Bir hata yaptığında, onu düzeltmekten çekinme.","author":"Konfüçyüs","work":"Konuşmalar · I.8","source":"https://mouseia.org/read/analects/trn_analects_plain"}),
  Object.freeze({"text":"Davranışlarında gayretli, sözlerinde ölçülü olmaya çalış.","author":"Konfüçyüs","work":"Konuşmalar · I.14","source":"https://mouseia.org/read/analects/trn_analects_plain"}),
  Object.freeze({"text":"Başkalarının seni tanımamasından önce, onları anlamayı önemse.","author":"Konfüçyüs","work":"Konuşmalar · I.16","source":"https://mouseia.org/read/analects/trn_analects_plain"}),
  Object.freeze({"text":"İlkelerini sağlam kur; geri kalan yol onlarla şekillenir.","author":"Konfüçyüs","work":"Konuşmalar · I.2","source":"https://mouseia.org/read/analects/trn_analects_plain"}),
  Object.freeze({"text":"İnsanların seni fark etmemesi, sakinliğini bozmak zorunda değil.","author":"Konfüçyüs","work":"Konuşmalar · I.1","source":"https://mouseia.org/read/analects/trn_analects_plain"}),
  Object.freeze({"text":"Zamanını koru; kaybolan saatlerini geri getiremezsin.","author":"Seneca","work":"Lucilius’a Mektuplar · 1","source":"https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_1"}),
  Object.freeze({"text":"Gününü değerli kılan, onunla ne yaptığındır.","author":"Seneca","work":"Lucilius’a Mektuplar · 1","source":"https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_1"}),
  Object.freeze({"text":"Bugünkü işine sahip çık; erteleme zamanı elinden alır.","author":"Seneca","work":"Lucilius’a Mektuplar · 1","source":"https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_1"}),
  Object.freeze({"text":"Sahip olduğun zaman, en dikkatli koruman gereken şeydir.","author":"Seneca","work":"Lucilius’a Mektuplar · 1","source":"https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_1"}),
  Object.freeze({"text":"Karşılaştığın güçlükler, yolundan nasıl gideceğini yeniden düşündürebilir.","author":"Marcus Aurelius","work":"Kendime Düşünceler · V.20","source":"https://texts.stoameditation.com/read/meditations/5/20"}),
  Object.freeze({"text":"Dışarıdaki engel, zihnindeki kararlılığı zorunlu olarak durdurmaz.","author":"Marcus Aurelius","work":"Kendime Düşünceler · V.20","source":"https://texts.stoameditation.com/read/meditations/5/20"}),
  Object.freeze({"text":"Yaşadığın şeyden çok, ona nasıl karşılık verdiğine bak.","author":"Marcus Aurelius","work":"Kendime Düşünceler · IV.49","source":"https://texts.stoameditation.com/read/meditations/4/49"}),
  Object.freeze({"text":"Bir güçlükte dahi ölçülü ve sağlam kalabilirsin.","author":"Marcus Aurelius","work":"Kendime Düşünceler · IV.49","source":"https://texts.stoameditation.com/read/meditations/4/49"})
 ]);
 const READING_WPM=195;
 const INTRO_MS=550;
 const MAX_WORDS=Math.max(...QUOTES.map(q=>(q.text+' '+q.author+' '+q.work).trim().split(/\s+/).length));
 const READING_MS=Math.ceil(MAX_WORDS*60000/READING_WPM)+INTRO_MS;
 // Fixed timing for all quotes, using the longest displayed quote and attribution.
 const DURATION_MS=Math.max(5400,READING_MS);
 let previous=null;
 function pick(random=Math.random){
  let last=previous;
  try{
   const raw=root.localStorage?.getItem(KEY);
   if(raw!==null&&raw!==undefined&&/^\d+$/.test(raw)&&Number(raw)<QUOTES.length)last=Number(raw);
  }catch{}
  let value=Number(random());
  if(!Number.isFinite(value))value=0;
  value=Math.max(0,Math.min(.999999999999, value));
  const count=QUOTES.length;
  const slot=Math.floor(value*(count-1));
  const index=last===null?Math.floor(value*count):slot+(slot>=last?1:0);
  previous=index;
  try{root.localStorage?.setItem(KEY,String(index));}catch{}
  return QUOTES[index];
 }
 root.FormaRotaLaunchQuotes=Object.freeze({QUOTES,KEY,pick,READING_WPM,MAX_WORDS,DURATION_MS});
})(typeof window!=='undefined'?window:globalThis);
