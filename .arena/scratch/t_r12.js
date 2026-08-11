const { newClient, advance, getPath, setPath } = require('./harness.js');
const fs=require('fs'); const HTML=fs.readFileSync('كود نيمز.html','utf8');
const R=[]; function check(n,c,e){R.push({n,ok:!!c,e});console.log((c?'  PASS  ':'  FAIL  ')+n+(e&&!c?'  => '+e:''));}
async function tick(ms){advance(ms||0);for(let i=0;i<25;i++)await Promise.resolve();advance(0);for(let i=0;i<25;i++)await Promise.resolve();}
const vis=(c,id)=>c.document.getElementById(id).style.display;
(async()=>{
 try{
  console.log('\n=== ١) أزرار أنواع الغرف ===');
  check('الأزرار الثلاثة', HTML.includes('غرف 2v2')&&HTML.includes('غرف 3v3')&&HTML.includes('غرف 4v4'));
  check('عدد اللاعبين مبيّن', HTML.includes('4 لاعبين')&&HTML.includes('6 لاعبين')&&HTML.includes('8 لاعبين'));
  check('زر الرجوع', HTML.includes('backToModes()'));
  const c=newClient('U');
  c.$eval("currentPlayer.avatar='data:image/png;base64,AA'");
  c.document.getElementById('playerName').value='سعد';
  c.$eval('enterRooms()'); await tick(60);
  check('شاشة الغرف ظهرت', vis(c,'roomsScreen')==='flex', vis(c,'roomsScreen'));
  check('يبدأ بأزرار الأنواع', vis(c,'modePicker')==='flex', vis(c,'modePicker'));
  check('القائمة مخفية بدايةً', vis(c,'roomsListView')==='none');
  check('لا غرف معروضة', c.document.getElementById('roomsGrid').innerHTML==='');

  // 2v2 فقط
  c.$eval("showRoomsOfMode('2v2')"); await tick(30);
  let html=c.document.getElementById('roomsGrid').innerHTML;
  const all=getPath('/rooms')||{};
  const n2=Object.values(all).filter(r=>(r.mode||'2v2')==='2v2').length;
  const n3=Object.values(all).filter(r=>r.mode==='3v3').length;
  const shown2=(html.match(/room-card/g)||[]).length;
  check('غرف 2v2 فقط', shown2===n2, `معروض ${shown2} من ${n2} (3v3=${n3})`);
  check('عنوان الصفحة تغيّر', c.document.getElementById('roomsTitle').innerText==='غرف 2v2');
  check('أزرار الأنواع اختفت', vis(c,'modePicker')==='none');
  check('لا غرف 6 لاعبين', !html.includes('/ 6'), html.slice(0,200));

  // 3v3
  c.$eval("showRoomsOfMode('3v3')"); await tick(30);
  html=c.document.getElementById('roomsGrid').innerHTML;
  const shown3=(html.match(/room-card/g)||[]).length;
  check('غرف 3v3 فقط', shown3===n3, `معروض ${shown3} من ${n3}`);
  check('لا غرف 4 لاعبين', !html.includes('/ 4'));

  // 4v4
  c.$eval("showRoomsOfMode('4v4')"); await tick(30);
  html=c.document.getElementById('roomsGrid').innerHTML;
  const n4=Object.values(all).filter(r=>r.mode==='4v4').length;
  const shown4=(html.match(/room-card/g)||[]).length;
  check('غرف 4v4 فقط', shown4===n4, `معروض ${shown4} من ${n4}`);

  // الرجوع
  c.$eval('backToModes()'); await tick(20);
  check('الرجوع يعيد الأزرار', vis(c,'modePicker')==='flex'&&vis(c,'roomsListView')==='none');
  check('العنوان رجع', c.document.getElementById('roomsTitle').innerText==='اختر نوع الغرف');

  console.log('\n=== ٢) الدخول من القائمة يعمل ===');
  c.$eval("showRoomsOfMode('2v2')"); await tick(30);
  c.$eval("attemptJoinRoom('room_2v2_1')"); await tick(80);
  check('دخل الغرفة', vis(c,'rolesScreen')==='flex', vis(c,'rolesScreen'));
  check('شاشة الغرف اختفت', vis(c,'roomsScreen')==='none');
  c.$eval('exitRoom()'); await tick(80);
  check('الخروج يرجع لأزرار الأنواع', vis(c,'modePicker')==='flex'&&vis(c,'roomsScreen')==='flex',
        `picker=${vis(c,'modePicker')} rooms=${vis(c,'roomsScreen')}`);

  console.log('\n=== ٣) شاشات ثابتة بلا تمرير ===');
  check('الصفحة بلا تمرير', /body \{ overflow: hidden; \}/.test(HTML));
  check('nameScreen بارتفاع كامل', /#nameScreen \{[\s\S]*?height: 100vh/.test(HTML));
  check('roomsScreen بارتفاع كامل', /#roomsScreen \{[\s\S]*?height: 100vh/.test(HTML));
  check('rolesScreen بارتفاع كامل', /#rolesScreen \{[\s\S]*?height: 100vh/.test(HTML));
  check('gameScreen بارتفاع كامل', /#gameScreen \{[\s\S]*?height: 100vh/.test(HTML));
  check('دعم dvh للجوال', (HTML.match(/100dvh/g)||[]).length>=5, (HTML.match(/100dvh/g)||[]).length+' مواضع');
  check('اللوحة مرنة لا ثابتة', HTML.includes('flex: 1 1 auto; min-height: 0; display: grid')&&!/cards-grid[\s\S]{0,200}height: 52vh/.test(HTML));
  check('المناطق الطويلة تمرّر داخلياً', HTML.includes('.players-lobby { flex-shrink: 0; overflow-y: auto'));
  check('النوافذ لا تتجاوز الشاشة', HTML.includes('max-height: 92vh'));
  check('rolesScreen يُعرض flex', !HTML.includes("rolesScreen').style.display = 'block'"));
  check('roomsScreen يُعرض flex', !HTML.includes("roomsScreen').style.display = 'block'"));

  console.log('\n=== ٤) الأصناف المستخدمة موجودة ===');
  ['mode-picker','mode-btn','back-modes-btn','rooms-bottom-actions','chat-modal-overlay','chat-modal-box'].forEach(cl=>
    check('الصنف '+cl, (HTML.match(new RegExp(cl,'g'))||[]).length>=2, (HTML.match(new RegExp(cl,'g'))||[]).length+''));

  console.log('\n=== ٥) لا انحدار ===');
  const cs=['a','b','c','d'].map(n=>newClient(n));
  for(let i=0;i<4;i++){ cs[i].$eval(`currentPlayer.name='ل${i}'`); cs[i].$eval(`attemptJoinRoom('room_2v2_2')`); await tick(60); }
  const roles=['redWriter','redGuesser','blueWriter','blueGuesser'];
  for(let i=0;i<4;i++){ cs[i].$eval(`selectRole('${roles[i]}')`); await tick(40); }
  await tick(7000);
  check('اللعبة تبدأ', cs.every(x=>vis(x,'gameScreen')==='flex'), cs.map(x=>vis(x,'gameScreen')).join('|'));
  check('اللوحة 25', (getPath('/rooms/room_2v2_2/game/board/words')||[]).length===25);
  check('العد الكبير موجود', HTML.includes('id="countdownOverlay"'));
  check('زر الطرد موجود', HTML.includes('id="kickBtn"'));
  check('الافتراضي 111', HTML.includes("cardScale') || 111"));
  check('لا @media', !HTML.includes('@media'));
 }catch(e){ check('لا استثناءات', false, e.stack.split('\n').slice(0,4).join(' | ')); }
  const f=R.filter(r=>!r.ok);
  console.log(`\nTOTAL: ${R.length}  PASSED: ${R.length-f.length}  FAILED: ${f.length}`);
  if(f.length){f.forEach(x=>console.log('  ✘ '+x.n+(x.e?' => '+x.e:'')));process.exitCode=1;}
})();
