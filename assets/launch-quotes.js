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
  Object.freeze({text:'İyi bir zihne sahip olmak yetmez; onu iyi kullanmak gerekir.',author:'René Descartes',work:'Yöntem Üzerine Konuşma · I',source:'https://sourcebooks.web.fordham.edu/mod/1637descartes-method-excerpts.asp'})
 ]);
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
 root.FormaRotaLaunchQuotes=Object.freeze({QUOTES,KEY,pick});
})(typeof window!=='undefined'?window:globalThis);
