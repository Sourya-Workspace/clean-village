import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  CheckCircle2,
  MapPin,
  Upload,
  AlertTriangle,
  Sparkles,
  Truck,
  Navigation,
  Search,
  RefreshCw,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import DashboardLayout from '../components/DashboardLayout';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import VillageMap from '../components/VillageMap';
import IndiaLocationSelector from '../components/IndiaLocationSelector';
import { COMPLAINT_CATEGORIES } from '../data/seedData';
import { isValidCoordinatePair, formatLocationLabel } from '../services/geocoding';

/* 10. CITIZEN DASHBOARD */
export function CitizenDashboardPage() {
  const {
    currentUser,
    complaints,
    schedules,
    notifications,
    sanitationTips,
    selectedLocation,
    matchesLocationFilter,
  } = useApp();

  const myComplaints = complaints.filter((c) => c.userId === currentUser?.id);
  const pendingCount = myComplaints.filter((c) => c.status === 'Pending' || c.status === 'Verified').length;
  const inProgressCount = myComplaints.filter((c) => c.status === 'In Progress').length;
  const resolvedCount = myComplaints.filter((c) => c.status === 'Resolved').length;

  const relevantSchedules = schedules.filter(
    (s) => s.active && matchesLocationFilter(s, selectedLocation)
  );

  const myNotifs = notifications
    .filter((n) => n.userId === currentUser?.id || n.targetRole === 'citizen')
    .slice(0, 4);

  const tipOfTheDay = sanitationTips[0];
  const nextMilestone = 100;
  const currentPts = currentUser?.greenPoints || 0;
  const progressPct = Math.min(100, Math.round((currentPts / nextMilestone) * 100));

  return (
    <DashboardLayout
      role="citizen"
      title={`Namaste, ${currentUser?.fullName || 'Citizen'}!`}
      subtitle={`Registered Locality: ${currentUser?.householdArea || ''}, ${currentUser?.village || 'India'}`}
      actions={
        <Link
          to="/citizen/submit-complaint"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          Report New Issue
        </Link>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase">My Total Complaints</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{myComplaints.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-amber-800 uppercase">Pending / Verified</p>
          <p className="text-2xl font-extrabold text-amber-700 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-purple-200 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-purple-800 uppercase">In Progress</p>
          <p className="text-2xl font-extrabold text-purple-700 mt-1">{inProgressCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-800 uppercase">Resolved</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{resolvedCount}</p>
        </div>
        <div className="village-canopy-bg rounded-2xl p-4 text-white shadow-sm col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold text-amber-300 uppercase">My Green Points</p>
          <p className="text-2xl font-extrabold text-white mt-1">{currentPts} pts</p>
        </div>
      </div>

      {/* Sanitation Tip of the Day */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase text-emerald-800">Sanitation Tip of the Day</span>
          <p className="text-xs sm:text-sm text-emerald-950 font-medium mt-0.5">{tipOfTheDay}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* My Recent Complaints & Timeline */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">My Recent Complaints (Private Record)</h2>
            <Link to="/citizen/complaints" className="text-xs font-bold text-forest-800 hover:underline">
              View All ({myComplaints.length})
            </Link>
          </div>

          {myComplaints.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl space-y-2">
              <p className="text-xs text-slate-600">You have not submitted any complaints yet.</p>
              <Link
                to="/citizen/submit-complaint"
                className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-forest-800 text-white"
              >
                Submit Your First Report
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myComplaints.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 hover:border-emerald-300 transition space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-forest-900 bg-emerald-100 px-2 py-0.5 rounded">
                      {c.id}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-sm font-bold text-slate-900">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    {c.category} • {c.area} • {new Date(c.submittedAt).toLocaleDateString()}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Location Review: <strong>{c.location_review_status || 'Not Reviewed'}</strong>
                    </span>
                    <Link
                      to={`/citizen/complaints/${c.id}`}
                      className="font-bold text-forest-800 hover:underline"
                    >
                      Track Full Timeline →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Green Points Progress, Schedule & Notifications */}
        <div className="lg:col-span-5 space-y-6">
          {/* Green Points Progress Card */}
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Green Points Progress</h2>
              <Link to="/citizen/rewards" className="text-xs font-bold text-emerald-700 hover:underline">
                Redeem Rewards →
              </Link>
            </div>
            <div className="w-full h-3 rounded-full bg-emerald-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-forest-700 to-emerald-500 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-600">
              You have <strong>{currentPts} pts</strong> (
              {nextMilestone - currentPts > 0
                ? `${nextMilestone - currentPts} pts to Cleanliness Champion tier`
                : 'Champion Tier Reached!'}
              ).
            </p>
          </div>

          {/* Upcoming Waste Collection */}
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Upcoming Waste Collection</h2>
              <Truck className="w-4 h-4 text-emerald-600" />
            </div>
            {relevantSchedules.length === 0 ? (
              <p className="text-xs text-slate-500">
                No collection schedules have been published for this location yet.
              </p>
            ) : (
              relevantSchedules.slice(0, 2).map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-forest-900">
                    <span>{s.wasteType}</span>
                    <span>{s.nextCollectionDate}</span>
                  </div>
                  <p className="text-slate-700">{s.area}</p>
                </div>
              ))
            )}
          </div>

          {/* Latest Notifications */}
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Latest Notifications</h2>
              <Link to="/citizen/notifications" className="text-xs font-bold text-forest-800 hover:underline">
                All Alerts
              </Link>
            </div>
            {myNotifs.map((n) => (
              <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                <p className="font-bold text-slate-800">{n.title}</p>
                <p className="text-slate-600 mt-0.5">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* 11. SUBMIT COMPLAINT PAGE (Captures India-Wide Issue Location via GPS or Manual/Map Selection) */
export function SubmitComplaintPage() {
  const {
    complaints,
    submitComplaint,
    findSimilarComplaints,
    selectedLocation,
  } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(COMPLAINT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('Medium');

  // Reported Issue Location State
  const [issueLocation, setIssueLocation] = useState(() => ({
    stateName: selectedLocation?.stateName || '',
    districtName: selectedLocation?.districtName || '',
    cityOrVillage: selectedLocation?.cityOrVillage || '',
    locality: selectedLocation?.locality || '',
    landmark: '',
    lat: selectedLocation?.lat ?? null,
    lng: selectedLocation?.lng ?? null,
    locationCaptureMethod: selectedLocation?.lat ? 'map_confirmed' : 'manual_entry',
    locationConfirmationStatus: selectedLocation?.lat
      ? 'Confirmed Map Location'
      : 'Manually Entered Address (No Map Coordinates)',
    isConfirmed: Boolean(selectedLocation),
  }));

  const [landmark, setLandmark] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [formError, setFormError] = useState('');
  const [submittedRecord, setSubmittedRecord] = useState(null);

  const nextIdPreview = `CV-2026-${String(complaints.length + 1).padStart(4, '0')}`;
  const similarExisting = findSimilarComplaints(
    issueLocation.locality || issueLocation.cityOrVillage,
    category
  );

  const handlePhotoUpload = (e) => {
    setPhotoError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPhotoError('Only JPEG, PNG, and WebP images are permitted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image file size must be under 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
    };
    reader.onerror = () => {
      setPhotoError('Failed to read image file. Please try another photo.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (title.trim().length < 5) {
      setFormError('Please provide a clear complaint title (at least 5 characters).');
      return;
    }
    if (description.trim().length < 15) {
      setFormError('Please provide a detailed description (at least 15 characters).');
      return;
    }
    if (!issueLocation.stateName && !issueLocation.cityOrVillage) {
      setFormError(
        'Please specify the location of the reported sanitation issue (State and City/Town/Village) and click "Confirm Location".'
      );
      return;
    }

    const hasValidCoords = isValidCoordinatePair(issueLocation.lat, issueLocation.lng);

    const res = submitComplaint({
      title,
      category,
      description,
      state_name: issueLocation.stateName,
      district_name: issueLocation.districtName,
      city_name: issueLocation.cityOrVillage,
      village_name: issueLocation.cityOrVillage,
      locality: issueLocation.locality,
      landmark: landmark || issueLocation.landmark,
      reported_latitude: hasValidCoords ? Number(issueLocation.lat) : null,
      reported_longitude: hasValidCoords ? Number(issueLocation.lng) : null,
      location_capture_method: issueLocation.locationCaptureMethod,
      location_confirmation_status: issueLocation.locationConfirmationStatus,
      urgency,
      photoUrl: photoPreview,
    });

    if (res.success) {
      setSubmittedRecord(res.complaint);
    }
  };

  if (submittedRecord) {
    return (
      <DashboardLayout
        role="citizen"
        title="Sanitation Complaint Submitted Successfully"
        subtitle="Your complaint and its reported location details have been recorded for Authority verification."
      >
        <div className="bg-white rounded-3xl border border-emerald-200 p-8 shadow-sm text-center max-w-xl mx-auto space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase text-emerald-700">Generated Complaint ID</span>
            <p className="text-3xl font-black font-mono text-forest-900">{submittedRecord.id}</p>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-left text-xs space-y-1.5 text-slate-700">
            <div><strong>Title:</strong> {submittedRecord.title}</div>
            <div><strong>Category:</strong> {submittedRecord.category}</div>
            <div><strong>Reported Location:</strong> {submittedRecord.area}</div>
            <div>
              <strong>State / District:</strong> {submittedRecord.state_name || '—'} /{' '}
              {submittedRecord.district_name || '—'}
            </div>
            <div>
              <strong>Coordinates:</strong>{' '}
              {isValidCoordinatePair(submittedRecord.reported_latitude, submittedRecord.reported_longitude)
                ? `${submittedRecord.reported_latitude}° N, ${submittedRecord.reported_longitude}° E`
                : 'Not provided (Manual address entry)'}
            </div>
            <div>
              <strong>Location Capture Method:</strong> {submittedRecord.location_confirmation_status}
            </div>
            <div><strong>Initial Status:</strong> <StatusBadge status={submittedRecord.status} /></div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to={`/citizen/complaints/${submittedRecord.id}`}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-forest-800 text-white"
            >
              Track Complaint {submittedRecord.id}
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmittedRecord(null);
                setTitle('');
                setDescription('');
                setPhotoPreview('');
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-100 text-forest-900"
            >
              Submit Another Issue
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      role="citizen"
      title="Report a Community Sanitation Issue"
      subtitle="Provide issue details, photographic evidence, and the location of the reported sanitation problem anywhere in India."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div className="text-xs text-slate-600">
              Auto-Assigned Complaint ID Reference:{' '}
              <span className="font-mono font-bold text-forest-900 bg-emerald-100 px-2 py-0.5 rounded">
                {nextIdPreview}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              Submission Date: {new Date().toLocaleDateString()}
            </span>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          {/* Duplicate Complaint Warning */}
          {similarExisting.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Similar Recent Complaint Notice (Area &amp; Category Match)</span>
              </div>
              <p>
                There is already an active <strong>{category}</strong> report in this area (ID:{' '}
                <code>{similarExisting[0].id}</code> – Status: {similarExisting[0].status}). You may still submit your report if this is a distinct spot or additional evidence.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Complaint Title *</label>
              <input
                type="text"
                required
                placeholder="e.g., Overflowing garbage bin near market road corner"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Complaint Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              >
                {COMPLAINT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Description *</label>
              <textarea
                rows={3}
                required
                placeholder="Describe the sanitation problem, approximate duration, and any impact on nearby households or drains..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Urgency Level</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High (School/Health/Drain Blockage)</option>
              </select>

              <label className="block text-xs font-bold text-slate-700 mt-3 mb-1">Nearby Landmark</label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g., Near Primary School Gate"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Dedicated Issue Location Section using IndiaLocationSelector */}
        <div className="space-y-2">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong>Important – Location of the Sanitation Problem:</strong> Select the exact location where the sanitation problem exists. If you are standing at the spot, click <strong>"Use My Current Location"</strong> (requires browser GPS permission). If you are reporting an issue located elsewhere—or if GPS is denied—search any village, town, city, or street across India or click on the map below, then click <strong>"Confirm Location"</strong>.
            </div>
          </div>

          <IndiaLocationSelector
            value={issueLocation}
            mode="complaint"
            showGpsButton={true}
            title="Location of the Reported Sanitation Problem (India-Wide)"
            subtitle="Method A: Use My Current Location (GPS) • Method B: Search or Select Location Manually on Map"
            onConfirm={(loc) => setIssueLocation(loc)}
            onClear={() =>
              setIssueLocation({
                stateName: '',
                districtName: '',
                cityOrVillage: '',
                locality: '',
                landmark: '',
                lat: null,
                lng: null,
                locationCaptureMethod: 'manual_entry',
                locationConfirmationStatus: 'Manually Entered Address (No Map Coordinates)',
                isConfirmed: false,
              })
            }
          />
        </div>

        {/* Photographic Evidence Upload */}
        <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            Upload Photographic Evidence (JPEG, PNG, WebP • Max 5 MB)
          </label>
          <div className="border-2 border-dashed border-emerald-300 rounded-2xl p-4 bg-emerald-50/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-forest-800 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Select an image of the sanitation issue</p>
                <p className="text-[11px] text-slate-500">
                  If no file is chosen in demo mode, a clearly labeled Demo Evidence illustration is attached.
                </p>
              </div>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-forest-800 file:text-white"
            />
          </div>
          {photoError && <p className="text-xs text-red-600 font-medium">{photoError}</p>}
          {photoPreview && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-emerald-800 mb-1">Image Preview Before Submission:</p>
              <img
                src={photoPreview}
                alt="Complaint preview"
                className="h-44 rounded-xl border border-emerald-200 object-cover"
              />
            </div>
          )}

          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <div className="text-xs text-slate-600">
              <strong>Confirmation Status:</strong>{' '}
              <span className="font-semibold text-forest-900">
                {issueLocation.locationConfirmationStatus}
              </span>
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white shadow-sm transition"
            >
              Submit Sanitation Complaint ({nextIdPreview})
            </button>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}

/* 12. MY COMPLAINTS PAGE */
export function MyComplaintsPage() {
  const { currentUser, complaints } = useApp();
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  const myComplaints = complaints.filter((c) => {
    if (currentUser && c.userId !== currentUser.id) return false;
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchesSearch =
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.area.toLowerCase().includes(search.toLowerCase()) ||
      (c.state_name || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <DashboardLayout
      role="citizen"
      title="My Submitted Complaints"
      subtitle="View and track all sanitation complaints submitted from your citizen account."
      actions={
        <Link
          to="/citizen/submit-complaint"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-forest-800 text-white"
        >
          <PlusCircle className="w-4 h-4" />
          New Complaint
        </Link>
      }
    >
      <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Complaint ID, title, village, city, or state..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Verified">Verified</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div className="space-y-4">
        {myComplaints.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold bg-emerald-100 text-forest-900 px-2.5 py-0.5 rounded">
                  {c.id}
                </span>
                <StatusBadge status={c.status} />
                <PriorityBadge priority={c.urgency} />
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                  {c.location_confirmation_status}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
              <p className="text-xs text-slate-600">{c.description}</p>
              <p className="text-xs text-slate-500">
                📍 {c.area} • Submitted: {new Date(c.submittedAt).toLocaleString()}
              </p>
            </div>
            <div className="shrink-0">
              <Link
                to={`/citizen/complaints/${c.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-forest-900 border border-emerald-200"
              >
                View Details &amp; Timeline →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

/* 13. COMPLAINT DETAILS AND TRACKING PAGE */
export function CitizenComplaintDetailPage() {
  const { id } = useParams();
  const { complaints, resubmitRejectedComplaint } = useApp();
  const complaint = complaints.find((c) => c.id === id) || complaints[0];

  const [editTitle, setEditTitle] = useState(complaint?.title || '');
  const [editDesc, setEditDesc] = useState(complaint?.description || '');

  if (!complaint) {
    return (
      <DashboardLayout role="citizen" title="Complaint Not Found">
        <p className="text-xs text-slate-600">No complaint found with ID {id}.</p>
      </DashboardLayout>
    );
  }

  const hasValidCoords = isValidCoordinatePair(
    complaint.reported_latitude,
    complaint.reported_longitude
  );

  const handleResubmit = (e) => {
    e.preventDefault();
    resubmitRejectedComplaint(complaint.id, {
      title: editTitle,
      description: editDesc,
    });
  };

  return (
    <DashboardLayout
      role="citizen"
      title={`Complaint Tracking: ${complaint.id}`}
      subtitle={`${complaint.category} • ${complaint.area}`}
      actions={
        <Link
          to="/citizen/complaints"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Complaints
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <StatusBadge status={complaint.status} size="lg" />
              <PriorityBadge priority={complaint.urgency} />
            </div>

            <h2 className="text-lg font-extrabold text-slate-900">{complaint.title}</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{complaint.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
              <div><strong>Complaint ID:</strong> {complaint.id}</div>
              <div><strong>Category:</strong> {complaint.category}</div>
              <div><strong>State / District:</strong> {complaint.state_name || '—'} / {complaint.district_name || '—'}</div>
              <div><strong>City / Village:</strong> {complaint.village_name || complaint.city_name || '—'}</div>
              <div><strong>Locality / Landmark:</strong> {complaint.locality || '—'} {complaint.landmark ? `(${complaint.landmark})` : ''}</div>
              <div><strong>Capture Method:</strong> {complaint.location_confirmation_status}</div>
              <div><strong>Location Review:</strong> {complaint.location_review_status || 'Not Reviewed'}</div>
              <div><strong>Assigned Team:</strong> {complaint.assignedTeam || 'Pending Assignment'}</div>
            </div>

            {complaint.authorityRemarks && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                <p className="font-bold text-forest-900">Official Authority Remarks:</p>
                <p className="text-emerald-950">{complaint.authorityRemarks}</p>
              </div>
            )}

            {/* If Rejected: Show Rejection Reason & Resubmit Form */}
            {complaint.status === 'Rejected' && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                <p className="text-xs font-bold text-red-800">
                  Rejection Reason: {complaint.rejectionReason || 'Requires clarification.'}
                </p>
                <form onSubmit={handleResubmit} className="space-y-3 pt-2 border-t border-red-200">
                  <p className="text-xs font-bold text-slate-800">Correct &amp; Resubmit This Complaint:</p>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-forest-800 text-white"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resubmit Corrected Report
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Photographs: Submitted & Resolution */}
          <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Photographic Evidence</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1.5">Submitted Photograph (Before)</p>
                <img
                  src={complaint.photoUrl}
                  alt="Submitted complaint"
                  className="w-full h-44 object-cover rounded-xl border border-slate-200"
                />
              </div>
              {complaint.resolutionPhotoUrl && (
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-1.5">Resolution Evidence (After)</p>
                  <img
                    src={complaint.resolutionPhotoUrl}
                    alt="Resolution proof"
                    className="w-full h-44 object-cover rounded-xl border border-emerald-300"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Status Timeline & Map */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Status Lifecycle Timeline</h3>
            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200">
              {complaint.timeline.map((step, idx) => (
                <div key={idx} className="relative pl-8">
                  <div className="w-6 h-6 rounded-full bg-forest-800 text-white flex items-center justify-center text-[10px] font-bold absolute left-0 top-0.5">
                    {idx + 1}
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-forest-900">{step.status}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(step.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-700">{step.note}</p>
                    <p className="text-[11px] text-slate-500">By: {step.actor}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-2">
            <h3 className="text-sm font-extrabold text-slate-900">Reported Location Map</h3>
            {hasValidCoords ? (
              <>
                <p className="text-xs text-slate-500">
                  {complaint.reported_latitude}° N, {complaint.reported_longitude}° E • {complaint.area}
                </p>
                <VillageMap
                  center={{ lat: complaint.reported_latitude, lng: complaint.reported_longitude }}
                  height="220px"
                />
              </>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Location coordinates were not provided. Reported textual address: <strong>{complaint.area}</strong>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* 14. GREEN REWARDS PAGE */
export function GreenRewardsPage() {
  const {
    currentUser,
    rewards,
    redemptions,
    pointTransactions,
    requestRewardRedemption,
  } = useApp();

  const currentPts = currentUser?.greenPoints || 0;
  const totalEarned = currentUser?.totalPointsEarned || 0;
  const totalRedeemed = currentUser?.totalPointsRedeemed || 0;

  const myRedemptions = redemptions.filter((r) => !currentUser || r.userId === currentUser.id);
  const myTransactions = pointTransactions.filter((t) => !currentUser || t.userId === currentUser.id);

  const participationLevel =
    totalEarned >= 80
      ? 'Cleanliness Champion'
      : totalEarned >= 40
      ? 'Active Green Guardian'
      : 'Rising Eco Citizen';

  return (
    <DashboardLayout
      role="citizen"
      title="Green Rewards & Point Ledger"
      subtitle="Rule-based rewards for verified sanitation complaints, cleanliness drives, and waste segregation."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="village-canopy-bg rounded-2xl p-5 text-white">
          <p className="text-xs font-bold text-amber-300 uppercase">Current Balance</p>
          <p className="text-3xl font-extrabold mt-1">{currentPts} Pts</p>
          <p className="text-[11px] text-emerald-200 mt-1">Available for redemption</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Points Earned</p>
          <p className="text-3xl font-extrabold text-emerald-700 mt-1">+{totalEarned}</p>
          <p className="text-[11px] text-slate-500 mt-1">Verified actions only</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Points Redeemed</p>
          <p className="text-3xl font-extrabold text-amber-600 mt-1">{totalRedeemed}</p>
          <p className="text-[11px] text-slate-500 mt-1">Reserved or issued rewards</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Participation Level</p>
          <p className="text-lg font-extrabold text-forest-900 mt-2">{participationLevel}</p>
          <p className="text-[11px] text-emerald-700 mt-1">Anti-abuse verified</p>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong>Configurable Point Rules:</strong> Verified Complaint = <strong>+10 Pts</strong> • Confirmed Cleanliness Drive Attendance = <strong>+20 Pts</strong> • Household Segregation Activity = <strong>+5 Pts</strong> (Rejected complaints earn 0 pts).
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900">Available Eco Rewards Catalog</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewards.map((r) => {
            const canRedeem = currentPts >= r.pointsCost && r.available && r.stock > 0;
            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900">
                      {r.pointsCost} Green Points
                    </span>
                    <span className="text-xs text-slate-500">Available Stock: {r.stock}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{r.title}</h3>
                  <p className="text-xs text-slate-600">{r.description}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {canRedeem ? 'Eligible to redeem' : `Need ${Math.max(0, r.pointsCost - currentPts)} more pts`}
                  </span>
                  <button
                    type="button"
                    disabled={!canRedeem}
                    onClick={() => requestRewardRedemption(r.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      canRedeem
                        ? 'bg-forest-800 hover:bg-forest-900 text-white'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Request Redemption
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">My Redemption Requests</h3>
          {myRedemptions.length === 0 ? (
            <p className="text-xs text-slate-500">No reward redemptions requested yet.</p>
          ) : (
            <div className="space-y-2.5">
              {myRedemptions.map((req) => (
                <div key={req.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{req.rewardTitle}</span>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-slate-500">
                    ID: {req.id} • Cost: {req.pointsCost} pts • {new Date(req.requestedAt).toLocaleDateString()}
                  </p>
                  {req.authorityNote && <p className="text-emerald-800">Note: {req.authorityNote}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">Green Points Transaction Ledger</h3>
          <div className="space-y-2.5">
            {myTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-800">{tx.reason}</p>
                  <p className="text-[11px] text-slate-400">
                    Ref: {tx.referenceId} • {new Date(tx.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`font-extrabold px-2.5 py-1 rounded-lg ${
                    tx.points > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* 15. COMMUNITY LEADERBOARD PAGE */
export function LeaderboardPage() {
  const { users } = useApp();

  const rankedCitizens = users
    .filter((u) => u.role === 'citizen' && u.optInLeaderboard !== false)
    .sort((a, b) => (b.greenPoints || 0) - (a.greenPoints || 0));

  return (
    <DashboardLayout
      role="citizen"
      title="Green Citizens Leaderboard"
      subtitle="Privacy-conscious recognition of citizens contributing to sanitation reporting and cleanliness drives across India."
    >
      <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4">
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          <strong>Privacy Protection Notice:</strong> Only opt-in display names, city/village/state, and Green Points are shown. Phone numbers, email addresses, and personal complaint details are strictly private.
        </div>

        <div className="divide-y divide-slate-100">
          {rankedCitizens.map((u, index) => (
            <div key={u.id} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-8 h-8 rounded-xl font-extrabold text-xs flex items-center justify-center ${
                    index === 0
                      ? 'bg-amber-400 text-slate-950'
                      : index === 1
                      ? 'bg-slate-200 text-slate-800'
                      : index === 2
                      ? 'bg-amber-700 text-white'
                      : 'bg-emerald-50 text-forest-800'
                  }`}
                >
                  #{index + 1}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{u.fullName}</p>
                  <p className="text-xs text-slate-500">{u.village}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-forest-900 text-xs font-extrabold">
                  {u.greenPoints} Green Points
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

/* 16. CLEANLINESS ACTIVITIES PAGE */
export function CleanlinessActivitiesPage() {
  const {
    currentUser,
    activities,
    registerForActivity,
    cancelActivityRegistration,
    selectedLocation,
    matchesLocationFilter,
    clearSelectedLocation,
  } = useApp();

  const filteredActivities = activities.filter((a) => matchesLocationFilter(a, selectedLocation));

  return (
    <DashboardLayout
      role="citizen"
      title="Cleanliness Drives & Community Participation"
      subtitle="Register for upcoming Shramdaan drives. (+20 Green Points awarded upon authorized attendance confirmation.)"
    >
      {filteredActivities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-emerald-100 p-8 text-center space-y-2">
          <p className="text-sm font-bold text-slate-800">
            No cleanliness drives scheduled for the selected location filter yet.
          </p>
          <button
            type="button"
            onClick={clearSelectedLocation}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-forest-900"
          >
            Show All Cleanliness Drives Across India
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredActivities.map((act) => {
            const isRegistered = currentUser && act.participants.includes(currentUser.id);
            const isConfirmed = currentUser && act.confirmedAttendees.includes(currentUser.id);
            const isPast = act.status === 'Completed';

            return (
              <div
                key={act.id}
                className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isPast ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-forest-900'
                      }`}
                    >
                      {act.status}
                    </span>
                    <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      +{act.pointsAwarded} Pts
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">{act.title}</h3>
                  <p className="text-xs text-slate-600">{act.description}</p>
                  <div className="text-xs text-slate-600 space-y-1 pt-1">
                    <div>📅 <strong>Date &amp; Time:</strong> {act.date} • {act.time}</div>
                    <div>📍 <strong>Meeting Point:</strong> {act.location}</div>
                    <div>👥 <strong>Registered:</strong> {act.participants.length} / {act.participationLimit} citizens</div>
                    <div>ℹ️ <strong>Instructions:</strong> {act.instructions}</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  {isConfirmed ? (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Attendance Confirmed (+{act.pointsAwarded} Pts Awarded)
                    </span>
                  ) : isPast ? (
                    <span className="text-xs text-slate-400">Event concluded</span>
                  ) : isRegistered ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-emerald-800">Registered (Awaiting Event Day)</span>
                      <button
                        type="button"
                        onClick={() => cancelActivityRegistration(act.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100"
                      >
                        Cancel Registration
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => registerForActivity(act.id)}
                      className="w-full py-2 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white transition"
                    >
                      Register for Cleanliness Drive
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

/* 17. CITIZEN NOTIFICATIONS PAGE */
export function CitizenNotificationsPage() {
  const { currentUser, notifications, markNotificationRead, markAllNotificationsRead } = useApp();

  const myNotifs = notifications.filter(
    (n) => !currentUser || n.userId === currentUser.id || n.targetRole === 'citizen'
  );

  return (
    <DashboardLayout
      role="citizen"
      title="My In-App Notifications"
      subtitle="Updates on your sanitation complaints, Green Points, and collection reminders."
      actions={
        <button
          type="button"
          onClick={markAllNotificationsRead}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-forest-900"
        >
          Mark All as Read
        </button>
      }
    >
      <div className="space-y-3">
        {myNotifs.map((n) => (
          <div
            key={n.id}
            className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 ${
              n.read ? 'bg-white border-slate-200/80' : 'bg-emerald-50/70 border-emerald-300 shadow-sm'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
                <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
              </div>
              <p className="text-xs text-slate-600">{n.message}</p>
              <p className="text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            {!n.read && (
              <button
                type="button"
                onClick={() => markNotificationRead(n.id)}
                className="text-xs font-bold text-forest-800 hover:underline shrink-0"
              >
                Mark Read
              </button>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

/* 18. MY PROFILE PAGE */
export function CitizenProfilePage() {
  const { currentUser, updateProfile, logout } = useApp();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [mobile, setMobile] = useState(currentUser?.mobile || '');
  const [householdArea, setHouseholdArea] = useState(currentUser?.householdArea || '');
  const [village, setVillage] = useState(currentUser?.village || '');
  const [optInLeaderboard, setOptInLeaderboard] = useState(currentUser?.optInLeaderboard ?? true);

  const handleSave = (e) => {
    e.preventDefault();
    updateProfile({
      fullName,
      mobile,
      householdArea,
      village,
      optInLeaderboard,
    });
  };

  return (
    <DashboardLayout
      role="citizen"
      title="My Citizen Profile & Preferred Locality"
      subtitle="Manage your contact details, preferred village/city, and privacy settings."
    >
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Locality / Street Address</label>
            <input
              type="text"
              value={householdArea}
              onChange={(e) => setHouseholdArea(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Village, Town, or City &amp; State</label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer pt-2">
          <input
            type="checkbox"
            checked={optInLeaderboard}
            onChange={(e) => setOptInLeaderboard(e.target.checked)}
            className="rounded text-forest-800"
          />
          <span>Display my name and Green Points on the public Community Leaderboard</span>
        </label>

        <div className="pt-3 flex items-center justify-between">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-forest-800 text-white"
          >
            Save Profile Changes
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-700"
          >
            Log Out
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
