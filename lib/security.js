'use strict';
const crypto=require('node:crypto');
const cfg=require('./config');
const sessions=new Map();
const csrfTokens=new Map();
function b64u(b){return Buffer.from(b).toString('base64url');}
function sign(v){return b64u(crypto.createHmac('sha256',cfg.SESSION_SECRET).update(v).digest());}
function newId(){return b64u(crypto.randomBytes(24));}
function hashPassword(pw){const s=crypto.randomBytes(16).toString('hex');const h=crypto.scryptSync(pw,s,64).toString('hex');return `scrypt$${s}$${h}`;}
function verifyPassword(pw,stored){try{const[a,s,h]=String(stored).split('$');if(a!=='scrypt')return false;const v=crypto.scryptSync(pw,s,64).toString('hex');return crypto.timingSafeEqual(Buffer.from(h,'hex'),Buffer.from(v,'hex'));}catch{return false;}}
function createSession(uid,role){
  const payload=b64u(JSON.stringify({uid,role,exp:Date.now()+7*24*3600*1000,nonce:newId()}));
  const sid=`${payload}.${sign(payload)}`;
  sessions.set(sid,{uid,role,exp:Date.now()+7*24*3600*1000});
  return sid;
}
function getSession(sid){
  if(!sid||typeof sid!=='string')return null;
  const dot=sid.lastIndexOf('.');
  if(dot>0){
    const payload=sid.slice(0,dot);
    const sig=sid.slice(dot+1);
    const expSig=sign(payload);
    try{
      if(sig.length===expSig.length&&crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expSig))){
        const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
        if(data&&data.exp&&data.exp>Date.now()){
          return {uid:data.uid,role:data.role,exp:data.exp};
        }
      }
    }catch(e){}
  }
  const s=sessions.get(sid);
  if(!s)return null;
  if(s.exp<Date.now()){sessions.delete(sid);return null;}
  return s;
}
function destroySession(sid){if(sid)sessions.delete(sid);}
function cookieHeader(sid){const base=`hs_sid=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7*24*3600}`;return cfg.SECURE_COOKIES?base+'; Secure':base;}
function clearCookie(){return `hs_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cfg.SECURE_COOKIES?'; Secure':''}`;}
function issueCsrf(sid){
  const payload=b64u(JSON.stringify({exp:Date.now()+2*3600*1000,sid:sid||'anon',nonce:newId()}));
  const t=`${payload}.${sign(payload)}`;
  csrfTokens.set(t,Date.now()+2*3600*1000);
  return t;
}
function checkCsrf(t){
  if(!t||typeof t!=='string')return false;
  const dot=t.lastIndexOf('.');
  if(dot>0){
    const payload=t.slice(0,dot);
    const sig=t.slice(dot+1);
    const expSig=sign(payload);
    try{
      if(sig.length===expSig.length&&crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expSig))){
        const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
        if(data&&data.exp&&data.exp>Date.now())return true;
      }
    }catch(e){}
  }
  const e=csrfTokens.get(t);
  if(!e)return false;
  if(e<Date.now()){csrfTokens.delete(t);return false;}
  csrfTokens.delete(t);
  return true;
}
function validEmail(e){return typeof e==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim())&&e.length<=254;}
function validPass(p){return typeof p==='string'&&p.length>=8&&p.length<=128;}
module.exports={hashPassword,verifyPassword,createSession,getSession,destroySession,cookieHeader,clearCookie,issueCsrf,checkCsrf,validEmail,validPass,sign};
