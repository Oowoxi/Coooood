// ═══════════ تشغيل 100 مباراة على لوحة التطبيق الحقيقية ═══════════
const fs = require('fs'), path = require('path'), vm = require('vm');
const { playMatch } = require('./engine.js');
const { CONCEPT_OF, assoc, CONCEPTS } = require('./brain.js');

const RAW = fs.readFileSync(path.join(__dirname, '..', 'كود نيمز.html'), 'utf8');
const CODE = RAW.match(/<script>\n([\s\S]*)<\/script>/)[1];

// نستخرج بنّاء اللوحة الحقيقي من التطبيق ونشغّله في صندوق معزول
function makeAppBuilder() {
  const grab = ['massiveWordsPool', 'WORD_TOPIC_CUTS', 'WORD_SYNONYM_SETS',
                'MAX_PER_TOPIC', 'TEAM_BUNDLES', 'buildWordMaps',
                'buildLinkableBoard', 'pickBalancedWords', 'shuffleArr'];
  const start = CODE.indexOf('const massiveWordsPool');
  const end   = CODE.indexOf('function initDefaultRooms');
  const slice = CODE.slice(start, end);
  const ctx = { console, Math, Date, Set, Object, Array, JSON, window: {} };
  vm.createContext(ctx);
  vm.runInContext(slice + '\n;globalThis.__api={' +
    grab.map(g => `${g}: typeof ${g}!=='undefined'?${g}:undefined`).join(',') + '};', ctx);
  return ctx.__api;
}
const api = makeAppBuilder();
const POOL = api.massiveWordsPool;
api.buildWordMaps(POOL);

const buildNew = () => api.buildLinkableBoard(POOL);

// النظام القديم (للمقارنة): كلمات متوازنة + ألوان عشوائية
function buildOld() {
  const words = api.pickBalancedWords(POOL, 25);
  let colors = [];
  for (let i = 0; i < 9; i++) colors.push('word-red');
  for (let i = 0; i < 8; i++) colors.push('word-blue');
  for (let i = 0; i < 7; i++) colors.push('word-neutral');
  colors.push('word-black');
  colors = colors.sort(() => Math.random() - 0.5);
  return { words, colors };
}

function runSet(builder, n, opts) {
  const rows = [];
  for (let i = 0; i < n; i++) rows.push(playMatch(builder, opts));
  const avg = k => rows.reduce((a, r) => a + r[k], 0) / rows.length;
  const pct = f => rows.filter(f).length / rows.length * 100;
  return {
    rows,
    turns: avg('turns'), acc: avg('accuracy') * 100,
    clueNum: avg('avgClueNum'), hitsPerClue: avg('avgHitsPerClue'),
    guesses: avg('guesses'), hits: avg('hits'),
    missTheir: avg('missTheir'), missNeutral: avg('missNeutral'), missBlack: avg('missBlack'),
    blackPct: pct(r => r.byBlack),
    redWin: pct(r => r.winner === 'red'),
    shortPct: pct(r => r.turns <= 6),
    longPct: pct(r => r.turns >= 16)
  };
}

// ── قياس بنية اللوحة نفسها (بمعرفة الدماغ لا بجداول اللعبة) ──
function boardQuality(builder, n) {
  let ownLink = 0, trapLink = 0, boardsNoLink = 0, biggest = 0, over4 = 0;
  for (let x = 0; x < n; x++) {
    const b = builder();
    const cards = b.words.map((w, i) => ({ w, c: b.colors[i].replace('word-', '') }));
    let own = 0, trap = 0;
    const clusters = {};
    for (const concept of Object.keys(CONCEPTS)) {
      const hit = cards.map((c, i) => ({ ...c, i, s: assoc(c.w, concept) })).filter(o => o.s > 0);
      if (hit.length < 2) continue;
      for (let i = 0; i < hit.length; i++) for (let j = i + 1; j < hit.length; j++) {
        const a = hit[i], d = hit[j];
        if ((a.c === 'red' || a.c === 'blue') && a.c === d.c) own++;
        else if ((a.c === 'red' || a.c === 'blue') && (d.c === 'red' || d.c === 'blue')) trap++;
      }
      for (const t of ['red', 'blue']) {
        const k = hit.filter(o => o.c === t).length;
        if (k > (clusters[t] || 0)) clusters[t] = k;
      }
    }
    const mx = Math.max(clusters.red || 0, clusters.blue || 0);
    if (mx > biggest) biggest = mx;
    if (mx >= 5) over4++;
    ownLink += own; trapLink += trap;
    if (own === 0) boardsNoLink++;
  }
  return {
    own: ownLink / n, trap: trapLink / n,
    noLink: boardsNoLink / n * 100, biggest, over4: over4 / n * 100
  };
}

