import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  MapPin,
  CheckCircle2,
  Search,
  Bell,
  HelpCircle,
  Lock,
  Trees,
  RotateCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { INDIA_STATES_AND_UTS, formatLocationLabel } from '../services/geocoding';

/* 1. ABOUT THE PROJECT PAGE */
export function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="village-canopy-bg rounded-3xl p-8 text-white space-y-3">
        <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-extrabold">
          Every Village. Every Community. A Cleaner Tomorrow.
        </span>
        <h1 className="text-3xl font-extrabold">About CleanVillage</h1>
        <p className="text-sm text-emerald-100 max-w-3xl leading-relaxed">
          CleanVillage – Smart Waste Complaint, Sanitation Monitoring &amp; Green Rewards System is a scalable community sanitation platform supporting villages, towns, and localities across India.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-forest-800 font-bold">
            <Trees className="w-5 h-5 text-emerald-600" />
            <h2>Core Platform Objectives</h2>
          </div>
          <ul className="text-xs sm:text-sm text-slate-600 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Enable citizens across Indian states and union territories to report sanitation issues with photographic evidence and map/GPS or manual location.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Provide end-to-end complaint lifecycle tracking (Pending → Verified → In Progress → Resolved / Rejected).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Empower authorities with location verification, task assignment, SLA overdue monitoring, and analytics.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Motivate citizens via anti-abuse Green Points and eco-friendly community rewards.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-forest-800 font-bold">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
            <h2>Academic Community Service Project Attribution</h2>
          </div>
          <ul className="text-xs sm:text-sm text-slate-600 space-y-2 leading-relaxed">
            <li><strong>Project Type:</strong> Community Service Project (CSP)</li>
            <li><strong>Institution:</strong> Vasireddy Venkatadri Institute of Technology (VVIT)</li>
            <li><strong>Department:</strong> Computer Science and Engineering (CSE)</li>
            <li><strong>Initial Field Study:</strong> Inspired by community sanitation field research in Pinapadu, Tenali, Andhra Pradesh (where 16 of 20 surveyed households highlighted waste management as a primary community concern), and architected to serve communities across all of India.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* 2. HOW IT WORKS PAGE */
export function HowItWorksPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="bg-white rounded-3xl border border-emerald-100 p-8 shadow-sm space-y-3">
        <span className="text-xs font-bold text-emerald-700 uppercase">Step-by-Step Guide</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          How CleanVillage Works for Citizens &amp; Authorities
        </h1>
        <p className="text-sm text-slate-600">
          Every complaint, location review, cleaning task, and Green Point transaction follows transparent validation rules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-forest-900">Citizen Workflow</h2>
          <ol className="space-y-3 text-xs sm:text-sm text-slate-600 list-decimal list-inside">
            <li><strong>Select Your Location:</strong> Choose any village, town, city, district, or state in India via the interactive map or dropdown search.</li>
            <li><strong>Submit a Sanitation Report:</strong> Choose one of 8 categories, upload a photo (JPEG/PNG/WebP), and capture the problem's location via GPS, interactive map marker, or manual entry.</li>
            <li><strong>Receive Unique ID:</strong> System generates an atomic ID (e.g., <code>CV-2026-0001</code>) with initial status <strong>Pending</strong>.</li>
            <li><strong>Track Progress Online:</strong> View status timeline, assigned sanitation squad, authority remarks, and after-resolution photo.</li>
            <li><strong>Earn &amp; Redeem Green Points:</strong> Receive +10 points when a complaint is verified, +20 points for confirmed cleanliness drive attendance, and +5 points for segregation awareness.</li>
          </ol>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-forest-900">Authority Workflow</h2>
          <ol className="space-y-3 text-xs sm:text-sm text-slate-600 list-decimal list-inside">
            <li><strong>Inspect Evidence &amp; Location:</strong> Review uploaded photos, reported address, and map coordinates in the "Reported Location &amp; Evidence" panel.</li>
            <li><strong>Record Location Review:</strong> Mark administrative location review status (Location Reviewed, Needs Clarification, or Location Mismatch Suspected).</li>
            <li><strong>Verify or Reject:</strong> Verify genuine reports (+10 Green Points awarded once) or reject invalid ones with a mandatory reason.</li>
            <li><strong>Assign Cleaning Task:</strong> Create a task (e.g., <code>TASK-2026-101</code>) for a sanitation squad with priority and target date.</li>
            <li><strong>Complete &amp; Resolve:</strong> Record completion remarks and after-cleaning evidence to transition the complaint to <strong>Resolved</strong>.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

