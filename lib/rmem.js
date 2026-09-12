'use strict';
const DB=require('./db'),H=require('./http'),L=require('./layout'),S=require('./security'),M=require('./member'),cfg=require('./config');
async function vis(uid,rid){
  const r = await DB.getResource(rid);
  if(!r)return false;
  if(r.visibility==='ALL')return true;
  return await DB.hasGrant(rid,uid);
}
async function get(req,res,user,u){
  if(u==='/dashboard'){
    const n = await DB.countUserGrants(user.id);
    const an = await DB.getAnnouncements(5);
    const count = await DB.activeCount();
    return H.html(res,200,L.page('Dashboard — HackSpire',user,'',M.dash(user,count,cfg.MAX_MEMBERS,an,n)));
  }
  if(u==='/resources'){
    const rows = await DB.getResourcesForUser(user.id);
    return H.html(res,200,L.page('Resources — HackSpire',user,'',`<section class="wrap"><p class="kicker">MEMBER RESOURCES</p><h1 class="h2">RESOURCE HUB</h1><div class="cards c3">${M.resList(rows)}</div></section>`));
  }
  if(u==='/labs')return H.html(res,200,L.page('Labs — HackSpire',user,'',M.labsPage()));
  if(u==='/ctf')return H.html(res,200,L.page('CTF — HackSpire',user,'',M.ctfPage()));
  if(u==='/profile')return H.html(res,200,L.page('Profile — HackSpire',user,'',`<section class="wrap" style="max-width:640px"><p class="kicker">ACCOUNT</p><h1 class="h2">PROFILE</h1><div class="card"><table><tr><th>NAME</th><td>${H.esc(user.name)}</td></tr><tr><th>EMAIL</th><td class="mono">${H.esc(user.email)}</td></tr><tr><th>ROLE</th><td>${H.esc(user.display_role)}</td></tr><tr><th>STATUS</th><td>${H.esc(user.status)}</td></tr></table><p class="mono dim" style="font-size:12px">Hack responsibly. Test only systems you are authorized to test.</p></div></section>`));
  return null;
}
module.exports={get,vis};
