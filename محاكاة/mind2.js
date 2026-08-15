// ═══════════════════════════════════════════════════════════════
//  العقل: يبني شبكة ربط من كل المصادر ثم يفكّر بها.
//  الفرق الجوهري عن brain.js القديم: التلميح ليس اسم فئة فقط،
//  بل أي مفهوم يربط الكلمات — لون، شكل، مجاز، جذر، تراث...
// ═══════════════════════════════════════════════════════════════
const { AXES, AXIS_W, PAIRS, ROOTS } = require('./kb.js');
const { CONCEPTS } = require('./brain.js');

// ── بناء الفهرس الكوني: مفهوم -> { كلمة: قوة } ──
const CONCEPT_WORDS = {};   // مفهوم -> Map(كلمة -> قوة)
const WORD_CONCEPTS = {};   // كلمة -> Set(مفهوم)
const CONCEPT_AXIS  = {};   // مفهوم -> المحور الذي جاء منه

function addLink(concept, word, strength, axis) {
  if (!CONCEPT_WORDS[concept]) { CONCEPT_WORDS[concept] = new Map(); CONCEPT_AXIS[concept] = axis; }
  const cur = CONCEPT_WORDS[concept].get(word) || 0;
  if (strength > cur) CONCEPT_WORDS[concept].set(word, strength);
  if (!WORD_CONCEPTS[word]) WORD_CONCEPTS[word] = new Set();
  WORD_CONCEPTS[word].add(concept);
}

// 1) الفئات القديمة (تبقى صالحة — هي أيضاً طريقة ربط بشرية)
for (const c in CONCEPTS) {
  CONCEPTS[c].forEach((w, i) => addLink(c, w, 1 - Math.min(0.30, i * 0.010), 'فئة'));
}
// 2) المحاور الجديدة: لون، شكل، خاصية، صوت، مادة، وظيفة، مكان، مجاز، تراث، جزء
for (const axis in AXES) {
  const wgt = AXIS_W[axis] || 0.7;
  for (const name in AXES[axis]) {
    // اسم المفهوم يحمل محوره ليُقرأ طبيعياً: "أصفر" وليس "لون:أصفر"
    AXES[axis][name].forEach((w, i) => addLink(name, w, (1 - Math.min(0.25, i * 0.010)) * wgt, axis));
  }
}
// 3) التلازم: كل زوج مفهوم ثنائي قوي
for (const [a, b] of PAIRS) {
  const key = a + '+' + b;
  addLink(key, a, AXIS_W['تلازم'], 'تلازم');
  addLink(key, b, AXIS_W['تلازم'], 'تلازم');
}
// 4) الجذور
for (const r in ROOTS) {
  ROOTS[r].forEach(w => addLink('جذر:' + r, w, AXIS_W['جذر'], 'جذر'));
}

// ── مصفوفة القرب بين كلمتين: كم مفهوماً يتشاركان وبأي قوة ──
const SIM = new Map();
function simKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
for (const c in CONCEPT_WORDS) {
  const ws = [...CONCEPT_WORDS[c].keys()];
  if (ws.length > 60) continue;              // مفهوم فضفاض لا يفيد كرابط
  for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) {
    const k = simKey(ws[i], ws[j]);
    const v = Math.min(CONCEPT_WORDS[c].get(ws[i]), CONCEPT_WORDS[c].get(ws[j]));
    SIM.set(k, (SIM.get(k) || 0) + v * v);   // تربيع: الروابط القوية تهيمن
  }
}
function similarity(a, b) { return a === b ? 1 : (SIM.get(simKey(a, b)) || 0); }

// ── ذهن فرد: نفس المعرفة، لكن بتفاوت شخصي حقيقي ──
// creativity: ميل هذا الذهن للمحاور غير التصنيفية (خارج الصندوق)
// blindness : روابط لا تخطر له إطلاقاً
// divergence: تفاوت تقدير قوة الرابط
function makeMind(opts) {
  const o = Object.assign({ divergence: 0.22, blindness: 0.20, creativity: 0.5 }, opts || {});
  const bias = new Map(), blind = new Map();
  const rnd = mulberry(o.seed || (Math.random() * 1e9) | 0);
  return {
    opts: o, rnd,
    // ميل شخصي لكل محور: بعض الناس بصريّون، بعضهم أدبيّون
    axisTaste: (() => {
      const t = {};
      for (const ax in AXIS_W) {
        const base = AXIS_W[ax];
        const isCreative = !['فئة', 'تلازم', 'جزء'].includes(ax);
        // الذهن المبدع يرفع وزن المحاور غير التصنيفية
        t[ax] = base * (isCreative ? (0.55 + o.creativity * 0.95) : 1) * (0.85 + rnd() * 0.3);
      }
      return t;
    })(),
    assoc(word, concept) {
      const m = CONCEPT_WORDS[concept];
      if (!m) return 0;
      const key = word + '|' + concept;
      if (!blind.has(key)) blind.set(key, rnd() < o.blindness);
      if (blind.get(key)) return 0;                       // لم يخطر له
      const raw = m.get(word);
      if (raw === undefined) return 0;
      const ax = CONCEPT_AXIS[concept] || 'فئة';
      if (!bias.has(key)) bias.set(key, (rnd() - 0.5) * 2 * o.divergence);
      const taste = this.axisTaste[ax] / (AXIS_W[ax] || 1);
      return Math.max(0, Math.min(1.25, raw * taste + bias.get(key) * 0.5));
    }
  };
}
function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

module.exports = { CONCEPT_WORDS, WORD_CONCEPTS, CONCEPT_AXIS, similarity, makeMind, AXIS_W };
