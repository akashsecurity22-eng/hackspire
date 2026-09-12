'use strict';
/**
 * HackSpire — WebThreads Component Engine (React Bits WebGL2 / OGL)
 * Weaving glowing filament strands with interactive mouse deformation and film grain.
 */
(function(){
  var VERT = `#version 300 es
in vec2 position;
void main(){
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

  var FRAG = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uThreadCount;
uniform float uFrequency;
uniform float uSpread;
uniform float uTaper;
uniform float uPosition;
uniform float uFanMode;
uniform float uGlow;
uniform float uFalloff;
uniform float uThickness;
uniform float uBrightness;
uniform float uOpacity;
uniform float uMirror;
uniform float uShimmer;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uEnableMouse;
uniform float uMouseActive;
out vec4 fragColor;

#define TAU 6.28318530718
#define MAX_THREADS 10

float glow(float x, float str, float dist) {
  return dist / pow(max(x, 1e-4), str);
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float n = max(uThreadCount, 1.0);

  float pinchX = uFanMode < 0.5 ? 0.5 : (uFanMode < 1.5 ? 0.0 : 1.0);
  if (uEnableMouse > 0.5) {
    pinchX = mix(pinchX, uMouse.x, clamp(uMouseStrength, 0.0, 1.0) * uMouseActive);
  }

  float spreadDx = uSpread * abs(uv.x - pinchX);
  float baseT = iTime * uSpeed;
  float tauOverN = TAU / n;
  float mirror = uMirror > 0.5 ? sign(pinchX - uv.x) : 1.0;
  float shimmerT = iTime * 1.7;
  float invThickness = 1.0 / max(uThickness, 0.01);
  float xFreq = uv.x * uFrequency;
  float yOff = uv.y - uPosition;
  float ciScale = n > 1.0 ? 1.0 / (n - 1.0) : 0.0;

  vec3 col = vec3(0.0);
  float gsum = 0.0;

  for (int idx = 0; idx < MAX_THREADS; idx++) {
    float i = float(idx);
    if (i >= n) break;

    float amplitude = spreadDx * (1.0 + i * uTaper);
    float sh2 = uShimmer > 0.5 ? sin(shimmerT + i * 1.3) * 0.35 : 0.0;
    float phase = (baseT + i * tauOverN) * mirror + sh2;
    float sdf = abs(yOff + sin(xFreq + phase) * amplitude) * invThickness;

    float g = glow(sdf, uFalloff, uGlow);
    col += g * mix(uColor1, uColor2, i * ciScale);
    gsum += g;
  }

  float coreAmt = smoothstep(0.5, 2.2, gsum);
  col = mix(col, uColor3 * gsum, coreAmt * 0.5);

  float bright = uBrightness;
  if (uEnableMouse > 0.5) {
    vec2 md = uv - uMouse;
    float d2 = dot(md, md);
    bright += clamp(uMouseStrength, 0.0, 1.0) * uMouseActive * exp(-d2 * 6.0) * 0.6;
  }
  col *= bright;

  float alpha = clamp(gsum, 0.0, 1.0) * uOpacity;
  vec3 outRgb = col * alpha;

  if (uGrain > 0.5) {
    float gv = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453) - 0.5) * uGrainIntensity;
    outRgb = clamp(outRgb + gv, 0.0, 1.0);
    alpha = clamp(alpha + gv, 0.0, 1.0);
  }

  fragColor = vec4(outRgb, alpha);
}
`;

  function hx(h, def){
    h = String(h || def || '#ffffff').replace('#','').trim();
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var num = parseInt(h, 16);
    if (isNaN(num)) return [1, 1, 1];
    return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
  }

  function compileShader(gl, type, src){
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('WebThreads Shader Error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function init(box){
    if (!box || box.dataset.wtInit || !window.WebGL2RenderingContext) return;
    box.dataset.wtInit = '1';

    var o = {};
    try { o = JSON.parse(box.dataset.wtOptions || '{}'); } catch(e) { o = {}; }

    var cv = document.createElement('canvas');
    cv.style.width = '100%';
    cv.style.height = '100%';
    cv.style.display = 'block';
    box.appendChild(cv);

    var gl = cv.getContext('webgl2', { alpha: true, antialias: false, depth: false });
    if (!gl) {
      box.removeChild(cv);
      return;
    }
    gl.clearColor(0, 0, 0, 0);

    var vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
    var fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    var pr = gl.createProgram();
    gl.attachShader(pr, vs);
    gl.attachShader(pr, fs);
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      console.warn('WebThreads Program Link Error:', gl.getProgramInfoLog(pr));
      return;
    }
    gl.useProgram(pr);

    // Fullscreen triangle
    var vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    function U(n){ return gl.getUniformLocation(pr, n); }
    var u = {
      t: U('iTime'), res: U('iResolution'), sp: U('uSpeed'), n: U('uThreadCount'),
      fq: U('uFrequency'), spr: U('uSpread'), tap: U('uTaper'), pos: U('uPosition'),
      fan: U('uFanMode'), gl: U('uGlow'), fa: U('uFalloff'), th: U('uThickness'),
      br: U('uBrightness'), op: U('uOpacity'), mi: U('uMirror'), shm: U('uShimmer'),
      gr: U('uGrain'), gi: U('uGrainIntensity'), c1: U('uColor1'), c2: U('uColor2'),
      c3: U('uColor3'), m: U('uMouse'), ms: U('uMouseStrength'), em: U('uEnableMouse'),
      ma: U('uMouseActive')
    };

    var FAN = { center: 0, left: 1, right: 2 };
    gl.uniform1f(u.sp, +(o.speed || 0.2));
    gl.uniform1f(u.n, Math.max(1, Math.min(10, Math.round(+(o.threadCount || 6)))));
    gl.uniform1f(u.fq, +(o.frequency || 5.0));
    gl.uniform1f(u.spr, +(o.spread || 0.18));
    gl.uniform1f(u.tap, +(o.taper || 1.0));
    gl.uniform1f(u.pos, +(o.position || 0.5));
    gl.uniform1f(u.fan, FAN[o.fanMode] || 0);
    gl.uniform1f(u.gl, +(o.glow || 0.02));
    gl.uniform1f(u.fa, +(o.falloff || 0.6));
    gl.uniform1f(u.th, +(o.thickness || 1.1));
    gl.uniform1f(u.br, +(o.brightness || 0.6));
    gl.uniform1f(u.op, (o.opacity == null ? 1.0 : +o.opacity));
    gl.uniform1f(u.mi, o.mirror === false ? 0.0 : 1.0);
    gl.uniform1f(u.shm, o.shimmer ? 1.0 : 0.0);
    gl.uniform1f(u.gr, o.grain === false ? 0.0 : 1.0);
    gl.uniform1f(u.gi, +(o.grainIntensity || 0.05));

    // Colors: support provided options, fallback to red cyber theme
    gl.uniform3fv(u.c1, hx(o.color1, '#FF1A1A'));
    gl.uniform3fv(u.c2, hx(o.color2, '#FF3030'));
    gl.uniform3fv(u.c3, hx(o.color3, '#FFFFFF'));

    var enableMouse = (o.mouseInteraction !== false && o.mouse !== false);
    gl.uniform1f(u.em, enableMouse ? 1.0 : 0.0);
    gl.uniform1f(u.ms, +(o.mouseStrength || 0.3));

    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var raf = 0, run = false, t0 = performance.now();
    var cm = [0.5, 0.5], tm = [0.5, 0.5], ca = 0, ta = 0;

    function size(){
      var r = box.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var d = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.floor(r.width * d);
      var h = Math.floor(r.height * d);
      cv.width = w;
      cv.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.res, w, h);
    }

    if (enableMouse) {
      function onPointerMove(e){
        var r = cv.getBoundingClientRect();
        if (e.clientY >= r.top && e.clientY <= r.bottom) {
          tm[0] = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
          tm[1] = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
          ta = 1;
        }
      }
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerleave', function(){ ta = 0; }, { passive: true });
    }

    function loop(t){
      gl.uniform1f(u.t, (t - t0) * 0.001);
      cm[0] += 0.05 * (tm[0] - cm[0]);
      cm[1] += 0.05 * (tm[1] - cm[1]);
      ca += 0.05 * (ta - ca);
      gl.uniform2f(u.m, cm[0], cm[1]);
      gl.uniform1f(u.ma, ca);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(loop);
    }

    function start(){
      if (run || reduced || !cv.width) return;
      run = true;
      raf = requestAnimationFrame(loop);
    }

    function stop(){
      run = false;
      cancelAnimationFrame(raf);
      raf = 0;
    }

    size();
    gl.uniform1f(u.t, 0.4);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!reduced) {
      if ('ResizeObserver' in window) new ResizeObserver(size).observe(box);
      else window.addEventListener('resize', size);

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function(entries){
          entries.forEach(function(e){
            if (e.isIntersecting) start();
            else stop();
          });
        }, { threshold: 0 }).observe(box);
      } else {
        start();
      }

      document.addEventListener('visibilitychange', function(){
        if (document.hidden) stop();
        else start();
      });
    }
  }

  function all(){
    document.querySelectorAll('[data-webthreads], .web-threads-container').forEach(init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all);
  else all();

  window.WebThreads = { init: init, initAll: all };
})();
