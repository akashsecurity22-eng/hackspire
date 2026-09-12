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
