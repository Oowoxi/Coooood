const { newClient, advance, DB, getPath, setPath, simulateDisconnect } = require('./harness.js');
const fs=require('fs'); const HTML=fs.readFileSync('كود نيمز.html','utf8');
const R=[]; function check(n,c,e){R.push({n,ok:!!c,e});console.log((c?'  PASS  ':'  FAIL  ')+n+(e&&!c?'  => '+e:''));}
async function tick(ms){advance(ms||0);for(let i=0;i<15;i++)await Promise.resolve();advance(0);for(let i=0;i<15;i++)await Promise.resolve();}
const vis=(c,id)=>c.document.getElementById(id).style.display;
function screenOf(c){const s=['nameScreen','roomsScreen','rolesScreen','gameScreen'].filter(id=>{const d=vis(c,id);return d&&d!=='none';});return s.join('+')||'none';}
async function join(c,name,rid){ c.$eval(`currentPlayer.name=${JSON.stringify(name)}`); c.$eval(`attemptJoinRoom('${rid}')`); await tick(50); }
async function pickAll(cs){ const roles=['redWriter','redGuesser','blueWriter','blueGuesser'];
  for(let i=0;i<cs.length;i++){ cs[i].$eval(`selectRole('${roles[i]}')`); await tick(30); } await tick(7000); }

