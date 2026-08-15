// يضيف الكلمات المقترحة إلى نسخة من اللعبة ويقيس الأثر بمباريات كاملة
const fs=require('fs'),path=require('path'),vm=require('vm');
const { playMatch } = require('./match.js');
const { makeMind, similarity } = require('./mind2.js');
const RAW=fs.readFileSync(path.join(__dirname,'..','كود نيمز.html'),'utf8');
const CODE=RAW.match(/<script>\n([\s\S]*)<\/script>/)[1];
const SLICE=CODE.slice(CODE.indexOf('const massiveWordsPool'),CODE.indexOf('function initDefaultRooms'));
const ADD=JSON.parse(fs.readFileSync('/tmp/good.json','utf8'));

function make(add){
  let src=SLICE;
  if(add){
    // نضيف الكلمات إلى نهاية القائمة
    const m=src.match(/const massiveWordsPool = \[([\s\S]*?)\];/);
    const ins=m[0].replace(/\];$/, ',\n            '+ADD.map(w=>'"'+w+'"').join(', ')+'\n        ];');
    src=src.replace(m[0],ins);
  }
  const ctx={console,Math,Date,Set,Object,Array,JSON,window:{}};vm.createContext(ctx);
  vm.runInContext(src+';globalThis.__a={massiveWordsPool,buildLinkableBoard,buildWordMaps,buildDesignedBoard};',ctx);
  ctx.__a.buildWordMaps(ctx.__a.massiveWordsPool);
  return ctx.__a;
}
const PROF={'مبتدئ':{creativity:0.15,blindness:0.38,divergence:0.30},
 'عادي':{creativity:0.45,blindness:0.24,divergence:0.24},
 'خبير':{creativity:0.80,blindness:0.14,divergence:0.18}};
const N=+(process.argv[2]||600);
console.log('\n╔══ أثر إضافة '+ADD.length+' كلمة — '+N+' مباراة لكل حالة ══╗\n');
console.log('  الحالة            دقة  كلمة/تلميح رقم  أدوار معزول سوداء خارج‑الصندوق');
console.log('  '+'─'.repeat(78));
for(const add of [false,true]){
  const a=make(add);
  for(const p in PROF){
    const P=PROF[p]; let S={g:0,r:0,c:0,h:0,gs:0,n:0,bl:0,iso:0,cl:0,ob:0};
    for(let i=0;i<N;i++){
      const b=a.buildLinkableBoard(a.massiveWordsPool);
      const cols=b.colors.map(x=>x.replace('word-',''));
      for(const t of ['red','blue']){const idx=[...Array(25).keys()].filter(k=>cols[k]===t);
        for(const x of idx){let m=0;for(const y of idx)if(x!==y)m=Math.max(m,similarity(b.words[x],b.words[y]));
          S.cl++;if(m<0.15)S.iso++;}}
      const sd=770000+i*7919;
      const M={red:{writer:makeMind({...P,seed:sd+1}),guesser:makeMind({...P,seed:sd+2})},
               blue:{writer:makeMind({...P,seed:sd+3}),guesser:makeMind({...P,seed:sd+4})}};
      const r=playMatch(b.words,b.colors,M);
      S.g++;S.r+=r.rounds;let hb=false;
      for(const e of r.events){S.c++;S.n+=e.num;
        if(!['فئة','اضطرار'].includes(e.axis))S.ob++;
        for(const x of e.guessed){S.gs++;if(x.color===e.team)S.h++;else if(x.color==='black')hb=true;}}
      if(hb)S.bl++;
    }
    console.log('  '+((add?'بعد ':'قبل ')+p).padEnd(18)+
      (S.h/S.gs*100).toFixed(1).padStart(5)+'%'+(S.h/S.c).toFixed(2).padStart(10)+
      (S.n/S.c).toFixed(2).padStart(6)+(S.r/S.g).toFixed(1).padStart(6)+
      (S.iso/S.cl*100).toFixed(0).padStart(6)+'%'+(S.bl/S.g*100).toFixed(0).padStart(6)+'%'+
      (S.ob/S.c*100).toFixed(0).padStart(9)+'%');
  }
  console.log();
}
const a=make(true);
console.log('  ── سلامة القائمة بعد الإضافة ──');
console.log('  الحجم: '+a.massiveWordsPool.length+' | تكرار: '+(a.massiveWordsPool.length-new Set(a.massiveWordsPool).size));
let bad=0; for(let i=0;i<4000;i++){const b=a.buildLinkableBoard(a.massiveWordsPool);
 const c={};b.colors.forEach(x=>c[x]=(c[x]||0)+1);
 if(b.words.length!==25||new Set(b.words).size!==25||c['word-red']!==9||c['word-blue']!==8||c['word-neutral']!==7||c['word-black']!==1)bad++;}
console.log('  ٤٠٠٠ لوحة | خلل: '+bad+' '+(bad===0?'✔':'✘'));
