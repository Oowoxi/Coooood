// ═══════════════════════════════════════════════════════════════
//  الاختبار العميق: آلاف المباريات + تحليل الربط + قياس المتعة
// ═══════════════════════════════════════════════════════════════
const { buildBoard, POOL } = require('./board.js');
const { playMatch } = require('./match.js');
const { makeMind, CONCEPT_WORDS, CONCEPT_AXIS, similarity } = require('./mind2.js');
const { chooseClue, clueLabel } = require('./agents.js');

const N = +(process.argv[2] || 1000);
const ar = n => n.toLocaleString('ar-EG', { maximumFractionDigits: 1 });
const pct = (a, b) => b ? (a / b * 100) : 0;
const bar = (v, max, w) => { const n = Math.round(v / (max || 1) * (w || 30)); return '█'.repeat(Math.max(0,n)) + '░'.repeat(Math.max(0, (w||30) - n)); };

console.log('\n╔' + '═'.repeat(66) + '╗');
console.log('║  اختبار عميق: ' + ar(N) + ' مباراة كاملة بذكاء يفكّر خارج الصندوق');
console.log('╚' + '═'.repeat(66) + '╝');

// ── ملفات لاعبين متنوّعة: من المبتدئ الحرفي إلى الخبير المبدع ──
const PROFILES = {
  'مبتدئ':  { creativity: 0.15, blindness: 0.38, divergence: 0.30 },
  'عادي':   { creativity: 0.45, blindness: 0.24, divergence: 0.24 },
  'خبير':   { creativity: 0.80, blindness: 0.14, divergence: 0.18 },
  'مبدع':   { creativity: 1.00, blindness: 0.18, divergence: 0.26 },
};

function runSet(n, profName, seed0) {
  const P = PROFILES[profName];
  const S = { games: 0, redWin: 0, rounds: 0, clues: 0, hits: 0, guesses: 0,
    foe: 0, neut: 0, black: 0, blackGames: 0, short: 0, long: 0, num: 0,
    axis: {}, axisHit: {}, axisTry: {}, perfect: 0, zero: 0, big: 0, cluesN: {},
    roundsArr: [], accArr: [] };
  for (let g = 0; g < n; g++) {
    const b = buildBoard();
    const sd = (seed0 + g * 7919);
    const minds = {
      red:  { writer: makeMind({ ...P, seed: sd + 1 }),   guesser: makeMind({ ...P, seed: sd + 2 }) },
      blue: { writer: makeMind({ ...P, seed: sd + 3 }),   guesser: makeMind({ ...P, seed: sd + 4 }) } };
    const r = playMatch(b.words, b.colors, minds);
    S.games++; S.rounds += r.rounds; S.roundsArr.push(r.rounds);
    if (r.winner === 'red') S.redWin++;
    if (r.rounds <= 6) S.short++; if (r.rounds >= 18) S.long++;
    let gh = 0, gt = 0, hadBlack = false;
    for (const e of r.events) {
      S.clues++; S.num += e.num;
      S.cluesN[e.num] = (S.cluesN[e.num] || 0) + 1;
      S.axis[e.axis] = (S.axis[e.axis] || 0) + 1;
      S.axisTry[e.axis] = (S.axisTry[e.axis] || 0) + e.guessed.length;
      S.axisHit[e.axis] = (S.axisHit[e.axis] || 0) + e.hits;
      if (e.num >= 3) S.big++;
      if (e.hits === e.num && e.num > 0) S.perfect++;
      if (e.hits === 0) S.zero++;
      for (const x of e.guessed) {
        S.guesses++; gt++;
        if (x.color === e.team) { S.hits++; gh++; }
        else if (x.color === 'black') { S.black++; hadBlack = true; }
        else if (x.color === 'neutral') S.neut++;
        else S.foe++;
      }
    }
    if (hadBlack) S.blackGames++;
    if (gt) S.accArr.push(gh / gt);
  }
  return S;
}

