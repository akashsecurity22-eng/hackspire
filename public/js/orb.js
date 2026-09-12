'use strict';
(function(){
  var vert='attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';
  var frag='precision highp float;uniform vec2 r;uniform float t;uniform float hover;uniform float rot;'+
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}'+
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}'+
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.;a*=.5;}return v;}'+
    'void main(){vec2 p=(gl_FragCoord.xy-.5*r)/min(r.x,r.y)*2.;float s=sin(rot),c=cos(rot);p=mat2(c,-s,s,c)*p;p+=hover*.1*vec2(sin(p.y*8.+t),sin(p.x*8.+t));float d=length(p),edge=1.-smoothstep(.42,1.08,d),n=fbm(p*2.2+vec2(t*.12,-t*.08)),rim=(1.-smoothstep(.12,.86,d))*smoothstep(.12,.78,d),flare=pow(max(0.,1.-length(p-vec2(cos(t)*.55,sin(t)*.55))),3.);vec3 red=vec3(1.,.01,.02),white=vec3(1.);vec3 col=mix(red,white,n)*rim+red*flare*2.2+red*pow(max(0.,1.-d),2.)*.55;gl_FragColor=vec4(col*edge,edge);}';
  function compile(gl,type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null;}
  function init(root){
    var c=document.createElement('canvas'),gl=c.getContext('webgl',{alpha:true,antialias:true});if(!gl)return;
    c.className='orb-canvas';root.appendChild(c);var vs=compile(gl,gl.VERTEX_SHADER,vert),fs=compile(gl,gl.FRAGMENT_SHADER,frag);if(!vs||!fs)return;
    var p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.bindAttribLocation(p,0,'p');gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))return;gl.useProgram(p);
    var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    var ur=gl.getUniformLocation(p,'r'),ut=gl.getUniformLocation(p,'t'),uh=gl.getUniformLocation(p,'hover'),uo=gl.getUniformLocation(p,'rot'),hover=0,rot=0,target=0,start=performance.now();
    function resize(){var d=Math.min(devicePixelRatio||1,2);c.width=root.clientWidth*d;c.height=root.clientHeight*d;c.style.width=root.clientWidth+'px';c.style.height=root.clientHeight+'px';}
    root.addEventListener('pointerenter',function(){target=1});root.addEventListener('pointerleave',function(){target=0});window.addEventListener('resize',resize);resize();
    function draw(now){hover+=(target-hover)*.08;rot+=.003;gl.viewport(0,0,c.width,c.height);gl.uniform2f(ur,c.width,c.height);gl.uniform1f(ut,(now-start)/1000);gl.uniform1f(uh,hover);gl.uniform1f(uo,rot);gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(draw);}
    requestAnimationFrame(draw);
  }
  function all(){document.querySelectorAll('[data-orb]').forEach(function(e){if(!e.dataset.ready){e.dataset.ready='1';init(e);}});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',all);else all();
})();
