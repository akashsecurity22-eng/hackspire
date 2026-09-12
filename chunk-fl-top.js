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
