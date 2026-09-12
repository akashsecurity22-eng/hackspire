'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cfg = require('./config');
const { hashPassword } = require('./security');

let sqliteDb = null;

function getSqlite() {
  if (sqliteDb) return sqliteDb;
  const { DatabaseSync } = require('node:sqlite');
  fs.mkdirSync(path.dirname(cfg.DB_PATH), { recursive: true });
  fs.mkdirSync(cfg.UPLOAD_DIR, { recursive: true });
  sqliteDb = new DatabaseSync(cfg.DB_PATH);
  sqliteDb.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'MEMBER',display_role TEXT NOT NULL DEFAULT 'TEAM MEMBER',status TEXT NOT NULL DEFAULT 'PENDING',bio TEXT DEFAULT '',interests TEXT DEFAULT '',created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS resources(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,description TEXT DEFAULT '',category TEXT DEFAULT 'CYBER FUNDAMENTALS',difficulty TEXT DEFAULT 'BEGINNER',resource_type TEXT DEFAULT 'FILE',tags TEXT DEFAULT '',file_name TEXT DEFAULT '',file_path TEXT DEFAULT '',mime TEXT DEFAULT '',size_bytes INTEGER DEFAULT 0,visibility TEXT NOT NULL DEFAULT 'SELECTED',uploaded_by INTEGER,created_at TEXT NOT NULL DEFAULT (datetime('now')),FOREIGN KEY(uploaded_by) REFERENCES users(id) ON DELETE SET NULL);
  CREATE TABLE IF NOT EXISTS resource_permissions(id INTEGER PRIMARY KEY AUTOINCREMENT,resource_id INTEGER NOT NULL UNIQUE,granted_by INTEGER,granted_at TEXT NOT NULL DEFAULT (datetime('now')),FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE,FOREIGN KEY(granted_by) REFERENCES users(id) ON DELETE SET NULL);
  CREATE TABLE IF NOT EXISTS resource_grants(id INTEGER PRIMARY KEY AUTOINCREMENT,resource_id INTEGER NOT NULL,user_id INTEGER NOT NULL,granted_by INTEGER,granted_at TEXT NOT NULL DEFAULT (datetime('now')),UNIQUE(resource_id,user_id),FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS announcements(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,body TEXT NOT NULL,created_by INTEGER,created_at TEXT NOT NULL DEFAULT (datetime('now')),FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL);
  CREATE TABLE IF NOT EXISTS audit_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id INTEGER,action TEXT NOT NULL,detail TEXT DEFAULT '',created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS password_resets(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,token_hash TEXT NOT NULL,expires_at TEXT NOT NULL,used INTEGER DEFAULT 0,created_at TEXT NOT NULL DEFAULT (datetime('now')),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE INDEX IF NOT EXISTS idx_users_status ON users(status); CREATE INDEX IF NOT EXISTS idx_grants_res ON resource_grants(resource_id); CREATE INDEX IF NOT EXISTS idx_grants_user ON resource_grants(user_id);`);
  ensureAdminSqlite();
  return sqliteDb;
}

function ensureAdminSqlite() {
  const r = sqliteDb.prepare('SELECT id FROM users WHERE email=?').get(cfg.ADMIN_EMAIL);
  if (!r) {
    sqliteDb.prepare(`INSERT INTO users(name,email,password_hash,role,display_role,status,bio,interests) VALUES(?,?,?,?,?,?,?,?)`).run(
      'Akash', cfg.ADMIN_EMAIL, hashPassword(cfg.ADMIN_PASS), 'ADMIN', 'FOUNDER & ADMIN', 'APPROVED',
      'Founder & Admin of HackSpire. Cybersecurity | Penetration Testing | Active Directory | CTF.',
      'Cybersecurity, Penetration Testing, Active Directory, CTF'
    );
  }
}

function getSupabase() {
  return require('./supabase');
}

function open() {
  if (cfg.IS_SUPABASE) {
    return getSupabase().getClient();
  }
  return getSqlite();
}

async function activeCount() {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().activeCount();
  }
  return getSqlite().prepare(`SELECT COUNT(*) c FROM users WHERE status='APPROVED' AND role IN ('ADMIN','MEMBER')`).get().c;
}

async function getUser(id) {
  if (!id) return null;
  if (cfg.IS_SUPABASE) {
    return await getSupabase().getUser(id);
  }
  return getSqlite().prepare('SELECT id,name,email,role,display_role,status,bio,interests,created_at FROM users WHERE id=?').get(id) || null;
}

async function getUserAuth(email) {
  if (!email) return null;
  if (cfg.IS_SUPABASE) {
    return await getSupabase().getUserAuth(email);
  }
  return getSqlite().prepare('SELECT * FROM users WHERE email=?').get(String(email).toLowerCase().trim()) || null;
}

async function audit(actor, action, detail) {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().audit(actor, action, detail);
  }
  try {
    getSqlite().prepare('INSERT INTO audit_logs(actor_id,action,detail) VALUES(?,?,?)').run(actor || null, action, detail || '');
  } catch {}
}

async function getAllUsers() {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().getAllUsers();
  }
  return getSqlite().prepare('SELECT * FROM users ORDER BY id').all();
}

async function getApprovedUsers() {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().getApprovedUsers();
  }
  return getSqlite().prepare("SELECT id,name,email FROM users WHERE status='APPROVED' ORDER BY id").all();
}

async function registerUser(name, email, passwordHash, bio, interests) {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().registerUser(name, email, passwordHash, bio, interests);
  }
  const db = getSqlite();
  if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) {
    return { error: 'Email already registered.' };
  }
  const c = db.prepare("SELECT COUNT(*) c FROM users WHERE status='APPROVED' AND role IN ('ADMIN','MEMBER')").get().c;
  if (c >= cfg.MAX_MEMBERS) {
    return { error: 'HACKSPIRE MEMBERSHIP IS CURRENTLY FULL.', full: true };
  }
  db.prepare('INSERT INTO users(name,email,password_hash,role,display_role,status,bio,interests) VALUES(?,?,?,?,?,?,?,?)').run(
    name, email, passwordHash, 'MEMBER', 'TEAM MEMBER', 'PENDING',
    String(bio || '').slice(0, 600), String(interests || '').slice(0, 200)
  );
  return { ok: true };
}

async function memberAction(admin, b) {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().memberAction(admin, b);
  }
  const db = getSqlite();
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(Number(b.id));
  if (!u) return 'missing';
  if (u.role === 'ADMIN' && b.action !== 'ENABLE') return 'admin-protected';

  if (b.action === 'APPROVE' || b.action === 'ENABLE') {
    const c = db.prepare("SELECT COUNT(*) c FROM users WHERE status='APPROVED' AND role IN ('ADMIN','MEMBER')").get().c;
    if (u.status !== 'APPROVED' && c >= cfg.MAX_MEMBERS) return 'full';
    db.prepare("UPDATE users SET status='APPROVED' WHERE id=?").run(u.id);
  } else if (b.action === 'REJECT') {
    db.prepare("UPDATE users SET status='REJECTED' WHERE id=?").run(u.id);
  } else if (b.action === 'DISABLE') {
    db.prepare("UPDATE users SET status='DISABLED' WHERE id=?").run(u.id);
  } else if (b.action === 'REMOVE') {
    db.prepare('DELETE FROM users WHERE id=?').run(u.id);
  }

  audit(admin.id, 'member_' + b.action, String(u.email));
  return 'ok';
}

async function setRole(admin, b) {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().setRole(admin, b);
  }
  const db = getSqlite();
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(Number(b.id));
  if (!u) return 'missing';
  const role = b.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
  const allowed = ['TEAM MEMBER', 'CORE TEAM', 'FOUNDER & ADMIN', 'MENTOR', 'MODERATOR'];
  const badge = allowed.includes(b.display_role) ? b.display_role : 'TEAM MEMBER';
  if (u.role === 'ADMIN' && role !== 'ADMIN' && Number(b.id) === admin.id) return 'self';
  db.prepare('UPDATE users SET role=?,display_role=? WHERE id=?').run(role, badge, u.id);
  audit(admin.id, 'role_update', u.email + ' -> ' + role + ' / ' + badge);
  return 'ok';
}

async function getAnnouncements(limit = 10) {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().getAnnouncements(limit);
  }
  return getSqlite().prepare('SELECT a.*,u.name FROM announcements a LEFT JOIN users u ON u.id=a.created_by ORDER BY a.id DESC LIMIT ?').all(limit);
}

async function createAnnouncement(title, body, actorId) {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().createAnnouncement(title, body, actorId);
  }
  getSqlite().prepare('INSERT INTO announcements(title,body,created_by) VALUES(?,?,?)').run(
    String(title || '').slice(0, 120), String(body || '').slice(0, 2000), actorId
  );
}

async function getResourcesForUser(userId) {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().getResourcesForUser(userId);
  }
  return getSqlite().prepare('SELECT r.* FROM resources r LEFT JOIN resource_grants g ON g.resource_id=r.id AND g.user_id=? WHERE r.visibility=? OR g.id IS NOT NULL ORDER BY r.id DESC').all(userId, 'ALL');
}

async function getAllResourcesWithAccessCount() {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().getAllResourcesWithAccessCount();
  }
  return getSqlite().prepare('SELECT r.*,(SELECT COUNT(*) FROM resource_grants g WHERE g.resource_id=r.id) access FROM resources r ORDER BY r.id DESC').all();
}

async function getResource(id) {
  if (!id) return null;
  if (cfg.IS_SUPABASE) {
    return await getSupabase().getResource(id);
  }
  return getSqlite().prepare('SELECT * FROM resources WHERE id=?').get(Number(id)) || null;
}

async function createResource(fields, file, admin) {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().createResource(fields, file, admin);
  }
  const db = getSqlite();
  const info = db.prepare('INSERT INTO resources(title,description,category,difficulty,resource_type,tags,file_name,file_path,mime,size_bytes,visibility,uploaded_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(
    fields.title, String(fields.description || '').slice(0, 2000), String(fields.category || 'CYBER FUNDAMENTALS').slice(0, 60),
    String(fields.difficulty || 'BEGINNER'), String(fields.resource_type || 'FILE').slice(0, 40),
    String(fields.tags || '').slice(0, 300), file.name, file.safeName, file.mime, file.data.length,
    String(fields.visibility || 'SELECTED'), admin.id
  );
  audit(admin.id, 'resource_upload', fields.title);
  return Number(info.lastInsertRowid);
}

async function deleteResource(id) {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().deleteResource(id);
  }
  const db = getSqlite();
  const r = db.prepare('SELECT * FROM resources WHERE id=?').get(Number(id));
  if (r) {
    try {
      if (r.file_path) fs.rmSync(path.join(cfg.UPLOAD_DIR, path.basename(r.file_path)), { force: true });
    } catch {}
    db.prepare('DELETE FROM resources WHERE id=?').run(r.id);
  }
}

async function getGrants(resourceId) {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().getGrants(resourceId);
  }
  return getSqlite().prepare('SELECT user_id FROM resource_grants WHERE resource_id=?').all(resourceId).map(x => x.user_id);
}

async function saveGrants(resourceId, userIds, adminId) {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().saveGrants(resourceId, userIds, adminId);
  }
  const db = getSqlite();
  const rid = Number(resourceId);
  db.prepare('DELETE FROM resource_grants WHERE resource_id=?').run(rid);
  for (const uid of userIds) {
    if (uid > 0) db.prepare('INSERT OR IGNORE INTO resource_grants(resource_id,user_id,granted_by) VALUES(?,?,?)').run(rid, uid, adminId);
  }
  audit(adminId, 'grants_update', String(rid));
}

async function hasGrant(resourceId, userId) {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().hasGrant(resourceId, userId);
  }
  return !!getSqlite().prepare('SELECT id FROM resource_grants WHERE resource_id=? AND user_id=?').get(resourceId, userId);
}

async function countUserGrants(userId) {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().countUserGrants(userId);
  }
  return getSqlite().prepare('SELECT COUNT(*) c FROM resource_grants g JOIN resources r ON r.id=g.resource_id WHERE g.user_id=?').get(userId).c;
}

async function getAuditLogs(limit = 100) {
  if (cfg.IS_SUPABASE) {
    return await getSupabase().getAuditLogs(limit);
  }
  return getSqlite().prepare('SELECT l.*,u.email FROM audit_logs l LEFT JOIN users u ON u.id=l.actor_id ORDER BY l.id DESC LIMIT ?').all(limit);
}

function ensureAdmin() {
  if (!cfg.IS_SUPABASE) {
    ensureAdminSqlite();
  }
}

module.exports = {
  open,
  activeCount,
  getUser,
  getUserAuth,
  audit,
  getAllUsers,
  getApprovedUsers,
  registerUser,
  memberAction,
  setRole,
  getAnnouncements,
  createAnnouncement,
  getResourcesForUser,
  getAllResourcesWithAccessCount,
  getResource,
  createResource,
  deleteResource,
  getGrants,
  saveGrants,
  hasGrant,
  countUserGrants,
  getAuditLogs,
  ensureAdmin
};
