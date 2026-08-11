const { newClient, advance, getPath, setPath, simulateDisconnect, fireOnDisconnectOnly } = require('./harness.js');
const fs=require('fs'); const HTML=fs.readFileSync('كود نيمز.html','utf8');
const R=[]; function check(n,c,e){R.push({n,ok:!!c,e});console.log((c?'  PASS  ':'  FAIL  ')+n+(e&&!c?'  => '+e:''));}
async function tick(ms){advance(ms||0);for(let i=0;i<25;i++)await Promise.resolve();advance(0);for(let i=0;i<25;i++)await Promise.resolve();}
const scr=(c)=>['nameScreen','roomsScreen','rolesScreen','gameScreen'].filter(id=>{const d=c.document.getElementById(id).style.display;return d&&d!=='none';}).join('+')||'none';
async function play(rid,names){
  const cs=names.map(n=>newClient(n));
  for(let i=0;i<cs.length;i++){ cs[i].$eval(`currentPlayer.name=${JSON.stringify(names[i])}`); cs[i].$eval(`attemptJoinRoom('${rid}')`); await tick(60); }
  const roles=['redWriter','redGuesser','blueWriter','blueGuesser'];
  for(let i=0;i<4;i++){ cs[i].$eval(`selectRole('${roles[i]}')`); await tick(40); }
  await tick(7000); return cs;
}
(async()=>{
 try{
  console.log('\n=== أ) أساسيات وأمان ===');
  const A=newClient('A');
  check('يقلع', A.$eval('typeof attemptJoinRoom')==='function');
  check('escapeHtml', A.$eval(`escapeHtml('<img onerror=x>')`).includes('&lt;'));
  check('safeImgSrc يرفض javascript:', A.$eval(`safeImgSrc('javascript:alert(1)')`)==='');
  const P=newClient('P'); P.document.getElementById('ownerPassInput').value='SMO';
  await P.$eval('submitOwnerLogin()'); await tick(10);
  check('كلمة المرور SMO', P.$eval('isSiteOwner')===true);

  console.log('\n=== ب) الملف الشخصي والأفتار ===');
  const N=newClient('N');
  N.$eval(`currentPlayer.name='سعد'; currentPlayer.avatar='data:image/png;base64,AA'; saveProfile();`);
  check('حفظ الاسم', N.localStorage.getItem('cn_name')==='سعد');
  check('دقة الأفتار 400', HTML.includes('MAX_WIDTH = 400'));

  console.log('\n=== ج) اللعبة كاملة ===');
  const rid='room_2v2_1'; const cs=await play(rid,['أ','ب','ج','د']);
  check('اللعبة بدأت', cs.every(c=>scr(c)==='gameScreen'), cs.map(scr).join('|'));
  check('اللوحة 25 كلمة', (getPath(`/rooms/${rid}/game/board/words`)||[]).length===25);
  check('المؤقت يعمل', /⏱/.test(cs[0].document.getElementById('turnTimer').innerText));
  check('شاشة واحدة', cs.every(c=>!scr(c).includes('+')));

  console.log('\n=== د) الجولات ٩ و١٠ ===');
  check('لا كسر كلمات', HTML.includes('word-break: keep-all')&&!HTML.includes('overflow-wrap: anywhere'));
  check('الإعدادات الافتراضية', HTML.includes('function resetSettings'));
  check('زر الصوت بالإعدادات', HTML.includes('id="soundSettingBtn"'));
  check('المؤقت بلا مربع', /\.turn-timer \{[\s\S]*?background: transparent/.test(HTML));
  ['fadeUp','softPulse','shimmer','floatSoft'].forEach(a=>check('حركة '+a, HTML.includes('@keyframes '+a)));
  check('نبضة الحياة', HTML.includes('HEARTBEAT_MS = 5000'));
  check('visibilitychange', HTML.includes("addEventListener('visibilitychange'"));
  check('استعادة المقعد', HTML.includes('function ensureMySeatAlive'));

  console.log('\n=== هـ) تبديل التبويب لا يفصل ===');
  cs[1]._hide(); await tick(60000);
  check('اللعبة مستمرة بعد دقيقة', cs.every(c=>scr(c)==='gameScreen'), cs.map(scr).join('|'));
  check('لا مهلة انقطاع', !getPath(`/rooms/${rid}/game/pendingDisconnect`));
  cs[1]._show(); await tick(100);
  const pid1=cs[1].$eval('myPlayerId');
  fireOnDisconnectOnly(`/rooms/${rid}/game/players/${pid1}`); await tick(50);
  cs[1]._show(); await tick(3000);
  check('المقعد استُعيد', !!getPath(`/rooms/${rid}/game/players/${pid1}`));

  console.log('\n=== و) الشات العام لا يُمسح ===');
  setPath(`/rooms/${rid}/globalChat/m1`,{name:'x',text:'مرحبا',ts:1});
  cs[0].$eval('purgeGameData(GAME_REF, true)'); await tick(100);
  check('الشات باقٍ', !!getPath(`/rooms/${rid}/globalChat/m1`));

  console.log('\n=== ز) الانقطاع الحقيقي ===');
  const rid2='room_2v2_4'; const ds=await play(rid2,['ه','و','ز','ح']);
  check('لعبة٢ بدأت', ds.every(c=>scr(c)==='gameScreen'), ds.map(scr).join('|'));
  const pid=ds[3].$eval('myPlayerId');
  ds[3].$eval('stopHeartbeat()');
  simulateDisconnect(`/rooms/${rid2}/game/players/${pid}`);
  await tick(40000);
  check('رجعوا لغرفة الأدوار', ds.slice(0,3).every(c=>scr(c)==='rolesScreen'), ds.slice(0,3).map(scr).join('|'));
  check('رسالة مكتوبة', ds[0].document.getElementById('customAlertText').innerText.length>10);
  const roles=['redWriter','redGuesser','blueWriter'];
  for(let i=0;i<3;i++){ ds[i].$eval(`selectRole('${roles[i]}')`); await tick(40); }
  check('اختيار دور جديد لا يطرد', ds.slice(0,3).every(c=>scr(c)==='rolesScreen'), ds.slice(0,3).map(scr).join('|'));

  console.log('\n=== ح) الجولة ١١ ===');
  check('بطاقة واحدة تنبض', HTML.includes('animatedCards'));
  check('الافتراضي 111', HTML.includes("cardScale') || 111"));
  check('زر الطرد', HTML.includes('id="kickBtn"'));
  check('التخلي عن الدور', HTML.includes('>التخلي عن الدور<')&&!HTML.includes('المنصب'));
  check('العد الكبير', HTML.includes('id="countdownOverlay"'));

  console.log('\n=== ط) سلامة عامة ===');
  check('لا @media', !HTML.includes('@media'));
  const ids=[...new Set([...HTML.matchAll(/getElementById\('([^']+)'\)/g)].map(m=>m[1]))];
  const missing=ids.filter(id=>!new RegExp(`id="${id}"`).test(HTML));
  check('العناصر موجودة', missing.length<=8, 'ديناميكي: '+missing.join(','));
 }catch(e){ check('لا استثناءات', false, e.stack.split('\n').slice(0,4).join(' | ')); }
  const f=R.filter(r=>!r.ok);
  console.log(`\nTOTAL: ${R.length}  PASSED: ${R.length-f.length}  FAILED: ${f.length}`);
  if(f.length){f.forEach(x=>console.log('  ✘ '+x.n+(x.e?' => '+x.e:'')));process.exitCode=1;}
})();
