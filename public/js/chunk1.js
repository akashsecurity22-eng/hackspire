/* FloatingLines — React Bits port to raw WebGL2, red theme (HackSpire).
   Three stacked wave layers (TOP/MIDDLE/BOTTOM) of sine-displaced lines,
   parallax + mouse interactive drift. Behind the auth form only. */
(function () {
  'use strict';

  const SEL = '[data-fl]';

  function parseOpts(el) {
    const raw = (el.getAttribute('data-fl-options') || '{}');
    let o;
    try { o = JSON.parse(raw); } catch (e) { o = {}; }
    const defs = {
      enabledWaves: ['top','middle','bottom'],
      lineCount: [10, 15, 20],
      lineDistance: [8, 6, 4],
      bendRadius: 5.0,
      bendStrength: -0.5,
      interactive: true,
      parallax: true,
      speed: 0.35,
      dpr: 1
    };
    return {
      waves: Array.isArray(o.enabledWaves) && o.enabledWaves.length ? o.enabledWaves : defs.enabledWaves,
      lineCount: Array.isArray(o.lineCount) && o.lineCount.length ? o.lineCount : defs.lineCount,
      lineDistance: Array.isArray(o.lineDistance) && o.lineDistance.length ? o.lineDistance : defs.lineDistance,
      bendRadius: typeof o.bendRadius === 'number' ? o.bendRadius : defs.bendRadius,
      bendStrength: typeof o.bendStrength === 'number' ? o.bendStrength : defs.bendStrength,
      interactive: !!o.interactive,
      parallax: !!o.parallax,
      speed: typeof o.speed === 'number' ? o.speed : defs.speed,
      dpr: typeof o.dpr === 'number' ? Math.min(2, Math.max(0.5, o.dpr)) : defs.dpr
    };
  }

  function bump(x) {
    return Math.max(0, 1 - x * x);
  }

  const vertex = `#version 300 es
in vec2 position;
out vec2 vUV;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUV = position * 0.5 + 0.5;
}`;

  const fragment = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform int uLayerWins;
uniform float uBendRadius;
uniform float uBendStrength;
uniform bool uParallax;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform vec2 uCanvas;
out vec4 fragColor;

#define TOP 0
#define MIDDLE 1
#define BOTTOM 2

vec3 redGlow(float a){
  vec3 c = vec3(1.0, 0.4, 0.38);
  return c * a;
}

void main() {
  vec2 res = max(uResolution, vec2(1.0));
  vec2 uv = (2.0 * gl_FragCoord.xy - res) / res.y;
  float aspect = res.x / res.y;
  vec2 mouse = (2.0 * uMouse - 1.0) * vec2(aspect, 1.0);
  vec3 col = vec3(0.0);
  float t = uTime * uSpeed;

  float lineCounts[3] = float[3](10.0, 15.0, 20.0);
  float lineDist[3]  = float[3](8.0, 6.0, 4.0);

  float topGain   = (uLayerWins & 1) != 0 ? 1.0 : 0.0;
  float midGain   = (uLayerWins & 2) != 0 ? 1.0 : 0.0;
  float botGain   = (uLayerWins & 4) != 0 ? 1.0 : 0.0;

  vec2 parallaxOffset = vec2(0.0);
  if (uParallax) parallaxOffset = mix(vec2(0.0), mouse*0.06, 0.8);

  for (int i=0; i<3; i++) {
    float gain;
    if (i==0) gain=topGain; else if (i==1) gain=midGain; else gain=botGain;
    if (gain < 0.5) continue;
    float freq = lineCounts[i] * 0.9;
    float dist = lineDist[i] * 0.16;
    float amp  = dist * 0.6;
    float phase = t * (1.0 + float(i)*0.9) + float(i)*1.7;
    float bend = 0.0;
    if (abs(uBendRadius) > 0.001) {
      float r = uBendRadius * 0.5;
      float bx = (uv.x - (mouse.x*0.5 + 0.5)) / r;
      bend = uBendStrength * bump(bx) * 0.8;
      bend *= sin(uv.y * 2.0 + t*0.5) * 0.6 + 0.4;
    }
    for (int k=0; k<1; k++) {
      vec2 p = uv;
      p.y += sin(p.x*freq + phase + float(i)*2.0) * amp;
      p.y += bend;
      if (uParallax) p.y += parallaxOffset.y * float(2-i);
      if (uParallax) p.x += parallaxOffset.x * float(2-i) * 0.4;
      float lineW = 1.0 - abs(fract(p.y * lineCounts[i] + phase*0.3) - 0.5)*2.0;
      lineW = smoothstep(0.85, 0.95, lineW);
      vec3 g = mix(vec3(0.2,0.0,0.0), vec3(255.0,102.0,102.0)/255.0, 0.55) * lineW;
      col += g;
    }
  }

  vec2 vig = abs(uv);
  float v = 1.0 - smoothstep(vec2(0.0), vec2(1.2), vig);
  col += vec3(0.07, 0.0, 0.0) * v;

  vec2 d = uv - mouse;
  float md = length(d);
  float bloom = exp(-md*4.0) * uMouseStrength * 0.6;
  col += vec3(1.0,0.35,0.3) * bloom;

  float rnd = fract(sin(gl_FragCoord.x*12.9898 + gl_FragCoord.y*78.233 + uTime*0.1)*43758.5453);
  col += (rnd - 0.5) * 0.03;

  col = clamp(col, 0.0, 1.0);
  fragColor = vec4(col, 1.0);
}`;
