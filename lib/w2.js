'use strict';
const DB=require('./db'),H=require('./http'),L=require('./layout'),S=require('./security'),AV=require('./authview'),cfg=require('./config');
async function postLogin(req,res,b){
  if(!S.checkCsrf(b.csrf))return H.html(res,200,L.page('Login',null,'/login',AV.loginForm(S.issueCsrf('anon'),'Invalid session. Retry.')));
  const email=String(b.email||'').toLowerCase().trim();
  const u=await DB.getUserAuth(email);
  if(!u||!S.verifyPassword(b.password||'',u.password_hash))return H.html(res,200,L.page('Login',null,'/login',AV.loginForm(S.issueCsrf('anon'),'Invalid email or password.')));
  if(u.status!=='APPROVED')return H.html(res,200,L.page('Login',null,'/login',AV.loginForm(S.issueCsrf('anon'),'Account '+u.status+'. Contact Admin.')));
  const sid=S.createSession(u.id,u.role);
  await DB.audit(u.id,'login','ok');
  H.secHeaders(res);res.writeHead(302,{Location:'/dashboard','Set-Cookie':S.cookieHeader(sid)});res.end();
}
async function postReg(req,res,b){
  if(!S.checkCsrf(b.csrf))return H.html(res,200,L.page('Join',null,'/register',AV.regForm(S.issueCsrf('anon'),'Invalid session. Retry.',false)));
  const name=String(b.name||'').trim().slice(0,80);
  const email=String(b.email||'').toLowerCase().trim();
  const bad=name.length<2||!S.validEmail(email)||!S.validPass(b.password)||b.password!==b.confirm;
  if(bad)return H.html(res,200,L.page('Join',null,'/register',AV.regForm(S.issueCsrf('anon'),'Check name, email, 8+ char password, matching confirm.',false)));

  const result=await DB.registerUser(name,email,S.hashPassword(b.password),b.bio,b.interests);
  if(result.error){
    return H.html(res,200,L.page('Join',null,'/register',AV.regForm(S.issueCsrf('anon'),result.error,Boolean(result.full))));
  }
  return H.html(res,200,L.page('Received',null,'',AV.authShell('REQUEST RECEIVED','<div class="card" style="max-width:520px;margin:0 auto"><h3>PENDING ADMIN APPROVAL</h3><p>Counts toward membership only after approval.</p><p><a class="btn btn-primary btn-sm" href="/login">GO TO LOGIN</a></p></div>','')));
}
module.exports={postLogin,postReg};