// ═══ ١) مقارنة ملفات اللاعبين ═══
console.log('\n┌─ ١) كيف يتغيّر أداء اللعبة بحسب مهارة اللاعبين ─┐\n');
console.log('  اللاعب     دقة    كلمات/تلميح  رقم التلميح  أدوار   سوداء   تلميح٣+');
console.log('  ' + '─'.repeat(70));
const perProfile = {};
for (const p in PROFILES) {
  const S = runSet(Math.max(120, Math.round(N / 4)), p, 1000 + Object.keys(PROFILES).indexOf(p) * 100000);
  perProfile[p] = S;
  console.log('  ' + p.padEnd(9) +
    (pct(S.hits, S.guesses).toFixed(1) + '%').padStart(6) +
    (S.hits / S.clues).toFixed(2).padStart(12) +
    (S.num / S.clues).toFixed(2).padStart(12) +
    (S.rounds / S.games).toFixed(1).padStart(8) +
    (pct(S.blackGames, S.games).toFixed(0) + '%').padStart(8) +
    (pct(S.big, S.clues).toFixed(0) + '%').padStart(9));
}

// ═══ ٢) الاختبار الرئيسي على ملف "عادي" ═══
const M = runSet(N, 'عادي', 777);
console.log('\n┌─ ٢) الاختبار الرئيسي (' + ar(M.games) + ' مباراة، لاعبون عاديّون) ─┐\n');
const acc = pct(M.hits, M.guesses);
console.log('  دقة التخمين الكليّة      ' + acc.toFixed(1) + '%  ' + bar(acc, 100, 28));
console.log('  كلمات صحيحة لكل تلميح    ' + (M.hits / M.clues).toFixed(2));
console.log('  متوسط رقم التلميح        ' + (M.num / M.clues).toFixed(2));
console.log('  متوسط أدوار المباراة     ' + (M.rounds / M.games).toFixed(1));
console.log('  تلميحات ناجحة تماماً     ' + pct(M.perfect, M.clues).toFixed(1) + '%');
console.log('  تلميحات فشلت كلياً       ' + pct(M.zero, M.clues).toFixed(1) + '%');
console.log('  أخطاء لصالح الخصم        ' + (M.foe / M.games).toFixed(2) + ' لكل مباراة');
console.log('  أخطاء محايدة             ' + (M.neut / M.games).toFixed(2) + ' لكل مباراة');
console.log('  مباريات لمست السوداء     ' + pct(M.blackGames, M.games).toFixed(1) + '%');
console.log('  مباريات قصيرة (≤٦ أدوار) ' + pct(M.short, M.games).toFixed(1) + '%');
console.log('  مباريات طويلة (≥١٨)      ' + pct(M.long, M.games).toFixed(1) + '%');
console.log('  توازن الفوز (أحمر)       ' + pct(M.redWin, M.games).toFixed(1) + '%');

// ═══ ٣) من أين تأتي الروابط؟ ═══
console.log('\n┌─ ٣) أنواع الربط التي استخدمها الذكاء ─┐\n');
const axes = Object.keys(M.axis).sort((a, b) => M.axis[b] - M.axis[a]);
const mx = M.axis[axes[0]];
let outBox = 0;
for (const a of axes) {
  const share = pct(M.axis[a], M.clues);
  const succ = pct(M.axisHit[a], M.axisTry[a] || 1);
  if (!['فئة', 'اضطرار'].includes(a)) outBox += M.axis[a];
  console.log('  ' + a.padEnd(9) + bar(M.axis[a], mx, 22) + ' ' +
    (share.toFixed(1) + '%').padStart(6) + '   نجاح ' + succ.toFixed(0) + '%');
}
console.log('\n  ◆ نسبة التلميحات "خارج الصندوق" (غير تصنيفية): ' +
  pct(outBox, M.clues).toFixed(1) + '%');

// ═══ ٤) توزيع رقم التلميح ═══
console.log('\n┌─ ٤) كم كلمة يجرؤ الكاتب أن يربط في تلميح واحد؟ ─┐\n');
const ks = Object.keys(M.cluesN).sort();
const mk = Math.max(...ks.map(k => M.cluesN[k]));
for (const k of ks) console.log('  تلميح ' + k + '  ' + bar(M.cluesN[k], mk, 26) + ' ' +
  pct(M.cluesN[k], M.clues).toFixed(1) + '%');

