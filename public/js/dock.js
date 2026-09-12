'use strict';
/* HackSpire Dock — fixed LEFT vertical quick-nav dock (top to bottom) with
   cursor magnification + red tooltips. Vanilla JS, zero deps, CSP-safe. */
(function(){
  var ITEMS=[['HOME','/','\u2302'],['ABOUT','/about','\u23F1'],['LEARN','/learning','\uD83D\uDC54'],['TEAMS','/team','\uD83D\uDC65'],['EVENTS','/events','\uD83C\uDFC6'],['COMMUNITY','/community','\uD83C\uDF10'],['FOUNDER','/founder/akash','\u26A1']];
  function init(){
    if(document.getElementById('hspire-dock'))return;
    var outer=document.createElement('div');outer.id='hspire-dock';outer.className='dock-outer';
    var panel=document.createElement('div');panel.className='dock-panel';panel.setAttribute('role','toolbar');panel.setAttribute('aria-label','HackSpire quick navigation');
    outer.appendChild(panel);document.body.appendChild(outer);
    var path=location.pathname;
    var N=ITEMS.length;
    var els=ITEMS.map(function(it,k){
      var a=document.createElement('a');
      a.className='dock-item'+(path===it[1]?' dock-active':'');a.href=it[1];
      a.setAttribute('aria-label',it[0]);a.setAttribute('role','link');
      var lab=document.createElement('span');lab.className='dock-label';lab.textContent=it[0];
      var ic=document.createElement('span');ic.className='dock-icon';ic.textContent=it[2];
      a.append(ic,lab);panel.appendChild(a);
      return a;
    });
    if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    var itemW=46,gap=12;
    var y0=8,totalH=N*itemW+(N-1)*gap;
    panel.style.width=(itemW+20)+'px';
    panel.style.height=(totalH+y0*2)+'px';
    els.forEach(function(a,i){
      a.style.top=Math.round(y0+i*(itemW+gap))+'px';
      a.style.width=itemW+'px';a.style.height=itemW+'px';
      a.style.fontSize=Math.max(15,Math.round(itemW*0.42))+'px';
    });
    var st=els.map(function(){return {s:0,fly:0,h:0};});
    var mx=null,my=null,panelHit=false,hOver=0,last=performance.now(),raf=0,run=true;
    function onMove(e){
      mx=e.clientX;my=e.clientY;
      var r=panel.getBoundingClientRect();
      panelHit=my>r.top&&my<r.bottom&&mx>r.left&&mx<r.right;
    }
    document.addEventListener('pointermove',onMove,{passive:true});
    document.addEventListener('mousemove',onMove,{passive:true});
    els.forEach(function(a,i){
      a.addEventListener('focus',function(){st[i].h=1;panelHit=true;});
      a.addEventListener('blur',function(){st[i].h=0;});
    });
    function frame(now){
      if(!run)return;
      var dt=Math.min((now-last)/1000,0.04)||0.016;last=now;
      hOver+=(panelHit?1:0-hOver)*Math.min(1,dt*5);
      for(var i=0;i<N;i++){
        var r=els[i].getBoundingClientRect(),cy=r.top+r.height/2;
        var d=my===null?999:Math.abs(my-cy);
        var t=d<=40?1:Math.max(0,1-(d-40)/180);
        st[i].s+=(t-st[i].s)*Math.min(1,dt*9);
        st[i].fly+=(st[i].h-st[i].fly)*Math.min(1,dt*12);
        var sc=(0.62+st[i].s*0.72)+(st[i].fly*0.15);
        els[i].style.transform='translateY('+(st[i].s*8)+'px) translateX('+(-st[i].s*6)+'px) scale('+sc.toFixed(3)+')';
      }
      outer.style.opacity=hOver>0.02?(0.25+hOver*0.75).toFixed(2):'0';
      outer.style.pointerEvents=hOver>0.05?'auto':'none';
      raf=requestAnimationFrame(frame);
    }
    raf=requestAnimationFrame(frame);
    document.addEventListener('visibilitychange',function(){run=!document.hidden;if(run)raf=requestAnimationFrame(frame);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();