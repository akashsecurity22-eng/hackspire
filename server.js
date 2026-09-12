'use strict';
require('./lib/env');
const http=require('node:http');
const cfg=require('./lib/config');
const H=require('./lib/http');
const S=require('./lib/security');
const DB=require('./lib/db');
const L=require('./lib/layout');
const RP=require('./lib/rpub');
const RA=require('./lib/rauth');
const RM=require('./lib/rmem');
const RD=require('./lib/rdl');
const RADM=require('./lib/radm');
const WP=require('./lib/wpost');

async function handleRequest(req,res){
  try{
    const u=req.url.split('?')[0];
    const q=Object.fromEntries(new URL(req.url,'http://x').searchParams);
    if(u.indexOf('/static/')===0||u==='/favicon.svg'||u==='/favicon.ico'){
      if(await H.serveStatic(req,res))return;
      return H.html(res,404,L.errPage(404,'RESOURCE NOT FOUND','Static file not found.'));
    }
    if(u==='/health'){
      const members=await DB.activeCount();
      return H.json(res,200,{ok:true,members,max:cfg.MAX_MEMBERS,database:cfg.IS_SUPABASE?'supabase':'sqlite'});
    }
    const c=H.parseCookies(req);
    const sess=S.getSession(c.hs_sid);
    const user=sess?await DB.getUser(sess.uid):null;
    const active=(user&&user.status==='APPROVED')?user:null;
    if(req.method==='GET'){
      if(u.indexOf('/admin')===0){
        if(!active||active.role!=='ADMIN')return H.html(res,active?403:401,L.errPage(active?403:401,active?'ACCESS DENIED':'AUTHENTICATION REQUIRED',active?'Admins only.':'Please login.'));
        const tok=S.issueCsrf(c.hs_sid||'a');
        const body=await RADM.dashBody(q.tab||'overview',tok,q);
        return H.html(res,200,L.page('Admin — HackSpire',active,'',body));
      }
      const pub=await RP.pubGet(req,res,active,u);if(pub!==null)return;
      const ag=await RA.get(req,res,active,u);if(ag!==null)return;
      if(u==='/dashboard'||u==='/resources'||u==='/labs'||u==='/ctf'||u==='/profile'){
        if(!active)return H.html(res,401,L.errPage(401,'AUTHENTICATION REQUIRED','Please login with an approved HackSpire account.'));
        const mg=await RM.get(req,res,active,u);if(mg!==null)return;
      }
      const md=/^\/resources\/(\d+)\/download$/.exec(u);
      if(md){if(!active)return H.html(res,401,L.errPage(401,'AUTHENTICATION REQUIRED','Please login.'));return await RD.dl(req,res,active,Number(md[1]));}
      return H.html(res,404,L.errPage(404,'RESOURCE NOT FOUND','The page you requested does not exist.'));
    }
    if(req.method==='POST')return await WP.post(req,res,active,u,c);
    return H.html(res,405,L.errPage(405,'METHOD NOT ALLOWED','Unsupported method.'));
  }catch(e){
    console.error('Server error:',e);
    try{H.html(res,500,L.errPage(500,'SYSTEM ERROR','Something went wrong.'));}catch(x){}
  }
}

const server=http.createServer(handleRequest);

if(require.main===module){
  DB.ensureAdmin();
  server.listen(cfg.PORT,function(){
    console.log(`HackSpire online on http://localhost:${cfg.PORT} [DB: ${cfg.IS_SUPABASE ? 'Supabase' : 'SQLite'}]`);
  });
}

module.exports=server;
module.exports.handleRequest=handleRequest;
