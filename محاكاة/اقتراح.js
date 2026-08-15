// ═══ العقل يقترح كلمات ويحكم عليها بمعاييره هو ═══
const { POOL } = require('./board.js');
const { CONCEPT_WORDS, CONCEPT_AXIS, similarity } = require('./mind2.js');
const { AXIS_DIFF, buildCatalog } = require('./architect.js');
const inPool = new Set(POOL);

// المرشّحون: أسماء ملموسة مألوفة، تخدم المحاور الصعبة (لون/شكل/مجاز/خاصية/تراث)
const CAND = require('./candidates.json');

// معايير الحكم:
// 1) الاندماج: قوة روابطها مع القائمة الحالية
// 2) الخدمة: كم عنقوداً صعباً/متوسطاً تُقوّي
// 3) عدم التكرار: ألا تكون مرادفاً لكلمة موجودة (تشابه مفرط)
// 4) التوازن: ألا تكون فضفاضة ترتبط بكل شيء
const rows = [];
for (const w of CAND) {
  if (inPool.has(w)) { rows.push({ w, skip: 'موجودة' }); continue; }
  let integ = 0, tooClose = null, wide = 0;
  const sims = [];
  for (const o of POOL) {
    const s = similarity(w, o);
    if (s > 0) { sims.push([o, s]); integ += 0; }
  }
  sims.sort((a, b) => b[1] - a[1]);
  const top12 = sims.slice(0, 12);
  integ = top12.reduce((a, b) => a + b[1], 0);
  if (sims.length && sims[0][1] >= 3.2) tooClose = sims[0][0];
  wide = sims.filter(x => x[1] >= 0.8).length;

  let hardServe = 0, midServe = 0, serves = [];
  for (const c in CONCEPT_WORDS) {
    if (!CONCEPT_WORDS[c].has(w)) continue;
    const ax = CONCEPT_AXIS[c] || 'فئة';
    const d = AXIS_DIFF[ax] || 1.5;
    const have = [...CONCEPT_WORDS[c].keys()].filter(x => inPool.has(x) && CONCEPT_WORDS[c].get(x) >= 0.45).length;
    if (d >= 1.9) { hardServe++; serves.push(c + '(صعب,' + have + ')'); }
    else if (d >= 1.4) { midServe++; serves.push(c + '(متوسط,' + have + ')'); }
  }
  rows.push({ w, integ, hardServe, midServe, wide, tooClose, serves: serves.slice(0, 3),
              nTop: top12.slice(0, 3).map(x => x[0]) });
}

const ok = rows.filter(r => !r.skip);
const MED = 10.5;
for (const r of ok) {
  r.verdict = r.tooClose ? 'مرادف لـ' + r.tooClose
    : r.wide > 55 ? 'فضفاضة'
    : r.integ < 8 ? 'ضعيفة'
    : (r.hardServe + r.midServe) === 0 ? 'لا تخدم الصعب'
    : 'مقبولة';
  r.score = r.integ + r.hardServe * 4 + r.midServe * 2;
}
const good = ok.filter(r => r.verdict === 'مقبولة').sort((a, b) => b.score - a.score);
const bad  = ok.filter(r => r.verdict !== 'مقبولة');

console.log('\n╔══ حكم العقل على ' + rows.length + ' مرشّحاً ══╗\n');
console.log('  مقبولة: ' + good.length + ' | مرفوضة: ' + bad.length +
            ' | موجودة أصلاً: ' + rows.filter(r => r.skip).length);
console.log('\n── المقبولة (مرتّبة بالأفضلية) ──');
console.log('  الكلمة        اندماج  صعب  متوسط  أقرب الكلمات');
for (const r of good) console.log('  ' + r.w.padEnd(14) + r.integ.toFixed(1).padStart(6) +
  String(r.hardServe).padStart(5) + String(r.midServe).padStart(6) + '   ' + r.nTop.join('، '));
console.log('\n── المرفوضة والسبب ──');
const byV = {};
for (const r of bad) (byV[r.verdict] = byV[r.verdict] || []).push(r.w);
for (const v in byV) console.log('  ' + v + ': ' + byV[v].join('، '));
require('fs').writeFileSync('/tmp/good.json', JSON.stringify(good.map(r => r.w)));
