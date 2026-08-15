// ═══ تحليل: أي الكلمات يصعب ربطها فعلاً، وكم تكلّف المتعة؟ ═══
const { POOL } = require('./board.js');
const { similarity, CONCEPT_WORDS } = require('./mind2.js');

// درجة "قابلية الربط" لكل كلمة: مجموع أقوى ١٢ رابطاً لها مع بقية القائمة
const score = {}, partners = {};
for (const w of POOL) {
  const sims = [];
  for (const o of POOL) { if (o === w) continue; const s = similarity(w, o); if (s > 0) sims.push([o, s]); }
  sims.sort((a, b) => b[1] - a[1]);
  score[w] = sims.slice(0, 12).reduce((a, b) => a + b[1], 0);
  partners[w] = sims.length;
}
const sorted = [...POOL].sort((a, b) => score[a] - score[b]);
const ar = n => n.toLocaleString('ar-EG', { maximumFractionDigits: 2 });

console.log('\n╔══════ قابلية الربط لكل كلمة في القائمة (٩٦٩ كلمة) ══════╗\n');
const dead  = sorted.filter(w => score[w] < 0.8);
const weak  = sorted.filter(w => score[w] >= 0.8 && score[w] < 2.5);
const ok    = sorted.filter(w => score[w] >= 2.5 && score[w] < 6);
const rich  = sorted.filter(w => score[w] >= 6);
console.log('  ميتة   (< 0.8) : ' + dead.length + '  (' + (dead.length/POOL.length*100).toFixed(1) + '%) ← لا تصلح للعبة');
console.log('  ضعيفة  (0.8-2.5): ' + weak.length + '  (' + (weak.length/POOL.length*100).toFixed(1) + '%)');
console.log('  جيدة   (2.5-6) : ' + ok.length + '  (' + (ok.length/POOL.length*100).toFixed(1) + '%)');
console.log('  غنية   (> 6)   : ' + rich.length + '  (' + (rich.length/POOL.length*100).toFixed(1) + '%)');

console.log('\n  ── أسوأ ٤٠ كلمة (يستحيل تقريباً بناء تلميح عليها) ──');
for (let i = 0; i < 40; i += 8)
  console.log('    ' + sorted.slice(i, i + 8).map(w => w + '(' + score[w].toFixed(1) + ')').join('  '));

console.log('\n  ── أغنى ٢٠ كلمة (تعطي تلميحات ممتعة) ──');
const top = sorted.slice(-20).reverse();
for (let i = 0; i < 20; i += 5)
  console.log('    ' + top.slice(i, i + 5).map(w => w + '(' + score[w].toFixed(1) + ')').join('  '));

// أثر إزالة الكلمات الميتة على لوحة من ٢٥
const avgAll = POOL.reduce((s, w) => s + score[w], 0) / POOL.length;
const clean = POOL.filter(w => score[w] >= 0.8);
const avgClean = clean.reduce((s, w) => s + score[w], 0) / clean.length;
console.log('\n  متوسط قابلية الربط الآن        : ' + avgAll.toFixed(2));
console.log('  لو حُذفت الكلمات الميتة        : ' + avgClean.toFixed(2) +
            '  (+' + ((avgClean/avgAll-1)*100).toFixed(0) + '%)');
console.log('  متوقّع كلمات ميتة في لوحة ٢٥   : ' + (dead.length/POOL.length*25).toFixed(1) + ' كلمة');
