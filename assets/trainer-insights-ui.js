/* FormaRota Personal Trainer: graph metrics and cautious recovery UI.
   Pure metrics in trainer-insights-engine.js; no user history modifications. */
(function(root){
'use strict';
const M=root.FormaRotaTrainerInsights,E=root.FormaRotaCoachEngine;
if(!M||!E)return;
const $=id=>document.getElementById(id);
const make=(tag,css,value)=>{const n=document.createElement(tag);if(css)n.className=css;if(value!=null)n.textContent=value;return n;};
const store=(key,fallback)=>{try{const x=JSON.parse(localStorage.getItem(key));return x===null?fallback:x}catch{return fallback}};
const today=()=>{if(typeof root.today==='function')return root.today();const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const moves=()=>Array.isArray(root.formaRotaFitnessCatalog)?root.formaRotaFitnessCatalog:[];
const metrics=Object.freeze({maxKg:{label:'En yüksek ağırlık',unit:'kg'},totalReps:{label:'Toplam tekrar',unit:'tekrar'},volume:{label:'Antrenman hacmi',unit:'kg×tekrar'},e1rm:{label:'Tahmini 1RM (isteğe bağlı)',unit:'kg'}});
let painReported=false;
const readRecovery=(asOf,withPain=true)=>M.recovery({
 asOf,fullHistory:store('kocluk-fitness-history-v1',[]),
 absHistory:store('formarota-abs-history-v1',[]),
 sleepLog:store('formarota-sleep-energy-v1',{}),
 moves:moves(),coach:E,painReported:withPain&&painReported
});
const originalAssess=E.assess;
E.assess=function(...args){
 const result=originalAssess.apply(this,args);
 // Do not rewrite past coaching reports using today's reported symptoms.
 if(result.status==='increase'&&result.asOfDate===today()){
  const recovery=readRecovery(result.asOfDate);
  if(!recovery.allowIncrease){
   return {...result,status:'caution',requiresApproval:false,nextTargetReps:null,
    proposedIncrement:null,short:'Toparlanma uyarısı varken ağırlık artışını ertele.',
    detail:recovery.headline+'. '+recovery.advice+' Eski antrenman kayıtların değiştirilmedi.',
    evidence:'Toparlanma kontrolü: '+recovery.reasons.join(' ')};
  }
 }
 return result;
};
const originalReport=E.report;
E.report=function(...args){
 const report=originalReport.apply(this,args);
 const reportDate=args[2],start=E.weekStart(reportDate||today());
 if(start!==E.weekStart(today()))return report;
 const recovery=readRecovery(today());
 if(recovery.allowIncrease)return report;
 const messages=report.messages.filter(m=>!m.includes('artışını değerlendirebilirsin'));
 messages.unshift('Toparlanma: '+recovery.headline+'. '+recovery.advice);
 return {...report,messages:messages.slice(0,3)};
};
function currentVariant(move){
 const picker=$('coachGraphVariant');
 if(picker?.dataset?.forMove===move.id&&picker.value)return picker.value;
 const named=root.formaRotaCoachGraphVariant?.[move.id];
 if(named)return named;
 const variants=store('kocluk-fitness-variants-v1',{});
 return E.chosenVariant(move,variants);
}
function ensureMetrics(){
 const chart=$('v21ExerciseChart'),select=$('v21Exercise');
 if(!chart||!select)return null;
 let controls=$('trainerGraphMetrics');
 if(!controls){
  controls=make('div','trainer-graph-controls');controls.id='trainerGraphMetrics';
  const label=make('label','','Grafikte göster');
  label.htmlFor='trainerGraphMetric';
  const metric=make('select');metric.id='trainerGraphMetric';
  for(const [key,x] of Object.entries(metrics)){const option=make('option','',x.label);option.value=key;metric.add(option);}
  controls.append(label,metric);
  chart.before(controls);
  metric.addEventListener('change',()=>{
   if(typeof root.v21ExerciseGraph==='function')root.v21ExerciseGraph();
  });
 }
 if(!$('trainerGraphSummary')){
  const summary=make('p','trainer-graph-summary');summary.id='trainerGraphSummary';
  $('v21ExercisePrevious')?.after(summary);
 }
 return controls;
}
function renderGraph(){
 if(!ensureMetrics())return;
 const id=$('v21Exercise')?.value,move=moves().find(x=>x.id===id);
 const summary=$('trainerGraphSummary'),chart=$('v21ExerciseChart'),metric=$('trainerGraphMetric')?.value||'maxKg';
 if(!move||!summary||!chart)return;
 const selected=currentVariant(move);
 const data=M.performance({history:store('kocluk-fitness-history-v1',[]),move,variant:selected,asOf:today(),coach:E});
 const latest=data.latest,unit=metrics[metric].unit;
 if(!latest){summary.textContent=data.reason;return;}
 const value=latest[metric];
 const signed=x=>(x>0?'+':'')+x.toLocaleString('tr-TR',{maximumFractionDigits:1});
 const repetitions=latest.sets.map(s=>s.reps).join(' / ');
 const details='Son geçerli antrenman: '+latest.date+' · '+repetitions+' tekrar · Hacim '+latest.volume.toLocaleString('tr-TR',{maximumFractionDigits:1})+' kg×tekrar.';
 if(value===null||value===undefined){
  if(metric==='e1rm')chart.textContent='Bu hareket için uygun 1–10 tekrar aralığında, pozitif ağırlıklı kayıt yok.';
  summary.textContent=details+' Tahmini 1RM hesaplanamadı.';return;
 }
 if(metric!=='maxKg'&&typeof root.v21Svg==='function'){
  const series=data.entries.filter(x=>x[metric]!=null).slice(-24).map(x=>({d:x.date,v:x[metric]}));
  chart.innerHTML=root.v21Svg(series);
 }
 const change=data.changes?.[metric],changeText=change==null?'Karşılaştırma için ikinci geçerli gün gerekli.':
  'Önceki geçerli güne göre '+signed(change)+' '+unit+'.';
 const caution=metric==='e1rm'?' Tahmini 1RM gerçek maksimum kaldırış değildir; yalnızca uygun setlerden türetilmiş yaklaşık göstergedir.':'';
 summary.textContent=details+' '+metrics[metric].label+': '+value.toLocaleString('tr-TR',{maximumFractionDigits:1})+' '+unit+'. '+changeText+caution;
}
function ensureRecovery(){
 const overview=$('coachOverview');
 if(!overview)return null;
 let control=$('trainerRecovery');
 if(control)return control;
 control=make('details','trainer-recovery');control.id='trainerRecovery';
 control.append(make('summary','','Toparlanma değerlendirmesi'));
 const body=make('div','trainer-recovery-body');
 const label=make('label','trainer-pain-check');
 const cb=make('input');cb.type='checkbox';cb.id='trainerPainNow';cb.checked=painReported;
 label.append(cb,document.createTextNode(' Ağrı veya sakatlık belirtim var (yalnızca bu oturum)'));
 const result=make('div','trainer-recovery-result');result.id='trainerRecoveryResult';
 body.append(label,result,make('p','muted','Bu işaret cihazda saklanmaz. Uygulama açıldığında yeniden değerlendirilir.'));
 control.append(body);overview.append(control);
 cb.addEventListener('change',()=>{
  painReported=cb.checked;renderRecovery();
  // Existing trainer cards and weekly report read the same assessed decision.
  if(typeof root.fitDrawExercises==='function')root.fitDrawExercises();
  if(typeof root.v21ExerciseGraph==='function')root.v21ExerciseGraph();
  if(typeof root.v21Report==='function')root.v21Report();
 });
 return control;
}
function renderRecovery(){
 const el=ensureRecovery(),target=$('trainerRecoveryResult');if(!el||!target)return;
 const value=readRecovery(today());
 target.replaceChildren();
 target.append(make('strong','',value.headline));
 const bullets=make('ul');
 value.reasons.forEach(reason=>bullets.append(make('li','',reason)));
 target.append(bullets,make('p','',value.advice),make('p','muted',value.disclaimer));
 if(value.status==='pain'||value.status==='caution')el.open=true;
}
function install(){
 ensureMetrics();renderGraph();renderRecovery();
 // The default graph function remains the owner of its original weight chart.
 const graph=root.v21ExerciseGraph;
 if(typeof graph==='function'&&!graph.__trainerMetricsWrapped){
  const wrapped=function(...args){const result=graph.apply(this,args);renderGraph();return result;};
  wrapped.__trainerMetricsWrapped=true;root.v21ExerciseGraph=wrapped;
 }
 const insights=root.v21RenderInsights;
 if(typeof insights==='function'&&!insights.__trainerMetricsWrapped){
  const wrapped=function(...args){const result=insights.apply(this,args);renderGraph();renderRecovery();return result;};
  wrapped.__trainerMetricsWrapped=true;root.v21RenderInsights=wrapped;
 }
 const imports=$('confirmImport');
 imports?.addEventListener('click',()=>queueMicrotask(()=>{renderGraph();renderRecovery();}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
root.FormaRotaTrainerInsightsUI=Object.freeze({renderGraph,renderRecovery,getPainReported:()=>painReported});
})(window);
