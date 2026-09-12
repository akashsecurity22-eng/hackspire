'use strict';
const path=require('node:path');
function env(k,d){const v=process.env[k];return v===undefined||v==='' ? d : v;}
const ROOT=path.join(__dirname,'..');
module.exports={
  ROOT,
  PORT:Number(env('PORT','3000')||3000),
  SECURE_COOKIES:env('SECURE_COOKIES','0')==='1',
  SESSION_SECRET:env('SESSION_SECRET','change-me-to-a-long-random-secret-min-32-chars'),
  MAX_MEMBERS:Number(env('MAX_MEMBERS','10')||10),
  DB_PATH:path.join(ROOT,'data','hackspire.db'),
  UPLOAD_DIR:path.join(ROOT,'data','uploads'),
  ADMIN_EMAIL:'admin@hackspire.local',
  ADMIN_PASS:'HackSpire-Admin-123!',
  SUPABASE_URL:env('SUPABASE_URL',''),
  SUPABASE_SERVICE_ROLE_KEY:env('SUPABASE_SERVICE_ROLE_KEY',env('SUPABASE_KEY','')),
  SUPABASE_ANON_KEY:env('SUPABASE_ANON_KEY',''),
  get IS_SUPABASE(){return Boolean(this.SUPABASE_URL && (this.SUPABASE_SERVICE_ROLE_KEY || this.SUPABASE_ANON_KEY));},
  MAX_UPLOAD_BYTES:25*1024*1024,
  ALLOWED_MIME:new Set(['application/pdf','text/plain','text/markdown','application/zip','application/x-zip-compressed','application/octet-stream','image/png','image/jpeg','video/mp4']),
};
