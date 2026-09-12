'use strict';
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const DB=require('./db'),H=require('./http'),S=require('./security'),cfg=require('./config');
function parseMP(buf,ct){
  const m=/boundary=(.+)/.exec(ct||'');if(!m)return null;const b='--'+m[1].trim();
  const parts=buf.toString('latin1').split(b);const f={fields:{},file:null};
  for(const p of parts){if(!p||p==='--\r\n'||p==='--')continue;
    const i=p.indexOf('\r\n\r\n');if(i<0)continue;const hd=p.slice(0,i),body=p.slice(i+4,p.endsWith('\r\n')?p.length-2:p.length);
    const nm=/name="([^"]+)"/.exec(hd);if(!nm)continue;
    if(/filename="([^"]*)"/.exec(hd)){const fn=(/filename="([^"]*)"/.exec(hd)[1]||'file').split(/[\\/]/).pop();const mt=(/Content-Type:\s*([^\r\n]+)/i.exec(hd)||[])[1]||'application/octet-stream';f.file={name:fn.slice(0,120),mime:mt.trim(),data:Buffer.from(body,'latin1')};}else f.fields[nm[1]]=Buffer.from(body,'latin1').toString('utf8');
  }return f;
}
async function memberAction(admin,b){
  return await DB.memberAction(admin,b);
}
async function saveUpload(admin,fields,file){
  if(!file||!file.data||!file.data.length)throw new Error('nofile');
  if(file.data.length>cfg.MAX_UPLOAD_BYTES)throw new Error('too-big');
  if(!cfg.ALLOWED_MIME.has(file.mime))throw new Error('bad-type');
  const title=String(fields.title||'').trim().slice(0,160);if(!title)throw new Error('title');
  const sid=crypto.randomBytes(12).toString('hex');const safe=Date.now()+'-'+sid+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  try{
    fs.mkdirSync(cfg.UPLOAD_DIR,{recursive:true});
    fs.writeFileSync(path.join(cfg.UPLOAD_DIR,safe),file.data);
  }catch(e){
    try{
      const tmpDir=path.join('/tmp','hackspire-uploads');
      fs.mkdirSync(tmpDir,{recursive:true});
      fs.writeFileSync(path.join(tmpDir,safe),file.data);
    }catch{}
  }
  return await DB.createResource(fields,{name:file.name,safeName:safe,mime:file.mime,data:file.data},admin);
}
async function setRole(admin,b){
  return await DB.setRole(admin,b);
}
module.exports={parseMP,memberAction,setRole,saveUpload};
