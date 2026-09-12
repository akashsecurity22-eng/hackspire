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
