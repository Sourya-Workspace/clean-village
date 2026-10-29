# CleanVillage – Smart Waste Complaint, Sanitation Monitoring & Green Rewards System

**CleanVillage** is a full-stack, mobile-responsive community sanitation web application supporting **villages, towns, cities, districts, and states throughout India**.

Citizens can report sanitation problems anywhere in India with photographic evidence and structured geographic coordinates (via interactive map pin, search autocomplete, cascading State/District dropdowns, GPS, or manual locality entry), track an 8-stage complaint resolution lifecycle (`submitted`, `under_review`, `verified`, `worker_assigned`, `in_progress`, `resolved`, `reopened`, `rejected`), receive persistent real-time notifications, view location-aware waste collection schedules, participate in cleanliness drives (_Shramdaan_), earn **Green Points** with duplicate-award prevention, and redeem eco-friendly rewards.

Administrators have a centralized portal to receive real-time **Incoming Complaints**, inspect citizen-uploaded evidence and map coordinates, record location reviews, transition complaint statuses through permitted workflow actions, assign sanitation workers, and export monthly reports—while enforcing strict citizen complaint privacy via **Supabase Row Level Security (RLS)**.

---

## 1. Architecture & Key Files

- **Reusable Supabase Client (Auth, PostgREST, Storage, RPC & Realtime WebSockets):** [`src/services/supabase.js`](src/services/supabase.js)
- **PostgreSQL Schema, Triggers, Atomic RPCs & RLS Policies:** [`supabase/migrations/20261028000001_cleanvillage_schema_rls_notifications.sql`](supabase/migrations/20261028000001_cleanvillage_schema_rls_notifications.sql)
- **Secure Server-Side Administrator Provisioning Script:** [`scripts/provision-admin.mjs`](scripts/provision-admin.mjs) (`npm run provision:admin`)
- **Environment Variable Template (Placeholders Only):** [`.env.example`](.env.example)
- **Notification Bell & Dropdown Center:** [`src/components/NotificationBellPanel.jsx`](src/components/NotificationBellPanel.jsx)
- **6-Stage Complaint Progress Timeline & History Log:** [`src/components/ComplaintProgressTimeline.jsx`](src/components/ComplaintProgressTimeline.jsx)
- **8-Stage Status Badges & Permitted Transition Rules:** [`src/components/StatusBadge.jsx`](src/components/StatusBadge.jsx)
- **Unified Supabase + Local Demo Mode Context:** [`src/context/AppContext.jsx`](src/context/AppContext.jsx)

---

## 2. Complete Supabase Setup & Configuration Guide (9 Steps)

> **Important Note on Current Workspace Status:**
> This workspace currently has no `.env` file configured with live Supabase credentials. Until you complete Steps 1–6 below, the application automatically runs in **Local Demo Mode** (clearly indicated in the UI). Do not treat cross-device persistence or the live administrator account as active until you connect your Supabase project and run the migration + provisioning script.

### Step 1: Create a Supabase Project

