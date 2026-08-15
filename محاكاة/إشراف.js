// ═══════════════════════════════════════════════════════════════
//  الإشراف الكامل: ١٥٠٠ مباراة على اللوحات التي يصمّمها المهندس
//  نراقب كل شيء: الصحة، المتعة، التنوّع، الأخطاء، الحالات الشاذة.
// ═══════════════════════════════════════════════════════════════
const { buildBoard, POOL } = require('./board.js');
const { playMatch } = require('./match.js');
const { makeMind, similarity, CONCEPT_WORDS } = require('./mind2.js');

const N = +(process.argv[2] || 1500);
const ar = n => n.toLocaleString('ar-EG', { maximumFractionDigits: 1 });
const pct = (a, b) => b ? (a / b * 100) : 0;
const bar = (v, mx, w) => { const n = Math.round(v / (mx || 1) * (w || 26));
  return '█'.repeat(Math.max(0, Math.min(w||26, n))) + '░'.repeat(Math.max(0, (w || 26) - n)); };

const PROFILES = {
  'مبتدئ': { creativity: 0.15, blindness: 0.38, divergence: 0.30 },
  'عادي':  { creativity: 0.45, blindness: 0.24, divergence: 0.24 },
  'خبير':  { creativity: 0.80, blindness: 0.14, divergence: 0.18 },
  'مبدع':  { creativity: 1.00, blindness: 0.18, divergence: 0.26 },
};

console.log('\n╔' + '═'.repeat(70) + '╗');
console.log('║  إشراف كامل: ' + ar(N) + ' مباراة على لوحات المهندس');
console.log('╚' + '═'.repeat(70) + '╝');

// ══ المراقبة العامة ══
const WATCH = { badBoards: 0, dupBoards: 0, crashes: [], stuck: 0, noClue: 0,
                emptyTurn: 0, hugeRound: 0, blackFirst: 0, instantWin: 0 };
const wordFreq = {}, clueFreq = {}, axisUse = {}, axisHit = {}, axisTry = {};
const boardSigs = new Set();
const roundsArr = [], accArr = [], firstHits = [];
const gems = [], disasters = [];

function runOne(i, P, collect) {
  let b;
  try { b = buildBoard(); }
  catch (e) { WATCH.crashes.push('board: ' + e.message); return null; }

  // ── فحص صحة اللوحة ──
  const cnt = {};
  b.colors.forEach(c => cnt[c] = (cnt[c] || 0) + 1);
  const okShape = b.words.length === 25 && new Set(b.words).size === 25 &&
    cnt['word-red'] === 9 && cnt['word-blue'] === 8 &&
    cnt['word-neutral'] === 7 && cnt['word-black'] === 1;
  if (!okShape) WATCH.badBoards++;
  if (collect) {
    const sig = [...b.words].sort().join('|');
    if (boardSigs.has(sig)) WATCH.dupBoards++; else boardSigs.add(sig);
    for (const w of b.words) wordFreq[w] = (wordFreq[w] || 0) + 1;
  }

  const sd = 500000 + i * 7919;
  const minds = {
    red:  { writer: makeMind({ ...P, seed: sd + 1 }), guesser: makeMind({ ...P, seed: sd + 2 }) },
    blue: { writer: makeMind({ ...P, seed: sd + 3 }), guesser: makeMind({ ...P, seed: sd + 4 }) } };

  let r;
  try { r = playMatch(b.words, b.colors, minds); }
  catch (e) { WATCH.crashes.push('match: ' + e.message); return null; }

  if (!r.winner) WATCH.stuck++;
  if (r.rounds >= 40) WATCH.hugeRound++;
  if (r.rounds <= 3) WATCH.instantWin++;
  return { b, r };
}

// ══ ١) الجولة الرئيسية ══
const P = PROFILES['عادي'];
const S = { g:0, rounds:0, clues:0, hits:0, guesses:0, foe:0, neut:0, black:0,
            blackG:0, short:0, long:0, num:0, perfect:0, zero:0, big:0, red:0, cluesN:{} };
