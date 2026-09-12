'use strict';
const HS_CHARS='HACKSPIRE';
function strokeText(customOpts){
  const opts=Object.assign({
    text: 'HACKSPIRE',
    strokeColor: '#FF3030',
    fillColor: '#F8FAFC',
    strokeWidth: 1.4,
    drawDuration: 1.6,
    fillDelay: 0.2,
    stagger: 0.05,
    ease: 'power2.out',
    trigger: 'mount',
    fillMode: 'wipe',
    fontSize: 128,
    fontWeight: 800,
    letterSpacing: -4
  }, customOpts||{});

  const txt=opts.text;
  const jsonStr=JSON.stringify(opts).replace(/"/g, '&quot;');

  const st=[];
  for(let i=0;i<txt.length;i++){
    const c=txt[i]===' '?'&nbsp;':txt[i];
    const d=(i*opts.stagger).toFixed(2);
    st.push(`<tspan class="st-char" style="--char-i:${i};animation-delay:${d}s">${c}</tspan>`);
  }

  const wipeDelay=Math.max(0, (txt.length-1)*opts.stagger*0.8 + (opts.drawDuration*0.75) + opts.fillDelay).toFixed(2);
  const fillContent=txt==='HACKSPIRE'?'<tspan fill="#F8FAFC">HACK</tspan><tspan fill="#FF1A1A">SPIRE</tspan>':txt;

  return `<h1 class="stroke-h1" aria-label="${txt}"><div class="stroke-text-root" data-stroke-text data-stroke-options="${jsonStr}"><div class="stroke-text-wrap" style="--st-stroke:${opts.strokeColor};--st-fill:${opts.fillColor};--st-sw:${opts.strokeWidth}px;--st-dur:${opts.drawDuration}s;--st-delay:${opts.fillDelay}s;--st-stagger:${opts.stagger}s;--st-wipe-delay:${wipeDelay}s;--st-fs:${opts.fontSize}px;--st-fw:${opts.fontWeight};--st-ls:${opts.letterSpacing}px"><svg class="stroke-text-svg" viewBox="-420 -70 840 140" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><clipPath id="hs-hero-wipe"><rect class="st-wipe-rect" x="-440" y="-70" width="0" height="140" style="animation-delay:${wipeDelay}s;animation-duration:0.85s" /></clipPath></defs><text class="st-text-base st-text-halo" x="0" y="8">${txt}</text><text class="st-text-base st-text-stroke" x="0" y="8">${st.join('')}</text><text class="st-text-base st-text-fill" x="0" y="8" clip-path="url(#hs-hero-wipe)">${fillContent}</text></svg></div></div></h1>`;
}
function hero(countLabel){return `<section class="hero wrap"><span class="badge">CYBERSECURITY COMMUNITY</span>${strokeText()}<div class="lines">LEARN. BUILD. HACK. GROW.</div><p class="lead">Don&apos;t learn cybersecurity alone.</p><p class="dim" style="max-width:680px;margin:0 auto">A cybersecurity community where hackers, builders, researchers and learners grow together.</p><p class="dim" style="max-width:680px;margin:12px auto 0">Build your skills. Find your team. Solve real challenges. Create projects. Share knowledge. Grow with HackSpire.</p><div class="cta-row"><a class="btn btn-primary" href="/register">JOIN HACKSPIRE</a><a class="btn btn-ghost" href="/community">EXPLORE COMMUNITY</a><a class="btn btn-ghost" href="/team">MEET THE TEAM &rarr;</a></div><div class="hero-grid"><div class="term" role="region" aria-label="HackSpire terminal"><div class="term-bar"><i></i><i></i><i></i><span class="mono dim" style="margin-left:8px;font-size:11px">hackspire — secure shell</span></div><div class="term-body" id="termLines"><div><span style="color:#FF6666">$</span> ./hackspire</div><div>[+] Initializing community...</div><div>[+] Connecting hackers...</div><div>[+] Building teams...</div><div>[+] Starting challenges...</div><div>[+] Knowledge sharing enabled</div><div>&nbsp;</div><div>STATUS: <b style="color:#fff">ONLINE</b></div><div>ACCESS: <b style="color:#fff">AUTHORIZED</b></div><div>SECURITY: <b style="color:#fff">ACTIVE</b></div><div>&nbsp;</div><div>Welcome to HackSpire. <span class="cursor" aria-hidden="true"></span></div></div></div><div><div class="stat-row"><div class="stat"><b><i class="dot"></i>SYSTEM ONLINE</b>Community connected</div><div class="stat"><b><i class="dot"></i>KNOWLEDGE SHARED</b>Learn together</div><div class="stat"><b><i class="dot"></i>TEAM READY</b>Mission active</div><div class="stat"><b><i class="dot"></i>BUILD MODE: ON</b>Security first</div></div><p class="mono dim" style="margin-top:14px;font-size:12px">COMMUNITY CONNECTED &middot; TEAM READY &middot; MISSION ACTIVE &middot; AUTHORIZED ACCESS ONLY<br>MEMBERSHIP ${countLabel} &middot; SECURITY FIRST</p></div></div></section>`;}
function aboutCards(){const c=[['LEARN','Build strong cybersecurity fundamentals through practical learning.','\u{1F4D6}'],['BUILD','Create security tools, projects and experiments instead of only consuming tutorials.','\u2692'],['HACK','Participate in CTFs, labs and authorized security challenges.','\u{1F6E1}'],['GROW','Share knowledge, collaborate and continuously improve.','\u{1F331}']];return `<section class="wrap" id="about"><p class="kicker">ABOUT HACKSPIRE</p><h2 class="h2">WE DON&apos;T JUST LEARN CYBERSECURITY.<br><span style="color:#FF3030">WE BUILD IT TOGETHER.</span></h2><p style="max-width:760px" class="dim">HackSpire is a cybersecurity community created for people who want to learn by doing. We bring together students, hackers, developers, researchers and security enthusiasts to learn, collaborate, build, solve challenges and grow as a team.</p><div class="cards">${c.map(x=>`<div class="card reveal"><div class="ico" aria-hidden="true">${x[2]}</div><h3>${x[0]}</h3><p>${x[1]}</p></div>`).join('')}</div></section>`;}


function mindset(){const c=[['NO EGO','Everyone starts somewhere.'],['LEARN BEFORE YOU FLEX','Understanding matters more than showing off.'],['BUILD, DON\u2019T JUST CONSUME','Turn knowledge into something real.'],['TEAM > INDIVIDUAL','Strong teams solve bigger problems.'],['SHARE KNOWLEDGE','Helping others makes the whole community stronger.'],['HACK RESPONSIBLY','Only test systems you are authorized to test.']];return `<section class="wrap"><p class="kicker">MINDSET</p><h2 class="h2">THE HACKSPIRE MINDSET</h2><p class="dim">Cybersecurity is not a solo journey.</p><div class="cards c3">${c.map(x=>`<div class="card reveal"><h3>${x[0]}</h3><p>${x[1]}</p></div>`).join('')}</div></section>`;}
function cta(){return `<section class="wrap" style="text-align:center"><p class="kicker">JOIN US</p><h2 class="h2">READY TO ENTER THE SPIRE?</h2><p class="dim">Stop learning alone.<br>Find your people. Build your skills. Take on challenges. Build something real.</p><div class="cta-row"><a class="btn btn-primary" href="/register">JOIN HACKSPIRE</a><a class="btn btn-ghost" href="/community">EXPLORE THE COMMUNITY</a></div><p class="mono dim" style="margin-top:18px;font-size:12px">Hack responsibly. Test only systems you are authorized to test.</p></section>`;}
module.exports={hero,aboutCards,mindset,cta};
