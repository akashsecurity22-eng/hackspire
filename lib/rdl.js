'use strict';
const fs=require('node:fs'),path=require('node:path');
const DB=require('./db'),H=require('./http'),cfg=require('./config');
async function dl(req,res,user,id){
  const r=await DB.getResource(id);
  if(!r||!r.file_path)return H.html(res,404,require('./layout').errPage(404,'RESOURCE NOT FOUND','The requested resource does not exist.'));
  let ok=r.visibility==='ALL';
  if(!ok)ok=await DB.hasGrant(id,user.id);
  if(!ok){await DB.audit(user.id,'resource_denied',String(id));return H.html(res,403,require('./layout').errPage(403,'ACCESS DENIED','You do not have permission to access this resource.'));}
  const fp=path.join(cfg.UPLOAD_DIR,path.basename(r.file_path));
  if(!fp.startsWith(cfg.UPLOAD_DIR)||!fs.existsSync(fp))return H.html(res,404,require('./layout').errPage(404,'RESOURCE NOT FOUND','File is missing.'));
  await DB.audit(user.id,'resource_download',String(id));
  H.secHeaders(res);res.writeHead(200,{'Content-Type':r.mime||'application/octet-stream','Content-Disposition':'attachment; filename="'+String(r.file_name||'file').replace(/"/g,'')+'"','Content-Length':fs.statSync(fp).size});fs.createReadStream(fp).pipe(res);
}
module.exports={dl};
