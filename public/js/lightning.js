'use strict';
/**
 * HackSpire — Lightning Component (React Bits WebGL)
 * Animated lightning bolt shader background.
 */
(function () {
  var VERT = `
    attribute vec2 aPosition;
    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  var FRAG = `
    precision mediump float;
    uniform vec2  iResolution;
    uniform float iTime;
    uniform float uHue;
    uniform float uXOffset;
    uniform float uSpeed;
    uniform float uIntensity;
    uniform float uSize;

    #define OCTAVE_COUNT 10

    vec3 hsv2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return c.z * mix(vec3(1.0), rgb, c.y);
    }

    float hash11(float p) {
      p = fract(p * .1031);
      p *= p + 33.33;
      p *= p + p;
      return fract(p);
    }

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * .1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    mat2 rotate2d(float theta) {
      float c = cos(theta);
      float s = sin(theta);
      return mat2(c, -s, s, c);
    }

    float noise(vec2 p) {
      vec2 ip = floor(p);
      vec2 fp = fract(p);
      float a  = hash12(ip);
      float b  = hash12(ip + vec2(1.0, 0.0));
      float c2 = hash12(ip + vec2(0.0, 1.0));
      float d  = hash12(ip + vec2(1.0, 1.0));
      vec2 t = smoothstep(0.0, 1.0, fp);
      return mix(mix(a, b, t.x), mix(c2, d, t.x), t.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < OCTAVE_COUNT; ++i) {
        value += amplitude * noise(p);
        p *= rotate2d(0.45);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 uv = fragCoord / iResolution.xy;
      uv = 2.0 * uv - 1.0;
      uv.x *= iResolution.x / iResolution.y;
      uv.x += uXOffset;
      uv += 2.0 * fbm(uv * uSize + 0.8 * iTime * uSpeed) - 1.0;
      float dist     = abs(uv.x);
      vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, 0.7, 0.8));
      vec3 col       = baseColor * pow(mix(0.0, 0.07, hash11(iTime * uSpeed)) / dist, 1.0) * uIntensity;
      float a        = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
      fragColor      = vec4(col, a);
    }

    void main() {
      mainImage(gl_FragColor, gl_FragCoord.xy);
    }
  `;

  function compileShader(gl, source, type) {
    var s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('Lightning shader error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function init(container) {
    if (!container || container.dataset.lightningInit) return;
    container.dataset.lightningInit = '1';

    var raw = container.dataset.lightningOptions || '{}';
    var opts;
    try { opts = JSON.parse(raw); } catch (e) { opts = {}; }

    var hue       = opts.hue       !== undefined ? opts.hue       : 0;
    var xOffset   = opts.xOffset   !== undefined ? opts.xOffset   : 0;
    var speed     = opts.speed     !== undefined ? opts.speed     : 1;
    var intensity = opts.intensity !== undefined ? opts.intensity : 1;
    var size      = opts.size      !== undefined ? opts.size      : 1;

    var canvas = document.createElement('canvas');
    canvas.className = 'lightning-canvas';
    container.appendChild(canvas);

    function resizeCanvas() {
      canvas.width  = container.clientWidth  || window.innerWidth;
      canvas.height = container.clientHeight || window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) { console.warn('Lightning: WebGL not supported'); return; }

    var vs = compileShader(gl, VERT, gl.VERTEX_SHADER);
    var fs = compileShader(gl, FRAG, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Lightning link error:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    var verts = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    var aPos = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(program, 'iResolution');
    var uTim = gl.getUniformLocation(program, 'iTime');
    var uHue = gl.getUniformLocation(program, 'uHue');
    var uXOf = gl.getUniformLocation(program, 'uXOffset');
    var uSpd = gl.getUniformLocation(program, 'uSpeed');
    var uInt = gl.getUniformLocation(program, 'uIntensity');
    var uSz  = gl.getUniformLocation(program, 'uSize');

    var rafId, running = false;
    var startTime = performance.now();

    function render() {
      resizeCanvas();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTim, (performance.now() - startTime) / 1000.0);
      gl.uniform1f(uHue, hue);
      gl.uniform1f(uXOf, xOffset);
      gl.uniform1f(uSpd, speed);
      gl.uniform1f(uInt, intensity);
      gl.uniform1f(uSz,  size);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafId = requestAnimationFrame(render);
    }

    function start() { if (!running) { running = true; render(); } }
    function stop()  { running = false; cancelAnimationFrame(rafId); }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) start();
        else stop();
      }, { threshold: 0 }).observe(container);
    } else {
      start();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
  }

  function initAll() {
    document.querySelectorAll('[data-lightning]').forEach(init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();

  window.LightningComponent = { init: init, initAll: initAll };
})();
