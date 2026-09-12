  if (c._vsOk && c._fsOk) {
    const gl = c._gl;
    const prog = gl.createProgram();
    gl.attachShader(prog, c._vsReq);
    gl.attachShader(prog, c._fsReq);
    gl.linkProgram(prog);
    c._progOk = gl.getProgramParameter(prog, gl.LINK_STATUS);
    if (!c._progOk) console.warn('FL link warn', gl.getProgramInfoLog(prog));
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'vp');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    c._uRes = gl.getUniformLocation(prog, 'uRes');
    c._uTime = gl.getUniformLocation(prog, 'uTime');
    c._uPointer = gl.getUniformLocation(prog, 'uPointer');
    c._uBendRadius = gl.getUniformLocation(prog, 'uBendRadius');
    c._uBendStrength = gl.getUniformLocation(prog, 'uBendStrength');
    c._uSpeed = gl.getUniformLocation(prog, 'uSpeed');
    c._uLine = gl.getUniformLocation(prog, 'uLine');
    c._uGlow = gl.getUniformLocation(prog, 'uGlow');
    c._prog = prog;
    c._buf = buf;
  }

  // Static fallback draw (so non-animated containers still paint)
  function draw(t) {
    const gl = c._gl;
    if (!gl || !c._prog) return;
    gl.useProgram(c._prog);
    gl.uniform2f(c._uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(c._uTime, t || 0);
    gl.uniform2f(c._uPointer, px[i], py[i]);
    gl.uniform1f(c._uBendRadius, GF.bendRadius);
    gl.uniform1f(c._uBendStrength, GF.bendStrength);
    gl.uniform1f(c._uSpeed, GF.speed);
    gl.uniform3f(c._uLine, LINE_COLOR[0], LINE_COLOR[1], LINE_COLOR[2]);
    gl.uniform3f(c._uGlow, GLOW_COLOR[0], GLOW_COLOR[1], GLOW_COLOR[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Animation loop
  let raf = 0;
  let t0 = performance.now();
  let last = 0;
  function loop(now) {
    if (!c._gl) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = (now - t0) / 1000;
    draw(t);
    raf = requestAnimationFrame(loop);
  }
  draw(0);
  raf = requestAnimationFrame(loop);

  // Pause on hidden tab
  const onVis = () => {
    if ('hidden' in document && document.hidden) {
      if (raf) cancelAnimationFrame(raf);
    } else if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  };
  document.addEventListener('visibilitychange', onVis);

  // Cleanup stored on the container for safety
  c._cleanup = () => {
    if (raf) cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVis);
  };
})();

// Ensure every container paints once immediately (even if GL lazy)
document.querySelectorAll('[data-floatinglines]').forEach(function (c) {
  if (c._cleanup) return;                 // already initialized
  // trigger first paint
  setTimeout(function () {
    if (c._gl && c._prog) {
      c._gl.useProgram(c._prog);
    }
  }, 0);
});
