// ═══════════ محرّك المباراة: قواعد اللعبة الحقيقية ═══════════
const { chooseClue, rankGuesses, makeMind } = require('./players.js');

// يبني لوحة بمنطق التطبيق نفسه (يُمرَّر من الخارج) ويلعب مباراة كاملة
function playMatch(buildBoard, opts) {
  opts = opts || {};
  const skillW = opts.skillWriter  !== undefined ? opts.skillWriter  : 0.72;
  const skillG = opts.skillGuesser !== undefined ? opts.skillGuesser : 0.68;
  const diverg = opts.divergence   !== undefined ? opts.divergence   : 0.34;
  const caution = opts.caution     !== undefined ? opts.caution      : 0.32;
  const MAX_TURNS = 60;
  // أذهان مستقلة: أربعة لاعبين، كل واحد يرى الروابط بشكل مختلف قليلاً
  // ── لماذا يخطئ اللاعبون فعلاً ──
  // ليس لأن الكاتب لا يجد تلميحاً (فذلك يطيل المباراة بلا واقعية)،
  // بل لأن المتوقّع يستحضر روابط لم تخطر ببال الكاتب. فالعمى يوضع
  // على *الكاتب* تجاه بعض روابط اللوحة، بينما ذهن المتوقّع سليم:
  // الكاتب يظن تلميحه آمناً، والمتوقّع يرى فيه بطاقة أخرى.
  const blindness = opts.blindness !== undefined ? opts.blindness : 0.34;
  // العمى على المتوقّع جُرِّب فأطال المباريات بلا واقعية (المتوقّع الأعمى
  // يتوقّف بدل أن يخطئ) — فبقي صفراً، والخطأ يأتي من عمى الكاتب وحده.
  const gBlind    = opts.gBlind    !== undefined ? opts.gBlind    : 0;
  const minds = {
    redW:  makeMind(diverg, blindness), redG:  makeMind(diverg, gBlind),
    blueW: makeMind(diverg, blindness), blueG: makeMind(diverg, gBlind)
  };

  const b = buildBoard();                     // { words:[25], colors:[25] }
  const board = b.words.map((w, i) => ({
    word: w,
    color: b.colors[i].replace('word-', ''),  // red|blue|neutral|black
    revealed: false
  }));

  const left = { red: 9, blue: 8 };
  let turn = 'red', turns = 0, winner = null, byBlack = false;
  const log = [];
  const stat = {
    clues: 0, guesses: 0, hits: 0, missOwn: 0,
    missTheir: 0, missNeutral: 0, missBlack: 0,
    cluesNum: [], hitsPerClue: [], noSafeClue: 0
  };

  while (!winner && turns < MAX_TURNS) {
    turns++;
    const clue = chooseClue(board, turn, skillW, turn === 'red' ? minds.redW : minds.blueW);
    if (!clue) { winner = turn === 'red' ? 'blue' : 'red'; break; }
    stat.clues++; stat.cluesNum.push(clue.num);

    const ranked = rankGuesses(board, clue.concept, skillG, turn === 'red' ? minds.redG : minds.blueG);
    let allowed = clue.num + 1;   // قاعدة كود نيمز: تخمين إضافي واحد
    let gotThisClue = 0;
    let endTurn = false;

    for (let k = 0; k < allowed && !endTurn; k++) {
      const pick = ranked[k];
      if (!pick) break;
      const card = board[pick.i];
      if (card.revealed) { k--; ranked.splice(k + 1, 1); continue; }

      // ── قاعدة التوقّف البشرية ──
      // الإنسان لا يضغط بطاقة لا يرى لها رابطاً مقنعاً بالتلميح؛ يفضّل
      // إنهاء دوره على المخاطرة بالكلمة السوداء. بلا هذه القاعدة تقفز
      // نسبة الكلمة السوداء إلى 66% وهو رقم لا يحدث بين بشر.
      const nextBest = ranked[k + 1];
      const margin = nextBest ? pick.s - nextBest.s : pick.s;
      if (pick.s < caution) break;                        // لا رابط مقنع
      if (k >= clue.num && pick.s < caution + 0.25) break;  // التخمين الزائد أشد حذراً
      if (margin < 0.03 && pick.s < caution + 0.20) break;  // مرشّحان متساويان: لا نقامر

      card.revealed = true; stat.guesses++;

      if (card.color === turn) {
        stat.hits++; gotThisClue++; left[turn]--;
        if (left[turn] === 0) { winner = turn; break; }
      } else if (card.color === 'black') {
        stat.missBlack++; winner = turn === 'red' ? 'blue' : 'red'; byBlack = true; endTurn = true;
      } else if (card.color === 'neutral') {
        stat.missNeutral++; endTurn = true;
      } else {
        // بطاقة الخصم
        stat.missTheir++; left[card.color]--;
        if (left[card.color] === 0) { winner = card.color; }
        endTurn = true;
      }
    }
    stat.hitsPerClue.push(gotThisClue);
    if (winner) break;
    turn = turn === 'red' ? 'blue' : 'red';
  }
  if (!winner) winner = left.red <= left.blue ? 'red' : 'blue';

  return {
    winner, byBlack, turns,
    redLeft: left.red, blueLeft: left.blue,
    ...stat,
    avgClueNum: stat.cluesNum.reduce((a, c) => a + c, 0) / (stat.cluesNum.length || 1),
    avgHitsPerClue: stat.hitsPerClue.reduce((a, c) => a + c, 0) / (stat.hitsPerClue.length || 1),
    accuracy: stat.guesses ? stat.hits / stat.guesses : 0
  };
}

module.exports = { playMatch };
