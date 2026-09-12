'use strict';
(function () {
  'use strict';
  const el = document.currentScript;
  const container = el ? el.parentElement : document.querySelector('[data-floatinglines]');
  if (!container) return;
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  const opts = JSON.parse(container.getAttribute('data-floatinglines-options') || '{}');
  const {
    bendRadius = 5, bendStrength = -0.5, parallax = true, speed = 0.35,
    layerAlpha = 1, lineCount = [10, 15, 20], lineDistance = [8, 6, 4],
    lineColor = '#FF1A1A'
  } = opts;

  const hex = lineColor.replace('#', '');
  const HR = parseInt(hex.substring(0, 2), 16);
  const HG = parseInt(hex.substring(2, 4), 16);
  const HB = parseInt(hex.substring(4, 6), 16);
  const RR = (HR / 255).toFixed(4);
  const GG = (HG / 255).toFixed(4);
  const BB = (HB / 255).toFixed(4);

  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'high-performance'
  });
  if (!gl) return;

  const vs = "#version 300 es\nin vec2 a_pos;\nvoid main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }\n";

  const fsHeader = `#version 300 es
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform float u_bendRadius;
    uniform float u_bendStrength;
    uniform bool u_parallax;
    uniform float u_speed;
    uniform float u_layerAlpha;
    uniform vec4 u_lineCount;   // wc, mc, bc
    uniform vec4 u_lineDist;    // wd, md, bd
    uniform vec4 u_lineLen;     // wlen, mlen, blen
    uniform vec3 u_lineColor;
    out vec4 fragColor;
    vec3 u_lineColor_vec = vec3(${RR}, ${GG}, ${BB});

    float smoothstep(float a, float b, float x) {
      float t = clamp((x - a) / (b - a), 0.0, 1.0);
      return t * t * (3.0 - 2.0 * t);
    }
  `;
    void main() {
      vec2 uv = gl_FragCoord.xy / u_res;
      float t = u_time * u_speed;

      vec2 mouse = u_mouse - 0.5;
      vec2 mOff = vec2(
        u_parallax ? mouse.x * 0.15 : 0.0,
        u_parallax ? mouse.y * 0.08 : 0.0
      );

      vec3 color = vec3(0.0);

      for (int L = 0; L < 3; L++) {
        float layerT = float(L + 1);
        float ly = layerT * 0.5;
        float n = u_lineCount[L];
        float step = u_lineDist[L];

        float depthOff = layerT * 0.04;
        vec2 layerOff = mOff * depthOff;

        vec3 uvl = uv * 3.0;
        uvl.y = fract(uvl.y - ly + 1.0 + layerOff.y);
        uvl.x += layerOff.x;

        float lineIdx = floor(uvl.y * n);
        float lineFrac = fract(uvl.y * n);

        float waveFreq = u_bendRadius * (1.0 + layerT * 0.2);
        float waveAmp = u_bendStrength * (1.0 - layerT * 0.15);
        float wave = sin((uv.x + layerOff.x) * waveFreq * 6.2831853 + t * (1.0 + layerT * 0.3) + lineIdx * 1.7) * waveAmp;
        float xOff = uv.x + wave;

        float halfW = 0.5 / (step * 1.5 + 0.5);
        float dLine = abs(lineFrac - 0.5);
        float lineBright = smoothstep(halfW * 1.5, halfW * 0.5, dLine);

        float phase = fract(lineIdx * 0.317 + 0.1);
        float ln = u_lineLen[L];
        float xWrap = fract(xOff + phase * ln);
        float gap = smoothstep(0.0, 0.15, xWrap) * smoothstep(1.0, 0.85, xWrap);
        lineBright *= gap;

        float edgeFade = 1.0 - abs(uv.x - 0.5) * 0.3;
        lineBright *= edgeFade;

        vec3 lc = u_lineColor_vec * (0.7 + 0.3 * (1.0 - layerT * 0.15));
        color += lc * lineBright * u_layerAlpha * (1.0 - layerT * 0.18);
      }

      float vignette = 1.0 - length(uv - 0.5) * 0.9;
      color += vec3(0.12, 0.02, 0.02) * (1.0 - vignette) * 0.5;

      fragColor = vec4(color, 1.0);
    }
