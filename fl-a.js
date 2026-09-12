'use strict';
module.exports.A = String.raw`
(function () {
  'use strict';
  const DOMContentLoadedReady = 'DOMContentLoaded';
  document.removeEventListener(DOMContentLoadedReady, window._flReady);
  window._flReady = function () {
    const EASING = 0.15;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const LINE_COLOR = [0.3961, 0.0, 0.0];
    const GLOW_COLOR = [1.0, 0.102, 0.102];
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
    function lerp(a, b, t) { return a + (b - a) * t; }
