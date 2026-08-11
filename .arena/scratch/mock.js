const DB = { data: {} };
let pushCounter = 0;
const listeners = [];
function getPath(p){ const parts=p.split('/').filter(Boolean); let cur=DB.data;
  for(const k of parts){ if(cur==null||typeof cur!=='object') return undefined; cur=cur[k]; } return cur; }
function setPath(p,v){ const parts=p.split('/').filter(Boolean); let cur=DB.data;
  for(let i=0;i<parts.length-1;i++){ if(typeof cur[parts[i]]!=='object'||cur[parts[i]]===null) cur[parts[i]]={}; cur=cur[parts[i]]; }
  if(v===null||v===undefined) delete cur[parts[parts.length-1]]; else cur[parts[parts.length-1]]=v; prune(); }
function prune(){ (function walk(o){ for(const k in o){ const v=o[k];
    if(v&&typeof v==='object'&&!Array.isArray(v)){ walk(v); if(Object.keys(v).length===0) delete o[k]; } } })(DB.data); }
function snapOf(p){ const v=getPath(p); return { val:()=>v===undefined?null:v, exists:()=>v!==undefined&&v!==null,
  key:p.split('/').filter(Boolean).pop(), child:(c)=>snapOf(p+'/'+c),
  forEach(cb){ const o=getPath(p)||{}; for(const k of Object.keys(o)) cb(snapOf(p+'/'+k)); } }; }
function notify(changed){ for(const L of listeners.slice()){
  if(L.type==='value'){ if(changed===L.path||changed.startsWith(L.path+'/')||L.path.startsWith(changed+'/')||changed==='') L.cb(snapOf(L.path)); }
  else if(L.type==='child_added'){ const o=getPath(L.path)||{};
    for(const k of Object.keys(o)){ if(!L.seen.has(k)){ L.seen.add(k); L.cb(snapOf(L.path+'/'+k)); } } } } }
function ref(path, owner){
  path = path.replace(/\/+$/,''); if(!path.startsWith('/')) path='/'+path;
  const api = {
    path, key: path.split('/').filter(Boolean).pop(),
    child(c){ return ref(path+'/'+c, owner); },
    set(v){ setPath(path,v); notify(path); return thenable(api); },
    update(o){ for(const k in o) setPath(path+'/'+k,o[k]); notify(path); return thenable(api); },
    remove(){ setPath(path,null); notify(path); return thenable(api); },
    push(v){ const k='-id'+(++pushCounter); const r=ref(path+'/'+k, owner); if(v!==undefined) r.set(v); return thenable(r); },
    transaction(fn){ const cur=getPath(path); const res=fn(cur===undefined?null:cur);
      if(res!==undefined){ setPath(path,res); notify(path); }
      return thenable({ committed:res!==undefined, snapshot:snapOf(path) }); },
    once(ev,cb){ const sn=snapOf(path); if(cb) cb(sn); return Promise.resolve(sn); },
    on(ev,cb){ const L={path,type:ev,cb,owner,seen:new Set()}; listeners.push(L);
      if(ev==='value') cb(snapOf(path));
      else if(ev==='child_added'){ const o=getPath(path)||{}; for(const k of Object.keys(o)){ L.seen.add(k); cb(snapOf(path+'/'+k)); } }
      return cb; },
    off(ev,cb){ for(let i=listeners.length-1;i>=0;i--){ const L=listeners[i];
      if(L.path===path && L.owner===owner && (!ev||L.type===ev) && (!cb||L.cb===cb)) listeners.splice(i,1); } },
    onDisconnect(){ return { remove(){ dcHooks.push({path,action:'remove'}); return Promise.resolve(); },
      set(v){ dcHooks.push({path,action:'set',v}); return Promise.resolve(); },
      cancel(){ for(let i=dcHooks.length-1;i>=0;i--) if(dcHooks[i].path===path) dcHooks.splice(i,1); return Promise.resolve(); } }; },
    limitToLast(){ return api; }, orderByChild(){ return api; }
  };
  return api;
}
function thenable(v){
  if(!v || typeof v!=='object') return v;
  v.then = (res, rej) => { try { return Promise.resolve(res ? res(undefined) : undefined); }
                           catch(e){ return rej ? Promise.resolve(rej(e)) : Promise.reject(e); } };
  v.catch = () => Promise.resolve(undefined);
  return v;
}
const dcHooks = [];
function simulateDisconnect(path){
  for(const h of dcHooks.slice()){ if(h.path===path||h.path.startsWith(path+'/')){
    if(h.action==='remove'){ setPath(h.path,null); notify(h.path); } else { setPath(h.path,h.v); notify(h.path); } } }
  setPath(path,null); notify(path);
}
module.exports = { DB, ref, getPath, setPath, simulateDisconnect, listeners };
