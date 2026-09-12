# HackSpire — Supabase & Vercel Deployment Guide

This guide walks you through setting up your **Supabase database (enforced for 10 members only)** and deploying HackSpire to **Vercel**.

---

## Part 1: Supabase Database Setup (10 Members Only)

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and log in or create a free account.
2. Click **"New Project"**.
3. Fill in:
   - **Name**: `hackspire`
   - **Database Password**: Choose a strong password and save it safely.
   - **Region**: Select a region close to your target users.
4. Click **"Create new project"** and wait ~1-2 minutes for the database to provision.

### Step 2: Run the SQL Schema & 10-Member Hard Cap Trigger
1. In your Supabase Dashboard, click on **SQL Editor** in the left sidebar (icon with `>_`).
2. Click **"New query"**.
3. Open the file [`supabase-schema.sql`](./supabase-schema.sql) in this repository and copy the entire contents.
4. Paste the SQL into the Supabase query editor and click **"Run"** (or press `Ctrl+Enter`).
5. You should see `Success. No rows returned`.

#### What this sets up:
- ✅ **Tables**: `users`, `resources`, `resource_grants`, `announcements`, `audit_logs`, `password_resets`.
- 🛡️ **10-Member Hard Cap Trigger (`trg_enforce_hackspire_cap`)**:
  PostgreSQL will reject any insert or status update to `APPROVED` if active approved members reach 10.
- 🌱 **Seeds**:
  - Founder & Admin: `admin@hackspire.local` (Password: `HackSpire-Admin-123!`)
  - Core Team: `aslam@hackspire.local`
  - Remaining open slots: 8 members.

### Step 3: Copy Supabase API Keys
1. In the Supabase sidebar, go to **Project Settings** (gear icon at the bottom left) -> **API**.
2. Note down:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **Project API Keys**: Copy the **`service_role`** secret key (needed for server-side operations).

---

## Part 2: Deploy to Vercel

### Method A: Deploy via GitHub (Recommended)
1. Push your HackSpire repository to GitHub (or GitLab / Bitbucket).
2. Go to [https://vercel.com](https://vercel.com) and log in.
3. Click **"Add New..."** -> **"Project"**.
4. Import your `hackspire` repository.
5. In the **Configure Project** screen:
   - **Framework Preset**: Select `Other` (or Node.js).
   - **Root Directory**: `./`
   - Expand **Environment Variables** and add the following:

| Variable Name | Value | Description |
|---|---|---|
| `SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Supabase service_role secret key |
| `SESSION_SECRET` | `487f9b2d861d8a1c9e2b4f5a6b7c8d9e0f1a2b3c4d5e` | 32+ character random secret |
| `SECURE_COOKIES` | `1` | Enforces HTTPS Secure cookies in production |
| `MAX_MEMBERS` | `10` | Hard cap limit |

6. Click **"Deploy"**.
7. Vercel will build and deploy your application in under 30 seconds!

---

### Method B: Deploy via Vercel CLI

If you prefer deploying directly from your terminal:

```powershell
# 1. Install Vercel CLI (if not already installed)
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel

# 4. Set Environment Variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add SESSION_SECRET
vercel env add SECURE_COOKIES
vercel env add MAX_MEMBERS

# 5. Deploy to Production
vercel --prod
```

---

## Part 3: Verification & Health Check

1. Visit `https://your-vercel-domain.vercel.app/health` in your browser.
   You should see:
   ```json
   {
     "ok": true,
     "members": 2,
     "max": 10,
     "database": "supabase"
   }
   ```
2. Log in as admin at `/login`:
   - **Email**: `admin@hackspire.local`
   - **Password**: `HackSpire-Admin-123!`
3. Test the membership cap:
   - When 10 members are approved, the public join page (`/register`) automatically displays:
     **"HACKSPIRE MEMBERSHIP IS CURRENTLY FULL"**.
   - Admin approval for an 11th member is blocked both in the dashboard and at the database trigger level.
