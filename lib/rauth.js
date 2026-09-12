'use strict';
const DB=require('./db'),H=require('./http'),L=require('./layout'),S=require('./security'),AV=require('./authview'),cfg=require('./config');
async function get(req,res,user,u){
  if(u==='/login'){if(user)return H.redirect(res,'/dashboard');return H.html(res,200,L.authPage('Login — HackSpire',AV.loginForm(S.issueCsrf('anon'),'')));}
  if(u==='/register'){
    if(user)return H.redirect(res,'/dashboard');
    const count = await DB.activeCount();
    const full = count >= cfg.MAX_MEMBERS;
    return H.html(res,200,L.page('Join — HackSpire',null,'/register',AV.regForm(S.issueCsrf('anon'),'',full)));
  }
  if(u==='/forgot-password')return H.html(res,200,L.page('Reset — HackSpire',null,'',AV.authShell('FORGOT PASSWORD','<form class="form" method="post" action="/forgot-password"><label for="e">ACCOUNT EMAIL</label><input id="e" name="email" type="email" required><input type="hidden" name="csrf" value="'+S.issueCsrf('anon')+'"><p style="margin-top:16px"><button class="btn btn-primary" style="width:100%" type="submit">REQUEST RESET</button></p></form><div class="card" style="max-width:520px;margin:14px auto"><h3>COMING SOON NOTICE</h3><p>Self-service reset links are issued by the Admin until email delivery is configured.</p></div>','')));
  if(u==='/logout'){const c=H.parseCookies(req);if(c.hs_sid)S.destroySession(c.hs_sid);return H.redirect(res,'/',S.clearCookie());}
  return null;
}
module.exports={get};
