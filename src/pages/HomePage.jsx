import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ShieldCheck,
  Wrench,
  Award,
  Truck,
  Calendar,
  MapPin,
  ArrowRight,
  Trash2,
  Flame,
  Droplets,
  Trees,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { formatLocationLabel } from '../services/geocoding';

export default function HomePage() {
  const {
    complaints,
    tasks,
    users,
    schedules,
    rewards,
    activities,
    selectedLocation,
    setIsLocationModalOpen,
    clearSelectedLocation,
    matchesLocationFilter,
  } = useApp();

  const filteredComplaints = complaints.filter((c) => matchesLocationFilter(c, selectedLocation));
  const filteredSchedules = schedules.filter((s) => s.active && matchesLocationFilter(s, selectedLocation));
  const filteredActivities = activities.filter((a) => matchesLocationFilter(a, selectedLocation));

  const totalReported = filteredComplaints.length;
  const resolvedCount = filteredComplaints.filter((c) => c.status === 'Resolved').length;
  const activeTasksCount = tasks.filter((t) => t.status === 'Assigned' || t.status === 'In Progress').length;
  const participatingHouseholds = users.filter((u) => u.role === 'citizen').length + 40;

  const commonProblems = [
    {
      title: 'Garbage Dumping',
      desc: 'Unsegregated waste piles on vacant plots, roadsides, or canal bunds.',
      icon: Trash2,
      color: 'text-emerald-700 bg-emerald-100',
    },
    {
      title: 'Overflowing Dustbin',
      desc: 'Community bins exceeding capacity near schools, markets, or residential lanes.',
      icon: AlertCircle,
      color: 'text-amber-700 bg-amber-100',
    },
    {
      title: 'Drainage Blockage',
      desc: 'Plastic debris choking side drains and causing stagnant water.',
      icon: Droplets,
      color: 'text-blue-700 bg-blue-100',
    },
    {
      title: 'Open Waste Burning',
      desc: 'Hazardous burning of dry leaves and plastics releasing toxic smoke.',
      icon: Flame,
      color: 'text-red-700 bg-red-100',
    },
  ];

  // Mask citizen full name for public privacy
  const maskName = (name) => {
    if (!name) return 'Community Resident';
    const parts = name.split(' ');
    return `${parts[0]} ${parts[1] ? parts[1].charAt(0) + '.' : ''}`;
  };

  const activeLocationLabel = selectedLocation
    ? formatLocationLabel(selectedLocation)
    : 'Location: Select your village or city';

  return (
    <div className="space-y-16">
      {/* HERO SECTION WITH INDIA-WIDE CLEAN & GREEN BRANDING */}
      <section className="relative overflow-hidden leaf-bg-pattern text-white pt-10 pb-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/90 border border-emerald-500/40 text-emerald-200 text-xs font-semibold">
                <Trees className="w-4 h-4 text-emerald-400" />
                <span>Every Village. Every Community. A Cleaner Tomorrow.</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Together for a <span className="text-emerald-400">Cleaner, Greener India</span>
              </h1>

              <p className="text-base sm:text-lg text-emerald-100/90 max-w-2xl leading-relaxed">
                Help create cleaner communities by reporting sanitation problems, tracking cleaning progress, and participating in responsible waste management.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  to="/report-problem"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition"
                >
                  <AlertCircle className="w-4 h-4" />
                  Report a Sanitation Issue
                </Link>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-500/40 transition"
                >
                  Explore CleanVillage
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Dedicated Compact India Location Control inside Hero */}
              <div className="pt-2">
                <div className="inline-flex flex-wrap items-center gap-2.5 p-2.5 rounded-2xl bg-forest-950/85 border border-emerald-600/40">
                  <div className="flex items-center gap-2 px-2 text-xs text-emerald-100">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-semibold">{activeLocationLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
                  >
                    {selectedLocation ? 'Change Location' : 'Choose Village / City'}
                  </button>
                  {selectedLocation && (
                    <button
                      type="button"
                      onClick={clearSelectedLocation}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-900 hover:bg-emerald-800 text-emerald-200"
                    >
                      <RotateCcw className="w-3 h-3" />
                      All India
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Clean Green Community Street & Segregation Bins Visual */}
            <div className="lg:col-span-5">
              <div className="bg-gradient-to-b from-emerald-900/90 to-forest-950 p-4 rounded-3xl border border-emerald-600/40 shadow-2xl">
                <svg
                  viewBox="0 0 520 380"
                  className="w-full h-auto rounded-2xl"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#065f46" />
                      <stop offset="100%" stopColor="#047857" />
                    </linearGradient>
                    <linearGradient id="grassGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#15803d" />
                      <stop offset="100%" stopColor="#166534" />
                    </linearGradient>
                  </defs>
                  <rect width="520" height="380" fill="url(#skyGrad)" />
                  <circle cx="430" cy="65" r="32" fill="#fbbf24" opacity="0.85" />
                  <path d="M0 230 Q130 175 270 220 T520 205 L520 380 L0 380 Z" fill="#064e3b" />
                  <path d="M0 265 Q180 230 350 260 T520 250 L520 380 L0 380 Z" fill="url(#grassGrad)" />
                  <polygon points="190,260 310,260 430,380 70,380" fill="#334155" />
                  <line x1="250" y1="265" x2="250" y2="380" stroke="#fde047" strokeWidth="4" strokeDasharray="12 10" />
                  <g transform="translate(35, 115)">
                    <rect x="38" y="90" width="16" height="65" fill="#78350f" rx="4" />
                    <circle cx="46" cy="55" r="44" fill="#22c55e" />
                    <circle cx="20" cy="75" r="32" fill="#16a34a" />
                    <circle cx="72" cy="75" r="32" fill="#4ade80" />
                  </g>
                  <g transform="translate(385, 110)">
                    <rect x="34" y="95" width="14" height="65" fill="#78350f" rx="4" />
                    <circle cx="41" cy="55" r="42" fill="#4ade80" />
                    <circle cx="18" cy="75" r="30" fill="#22c55e" />
                    <circle cx="66" cy="75" r="30" fill="#16a34a" />
                  </g>
                  <g transform="translate(155, 155)">
                    <rect x="0" y="40" width="90" height="65" fill="#fef3c7" rx="4" />
                    <polygon points="-8,42 45,5 98,42" fill="#d97706" />
                    <rect x="33" y="65" width="24" height="40" fill="#78350f" rx="2" />
                    <rect x="10" y="55" width="16" height="16" fill="#0284c7" rx="2" />
                    <rect x="64" y="55" width="16" height="16" fill="#0284c7" rx="2" />
                  </g>
                  <g transform="translate(310, 225)">
                    <rect x="0" y="15" width="34" height="44" rx="5" fill="#16a34a" stroke="#bbf7d0" strokeWidth="1.5" />
                    <rect x="-2" y="10" width="38" height="7" rx="3" fill="#15803d" />
                    <text x="17" y="41" fontSize="9" fontWeight="bold" fill="#ffffff" textAnchor="middle">WET</text>
                    <rect x="44" y="15" width="34" height="44" rx="5" fill="#0284c7" stroke="#bae6fd" strokeWidth="1.5" />
                    <rect x="42" y="10" width="38" height="7" rx="3" fill="#0369a1" />
                    <text x="61" y="41" fontSize="9" fontWeight="bold" fill="#ffffff" textAnchor="middle">DRY</text>
                  </g>
                  <rect x="16" y="322" width="488" height="44" rx="10" fill="#052e16" fillOpacity="0.88" />
                  <text x="260" y="342" fontSize="12" fontWeight="bold" fill="#4ade80" textAnchor="middle">
                    CLEANVILLAGE INDIA • SMART SANITATION &amp; TWO-BIN SEGREGATION
                  </text>
                  <text x="260" y="358" fontSize="10" fill="#dcfce7" textAnchor="middle">
                    Villages, Towns &amp; Communities Across India
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IMPACT STATISTICS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="bg-white rounded-3xl border border-emerald-100 shadow-lg p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Community Sanitation Impact Overview
              </h2>
              <p className="text-xs text-slate-500">
                {selectedLocation
                  ? `Showing metrics filtered for ${formatLocationLabel(selectedLocation)}`
                  : 'Showing metrics across all participating Indian communities'}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Demo Statistics
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
              <p className="text-xs font-semibold text-emerald-800 uppercase">Total Complaints Reported</p>
              <p className="text-3xl font-extrabold text-forest-900 mt-2">{totalReported}</p>
              <p className="text-xs text-emerald-700 mt-1">Photo &amp; location-tagged reports</p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
              <p className="text-xs font-semibold text-emerald-800 uppercase">Complaints Resolved</p>
              <p className="text-3xl font-extrabold text-emerald-700 mt-2">{resolvedCount}</p>
              <p className="text-xs text-emerald-700 mt-1">Verified with completion remarks</p>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
              <p className="text-xs font-semibold text-amber-900 uppercase">Active Cleaning Tasks</p>
              <p className="text-3xl font-extrabold text-amber-700 mt-2">{activeTasksCount}</p>
              <p className="text-xs text-amber-800 mt-1">Assigned to local sanitation teams</p>
            </div>

            <div className="p-5 rounded-2xl bg-teal-50/70 border border-teal-200/80">
              <p className="text-xs font-semibold text-teal-900 uppercase">Participating Households</p>
              <p className="text-3xl font-extrabold text-teal-800 mt-2">{participatingHouseholds}</p>
              <p className="text-xs text-teal-700 mt-1">Active across villages &amp; wards</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - 4-STEP PROCESS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
            Transparent 4-Step Workflow
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
            How CleanVillage Works
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Designed so residents in any village, town, or locality across India can report sanitation issues and track resolution transparently.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: '1. Report',
              desc: 'Describe a sanitation issue, upload photographic evidence, and share GPS, map, or manual street location.',
              icon: AlertCircle,
              badge: 'Citizen Action',
            },
            {
              step: '02',
              title: '2. Verify',
              desc: 'The Authority reviews location and photo evidence, verifies genuine complaints, or documents reasons if rejected.',
              icon: ShieldCheck,
              badge: 'Authority Review',
            },
            {
              step: '03',
              title: '3. Resolve',
              desc: 'A cleaning task is assigned to the local sanitation squad and completed with after-cleaning proof.',
              icon: Wrench,
              badge: 'Field Cleaning',
            },
            {
              step: '04',
              title: '4. Reward',
              desc: 'Eligible verified complaints (+10 pts) and cleanliness drive participation (+20 pts) earn Green Points.',
              icon: Award,
              badge: 'Green Rewards',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm hover:shadow-md transition relative overflow-hidden"
              >
                <span className="text-4xl font-black text-emerald-100 absolute top-3 right-4 select-none">
                  {item.step}
                </span>
                <div className="w-11 h-11 rounded-xl bg-forest-800 text-white flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                  {item.badge}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2">{item.title}</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* COMMON SANITATION PROBLEMS & LATEST UPDATES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Common Sanitation Problems */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase">Community Monitoring</span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">Common Sanitation Issues</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Report any of these community cleanliness issues in your village, town, or ward
            </p>
          </div>

          <div className="space-y-3">
            {commonProblems.map((prob) => {
              const Icon = prob.icon;
              return (
                <div
                  key={prob.title}
                  className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${prob.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{prob.title}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">{prob.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <Link
            to="/report-problem"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white transition"
          >
            Report a Sanitation Issue Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Latest Complaint Updates (Privacy-Conscious) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase">Live Transparency Feed</span>
                <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  Latest Community Complaint Updates
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-forest-800 font-semibold border border-emerald-200"
                >
                  {selectedLocation ? `Filtered: ${formatLocationLabel(selectedLocation)}` : 'Filter by Location'}
                </button>
              </div>
            </div>

            {filteredComplaints.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl space-y-2">
                <p className="text-sm font-bold text-slate-800">
                  No complaints have been reported for this selected location yet.
                </p>
                <div className="flex justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={clearSelectedLocation}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-forest-900"
                  >
                    Show All India Updates
                  </button>
                  <Link
                    to="/report-problem"
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-forest-800 text-white"
                  >
                    Report an Issue Here
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredComplaints.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl border border-emerald-100 hover:bg-emerald-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-forest-800 bg-emerald-100 px-2 py-0.5 rounded">
                          {c.id}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">{c.category}</span>
                        <span className="text-[11px] text-slate-400">• Reported by {maskName(c.userName)}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{c.title}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        {[c.village_name || c.city_name, c.district_name, c.state_name]
                          .filter(Boolean)
                          .join(', ') || c.area}
                      </p>
                    </div>
                    <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                      <StatusBadge status={c.status} />
                      <span className="text-[11px] text-slate-400">
                        {new Date(c.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Exact GPS coordinates and personal contact details are protected on public views.</span>
            <Link to="/citizen/dashboard" className="font-bold text-forest-800 hover:underline">
              Track My Complaints →
            </Link>
          </div>
        </div>
      </section>

      {/* WASTE COLLECTION SCHEDULE PREVIEW & UPCOMING CLEANLINESS DRIVES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Schedule Preview */}
        <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase">Door-to-Door Pickup</span>
              <h2 className="text-xl font-extrabold text-slate-900">Waste Collection Schedule Preview</h2>
            </div>
            <Truck className="w-6 h-6 text-emerald-600" />
          </div>

          {filteredSchedules.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
              <p className="text-xs font-bold text-slate-800">
                No collection schedules have been published for this location yet.
              </p>
              <button
                type="button"
                onClick={clearSelectedLocation}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-forest-900"
              >
                View All Published Schedules
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredSchedules.slice(0, 3).map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-forest-800 text-white">
                        {s.wasteType}
                      </span>
                      <span className="text-xs font-semibold text-emerald-900">{s.collectionDay}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mt-1">{s.area}</p>
                    <p className="text-xs text-slate-600">
                      {s.scheduledTime} • {s.assignedTeam}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                    {s.nextCollectionDate}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Link
            to="/schedule"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-800 hover:text-emerald-600"
          >
            View Location-Wise Collection Timetable
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Upcoming Cleanliness Drives */}
        <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase">Shramdaan &amp; Plantation</span>
              <h2 className="text-xl font-extrabold text-slate-900">Upcoming Cleanliness Drives</h2>
            </div>
            <Calendar className="w-6 h-6 text-emerald-600" />
          </div>

          {filteredActivities.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
              <p className="text-xs font-bold text-slate-800">
                No cleanliness drives scheduled for this specific location yet.
              </p>
              <button
                type="button"
                onClick={clearSelectedLocation}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-forest-900"
              >
                Show All Upcoming Drives
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((act) => (
                <div key={act.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      +{act.pointsAwarded} Green Points (On Confirmed Attendance)
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{act.date}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{act.title}</h3>
                  <p className="text-xs text-slate-600">
                    📍 {act.location} • 🕒 {act.time}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Link
            to="/citizen/activities"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-800 hover:text-emerald-600"
          >
            Register for Community Cleanliness Drives
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* GREEN REWARDS & WASTE SEGREGATION AWARENESS PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="village-canopy-bg rounded-3xl p-6 sm:p-10 text-white grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-extrabold">
              <Award className="w-3.5 h-3.5" />
              Green Rewards &amp; Segregation Awareness
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold">
              Earn Green Points for Keeping Your Community Clean
            </h2>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              Every verified sanitation report earns <strong>+10 Green Points</strong>, confirmed attendance at a community cleanliness drive earns <strong>+20 Green Points</strong>, and completing household segregation awareness earns <strong>+5 Green Points</strong>. Redeem points for nursery saplings, vermicompost packs, and community appreciation certificates!
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/citizen/rewards"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition"
              >
                Explore Rewards Catalog
              </Link>
              <Link
                to="/awareness"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-500/40 transition"
              >
                Learn Two-Bin Waste Segregation
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            {rewards.map((rew) => (
              <div
                key={rew.id}
                className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-emerald-400/30 space-y-1.5"
              >
                <span className="inline-block px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[11px] font-extrabold">
                  {rew.pointsCost} Pts
                </span>
                <h3 className="text-xs font-bold text-white leading-snug">{rew.title}</h3>
                <p className="text-[11px] text-emerald-200">Stock: {rew.stock} available (Demo)</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
