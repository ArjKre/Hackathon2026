import riskData from '../assets/riskData.json';
import {ZONES} from '../theme';

const LABEL_TO_ZONE = {
  low: ZONES.SAFE,
  medium: ZONES.CAUTION,
  high: ZONES.UNSAFE,
};

// Nearest-neighbor lookup using squared Euclidean distance on lat/lon degrees.
// Bin spacing ~0.009°; this is accurate enough for city-level risk matching.
function findNearest(lat, lon) {
  let best = null;
  let bestDist = Infinity;
  for (const row of riskData) {
    const d = (row.lat - lat) ** 2 + (row.lon - lon) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = row;
    }
  }
  return best;
}

const MAX_CRIME_RATE = 165.13;

// Returns { zone, score (0-100), risk_score (0-1), risk_label, crimeRate (0-100), area, distDeg }
// score is inverted: 100 = safest, 0 = most dangerous
function getRiskForLocation(lat, lon) {
  const match = findNearest(lat, lon);
  if (!match) return null;

  const score = Math.round((1 - match.risk_score) * 100);
  const zone = LABEL_TO_ZONE[match.risk_label] ?? ZONES.SAFE;
  const distDeg = Math.sqrt((match.lat - lat) ** 2 + (match.lon - lon) ** 2);
  const crimeRate = (match.crime_rate / MAX_CRIME_RATE) * 100;

  return {zone, score, risk_score: match.risk_score, risk_label: match.risk_label, crimeRate, area: match.area, distDeg};
}

function getRiskForArea(areaName) {
  const match = riskData.find(r => r.area === areaName);
  if (!match) return null;
  const score = Math.round((1 - match.risk_score) * 100);
  const zone = LABEL_TO_ZONE[match.risk_label] ?? ZONES.SAFE;
  const crimeRate = (match.crime_rate / MAX_CRIME_RATE) * 100;
  return {zone, score, risk_score: match.risk_score, risk_label: match.risk_label, crimeRate, area: match.area, lat: match.lat, lon: match.lon, distDeg: 0};
}

const AREA_LIST = [...new Set(riskData.map(r => r.area))].sort();

export default {getRiskForLocation, getRiskForArea, AREA_LIST};
