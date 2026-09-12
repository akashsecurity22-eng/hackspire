'use strict';
(function(){
  function init(root){
    var canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    if(!ctx)return;canvas.className='hyperspeed-canvas';root.appendChild(canvas);
    var dpr,w,h,last=0,raf,cxOffset=0,cyOffset=0,lights=[];
    function resize(){dpr=Math.min(window.devicePixelRatio||1,2);w=root.clientWidth||innerWidth;h=root.clientHeight||innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}
    for(var i=0;i<70;i++)lights.push({z:Math.random(),lane:(Math.random()<.5?-1:1)*(.28+Math.random()*.72),speed:.22+Math.random()*.5,color:Math.random()<.68?'#fff':'#ff3030'});
    function stroke(x1,y1,x2,y2,color,width,alpha){ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.globalAlpha=1;}
    function frame(now){var dt=Math.min((now-last)/1000,.05);last=now;ctx.fillStyle='#020203';ctx.fillRect(0,0,w,h);var cx=w*(.5+cxOffset)+0,hor=h*(.46+cyOffset),bottom=h*1.12,g=ctx.createRadialGradient(cx,hor,0,cx,hor,w*.7);g.addColorStop(0,'rgba(95,8,16,.52)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
      for(var s=0;s<90;s++){ctx.fillStyle=s%5===0?'rgba(255,48,48,.55)':'rgba(255,255,255,.3)';ctx.fillRect((s*97)%w,(s*53)%h,1,1);}
      for(var lane=-5;lane<=5;lane++){var bx=cx+lane*w*.105;stroke(cx+lane*w*.018,hor,bx,bottom,lane===0?'#fff':'#ff3030',lane===0?2:1,lane===0?.75:.5);}
      for(var z=.02;z<1;z+=.08){var p=Math.pow(z,1.8),y=hor+(bottom-hor)*p,spread=w*.12*p;stroke(cx-spread,y,cx+spread,y,'#fff',Math.max(1,3*p),.35+.5*p);}
      lights.forEach(function(l){l.z+=dt*l.speed;if(l.z>1)l.z=0;var p=Math.pow(l.z,1.7),y=hor+(bottom-hor)*p,x=cx+l.lane*w*.36*p,len=16+100*p;stroke(x,y,x-l.lane*len,y+len*.18,l.color,1+3*p,.25+.7*p);});
      raf=requestAnimationFrame(frame);}
    root.addEventListener('pointermove',function(e){cxOffset=(e.clientX/w-.5)*.035;cyOffset=(e.clientY/h-.5)*.015;});window.addEventListener('resize',resize);resize();
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)frame(0);else raf=requestAnimationFrame(frame);
  }
  function initAll(){document.querySelectorAll('[data-hyperspeed]').forEach(function(el){if(!el.dataset.ready){el.dataset.ready='1';init(el);}});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initAll);else initAll();
})();
