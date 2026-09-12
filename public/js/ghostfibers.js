'use strict';
/* HackSpire GhostFibers — red-theme port of React Bits <GhostFibers /> (ogl shader).
   Raw WebGL2, zero deps. Exact fragment shader, red palette via data-gf-options. */
(function(){
  var VERT='#version 300 es\nin vec2 position;\nvoid main(){gl_Position=vec4(position,0.0,1.0);}';
  var FRAG=`#version 300 es
precision highp float;
uniform vec2 uResolution;uniform float uTime,uSpeed,uScale,uRotation,uLayers,uWaveAmplitude,uWaveFrequency,uWaveSpeed,uLayerSpeed,uTwist,uTwistFrequency,uTwistSpeed,uLineFrequency,uLineSpacing,uLineSharpness,uGlowFalloff,uGlowIntensity,uBrightness,uBlueBoost,uVignette,uGrain,uRotationSpeed,uLightMode;uniform vec3 uLineColor,uGlowColor;out vec4 fragColor;
#define MAX_LAYERS 10
mat2 rotate2d(float angle){float sine=sin(angle);float cosine=cos(angle);return mat2(cosine,-sine,sine,cosine);}
float grainHash(vec2 point){point=floor(point);float hash=52.9829189*fract(dot(point,vec2(0.065,0.005)));return fract(hash);}
float layeredGrain(vec2 fragmentPixel){vec2 point=mod(fragmentPixel+vec2(uTime*30.0,-uTime*21.0),1024.0);vec2 rotated=mat2(0.8,-0.5,0.5,0.8)*point;float grain=0.0;grain+=0.40*grainHash(rotated);grain+=0.25*grainHash(rotated*2.0+17.0);grain+=0.20*grainHash(rotated*4.0+47.0);grain+=0.10*grainHash(rotated*8.0+113.0);grain+=0.05*grainHash(rotated*16.0+191.0);return grain;}
void main(){
vec2 resolution=max(uResolution,vec2(1.0));
vec2 uv=(2.0*gl_FragCoord.xy-resolution)/resolution.y;
float time=uTime*uSpeed;
vec3 backdrop=vec3(0.070588,0.058824,0.090196);
vec3 centerTone=max(uLineColor*0.85567-uGlowColor*0.06186,vec3(0.0));
vec3 cloudTone=uLineColor*0.19588+uGlowColor*0.2268;
vec2 p=uv;p/=max(uScale,0.05);
p=rotate2d(radians(uRotation)+time*uRotationSpeed)*p;
vec3 color=vec3(0.0);float fiberField=0.0;
for(int index=0;index<MAX_LAYERS;index++){
float fi=float(index)+1.0;if(fi>uLayers)break;
p+=uWaveAmplitude*sin(p.yx*fi*uWaveFrequency+time*(uWaveSpeed+fi*uLayerSpeed));
float radius=length(p);float polarAngle=atan(p.y,p.x);
polarAngle+=sin(radius*uTwistFrequency-time*uTwistSpeed+fi)*uTwist;
p=vec2(cos(polarAngle),sin(polarAngle))*radius;
float lines=abs(sin(p.x*(uLineFrequency+fi*uLineSpacing)+sin(p.y*3.0+time)));
lines=pow(max(0.0,1.0-lines),uLineSharpness);
fiberField+=lines/fi;color+=uLineColor*lines/fi;
float glow=exp(-uGlowFalloff*abs(sin(p.x*3.0+time+fi)));
color+=uGlowColor*glow*uGlowIntensity/(fi*2.0);}
float center=exp(-2.2*dot(uv,uv));color+=centerTone*center;
float cloud=exp(-1.5*length(uv+vec2(sin(time*0.3)*0.25,cos(time*0.25)*0.18)));
color+=cloudTone*cloud;
float vig=1.0-smoothstep(0.35,1.45,length(uv));
color*=mix(1.0-uVignette,1.0,vig);
color=1.0-exp(-color*uBrightness);color.b*=uBlueBoost;
vec3 outputColor=backdrop+color;
float noise=(layeredGrain(gl_FragCoord.xy)-0.5)*uGrain;
outputColor=clamp(outputColor+noise,0.0,1.0);
fragColor=vec4(outputColor,1.0);}
`;  function hx(h){h=String(h||'#000000').trim().replace(/^#/,'');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];var m=/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);if(!m)return [1,1,1];return [parseInt(m[1],16)/255,parseInt(m[2],16)/255,parseInt(m[3],16)/255];}
  function sh(gl,t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o;}
  function init(box){
    if(box.dataset.gfInit||!window.WebGL2RenderingContext)return;box.dataset.gfInit='1';
    var o={};try{o=JSON.parse(box.dataset.gfOptions||'{}');}catch(e){o={};}
    var cv=document.createElement('canvas');cv.setAttribute('aria-hidden','true');
    box.appendChild(cv);
    var gl=cv.getContext('webgl2',{alpha:false,antialias:false});
    if(!gl){box.removeChild(cv);return;}
    var pr=gl.createProgram();
    gl.attachShader(pr,sh(gl,gl.VERTEX_SHADER,VERT));
    gl.attachShader(pr,sh(gl,gl.FRAGMENT_SHADER,FRAG));
    gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){box.removeChild(cv);return;}
    gl.useProgram(pr);
    var vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    var loc=gl.getAttribLocation(pr,'position');
    gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    function U(n){return gl.getUniformLocation(pr,n);}
    var u={res:U('uResolution'),t:U('uTime'),sp:U('uSpeed'),sc:U('uScale'),rot:U('uRotation'),rs:U('uRotationSpeed'),ly:U('uLayers'),wa:U('uWaveAmplitude'),wf:U('uWaveFrequency'),ws:U('uWaveSpeed'),ls:U('uLayerSpeed'),tw:U('uTwist'),tf:U('uTwistFrequency'),ts:U('uTwistSpeed'),lf:U('uLineFrequency'),lsp:U('uLineSpacing'),lsh:U('uLineSharpness'),gf:U('uGlowFalloff'),gi:U('uGlowIntensity'),br:U('uBrightness'),bb:U('uBlueBoost'),vg:U('uVignette'),gr:U('uGrain'),lc:U('uLineColor'),gc:U('uGlowColor')};
    function f3(name,hex){gl.uniform3fv(u[name],hx(hex));}
    var d=Math.min(Math.max(+(o.dpr||1),0.5),2);
    gl.uniform1f(u.sp,+(o.speed||0.35));gl.uniform1f(u.sc,+(o.scale||2));
    gl.uniform1f(u.rot,+(o.rotation||0));gl.uniform1f(u.rs,+(o.rotationSpeed||0.25));
    gl.uniform1f(u.ly,Math.min(10,Math.max(1,Math.round(+(o.layers||4)))));
    gl.uniform1f(u.wa,+(o.waveAmplitude||0.015));gl.uniform1f(u.wf,+(o.waveFrequency||3));
    gl.uniform1f(u.ws,+(o.waveSpeed||0.15));gl.uniform1f(u.ls,+(o.layerSpeed||0.08));
    gl.uniform1f(u.tw,+(o.twist||0.1));gl.uniform1f(u.tf,+(o.twistFrequency||5));
    gl.uniform1f(u.ts,+(o.twistSpeed||1.2));gl.uniform1f(u.lf,+(o.lineFrequency||5));
    gl.uniform1f(u.lsp,+(o.lineSpacing||2));gl.uniform1f(u.lsh,+(o.lineSharpness||16));
    gl.uniform1f(u.gf,+(o.glowFalloff||10));gl.uniform1f(u.gi,+(o.glowIntensity||1.6));
    gl.uniform1f(u.br,+(o.brightness||2));gl.uniform1f(u.bb,(o.blueBoost==null?1.0:+o.blueBoost));
    gl.uniform1f(u.vg,+(o.vignette||0.8));gl.uniform1f(u.gr,+(o.grain||0.05));
    f3('lc',o.lineColor||'#3B0000');f3('gc',o.glowColor||'#FF1A1A');    var reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    var raf=0,elapsed=0,prev=performance.now(),run=true;
    function size(){var r=box.getBoundingClientRect();if(!r.width||!r.height)return;cv.width=Math.max(1,Math.floor(r.width*d));cv.height=Math.max(1,Math.floor(r.height*d));gl.viewport(0,0,cv.width,cv.height);gl.uniform2f(u.res,cv.width,cv.height);}
    function draw(){gl.uniform1f(u.t,elapsed);gl.drawArrays(gl.TRIANGLES,0,3);}
    function frame(now){
      if(!run)return;
      var dt=Math.min((now-prev)/1000,0.1)||0.016;prev=now;elapsed+=dt;
      draw();raf=requestAnimationFrame(frame);
    }
    function start(){if(!run||reduced||raf)return;prev=performance.now();raf=requestAnimationFrame(frame);}
    function stop(){run=false;if(raf)cancelAnimationFrame(raf);raf=0;}
    size();draw();
    if(!reduced){
      if('ResizeObserver' in window)new ResizeObserver(function(){size();draw();}).observe(box);
      window.addEventListener('resize',function(){size();draw();});
      document.addEventListener('visibilitychange',function(){if(document.hidden){stop();}else{run=true;start();}});
      start();
    }
  }
  function all(){document.querySelectorAll('[data-ghostfibers]').forEach(init);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',all);else all();
})();