for (let i = 0; i < N; i++) {
  const out = runOne(i, P, true);
  if (!out) continue;
  const { b, r } = out;
  S.g++; S.rounds += r.rounds; roundsArr.push(r.rounds);
  if (r.winner === 'red') S.red++;
  if (r.rounds <= 6) S.short++;
  if (r.rounds >= 18) S.long++;
  let gh = 0, gt = 0, hadBlack = false;
  r.events.forEach((e, k) => {
    S.clues++; S.num += e.num;
    S.cluesN[e.num] = (S.cluesN[e.num] || 0) + 1;
    clueFreq[e.clue] = (clueFreq[e.clue] || 0) + 1;
    axisUse[e.axis] = (axisUse[e.axis] || 0) + 1;
    axisTry[e.axis] = (axisTry[e.axis] || 0) + e.guessed.length;
    axisHit[e.axis] = (axisHit[e.axis] || 0) + e.hits;
    if (e.num >= 3) S.big++;
    if (e.hits === e.num && e.num > 0) S.perfect++;
    if (e.hits === 0) { S.zero++; if (e.guessed.length === 0) WATCH.emptyTurn++; }
    if (k === 0) firstHits.push(e.hits);
    if (e.guessed.some(x => x.color === 'black')) {
      if (k <= 1) WATCH.blackFirst++;
      if (disasters.length < 8) disasters.push({ clue: e.clue, n: e.num, ax: e.axis,
        got: e.guessed.map(x => x.word + '[' + x.color + ']') });
    }
    for (const x of e.guessed) {
      S.guesses++; gt++;
      if (x.color === e.team) { S.hits++; gh++; }
      else if (x.color === 'black') { S.black++; hadBlack = true; }
      else if (x.color === 'neutral') S.neut++;
      else S.foe++;
    }
    if (!['فئة','اضطرار'].includes(e.axis) && e.hits >= 3 && e.hits === e.guessed.length && gems.length < 40)
      gems.push({ c: e.clue, n: e.num, ax: e.axis, w: e.guessed.map(x => x.word) });
  });
  if (hadBlack) S.blackG++;
  if (gt) accArr.push(gh / gt);
}

console.log('\n┌─ ١) الصحة والسلامة ─┐\n');
const health = [
  ['لوحات مشوّهة (ليست ٩/٨/٧/١)', WATCH.badBoards, 0],
  ['لوحات مكرّرة حرفياً', WATCH.dupBoards, 0],
  ['انهيارات برمجية', WATCH.crashes.length, 0],
  ['مباريات علقت بلا فائز', WATCH.stuck, 0],
  ['أدوار بلا أي تخمين', WATCH.emptyTurn, 0],
  ['مباريات تجاوزت ٤٠ دوراً', WATCH.hugeRound, 0],
];
for (const [name, val, want] of health)
  console.log('  ' + (val === want ? '✔' : '✘') + ' ' + name.padEnd(34) + ar(val) + ' / ' + ar(S.g));
if (WATCH.crashes.length) console.log('    ' + [...new Set(WATCH.crashes)].slice(0, 3).join('\n    '));

console.log('\n┌─ ٢) نتائج ' + ar(S.g) + ' مباراة (لاعب عادي) ─┐\n');
const acc = pct(S.hits, S.guesses);
console.log('  دقة التخمين            ' + acc.toFixed(1) + '%  ' + bar(acc, 100));
console.log('  كلمات صحيحة/تلميح      ' + (S.hits / S.clues).toFixed(2));
console.log('  متوسط رقم التلميح      ' + (S.num / S.clues).toFixed(2));
console.log('  متوسط الأدوار          ' + (S.rounds / S.g).toFixed(1));
const sr = [...roundsArr].sort((a, b) => a - b);
console.log('  الأدوار: أقصر ' + sr[0] + ' · وسيط ' + sr[Math.floor(sr.length/2)] +
            ' · أطول ' + sr[sr.length-1]);
console.log('  تلميحات ناجحة تماماً   ' + pct(S.perfect, S.clues).toFixed(1) + '%');
console.log('  تلميحات فشلت كلياً     ' + pct(S.zero, S.clues).toFixed(1) + '%');
console.log('  أخطاء للخصم/مباراة     ' + (S.foe / S.g).toFixed(2));
console.log('  أخطاء محايدة/مباراة    ' + (S.neut / S.g).toFixed(2));
console.log('  مباريات لمست السوداء   ' + pct(S.blackG, S.g).toFixed(1) + '%');
console.log('  سوداء في أول دورين     ' + pct(WATCH.blackFirst, S.g).toFixed(1) + '%');
console.log('  قصيرة (≤٦) / طويلة (≥١٨) ' + pct(S.short, S.g).toFixed(1) + '% / ' +
            pct(S.long, S.g).toFixed(1) + '%');
console.log('  توازن الفوز (أحمر)     ' + pct(S.red, S.g).toFixed(1) + '%');
const fh = firstHits.reduce((a, b) => a + b, 0) / (firstHits.length || 1);
console.log('  إصابات الدور الأول     ' + fh.toFixed(2) + '  ← مؤشر "البداية المشجّعة"');

console.log('\n┌─ ٣) كل مستويات المهارة ─┐\n');
console.log('  اللاعب     دقة   كلمة/تلميح  رقم   أدوار  سوداء  طويلة');
console.log('  ' + '─'.repeat(62));
for (const p in PROFILES) {
  const PP = PROFILES[p];
  const T = { g:0, r:0, c:0, h:0, gs:0, n:0, bl:0, lo:0 };
  const n2 = Math.max(250, Math.round(N / 4));
  for (let i = 0; i < n2; i++) {
    const out = runOne(900000 + i, PP, false);
    if (!out) continue;
    const { r } = out;
    T.g++; T.r += r.rounds; if (r.rounds >= 18) T.lo++;
    let hb = false;
    for (const e of r.events) { T.c++; T.n += e.num;
      for (const x of e.guessed) { T.gs++; if (x.color === e.team) T.h++;
        else if (x.color === 'black') hb = true; } }
    if (hb) T.bl++;
  }
  console.log('  ' + p.padEnd(9) + (pct(T.h, T.gs).toFixed(1) + '%').padStart(6) +
    (T.h / T.c).toFixed(2).padStart(11) + (T.n / T.c).toFixed(2).padStart(7) +
    (T.r / T.g).toFixed(1).padStart(7) + (pct(T.bl, T.g).toFixed(0) + '%').padStart(7) +
    (pct(T.lo, T.g).toFixed(1) + '%').padStart(8));
}

