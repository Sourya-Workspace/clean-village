# CleanVillage – Smart Waste Complaint, Sanitation Monitoring & Green Rewards System

**Community Service Project (CSP)**  
**Institution:** Vasireddy Venkatadri Institute of Technology (VVIT)  
**Department:** Computer Science and Engineering (CSE)  
**Survey Location:** Pinapadu, Tenali, Andhra Pradesh, India  
**Survey Finding:** 16 out of 20 respondents (80%) identified waste management and sanitation as a major community problem.

---

## 1. Project Overview

**CleanVillage** is a full-stack, mobile-responsive community sanitation web application supporting **villages, towns, cities, districts, and states throughout India**. Citizens can report sanitation problems anywhere in India with photographic evidence and structured geographic coordinates (via interactive map pin, search autocomplete, cascading State/District dropdowns, GPS, or manual locality entry), track complaint resolution timelines, view location-aware waste collection schedules, participate in cleanliness drives (*Shramdaan*), earn **Green Points**, and redeem eco-friendly rewards.

Authorities have a centralized administrative portal across India to verify complaints, review reported location coordinates and evidence (`Not Reviewed`, `Location Reviewed`, `Needs Clarification`, `Location Mismatch Suspected`), assign cleaning tasks to sanitation squads, manage location-specific waste collection routes, monitor overdue complaints against a configurable target SLA, approve/reject reward redemptions, and generate monthly CSV/chart reports.

> **Prototype Notice:** Wherever live Firebase credentials or municipal records are unavailable, CleanVillage operates in a clearly labeled **Interactive Demo Mode** with multi-state India sample data (Andhra Pradesh, Telangana, Karnataka, Maharashtra) and local persistence.

---

## 2. Technology Stack

- **Frontend:** React.js (Vite), JavaScript, Tailwind CSS, React Router v6, Lucide React Icons, Recharts
- **Backend & Database:** Firebase Authentication, Cloud Firestore (`firestore.rules`), Firebase Storage (`storage.rules`), Firebase Cloud Functions (`functions/index.js`), plus automatic LocalStorage Demo Store fallback
- **Maps, Geocoding & Location:**
  - Reusable `IndiaLocationSelector` component (`src/components/IndiaLocationSelector.jsx`)
  - Provider-abstracted India Geocoding & Reverse Geocoding service (`src/services/geocoding.js`) powered by OpenStreetMap Nominatim (`countrycodes=in`) with debounced search, in-memory cache, and duplicate-place disambiguation (District, State, PIN)
  - Cascading all-India States/UTs & Districts dataset + manual entry fallback
  - Browser Geolocation API (with explicit user permission) + OpenStreetMap & Leaflet (`VillageMap.jsx`)

---

## 3. Quick Start & Local Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables (Optional for Firebase Live Mode):**
   Copy `.env.example` to `.env` and fill in your Firebase project keys. If `.env` is omitted, the application automatically runs in **CSP Prototype Demo Mode**.

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

---

## 4. Documented Demo Accounts for Project Evaluation

You can use the **Evaluator Quick Switch** bar at the top of any page, or sign in via `/login`:

| Role | Email (`@gmail.com` Required) | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Citizen** | `rameshbabu.pinapadu@gmail.com` | `Citizen@123` | Submit complaints, track timelines, earn/redeem Green Points, join drives |
| **Sole Village Admin (Only 1 Admin)** | `cleanvillage.admin@gmail.com` | `Admin@123` | Verify/reject complaints, assign tasks, manage schedules & rewards, export reports |
