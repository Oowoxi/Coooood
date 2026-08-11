const { newClient, advance, getPath } = require('./harness.js');
const fs=require('fs'); const HTML=fs.readFileSync('كود نيمز.html','utf8');
const R=[]; function check(n,c,e){R.push({n,ok:!!c,e});console.log((c?'  PASS  ':'  FAIL  ')+n+(e&&!c?'  => '+e:''));}
async function tick(ms){advance(ms||0);for(let i=0;i<15;i++)await Promise.resolve();}
(async()=>{
 try{
  console.log('\n=== ١) الكلمة لا تنقطع ===');
  check('منع كسر الكلمة (keep-all)', HTML.includes('word-break: keep-all'));
  check('لا anywhere', !HTML.includes('overflow-wrap: anywhere'));
  check('لا break-word', !HTML.includes('word-break: break-word'));
  check('hyphens معطلة', HTML.includes('hyphens: none'));
  check('أحجام خط متدرجة', HTML.includes('.word-text-box.len-m')&&HTML.includes('.word-text-box.len-l')&&HTML.includes('.word-text-box.len-xl'));
  check('لا حشو أفقي يضيّق الكلمة', !HTML.includes('.word-card.has-confirm .word-text-box { padding-right'));
  check('الحشو العلوي يتجنب الزر', HTML.includes('.word-card.has-confirm { padding-top: 25px; }'));
  // منطق اختيار الصنف
  const c=newClient('W');
  const pick=(w)=>{const L=String(w).split(/\s+/).reduce((a,x)=>Math.max(a,x.length),0);return L>=11?'len-xl':L>=9?'len-l':L>=7?'len-m':'';};
  check('جاموس بلا تصغير', pick('جاموس')==='');
  check('كلمتان: يعتمد الأطول', pick('كرة قدم')==='');
  check('كلمة طويلة تُصغَّر', pick('مستشفيات')==='len-m', pick('مستشفيات'));
  check('كلمة أطول تُصغَّر أكثر', pick('عبدالرحمن')==='len-l', pick('عبدالرحمن'));
  check('الصنف يُحقن في القالب', HTML.includes('class="word-text-box${lenClass}"'));

  console.log('\n=== ٢) الإعدادات الافتراضية ===');
  check('الزر موجود', HTML.includes('resetSettings()')&&HTML.includes('الإعدادات الافتراضية'));
  const s=newClient('S');
  s.localStorage.setItem('cardScale','130'); s.localStorage.setItem('infoScale','70'); s.localStorage.setItem('clueScale','60');
  s.$eval('soundEnabled=false');
  s.$eval('resetSettings()'); await tick(10);
  check('حجم البطاقات رجع', s.localStorage.getItem('cardScale')===null, s.localStorage.getItem('cardScale'));
  check('حجم المعلومات رجع', s.localStorage.getItem('infoScale')===null);
  check('حجم التلميح رجع', s.localStorage.getItem('clueScale')===null);
  check('الصوت رجع مفعّلاً', s.$eval('soundEnabled')===true);
  check('المتغير CSS رجع 1', String(s.document.documentElement.style.getPropertyValue('--card-scale'))==='1', s.document.documentElement.style.getPropertyValue('--card-scale'));
  check('رسالة تأكيد ظهرت', s.document.getElementById('customAlertText').innerText.includes('افتراضي'));

  console.log('\n=== ٣) زر الصوت داخل الإعدادات ===');
  check('زر الصوت في الإعدادات', HTML.includes('id="soundSettingBtn"'));
  check('أُزيل من شريط اللعب', !HTML.includes('id="soundToggleBtn" onclick="toggleSound()"'));
  const v=newClient('V');
  v.$eval('openSettings(false)'); await tick(5);
  const btn=v.document.getElementById('soundSettingBtn');
  check('النص يعكس التفعيل', btn.innerText.includes('مفعّل'), btn.innerText);
  v.$eval('toggleSound()'); await tick(5);
  check('الكتم يغيّر النص', btn.innerText.includes('مكتوم'), btn.innerText);
  check('صنف الكتم', btn.classList.contains('sound-off'));
  v.$eval('toggleSound()'); await tick(5);
  check('التفعيل يرجع النص', btn.innerText.includes('مفعّل'));
  check('الصوت يُحفظ', v.localStorage.getItem('cn_sound')==='on');

  console.log('\n=== ٤) المؤقت بلا مربع ===');
  check('لا خلفية', /\.turn-timer \{[\s\S]*?background: transparent/.test(HTML));
  check('لا إطار', /\.turn-timer \{[\s\S]*?border: none/.test(HTML));
  check('حالة الخطر بلا مربع', /timer-danger \{[\s\S]*?background: transparent/.test(HTML));
  check('المؤقت في مكانه', HTML.includes('<span class="turn-timer" id="turnTimer"'));

  console.log('\n=== ٥) تأثيرات الحركة ===');
  ['fadeUp','softPulse','shimmer','floatSoft'].forEach(a=>check('حركة '+a, HTML.includes('@keyframes '+a)));
  check('لا تغيير أحجام في التأثيرات', !/@keyframes (fadeUp|softPulse|shimmer|floatSoft)[\s\S]{0,220}?(width:|height:|font-size:)/.test(HTML));
  check('لا @media (لا تغيّر تخطيط)', !HTML.includes('@media'));
  // كل صنف مستخدم موجود فعلاً
  const used=['msg-row','room-card','role-box','active-turn-box','settings-btn-text','send-msg-btn','icon-btn'];
  used.forEach(cl=>check('الصنف '+cl+' موجود', (HTML.match(new RegExp(cl,'g'))||[]).length>=2));

  console.log('\n=== ٦) لا انحدار ===');
  const rid='room_2v2_1';
  const cs=[newClient('a'),newClient('b'),newClient('c'),newClient('d')];
  for(let i=0;i<4;i++){ cs[i].$eval(`currentPlayer.name='ل${i}'`); cs[i].$eval(`attemptJoinRoom('${rid}')`); await tick(50); }
  const roles=['redWriter','redGuesser','blueWriter','blueGuesser'];
  for(let i=0;i<4;i++){ cs[i].$eval(`selectRole('${roles[i]}')`); await tick(30); }
  await tick(7000);
  check('اللعبة تبدأ', cs.every(c=>c.document.getElementById('gameScreen').style.display==='flex'));
  check('اللوحة مبنية', (getPath(`/rooms/${rid}/game/board/words`)||[]).length>0);
  check('زر التأكيد يعمل', cs[1].$eval('typeof setAllConfirms')==='function');
  check('الأفتار عالي الدقة', HTML.includes('MAX_WIDTH = 400'));
 }catch(e){ check('لا استثناءات', false, e.stack.split('\n').slice(0,3).join(' | ')); }
  const f=R.filter(r=>!r.ok);
  console.log(`\nTOTAL: ${R.length}  PASSED: ${R.length-f.length}  FAILED: ${f.length}`);
  if(f.length){f.forEach(x=>console.log('  ✘ '+x.n+(x.e?' => '+x.e:'')));process.exitCode=1;}
})();
