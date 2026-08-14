// ═══════════ اللاعبون الآليون: كاتب ومتوقّع ═══════════
// نقطة الواقعية الحاسمة: لكل لاعب "ذهن" مختلف قليلاً.
// لو تشارك الكاتب والمتوقّع نفس النموذج تماماً لصارت الدقة ٩٨٪
// وهو رقم لا يحدث بين بشر. الاختلاف الذهني هو جوهر صعوبة اللعبة.
const { CONCEPTS, CONCEPT_OF, assoc } = require('./brain.js');

// ── ذهن لاعب: انحراف ثابت عن المعرفة "المثالية" ──
// divergence: 0 = ذهن مطابق، 1 = ذهن مختلف جداً
function makeMind(divergence, blindness) {
  const bias = new Map();   // (كلمة|مفهوم) -> إزاحة ثابتة لهذا اللاعب
  const blind = new Map();  // روابط لا يستحضرها هذا الذهن أصلاً
  blindness = blindness === undefined ? 0 : blindness;
  return {
    divergence,
    // هل هذا الذهن "أعمى" عن هذا الرابط؟ (لا يخطر له إطلاقاً)
    isBlind(word, concept) {
      const key = word + '|' + concept;
      if (!blind.has(key)) blind.set(key, Math.random() < blindness);
      return blind.get(key);
    },
    assoc(word, concept) {
      if (this.isBlind(word, concept)) return 0;   // لم يخطر له هذا الربط
      const base = assoc(word, concept);
      const key = word + '|' + concept;
      if (!bias.has(key)) {
        // انحراف ثابت: هذا اللاعب دائماً يرى هذا الربط أقوى/أضعف
        bias.set(key, (Math.random() - 0.5) * 2 * divergence);
      }
      const off = bias.get(key);
      // عضو حقيقي في المفهوم: يختلف تقديره قليلاً من شخص لآخر
      if (base > 0) return Math.max(0.05, base + off * 0.55);
      // ربط شخصي مخترع: يبقى *ضعيفاً دائماً* ولا يرقى لعضوية حقيقية،
      // وإلا بنى الكاتب تلميحه على رابط وهمي لا يراه المتوقّع إطلاقاً.
      return off > divergence * 0.80 ? Math.min(0.30, (off - divergence * 0.80) * 1.2) : 0;
    }
  };
}

// ── الكاتب ──
function chooseClue(board, myTeam, skill, mind) {
  const A = (w, c) => mind.assoc(w, c);
  const alive = board.map((c, i) => ({ ...c, i })).filter(c => !c.revealed);
  const mine    = alive.filter(c => c.color === myTeam);
  const theirs  = alive.filter(c => c.color === (myTeam === 'red' ? 'blue' : 'red'));
  const neutral = alive.filter(c => c.color === 'neutral');
  const black   = alive.filter(c => c.color === 'black');
  if (!mine.length) return null;

  let best = null;
  for (const concept of Object.keys(CONCEPTS)) {
    // الكاتب لا يبني تلميحاً إلا على كلمات يراها عضواً واضحاً في المفهوم
    const mineHit = mine.map(c => ({ c, s: A(c.word, concept) })).filter(x => x.s >= 0.45)
                        .sort((a, b) => b.s - a.s);
    if (!mineHit.length) continue;
    const maxOther = arr => arr.reduce((m, c) => Math.max(m, A(c.word, concept)), 0);
    const riskTheir = maxOther(theirs), riskNeut = maxOther(neutral), riskBlack = maxOther(black);
    const threshold = Math.max(riskTheir, riskNeut, riskBlack);
    const safe = mineHit.filter(x => x.s > threshold + 0.001);
    if (!safe.length) continue;
    const num = Math.min(safe.length, 3);
    const penalty = (riskBlack * 3.0 + riskTheir * 1.2 + riskNeut * 0.4) * skill;
    const value = num - penalty + Math.random() * (1 - skill) * 0.8;
    if (!best || value > best.value) {
      best = { concept, num, value, targets: safe.slice(0, num).map(x => x.c.i) };
    }
  }
  if (!best) {
    const c = mine[0];
    return { concept: (CONCEPT_OF[c.word] || ['شيء'])[0], num: 1, targets: [c.i] };
  }
  return { concept: best.concept, num: best.num, targets: best.targets };
}

// ── المتوقّع: يرى التلميح فقط، ولا يعرف الألوان ولا نيّة الكاتب ──
function rankGuesses(board, concept, skill, mind) {
  const alive = board.map((c, i) => ({ ...c, i })).filter(c => !c.revealed);
  return alive.map(c => {
    const base = mind.assoc(c.word, concept);
    const noise = (Math.random() - 0.5) * (1 - skill) * 0.9;
    return { i: c.i, word: c.word, s: base + (base > 0 ? noise * 0.5 : noise * 0.25) };
  }).sort((a, b) => b.s - a.s);
}

module.exports = { chooseClue, rankGuesses, makeMind };
