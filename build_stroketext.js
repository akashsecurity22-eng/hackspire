const fs = require('node:fs');
const out = 'public/js/stroketext.js';

const code = `'use strict';
/**
 * HackSpire StrokeText Component Engine (Red Theme)
 * Matches React Bits <StrokeText /> specification:
 * - text: string
 * - strokeColor: hex / color string (e.g. '#FF3030')
 * - fillColor: hex / color string (e.g. '#F8FAFC')
 * - strokeWidth: number (e.g. 1.4)
 * - drawDuration: number in seconds (e.g. 1.6)
 * - fillDelay: number in seconds (e.g. 0.2)
 * - stagger: number in seconds (e.g. 0.05)
 * - ease: string (e.g. 'power2.out')
 * - trigger: 'mount' | 'inView' | 'hover'
 * - fillMode: 'wipe' | 'fade' | 'none'
 * - fontSize: number in px (e.g. 128)
 * - fontWeight: number (e.g. 800)
 * - letterSpacing: number in px (e.g. -4)
 */
(function(){
  function mapEase(e){
    if(!e)return 'cubic-bezier(0.25, 1, 0.5, 1)';
    e=String(e).toLowerCase();
    if(e==='power2.out'||e==='quad.out')return 'cubic-bezier(0.25, 1, 0.5, 1)';
    if(e==='power1.out')return 'cubic-bezier(0.25, 1, 0.5, 1)';
    if(e==='power3.out'||e==='cubic.out')return 'cubic-bezier(0.215, 0.61, 0.355, 1)';
    if(e==='power4.out'||e==='quart.out')return 'cubic-bezier(0.165, 0.84, 0.44, 1)';
    if(e==='expo.out')return 'cubic-bezier(0.19, 1, 0.22, 1)';
    if(e==='circ.out')return 'cubic-bezier(0.075, 0.82, 0.165, 1)';
    if(e==='linear')return 'linear';
    return e;
  }

  function parseHex(h){
    if(!h||typeof h!=='string')return [255, 48, 48];
    h=h.replace('#','').trim();
    if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var num=parseInt(h,16);
    if(isNaN(num))return [255, 48, 48];
    return [(num>>16)&255, (num>>8)&255, num&255];
  }

  var idCounter=0;

  function initBox(container){
    if(!container||container.dataset.stMounted)return;
    container.dataset.stMounted='1';

    var rawOpts=container.dataset.strokeOptions||'{}';
    var opts={};
    try{opts=JSON.parse(rawOpts);}catch(err){opts={};}

    var text=(opts.text!=null?opts.text:'HACKSPIRE').toString();
    if(!text)return;

    var strokeColor=opts.strokeColor||'#FF3030';
    var fillColor=opts.fillColor||'#F8FAFC';
    var strokeWidth=opts.strokeWidth!=null?+opts.strokeWidth:1.4;
    var drawDuration=opts.drawDuration!=null?+opts.drawDuration:1.6;
    var fillDelay=opts.fillDelay!=null?+opts.fillDelay:0.2;
    var stagger=opts.stagger!=null?+opts.stagger:0.05;
    var ease=opts.ease||'power2.out';
    var trigger=opts.trigger||'mount';
    var fillMode=opts.fillMode||'wipe';
    var fontSize=opts.fontSize!=null?+opts.fontSize:128;
    var fontWeight=opts.fontWeight!=null?+opts.fontWeight:800;
    var letterSpacing=opts.letterSpacing!=null?+opts.letterSpacing:-4;

    var easeCss=mapEase(ease);
    var rgb=parseHex(strokeColor);
    var glowRgba='rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+',0.45)';

    // Compute timings
    var charCount=text.length;
    var strokeFinish=(charCount-1)*stagger+drawDuration;
    var wipeDelay=Math.max(0, (charCount-1)*stagger*0.8 + (drawDuration*0.75) + fillDelay);
    var wipeDuration=Math.max(0.6, Math.min(1.2, drawDuration*0.55));

    // Dynamic width calculation based on font size and character count
    var avgCharWidth=fontSize*0.62;
    var estWidth=Math.max(300, Math.round(charCount*(avgCharWidth+letterSpacing)+120));
    var estHeight=Math.max(120, Math.round(fontSize*1.35));
    var halfW=Math.round(estWidth/2);
    var halfH=Math.round(estHeight/2);
    var vbX=-halfW;
    var vbY=-halfH;
    var vbW=estWidth;
    var vbH=estHeight;

    idCounter++;
    var clipId='hs-st-clip-'+idCounter;

    var wrap=container.querySelector('.stroke-text-wrap');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className='stroke-text-wrap';
      container.innerHTML='';
      container.appendChild(wrap);
    }

    wrap.style.setProperty('--st-stroke', strokeColor);
    wrap.style.setProperty('--st-fill', fillColor);
    wrap.style.setProperty('--st-sw', strokeWidth+'px');
    wrap.style.setProperty('--st-dur', drawDuration+'s');
    wrap.style.setProperty('--st-delay', fillDelay+'s');
    wrap.style.setProperty('--st-stagger', stagger+'s');
    wrap.style.setProperty('--st-wipe-delay', wipeDelay.toFixed(2)+'s');
    wrap.style.setProperty('--st-ease', easeCss);
    wrap.style.setProperty('--st-fs', fontSize+'px');
    wrap.style.setProperty('--st-fw', fontWeight);
    wrap.style.setProperty('--st-ls', letterSpacing+'px');
    wrap.style.setProperty('--st-glow', glowRgba);

    var tspans='';
    for(var i=0;i<text.length;i++){
      var c=text[i]===' '?'\\u00A0':text[i];
      var d=(i*stagger).toFixed(2);
      tspans+='<tspan class="st-char" style="--char-i:'+i+';animation-delay:'+d+'s">'+c+'</tspan>';
    }

    var wipeRectW=vbW+40;
    var wipeRectX=vbX-20;

    var fillTextHtml=text==='HACKSPIRE'
      ? '<tspan fill="'+fillColor+'">HACK</tspan><tspan fill="#FF1A1A">SPIRE</tspan>'
      : text;

    var svgHtml=[
      '<svg class="stroke-text-svg" viewBox="'+vbX+' '+vbY+' '+vbW+' '+vbH+'" preserveAspectRatio="xMidYMid meet" aria-hidden="true">',
      '  <defs>',
      '    <clipPath id="'+clipId+'">',
      '      <rect class="st-wipe-rect" x="'+wipeRectX+'" y="'+vbY+'" width="0" height="'+vbH+'" style="animation-delay:'+wipeDelay.toFixed(2)+'s;animation-duration:'+wipeDuration.toFixed(2)+'s" />',
      '    </clipPath>',
      '  </defs>',
      '  <text class="st-text-base st-text-halo" x="0" y="8" style="font-size:'+fontSize+'px;font-weight:'+fontWeight+';letter-spacing:'+letterSpacing+'px">'+text+'</text>',
      '  <text class="st-text-base st-text-stroke" x="0" y="8" style="font-size:'+fontSize+'px;font-weight:'+fontWeight+';letter-spacing:'+letterSpacing+'px">'+tspans+'</text>',
      (fillMode==='wipe'
        ? '  <text class="st-text-base st-text-fill" x="0" y="8" clip-path="url(#'+clipId+')" style="font-size:'+fontSize+'px;font-weight:'+fontWeight+';letter-spacing:'+letterSpacing+'px">'+fillTextHtml+'</text>'
        : '  <text class="st-text-base st-text-fill" x="0" y="8" style="font-size:'+fontSize+'px;font-weight:'+fontWeight+';letter-spacing:'+letterSpacing+'px">'+fillTextHtml+'</text>'
      ),
      '</svg>'
    ].join('\\n');

    wrap.innerHTML=svgHtml;

    function startAnimation(){
      wrap.classList.add('st-animated');
    }

    if(trigger==='inView'&&'IntersectionObserver' in window){
      var io=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            startAnimation();
            io.disconnect();
          }
        });
      },{threshold:0.15});
      io.observe(container);
    } else {
      startAnimation();
    }

    wrap.addEventListener('pointerenter', function(){
      wrap.style.filter='brightness(1.15)';
    });
    wrap.addEventListener('pointerleave', function(){
      wrap.style.filter='';
    });
  }

  function initAll(){
    document.querySelectorAll('[data-stroke-text],[data-stroke]').forEach(initBox);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  window.StrokeText={
    init: initBox,
    initAll: initAll
  };
})();
`;

fs.writeFileSync(out, code, { encoding: 'utf8' });
console.log('Wrote ' + out + ' (' + code.split('\n').length + ' lines, ' + Buffer.byteLength(code) + ' bytes)');
