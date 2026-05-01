import riskData from '../assets/riskData.json';
import policeData from '../assets/policeData.json';

const BETA = 0.5;

const AMENITY_META = {
  hospital:     { icon: '🏥', type: 'Hospital',     phone: '108' },
  fire_station: { icon: '🚒', type: 'Fire Station', phone: '101' },
};

const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const CACHE_DIST_THRESHOLD_KM = 0.5;    // 500 meters

let serviceCache = {
  lat: null,
  lon: null,
  timestamp: 0,
  data: [],
};

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getRisk(lat, lon) {
  let best = null;
  let bestDist = Infinity;
  for (const row of riskData) {
    const d = (row.lat - lat) ** 2 + (row.lon - lon) ** 2;
    if (d < bestDist) { bestDist = d; best = row; }
  }
  return best ? best.risk_score : 0;
}

// ─── Local police lookup (instant, offline) ──────────────────────────────────

function getNearestPoliceStations(userLat, userLon, topN = 3) {
  return policeData
    .map(p => {
      const distKm = haversineKm(userLat, userLon, p.lat, p.lon);
      const risk = getRisk(p.lat, p.lon);
      const weight = distKm + BETA * risk;
      const travelMin = Math.round((distKm / 30) * 60);
      return {
        id: `police-${p.name}`,
        amenity: 'police',
        icon: '👮',
        type: 'Police Station',
        phone: '100',
        name: p.name,
        address: p.area,
        lat: p.lat,
        lon: p.lon,
        distKm,
        dist: distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`,
        time: travelMin < 1 ? '<1 min' : `${travelMin} min`,
        weight,
      };
    })
    .sort((a, b) => a.weight - b.weight)
    .slice(0, topN);
}

// ─── Overpass for hospitals + fire stations ───────────────────────────────────

function buildQuery(lat, lon, radiusM = 2000) {
  const amenities = Object.keys(AMENITY_META).join('|');
  // Use nwr for brevity, add a limit of 10 to reduce payload size
  return `[out:json][timeout:15];nwr["amenity"~"${amenities}"](around:${radiusM},${lat},${lon});out center 10;`;
}

function parseElement(el, userLat, userLon) {
  const amenity = el.tags?.amenity;
  if (!amenity || !AMENITY_META[amenity]) return null;

  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;

  const name = el.tags?.name || el.tags?.['name:en'] || AMENITY_META[amenity].type;
  const address = [el.tags?.['addr:street'], el.tags?.['addr:city']]
    .filter(Boolean).join(', ');

  const distKm = haversineKm(userLat, userLon, lat, lon);
  const risk = getRisk(lat, lon);
  const weight = distKm + BETA * risk;
  const travelMin = Math.round((distKm / 30) * 60);

  return {
    id: el.id,
    amenity,
    ...AMENITY_META[amenity],
    name,
    address,
    lat,
    lon,
    distKm,
    dist: distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`,
    time: travelMin < 1 ? '<1 min' : `${travelMin} min`,
    weight,
  };
}

async function tryFetch(endpoint, query) {
  const url = `${endpoint}?data=${encodeURIComponent(query)}`;
  // Add a generic User-Agent to avoid 406 errors from some Overpass mirrors
  const res = await fetch(url, { 
    method: 'GET', 
    headers: { 
      'Accept': 'application/json',
      'User-Agent': 'WomenSafe-App/1.0'
    } 
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchOsmServices(lat, lon) {
  // Check cache first
  const now = Date.now();
  if (
    serviceCache.lat !== null &&
    now - serviceCache.timestamp < CACHE_EXPIRY_MS &&
    haversineKm(lat, lon, serviceCache.lat, serviceCache.lon) < CACHE_DIST_THRESHOLD_KM
  ) {
    console.log('[NearbyServices] using cached OSM data');
    return serviceCache.data;
  }

  const query = buildQuery(lat, lon);
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log('[NearbyServices] trying', endpoint);
      const json = await tryFetch(endpoint, query);
      const elements = json.elements ?? [];
      console.log('[NearbyServices] got', elements.length, 'elements');

      const parsed = elements.map(el => parseElement(el, lat, lon)).filter(Boolean);
      const seen = new Map();
      for (const s of parsed) {
        const key = `${s.amenity}:${s.name}`;
        if (!seen.has(key) || s.distKm < seen.get(key).distKm) seen.set(key, s);
      }
      
      const results = seen.size > 0 ? [...seen.values()] : [];
      
      // Update cache
      serviceCache = { lat, lon, timestamp: now, data: results };
      
      return results;
    } catch (e) {
      console.warn('[NearbyServices]', endpoint, e.message);
    }
  }
  return serviceCache.data || []; // fallback to stale cache if API fails
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function fetchNearbyServices(lat, lon) {
  // Police: local CSV (instant)
  const policeResults = getNearestPoliceStations(lat, lon, 3);

  // Hospitals + fire stations: Overpass (async, may be slow/fail)
  const osmResults = await fetchOsmServices(lat, lon);

  return [...policeResults, ...osmResults].sort((a, b) => a.weight - b.weight);
}

function groupTopByType(services, topN = 1) {
  const grouped = {};
  for (const s of services) {
    if (!grouped[s.amenity]) grouped[s.amenity] = [];
    if (grouped[s.amenity].length < topN) grouped[s.amenity].push(s);
  }
  return Object.values(grouped).flat().sort((a, b) => a.weight - b.weight);
}

export default { fetchNearbyServices, getPoliceStations: getNearestPoliceStations, groupTopByType, haversineKm };
