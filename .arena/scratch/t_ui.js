// اختبار الإصلاحات الثلاثة
const { newClient, advance, DB, getPath } = require('./harness.js');
const fs=require('fs'); const HTML=fs.readFileSync('كود نيمز.html','utf8');
const R=[]; function check(n,c,e){R.push({n,ok:!!c,e});console.log((c?'  PASS  ':'  FAIL  ')+n+(e&&!c?'  => '+e:''));}
async function tick(ms){advance(ms||0);for(let i=0;i<12;i++)await Promise.resolve();advance(0);for(let i=0;i<12;i++)await Promise.resolve();}

(async()=>{
  console.log('\n=== 1) جودة الأفتار ===');
  check('الدقة رُفعت إلى 400', HTML.includes('MAX_WIDTH = 400'));
  check('الجودة رُفعت إلى 0.92', HTML.includes("toDataURL('image/jpeg', 0.92)"));
  check('تنعيم عالي الجودة مفعّل', HTML.includes("imageSmoothingQuality = 'high'"));
  check('التنعيم مفعّل', HTML.includes('imageSmoothingEnabled = true'));
  // تشغيل فعلي
  const c=newClient('AV');
  let err=null;
  try{ c.$eval("previewAvatar({target:{files:[{}]}})"); }catch(e){ err=e.message; }
  check('previewAvatar يعمل بلا أخطاء', !err, err);
  check('الأفتار انحفظ', String(c.$eval('currentPlayer.avatar')).startsWith('data:image'), c.$eval('currentPlayer.avatar'));
  check('حُفظ في التخزين', !!c.localStorage.getItem('cn_avatar'));

  console.log('\n=== 2) تأثير كشف المربع ===');
  check('حركة الكشف موجودة', HTML.includes('@keyframes cardRevealEpic'));
  check('تحترم مقياس البطاقة', HTML.includes('scale(calc(var(--card-scale) * 0.92))'));
  check('انسيابية cubic-bezier', HTML.includes('cardRevealEpic 0.55s cubic-bezier'));
  check('ضغطة الزر الأصفر', HTML.includes('.confirm-btn:active { transform: scale(0.88); }'));
  check('انتقال ناعم للزر', /\.confirm-btn \{[\s\S]*?transition: transform/.test(HTML));

  console.log('\n=== 3) الزر لا يغطي الكلمة ===');
  check('حجم الزر صغّر إلى 24', HTML.includes('width: 22px; height: 22px'));
  check('الموضع أقرب للحافة', HTML.includes('top: 2px; right: 2px'));
  check('صنف التباعد معرّف', HTML.includes('.word-card.has-confirm { padding-top: 16px; }'));
  check('box-sizing مضبوط', HTML.includes('.word-card { box-sizing: border-box; overflow: hidden; }'));
  check('النص له مساحة جانبية', HTML.includes('padding: 0 4px'));
  check('لا بقايا كود قديم', !HTML.includes(".confirm-btn').forEach(b => b.style.display"));

  // اختبار منطق setConfirmVisible فعلياً
  const g=newClient('G');
  const doc=g.document;
  const card=doc._make('card-0','word-card');
  const btn=doc._make('btn-0','confirm-btn');
  btn._parent=card;
  doc._fake['.confirm-btn']=[btn];
  doc._fake['.word-card']=[card];
  doc._fake['.word-card:not(.revealed) .confirm-btn']=[btn];
  g.$eval('setAllConfirms(true, true)');
  check('الإظهار: الزر ظاهر', btn.style.display==='block', btn.style.display);
  check('الإظهار: أُضيف has-confirm', card.classList.contains('has-confirm'));
  g.$eval('setAllConfirms(false)');
  check('الإخفاء: الزر مخفي', btn.style.display==='none', btn.style.display);
  check('الإخفاء: أُزيل has-confirm', !card.classList.contains('has-confirm'));
  g.$eval('setConfirmVisible(document.querySelectorAll(".confirm-btn")[0], true)');
  check('setConfirmVisible يعمل مفرداً', btn.style.display==='block' && card.classList.contains('has-confirm'));

  console.log('\n=== 4) اللوحة تُبنى صحيحاً ===');
  check('الصنف يُضاف عند البناء', HTML.includes("const confirmClass = btnDisplay === 'block' ? ' has-confirm' : '';"));
  check('يُستخدم في القالب', HTML.includes('${displayClass} ${revealedClass}${confirmClass}'));

  console.log('\n=== 5) لا تأثيرات أخرى رجعت بالغلط ===');
  check('لا @media', !HTML.includes('@media'));
  check('لا fadeUp/shimmer/softPulse', !/fadeUp|shimmer|softPulse/.test(HTML));
  const anims=[...new Set(HTML.match(/@keyframes\s+([A-Za-z][\w-]*)/g)||[])];
  check('عدد الحركات 9 (الأصلية)', anims.length===9, anims.length+': '+anims.join(','));

  const f=R.filter(r=>!r.ok);
  console.log(`\nTOTAL: ${R.length}  PASSED: ${R.length-f.length}  FAILED: ${f.length}`);
  if(f.length){f.forEach(x=>console.log('  FAILED: '+x.n+(x.e?' => '+x.e:'')));process.exitCode=1;}
})();
