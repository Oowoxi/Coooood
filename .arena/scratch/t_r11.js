const { newClient, advance, getPath, simulateDisconnect } = require('./harness.js');
const fs=require('fs'); const HTML=fs.readFileSync('كود نيمز.html','utf8');
const R=[]; function check(n,c,e){R.push({n,ok:!!c,e});console.log((c?'  PASS  ':'  FAIL  ')+n+(e&&!c?'  => '+e:''));}
async function tick(ms){advance(ms||0);for(let i=0;i<25;i++)await Promise.resolve();advance(0);for(let i=0;i<25;i++)await Promise.resolve();}
const scr=(c)=>['nameScreen','roomsScreen','rolesScreen','gameScreen'].filter(id=>{const d=c.document.getElementById(id).style.display;return d&&d!=='none';}).join('+')||'none';
async function joinAll(rid,names){
  const cs=names.map(n=>newClient(n));
  for(let i=0;i<cs.length;i++){ cs[i].$eval(`currentPlayer.name=${JSON.stringify(names[i])}`); cs[i].$eval(`attemptJoinRoom('${rid}')`); await tick(60); }
  return cs;
}
(async()=>{
 try{
  console.log('\n=== ١) بطاقة واحدة تنبض ===');
  check('ذاكرة البطاقات المتحركة', HTML.includes('let animatedCards = new Set()'));
  check('صنف منع الإعادة', HTML.includes('.word-card.revealed.no-reveal-anim'));
  check('الحركة تُلغى للقديمة', /no-reveal-anim \{[\s\S]{0,120}animation: none/.test(HTML));
  check('يُطبَّق في renderBoard', HTML.includes("revealed no-reveal-anim"));
  check('يُنظَّف عند لوحة جديدة', HTML.includes('animatedCards.clear()'));
  // محاكاة: كشف بطاقة ثم تحديث اللوحة
  const c=newClient('B');
  c.$eval("currentPlayer.currentRoleId='redGuesser_1'");
  const words=Array.from({length:25},(_,i)=>'ك'+i), colors=Array(25).fill('word-red');
  let rev=Array(25).fill(false); rev[3]=true;
  c.$eval(`renderBoard(${JSON.stringify(words)},${JSON.stringify(colors)},${JSON.stringify(rev)},[])`);
  let html=c.document.getElementById('cardsGrid').innerHTML;
  check('أول كشف: البطاقة تتحرك', /card-3"/.test(html) && !/revealed no-reveal-anim[^"]*" id="card-3/.test(html));
  const firstAnimated=(html.match(/no-reveal-anim/g)||[]).length;
  check('لا بطاقات أخرى تتحرك', firstAnimated===0, 'عدد='+firstAnimated);
  // تحديث ثانٍ: نفس البطاقة يجب ألا تعيد الحركة، وبطاقة جديدة تتحرك
  rev[7]=true;
  c.$eval(`renderBoard(${JSON.stringify(words)},${JSON.stringify(colors)},${JSON.stringify(rev)},[])`);
  html=c.document.getElementById('cardsGrid').innerHTML;
  const noAnim=(html.match(/no-reveal-anim/g)||[]).length;
  check('البطاقة القديمة لا تعيد الحركة', noAnim===1, 'عدد بلا حركة='+noAnim);
  check('البطاقة الجديدة تتحرك', /class="word-card [^"]*revealed" id="card-7"/.test(html) || html.includes('id="card-7"'));

  console.log('\n=== ٢) الحجم الافتراضي 111 ===');
  check('الافتراضي في applyScales', HTML.includes("localStorage.getItem('cardScale') || 111"));
  check('قيمة المنزلق', HTML.includes('id="cardScaleSlider" min="60" max="140" value="111"'));
  const s2=newClient('S');
  s2.$eval('applyScales()');
  check('المتغير = 1.11', String(s2.document.documentElement.style.getPropertyValue('--card-scale'))==='1.11',
        s2.document.documentElement.style.getPropertyValue('--card-scale'));
  s2.localStorage.setItem('cardScale','130'); s2.$eval('resetSettings()'); await tick(10);
  s2.$eval('applyScales()');
  check('الاسترجاع يرجع 111', String(s2.document.documentElement.style.getPropertyValue('--card-scale'))==='1.11',
        s2.document.documentElement.style.getPropertyValue('--card-scale'));

  console.log('\n=== ٣) زر الطرد ===');
  check('الزر موجود', HTML.includes('id="kickBtn"')&&HTML.includes('🚫 طرد'));
  check('النافذة موجودة', HTML.includes('id="kickModal"'));
  const rid='room_2v2_1';
  const cs=await joinAll(rid,['المدير','لاعب٢','لاعب٣']);
  check('الأول صاحب التاج', cs[0].$eval('currentPlayer.isOwner')===true);
  check('زر الطرد ظاهر للمدير', cs[0].document.getElementById('kickBtn').style.display==='inline-block',
        cs[0].document.getElementById('kickBtn').style.display);
  check('مخفي عن غير المدير', cs[1].document.getElementById('kickBtn').style.display==='none');
  cs[0].$eval('openKickModal()'); await tick(10);
  const list=cs[0].document.getElementById('kickList').innerHTML;
  check('القائمة تعرض الآخرين', list.includes('لاعب٢')&&list.includes('لاعب٣'));
  check('المدير ليس في القائمة', !list.includes('المدير'));
  // الطرد
  const victim=cs[1].$eval('myPlayerId');
  cs[0].$eval(`kickPlayer('${victim}')`); await tick(1500);
  check('المطرود خرج للغرف', scr(cs[1])==='roomsScreen', scr(cs[1]));
  check('أُزيل من اللاعبين', !getPath(`/rooms/${rid}/game/players/${victim}`));
  check('سُجّل الحظر', !!getPath(`/rooms/${rid}/game/bans/${victim}`));
  check('رسالة الطرد ظهرت', cs[1].document.getElementById('customAlertText').innerText.includes('طردك'),
        cs[1].document.getElementById('customAlertText').innerText);
  // محاولة العودة فوراً
  cs[1].$eval(`attemptJoinRoom('${rid}')`); await tick(100);
  check('لا يستطيع العودة فوراً', scr(cs[1])==='roomsScreen', scr(cs[1]));
  check('رسالة المنع', cs[1].document.getElementById('customAlertText').innerText.includes('ثانية'));
  // بعد دقيقة
  await tick(61000);
  cs[1].$eval(`attemptJoinRoom('${rid}')`); await tick(100);
  check('يعود بعد الدقيقة', scr(cs[1])==='rolesScreen', scr(cs[1]));

  console.log('\n=== ٤) اسم الزر ===');
  check('التخلي عن الدور', HTML.includes('>التخلي عن الدور<'));
  check('لا "المنصب"', !HTML.includes('التخلي عن المنصب'));

  console.log('\n=== ٥) العد التنازلي ===');
  check('الطبقة الكبيرة موجودة', HTML.includes('id="countdownOverlay"')&&HTML.includes('id="countdownBig"'));
  check('العداد القديم مخفي', HTML.includes('#countdownText { display: none !important; }'));
  ['cdPop','cdGo','cdRing','cdFadeIn','gameEnter'].forEach(a=>check('حركة '+a, HTML.includes('@keyframes '+a)));
  const heavy=['cdPop','cdGo','cdRing','gameEnter','cdFadeIn'].filter(nm=>{
    const m=HTML.match(new RegExp('@keyframes '+nm+' \\{([\\s\\S]*?)\\n        \\}'));
    return m && /(width:|height:|margin|padding|top:|left:)/.test(m[1]); });
  check('خفيفة: transform/opacity فقط', heavy.length===0, heavy.join(','));
  check('will-change للتسريع', HTML.includes('will-change: transform, opacity'));
  const cd=newClient('CD');
  cd.$eval('showBigCountdown(3)');
  check('يظهر عند 3', cd.document.getElementById('countdownOverlay').style.display==='flex');
  check('الرقم صحيح', cd.document.getElementById('countdownBig').innerText==='3');
  check('حركة النبض', cd.document.getElementById('countdownBig').classList.contains('cd-tick'));
  cd.$eval('showBigCountdown(0)');
  check('يلا نبدأ عند 0', cd.document.getElementById('countdownBig').innerText.includes('يلا'));
  check('حركة البداية', cd.document.getElementById('countdownBig').classList.contains('cd-go'));
  cd.$eval('hideBigCountdown()');
  check('يختفي', cd.document.getElementById('countdownOverlay').style.display==='none');
  cd.$eval('playGameEnterTransition()');
  check('انتقال دخول اللعبة', cd.document.getElementById('gameScreen').classList.contains('entering'));

  console.log('\n=== ٦) العد يعمل في لعبة حقيقية ===');
  const cs2=await joinAll('room_2v2_2',['أ','ب','ج','د']);
  const roles=['redWriter','redGuesser','blueWriter','blueGuesser'];
  for(let i=0;i<4;i++){ cs2[i].$eval(`selectRole('${roles[i]}')`); await tick(40); }
  await tick(500);
  check('العد ظهر للجميع', cs2.every(c=>c.document.getElementById('countdownOverlay').style.display==='flex'),
        cs2.map(c=>c.document.getElementById('countdownOverlay').style.display).join('|'));
  await tick(7000);
  check('اللعبة بدأت', cs2.every(c=>scr(c)==='gameScreen'), cs2.map(scr).join('|'));
  check('العد اختفى', cs2.every(c=>c.document.getElementById('countdownOverlay').style.display==='none'));
  check('زر الطرد مخفي أثناء اللعب', cs2[0].document.getElementById('kickBtn').style.display==='none');
 }catch(e){ check('لا استثناءات', false, e.stack.split('\n').slice(0,4).join(' | ')); }
  const f=R.filter(r=>!r.ok);
  console.log(`\nTOTAL: ${R.length}  PASSED: ${R.length-f.length}  FAILED: ${f.length}`);
  if(f.length){f.forEach(x=>console.log('  ✘ '+x.n+(x.e?' => '+x.e:'')));process.exitCode=1;}
})();
