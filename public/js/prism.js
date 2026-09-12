'use strict';
/**
 * HackSpire — Prism Component Engine (React Bits WebGL2 / OGL)
 * Raymarched 3D holographic prism with internal refraction, film grain and glow.
 */
(function(){
  var VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

  var FRAG = `#version 300 es
precision highp float;

uniform vec2  iResolution;
uniform float iTime;

uniform float uHeight;
uniform float uBaseHalf;
uniform mat3  uRot;
uniform int   uUseBaseWobble;
uniform float uGlow;
uniform vec2  uOffsetPx;
uniform float uNoise;
uniform float uSaturation;
uniform float uScale;
uniform float uHueShift;
uniform float uColorFreq;
uniform float uBloom;
uniform float uCenterShift;
uniform float uInvBaseHalf;
uniform float uInvHeight;
uniform float uMinAxis;
uniform float uPxScale;
uniform float uTimeScale;
uniform float uLightMode;
out vec4 fragColor;

vec4 tanh4(vec4 x){
  vec4 e2x = exp(2.0 * x);
  return (e2x - 1.0) / (e2x + 1.0);
}

float rand(vec2 co){
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
}

float sdOctaAnisoInv(vec3 p){
  vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
  float m = q.x + q.y + q.z - 1.0;
  return m * uMinAxis * 0.5773502691896258;
}

float sdPyramidUpInv(vec3 p){
  float oct = sdOctaAnisoInv(p);
  float halfSpace = -p.y;
  return max(oct, halfSpace);
}

mat3 hueRotation(float a){
  float c = cos(a), s = sin(a);
  mat3 W = mat3(
    0.299, 0.587, 0.114,
    0.299, 0.587, 0.114,
    0.299, 0.587, 0.114
  );
  mat3 U = mat3(
     0.701, -0.587, -0.114,
    -0.299,  0.413, -0.114,
    -0.300, -0.588,  0.886
  );
  mat3 V = mat3(
     0.168, -0.331,  0.500,
     0.328,  0.035, -0.500,
    -0.497,  0.296,  0.201
  );
  return W + U * c + V * s;
}

void main(){
  vec2 f = (gl_FragCoord.xy - 0.5 * iResolution.xy - uOffsetPx) * uPxScale;

  float z = 5.0;
  float d = 0.0;

  vec3 p;
  vec4 o = vec4(0.0);

  float centerShift = uCenterShift;
  float cf = uColorFreq;

  mat2 wob = mat2(1.0);
  if (uUseBaseWobble == 1) {
    float t = iTime * uTimeScale;
    float c0 = cos(t + 0.0);
    float c1 = cos(t + 33.0);
    float c2 = cos(t + 11.0);
    wob = mat2(c0, c1, c2, c0);
  }

  const int STEPS = 100;
  for (int i = 0; i < STEPS; i++) {
    p = vec3(f, z);
    p.xz = p.xz * wob;
    p = uRot * p;
    vec3 q = p;
    q.y += centerShift;
    d = 0.1 + 0.2 * abs(sdPyramidUpInv(q));
    z -= d;
    o += (sin((p.y + z) * cf + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;
  }

  o = tanh4(o * o * (uGlow * uBloom) / 1e5);

  vec3 col = o.rgb;
  float n = rand(gl_FragCoord.xy + vec2(iTime));
  col += (n - 0.5) * uNoise;
  col = clamp(col, 0.0, 1.0);

  float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = clamp(mix(vec3(L), col, uSaturation), 0.0, 1.0);

  if (abs(uHueShift) > 0.0001) {
    col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0);
  }

  if (uLightMode > 0.5) {
    float peak = max(col.r, max(col.g, col.b));
    vec3 chroma = pow(clamp(col / max(peak, 0.0001), 0.0, 1.0), vec3(1.14));
    fragColor = vec4(mix(vec3(1.0), chroma, o.a * 0.94), 1.0);
  } else {
    fragColor = vec4(col, o.a);
  }
}
`;

  function compileShader(gl, type, src){
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('Prism Shader Error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function setMat3FromEuler(yawY, pitchX, rollZ, out) {
    var cy = Math.cos(yawY), sy = Math.sin(yawY);
    var cx = Math.cos(pitchX), sx = Math.sin(pitchX);
    var cz = Math.cos(rollZ), sz = Math.sin(rollZ);

    out[0] = cy * cz + sy * sx * sz;
    out[1] = cx * sz;
    out[2] = -sy * cz + cy * sx * sz;

    out[3] = -cy * sz + sy * sx * cz;
    out[4] = cx * cz;
    out[5] = sy * sz + cy * sx * cz;

    out[6] = sy * cx;
    out[7] = -sx;
    out[8] = cy * cx;
    return out;
  }

  function init(container) {
    if (!container || container.dataset.prismInit || !window.WebGL2RenderingContext) return;
    container.dataset.prismInit = '1';

    var raw = container.dataset.prismOptions || '{}';
    var opts = {};
    try { opts = JSON.parse(raw); } catch (e) { opts = {}; }

    var height = Math.max(0.001, +(opts.height != null ? opts.height : 3.5));
    var baseWidth = Math.max(0.001, +(opts.baseWidth != null ? opts.baseWidth : 5.5));
    var BASE_HALF = baseWidth * 0.5;
    var animationType = opts.animationType || 'rotate';
    var glow = Math.max(0.0, +(opts.glow != null ? opts.glow : 1));
    var noise = Math.max(0.0, +(opts.noise != null ? opts.noise : 0.5));
    var transparent = opts.transparent !== false;
    var scale = Math.max(0.001, +(opts.scale != null ? opts.scale : 3.6));
    var hueShift = +(opts.hueShift || 0);
    var colorFrequency = Math.max(0.0, +(opts.colorFrequency != null ? opts.colorFrequency : 1));
    var hoverStrength = Math.max(0, +(opts.hoverStrength != null ? opts.hoverStrength : 2));
    var inertia = Math.max(0, Math.min(1, +(opts.inertia != null ? opts.inertia : 0.05)));
    var bloom = Math.max(0, +(opts.bloom != null ? opts.bloom : 1));
    var timeScale = Math.max(0, +(opts.timeScale != null ? opts.timeScale : 0.5));
    var suspendWhenOffscreen = !!opts.suspendWhenOffscreen;
    var lightMode = !!opts.lightMode;
    var offX = +(opts.offset && opts.offset.x ? opts.offset.x : 0);
    var offY = +(opts.offset && opts.offset.y ? opts.offset.y : 0);

    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var cv = document.createElement('canvas');
    cv.style.position = 'absolute';
    cv.style.inset = '0';
    cv.style.width = '100%';
    cv.style.height = '100%';
    cv.style.display = 'block';
    cv.setAttribute('aria-hidden', 'true');
    container.appendChild(cv);

    var gl = cv.getContext('webgl2', {
      alpha: transparent,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance'
    });
    if (!gl) {
      container.removeChild(cv);
      return;
    }

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);

    var vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
    var fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    var pr = gl.createProgram();
    gl.attachShader(pr, vs);
    gl.attachShader(pr, fs);
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      console.warn('Prism Program Link Error:', gl.getProgramInfoLog(pr));
      return;
    }
    gl.useProgram(pr);

    var vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    function U(n) { return gl.getUniformLocation(pr, n); }
    var u = {
      res: U('iResolution'),
      time: U('iTime'),
      height: U('uHeight'),
      baseHalf: U('uBaseHalf'),
      useBaseWobble: U('uUseBaseWobble'),
      rot: U('uRot'),
      glow: U('uGlow'),
      offsetPx: U('uOffsetPx'),
      noise: U('uNoise'),
      sat: U('uSaturation'),
      scale: U('uScale'),
      hueShift: U('uHueShift'),
      colorFreq: U('uColorFreq'),
      bloom: U('uBloom'),
      centerShift: U('uCenterShift'),
      invBaseHalf: U('uInvBaseHalf'),
      invHeight: U('uInvHeight'),
      minAxis: U('uMinAxis'),
      pxScale: U('uPxScale'),
      timeScale: U('uTimeScale'),
      lightMode: U('uLightMode')
    };

    var sat = transparent ? 1.5 : 1.0;
    gl.uniform1f(u.height, height);
    gl.uniform1f(u.baseHalf, BASE_HALF);
    gl.uniform1f(u.glow, glow);
    gl.uniform1f(u.noise, noise);
    gl.uniform1f(u.sat, sat);
    gl.uniform1f(u.scale, scale);
    gl.uniform1f(u.hueShift, hueShift);
    gl.uniform1f(u.colorFreq, colorFrequency);
    gl.uniform1f(u.bloom, bloom);
    gl.uniform1f(u.centerShift, height * 0.25);
    gl.uniform1f(u.invBaseHalf, 1 / BASE_HALF);
    gl.uniform1f(u.invHeight, 1 / height);
    gl.uniform1f(u.minAxis, Math.min(BASE_HALF, height));
    gl.uniform1f(u.timeScale, timeScale);
    gl.uniform1f(u.lightMode, lightMode ? 1.0 : 0.0);

    var rotBuf = new Float32Array(9);
    rotBuf[0] = 1; rotBuf[4] = 1; rotBuf[8] = 1;
    gl.uniformMatrix3fv(u.rot, false, rotBuf);

    function resize() {
      var w = container.clientWidth || 1;
      var h = container.clientHeight || 1;
      var dw = Math.floor(w * dpr);
      var dh = Math.floor(h * dpr);
      cv.width = dw;
      cv.height = dh;
      gl.viewport(0, 0, dw, dh);
      gl.uniform2f(u.res, dw, dh);
      gl.uniform2f(u.offsetPx, offX * dpr, offY * dpr);
      gl.uniform1f(u.pxScale, 1 / (dh * 0.1 * scale));
    }

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(container);
    else window.addEventListener('resize', resize);
    resize();

    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var t0 = performance.now();
    var raf = 0, running = false;

    var wX = 0.3 + Math.random() * 0.6;
    var wY = 0.2 + Math.random() * 0.7;
    var wZ = 0.1 + Math.random() * 0.5;
    var phX = Math.random() * Math.PI * 2;
    var phZ = Math.random() * Math.PI * 2;

    var yaw = 0, pitch = 0, roll = 0;
    var targetYaw = 0, targetPitch = 0;
    var pointer = { x: 0, y: 0, inside: true };

    function onPointerMove(e) {
      var ww = Math.max(1, window.innerWidth);
      var wh = Math.max(1, window.innerHeight);
      pointer.x = Math.max(-1, Math.min(1, (e.clientX - ww * 0.5) / (ww * 0.5)));
      pointer.y = Math.max(-1, Math.min(1, (e.clientY - wh * 0.5) / (wh * 0.5)));
      pointer.inside = true;
      start();
    }

    if (animationType === 'hover') {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('mouseleave', function() { pointer.inside = false; });
      gl.uniform1i(u.useBaseWobble, 0);
    } else if (animationType === '3drotate') {
      gl.uniform1i(u.useBaseWobble, 0);
    } else {
      gl.uniform1i(u.useBaseWobble, 1);
    }

    function render(t) {
      var time = (t - t0) * 0.001;
      gl.uniform1f(u.time, time);

      var continueRAF = true;

      if (animationType === 'hover') {
        var maxYaw = 0.6 * hoverStrength;
        var maxPitch = 0.6 * hoverStrength;
        targetYaw = (pointer.inside ? -pointer.x : 0) * maxYaw;
        targetPitch = (pointer.inside ? pointer.y : 0) * maxPitch;
        yaw += (targetYaw - yaw) * inertia;
        pitch += (targetPitch - pitch) * inertia;
        roll += (0 - roll) * 0.1;
        setMat3FromEuler(yaw, pitch, roll, rotBuf);
        gl.uniformMatrix3fv(u.rot, false, rotBuf);
      } else if (animationType === '3drotate') {
        var tScaled = time * timeScale;
        yaw = tScaled * wY;
        pitch = Math.sin(tScaled * wX + phX) * 0.6;
        roll = Math.sin(tScaled * wZ + phZ) * 0.5;
        setMat3FromEuler(yaw, pitch, roll, rotBuf);
        gl.uniformMatrix3fv(u.rot, false, rotBuf);
      } else {
        rotBuf[0] = 1; rotBuf[1] = 0; rotBuf[2] = 0;
        rotBuf[3] = 0; rotBuf[4] = 1; rotBuf[5] = 0;
        rotBuf[6] = 0; rotBuf[7] = 0; rotBuf[8] = 1;
        gl.uniformMatrix3fv(u.rot, false, rotBuf);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!reduced) {
        raf = requestAnimationFrame(render);
      }
    }

    function start() {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(render);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
    }

    if (suspendWhenOffscreen && 'IntersectionObserver' in window) {
      new IntersectionObserver(function(entries) {
        if (entries.some(function(e) { return e.isIntersecting; })) start();
        else stop();
      }, { threshold: 0 }).observe(container);
    } else {
      start();
    }

    document.addEventListener('visibilitychange', function() {
      if (document.hidden) stop();
      else start();
    });
  }

  function initAll() {
    document.querySelectorAll('[data-prism], .prism-container').forEach(init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();

  window.PrismComponent = { init: init, initAll: initAll };
})();
