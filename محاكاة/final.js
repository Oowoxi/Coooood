const { playMatch } = require('./engine.js');
const { runSet, boardQuality, buildNew, buildOld, api, POOL } = require('./run.js');
const { CONCEPTS, CONCEPT_OF, assoc } = require('./brain.js');
const N = 100;
console.log('\n' + '═'.repeat(66));
console.log('  تقرير محاكاة ' + N + ' مباراة — كود نيمز نجد');
console.log('═'.repeat(66));

const cur = runSet(buildNew, N), old = runSet(buildOld, N);
const L=(l,a,b,u,d)=>{d=d===undefined?1:d;console.log('  '+l.padEnd(28)+a.toFixed(d).padStart(7)+(u||'')+'  '+b.toFixed(d).padStart(7)+(u||''));};
console.log('\n▸ نتائج اللعب' + '   '.repeat(4) + '  الحالي     القديم');
console.log('  ' + '─'.repeat(52));
L('دقة التخمين',cur.acc,old.acc,'%');
L('عدد الأدوار',cur.turns,old.turns,'');
L('كلمات صحيحة لكل تلميح',cur.hitsPerClue,old.hitsPerClue,'',2);
L('أخطاء لصالح الخصم',cur.missTheir,old.missTheir,'',2);
L('أخطاء محايدة',cur.missNeutral,old.missNeutral,'',2);
L('خسارة بالكلمة السوداء',cur.blackPct,old.blackPct,'%');
L('مباريات طويلة (16+ دور)',cur.longPct,old.longPct,'%');
L('توازن الفوز (أحمر)',cur.redWin,old.redWin,'%');

// ── تحليل الصعوبة لكل تلميح ──
const rows = cur.rows;
const dist = {};
rows.forEach(r=>r.hitsPerClue.forEach(h=>{dist[h]=(dist[h]||0)+1;}));
const tot = Object.values(dist).reduce((a,c)=>a+c,0);
console.log('\n▸ ماذا يحصد اللاعب من كل تلميح؟');
Object.keys(dist).sort().forEach(k=>{
  const p=dist[k]/tot*100;
  console.log('  '+k+' كلمة: '+('█'.repeat(Math.round(p/2))).padEnd(26)+p.toFixed(1)+'%');
});

// ── أصعب/أسهل الكلمات ──
const wordStat = {};
for (let i=0;i<600;i++){
  const b=buildNew();
  b.words.forEach((w,k)=>{
    if(!wordStat[w]) wordStat[w]={seen:0,concepts:(CONCEPT_OF[w]||[]).length};
    wordStat[w].seen++;
  });
}
const isolated = POOL.filter(w=>{
  // كلمة "معزولة": لا يشاركها أحد في أي مفهوم بقوة
  const cs = CONCEPT_OF[w]||[];
  return cs.length===0;
});
const multi = POOL.filter(w=>(CONCEPT_OF[w]||[]).length>=2);
console.log('\n▸ طبيعة قائمة الكلمات ('+POOL.length+' كلمة)');
console.log('  كلمات بلا مفهوم واضح (يصعب التلميح لها): '+isolated.length);
console.log('  كلمات غامضة في مفهومين+ (فخّ محتمل):     '+multi.length+'  ('+(multi.length/POOL.length*100).toFixed(1)+'%)');
const longW = POOL.filter(w=>w.length>=8);
console.log('  كلمات طويلة (8+ حروف):                  '+longW.length);
const twoW = POOL.filter(w=>w.includes(' '));
console.log('  كلمات مركّبة (فيها مسافة):               '+twoW.length+'  '+twoW.join('، '));

// ── الحكم ──
console.log('\n' + '═'.repeat(66));
const acc=cur.acc, hpc=cur.hitsPerClue, t=cur.turns, blk=cur.blackPct;
let verdict;
if (acc>=88 && hpc>=1.6) verdict='سهلة جداً';
else if (acc>=85 || hpc>=1.5) verdict='سهلة إلى متوسطة';
else if (acc>=70) verdict='متوسطة';
else if (acc>=55) verdict='متوسطة إلى صعبة';
else verdict='صعبة';
console.log('  الحكم: الكلمات '+verdict);
console.log('  دقة '+acc.toFixed(1)+'% · '+hpc.toFixed(2)+' كلمة/تلميح · '+t.toFixed(1)+' دور · سوداء '+blk.toFixed(1)+'%');
console.log('═'.repeat(66));
