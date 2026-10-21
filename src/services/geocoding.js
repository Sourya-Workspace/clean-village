/**
 * CleanVillage - India-Wide Geographic & Geocoding Service
 * Provides a clean abstraction over OpenStreetMap Nominatim (restricted to India `countrycodes=in`)
 * with caching, retry logic, coordinate validation, and structured State/UT & District reference data.
 */

export const INDIA_STATES_AND_UTS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export const DISTRICTS_BY_STATE = {
  'Andhra Pradesh': [
    'Guntur', 'Bapatla', 'Krishna', 'NTR', 'Visakhapatnam', 'Tirupati', 'Chittoor',
    'Kurnool', 'Anantapur', 'Kakinada', 'East Godavari', 'West Godavari', 'Eluru',
    'Prakasam', 'SPSR Nellore', 'YSR Kadapa', 'Srikakulam', 'Vizianagaram', 'Palnadu',
  ],
  Telangana: [
    'Hyderabad', 'Ranga Reddy', 'Medchal-Malkajgiri', 'Warangal', 'Hanumakonda',
    'Karimnagar', 'Nizamabad', 'Khammam', 'Nalgonda', 'Mahabubnagar', 'Sangareddy',
    'Suryapet', 'Siddipet', 'Adilabad',
  ],
  Karnataka: [
    'Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Mangaluru (Dakshina Kannada)',
    'Belagavi', 'Hubballi-Dharwad', 'Kalaburagi', 'Shivamogga', 'Tumakuru', 'Udupi',
    'Ballari', 'Davangere', 'Mandya', 'Hassan',
  ],
  Maharashtra: [
    'Mumbai City', 'Mumbai Suburban', 'Pune', 'Nagpur', 'Thane', 'Nashik',
    'Chhatrapati Sambhajinagar', 'Solapur', 'Kolhapur', 'Satara', 'Sangli',
    'Amravati', 'Nanded', 'Raigad',
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli',
    'Erode', 'Vellore', 'Thoothukudi', 'Thanjavur', 'Kanchipuram', 'Chengalpattu',
  ],
  Kerala: [
    'Thiruvananthapuram', 'Ernakulam', 'Kozhikode', 'Thrissur', 'Kollam',
    'Palakkad', 'Alappuzha', 'Kottayam', 'Malappuram', 'Kannur',
  ],
  Delhi: [
    'New Delhi', 'Central Delhi', 'South Delhi', 'North Delhi', 'East Delhi', 'West Delhi', 'Dwarka',
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Varanasi', 'Kanpur Nagar', 'Agra', 'Gautam Buddha Nagar (Noida)',
    'Ghaziabad', 'Prayagraj', 'Meerut', 'Gorakhpur', 'Jhansi',
  ],
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Kutch'],
  Rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar'],
  'West Bengal': ['Kolkata', 'Howrah', 'North 24 Parganas', 'Darjeeling', 'Hooghly', 'Nadia'],
  Odisha: ['Khordha (Bhubaneswar)', 'Cuttack', 'Puri', 'Ganjam', 'Sundargarh', 'Sambalpur'],
  Punjab: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'SAS Nagar (Mohali)', 'Bathinda'],
  Haryana: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal', 'Hisar', 'Rohtak'],
  Bihar: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Nalanda'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar'],
  Assam: ['Kamrup Metropolitan (Guwahati)', 'Dibrugarh', 'Jorhat', 'Cachar', 'Nagaon'],
};

const CACHE_PREFIX = 'cv_geo_cache_v1_';
const memoryCache = new Map();

/**
 * Validates that latitude and longitude are finite numbers within valid geographic bounds.
 */
export function isValidCoordinatePair(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (lat === '' || lng === '') return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) return false;
  return numLat >= -90 && numLat <= 90 && numLng >= -180 && numLng <= 180;
}

function getCached(key) {
  if (memoryCache.has(key)) return memoryCache.get(key);
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch (_) {
    // ignore storage errors
  }
  return null;
}

function setCached(key, value) {
  memoryCache.set(key, value);
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch (_) {
    // ignore quota errors
  }
}

/**
 * Normalizes a Nominatim result into CleanVillage's provider-agnostic location format.
 */