/* 3. COMMUNITY IMPACTPAGE */
export function CommunityImpactPage() {
  const { publicAggregateStats } = useApp();

  const stateBreakdown = [
    { state: 'Andhra Pradesh', reports: 2 },
    { state: 'Telangana', reports: 1 },
    { state: 'Karnataka', reports: 1 },
    { state: 'Maharashtra', reports: 1 },
  ];

  const resolvedAndVerified =
    (publicAggregateStats?.resolvedCount ?? 0) + (publicAggregateStats?.verifiedCount ?? 0);
  const inProgressAndSubmitted = Math.max(
    1,
    (publicAggregateStats?.totalReported ?? 0) - resolvedAndVerified
  );

  const statusShare = [
    { name: 'Resolved & Verified', value: Math.max(1, resolvedAndVerified), fill: '#16a34a' },
    { name: 'In Progress / Submitted', value: inProgressAndSubmitted, fill: '#f59e0b' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="village-canopy-bg rounded-3xl p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-extrabold">
            Community Sanitation Impact (Demo Analytics)
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Community Impact &amp; Participation</h1>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl">
            Tracking sanitation resolution, waste segregation awareness, and community participation across Indian states and localities.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1">Active Resolution Share</h2>
          <p className="text-xs text-slate-500 mb-4">Proportion of verified and resolved community reports</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusShare} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                  {statusShare.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1">Reports by Participating State (Demo Data)</h2>
          <p className="text-xs text-slate-500 mb-4">Multi-state coverage across India</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateBreakdown} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="state" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="reports" fill="#15803d" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 4. SANITATION AWARENESS AND WASTE SEGREGATION PAGE */
export function AwarenessPage() {
  const { completeSegregationActivity } = useApp();
  const [pledged, setPledged] = useState(false);

  const topics = [
    {
      title: '1. Wet Waste vs. Dry Waste (Two-Bin System)',
      badge: 'Green Bin & Blue Bin',
      desc: 'Keep biodegradable kitchen waste (vegetable peels, food scraps, tea leaves, garden flowers) in the GREEN BIN. Keep dry recyclables (plastic bottles, paper, cardboard, metal tins, glass) clean and dry in the BLUE BIN.',
    },
    {
      title: '2. Safe Household Waste Disposal',
      badge: 'Daily Habit',
      desc: 'Never throw loose garbage on street corners. Hand over segregated waste directly to the door-to-door sanitation worker during morning collection hours.',
    },
    {
      title: '3. Avoiding Littering in Public Spaces',
      badge: 'Clean Streets',
      desc: 'School roads, temple lanes, bus stops, and lake/canal bunds belong to everyone. Carry a reusable cloth bag and avoid dropping sachets or wrappers in public places.',
    },
    {
      title: '4. Keeping Drains Free of Solid Waste',
      badge: 'Prevent Mosquitoes',
      desc: 'Sweeping plastic covers or coconut shells into open side drains causes water logging, foul odor, and malaria/dengue mosquito breeding.',
    },
    {
      title: '5. Risks Associated with Open Waste Burning',
      badge: 'Zero Burning',
      desc: 'Burning plastic, rubber, or mixed dry leaves releases toxic dioxins and particulate smoke that severely harms children, elders, and asthma patients.',
    },
    {
      title: '6. Safe Handling of Household Hazardous & Sanitary Waste',
      badge: 'Wrap & Label',
      desc: 'Wrap sanitary waste, diapers, broken glass, and expired medicines separately in newspaper marked with a red cross so sanitation workers are protected from injury.',
    },
    {
      title: '7. Composting Organic Kitchen & Garden Waste',
      badge: 'Home Composting',
      desc: 'Layer kitchen peels with dry leaves and buttermilk in a terracotta pot or backyard pit to produce rich organic manure for home plants within 45–60 days.',
    },
    {
      title: '8. Reducing Single-Use Plastics',
      badge: 'Eco Alternatives',
      desc: 'Switch to cloth shopping bags, steel tiffins, and biodegradable leaf plates during community functions instead of thin single-use plastic bags and thermocol.',
    },
    {
      title: '9. Maintaining Clean Community Surroundings & Tree Cover',
      badge: 'Green India',
      desc: 'Keep house frontages swept, prevent waste accumulation near water taps, and plant native shade trees like Neem, Pongamia, and Tulsi.',
    },
  ];

  const handleCompletePledge = () => {
    const res = completeSegregationActivity();
    if (res.success) setPledged(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="village-canopy-bg rounded-3xl p-8 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-extrabold">
            Sanitation Awareness &amp; Waste Segregation Guide
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold">
            Learn Proper Waste Segregation for a Greener Community
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
            Simple, practical household practices that reduce landfill load, prevent blocked drains, and turn organic waste into farm-grade compost.
          </p>
        </div>

        <div className="bg-white/10 border border-emerald-400/30 rounded-2xl p-5 space-y-3 shrink-0 w-full lg:w-80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300">Approved Segregation Activity</span>
            <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-xs font-extrabold">+5 Pts</span>
          </div>
          <p className="text-xs text-emerald-100">
            Read the 9 segregation guidelines below and take the Two-Bin Household Pledge to earn +5 Green Points (once per citizen account).
          </p>
          <button
            type="button"
            onClick={handleCompletePledge}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition"
          >
            {pledged ? 'Pledge Completed (+5 Pts Credited)' : 'Complete Segregation Pledge (+5 Pts)'}
          </button>
        </div>
      </div>

      {/* Visual Wet vs Dry Comparison Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-6 space-y-2">
          <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold">
            GREEN BIN • WET WASTE (BIODEGRADABLE)
          </span>
          <h2 className="text-lg font-extrabold text-emerald-950 pt-1">What goes into the Green Bin?</h2>
          <p className="text-xs text-emerald-900 leading-relaxed">
            Vegetable and fruit peels, cooked food leftovers, eggshells, coffee/tea powder, coconut shells, garden leaves, and flowers. Ideal for vermicomposting!
          </p>
        </div>

        <div className="bg-sky-50 border-2 border-sky-500 rounded-2xl p-6 space-y-2">
          <span className="px-2.5 py-1 rounded-full bg-sky-600 text-white text-xs font-bold">
            BLUE BIN • DRY WASTE (RECYCLABLE)
          </span>
          <h2 className="text-lg font-extrabold text-sky-950 pt-1">What goes into the Blue Bin?</h2>
          <p className="text-xs text-sky-900 leading-relaxed">
            Rinsed milk packets, plastic bottles, newspapers, cardboard boxes, metal cans, glass bottles, and clean wrappers. Keep dry so they can be recycled!
          </p>
        </div>
      </div>

      {/* 9 Awareness Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics.map((t) => (
          <div key={t.title} className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-2.5">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-forest-800">
              {t.badge}
            </span>
            <h3 className="text-base font-bold text-slate-900">{t.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 5. LOCATION-AWARE PUBLIC WASTE COLLECTION SCHEDULE PAGE */
export function PublicSchedulePage() {
  const {
    schedules,
    showToast,
    selectedLocation,
    setIsLocationModalOpen,
    clearSelectedLocation,
    matchesLocationFilter,
  } = useApp();

  const [searchArea, setSearchArea] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [wasteFilter, setWasteFilter] = useState('All');

  // Filter using actual stored location data (never fall back to Pinapadu if another location has no schedules)
  const filtered = schedules.filter((s) => {
    if (!s.active) return false;
    if (!matchesLocationFilter(s, selectedLocation)) return false;

    const combinedLocation = `${s.locality || ''} ${s.city_or_village || ''} ${s.district_name || ''} ${
      s.state_name || ''
    } ${s.area || ''}`.toLowerCase();

    const matchesSearch = !searchArea.trim() || combinedLocation.includes(searchArea.trim().toLowerCase());
    const matchesState = !stateFilter || (s.state_name || '').toLowerCase() === stateFilter.toLowerCase();
    const matchesType = wasteFilter === 'All' || s.wasteType === wasteFilter;

    return matchesSearch && matchesState && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="bg-white rounded-3xl border border-emerald-100 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
            Location-Aware Collection Timetable (Demo Schedules)
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            Waste Collection Schedule
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            View door-to-door pickup schedules for your selected village, town, or city. (Does not claim live GPS vehicle tracking.)
          </p>
        </div>

        {/* Active Location Filter Control */}
        <div className="flex flex-wrap items-center gap-2 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
          <div className="text-xs">
            <span className="text-slate-500 block text-[10px] font-bold uppercase">Selected Location</span>
            <span className="font-bold text-forest-900">
              {selectedLocation ? formatLocationLabel(selectedLocation) : 'All India'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-forest-800 text-white"
          >
            {selectedLocation ? 'Change' : 'Select Village / City'}
          </button>
          {selectedLocation && (
            <button
              type="button"
              onClick={clearSelectedLocation}
              className="p-1.5 rounded-lg bg-white text-slate-600 hover:text-red-600 border border-slate-200"
              title="Clear location filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Search Village, City, District, or Locality
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchArea}
              onChange={(e) => setSearchArea(e.target.value)}
              placeholder="e.g., Tenali, Pinapadu, Madhapur, Yelahanka, Kothrud..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Filter by State / UT</label>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
          >
            <option value="">All States &amp; UTs</option>
            {INDIA_STATES_AND_UTS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Waste Collection Type</label>
          <select
            value={wasteFilter}
            onChange={(e) => setWasteFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
          >
            <option value="All">All Collection Types</option>
            <option value="Wet Waste">Wet Waste (Green Bin)</option>
            <option value="Dry Waste">Dry Waste (Blue Bin)</option>
            <option value="Mixed Waste">Mixed Waste</option>
            <option value="General Waste Collection">General Waste Collection</option>
          </select>
        </div>
      </div>

      {/* Schedule Cards or Exact Required Empty Message */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-emerald-100 p-10 text-center space-y-3">
          <MapPin className="w-8 h-8 text-emerald-600 mx-auto" />
          <p className="text-base font-extrabold text-slate-900">
            No collection schedules have been published for this location yet.
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try clearing the location filter to view published schedules across other localities, or select another city/village.
          </p>
          <div className="flex justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setSearchArea('');
                setStateFilter('');
                setWasteFilter('All');
                clearSelectedLocation();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-forest-900"
            >
              Show All Published Schedules
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-forest-900">
                    {s.wasteType}
                  </span>
                  <span className="font-mono text-xs text-slate-400">{s.id}</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {s.city_or_village ? `${s.city_or_village}, ${s.district_name || ''} (${s.state_name || ''})` : s.area}
                </h3>
                <p className="text-xs font-semibold text-emerald-800">
                  Locality: {s.locality || s.area}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                  <div><strong>Days:</strong> {s.collectionDay}</div>
                  <div><strong>Time:</strong> {s.scheduledTime}</div>
                  <div><strong>Frequency:</strong> {s.frequency}</div>
                  <div>
                    <strong>Next Pickup:</strong>{' '}
                    <span className="text-emerald-700 font-semibold">{s.nextCollectionDate}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/60 mt-2">
                  <strong>Instructions:</strong> {s.instructions}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">Team: {s.assignedTeam}</span>
                <button
                  type="button"
                  onClick={() =>
                    showToast(`In-App Reminder enabled for ${s.area} (${s.scheduledTime}).`, 'info')
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-forest-800"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Set In-App Reminder
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* 6. PRIVACY POLICY PAGE */
export function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="bg-white rounded-3xl border border-emerald-100 p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-forest-800 font-bold">
          <Lock className="w-5 h-5 text-emerald-600" />
          <h1 className="text-2xl font-extrabold text-slate-900">Privacy Policy &amp; Location Data Protection</h1>
        </div>
        <p className="text-xs text-slate-500">Effective Date: October 2026 • CleanVillage India</p>
        <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <p>
            <strong>1. Purpose of Location &amp; Evidence Collection:</strong> CleanVillage collects citizen name, email, mobile number, state/district/village/locality, complaint photographs, and optional coordinates solely for verifying and resolving community sanitation issues.
          </p>
          <p>
            <strong>2. Explicit Location Permission:</strong> Browser Geolocation is requested only after you explicitly click "Use My Current Location". It is never triggered automatically on page load, and manual location selection is always available.
          </p>
          <p>
            <strong>3. Public Listing Privacy:</strong> Public complaint feeds and the Community Leaderboard never expose citizen phone numbers, email addresses, or exact household GPS coordinates. Detailed complaint coordinates are visible only to the reporting citizen and the authorized administrator.
          </p>
          <p>
            <strong>4. Minimal Geocoding Disclosure:</strong> Search queries and map marker coordinates are resolved via OpenStreetMap Nominatim strictly to assist with address lookup without sharing private citizen identity.
          </p>
        </div>
      </div>
    </div>
  );
}

/* 7. HELP & FAQ PAGE */
export function HelpFaqPage() {
  const faqs = [
    {
      q: 'Can I report a sanitation problem in any village, town, or city in India?',
      a: 'Yes! CleanVillage supports all 28 Indian States and 8 Union Territories. Use the Location Selector to search any village, town, city, district, or PIN code, or pick a spot on the interactive map.',
    },
    {
      q: 'What if I am reporting a sanitation problem at a location different from where I am standing?',
      a: 'The complaint form captures the location of the reported sanitation issue. You can use "Select Location Manually / Search on Map" to choose any village, street, or landmark across India rather than using your current GPS position.',
    },
    {
      q: 'Is GPS permission mandatory to submit a complaint?',
      a: 'No. If you deny browser geolocation or if GPS is unavailable, you can select the location on the map or enter the State, District, Village/City, and Locality manually.',
    },
    {
      q: 'How does the Administrator review complaint locations?',
      a: 'Administrators inspect the submitted photo, address, capture method, and map marker in the "Reported Location & Evidence" panel and record an evidence-based review status (Location Reviewed, Needs Clarification, or Location Mismatch Suspected).',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="bg-white rounded-3xl border border-emerald-100 p-8 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-forest-800">
          <HelpCircle className="w-5 h-5 text-emerald-600" />
          <h1 className="text-2xl font-extrabold text-slate-900">Help &amp; Frequently Asked Questions</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-600">
          Guidance for citizens and sanitation administrators across India.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((f) => (
          <div key={f.q} className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900">{f.q}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 8. NOT FOUND / 404 PAGE */
export function NotFoundPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-forest-800 flex items-center justify-center mx-auto">
        <Trees className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900">404 – Page Not Found</h1>
      <p className="text-sm text-slate-600">
        The page you are looking for does not exist in the CleanVillage portal.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-forest-800 text-white"
      >
        Return to CleanVillage Home
      </Link>
    </div>
  );
}
