'use strict';
(function(){
  function init(){
    document.querySelectorAll('[data-lanyard]').forEach(function(scene){
      scene.classList.add('lanyard-ready');
      var card=scene.querySelector('.lanyard-card');
      var clip=scene.querySelector('.lanyard-clip');
      if(!card||!clip)return;
      var ns='http://www.w3.org/2000/svg';
      var svg=document.createElementNS(ns,'svg');
      svg.setAttribute('class','lanyard-rope');
      svg.setAttribute('viewBox','0 0 190 180');
      var path=document.createElementNS(ns,'path');
      svg.appendChild(path);
      scene.insertBefore(svg,scene.firstChild);
      var x=0,y=0,vx=0,vy=0,dragged=false,offsetX=0,offsetY=0,last=0,frame=0;
      function render(){
        var targetX=95+x;
        var targetY=138+y;
        var midX=95+x*.5;
        var midY=70+y*.35+Math.min(18,Math.abs(x)*.08);
        path.setAttribute('d','M 95 0 C 95 42 '+midX.toFixed(1)+' '+midY.toFixed(1)+' '+targetX.toFixed(1)+' '+targetY.toFixed(1));
        card.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px) rotate('+(4+vx*.12).toFixed(2)+'deg)';
        clip.style.transform='translate('+(x*.5).toFixed(1)+'px,'+(y*.5).toFixed(1)+'px)';
      }
      function settle(){
        if(dragged)return;
        vx+=(-x*.018)-vx*.08;
        vy+=(-y*.018)-vy*.08;
        x+=vx;y+=vy;
        render();
        frame=requestAnimationFrame(settle);
      }
      function move(e){
        if(!dragged)return;
        var now=performance.now(),dt=Math.max(8,now-last);
        var nx=e.clientX-offsetX,ny=e.clientY-offsetY;
        vx=(nx-x)/(dt/16);vy=(ny-y)/(dt/16);x=nx;y=ny;last=now;render();e.preventDefault();
      }
      function end(e){
        if(!dragged)return;
        dragged=false;scene.classList.remove('is-dragging');
        if(card.releasePointerCapture)card.releasePointerCapture(e.pointerId);
        cancelAnimationFrame(frame);frame=requestAnimationFrame(settle);
      }
      card.addEventListener('pointerdown',function(e){
        dragged=true;scene.classList.add('is-dragging');card.setPointerCapture(e.pointerId);
        offsetX=e.clientX-x;offsetY=e.clientY-y;last=performance.now();vx=0;vy=0;e.preventDefault();
      });
      card.addEventListener('pointermove',move);
      card.addEventListener('pointerup',end);
      card.addEventListener('pointercancel',end);
      render();
      frame=requestAnimationFrame(settle);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