// ═══ ٥) صعوبة الربط: قياس مباشر على اللوحات ═══
console.log('\n┌─ ٥) ما مدى صعوبة الربط في لوحات اللعبة فعلياً؟ ─┐\n');
let linkT = 0, trapT = 0, isolT = 0, cellN = 0, best3 = 0, boards = 0;
const isolWords = {};
for (let i = 0; i < Math.min(400, N); i++) {
  const b = buildBoard(); boards++;
  const cols = b.colors.map(c => String(c).replace('word-', ''));
  for (let x = 0; x < 25; x++) {
    let bestOwn = 0, bestFoe = 0;
    for (let y = 0; y < 25; y++) {
      if (x === y) continue;
      const s = similarity(b.words[x], b.words[y]);
      if (cols[x] === cols[y] && (cols[x] === 'red' || cols[x] === 'blue')) bestOwn = Math.max(bestOwn, s);
      else bestFoe = Math.max(bestFoe, s);
    }
    cellN++;
    if (bestOwn > 0.35) linkT++;
    if (bestFoe > bestOwn && bestFoe > 0.35) trapT++;
    if (bestOwn < 0.12 && bestFoe < 0.12) { isolT++; isolWords[b.words[x]] = (isolWords[b.words[x]] || 0) + 1; }
  }
  // أكبر مجموعة يمكن ربطها بتلميح واحد لفريق واحد
  for (const team of ['red', 'blue']) {
    const idx = [...Array(25).keys()].filter(k => cols[k] === team);
    let bb = 0;
    for (const c in CONCEPT_WORDS) {
      let n = 0; for (const k of idx) if ((CONCEPT_WORDS[c].get(b.words[k]) || 0) >= 0.42) n++;
      if (n > bb) bb = n;
    }
    best3 = Math.max(best3, bb);
  }
}
console.log('  كلمات لها رابط واضح مع فريقها   ' + pct(linkT, cellN).toFixed(1) + '%');
console.log('  كلمات رابطها الأقوى مع الخصم    ' + pct(trapT, cellN).toFixed(1) + '%  ← الفخاخ');
console.log('  كلمات معزولة (لا رابط قوي)      ' + pct(isolT, cellN).toFixed(1) + '%');
console.log('  أكبر تجمّع لفريق بتلميح واحد     ' + best3 + ' كلمات');
const worst = Object.entries(isolWords).sort((a, b) => b[1] - a[1]).slice(0, 14);
if (worst.length) console.log('\n  الكلمات الأكثر عزلة (يصعب ربطها):\n    ' + worst.map(w => w[0]).join('، '));

// ═══ ٦) الحكم ═══
console.log('\n╔' + '═'.repeat(66) + '╗');
console.log('║  الحكم النهائي');
console.log('╚' + '═'.repeat(66) + '╝\n');
const R = M.rounds / M.games, HPC = M.hits / M.clues;
let verdict, why;
if (acc >= 88) { verdict = 'سهلة جداً'; why = 'الربط واضح أكثر من اللازم'; }
else if (acc >= 78) { verdict = 'سهلة'; why = 'يغلب النجاح على المخاطرة'; }
else if (acc >= 62) { verdict = 'متوازنة ✓'; why = 'نجاح كافٍ ليكون ممتعاً، وخطأ كافٍ ليكون مثيراً'; }
else if (acc >= 50) { verdict = 'صعبة'; why = 'الخطأ أكثر من المعتاد'; }
else { verdict = 'صعبة جداً'; why = 'الربط غامض'; }
console.log('  الصعوبة: ' + verdict + ' — ' + why);
console.log('  دقة ' + acc.toFixed(1) + '% · ' + HPC.toFixed(2) + ' كلمة/تلميح · ' + R.toFixed(1) + ' دور');
console.log('  المرجع البشري في كود نيمز: دقة ٦٠-٧٥٪ · ١.٥-٢ كلمة/تلميح · ٩-١٤ دور\n');
module.exports = { runSet, PROFILES };
