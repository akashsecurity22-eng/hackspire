# HackSpire — Cybersecurity Community Platform

**LEARN. BUILD. HACK. GROW.** — *Don't learn cybersecurity alone.*

Full-stack Node.js (zero dependencies, Node 22+) + SQLite (`node:sqlite`) application.

## Quick start

```powershell
node server.js
# open http://localhost:3000
```

Default admin seed:

- Email: `admin@hackspire.local`
- Password: `HackSpire-Admin-123!` (change immediately via DB/env in production)

Set env via `.env` (see `.env.example`): `PORT`, `SECURE_COOKIES=1` in production, `SESSION_SECRET`, `MAX_MEMBERS=10`.

## Routes

Public: `/ /about /learning /team /team/aslam-javeed /founder/akash /events /community /login /register /forgot-password`
Member: `/dashboard /resources /labs /ctf /profile` + `/resources/:id/download` (server-side 403 without grant)
Admin (ADMIN only): `/admin/dashboard?tab=overview|members|resources|announcements|ctf|audit`

## Rules enforced

- Full red theme only, no Projects section, only event is Active Directory CTF.
- Only people: Akash (Founder & Admin), Aslam Javeed (Team Member).
- Hard cap 10 active members enforced on register + approve/enable paths; full state shows HACKSPIRE MEMBERSHIP IS CURRENTLY FULL.
- Resources uploaded by Admin with visibility ALL / SELECTED / PRIVATE; downloads verify grant server-side (403 otherwise); audit logged.
- scrypt password hashing, HttpOnly SameSite cookies, CSRF tokens, rate limits, security headers, upload MIME/size validation.

## QA

- `GET /health` returns `{ok,members,max}`.
- Verified: all public routes 200, member/admin guards 401/403, private resource 403 then 200 after grant, 10/10 cap blocks register, no blue/cyan in CSS, no projects nav.
