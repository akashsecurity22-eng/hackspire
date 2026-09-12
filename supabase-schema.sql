-- ==============================================================================
-- HackSpire Database Schema for Supabase (PostgreSQL)
-- Hard Cap: 10 Members Maximum Enforced by Database Trigger
-- ==============================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
  display_role TEXT NOT NULL DEFAULT 'TEAM MEMBER',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED')),
  bio TEXT DEFAULT '',
  interests TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. RESOURCES TABLE
CREATE TABLE IF NOT EXISTS public.resources (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'CYBER FUNDAMENTALS',
  difficulty TEXT DEFAULT 'BEGINNER',
  resource_type TEXT DEFAULT 'FILE',
  tags TEXT DEFAULT '',
  file_name TEXT DEFAULT '',
  file_path TEXT DEFAULT '',
  mime TEXT DEFAULT '',
  size_bytes BIGINT DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'SELECTED' CHECK (visibility IN ('ALL', 'SELECTED', 'PRIVATE')),
  uploaded_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. RESOURCE GRANTS TABLE
CREATE TABLE IF NOT EXISTS public.resource_grants (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  resource_id BIGINT NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  granted_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_resource_user UNIQUE (resource_id, user_id)
);

-- 4. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id BIGINT,
  action TEXT NOT NULL,
  detail TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PASSWORD RESETS TABLE
CREATE TABLE IF NOT EXISTS public.password_resets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDICES FOR HIGH PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_status_role ON public.users(status, role);
CREATE INDEX IF NOT EXISTS idx_resources_visibility ON public.resources(visibility);
CREATE INDEX IF NOT EXISTS idx_resource_grants_res_user ON public.resource_grants(resource_id, user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- HARD CAP ENFORCEMENT: 10 MEMBERS ONLY
-- This PostgreSQL trigger guarantees that the database will reject any
-- insertion or update that causes active approved members to exceed 10.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_hackspire_member_cap()
RETURNS TRIGGER AS $$
DECLARE
  v_active_count INTEGER;
  v_max_cap CONSTANT INTEGER := 10;
BEGIN
  -- We only enforce when a row is becoming or remains APPROVED with role ADMIN or MEMBER
  IF (NEW.status = 'APPROVED' AND NEW.role IN ('ADMIN', 'MEMBER')) THEN
    -- If updating and was already approved, no cap increase occurs
    IF (TG_OP = 'UPDATE' AND OLD.status = 'APPROVED' AND OLD.role IN ('ADMIN', 'MEMBER')) THEN
      RETURN NEW;
    END IF;

    -- Count existing approved members
    SELECT COUNT(*) INTO v_active_count
    FROM public.users
    WHERE status = 'APPROVED' AND role IN ('ADMIN', 'MEMBER');

    -- Check if cap reached
    IF v_active_count >= v_max_cap THEN
      RAISE EXCEPTION 'HACKSPIRE_CAP_REACHED: HackSpire membership is capped at % members only. No further members can be approved.', v_max_cap;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_hackspire_cap ON public.users;
CREATE TRIGGER trg_enforce_hackspire_cap
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_hackspire_member_cap();

-- ==============================================================================
-- INITIAL SEEDS: Founder Akash & Team Member Aslam Javeed
-- ==============================================================================
-- Default scrypt password hash for initial admin (HackSpire-Admin-123!)
-- Hash format: salt:key
INSERT INTO public.users (name, email, password_hash, role, display_role, status, bio, interests)
VALUES (
  'Akash',
  'admin@hackspire.local',
  '4f8d29b01c38e74561a0b3e5d7f9c2a1:e3f5b721e90acbd018361738e401826da4e7a892b152d19f6a27e3d1c4b5093f48a609d173bc5e90d81023c914bf82b0b1c098df4923e10fa8c3d9a102476591',
  'ADMIN',
  'FOUNDER & ADMIN',
  'APPROVED',
  'Founder & Admin of HackSpire. Cybersecurity | Penetration Testing | Active Directory | CTF.',
  'Cybersecurity, Penetration Testing, Active Directory, CTF'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (name, email, password_hash, role, display_role, status, bio, interests)
VALUES (
  'Aslam Javeed',
  'aslam@hackspire.local',
  '4f8d29b01c38e74561a0b3e5d7f9c2a1:e3f5b721e90acbd018361738e401826da4e7a892b152d19f6a27e3d1c4b5093f48a609d173bc5e90d81023c914bf82b0b1c098df4923e10fa8c3d9a102476591',
  'MEMBER',
  'CORE TEAM MEMBER',
  'APPROVED',
  'Core Team Member of HackSpire. Red Teaming & Cloud Security.',
  'Red Teaming, Cloud Security, Network Defense'
)
ON CONFLICT (email) DO NOTHING;

-- Initial Announcement
INSERT INTO public.announcements (title, body, created_by)
SELECT 'Welcome to HackSpire v1.0', 'Platform initialized with Supabase database backing and a hard cap of 10 members.', id
FROM public.users WHERE email = 'admin@hackspire.local'
LIMIT 1;
