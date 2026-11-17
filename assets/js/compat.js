/* APIS WebKit/Android compatibility and early-runtime diagnostics.
   Kept ES5-compatible so it can report failures in older Safari engines. */
(function(){
  function showError(kind,message,where){
    try{
      var panel=document.getElementById('apisRuntimeDiagnostic');
      if(!panel){
        panel=document.createElement('div');
        panel.id='apisRuntimeDiagnostic';
        panel.setAttribute('role','alert');
        panel.style.cssText='position:fixed;right:10px;bottom:10px;left:auto;max-width:min(420px,calc(100vw - 20px));z-index:99999;padding:8px 10px;border:1px solid #d98b86;border-radius:9px;background:#fff1f0;color:#7f241f;box-shadow:0 4px 18px rgba(0,0,0,.14);font:600 10px/1.35 -apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;white-space:normal;word-break:break-word;max-height:12vh;overflow:hidden;pointer-events:none;opacity:.94';
        document.body.appendChild(panel);
      }
      panel.textContent='APIS ENGINE ERROR · '+kind+' · '+String(message||'Unknown error')+(where?' · '+where:'');
    }catch(ignore){}
  }
  window.__APIS_REPORT_ERROR__=showError;
  window.addEventListener('error',function(event){
    /* Optional external resources (TradingView scripts, icons, widgets) may be
       blocked by privacy settings or the test network; do not label those as
       APIS engine failures or cover the dashboard with a runtime panel. */
    if(event&&event.target&&event.target!==window){
      var target=event.target;
      var tag=String(target.tagName||'').toUpperCase();
      if(['SCRIPT','LINK','IMG','IFRAME'].indexOf(tag)>=0)return;
    }
    var locationText=event&&event.filename?event.filename+':'+(event.lineno||0)+':'+(event.colno||0):'script execution';
    showError('JavaScript',event&&event.message,locationText);
  },true);
  window.addEventListener('unhandledrejection',function(event){
    var reason=event&&event.reason,detail=reason&&(reason.stack||reason.message||String(reason));
    showError('Unhandled promise',detail||'Promise rejected');
  });
  /* Safari versions without these ES built-ins get standards-compatible fallbacks. */
  if(!String.prototype.replaceAll){
    String.prototype.replaceAll=function(search,replacement){
      if(search instanceof RegExp){if(!search.global)throw new TypeError('replaceAll requires a global RegExp');return this.replace(search,replacement);}
      return this.split(String(search)).join(String(replacement));
    };
  }
  if(!Promise.allSettled){
    Promise.allSettled=function(values){return Promise.all(Array.prototype.map.call(values,function(value){return Promise.resolve(value).then(function(v){return{status:'fulfilled',value:v};},function(e){return{status:'rejected',reason:e};});}));};
  }
  if(!Promise.any){
    Promise.any=function(values){return new Promise(function(resolve,reject){
      var list=Array.prototype.slice.call(values),errors=[],remaining=list.length;
      if(!remaining){var empty=new Error('All promises were rejected');empty.name='AggregateError';empty.errors=[];reject(empty);return;}
      list.forEach(function(value,index){Promise.resolve(value).then(resolve,function(error){
        errors[index]=error;remaining--;if(!remaining){var aggregate=new Error('All promises were rejected');aggregate.name='AggregateError';aggregate.errors=errors;reject(aggregate);}
      });});
    });};
  }
  if(!window.AbortController){
    window.AbortController=function(){this.signal=undefined;this.abort=function(){};};
  }
  if(!Array.prototype.at){
    Array.prototype.at=function(index){index=Math.trunc(Number(index)||0);if(index<0)index+=this.length;return this[index];};
  }
  if(window.Node&&!Node.prototype.replaceChildren){
    Node.prototype.replaceChildren=function(){
      while(this.firstChild)this.removeChild(this.firstChild);
      for(var i=0;i<arguments.length;i++){
        var child=arguments[i];
        if(typeof child==='string')child=document.createTextNode(child);
        if(child)this.appendChild(child);
      }
    };
  }
  if(window.Element&&!Element.prototype.closest){
    Element.prototype.closest=function(selector){
      var node=this;
      while(node&&node.nodeType===1){
        var matches=node.matches||node.msMatchesSelector||node.webkitMatchesSelector;
        if(matches&&matches.call(node,selector))return node;
        node=node.parentElement;
      }
      return null;
    };
  }
})();