console.log('\n┌─ ٤) أنواع الربط المستخدمة ─┐\n');
const axes = Object.keys(axisUse).sort((a, b) => axisUse[b] - axisUse[a]);
const mxA = axisUse[axes[0]];
let outBox = 0;
for (const a of axes) {
  if (!['فئة', 'اضطرار'].includes(a)) outBox += axisUse[a];
  console.log('  ' + a.padEnd(10) + bar(axisUse[a], mxA, 20) + ' ' +
    (pct(axisUse[a], S.clues).toFixed(1) + '%').padStart(6) +
    '   نجاح ' + pct(axisHit[a], axisTry[a] || 1).toFixed(0) + '%');
}
console.log('\n  ◆ التلميحات خارج الصندوق: ' + pct(outBox, S.clues).toFixed(1) + '%');

console.log('\n┌─ ٥) توزيع رقم التلميح ─┐\n');
const ks = Object.keys(S.cluesN).sort();
const mk = Math.max(...ks.map(k => S.cluesN[k]));
for (const k of ks) console.log('  رقم ' + k + '  ' + bar(S.cluesN[k], mk, 24) + ' ' +
  pct(S.cluesN[k], S.clues).toFixed(1) + '%');

console.log('\n┌─ ٦) التنوّع (هل تتكرر اللوحات؟) ─┐\n');
const wf = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]);
console.log('  لوحات فريدة              ' + ar(boardSigs.size) + ' / ' + ar(S.g) +
            '  (' + pct(boardSigs.size, S.g).toFixed(1) + '%)');
console.log('  كلمات ظهرت               ' + wf.length + ' / ' + POOL.length);
console.log('  كلمات لم تظهر أبداً       ' + (POOL.length - wf.length));
console.log('  أعلى تكرار لكلمة         ' + pct(wf[0][1], S.g).toFixed(1) + '%  (' + wf[0][0] + ')');
console.log('  النسبة المثالية          ' + (25 / POOL.length * 100).toFixed(1) + '%');
console.log('  أكثر ٨ كلمات: ' + wf.slice(0, 8).map(x => x[0] + ' ' + pct(x[1], S.g).toFixed(0) + '%').join(' · '));
const cf = Object.entries(clueFreq).sort((a, b) => b[1] - a[1]);
console.log('  تلميحات مختلفة استُخدمت   ' + cf.length);
console.log('  أكثر ٨ تلميحات: ' + cf.slice(0, 8).map(x => '"' + x[0] + '" ' + pct(x[1], S.clues).toFixed(1) + '%').join(' · '));

console.log('\n┌─ ٧) لقطات من اللعب ─┐\n');
console.log('  ★ أجمل التلميحات الإبداعية:');
const seen = new Set();
let shown = 0;
for (const g of gems) {
  const k = g.c + g.w.join();
  if (seen.has(k)) continue; seen.add(k);
  console.log('    "' + g.c + '" ' + g.n + ' [' + g.ax + '] → ' + g.w.join('، '));
  if (++shown >= 8) break;
}
if (disasters.length) {
  console.log('\n  ☠ كوارث الكلمة السوداء:');
  for (const d of disasters.slice(0, 4))
    console.log('    "' + d.clue + '" ' + d.n + ' [' + d.ax + '] → ' + d.got.join(' '));
}

console.log('\n╔' + '═'.repeat(70) + '╗');
console.log('║  الحكم');
console.log('╚' + '═'.repeat(70) + '╝\n');
const R = S.rounds / S.g, HPC = S.hits / S.clues;
let v, why;
if (acc >= 88) { v = 'سهلة جداً'; why = 'الربط أوضح من اللازم'; }
else if (acc >= 80) { v = 'سهلة-متوازنة'; why = 'ممتعة للعائلة، أسهل قليلاً من المحترفين'; }
else if (acc >= 62) { v = 'متوازنة ✓'; why = 'نجاح كافٍ للمتعة، وخطأ كافٍ للإثارة'; }
else { v = 'صعبة'; why = 'الخطأ أكثر من المعتاد'; }
console.log('  الصعوبة: ' + v + ' — ' + why);
console.log('  دقة ' + acc.toFixed(1) + '% · ' + HPC.toFixed(2) + ' كلمة/تلميح · ' + R.toFixed(1) + ' دور');
console.log('  المرجع البشري: دقة ٦٠-٧٥٪ · ١.٥-٢ كلمة/تلميح · ٩-١٤ دور');
const problems = health.filter(h => h[1] !== h[2]);
console.log('\n  مشاكل مرصودة: ' + (problems.length ? problems.map(p => p[0]).join('، ') : 'لا شيء ✔'));
