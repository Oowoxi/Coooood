// ═══════════════════════════════════════════════════════════════
//  اللاعبون: كاتب يفكّر خارج الصندوق، ومتوقّع يحاول قراءة نيّته.
// ═══════════════════════════════════════════════════════════════
const { CONCEPT_WORDS, CONCEPT_AXIS, WORD_CONCEPTS } = require('./mind2.js');

// مفاهيم اسمها فضفاض لا يصلح تلميحاً حقيقياً بين البشر
const VAGUE = new Set(['ضد', 'سببية', 'قياس', 'أشكال', 'اتجاه', 'عدة', 'شيء']);

// اسم التلميح كما يُنطق للاعبين (مفاهيم التلازم والجذر لها صياغة خاصة)
function clueLabel(concept) {
  if (concept.startsWith('جذر:')) return concept.slice(4).replace(/ /g, '');
  if (concept.includes('+')) return concept.split('+')[0];
  return concept;
}

// ── الكاتب ──
// يمسح كل المفاهيم (٢٤٥ منها عبر ١٣ محوراً) ويبحث عن أفضل
// مقايضة بين: كم كلمة من فريقي يغطي، وكم يخاطر بكلمات الخصم/السوداء.
function chooseClue(board, myTeam, mind, opts) {
  opts = opts || {};
  const banned = opts.banned || new Set();   // تلميحات قيلت ولم تُثمر
  const A = (w, c) => mind.assoc(w, c);
  const alive   = board.map((c, i) => ({ ...c, i })).filter(c => !c.revealed);
  const mine    = alive.filter(c => c.color === myTeam);
  const foe     = myTeam === 'red' ? 'blue' : 'red';
  const theirs  = alive.filter(c => c.color === foe);
  const neutral = alive.filter(c => c.color === 'neutral');
  const black   = alive.filter(c => c.color === 'black');
  if (!mine.length) return null;

  // عتبة العضوية: لا يبني على رابط باهت (لكن لا تكن متزمّتاً)
  const MEMBER = 0.30;
  const cands = [];

  for (const concept in CONCEPT_WORDS) {
    if (VAGUE.has(concept)) continue;
    const hit = [];
    for (const c of mine) { const s = A(c.word, concept); if (s >= MEMBER) hit.push({ c, s }); }
    if (!hit.length) continue;
    hit.sort((a, b) => b.s - a.s);

    // لا يجوز أن يكون التلميح كلمةً معروضة على اللوحة
    const label = clueLabel(concept);
    if (alive.some(c => c.word === label)) continue;
    // تلميح جُرّب ولم يوصل لشيء: لا معنى لإعادته حرفياً
    if (banned.has(concept)) continue;

    const worst = arr => arr.reduce((m, c) => Math.max(m, A(c.word, concept)), 0);
    const rT = worst(theirs), rN = worst(neutral), rB = worst(black);
    const danger = Math.max(rT, rN, rB);

    // يأخذ فقط الكلمات التي تسبق أقرب خطر بفارق واضح
    const safe = hit.filter(x => x.s > danger + 0.02);
    if (!safe.length) continue;

    const num = Math.min(safe.length, 4);
    // المخاطرة تُقاس بالضرر الفعلي: السوداء تنهي المباراة
    const penalty = rB * 6.0 + rT * 1.6 + rN * 0.55;
    // مكافأة الجرأة: تلميح يغطي أكثر يستحق مخاطرة أعلى
    const value = num * 1.35 - penalty + (safe[num - 1] ? safe[num - 1].s * 0.5 : 0);
    cands.push({ concept, label, num, value, axis: CONCEPT_AXIS[concept] || 'فئة',
                 targets: safe.slice(0, num).map(x => x.c.i), danger });
  }

  if (!cands.length) {
    // لا يوجد تلميح آمن: خذ أقوى رابط متاح لأي كلمة من فريقي،
    // مع تفضيل ما يقلّ خطره — هذا ما يفعله اللاعب المحشور.
    let bf = null;
    for (const c of mine) {
      for (const concept of (WORD_CONCEPTS[c.word] || [])) {
        if (VAGUE.has(concept) || banned.has(concept)) continue;
        const label = clueLabel(concept);
        if (alive.some(x => x.word === label)) continue;
        const s = A(c.word, concept);
        if (s <= 0) continue;
        const rB = black.reduce((m, x) => Math.max(m, A(x.word, concept)), 0);
        const rT = theirs.reduce((m, x) => Math.max(m, A(x.word, concept)), 0);
        const v = s - rB * 4 - rT * 1.2;
        if (!bf || v > bf.v) bf = { concept, label, v, i: c.i };
      }
    }
    if (bf) return { concept: bf.concept, label: bf.label, num: 1,
                     targets: [bf.i], axis: CONCEPT_AXIS[bf.concept] || 'فئة', danger: 0 };
    const c = mine[0];
    const any = [...(WORD_CONCEPTS[c.word] || ['شيء'])][0];
    return { concept: any, label: clueLabel(any), num: 1, targets: [c.i], axis: 'اضطرار', danger: 1 };
  }
  cands.sort((a, b) => b.value - a.value);
  // اختيار من بين الأفضل قليلاً (ليس دائماً الأمثل — البشر كذلك)
  const top = cands.slice(0, Math.max(1, Math.min(3, cands.length)));
  return top[Math.floor(mind.rnd() * top.length)];
}

// ── المتوقّع ──
// يرى التلميح والعدد فقط. يرتّب الكلمات الحيّة بقربها من التلميح.
function rankGuesses(board, concept, mind) {
  const alive = board.map((c, i) => ({ ...c, i })).filter(c => !c.revealed);
  return alive.map(c => {
    const base = mind.assoc(c.word, concept);
    const noise = (mind.rnd() - 0.5) * 0.30;
    return { i: c.i, word: c.word, s: base > 0 ? base + noise * 0.5 : base + noise * 0.12 };
  }).sort((a, b) => b.s - a.s);
}

module.exports = { chooseClue, rankGuesses, clueLabel };