function normalizeNominatimItem(item) {
  const addr = item.address || {};
  const cityOrVillage =
    addr.village ||
    addr.town ||
    addr.city ||
    addr.municipality ||
    addr.suburb ||
    addr.hamlet ||
    addr.county ||
    item.name ||
    (item.display_name ? item.display_name.split(',')[0].trim() : '');

  const districtName =
    addr.state_district ||
    addr.county ||
    addr.district ||
    addr.city_district ||
    '';

  const stateName = addr.state || addr.union_territory || '';
  const postcode = addr.postcode || '';
  const locality =
    addr.suburb ||
    addr.neighbourhood ||
    addr.road ||
    addr.quarter ||
    addr.hamlet ||
    '';

  const lat = Number(parseFloat(item.lat).toFixed(6));
  const lng = Number(parseFloat(item.lon).toFixed(6));

  return {
    id: String(item.place_id || `${lat},${lng}`),
    name: item.name || cityOrVillage,
    displayName: item.display_name,
    cityOrVillage,
    districtName,
    stateName,
    locality,
    postcode,
    lat: isValidCoordinatePair(lat, lng) ? lat : null,
    lng: isValidCoordinatePair(lat, lng) ? lng : null,
    placeType: item.type || item.class || 'location',
    provider: 'OpenStreetMap Nominatim',
  };
}

async function fetchWithRetry(url, retries = 1) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en',
        },
      });
      if (!res.ok) {
        throw new Error(`Geocoding provider HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }
  throw lastError;
}

/**
 * Search locations across India using OpenStreetMap Nominatim.
 * Supports villages, towns, cities, districts, states, PIN codes, and landmarks.
 * Never fabricates results if the provider fails or returns empty.
 */
export async function searchIndiaLocations(query, { stateFilter = '', districtFilter = '' } = {}) {
  const cleanQuery = (query || '').trim();
  if (cleanQuery.length < 2) return { results: [], error: null };

  const structuredParts = [cleanQuery];
  if (districtFilter && !cleanQuery.toLowerCase().includes(districtFilter.toLowerCase())) {
    structuredParts.push(districtFilter);
  }
  if (stateFilter && !cleanQuery.toLowerCase().includes(stateFilter.toLowerCase())) {
    structuredParts.push(stateFilter);
  }
  const fullSearchText = structuredParts.join(', ');
  const cacheKey = `search_${fullSearchText.toLowerCase()}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return { results: cached, error: null, fromCache: true };
  }

  const params = new URLSearchParams({
    q: fullSearchText,
    countrycodes: 'in',
    format: 'jsonv2',
    addressdetails: '1',
    limit: '8',
  });

  try {
    const data = await fetchWithRetry(`https://nominatim.openstreetmap.org/search?${params.toString()}`, 1);
    if (!Array.isArray(data)) {
      return { results: [], error: null };
    }
    const normalized = data.map(normalizeNominatimItem);
    setCached(cacheKey, normalized);
    return { results: normalized, error: null };
  } catch (err) {
    return {
      results: [],
      error:
        'Live geocoding service is temporarily unreachable. You can select a location on the map or enter the address manually below.',
    };
  }
}

/**
 * Reverse-geocodes a latitude/longitude pair in India into a readable address.
 */
export async function reverseGeocodeIndia(lat, lng) {
  if (!isValidCoordinatePair(lat, lng)) {
    return { location: null, error: 'Invalid geographic coordinates.' };
  }

  const roundedLat = Number(lat).toFixed(5);
  const roundedLng = Number(lng).toFixed(5);
  const cacheKey = `rev_${roundedLat}_${roundedLng}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return { location: cached, error: null, fromCache: true };
  }

  const params = new URLSearchParams({
    lat: String(roundedLat),
    lon: String(roundedLng),
    format: 'jsonv2',
    addressdetails: '1',
  });

  try {
    const data = await fetchWithRetry(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, 1);
    if (!data || data.error) {
      return {
        location: null,
        error: 'Could not resolve street address for these coordinates. Coordinates are still retained.',
      };
    }
    const normalized = normalizeNominatimItem({
      ...data,
      lat: roundedLat,
      lon: roundedLng,
    });
    setCached(cacheKey, normalized);
    return { location: normalized, error: null };
  } catch (err) {
    return {
      location: null,
      error:
        'Reverse geocoding service is currently unavailable. Your selected map coordinates are still preserved.',
    };
  }
}

/**
 * Formats a location object into a concise readable label.
 */
export function formatLocationLabel(loc) {
  if (!loc) return 'All India';
  const parts = [
    loc.locality,
    loc.cityOrVillage || loc.villageName || loc.cityName,
    loc.districtName,
    loc.stateName,
  ].filter(Boolean);
  // Deduplicate adjacent identical strings
  const unique = parts.filter((item, idx) => idx === 0 || item.toLowerCase() !== parts[idx - 1].toLowerCase());
  return unique.join(', ') || loc.displayName || 'Selected Location';
}
