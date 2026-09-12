'use strict';
const { createClient } = require('@supabase/supabase-js');
const cfg = require('./config');

let client = null;

function getClient() {
  if (!client) {
    if (!cfg.SUPABASE_URL || (!cfg.SUPABASE_SERVICE_ROLE_KEY && !cfg.SUPABASE_ANON_KEY)) {
      throw new Error('Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.');
    }
    client = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY || cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return client;
}

async function activeCount() {
  const supa = getClient();
  const { count, error } = await supa
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'APPROVED')
    .in('role', ['ADMIN', 'MEMBER']);
  if (error) throw error;
  return count || 0;
}

async function getUser(id) {
  if (!id) return null;
  const supa = getClient();
  const { data, error } = await supa
    .from('users')
    .select('id, name, email, role, display_role, status, bio, interests, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Supabase getUser error:', error.message);
    return null;
  }
  return data;
}

async function getUserAuth(email) {
  if (!email) return null;
  const supa = getClient();
  const { data, error } = await supa
    .from('users')
    .select('*')
    .ilike('email', String(email).toLowerCase().trim())
    .maybeSingle();
  if (error) {
    console.error('Supabase getUserAuth error:', error.message);
    return null;
  }
  return data;
}

async function audit(actorId, action, detail) {
  try {
    const supa = getClient();
    await supa.from('audit_logs').insert([{
      actor_id: actorId || null,
      action: String(action || '').slice(0, 100),
      detail: String(detail || '').slice(0, 500)
    }]);
  } catch (err) {
    console.error('Supabase audit error:', err.message);
  }
}

