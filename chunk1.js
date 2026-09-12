'use strict';
const fs = require('fs');
/* FloatingLines WebGL2 — HackSpire red theme */
/* Ported from React Bits FloatingLines component */
(function () {
  'use strict';
  const EASING = 0.15;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  // Red theme: line #650000, glow #FF1A1A (NO blue/cyan/purple)
  const LINE_COLOR = [0.3961, 0.0, 0.0];
  const GLOW_COLOR = [1.0, 0.102, 0.102];
  // Options from data-floatinglines-options
  const GF = {
    bendRadius: 5, bendStrength: -0.5, parallax: true, speed: 0.35,
    layerAlpha: 1, lineCount: [10, 15, 20], lineDistance: [8, 6, 4],
    lineColor: '#650000'
  };
  const containers = Array.from(document.querySelectorAll('[data-floatinglines]'));
  if (!containers.length) return;
  const px = new Float32Array(containers.length);
  const py = new Float32Array(containers.length);
  for (let i = 0; i < containers.length; i++) { px[i] = 0.5; py[i] = 0.5; }
  function lerp(a,b,t){return a+(b-a)*t;}
  containers.forEach(function (c, i) {
    if (c._cvs) return;
    const cvs = c._cvs = document.createElement('canvas');
    cvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;color-rendering:high-quality';

    function resize() {
      const r = c.getBoundingClientRect();
      const W = Math.max(1, Math.floor(r.width));
      const H = Math.max(1, Math.floor(r.height));
      cvs.width = W * DPR; cvs.height = H * DPR;
      cvs.style.width = W + 'px'; cvs.style.height = H + 'px';
      c._W = W; c._H = H; c._DPR = DPR;
      if (c._cvs.parentNode !== c) c.appendChild(cvs);
    }
    window.addEventListener('resize', resize, { passive: true });
    resize();
    c._resize = resize;
    c._i = i;

    // pointer tracking on this container
    c.addEventListener('mousemove', function (e) {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / Math.max(r.width, 1);
      const y = (e.clientY - r.top) / Math.max(r.height, 1);
      px[i] += (x - px[i]) * EASING;
      py[i] += (y - py[i]) * EASING;
    });
    c.addEventListener('mouseleave', function () {
      const drift = function () {
        if (Math.abs(px[i]-0.5) < 0.0008 && Math.abs(py[i]-0.5) < 0.0008) return;
        px[i] = lerp(px[i], 0.5, EASING);
        py[i] = lerp(py[i], 0.5, EASING);
        requestAnimationFrame(drift);
      };
      drift();
    });

    // WebGL2 init (once per container)
    if (!c._gl) {
      const gl = c.getContext('webgl2', {
        alpha: false, antialias: false, premultipliedAlpha: false,
        powerPreference: 'high-performance', stencil: false, depth: false
      });
      if (!gl) return;
      const vsSrc = '#version 300 es\nin vec2 vp;\nvoid main(){gl_Position = vec4(vp, 0.0, 1.0);}';
      const vsReq = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vsReq, vsSrc); gl.compileShader(vsReq);
      c._vsOk = gl.getShaderParameter(vsReq, gl.COMPILE_STATUS);
      if (!c._vsOk) console.warn('FL vertex warn', gl.getShaderInfoLog(vsReq));
      c._gl = gl; c._vsReq = vsReq;
    }
  });
