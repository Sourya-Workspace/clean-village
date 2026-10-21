import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  RotateCcw,
} from 'lucide-react';
import VillageMap from './VillageMap';
import {
  INDIA_STATES_AND_UTS,
  DISTRICTS_BY_STATE,
  searchIndiaLocations,
  reverseGeocodeIndia,
  isValidCoordinatePair,
  formatLocationLabel,
} from '../services/geocoding';

export default function IndiaLocationSelector({
  value = null,
  onConfirm,
  onCancel,
  onClear,
  mode = 'selector', // 'selector' | 'complaint'
  showGpsButton = true,
  title = 'Select Location in India',
  subtitle = 'Search any village, town, city, district, state, or PIN code across India, or pick a point on the map.',
  compact = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const [stateName, setStateName] = useState(value?.stateName || '');
  const [districtName, setDistrictName] = useState(value?.districtName || '');
  const [cityOrVillage, setCityOrVillage] = useState(
    value?.cityOrVillage || value?.villageName || value?.cityName || ''
  );
  const [locality, setLocality] = useState(value?.locality || '');
  const [landmark, setLandmark] = useState(value?.landmark || '');
  const [postcode, setPostcode] = useState(value?.postcode || '');
  const [coordinates, setCoordinates] = useState(
    value && isValidCoordinatePair(value.lat ?? value.reportedLatitude, value.lng ?? value.reportedLongitude)
      ? {
          lat: Number(value.lat ?? value.reportedLatitude),
          lng: Number(value.lng ?? value.reportedLongitude),
        }
      : null
  );

  // 'map_confirmed' | 'gps' | 'manual_entry'
  const [captureMethod, setCaptureMethod] = useState(value?.locationCaptureMethod || 'manual_entry');
  const [isConfirmed, setIsConfirmed] = useState(Boolean(value?.isConfirmed));
  const [gpsStatus, setGpsStatus] = useState('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Sync external value updates
  useEffect(() => {
    if (value) {
      setStateName(value.stateName || '');
      setDistrictName(value.districtName || '');
      setCityOrVillage(value.cityOrVillage || value.villageName || value.cityName || '');
      setLocality(value.locality || '');
      setLandmark(value.landmark || '');
      setPostcode(value.postcode || '');
      if (isValidCoordinatePair(value.lat ?? value.reportedLatitude, value.lng ?? value.reportedLongitude)) {
        setCoordinates({
          lat: Number(value.lat ?? value.reportedLatitude),
          lng: Number(value.lng ?? value.reportedLongitude),
        });
      }
      setCaptureMethod(value.locationCaptureMethod || 'manual_entry');
    }
  }, [value]);

  // Debounced search against Nominatim India
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError('');
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');
      const { results, error } = await searchIndiaLocations(trimmed, {
        stateFilter: stateName,
        districtFilter: districtName,
      });
      setIsSearching(false);
      setHasSearched(true);
      setSearchResults(results || []);
      if (error) {
        setSearchError(error);
      }
    }, 380);

    return () => clearTimeout(timer);
  }, [searchQuery, stateName, districtName]);

  const availableDistricts = stateName && DISTRICTS_BY_STATE[stateName] ? DISTRICTS_BY_STATE[stateName] : [];

  const handleSelectSearchResult = (item) => {
    if (item.stateName) setStateName(item.stateName);
    if (item.districtName) setDistrictName(item.districtName);
    if (item.cityOrVillage) setCityOrVillage(item.cityOrVillage);
    if (item.locality && !locality) setLocality(item.locality);
    if (item.postcode) setPostcode(item.postcode);

    if (isValidCoordinatePair(item.lat, item.lng)) {
      setCoordinates({ lat: item.lat, lng: item.lng });
      setCaptureMethod('map_confirmed');
    } else {
      setCaptureMethod('manual_entry');
    }

    setIsConfirmed(false);
    setSearchResults([]);
    setHasSearched(false);
    setSearchQuery('');
  };

  const handleMapCoordinatePick = async (coords) => {
    if (!isValidCoordinatePair(coords.lat, coords.lng)) return;
    setCoordinates(coords);
    setCaptureMethod('map_confirmed');
    setIsConfirmed(false);
    setIsReverseGeocoding(true);
    setGpsStatus('Resolving address from selected map marker...');

    const { location, error } = await reverseGeocodeIndia(coords.lat, coords.lng);
    setIsReverseGeocoding(false);

    if (location) {
      if (location.stateName) setStateName(location.stateName);
      if (location.districtName) setDistrictName(location.districtName);
      if (location.cityOrVillage) setCityOrVillage(location.cityOrVillage);
      if (location.locality) setLocality(location.locality);
      if (location.postcode) setPostcode(location.postcode);
      setGpsStatus(`Map marker address resolved: ${location.displayName}`);
    } else if (error) {
      setGpsStatus(error);
    }
  };

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus(
        'Geolocation is not supported by your browser. Please search or select the location manually below.'
      );
      return;
    }

    setGpsStatus('Requesting browser permission for current GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        if (!isValidCoordinatePair(lat, lng)) {
          setGpsStatus('Invalid coordinates returned by browser. Please select location manually.');
          return;
        }
        setCoordinates({ lat, lng });
        setCaptureMethod('gps');
        setIsConfirmed(false);
        setIsReverseGeocoding(true);
        const { location } = await reverseGeocodeIndia(lat, lng);
        setIsReverseGeocoding(false);
        if (location) {
          if (location.stateName) setStateName(location.stateName);
          if (location.districtName) setDistrictName(location.districtName);
          if (location.cityOrVillage) setCityOrVillage(location.cityOrVillage);
          if (location.locality) setLocality(location.locality);
          if (location.postcode) setPostcode(location.postcode);
          setGpsStatus(
            `GPS coordinates captured (${lat}°, ${lng}°). Please review and confirm the address below.`
          );
        } else {
          setGpsStatus(
            `GPS coordinates captured (${lat}°, ${lng}°). Please verify state/village fields and confirm.`
          );
        }
      },
      (err) => {
        const msg =
          err.code === 1
            ? 'GPS permission was denied. Manual location search and map selection remain fully available below.'
            : 'Unable to retrieve GPS signal (timeout or unavailable). Please select or enter the location manually.';
        setGpsStatus(msg);
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    );
  };

  const buildPayload = (confirmedFlag = true) => {
    const hasCoords = coordinates && isValidCoordinatePair(coordinates.lat, coordinates.lng);
    const finalMethod = hasCoords
      ? captureMethod === 'gps'
        ? 'gps'
        : 'map_confirmed'
      : 'manual_entry';

    const confirmationStatus =
      finalMethod === 'gps'
        ? 'GPS Coordinates Confirmed'
        : finalMethod === 'map_confirmed'
        ? 'Confirmed Map Location'
        : 'Manually Entered Address (No Map Coordinates)';

    const payload = {
      stateName: stateName.trim(),
      districtName: districtName.trim(),
      cityOrVillage: cityOrVillage.trim(),
      villageName: cityOrVillage.trim(),
      cityName: cityOrVillage.trim(),
      locality: locality.trim(),
      landmark: landmark.trim(),
      postcode: postcode.trim(),
      lat: hasCoords ? Number(coordinates.lat) : null,
      lng: hasCoords ? Number(coordinates.lng) : null,
      reportedLatitude: hasCoords ? Number(coordinates.lat) : null,
      reportedLongitude: hasCoords ? Number(coordinates.lng) : null,
      locationCaptureMethod: finalMethod,
      locationConfirmationStatus: confirmationStatus,
      isConfirmed: confirmedFlag,
    };
    payload.displayName = formatLocationLabel(payload);
    return payload;
  };

  const handleConfirmSelection = () => {
    if (!stateName.trim() && !cityOrVillage.trim() && !coordinates) {
      setSearchError('Please select a State, enter a Village/City, or pick a location on the map.');
      return;
    }
    setSearchError('');
    setIsConfirmed(true);
    if (onConfirm) {
      onConfirm(buildPayload(true));
    }
  };

  const handleReset = () => {
    setStateName('');
    setDistrictName('');
    setCityOrVillage('');
    setLocality('');
    setLandmark('');
    setPostcode('');
    setCoordinates(null);
    setCaptureMethod('manual_entry');
    setIsConfirmed(false);
    setGpsStatus('');
    setSearchQuery('');
    setSearchResults([]);
    if (onClear) onClear();
  };

  const hasValidCoords = coordinates && isValidCoordinatePair(coordinates.lat, coordinates.lng);

  return (
    <div className="bg-white rounded-2xl border border-emerald-200 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{title}</span>
          </h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {showGpsButton && (
            <button
              type="button"
              onClick={handleUseCurrentGps}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-forest-900 border border-emerald-300 transition"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-700" />
              Use My Current Location
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Close Location Selector"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Input with Debounced Autocomplete */}
      <div className="relative">
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Search Any Village, Town, City, District, State, or PIN Code in India
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Try 'Guntur', 'Tenali', 'Pinapadu', 'Hyderabad', 'Bengaluru', 'Mumbai', 'Warangal', or a PIN code..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
          />
          {isSearching && (
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-3.5 top-3" />
          )}
        </div>

        {/* Autocomplete Dropdown Results (Handles duplicate names with full district/state/PIN context) */}
        {searchResults.length > 0 && (
          <div className="absolute z-30 mt-1 w-full bg-white rounded-2xl border border-emerald-200 shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
            <div className="px-3 py-1.5 bg-emerald-50 text-[11px] font-semibold text-emerald-900 flex items-center justify-between">
              <span>Select the matching location ({searchResults.length} results found in India):</span>
              <button
                type="button"
                onClick={() => setSearchResults([])}
                className="text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
            {searchResults.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSearchResult(item)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/70 transition flex items-start justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900">
                    {item.cityOrVillage || item.name}
                    {item.districtName ? `, ${item.districtName} District` : ''}
                    {item.stateName ? `, ${item.stateName}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{item.displayName}</p>
                </div>
                <div className="text-right shrink-0">
                  {item.postcode && (
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                      PIN {item.postcode}
                    </span>
                  )}
                  <span className="block text-[10px] text-emerald-700 capitalize mt-0.5">
                    {item.placeType}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty State when place is not found */}
        {hasSearched && !isSearching && searchResults.length === 0 && !searchError && (
          <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Location not found. Try another spelling, search by district or PIN code, or select a point manually on the map.
            </span>
          </div>
        )}

        {searchError && (
          <div className="mt-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* GPS / Reverse Geocode Status */}
      {(gpsStatus || isReverseGeocoding) && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2">
          {isReverseGeocoding && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700 shrink-0" />}
          <span>{gpsStatus}</span>
        </div>
      )}

      {/* Structured Cascading Fields: State/UT -> District -> City/Town/Village -> Locality/Landmark */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">State / Union Territory *</label>
          <select
            value={stateName}
            onChange={(e) => {
              setStateName(e.target.value);
              setDistrictName('');
              setIsConfirmed(false);
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="">Select State / UT</option>
            {INDIA_STATES_AND_UTS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">District</label>
          <input
            type="text"
            list="cv-district-list"
            value={districtName}
            onChange={(e) => {
              setDistrictName(e.target.value);
              setIsConfirmed(false);
            }}
            placeholder={stateName ? `District in ${stateName}` : 'Enter or select district'}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
          <datalist id="cv-district-list">
            {availableDistricts.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">City, Town, or Village *</label>
          <input
            type="text"
            value={cityOrVillage}
            onChange={(e) => {
              setCityOrVillage(e.target.value);
              setIsConfirmed(false);
            }}
            placeholder="e.g., Guntur, Tenali, Pinapadu, Warangal"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Locality, Street, or Landmark</label>
          <input
            type="text"
            value={locality}
            onChange={(e) => {
              setLocality(e.target.value);
              setIsConfirmed(false);
            }}
            placeholder="Street name, ward, or landmark"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
          />
        </div>
      </div>

      {/* Interactive Map for Marker Placement & Refinement */}
      {!compact && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700">
              Interactive India Map (Click or Drag Marker to Refine Position)
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                captureMethod === 'gps'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : hasValidCoords
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {captureMethod === 'gps'
                ? 'Method: Browser GPS Coordinates'
                : hasValidCoords
                ? 'Method: Confirmed Map Coordinates'
                : 'Method: Manual Text Entry Only (No Map Marker)'}
            </span>
          </div>

          <VillageMap
            center={hasValidCoords ? coordinates : null}
            selectable={true}
            onSelectCoordinates={handleMapCoordinatePick}
            height="240px"
            showSingleMarker={Boolean(hasValidCoords)}
          />
        </div>
      )}

      {/* Coordinates & Confirmation Bar */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-600 space-y-0.5">
          <div>
            <strong>Selected Area:</strong>{' '}
            <span className="text-forest-900 font-semibold">
              {formatLocationLabel({ locality, cityOrVillage, districtName, stateName })}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            {hasValidCoords ? (
              <span className="font-mono text-emerald-800 font-semibold">
                Coordinates: {Number(coordinates.lat).toFixed(5)}° N, {Number(coordinates.lng).toFixed(5)}° E
              </span>
            ) : (
              <span>Coordinates: Not selected (Manual address mode)</span>
            )}
            {isConfirmed && (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Location Confirmed
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
          <button
            type="button"
            onClick={handleConfirmSelection}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white shadow-sm transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}
