'use strict';
const fs = require('fs');

const shader = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_bendRadius;
uniform float u_bendStrength;
uniform bool u_parallax;
uniform float u_speed;
uniform float u_layerAlpha;
uniform vec4 u_lineCount;
uniform vec4 u_lineDist;
uniform vec4 u_lineLen;
uniform vec3 u_lineColor;
out vec4 fragColor;

#define PI 3.141592653589793
#define MAX_LAYERS 3

mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float smoothNoise(vec2 p){
  vec2 i=floor(p);vec2 f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  float a=hash(i);float b=hash(i+vec2(1,0));
  float c=hash(i+vec2(0,1));float d=hash(i+vec2(1,1));
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p, int oct){
  float v=0.0,a=0.5,f=1.0;int n=oct;
  for(int i=0;i<8;i++){
    if(i>=n)break;
    v+=a*smoothNoise(p*f);f*=2.0;a*=0.5;
  }
  return v;
}

float bend(vec2 p){
  float r=u_bendRadius;
  float d=length(p);
  float theta=atan(p.y,p.x);
  float bendA=sin(theta*d/r+u_time*0.3)*u_bendStrength*0.15;
  float warpY=p.y + bendA*r*sin(theta)*0.5;
  return warpY;
}

void main(){
  vec2 res=vec2(max(u_res.x,1.0),max(u_res.y,1.0));
  vec2 uv=(gl_FragCoord.xy)/res;
  vec2 p=(gl_FragCoord.xy*2.0-res)/res.y;
  float t=u_time*u_speed;

  vec2 mouseUV=u_mouse/res;
  float mx=clamp(mouseUV.x,0.0,1.0);
  float my=clamp(mouseUV.y,0.0,1.0);

  vec3 col=vec3(0.0);

  float waveCounts[3];
  waveCounts[0]=u_lineCount.x;
  waveCounts[1]=u_lineCount.y;
  waveCounts[2]=u_lineCount.z;

  float waveDist[3];
  waveDist[0]=u_lineDist.x;
  waveDist[1]=u_lineDist.y;
  waveDist[2]=u_lineDist.z;

  float yTop=0.0;
  float yMid=0.333;
  float yBot=0.666;

  for(int layer=0;layer<MAX_LAYERS;layer++){
    int li=int(layer);
    float yPos;
    if(layer==0){yPos=yTop;}
    else if(layer==1){yPos=yMid;}
    else{yPos=yBot;}

    float count=waveCounts[li];
    float dist=waveDist[li];

    float parallaxFactor;
    if(u_parallax){
      if(layer==0){parallaxFactor=0.3;}
      else if(layer==1){parallaxFactor=1.0;}
      else{parallaxFactor=2.2;}
    } else {parallaxFactor=1.0;}

    float layerSpeed=1.0+0.3*float(layer);
    float tt=t*parallaxFactor*layerSpeed;

    vec2 lp=p;
    float yOff=yPos*res.y*0.4;
    lp.y += yOff;

    lp.y += sin(lp.x*0.5+tt*0.7)*0.03*float(layer+1);
    lp.x += sin(lp.y*0.3+tt*0.5)*0.02;

    lp.xy=rot(tt*0.05*float(layer+1)*0.3)*lp.xy;

    float bendDisplacement=bend(lp)*0.5;
    lp.y+=bendDisplacement;

    float mouseInfluence=exp(-length(lp.xy-vec2(mx*2.0-1.0,my*2.0-1.0))*3.0);
    lp.x+=mouseInfluence*0.05*u_bendStrength;

    float noiseVal=fbm(lp*0.5+tt*0.2,3);
    lp.x+=noiseVal*0.02;
    lp.y+=noiseVal*0.015;

    float lineWave=sin(lp.x*count*PI*2.0/dist+tt*2.0);
    float lineProfile=abs(lineWave);
    float sharpness=12.0;
    float lineVal=exp(-lineProfile*sharpness);

    float coreBright=exp(-lineProfile*sharpness*2.0);
    vec3 lineCol=u_lineColor;
    float brightnessBoost=1.0+coreBright*2.0;
    float lineAlpha=step(0.8,1.0-lineProfile*0.5)*lineVal*0.9;
    col+=lineCol*brightnessBoost*lineAlpha*u_layerAlpha;

    float vignette=1.0-smoothstep(0.35,1.0,length(uv-0.5));
    col*=mix(0.55,1.0,vignette);
  }

  float grain=hash(gl_FragCoord.xy+floor(u_time*20.0))*0.05;
  col+=grain;
  col=clamp(col,0.0,1.0);
  fragColor=vec4(col,1.0);
}`;
