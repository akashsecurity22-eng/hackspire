'use strict';
const DB=require('./db'),L=require('./layout'),P1=require('./pub1'),P2=require('./pub2'),P3=require('./pub3'),P4=require('./pub4'),H=require('./http'),cfg=require('./config');
async function pubGet(req,res,user,u){
  if(u==='/'){const c=await DB.activeCount();const b=P1.hero(c+' / '+cfg.MAX_MEMBERS)+P1.aboutCards()+P1.mindset()+P2.teamsPage().replace('<section','<section id="teams"')+P2.eventsPage()+P1.cta();return H.html(res,200,L.page(null,user,'/',b));}
  if(u==='/about')return H.html(res,200,L.page('About — HackSpire',user,'/about',P1.aboutCards().replace('<h2','<h1').replace('</h2','</h1')+P1.mindset()+P1.cta()));
  if(u==='/learning')return H.html(res,200,L.page('Learning — HackSpire',user,'/learning',P2.learningPage()));
  if(u==='/team')return H.html(res,200,L.page('Team — HackSpire',user,'/team',P3.teamPage()));
  if(u==='/team/aslam-javeed')return H.html(res,200,L.page('Aslam Javeed — HackSpire',user,'/team',P4.aslamPage()));
  if(u==='/founder/akash')return H.html(res,200,L.page('Akash — Founder & Admin — HackSpire',user,'/founder/akash',P4.founderPage()));
  if(u==='/events')return H.html(res,200,L.page('Events — HackSpire',user,'/events',P2.eventsPage()));
  if(u==='/community'){const c=await DB.activeCount();return H.html(res,200,L.page('Community — HackSpire',user,'/community',P3.communityPage(c,cfg.MAX_MEMBERS)));}
  return null;
}
module.exports={pubGet};