`;
const fs = `#version 300 es\n${fsHeader}\n${fsBody}\n`;

  // compile
  const vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vs);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) { console.error('VS:', gl.getShaderInfoLog(vsh)); return; }

  const fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fs);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) { console.error('FS:', gl.getShaderInfoLog(fsh)); return; }

  const prg = gl.createProgram();
  gl.attachShader(prg, vsh);
  gl.attachShader(prg, fsh);
  gl.linkProgram(prg);
  if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) { console.error('Link:', gl.getProgramInfoLog(prg)); return; }
  gl.useProgram(prg);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prg, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prg, 'u_res');
  const uTime = gl.getUniformLocation(prg, 'u_time');
  const uMouse = gl.getUniformLocation(prg, 'u_mouse');
  const uBendRadiusL = gl.getUniformLocation(prg, 'u_bendRadius');
  const uBendStrengthL = gl.getUniformLocation(prg, 'u_bendStrength');
  const uParallaxL = gl.getUniformLocation(prg, 'u_parallax');
  const uSpeedL = gl.getUniformLocation(prg, 'u_speed');
  const uLayerAlphaL = gl.getUniformLocation(prg, 'u_layerAlpha');
  const uLineCountL = gl.getUniformLocation(prg, 'u_lineCount');
  const uLineDistL = gl.getUniformLocation(prg, 'u_lineDist');
  const uLineLenL = gl.getUniformLocation(prg, 'u_lineLen');

  function setUniforms() {
    gl.uniform1f(uBendRadiusL, bendRadius);
    gl.uniform1f(uBendStrengthL, bendStrength);
    gl.uniform1i(uParallaxL, parallax ? 1 : 0);
    gl.uniform1f(uSpeedL, speed);
    gl.uniform1f(uLayerAlphaL, layerAlpha);
    gl.uniform4f(uLineCountL, lineCount[0], lineCount[1], lineCount[2], 0);
    gl.uniform4f(uLineDistL, lineDistance[0], lineDistance[1], lineDistance[2], 0);
    gl.uniform4f(uLineLenL, 0.9, 0.85, 0.8);
  }

  let animId = 0, t0 = performance.now(), lastT = 0, paused = false;
  let isVisible = true, isPageVisible = !document.hidden;
  let curMouse = [0.5, 0.5];

  function setSize() {
    const w = Math.max(1, Math.floor(container.clientWidth));
    const h = Math.max(1, Math.floor(container.clientHeight));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }
  }

  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    curMouse = [ clamp((e.clientX - r.left) / r.width, 0, 1), clamp(1 - (e.clientY - r.top) / r.height, 0, 1) ];
  }
  function onEnter() { if (!paused && isVisible && isPageVisible) start(); }
  function onLeave() { curMouse = [0.5, 0.5]; }

  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseenter', onEnter);
  canvas.addEventListener('mouseleave', onLeave);
  window.addEventListener('resize', setSize);

  const visObs = new IntersectionObserver(([e]) => {
    isVisible = e.isIntersecting;
    if (isVisible && isPageVisible && !paused) start(); else stop();
  }, { threshold: 0 });
  visObs.observe(container);

  document.addEventListener('visibilitychange', () => {
    isPageVisible = !document.hidden;
    if (isVisible && isPageVisible && !paused) start(); else stop();
  });

  let rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
  function onReduce(e) {
    if (e.matches) { paused = true; stop(); renderStatic(); }
    else { paused = false; if (isVisible && isPageVisible) start(); }
  }
  if (rmq.addEventListener) rmq.addEventListener('change', onReduce); else rmq.addListener(onReduce);

  function start() {
    if (animId) return;
    t0 = performance.now(); lastT = t0;
    animId = requestAnimationFrame(loop);
  }
  function stop() { if (animId) { cancelAnimationFrame(animId); animId = 0; } }
  function loop(now) {
    if (paused || !isVisible || !isPageVisible) { stop(); return; }
    lastT = now;
    const elapsed = (now - t0) / 1000;
    gl.uniform1f(uTime, elapsed);
    gl.uniform2f(uMouse, curMouse[0] * 12, curMouse[1] * 12);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    animId = requestAnimationFrame(loop);
  }
  function renderStatic() {
    gl.uniform1f(uTime, 0);
    gl.uniform2f(uMouse, 0.5 * 12, 0.5 * 12);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  setSize();
  setUniforms();
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  if (!rmq.matches) start();
})();