async function getAllUsers() {
  const supa = getClient();
  const { data, error } = await supa
    .from('users')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getApprovedUsers() {
  const supa = getClient();
  const { data, error } = await supa
    .from('users')
    .select('id, name, email')
    .eq('status', 'APPROVED')
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function registerUser(name, email, passwordHash, bio, interests) {
  const supa = getClient();
  // Check if exists
  const existing = await getUserAuth(email);
  if (existing) return { error: 'Email already registered.' };

  // Hard Cap check: max 10 active members
  const currentCount = await activeCount();
  if (currentCount >= cfg.MAX_MEMBERS) {
    return { error: 'HACKSPIRE MEMBERSHIP IS CURRENTLY FULL.', full: true };
  }

  const { error } = await supa.from('users').insert([{
    name: String(name).slice(0, 80),
    email: String(email).toLowerCase().trim(),
    password_hash: passwordHash,
    role: 'MEMBER',
    display_role: 'TEAM MEMBER',
    status: 'PENDING',
    bio: String(bio || '').slice(0, 600),
    interests: String(interests || '').slice(0, 200)
  }]);

  if (error) {
    if (error.message && error.message.includes('HACKSPIRE_CAP_REACHED')) {
      return { error: 'HACKSPIRE MEMBERSHIP IS CURRENTLY FULL.', full: true };
    }
    return { error: error.message };
  }
  return { ok: true };
}

async function memberAction(admin, b) {
  const supa = getClient();
  const id = Number(b.id);
  const u = await getUser(id);
  if (!u) return 'missing';
  if (u.role === 'ADMIN' && b.action !== 'ENABLE') return 'admin-protected';

  if (b.action === 'APPROVE' || b.action === 'ENABLE') {
    const c = await activeCount();
    if (u.status !== 'APPROVED' && c >= cfg.MAX_MEMBERS) return 'full';
    const { error } = await supa.from('users').update({ status: 'APPROVED' }).eq('id', id);
    if (error) {
      if (error.message && error.message.includes('HACKSPIRE_CAP_REACHED')) return 'full';
      throw error;
    }
  } else if (b.action === 'REJECT') {
    await supa.from('users').update({ status: 'REJECTED' }).eq('id', id);
  } else if (b.action === 'DISABLE') {
    await supa.from('users').update({ status: 'DISABLED' }).eq('id', id);
  } else if (b.action === 'REMOVE') {
    await supa.from('users').delete().eq('id', id);
  }

  await audit(admin.id, 'member_' + b.action, String(u.email));
  return 'ok';
}

async function setRole(admin, b) {
  const supa = getClient();
  const id = Number(b.id);
  const u = await getUser(id);
  if (!u) return 'missing';
  const role = b.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
  const allowed = ['TEAM MEMBER', 'CORE TEAM', 'FOUNDER & ADMIN', 'MENTOR', 'MODERATOR'];
  const badge = allowed.includes(b.display_role) ? b.display_role : 'TEAM MEMBER';
  if (u.role === 'ADMIN' && role !== 'ADMIN' && id === admin.id) return 'self';

  await supa.from('users').update({ role, display_role: badge }).eq('id', id);
  await audit(admin.id, 'role_update', u.email + ' -> ' + role + ' / ' + badge);
  return 'ok';
}

async function getAnnouncements(limit = 10) {
  const supa = getClient();
  const { data, error } = await supa
    .from('announcements')
    .select('*, users(name)')
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(a => ({
    id: a.id,
    title: a.title,
    body: a.body,
    created_by: a.created_by,
    created_at: a.created_at,
    name: a.users ? a.users.name : null
  }));
}

async function createAnnouncement(title, body, actorId) {
  const supa = getClient();
  const { error } = await supa.from('announcements').insert([{
    title: String(title || '').slice(0, 120),
    body: String(body || '').slice(0, 2000),
    created_by: actorId
  }]);
  if (error) throw error;
}

async function getResourcesForUser(userId) {
  const supa = getClient();
  // Fetch grants for user
  const { data: grants } = await supa
    .from('resource_grants')
    .select('resource_id')
    .eq('user_id', userId);
  const grantedIds = (grants || []).map(g => g.resource_id);

  // Fetch all resources with visibility ALL or in grantedIds
  let query = supa.from('resources').select('*').order('id', { ascending: false });
  if (grantedIds.length > 0) {
    query = query.or(`visibility.eq.ALL,id.in.(${grantedIds.join(',')})`);
  } else {
    query = query.eq('visibility', 'ALL');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getAllResourcesWithAccessCount() {
  const supa = getClient();
  const { data: resources, error: rErr } = await supa
    .from('resources')
    .select('*')
    .order('id', { ascending: false });
  if (rErr) throw rErr;

  const { data: grants, error: gErr } = await supa
    .from('resource_grants')
    .select('resource_id');
  if (gErr) throw gErr;

  const counts = {};
  (grants || []).forEach(g => {
    counts[g.resource_id] = (counts[g.resource_id] || 0) + 1;
  });

  return (resources || []).map(r => ({
    ...r,
    access: counts[r.id] || 0
  }));
}

async function getResource(id) {
  const supa = getClient();
  const { data, error } = await supa
    .from('resources')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createResource(fields, file, admin) {
  const supa = getClient();
  const { data, error } = await supa.from('resources').insert([{
    title: String(fields.title || '').trim().slice(0, 160),
    description: String(fields.description || '').slice(0, 2000),
    category: String(fields.category || 'CYBER FUNDAMENTALS').slice(0, 60),
    difficulty: String(fields.difficulty || 'BEGINNER'),
    resource_type: String(fields.resource_type || 'FILE').slice(0, 40),
    tags: String(fields.tags || '').slice(0, 300),
    file_name: file.name,
    file_path: file.safeName || file.name,
    mime: file.mime,
    size_bytes: file.data ? file.data.length : (file.size || 0),
    visibility: String(fields.visibility || 'SELECTED'),
    uploaded_by: admin.id
  }]).select('id').single();

  if (error) throw error;
  await audit(admin.id, 'resource_upload', fields.title);
  return data.id;
}

async function deleteResource(id) {
  const supa = getClient();
  const { error } = await supa.from('resources').delete().eq('id', id);
  if (error) throw error;
}

async function getGrants(resourceId) {
  const supa = getClient();
  const { data, error } = await supa
    .from('resource_grants')
    .select('user_id')
    .eq('resource_id', resourceId);
  if (error) throw error;
  return (data || []).map(d => d.user_id);
}

async function saveGrants(resourceId, userIds, adminId) {
  const supa = getClient();
  await supa.from('resource_grants').delete().eq('resource_id', resourceId);
  if (userIds && userIds.length > 0) {
    const rows = userIds.map(uid => ({
      resource_id: resourceId,
      user_id: uid,
      granted_by: adminId
    }));
    const { error } = await supa.from('resource_grants').insert(rows);
    if (error) throw error;
  }
  await audit(adminId, 'grants_update', String(resourceId));
}

async function hasGrant(resourceId, userId) {
  const supa = getClient();
  const { data } = await supa
    .from('resource_grants')
    .select('id')
    .eq('resource_id', resourceId)
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(data);
}

async function countUserGrants(userId) {
  const supa = getClient();
  const { count } = await supa
    .from('resource_grants')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count || 0;
}

async function getAuditLogs(limit = 100) {
  const supa = getClient();
  const { data, error } = await supa
    .from('audit_logs')
    .select('*, users(email)')
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(l => ({
    id: l.id,
    actor_id: l.actor_id,
    action: l.action,
    detail: l.detail,
    created_at: l.created_at,
    email: l.users ? l.users.email : null
  }));
}

module.exports = {
  getClient,
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
};
