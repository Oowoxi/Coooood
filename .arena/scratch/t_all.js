const { newClient, advance, getPath, setPath, simulateDisconnect } = require('./harness.js');
const fs=require('fs'); const HTML=fs.readFileSync('كود نيمز.html','utf8');
const R=[]; function check(n,c,e){R.push({n,ok:!!c,e});console.log((c?'  PASS  ':'  FAIL  ')+n+(e&&!c?'  => '+e:''));}
async function tick(ms){advance(ms||0);for(let i=0;i<20;i++)await Promise.resolve();advance(0);for(let i=0;i<20;i++)await Promise.resolve();}
const scr=(c)=>['nameScreen','roomsScreen','rolesScreen','gameScreen'].filter(id=>{const d=c.document.getElementById(id).style.display;return d&&d!=='none';}).join('+')||'none';
(async()=>{
 try{
  console.log('\n=== أ) أساسيات ===');
  const A=newClient('A');
  check('يقلع', A.$eval('typeof attemptJoinRoom')==='function');
  check('escapeHtml', A.$eval(`escapeHtml('<img onerror=x>')`).includes('&lt;'));
  check('safeImgSrc يرفض javascript:', A.$eval(`safeImgSrc('javascript:alert(1)')`)==='');
  check('clampText', A.$eval(`clampText('abcdefghij',5)`).length===5);

  console.log('\n=== ب) كلمة المرور ===');
  const P=newClient('P'); P.document.getElementById('ownerPassInput').value='SMO';
  await P.$eval('submitOwnerLogin()'); await tick(10);
  check('SMO تعمل', P.$eval('isSiteOwner')===true);
  const P2=newClient('P2'); P2.document.getElementById('ownerPassInput').value='x';
  await P2.$eval('submitOwnerLogin()'); await tick(10);
  check('كلمة خاطئة تُرفض', P2.$eval('isSiteOwner')!==true);

  console.log('\n=== ج) الملف الشخصي ===');
  const N=newClient('N');
  N.$eval(`currentPlayer.name='سعد'; currentPlayer.avatar='data:image/png;base64,AA'; saveProfile();`);
  check('حفظ الاسم', N.localStorage.getItem('cn_name')==='سعد');
  check('حفظ الأفتار', N.localStorage.getItem('cn_avatar')!==null);
  check('دقة الأفتار 400', HTML.includes('MAX_WIDTH = 400'));

  console.log('\n=== د) اللعبة ===');
  const rid='room_2v2_1';
  const cs=['a','b','c','d'].map(n=>newClient(n));
  for(let i=0;i<4;i++){ cs[i].$eval(`currentPlayer.name='ل${i}'`); cs[i].$eval(`attemptJoinRoom('${rid}')`); await tick(60); }
  const roles=['redWriter','redGuesser','blueWriter','blueGuesser'];
  for(let i=0;i<4;i++){ cs[i].$eval(`selectRole('${roles[i]}')`); await tick(40); }
  await tick(7000);
  check('اللعبة بدأت', cs.every(c=>scr(c)==='gameScreen'), cs.map(scr).join('|'));
  check('اللوحة مبنية', (getPath(`/rooms/${rid}/game/board/words`)||[]).length===25);
  check('المؤقت يعمل', /⏱/.test(cs[0].document.getElementById('turnTimer').innerText));
  check('شاشة واحدة فقط', cs.every(c=>!scr(c).includes('+')));

  console.log('\n=== هـ) الجولة التاسعة ===');
  check('لا كسر للكلمات', HTML.includes('word-break: keep-all')&&!HTML.includes('overflow-wrap: anywhere'));
  check('الإعدادات الافتراضية', HTML.includes('function resetSettings'));
  check('زر الصوت بالإعدادات', HTML.includes('id="soundSettingBtn"'));
  check('المؤقت بلا مربع', /\.turn-timer \{[\s\S]*?background: transparent/.test(HTML));
  ['fadeUp','softPulse','shimmer','floatSoft'].forEach(a=>check('حركة '+a, HTML.includes('@keyframes '+a)));
  const S=newClient('S');
  S.localStorage.setItem('cardScale','130'); S.$eval('soundEnabled=false'); S.$eval('resetSettings()'); await tick(10);
  check('الاسترجاع يعمل', S.localStorage.getItem('cardScale')===null && S.$eval('soundEnabled')===true);

  console.log('\n=== و) الشات العام لا يُمسح ===');
  setPath(`/rooms/${rid}/globalChat/m1`,{name:'x',text:'مرحبا',ts:1});
  cs[0].$eval('purgeGameData(GAME_REF, true)'); await tick(100);
  check('الشات باقٍ', !!getPath(`/rooms/${rid}/globalChat/m1`));

  console.log('\n=== ز) الانقطاع والعودة للغرفة ===');
  const rid2='room_2v2_4';
  const ds=['e','f','g','h'].map(n=>newClient(n));
  for(let i=0;i<4;i++){ ds[i].$eval(`currentPlayer.name='م${i}'`); ds[i].$eval(`attemptJoinRoom('${rid2}')`); await tick(60); }
  for(let i=0;i<4;i++){ ds[i].$eval(`selectRole('${roles[i]}')`); await tick(40); }
  await tick(7000);
  check('لعبة٢ بدأت', ds.every(c=>scr(c)==='gameScreen'), ds.map(scr).join('|'));
  const pid=ds[3].$eval('myPlayerId');
  ds[3].$eval('stopHeartbeat()');
  simulateDisconnect(`/rooms/${rid2}/game/players/${pid}`);
  await tick(40000);
  check('رجعوا لغرفة الأدوار', ds.slice(0,3).every(c=>scr(c)==='rolesScreen'), ds.slice(0,3).map(scr).join('|'));
  check('رسالة مكتوبة', ds[0].document.getElementById('customAlertText').innerText.length>10);
  for(let i=0;i<3;i++){ ds[i].$eval(`selectRole('${roles[i]}')`); await tick(40); }
  check('اختيار دور جديد لا يطرد', ds.slice(0,3).every(c=>scr(c)==='rolesScreen'), ds.slice(0,3).map(scr).join('|'));

  console.log('\n=== ح) سلامة عامة ===');
  check('لا @media', !HTML.includes('@media'));
  const ids=[...new Set([...HTML.matchAll(/getElementById\('([^']+)'\)/g)].map(m=>m[1]))];
  const missing=ids.filter(id=>!new RegExp(`id="${id}"`).test(HTML));
  check('العناصر موجودة', missing.length<=8, 'ديناميكي: '+missing.join(','));
 }catch(e){ check('لا استثناءات', false, e.stack.split('\n').slice(0,4).join(' | ')); }
  const f=R.filter(r=>!r.ok);
  console.log(`\nTOTAL: ${R.length}  PASSED: ${R.length-f.length}  FAILED: ${f.length}`);
  if(f.length){f.forEach(x=>console.log('  ✘ '+x.n+(x.e?' => '+x.e:'')));process.exitCode=1;}
})();
