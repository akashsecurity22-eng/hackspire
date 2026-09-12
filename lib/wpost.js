'use strict';
const fs=require('node:fs'),path=require('node:path');
const DB=require('./db'),H=require('./http'),L=require('./layout'),S=require('./security'),WADM=require('./wadm'),WA=require('./w2'),AV=require('./authview'),cfg=require('./config');
const rate=new Map();
function hit(k,lim,win){const n=Date.now();const a=(rate.get(k)||[]).filter(t=>t>n-win);a.push(n);rate.set(k,a);return a.length>lim;}
async function post(req,res,active,u,c){
  const ctype=req.headers['content-type']||'';
  const buf=await H.readBody(req,30*1024*1024);
  if(ctype.indexOf('multipart/form-data')>=0){
    if(u!=='/admin/upload')return H.html(res,400,L.errPage(400,'BAD REQUEST','Unsupported form.'));
    if(!active||active.role!=='ADMIN')return H.html(res,403,L.errPage(403,'ACCESS DENIED','Admins only.'));
    const mp=WADM.parseMP(buf,ctype);
    if(!mp||!S.checkCsrf(mp.fields.csrf))return H.html(res,403,L.errPage(403,'ACCESS DENIED','Invalid form token. Go back and retry.'));
    try{const id=await WADM.saveUpload(active,mp.fields,mp.file);return H.redirect(res,'/admin/dashboard?tab=resources&manage='+id);}
    catch(e){return H.html(res,400,L.errPage(400,'UPLOAD FAILED',String((e&&e.message)||e)));}
  }
  const b={};const sp=new URLSearchParams(buf.toString());sp.forEach((v,k)=>{b[k]=v;});
  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
  if(u==='/login'){if(hit('li:'+clientIp,20,600000))return H.html(res,429,L.errPage(429,'TOO MANY REQUESTS','Slow down.'));return await WA.postLogin(req,res,b);}
  if(u==='/register'){if(hit('rg:'+clientIp,10,3600000))return H.html(res,429,L.errPage(429,'TOO MANY REQUESTS','Slow down.'));return await WA.postReg(req,res,b);}
  if(u==='/forgot-password'){await DB.audit(null,'reset_request',String(b.email||''));return H.html(res,200,L.page('Reset',active,'',AV.authShell('REQUEST LOGGED','<div class="card" style="max-width:520px;margin:0 auto"><h3>ADMIN WILL RESPOND</h3><p>If the email exists, the Admin will issue a reset.</p></div>','')));}
  if(!active)return H.html(res,401,L.errPage(401,'AUTHENTICATION REQUIRED','Please login.'));
  if(!S.checkCsrf(b.csrf))return H.html(res,403,L.errPage(403,'ACCESS DENIED','Invalid form token. Go back and retry.'));
  if(u==='/admin/members'&&active.role==='ADMIN'){await WADM.memberAction(active,b);return H.redirect(res,'/admin/dashboard?tab=members');}
  if(u==='/admin/roles'&&active.role==='ADMIN'){await WADM.setRole(active,b);return H.redirect(res,'/admin/dashboard?tab=members');}
  if(u==='/admin/grants'&&active.role==='ADMIN'){
    const rid=Number(b.id);
    const userIds=[];
    for(const k of Object.keys(b)){
      if(k.charAt(0)==='u'){
        const uid=Number(k.slice(1));
        if(uid>0)userIds.push(uid);
      }
    }
    await DB.saveGrants(rid,userIds,active.id);
    return H.redirect(res,'/admin/dashboard?tab=resources&manage='+rid);
  }
  if(u==='/admin/announce'&&active.role==='ADMIN'){
    await DB.createAnnouncement(String(b.title||'').slice(0,120),String(b.body||'').slice(0,2000),active.id);
    return H.redirect(res,'/admin/dashboard?tab=announcements');
  }
  if(u==='/admin/resources/delete'&&active.role==='ADMIN'){
    await DB.deleteResource(Number(b.id));
    return H.redirect(res,'/admin/dashboard?tab=resources');
  }
  return H.html(res,404,L.errPage(404,'RESOURCE NOT FOUND','Unknown action.'));
}
module.exports={post};
