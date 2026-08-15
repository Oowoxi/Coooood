// تأكيد [4,3,2] على عينة كبيرة + كل مستويات المهارة + فحص الفشل
const fs=require('fs'),path=require('path'),vm=require('vm');
const { playMatch } = require('./match.js');
const { makeMind, similarity } = require('./mind2.js');
const RAW=fs.readFileSync(path.join(__dirname,'..','كود نيمز.html'),'utf8');
const CODE=RAW.match(/<script>\n([\s\S]*)<\/script>/)[1];
const SLICE=CODE.slice(CODE.indexOf('const massiveWordsPool'),CODE.indexOf('function initDefaultRooms'));
function build(bundles){
  const src=SLICE.replace('const TEAM_BUNDLES = [3, 2, 2];','const TEAM_BUNDLES = ['+bundles.join(',')+'];');
  const ctx={console,Math,Date,Set,Object,Array,JSON,window:{}}; vm.createContext(ctx);
  vm.runInContext(src+'\n;globalThis.__api={massiveWordsPool,buildWordMaps,buildLinkableBoard};',ctx);
  ctx.__api.buildWordMaps(ctx.__api.massiveWordsPool);
  return ()=>ctx.__api.buildLinkableBoard(ctx.__api.massiveWordsPool);
}
const PROFILES={'مبتدئ':{creativity:0.15,blindness:0.38,divergence:0.30},
 'عادي':{creativity:0.45,blindness:0.24,divergence:0.24},
 'خبير':{creativity:0.80,blindness:0.14,divergence:0.18}};
const N=+(process.argv[2]||800);
console.log('\n╔══ تأكيد [4,3,2] على '+N+' مباراة لكل حالة ══╗\n');
console.log('  الحالة              دقة  كلمة/تلميح  رقم  أدوار سوداء قصيرة طويلة توازن');
console.log('  '+'─'.repeat(80));
for(const bundles of [[3,2,2],[4,3,2]]){
  const bd=build(bundles);
  for(const p in PROFILES){
    const P=PROFILES[p]; let S={g:0,r:0,c:0,h:0,gs:0,n:0,bl:0,sh:0,lo:0,red:0};
    for(let i=0;i<N;i++){
      const b=bd(); const sd=9000+i*7919;
      const m={red:{writer:makeMind({...P,seed:sd+1}),guesser:makeMind({...P,seed:sd+2})},
               blue:{writer:makeMind({...P,seed:sd+3}),guesser:makeMind({...P,seed:sd+4})}};
      const r=playMatch(b.words,b.colors,m);
      S.g++;S.r+=r.rounds; if(r.winner==='red')S.red++;
      if(r.rounds<=6)S.sh++; if(r.rounds>=18)S.lo++;
      let hb=false;
      for(const e of r.events){S.c++;S.n+=e.num;
        for(const x of e.guessed){S.gs++; if(x.color===e.team)S.h++; else if(x.color==='black')hb=true;}}
      if(hb)S.bl++;
    }
    console.log('  '+('['+bundles.join(',')+'] '+p).padEnd(20)+
      (S.h/S.gs*100).toFixed(1).padStart(5)+'%'+(S.h/S.c).toFixed(2).padStart(10)+
      (S.n/S.c).toFixed(2).padStart(7)+(S.r/S.g).toFixed(1).padStart(6)+
      (S.bl/S.g*100).toFixed(0).padStart(6)+'%'+(S.sh/S.g*100).toFixed(1).padStart(6)+'%'+
      (S.lo/S.g*100).toFixed(1).padStart(6)+'%'+(S.red/S.g*100).toFixed(0).padStart(6)+'%');
  }
  console.log();
}
// فحص سلامة: هل يبقى 9/8/7/1 وبلا تكرار؟
console.log('  ── فحص سلامة [4,3,2] على 3000 لوحة ──');
const bd=build([4,3,2]); let bad=0,dup=0,cnt={};
for(let i=0;i<3000;i++){
  const b=bd(); const c={};
  b.colors.forEach(x=>c[x]=(c[x]||0)+1);
  if(c['word-red']!==9||c['word-blue']!==8||c['word-neutral']!==7||c['word-black']!==1) bad++;
  if(new Set(b.words).size!==25) dup++;
  if(b.words.length!==25) bad++;
}
console.log('  لوحات بتوزيع خاطئ : '+bad);
console.log('  لوحات فيها تكرار  : '+dup);
console.log('  '+(bad===0&&dup===0?'✔ سليم تماماً':'✘ يوجد خلل'));