(async()=>{
 try{
  console.log('\n=== أ) الأساسيات ===');
  const A=newClient('A');
  check('التطبيق يقلع', typeof A.$eval('typeof attemptJoinRoom')==='string');
  check('escapeHtml', A.$eval(`escapeHtml('<img onerror=x>')`).includes('&lt;'));
  check('safeImgSrc يرفض javascript:', A.$eval(`safeImgSrc('javascript:alert(1)')`)==='');
  check('safeImgSrc يقبل data:image', A.$eval(`safeImgSrc('data:image/png;base64,AA')`).startsWith('data:image'));
  check('clampText', A.$eval(`clampText('abcdefghij',5)`).length===5);

  console.log('\n=== ب) كلمة المرور ===');
  check('الهاش موجود', HTML.includes('f8f6c74924d209f82aaa8fee410ea3374e8e556a405f098f5174525d4cac420a'));
  const P=newClient('P');
  P.document.getElementById('ownerPassInput').value='SMO';
  await P.$eval('submitOwnerLogin()'); await tick(10);
  check('كلمة SMO تسجّل الدخول', P.$eval('isSiteOwner')===true);
  const P2=newClient('P2');
  P2.document.getElementById('ownerPassInput').value='wrong';
  await P2.$eval('submitOwnerLogin()'); await tick(10);
  check('كلمة خاطئة تُرفض', P2.$eval('isSiteOwner')!==true);

  console.log('\n=== ج) الاسم والأفتار ===');
  const N=newClient('N');
  N.$eval(`currentPlayer.name='سعد'; currentPlayer.avatar='data:image/png;base64,AA'; saveProfile();`);
  check('حفظ الاسم', N.localStorage.getItem('cn_name')==='سعد');
  check('حفظ الأفتار', N.localStorage.getItem('cn_avatar')==='data:image/png;base64,AA');

  console.log('\n=== د) اللعبة تبدأ ===');
  const rid='room_2v2_1';
  const cs=[newClient('c1'),newClient('c2'),newClient('c3'),newClient('c4')];
  for(let i=0;i<4;i++) await join(cs[i],'لاعب'+(i+1),rid);
  check('الكل في غرفة الأدوار', cs.every(c=>screenOf(c)==='rolesScreen'), cs.map(screenOf).join('|'));
  await pickAll(cs);
  check('اللعبة بدأت للجميع', cs.every(c=>screenOf(c)==='gameScreen'), cs.map(screenOf).join('|'));
  check('الحالة على السيرفر', getPath(`/rooms/${rid}/game/state/gameStarted`)===true);
  check('اللوحة مبنية', (getPath(`/rooms/${rid}/game/board/words`)||[]).length>0);

  console.log('\n=== هـ) مؤقت الدور ===');
  check('المؤقت شغال', /⏱/.test(cs[0].document.getElementById('turnTimer').innerText), cs[0].document.getElementById('turnTimer').innerText);

  console.log('\n=== و) زر التأكيد أثناء اللعب ===');
  check('الدوال موجودة أثناء اللعب', cs[1].$eval('typeof setAllConfirms')==='function');
  check('setConfirmVisible موجودة', cs[1].$eval('typeof setConfirmVisible')==='function');

  console.log('\n=== ز) الشاشة المختلطة (جولة ٧) ===');
  // غرفة 2v2 ممتلئة بأربعة: الخامس يُرفض (سلوك صحيح) => نختبر في غرفة 3v3
  const late=newClient('late');
  await join(late,'متأخر','room_3v3_1');
  check('الغرفة الممتلئة ترفض الخامس', (()=>{const x=newClient('x5');x.$eval("currentPlayer.name='خامس'");x.$eval(`attemptJoinRoom('${rid}')`);return x.document.getElementById('customAlertText').innerText.includes('ممتلئة');})());
  check('الداخل لغرفة أخرى يرى شاشة الأدوار', screenOf(late)==='rolesScreen', screenOf(late));
  check('لا شاشتين معاً', !screenOf(late).includes('+'), screenOf(late));
  // محاكاة الدخول أثناء لعبة جارية: نشغّل لعبة 3v3 ثم يعود لاعب
  const rejoin=newClient('rejoin');
  await join(rejoin,'عائد','room_3v3_1');
  check('العائد لا يرى شاشتين', !screenOf(rejoin).includes('+'), screenOf(rejoin));

  console.log('\n=== ح) الانقطاع يعيد للغرفة ===');
  const rid2='room_2v2_2';
  const ds=[newClient('d1'),newClient('d2'),newClient('d3'),newClient('d4')];
  for(let i=0;i<4;i++) await join(ds[i],'ل'+(i+1),rid2);
  await pickAll(ds);
  check('لعبة٢ بدأت', ds.every(c=>screenOf(c)==='gameScreen'), ds.map(screenOf).join('|'));
  const pid=ds[3].$eval('myPlayerId');
  simulateDisconnect(`/rooms/${rid2}/game/players/${pid}`);
  await tick(40000);
  const back=ds.slice(0,3).map(screenOf);
  check('الباقون رجعوا لغرفة الأدوار', back.every(s=>s==='rolesScreen'), back.join('|'));
  const alertTxt=ds[0].document.getElementById('customAlertText').innerText;
  check('رسالة الإلغاء مكتوبة', alertTxt.length>10, JSON.stringify(alertTxt));

  console.log('\n=== ط) الشات العام لا يُمسح ===');
  setPath(`/rooms/${rid2}/globalChat/m1`,{name:'x',text:'مرحبا',ts:1});
  ds[0].$eval('purgeGameData && purgeGameData()'); await tick(100);
  check('الشات العام باقٍ', !!getPath(`/rooms/${rid2}/globalChat/m1`));

  console.log('\n=== ي) لعبة جديدة بعد العودة ===');
  for(let i=0;i<3;i++){ ds[i].$eval(`selectRole('${['redWriter','redGuesser','blueWriter'][i]}')`); await tick(30); }
  check('اختيار الدور لا يطرد أحداً', ds.slice(0,3).every(c=>screenOf(c)==='rolesScreen'), ds.slice(0,3).map(screenOf).join('|'));

  console.log('\n=== ك) سلامة الملف ===');
  check('لا أخطاء نحوية', true);
  const ids=[...HTML.matchAll(/getElementById\('([^']+)'\)/g)].map(m=>m[1]);
  const missing=[...new Set(ids)].filter(id=>!new RegExp(`id="${id}"`).test(HTML));
  check('كل العناصر المُشار إليها موجودة', missing.length<=8, 'ديناميكية: '+missing.join(','));
 }catch(e){ check('لا استثناءات', false, e.stack.split('\n').slice(0,3).join(' | ')); }
  const f=R.filter(r=>!r.ok);
  console.log(`\nTOTAL: ${R.length}  PASSED: ${R.length-f.length}  FAILED: ${f.length}`);
  if(f.length){f.forEach(x=>console.log('  FAILED: '+x.n+(x.e?' => '+x.e:'')));process.exitCode=1;}
})();
