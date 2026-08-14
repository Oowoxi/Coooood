// نتحقّق من التوصية الأولى فعلياً قبل أن نوصي بها
const fs=require('fs'), path=require('path'), vm=require('vm');
const { playMatch } = require('./engine.js');
const { CONCEPTS, assoc } = require('./brain.js');
const RAW=fs.readFileSync(path.join(__dirname,'..','كود نيمز.html'),'utf8');
const CODE=RAW.match(/<script>\n([\s\S]*)<\/script>/)[1];
function builderWith(bundles){
  const start=CODE.indexOf('const massiveWordsPool'), end=CODE.indexOf('function initDefaultRooms');
  let slice=CODE.slice(start,end).replace(/const TEAM_BUNDLES = \[[^\]]*\];/,
    'const TEAM_BUNDLES = ['+bundles.join(',')+'];');
  const ctx={console,Math,Date,Set,Object,Array,JSON,window:{}};
  vm.createContext(ctx);
  vm.runInContext(slice+'\n;globalThis.__b=(function(){buildWordMaps(massiveWordsPool);'+
    'return function(){return buildLinkableBoard(massiveWordsPool);};})();'+
    'globalThis.__tb=TEAM_BUNDLES;',ctx);
  return {build:ctx.__b, tb:ctx.__tb};
}
function measure(build,n){
  const rows=[]; for(let i=0;i<n;i++) rows.push(playMatch(build));
  const avg=k=>rows.reduce((a,r)=>a+r[k],0)/rows.length, pct=f=>rows.filter(f).length/rows.length*100;
  // بنية
  let big5=0, trap=0, own=0;
  for(let x=0;x<200;x++){
    const b=build(); const cards=b.words.map((w,i)=>({w,c:b.colors[i].replace('word-','')}));
    let mx=0,tr=0,ow=0;
    for(const con of Object.keys(CONCEPTS)){
      const hit=cards.map(c=>({...c,s:assoc(c.w,con)})).filter(o=>o.s>0.5);
      for(const t of ['red','blue']){ const k=hit.filter(o=>o.c===t).length; if(k>mx)mx=k; }
      for(let i=0;i<hit.length;i++)for(let j=i+1;j<hit.length;j++){
        const a=hit[i],d=hit[j];
        if((a.c==='red'||a.c==='blue')&&a.c===d.c) ow++;
        else if((a.c==='red'||a.c==='blue')&&(d.c==='red'||d.c==='blue')) tr++; }
    }
    if(mx>=5) big5++; trap+=tr; own+=ow;
  }
  return {acc:avg('accuracy')*100, turns:avg('turns'), hpc:avg('avgHitsPerClue'),
    black:pct(r=>r.byBlack), long:pct(r=>r.turns>=16), short:pct(r=>r.turns<=6),
    red:pct(r=>r.winner==='red'), big5:big5/200*100, trap:trap/200, own:own/200};
}
console.log('\n═══ التحقق من التوصية: تقليل حجم الحزم ═══\n');
console.log('  الحزم        دقة%  ك/تلميح  أدوار  سوداء%  طويلة%  5+معاً%  فخّ  روابط');
for(const b of [[3,2,2],[3,2],[2,2],[3],[2]]){
  const {build,tb}=builderWith(b);
  const m=measure(build,300);
  console.log('  ['+b.join(',')+']'.padEnd(9-b.join(',').length)+
    '  '+m.acc.toFixed(1).padStart(5)+'  '+m.hpc.toFixed(2).padStart(6)+
    '  '+m.turns.toFixed(1).padStart(5)+'  '+m.black.toFixed(1).padStart(5)+
    '  '+m.long.toFixed(0).padStart(5)+'  '+m.big5.toFixed(1).padStart(6)+
    '  '+m.trap.toFixed(1).padStart(4)+'  '+m.own.toFixed(1).padStart(5));
}
