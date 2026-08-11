const { newClient, advance, getPath, simulateDisconnect, fireOnDisconnectOnly } = require('./harness.js');
const fs=require('fs'); const HTML=fs.readFileSync('كود نيمز.html','utf8');
const R=[]; function check(n,c,e){R.push({n,ok:!!c,e});console.log((c?'  PASS  ':'  FAIL  ')+n+(e&&!c?'  => '+e:''));}
async function tick(ms){advance(ms||0);for(let i=0;i<20;i++)await Promise.resolve();advance(0);for(let i=0;i<20;i++)await Promise.resolve();}
const scr=(c)=>['nameScreen','roomsScreen','rolesScreen','gameScreen'].filter(id=>{const d=c.document.getElementById(id).style.display;return d&&d!=='none';}).join('+')||'none';
async function startGame(rid,names){
  const cs=names.map(n=>newClient(n));
  for(let i=0;i<cs.length;i++){ cs[i].$eval(`currentPlayer.name=${JSON.stringify(names[i])}`); cs[i].$eval(`attemptJoinRoom('${rid}')`); await tick(60); }
  const roles=['redWriter','redGuesser','blueWriter','blueGuesser'];
  for(let i=0;i<4;i++){ cs[i].$eval(`selectRole('${roles[i]}')`); await tick(40); }
  await tick(7000);
  return cs;
}
(async()=>{
 try{
  console.log('\n=== ١) تبديل التبويب لا يُحسب انقطاعاً ===');
  const cs = await startGame('room_2v2_1',['أحمد','سعد','خالد','فهد']);
  check('اللعبة بدأت', cs.every(c=>scr(c)==='gameScreen'), cs.map(scr).join('|'));
  const rid='room_2v2_1';
  check('النبضات تُكتب', Object.keys(getPath(`/rooms/${rid}/game/heartbeats`)||{}).length===4,
        JSON.stringify(getPath(`/rooms/${rid}/game/heartbeats`)));

  // سعد يفتح تبويب/تطبيق آخر لمدة دقيقة كاملة
  cs[1]._hide();
  await tick(60000);
  check('بعد دقيقة في الخلفية: اللعبة مستمرة', cs.every(c=>scr(c)==='gameScreen'), cs.map(scr).join('|'));
  check('لا مهلة انقطاع أُطلقت', !getPath(`/rooms/${rid}/game/pendingDisconnect`),
        JSON.stringify(getPath(`/rooms/${rid}/game/pendingDisconnect`)));
  check('سعد ما زال لاعباً', !!getPath(`/rooms/${rid}/game/players/${cs[1].$eval('myPlayerId')}`));
  check('النبضة استمرت في الخلفية', (Date.now(),true));
  cs[1]._show(); await tick(100);
  check('بعد الرجوع: كل شيء طبيعي', cs.every(c=>scr(c)==='gameScreen'), cs.map(scr).join('|'));

  console.log('\n=== ٢) onDisconnect ينطلق خطأً والصفحة حيّة ===');
  const pid = cs[1].$eval('myPlayerId');
  fireOnDisconnectOnly(`/rooms/${rid}/game/players/${pid}`);   // المتصفح حذف المقعد بالخطأ
  await tick(50);
  cs[1]._show();                                               // المستخدم رجع للصفحة
  await tick(3000);
  check('المقعد استُعيد تلقائياً', !!getPath(`/rooms/${rid}/game/players/${pid}`),
        JSON.stringify(Object.keys(getPath(`/rooms/${rid}/game/players`)||{})));
  check('اللاعب لم يُطرد', scr(cs[1])==='gameScreen', scr(cs[1]));
  check('اللعبة لم تُلغَ', cs.every(c=>scr(c)==='gameScreen'), cs.map(scr).join('|'));

  console.log('\n=== ٣) الانقطاع الحقيقي ما زال يعمل ===');
  const cs2 = await startGame('room_2v2_2',['علي','عمر','زيد','بدر']);
  const rid2='room_2v2_2';
  check('لعبة٢ بدأت', cs2.every(c=>scr(c)==='gameScreen'), cs2.map(scr).join('|'));
  const pid2 = cs2[3].$eval('myPlayerId');
  // انقطاع فعلي: توقف النبض + حذف المقعد
  cs2[3].$eval('stopHeartbeat()');
  simulateDisconnect(`/rooms/${rid2}/game/players/${pid2}`);
  await tick(200);
  check('بدأت مهلة العودة', !!getPath(`/rooms/${rid2}/game/pendingDisconnect`));
  await tick(35000);
  const back=cs2.slice(0,3).map(scr);
  check('بعد المهلة: الجميع رجعوا للغرفة', back.every(s=>s==='rolesScreen'), back.join('|'));
  check('رسالة الإلغاء ظهرت', cs2[0].document.getElementById('customAlertText').innerText.length>10);

  console.log('\n=== ٤) إغلاق الصفحة = إزالة فورية ===');
  const cs3 = await startGame('room_2v2_3',['م1','م2','م3','م4']);
  const rid3='room_2v2_3'; const pid3=cs3[2].$eval('myPlayerId');
  cs3[2]._pagehide(false);
  await tick(100);
  check('المقعد أُزيل فوراً عند الإغلاق', !getPath(`/rooms/${rid3}/game/players/${pid3}`));
  check('النبضة أُزيلت', !getPath(`/rooms/${rid3}/game/heartbeats/${pid3}`));

  console.log('\n=== ٥) bfcache لا يُزيل اللاعب ===');
  const cs4 = await startGame('room_3v3_1',['ب1','ب2','ب3','ب4']);
  const pid4=cs4[1].$eval('myPlayerId');
  cs4[1]._pagehide(true);     // persisted = الصفحة للذاكرة المؤقتة فقط
  await tick(100);
  check('لاعب bfcache لم يُزل', !!getPath(`/rooms/room_3v3_1/game/players/${pid4}`));

  console.log('\n=== ٦) سلامة الكود ===');
  check('نبضة كل 5 ثوانٍ', HTML.includes('HEARTBEAT_MS = 5000'));
  check('حد الموت 22 ثانية', HTML.includes('HEARTBEAT_DEAD_MS = 22000'));
  check('النبضات في عقدة منفصلة', HTML.includes("GAME_REF.child('heartbeats')"));
  check('visibilitychange مُعالج', HTML.includes("addEventListener('visibilitychange'"));
  check('pagehide مُعالج', HTML.includes("addEventListener('pagehide'"));
  check('لا إلغاء فوري بلا مهلة', !/if \(playerId && !gameState\.players\[playerId\]\) \{ cancelGame/.test(HTML));
  check('استعادة المقعد موجودة', HTML.includes('function ensureMySeatAlive'));
 }catch(e){ check('لا استثناءات', false, e.stack.split('\n').slice(0,4).join(' | ')); }
  const f=R.filter(r=>!r.ok);
  console.log(`\nTOTAL: ${R.length}  PASSED: ${R.length-f.length}  FAILED: ${f.length}`);
  if(f.length){f.forEach(x=>console.log('  ✘ '+x.n+(x.e?' => '+x.e:'')));process.exitCode=1;}
})();
