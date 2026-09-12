'use strict';
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const cfg=require('./config');
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.webmanifest':'application/manifest+json'};
function secHeaders(res){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'");}
function send(res,code,body,ct){secHeaders(res);res.writeHead(code,{'Content-Type':ct||'text/html; charset=utf-8','Cache-Control':code===200&&ct&&ct.startsWith('text/html')?'no-store':'no-store'});res.end(body);}
const html=(res,code,s)=>send(res,code,s,'text/html; charset=utf-8');
const json=(res,code,o)=>send(res,code,JSON.stringify(o),'application/json; charset=utf-8');
function redirect(res,to,cookie){secHeaders(res);const h={Location:to};if(cookie)h['Set-Cookie']=cookie;res.writeHead(302,h);res.end();}
function parseCookies(req){const o={};const h=req.headers.cookie;if(!h)return o;for(const p of h.split(';')){const i=p.indexOf('=');if(i<0)continue;o[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim());}return o;}
function readBody(req,limit=2*1024*1024){return new Promise((res,rej)=>{const a=[];let n=0;req.on('data',c=>{n+=c.length;if(n>limit){rej(Object.assign(new Error('too large'),{status:413}));req.destroy();return;}a.push(c);});req.on('end',()=>res(Buffer.concat(a)));req.on('error',rej);});}
async function serveStatic(req,res){let u=req.url.split('?')[0];if(u==='/favicon.ico')u='/favicon.svg';const rel=decodeURIComponent(u.replace('/static/','').replace(/^\//,''));if(rel.includes('..'))return false;const base=rel.startsWith('static/')?rel.slice(7):rel;const fp=path.join(cfg.ROOT,'public',base);if(!fp.startsWith(path.join(cfg.ROOT,'public')))return false;try{const b=await readFile(fp);const e=path.extname(fp).toLowerCase();secHeaders(res);res.writeHead(200,{'Content-Type':MIME[e]||'application/octet-stream','Cache-Control':'public, max-age=3600'});res.end(b);return true;}catch{return false;}}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
module.exports={secHeaders,send,html,json,redirect,parseCookies,readBody,serveStatic,esc};
