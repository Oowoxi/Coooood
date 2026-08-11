const fs=require('fs'), vm=require('vm'), path=require('path');
const { DB, ref, getPath, setPath, simulateDisconnect } = require('./mock.js');
const { createDom } = require('./dom.js');
const HTML = path.join(__dirname, '..', '..', 'كود نيمز.html');
const src = fs.readFileSync(HTML,'utf8');
const CODE = src.match(/<script>\n([\s\S]*)<\/script>/)[1];
let now = 1700000000000;
let timers = [], tid = 0;
function advance(ms){
  const target = now + ms;
  for(;;){
    const due = timers.filter(t=>t.time<=target).sort((a,b)=>a.time-b.time);
    if(!due.length) break;
    const t = due[0];
    now = t.time;
    if(t.interval){ t.time = now + t.delay; } else { timers = timers.filter(x=>x!==t); }
    try{ t.fn(); }catch(e){ console.error('TIMER ERR', e.message); }
  }
  now = target;
}
function newClient(name){
  const document = createDom();
  const owner = name;
  const sb = {
    console, name, document,
    window:{ AudioContext:null, webkitAudioContext:null, addEventListener(){}, location:{ href:'https://x/' } },
    navigator:{ userAgent:'node' },
    localStorage:{ _d:{}, getItem(k){ return this._d[k]===undefined?null:this._d[k]; },
      setItem(k,v){ this._d[k]=String(v); }, removeItem(k){ delete this._d[k]; } },
    crypto:{ subtle:{ async digest(alg,buf){ const h=require('crypto').createHash('sha256').update(Buffer.from(buf)).digest(); return h.buffer.slice(h.byteOffset,h.byteOffset+h.byteLength); } } },
    TextEncoder, Image:function(){ this.onload=null; this.width=1200; this.height=900;
      Object.defineProperty(this,'src',{set(){ if(this.onload) this.onload(); }}); },
    FileReader:function(){ this.onload=null; this.readAsDataURL=()=>{ if(this.onload) this.onload({target:{result:'data:image/jpeg;base64,AAAA'}}); }; },
    setTimeout:(fn,d)=>{ const id=++tid; timers.push({id,fn,time:now+(d||0),delay:d||0}); return id; },
    clearTimeout:(id)=>{ timers=timers.filter(t=>t.id!==id); },
    setInterval:(fn,d)=>{ const id=++tid; timers.push({id,fn,time:now+(d||0),delay:d||0,interval:true}); return id; },
    clearInterval:(id)=>{ timers=timers.filter(t=>t.id!==id); },
    Date:new Proxy(Date,{ construct(T,a){ return a.length?new T(...a):new T(now); }, get(T,k){ return k==='now'?()=>now:T[k]; } }),
    Math, JSON, Object, Array, String, Number, Boolean, Promise, RegExp, Error, isNaN, parseInt, parseFloat, encodeURIComponent,
    alert(){}, confirm(){ return true; },
    firebase:{ initializeApp(){}, database:Object.assign(()=>({ ref:(p)=>ref(p,owner) }),{ ServerValue:{ TIMESTAMP: 0 } }) }
  };
  sb.globalThis = sb; sb.self = sb; sb.window.document = document;
  vm.createContext(sb);
  vm.runInContext(CODE, sb, { filename:'app.js' });
  sb.$eval = (expr)=> vm.runInContext(expr, sb);
  if(document._ready) document._ready();
  return sb;
}
module.exports = { newClient, advance, DB, getPath, setPath, simulateDisconnect };
