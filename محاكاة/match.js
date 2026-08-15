// ═══════════════ محرّك المباراة بقواعد اللعبة الحقيقية ═══════════════
const { makeMind } = require('./mind2.js');
const { chooseClue, rankGuesses } = require('./agents.js');

function playMatch(words, colorsRaw, minds, log) {
  // colorsRaw تأتي من اللعبة بصيغة word-red ...
  const board = words.map((w, i) => ({
    word: w, color: String(colorsRaw[i]).replace('word-', ''), revealed: false
  }));
  const left = { red: board.filter(c => c.color === 'red').length,
                 blue: board.filter(c => c.color === 'blue').length };
  let turn = 'red', winner = null, rounds = 0;
  const ev = [];
  const dead = { red: new Set(), blue: new Set() };   // تلميحات لم تُثمر

  while (!winner && rounds < 60) {
    rounds++;
    const wMind = minds[turn].writer, gMind = minds[turn].guesser;
    const clue = chooseClue(board, turn, wMind, { banned: dead[turn] });
    if (!clue) { winner = turn === 'red' ? 'blue' : 'red'; break; }

    const ranked = rankGuesses(board, clue.concept, gMind);
    let picks = 0, keep = true;
    const allowed = clue.num + 1;          // قاعدة كود نيمز: عدد+١
    const guessed = [];

    while (keep && picks < allowed) {
      const pick = ranked.filter(r => !board[r.i].revealed)[0];
      if (!pick) break;
      // قاعدة كود نيمز: الفريق ملزم بتخمين واحد على الأقل.
      // بعد التخمين الأول يتوقف إذا لم يعد واثقاً.
      if (picks > 0 && pick.s <= 0.22) break;
      const card = board[pick.i];
      card.revealed = true;
      picks++;
      guessed.push({ word: card.word, color: card.color, intended: clue.targets.includes(pick.i) });

      if (card.color === 'black') { winner = turn === 'red' ? 'blue' : 'red'; keep = false; break; }
      if (card.color === turn) {
        left[turn]--;
        if (left[turn] === 0) { winner = turn; keep = false; break; }
        // يتوقف طوعاً إذا لم يبقَ في نيّة الكاتب المزيد
        const more = clue.targets.some(t => !board[t].revealed);
        if (!more && picks >= clue.num) keep = false;
      } else {
        keep = false;                       // خطأ => ينتهي الدور
        if (card.color === 'red' || card.color === 'blue') {
          left[card.color]--;
          if (left[card.color] === 0) { winner = card.color; }
        }
      }
    }

    // لو لم يصب الدور أي كلمة من الفريق، فالتلميح ميت
    if (!guessed.some(g => g.color === turn)) dead[turn].add(clue.concept);
    ev.push({ team: turn, clue: clue.label, axis: clue.axis, num: clue.num,
              intendedWords: clue.targets.map(i => board[i].word),
              guessed, hits: guessed.filter(g => g.color === turn).length });
    if (log) log(ev[ev.length - 1]);
    if (!winner) turn = turn === 'red' ? 'blue' : 'red';
  }
  return { winner, rounds, events: ev, board };
}

module.exports = { playMatch };
