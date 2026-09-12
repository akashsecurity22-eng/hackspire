  // Fragment shader (the actual floating-lines rendering)
  const fsSrc = '#version 300 es\nprecision highp float;\n' +
    'uniform vec2 uRes;\n' +
    'uniform float uTime;\n' +
    'uniform vec2 uPointer;\n' +
    'uniform float uBendRadius;\n' +
    'uniform float uBendStrength;\n' +
    'uniform float uSpeed;\n' +
    'uniform vec3 uLine;\n' +
    'uniform vec3 uGlow;\n' +
    'out vec4 OUT;\n\n' +
    'float waves(vec2 p, float t) {\n' +
    '  return sin(p.x*0.7 + t*2.13)*0.35\n' +
    '       + sin(p.y*0.5 + t*1.87)*0.35\n' +
    '       + sin((p.x+p.y)*0.4 + t*1.41)*0.20;\n' +
    '}\n\n' +
    'void main() {\n' +
    '  vec2 uv = gl_FragCoord.xy / uRes;\n' +
    '  vec2 pos = (gl_FragCoord.xy - 0.5*uRes) / (0.5*uRes.y);\n' +
    '  float t = uTime * uSpeed;\n' +
    '  float mx = uv.x - uPointer.x;\n' +
    '  float my = uv.y - uPointer.y;\n' +
    '  float dist = length(vec2(mx, my));\n' +
    '  float wave = waves(pos*1.2 + t*1.1, t);\n' +
    '  // 3 layers: top/middle/bottom — counts from GF.lineCount\n' +
    '  float counts[3] = float[](10.0, 15.0, 20.0);\n' +
    '  float dists[3]  = float[](8.0,  6.0,  4.0);\n' +
    '  float acc = 0.0;\n' +
    '  float glowAcc = 0.0;\n' +
    '  for (int L = 0; L < 3; L++) {\n' +
    '    float cnt = counts[L];\n' +
    '    float step = dists[L];\n' +
    '    for (float i = 0.0; i < 20.0; i++) {\n' +
    '      if (i >= cnt) break;\n' +
    '      float fi = i + 1.0;\n' +
    '      float baseY = ((fi / max(cnt,1.0)) - 0.5) * 2.0;\n' +
    '      float bx = sin(pos.x * uBendRadius + t*0.9 + fi*0.6) * uBendStrength;\n' +
    '      float yy = baseY + bx + wave*0.12;\n' +
    '      float d = abs(pos.y - yy);\n' +
    '      float width = 0.012 + (1.0 - float(L))*0.006 + fi*0.0012;\n' +
    '      float line = 1.0 - smoothstep(0.0, width, d);\n' +
    '      float parallaxShift = my * fi * 0.04;\n' +
    '      yy += parallaxShift;\n' +
    '      d = abs(pos.y - yy);\n' +
    '      line *= (1.0 - smoothstep(0.0, width*1.5, d));\n' +
    '      float layerFade = 1.0 - exp(-dist*4.0);\n' +
    '      float glow = exp(-d*60.0) * 0.5;\n' +
    '      acc     += line * (0.5 + 0.5*layerFade);\n' +
    '      glowAcc += glow * (0.6 + 0.4*layerFade);\n' +
    '    }\n' +
    '  }\n' +
    '  vec3 col = mix(uLine, uGlow, min(glowAcc*1.2, 1.0));\n' +
    '  col *= acc;\n' +
    '  float vig = 1.0 - 0.4*length(uv-0.5)*1.4;\n' +
    '  col *= vig;\n' +
    '  OUT = vec4(col, 1.0);\n' +
    '}';
  const fsReq = c._gl.createShader(c._gl.FRAGMENT_SHADER);
  c._gl.shaderSource(fsReq, fsSrc);
  c._gl.compileShader(fsReq);
  c._fsOk = c._gl.getShaderParameter(fsReq, c._gl.COMPILE_STATUS);
  if (!c._fsOk) console.warn('FL frag warn', c._gl.getShaderInfoLog(fsReq));
  c._fsReq = fsReq;
