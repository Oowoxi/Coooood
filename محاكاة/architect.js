// ═══════════════════════════════════════════════════════════════
//  المهندس: يصمّم اللوحة بقصد بدل أن يرميها عشوائياً.
//
//  الفلسفة: اللوحة الممتعة ليست "سهلة" ولا "صعبة" — بل **متدرّجة**.
//  فيها نصر سريع يشعرك بالذكاء، وتحدٍّ يشعرك بالإنجاز، وفخّ يشعرك
//  بالخطر. المهندس يزرع هذه الثلاثة عمداً في كل لوحة.
// ═══════════════════════════════════════════════════════════════
const { CONCEPT_WORDS, CONCEPT_AXIS, similarity, AXIS_W } = require('./mind2.js');

// ── تصنيف صعوبة المفهوم ──
// المحاور التصنيفية (فئة/تلازم/جزء) بديهية = سهلة.
// المحاور الحسّية والمجازية (لون/شكل/مجاز) تحتاج قفزة ذهنية = صعبة.
const AXIS_DIFF = {
  'فئة': 1.0, 'تلازم': 1.0, 'جزء': 1.4, 'جذر': 1.5, 'مكان': 1.6,
  'وظيفة': 1.8, 'مادة': 1.8, 'تراث': 2.0, 'طعام': 1.1, 'رياضة2': 1.2,
  'حيوان2': 1.2, 'جسد2': 1.3, 'مجرّد': 1.7, 'صنع': 1.4, 'أصوات2': 2.0,
  'مرشحون': 1.3, 'مرشحون2': 1.3, 'محاور-مرشحين': 1.9,
  'صوت': 2.2, 'خاصية': 2.3, 'لون': 2.5, 'شكل': 2.6, 'مجاز': 2.8,
};

function buildCatalog(pool) {
  const inPool = new Set(pool);
  const cat = [];
  for (const c in CONCEPT_WORDS) {
    const ws = [];
    for (const [w, s] of CONCEPT_WORDS[c]) if (inPool.has(w) && s >= 0.45) ws.push({ w, s });
    if (ws.length < 2) continue;
    ws.sort((a, b) => b.s - a.s);
    const axis = CONCEPT_AXIS[c] || 'فئة';
    cat.push({ concept: c, axis, words: ws, diff: AXIS_DIFF[axis] || 1.5,
               label: c.startsWith('جذر:') ? c.slice(4).replace(/ /g, '') :
                      c.includes('+') ? c.split('+')[0] : c });
  }
  return cat;
}

// ── وصفة اللوحة الممتعة ──
// لكل فريق: عنقود سهل كبير (نصر سريع) + عنقود متوسط + عنقود صعب مبدع
// الباقي منفرد. هذا يضمن تدرّجاً حقيقياً في كل مباراة.
const RECIPE_RED  = [ { size: 4, band: 'سهل' }, { size: 3, band: 'متوسط' }, { size: 2, band: 'صعب' } ];
const RECIPE_BLUE = [ { size: 4, band: 'سهل' }, { size: 2, band: 'متوسط' }, { size: 2, band: 'صعب' } ];
const RECIPE = RECIPE_RED;
const BAND_RANGE = { 'سهل': [0.9, 1.5], 'متوسط': [1.4, 2.0], 'صعب': [1.9, 3.0] };

function pickCluster(cat, band, size, used, usedConcepts, rnd) {
  const [lo, hi] = BAND_RANGE[band];
  const ok = cat.filter(c => c.diff >= lo && c.diff <= hi && !usedConcepts.has(c.concept) &&
                             c.words.filter(x => !used.has(x.w)).length >= size);
  if (!ok.length) return null;
  // ترجيح عشوائي لتنوّع اللوحات بين المباريات
  const pick = ok[Math.floor(rnd() * ok.length)];
  const avail = pick.words.filter(x => !used.has(x.w));
  // نأخذ الأبرز لضمان وضوح الرابط داخل العنقود
  const take = avail.slice(0, Math.min(size + 2, avail.length));
  const chosen = [];
  while (chosen.length < size && take.length) chosen.push(take.splice(Math.floor(rnd() * take.length), 1)[0]);
  if (chosen.length < size) return null;
  return { concept: pick.concept, label: pick.label, axis: pick.axis, diff: pick.diff,
           band, words: chosen.map(x => x.w) };
}

// ── الفخّ: كلمة محايدة قريبة عمداً من عنقود الخصم ──
// هذا ما يخلق لحظة "كدت أخطئ" التي تصنع المتعة.
function findTrap(cluster, pool, used, rnd) {
  const cands = [];
  // مرشّح الفخّ: كلمة خارج العنقود لكنها قريبة دلالياً من كلماته.
  // نقيس القرب بالتشابه الفعلي لا بعضوية المفهوم، فالعضوية تنفد.
  for (const w of pool) {
    if (used.has(w)) continue;
    let best = 0;
    for (const cw of cluster.words) best = Math.max(best, similarity(w, cw));
    // نافذة الإغراء: قريبة بما يكفي لتُغري، بعيدة بما يكفي ألا تكون الأوضح
    if (best >= 0.45 && best <= 1.60) cands.push({ w, best });
  }
  if (!cands.length) return null;
  cands.sort((a, b) => b.best - a.best);
  // نختار من أقوى الثلث حتى يكون الفخّ مغرياً فعلاً
  const top = cands.slice(0, Math.max(1, Math.ceil(cands.length / 3)));
  return top[Math.floor(rnd() * top.length)].w;
}