1. Sign in to [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Click **New Project**, select your organization, enter a project name (e.g., `cleanvillage-india`), set a strong database password, and select a region close to your users (e.g., `ap-south-1` Mumbai).
3. Wait ~1–2 minutes for the PostgreSQL database and Auth services to finish provisioning.

### Step 2: Find Your Project URL and Publishable / Anonymous Key

1. In your Supabase Dashboard, open **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** (`https://<your-project-ref>.supabase.co`).
3. Under **Project API keys**, copy:
   - **`anon` / `public` key** (safe for browser use via `VITE_SUPABASE_ANON_KEY`).
   - **`service_role` secret key** (server-side only — **NEVER** expose this in `VITE_*` variables, frontend code, or GitHub).

### Step 3: Configure Environment Variables Locally

1. Copy `.env.example` to `.env` in the project root:
   ```bash
   cp .env.example .env
   ```
   _(On Windows PowerShell: `Copy-Item .env.example .env`)_
2. Open `.env` (which is ignored by `.gitignore`) and fill in your Supabase URL and keys:

   ```env
   # Frontend variables (exposed to Vite browser bundle)
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-public-key-here
   VITE_FORCE_DEMO_MODE=false

   # Server-side variables (used ONLY by scripts/provision-admin.mjs)
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-secret-key-here
   ```

### Step 4: Apply the SQL Migrations (Schema, Triggers, Storage & RLS)

1. In your Supabase Dashboard, open **SQL Editor** → **New query**.
2. Open [`supabase/migrations/20261028000001_cleanvillage_schema_rls_notifications.sql`](supabase/migrations/20261028000001_cleanvillage_schema_rls_notifications.sql), copy its entire contents, paste it into the Supabase SQL Editor, and click **Run**.
3. This single idempotent migration creates:
   - `public.profiles` (with `role IN ('citizen', 'authority')`, `green_points`, and auto-creation trigger on `auth.users` signup forcing public signups to `'citizen'`).
   - `public.complaints` (8-stage status workflow, all-India location fields, coordinates, location review status, worker assignment, and resolution notes).
   - `public.complaint_history` & `public.citizen_complaint_timeline` (separating `public_update_message` from `internal_admin_note`).
   - `public.green_points_transactions` (with `UNIQUE (user_id, event_type, reference_id)` anti-duplicate constraint and `award_green_points_atomic` RPC).
   - `public.notifications` (persistent per-user notifications for `complaint_submitted`, `complaint_status_change`, `green_points`, and `new_complaint`, plus Realtime publication).
   - `public.transition_complaint_status` RPC (enforcing role & state transition rules, history logging, citizen status notifications, and automatic `+10` Green Points on first verification).
   - Storage bucket `complaint-evidence` with RLS policies for citizen evidence uploads and authenticated viewing.

### Step 5: Configure Authentication & Email Redirect URLs

1. In your Supabase Dashboard, go to **Authentication** → **Providers** → **Email**:
   - Ensure **Enable Email provider** is turned ON.
   - For immediate cross-device testing without waiting for email verification links, you can toggle **Confirm email** OFF (or keep it ON for production email verification).
2. Go to **Authentication** → **URL Configuration**:
   - Set **Site URL** to your primary frontend URL (e.g., `http://localhost:5173` during local development, or your production Vercel URL `https://your-cleanvillage-app.vercel.app`).
   - Under **Redirect URLs**, add:
     - `http://localhost:5173/**`
     - `https://your-cleanvillage-app.vercel.app/**`

### Step 6: Provision the Administrator Account Securely

Administrator accounts cannot be registered from the public signup page, and administrator credentials are never hardcoded in the repository.

1. Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in your local `.env`.
2. Run the server-side provisioning script:
   ```bash
   npm run provision:admin
   ```
3. If `ADMIN_PROVISION_EMAIL` and `ADMIN_PROVISION_PASSWORD` are not set in `.env`, the CLI will prompt you privately for:
   - Administrator `@gmail.com` address
   - Strong password (minimum 8 characters)
   - Administrator display name
4. The script uses the Supabase Admin API (`service_role`) to create/update the Auth user and set `role = 'authority'` in `public.profiles`.

### Step 7: Configure Environment Variables in Vercel (Production Deployment)

1. Push your repository to GitHub (verify `.env` is **not** staged using `git status`).
2. Import the repository into [Vercel](https://vercel.com).
3. In Vercel **Project Settings** → **Environment Variables**, add **only** the public frontend variables:
   - `VITE_SUPABASE_URL` = `https://your-project-ref.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-supabase-anon-public-key-here`
   - `VITE_FORCE_DEMO_MODE` = `false`
     _(Never add `SUPABASE_SERVICE_ROLE_KEY` or `ADMIN_PROVISION_PASSWORD` to Vercel frontend builds.)_
4. Deploy and add your Vercel domain to Supabase **Authentication → URL Configuration**.

### Step 8: Test Signup on One Laptop and Login on Another

1. On **Laptop / Device 1**, open the deployed (or networked) CleanVillage site, go to `/signup`, and register a new citizen account with a `@gmail.com` email and password.
2. Submit a complaint with a photo and India location from **Device 1**.
3. On **Laptop / Device 2** (or a separate browser/device), open `/login` and sign in with the exact same citizen email and password.
4. Verify that your profile, Green Points balance, submitted complaint, and notifications load from Supabase across both devices.

### Step 9: Test Notifications, Complaint Tracking, Green Points & Access Permissions (Scenarios A–G)

1. **Scenario A (Complaint Submission):** Submit a complaint as Citizen A (`citizenA@gmail.com`). Verify Citizen A immediately sees `"Complaint Submitted Successfully"` in the notification bell (`+1` unread badge) and the complaint appears in **My Complaints** with status `Submitted` (`submitted`). Verify the Administrator receives `"New Sanitation Complaint Received"`.
2. **Scenario B (Citizen Privacy & Isolation):** Sign in as Citizen B (`citizenB@gmail.com`) or use the Demo Mode **Citizen A / Citizen B** switcher. Verify Citizen B cannot see Citizen A's complaint in **Citizen Dashboard** or **My Complaints**. Navigate directly to `/citizen/complaints/<Citizen-A-Complaint-ID>` as Citizen B and verify access is blocked with the **Access Restricted — Private Citizen Record** screen.
3. **Scenario C (Status Change Notifications):** Sign in as Administrator, open Citizen A's complaint from **Incoming Complaints**, and click **Mark Under Review** (`under_review`) or **Verify Complaint (+10 Green Pts)** (`verified`). Verify Citizen A receives a notification with the updated status and timestamp, and the 6-stage **Live Complaint Progress Tracker** advances.
4. **Scenario D (Worker Assignment & Resolution):** As Administrator, assign a sanitation worker (`worker_assigned`), mark **Start Cleaning (In Progress)** (`in_progress`), and then **Mark Problem Resolved** (`resolved`) with resolution notes. Verify Citizen A receives notifications at each step and sees all 6 timeline stages completed.
5. **Scenario E (Green Points Notification & Duplicate Prevention):** When Citizen A's complaint is verified (or when Citizen A completes the Segregation Awareness Pledge on `/awareness`), verify Citizen A receives `"Green Points Credited!"` with exact points, reason, and updated balance. Verify re-saving or repeating the same action does not award duplicate points (`UNIQUE (user_id, event_type, reference_id)`).
6. **Scenario F (Admin Incoming Feed):** Verify the Administrator Dashboard and **Incoming Complaints** page (`/authority/complaints`) display all citizen complaints with their actual uploaded photo (or `"No photograph was attached to this complaint."` when none was uploaded), description, coordinates, and workflow buttons.
7. **Scenario G (Notification Persistence):** Refresh the browser page (`F5`): unread badge counts and read/unread states persist. Click **Mark as Read** or **Mark all read** and refresh again to verify the updated read state persists.

---

## 3. Local Development Commands

```bash
# Start development server
npm run dev

# Provision administrator account (requires SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY in .env)
npm run provision:admin

# Build production bundle
npm run build
```