const N = parseInt(process.argv[2] || '100', 10);
console.log(`\n╔══════ محاكاة ${N} مباراة — لاعبون آليون يفكّرون بالعربية ══════╗\n`);

const cur = runSet(buildNew, N);
const old = runSet(buildOld, N);

const line = (label, a, b, unit, dp) => {
  dp = dp === undefined ? 1 : dp;
  console.log('  ' + label.padEnd(30) + String(a.toFixed(dp)).padStart(7) + (unit || '') +
              '   ' + String(b.toFixed(dp)).padStart(7) + (unit || ''));
};
console.log('  ' + 'المقياس'.padEnd(30) + '  النظام الحالي'.padStart(9) + '   القديم'.padStart(11));
console.log('  ' + '─'.repeat(56));
line('دقة التخمين', cur.acc, old.acc, '%');
line('عدد الأدوار', cur.turns, old.turns, '');
line('كلمات صحيحة لكل تلميح', cur.hitsPerClue, old.hitsPerClue, '', 2);
line('رقم التلميح المطلوب', cur.clueNum, old.clueNum, '', 2);
line('أخطاء لصالح الخصم', cur.missTheir, old.missTheir, '', 2);
line('أخطاء محايدة', cur.missNeutral, old.missNeutral, '', 2);
line('الكلمة السوداء', cur.blackPct, old.blackPct, '%');
line('مباريات قصيرة (<=6 أدوار)', cur.shortPct, old.shortPct, '%');
line('مباريات طويلة (>=16)', cur.longPct, old.longPct, '%');
line('فوز الأحمر', cur.redWin, old.redWin, '%');

console.log('\n  ── بنية اللوحة (بمعرفة دلالية مستقلة) ──');
const qn = boardQuality(buildNew, 300), qo = boardQuality(buildOld, 300);
line('روابط تخدم فريقك', qn.own, qo.own, '', 2);
line('روابط تخدم الخصم (فخّ)', qn.trap, qo.trap, '', 2);
line('لوحات بلا أي رابط', qn.noLink, qo.noLink, '%');
line('لوحات فيها 5+ من مفهوم', qn.over4, qo.over4, '%');
console.log('  أكبر تجمّع لفريق واحد        ' + String(qn.biggest).padStart(7) + '   ' + String(qo.biggest).padStart(7));

// ── حكم الصعوبة ──
console.log('\n╔══════ التقييم ══════╗');
const acc = cur.acc, hpc = cur.hitsPerClue, t = cur.turns;
let verdict, why;
if (acc >= 78 && hpc >= 1.8) { verdict = 'سهلة جداً'; why = 'التخمين يكاد لا يخطئ'; }
else if (acc >= 68) { verdict = 'سهلة'; why = 'الربط واضح أكثر من اللازم'; }
else if (acc >= 52) { verdict = 'متوازنة'; why = 'خطأ محسوب مع تقدّم مستمر'; }
else if (acc >= 40) { verdict = 'صعبة'; why = 'الأخطاء أكثر من الإصابات المريحة'; }
else { verdict = 'صعبة جداً'; why = 'التلميح لا يوصل'; }
console.log(`  الصعوبة: ${verdict}  (${why})`);
console.log(`  دقة ${acc.toFixed(1)}% · ${hpc.toFixed(2)} كلمة لكل تلميح · ${t.toFixed(1)} دور`);

module.exports = { runSet, boardQuality, buildNew, buildOld, api, POOL };
