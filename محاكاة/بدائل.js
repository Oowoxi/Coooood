// ═══════════════════════════════════════════════════════════════
//  يقيس بدائل بناء اللوحة قياساً فعلياً: يعيد تنفيذ buildLinkableBoard
//  بمعاملات مختلفة، ثم يشغّل مباريات كاملة على كل بديل.
// ═══════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path'), vm = require('vm');
const { playMatch } = require('./match.js');
const { makeMind, similarity, CONCEPT_WORDS } = require('./mind2.js');

const RAW = fs.readFileSync(path.join(__dirname, '..', 'كود نيمز.html'), 'utf8');
const CODE = RAW.match(/<script>\n([\s\S]*)<\/script>/)[1];
const start = CODE.indexOf('const massiveWordsPool');
const end   = CODE.indexOf('function initDefaultRooms');
const SLICE = CODE.slice(start, end);

// يبني نسخة من بنّاء اللوحة بمعاملات قابلة للتعديل
function makeBuilder(bundles, blackFar) {
  let src = SLICE.replace('const TEAM_BUNDLES = [3, 2, 2];',
                          'const TEAM_BUNDLES = [' + bundles.join(',') + '];');
  const ctx = { console, Math, Date, Set, Object, Array, JSON, window: {} };
  vm.createContext(ctx);
  vm.runInContext(src + '\n;globalThis.__api={massiveWordsPool,buildWordMaps,buildLinkableBoard,_wordTopicMap:typeof _wordTopicMap!=="undefined"?_wordTopicMap:{}};', ctx);
  const api = ctx.__api;
  api.buildWordMaps(api.massiveWordsPool);
  return () => {
    const b = api.buildLinkableBoard(api.massiveWordsPool);
    if (!blackFar) return b;
    // بديل: اجعل الكلمة السوداء أبعد ما يمكن دلالياً عن كلمات الفريقين
    const cols = b.colors.slice(), words = b.words.slice();
    const bi = cols.indexOf('word-black');
    if (bi < 0) return b;
    const teamIdx = cols.map((c, i) => (c === 'word-red' || c === 'word-blue') ? i : -1).filter(i => i >= 0);
    const neuIdx  = cols.map((c, i) => c === 'word-neutral' ? i : -1).filter(i => i >= 0);
    const risk = i => teamIdx.reduce((m, j) => j === i ? m : Math.max(m, similarity(words[i], words[j])), 0);
    let bestI = bi, bestR = risk(bi);
    for (const ni of neuIdx) { const r = risk(ni); if (r < bestR) { bestR = r; bestI = ni; } }
    if (bestI !== bi) { cols[bi] = 'word-neutral'; cols[bestI] = 'word-black'; }
    return { words, colors: cols };
  };
}

const PROF = { creativity: 0.45, blindness: 0.24, divergence: 0.24 };
function evaluate(build, n, seed0) {
  const S = { g: 0, rounds: 0, clues: 0, hits: 0, guesses: 0, black: 0, num: 0,
              short: 0, long: 0, red: 0, big: 0, linked: 0, cells: 0, isol: 0 };
  for (let i = 0; i < n; i++) {
    const b = build();
    // بنية اللوحة
    const cols = b.colors.map(c => String(c).replace('word-', ''));
    for (const team of ['red', 'blue']) {
      const idx = [...Array(25).keys()].filter(k => cols[k] === team);
      for (const x of idx) {
        let best = 0;
        for (const y of idx) if (x !== y) best = Math.max(best, similarity(b.words[x], b.words[y]));
        S.cells++; if (best > 0.35) S.linked++; if (best < 0.15) S.isol++;
      }
    }
    const sd = seed0 + i * 7919;
    const minds = { red:  { writer: makeMind({ ...PROF, seed: sd + 1 }), guesser: makeMind({ ...PROF, seed: sd + 2 }) },
                    blue: { writer: makeMind({ ...PROF, seed: sd + 3 }), guesser: makeMind({ ...PROF, seed: sd + 4 }) } };
    const r = playMatch(b.words, b.colors, minds);
    S.g++; S.rounds += r.rounds;
    if (r.winner === 'red') S.red++;
    if (r.rounds <= 6) S.short++; if (r.rounds >= 18) S.long++;
    let hadBlack = false;
    for (const e of r.events) {
      S.clues++; S.num += e.num; if (e.num >= 3) S.big++;
      for (const x of e.guessed) { S.guesses++;
        if (x.color === e.team) S.hits++; else if (x.color === 'black') hadBlack = true; }
    }
    if (hadBlack) S.black++;
  }
  return S;
}

const N = +(process.argv[2] || 500);
const VARIANTS = [
  { name: '[3,2,2] الحالي', b: [3, 2, 2], far: false },
  { name: '[4,3,2]',        b: [4, 3, 2], far: false },
  { name: '[4,2,2]',        b: [4, 2, 2], far: false },
  { name: '[3,3,2]',        b: [3, 3, 2], far: false },
  { name: '[5,3,2]',        b: [5, 3, 2], far: false },
  { name: '[3,2,2]+سوداء بعيدة', b: [3, 2, 2], far: true },
  { name: '[4,3,2]+سوداء بعيدة', b: [4, 3, 2], far: true },
];

console.log('\n╔' + '═'.repeat(74) + '╗');
console.log('║  قياس بدائل بناء اللوحة — ' + N + ' مباراة لكل بديل');
console.log('╚' + '═'.repeat(74) + '╝\n');
console.log('  البديل                  دقة   كلمة/تلميح  رقم   أدوار  سوداء  مترابط  معزول  تلميح٣+');
console.log('  ' + '─'.repeat(90));
const rows = [];
for (const v of VARIANTS) {
  const build = makeBuilder(v.b, v.far);
  const S = evaluate(build, N, 4242);
  const row = { name: v.name,
    acc: S.hits / S.guesses * 100, hpc: S.hits / S.clues, num: S.num / S.clues,
    rounds: S.rounds / S.g, black: S.black / S.g * 100,
    linked: S.linked / S.cells * 100, isol: S.isol / S.cells * 100,
    big: S.big / S.clues * 100, red: S.red / S.g * 100, short: S.short / S.g * 100, long: S.long / S.g * 100 };
  rows.push(row);
  console.log('  ' + v.name.padEnd(22) +
    (row.acc.toFixed(1) + '%').padStart(6) + row.hpc.toFixed(2).padStart(11) +
    row.num.toFixed(2).padStart(7) + row.rounds.toFixed(1).padStart(7) +
    (row.black.toFixed(0) + '%').padStart(7) + (row.linked.toFixed(0) + '%').padStart(8) +
    (row.isol.toFixed(0) + '%').padStart(7) + (row.big.toFixed(0) + '%').padStart(8));
}
console.log('\n  ── تفاصيل إضافية ──');
console.log('  البديل                  توازن الفوز   قصيرة   طويلة');
for (const r of rows) console.log('  ' + r.name.padEnd(22) +
  (r.red.toFixed(0) + '%').padStart(9) + (r.short.toFixed(1) + '%').padStart(9) + (r.long.toFixed(1) + '%').padStart(8));