function mulberry(a) {
  return function () { a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── تصميم لوحة واحدة ──
function design(pool, cat, seed) {
  const rnd = mulberry(seed);
  const used = new Set(), usedConcepts = new Set();
  const plan = { red: [], blue: [] };

  for (const team of ['red', 'blue']) {
    for (const r of (team === 'red' ? RECIPE_RED : RECIPE_BLUE)) {
      // الفريق الأزرق لديه 8 خانات فقط: نتخطى إن امتلأ
      const have = plan[team].reduce((a, c) => a + c.words.length, 0);
      const cap = team === 'red' ? 9 : 8;
      if (have + r.size > cap) continue;
      let cl = pickCluster(cat, r.band, r.size, used, usedConcepts, rnd);
      // تراجع تدريجي: إن لم يوجد في النطاق، جرّب نطاقاً مجاوراً
      if (!cl && r.band === 'صعب')   cl = pickCluster(cat, 'متوسط', r.size, used, usedConcepts, rnd);
      if (!cl && r.band === 'متوسط') cl = pickCluster(cat, 'سهل',   r.size, used, usedConcepts, rnd);
      if (!cl) continue;
      cl.words.forEach(w => used.add(w));
      usedConcepts.add(cl.concept);
      plan[team].push(cl);
    }
  }

  const words = [], colors = [];
  const add = (w, c) => { words.push(w); colors.push(c); used.add(w); };
  for (const t of ['red', 'blue'])
    for (const cl of plan[t]) cl.words.forEach(w => add(w, 'word-' + t));

  // فخاخ محايدة: واحد لكل عنقود من العناقيد الأربعة الأولى
  const traps = [];
  const allCl = [...plan.red, ...plan.blue];
  for (const cl of allCl) {
    if (traps.length >= 4) break;
    const t = findTrap(cl, pool, used, rnd);
    if (t) { add(t, 'word-neutral'); traps.push({ word: t, from: cl.label }); }
  }

  // بقية الخانات: كلمات بعيدة عن كل ما سبق (لا تشوّش)
  const need = { 'word-red': 9, 'word-blue': 8, 'word-neutral': 7, 'word-black': 1 };
  const have = {}; colors.forEach(c => have[c] = (have[c] || 0) + 1);
  // البقية: نخلط القائمة أولاً ثم نقبل أول كلمة "بعيدة بما يكفي".
  // الفرز بالبُعد وحده يعيد نفس الكلمات في كل لوحة فتصير مملّة.
  const rest = pool.filter(w => !used.has(w));
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1)); const t = rest[i]; rest[i] = rest[j]; rest[j] = t;
  }
  const MAX_LINK = 0.85;   // حدّ التشويش المسموح للكلمة المنفردة
  let ptr = 0;
  function takeFar(limit) {
    // تمريرة أولى: أول كلمة تحت الحدّ
    for (let k = ptr; k < rest.length; k++) {
      const w = rest[k]; if (used.has(w)) continue;
      let m = 0; for (const x of words) { m = Math.max(m, similarity(w, x)); if (m > limit) break; }
      if (m <= limit) { rest.splice(k, 1); return w; }
    }
    // تمريرة ثانية بلا شرط (ضمان عدم الفشل)
    for (let k = 0; k < rest.length; k++) {
      const w = rest[k]; if (used.has(w)) continue; rest.splice(k, 1); return w;
    }
    return null;
  }
  for (const c of ['word-red', 'word-blue', 'word-neutral']) {
    while ((have[c] || 0) < need[c]) {
      const w = takeFar(MAX_LINK);
      if (!w) break;
      add(w, c); have[c] = (have[c] || 0) + 1;
    }
  }
  // الكلمة السوداء: الأبعد بين عيّنة عشوائية (لا الأبعد مطلقاً، وإلا تكرّرت)
  let black = null, bestRisk = Infinity;
  const sample = rest.filter(w => !used.has(w)).slice(0, 120);
  for (const cand of sample) {
    let m = 0; for (const x of words) m = Math.max(m, similarity(cand, x));
    if (m < bestRisk) { bestRisk = m; black = cand; }
  }
  if (black) { add(black, 'word-black'); have['word-black'] = 1; }

  if (words.length !== 25) return null;
  return { words, colors, plan, traps, blackRisk: bestRisk };
}

module.exports = { buildCatalog, design, AXIS_DIFF, RECIPE_RED, RECIPE_BLUE };
