import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, MapPin, GraduationCap, ShieldAlert, Trees, HeartHandshake } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-16">
      {/* Lush Green Village Tree Canopy SVG Divider */}
      <div className="w-full overflow-hidden leading-none">
        <svg
          viewBox="0 0 1440 110"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-14 sm:h-24 preserve-3d"
          preserveAspectRatio="none"
        >
          <path
            d="M0 70L60 62C120 54 240 38 360 42C480 46 600 70 720 74C840 78 960 62 1080 50C1200 38 1320 30 1380 26L1440 22V110H1380C1320 110 1200 110 1080 110C960 110 840 110 720 110C600 110 480 110 360 110C240 110 120 110 60 110H0V70Z"
            fill="#14532d"
          />
          <path
            d="M0 85L80 78C160 71 320 57 480 60C640 63 800 83 960 85C1120 87 1280 71 1360 63L1440 55V110H0V85Z"
            fill="#052e16"
          />
        </svg>
      </div>

      <div className="bg-forest-950 text-emerald-100 pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Brand & Platform Mission */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
                <Leaf className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold text-white">
                Clean<span className="text-emerald-400">Village</span>
              </span>
            </div>
            <p className="text-xs text-emerald-200/80 leading-relaxed">
              Every Village. Every Community. A Cleaner Tomorrow. Smart Waste Complaint, Sanitation Monitoring &amp; Green Rewards System across India.
            </p>
            <div className="pt-1 space-y-1.5 text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Supporting States, Districts, Towns &amp; Villages Across India</span>
              </div>
              <div className="flex items-center gap-2">
                <Trees className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>OpenStreetMap &amp; Nominatim Location Integration</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>CSP Attribution: VVIT Dept. of CSE</span>
              </div>
            </div>
          </div>

          {/* Col 2: Public Navigation */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Explore CleanVillage</h3>
            <ul className="space-y-2 text-xs text-emerald-200/90">
              <li><Link to="/" className="hover:text-amber-300 transition">Home</Link></li>
              <li><Link to="/about" className="hover:text-amber-300 transition">About the Project</Link></li>
              <li><Link to="/how-it-works" className="hover:text-amber-300 transition">How It Works</Link></li>
              <li><Link to="/report-problem" className="hover:text-amber-300 transition">Report a Sanitation Issue</Link></li>
              <li><Link to="/community-impact" className="hover:text-amber-300 transition">Community Impact</Link></li>
              <li><Link to="/schedule" className="hover:text-amber-300 transition">Waste Collection Schedule</Link></li>
              <li><Link to="/awareness" className="hover:text-amber-300 transition">Waste Segregation &amp; Awareness</Link></li>
            </ul>
          </div>

          {/* Col 3: Portals & Modules */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Role Portals &amp; Rewards</h3>
            <ul className="space-y-2 text-xs text-emerald-200/90">
              <li><Link to="/citizen/dashboard" className="hover:text-amber-300 transition">Citizen Dashboard</Link></li>
              <li><Link to="/citizen/rewards" className="hover:text-amber-300 transition">Green Rewards Catalog</Link></li>
              <li><Link to="/citizen/leaderboard" className="hover:text-amber-300 transition">Community Leaderboard</Link></li>
              <li><Link to="/citizen/activities" className="hover:text-amber-300 transition">Cleanliness Drives (Shramdaan)</Link></li>
              <li><Link to="/authority/dashboard" className="hover:text-amber-300 transition">Authority Dashboard</Link></li>
              <li><Link to="/authority/monitoring" className="hover:text-amber-300 transition">Cleanliness Monitoring</Link></li>
              <li><Link to="/authority/reports" className="hover:text-amber-300 transition">Monthly Reports &amp; Analytics</Link></li>
            </ul>
          </div>

          {/* Col 4: Help, Policies & Academic Disclaimer */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Support &amp; Governance</h3>
            <ul className="space-y-2 text-xs text-emerald-200/90">
              <li><Link to="/help" className="hover:text-amber-300 transition">Help &amp; Frequently Asked Questions</Link></li>
              <li><Link to="/privacy" className="hover:text-amber-300 transition">Privacy Policy &amp; Location Consent</Link></li>
              <li><Link to="/login" className="hover:text-amber-300 transition">Citizen / Authority Login</Link></li>
            </ul>
            <div className="p-3 rounded-xl bg-forest-900/90 border border-emerald-800 text-[11px] text-emerald-200 leading-relaxed">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300 mb-1">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Prototype Disclaimer</span>
              </div>
              CleanVillage is a Community Service Project prototype. Demo records, schedules, and point rules are clearly labeled for demonstration and do not claim live municipal government dispatch.
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-emerald-900/80 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-400/80 gap-2">
          <p>© 2026 CleanVillage • Every Village. Every Community. A Cleaner Tomorrow.</p>
          <p className="flex items-center gap-1">
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
            Together for a Cleaner, Greener India
          </p>
        </div>
      </div>
    </footer>
  );
}
