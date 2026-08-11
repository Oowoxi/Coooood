function createDom(){
  const els = {}; const allEls = [];
  function makeEl(id, cls){
    const styleStore = { display:'none', setProperty(k,v){ this[k]=v; }, removeProperty(k){ delete this[k]; }, getPropertyValue(k){ return this[k]||''; } };
    const el = {
      id, _html:'', _text:'', value:'', checked:false, _parent:null, _children:[],
      style: new Proxy(styleStore,{ get:(t,k)=> (k in t? t[k] : ''), set:(t,k,v)=>{ t[k]=v; return true; } }),
      classList: { _s:new Set((cls||'').split(/\s+/).filter(Boolean)),
        add(...c){ c.forEach(x=>this._s.add(x)); }, remove(...c){ c.forEach(x=>this._s.delete(x)); },
        contains(c){ return this._s.has(c); }, toggle(c){ this._s.has(c)?this._s.delete(c):this._s.add(c); } },
      get innerHTML(){ return this._html; }, set innerHTML(v){ this._html = String(v); },
      get innerText(){ return this._text; }, set innerText(v){ this._text = String(v); },
      get textContent(){ return this._text; }, set textContent(v){ this._text = String(v); },
      set className(v){ this.classList._s = new Set(String(v).split(/\s+/).filter(Boolean)); },
      get className(){ return [...this.classList._s].join(' '); },
      appendChild(ch){ this._html += (ch && ch._html !== undefined ? ch._html : ''); if(ch){ch._parent=this; this._children.push(ch);} },
      closest(sel){ const want=sel.replace(/^\./,''); let n=this;
        while(n){ if(n.classList && n.classList.contains(want)) return n; n=n._parent; } return null; },
      removeChild(){}, remove(){}, focus(){}, blur(){}, click(){},
      setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){},
      addEventListener(){}, removeEventListener(){},
      querySelector(){ return makeEl(id+'-q'); }, querySelectorAll(){ return []; },
      getContext(){ return { drawImage(){}, fillRect(){}, clearRect(){}, imageSmoothingEnabled:true, imageSmoothingQuality:'low' }; },
      toDataURL(){ return 'data:image/jpeg;base64,AAAA'; },
      scrollTop:0, scrollHeight:0, offsetHeight:0, offsetWidth:0, files:[]
    };
    allEls.push(el); return el;
  }
  const document = {
    _fake:{},
    getElementById(id){ if(!els[id]) els[id]=makeEl(id); return els[id]; },
    createElement(tag){ return makeEl('new-'+tag); },
    querySelector(sel){ if(!els['sel'+sel]) els['sel'+sel]=makeEl('sel'+sel); return els['sel'+sel]; },
    querySelectorAll(sel){ return document._fake[sel] || []; },
    addEventListener(ev,cb){ if(ev==='DOMContentLoaded') document._ready=cb; },
    removeEventListener(){},
    body: makeEl('body'), documentElement: makeEl('html'), _els: els, _make: makeEl
  };
  return document;
}
module.exports = { createDom };
