/* FormaRota OLED Edition — three direct-access palette previews in Settings.
 * Uses the existing theme select/change handler; does not own persistence. */
(function(root){
'use strict';
const doc=root.document;
if(!doc)return;
const palettes=[
 {id:'oled-black',name:'OLED Black'},
 {id:'oled-neon',name:'OLED Neon'},
 {id:'oled-ember',name:'OLED Ember'}
];
function install(){
 const select=doc.getElementById('themeSelect');
 const launch=doc.getElementById('luxeThemeLaunch');
 if(!select||!launch||doc.getElementById('oledThemeQuick'))return;
 const wrapper=doc.createElement('div');
 wrapper.className='oled-theme-quick';
 wrapper.id='oledThemeQuick';
 const title=doc.createElement('strong');
 title.textContent='OLED temalar — hızlı seçim';
 wrapper.append(title);
 const choices=doc.createElement('div');
 choices.className='oled-theme-choices';
 const tiles=[];
 function paint(){
  for(const tile of tiles)tile.setAttribute('aria-pressed',String(tile.dataset.oledChoice===select.value));
 }
 for(const {id,name} of palettes){
  const tile=doc.createElement('button');
  tile.type='button';
  tile.className='oled-theme-choice';
  tile.dataset.oledChoice=id;
  tile.setAttribute('aria-label',name+' temasını seç');
  const graphic=doc.createElement('span');
  graphic.className='oled-theme-preview';
  graphic.setAttribute('aria-hidden','true');
  const label=doc.createElement('span');
  label.textContent=name;
  tile.append(graphic,label);
  tile.addEventListener('click',()=>{
   select.value=id;
   select.dispatchEvent(new Event('change',{bubbles:true}));
   paint();
  });
  choices.append(tile);tiles.push(tile);
 }
 wrapper.append(choices);
 launch.after(wrapper);
 select.addEventListener('change',paint);
 paint();
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',install,{once:true});
else install();
root.FormaRotaOLEDThemeQuick=Object.freeze({refresh:install});
})(window);
