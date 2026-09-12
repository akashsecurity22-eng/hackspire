'use strict';
const DB=require('./db'),H=require('./http'),L=require('./layout'),S=require('./security'),AD=require('./adminview'),cfg=require('./config');
const CATS=['CYBER FUNDAMENTALS','LINUX','NETWORKING','WEB SECURITY','ACTIVE DIRECTORY','PENETRATION TESTING','RED TEAM','BLUE TEAM','DFIR','IoT SECURITY','AI SECURITY','CTF'];
async function dashBody(tab,csrf,q){
  const count=await DB.activeCount();
  if(tab==='members'){
    const users=await DB.getAllUsers();
    return AD.shell(tab,AD.membersTable(users,count,cfg.MAX_MEMBERS,csrf));
  }
  if(tab==='announcements'){
    const an=await DB.getAnnouncements(50);
    return AD.shell(tab,`<h2>ANNOUNCE</h2><form class="form" style="margin:0;max-width:none" method="post" action="/admin/announce"><input type="hidden" name="csrf" value="${H.esc(csrf)}"><label>TITLE</label><input name="title" required maxlength="120"><label>BODY</label><textarea name="body" rows="3" required maxlength="2000"></textarea><p style="margin-top:12px"><button class="btn btn-primary btn-sm" type="submit">PUBLISH</button></p></form><div style="margin-top:14px">${an.length?an.map(a=>`<div class="card" style="margin-bottom:10px"><h3>${H.esc(a.title)}</h3><p>${H.esc(a.body)}</p></div>`).join(''):'<p>NO ANNOUNCEMENTS</p>'}</div>`);
  }
  if(tab==='ctf')return AD.shell(tab,`<h2>ACTIVE DIRECTORY CTF</h2><div class="card"><table><tr><th>TITLE</th><td>ACTIVE DIRECTORY CTF</td></tr><tr><th>TYPE</th><td>CTF</td></tr><tr><th>CATEGORY</th><td>ACTIVE DIRECTORY</td></tr><tr><th>DIFFICULTY</th><td>INTERMEDIATE</td></tr><tr><th>STATUS</th><td><span class="pill">COMING SOON</span></td></tr></table><p>Explore the domain. Find the path. Capture the flags. Authorized members only.</p></div>`);
  if(tab==='teams')return AD.shell(tab,`<h2>TEAMS</h2><div class="cards c3">${require('./pub2').TEAMS.map(t=>`<div class="card"><h3>${t[0]}</h3><p>${t[1]}</p><p class="mono dim" style="font-size:12px">STATUS: FORMING</p></div>`).join('')}</div><p class="mono dim" style="font-size:12px">Conceptual squad areas. Membership assignment is handled through resource access + announcements.</p>`);
  if(tab==='settings')return AD.shell(tab,`<h2>SETTINGS</h2><div class="card"><table><tr><th>DATABASE</th><td class="mono">${cfg.IS_SUPABASE?'SUPABASE (POSTGRESQL)':'SQLITE (LOCAL)'}</td></tr><tr><th>MAX MEMBERS</th><td class="mono">${cfg.MAX_MEMBERS} (Hard cap enforced)</td></tr><tr><th>ACTIVE MEMBERS</th><td class="mono">${count} / ${cfg.MAX_MEMBERS}</td></tr><tr><th>SECURE COOKIES</th><td class="mono">${cfg.SECURE_COOKIES?'ON':'OFF (enable in production)'}</td></tr><tr><th>UPLOAD LIMIT</th><td class="mono">25 MB</td></tr></table><p class="dim">Operational limits and database configuration are managed via environment variables.</p></div>`);
  if(tab==='audit'){
    const rows=await DB.getAuditLogs(100);
    return AD.shell(tab,`<h2>AUDIT LOGS</h2><div style="overflow-x:auto"><table><tr><th>TIME</th><th>ACTOR</th><th>ACTION</th><th>DETAIL</th></tr>${rows.map(r=>`<tr><td class="mono">${H.esc(r.created_at)}</td><td class="mono">${H.esc(r.email||'-')}</td><td>${H.esc(r.action)}</td><td>${H.esc(r.detail||'')}</td></tr>`).join('')}</table></div>`);
  }
  const items=await DB.getAllResourcesWithAccessCount();
  let extra='';
  if(q.manage){
    const rid=Number(q.manage);
    const r=await DB.getResource(rid);
    const users=await DB.getApprovedUsers();
    const grantUserIds=await DB.getGrants(rid);
    const has=new Set(grantUserIds);
    if(r)extra=`<div class="card" style="margin-top:14px"><h3>MANAGE ACCESS — ${H.esc(r.title)}</h3><form method="post" action="/admin/grants"><input type="hidden" name="csrf" value="${H.esc(csrf)}"><input type="hidden" name="id" value="${rid}">${users.map(u=>`<label style="display:flex;gap:8px;align-items:center;color:#fff"><input type="checkbox" style="width:auto" name="u${u.id}" ${has.has(u.id)?'checked':''}> ${H.esc(u.name)} — ${H.esc(u.email)}</label>`).join('')}<p style="margin-top:10px"><button class="btn btn-primary btn-sm" type="submit">SAVE ACCESS</button></p></form></div>`;
  }
  const up=`<div class="card" style="margin-top:14px"><h3>UPLOAD RESOURCE</h3><form method="post" action="/admin/upload" enctype="multipart/form-data"><input type="hidden" name="csrf" value="${H.esc(csrf)}"><label>TITLE</label><input name="title" required maxlength="160"><label>DESCRIPTION</label><textarea name="description" rows="2" maxlength="2000"></textarea><label>CATEGORY</label><select name="category">${CATS.map(c=>`<option>${c}</option>`).join('')}</select><label>DIFFICULTY</label><select name="difficulty"><option>BEGINNER</option><option>INTERMEDIATE</option><option>ADVANCED</option></select><label>RESOURCE TYPE</label><select name="resource_type"><option>FILE</option><option>GUIDE</option><option>CHEATSHEET</option><option>VIDEO</option><option>LINK</option></select><label>TAGS (COMMA SEPARATED)</label><input name="tags" maxlength="300"><label>VISIBILITY</label><select name="visibility"><option value="SELECTED">SELECTED MEMBERS</option><option value="ALL">ALL MEMBERS</option><option value="PRIVATE">PRIVATE / ADMIN ONLY</option></select><label>FILE (MAX 25MB)</label><input type="file" name="file" required><p class="mono dim" style="font-size:12px">PDF / TXT / MD / ZIP / PNG / JPG / MP4</p><p style="margin-top:10px"><button class="btn btn-primary btn-sm" type="submit">UPLOAD</button></p></form><p class="mono dim" style="font-size:11px">Protected by CSRF token + ADMIN session check.</p></div>`;
  return AD.shell(tab||'overview',`<div class="admin-profile"><img class="admin-profile-photo" src="/static/akash-founder.jpg" alt="Akash, HackSpire founder"><div><p class="kicker">CONTROL CENTER</p><h2>WELCOME, AKASH</h2><p class="dim">Founder and administrator workspace.</p></div></div><h2>OVERVIEW — MEMBERS ${count} / ${cfg.MAX_MEMBERS}</h2><div class="cards c3"><div class="card"><h3>MEMBERS</h3><p class="mono">${count} / ${cfg.MAX_MEMBERS}</p></div><div class="card"><h3>RESOURCES</h3><p class="mono">${items.length} TOTAL</p></div><div class="card"><h3>DATABASE</h3><p class="mono">${cfg.IS_SUPABASE?'SUPABASE':'SQLITE'}</p></div></div>`+AD.resTable(items,csrf)+extra+up);
}
module.exports={dashBody,CATS};
