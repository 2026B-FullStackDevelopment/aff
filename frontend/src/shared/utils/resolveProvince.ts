// Resolves a Nominatim address result to one of AFF's canonical 34 provinces.
//
// Why this exists: country-state-city (old dropdown source) and Nominatim's
// address tags (crowdsourced) are two independently-normalized text sources
// for Vietnamese province names, and they will never fully agree — some
// Nominatim results still carry pre-2025 district/province names, some carry
// the new names, capitalization and "Tỉnh"/"Thành phố" prefixes vary by
// locality. String-matching between them is an open-ended bug hunt.
//
// The fix: try a cheap normalized-text match first (resolves the easy
// majority instantly), and fall back to nearest-centroid coordinate lookup
// when the text doesn't match anything we recognize. Nominatim always
// returns lat/lon for whatever the user picked, regardless of how stale or
// inconsistent the address text is, so the fallback can't fail the way
// string matching can.

import { VIETNAM_PROVINCES, LEGACY_PROVINCE_MAP, PROVINCE_CENTROIDS } from '../constants/locations';

const PREFIX_PATTERN = /^(tỉnh|thành phố|tp\.?)\s+/i;

function normalize(label: string): string {
  return label.trim().replace(PREFIX_PATTERN, '').trim().toLowerCase();
}

// Build once: every canonical province name AND every legacy province name
// (mapped to its current merged province) normalized and ready to match against.
const CANONICAL_BY_NORMALIZED = new Map<string, string>();
VIETNAM_PROVINCES.forEach((name) => {
  CANONICAL_BY_NORMALIZED.set(normalize(name), name);
});
Object.entries(LEGACY_PROVINCE_MAP).forEach(([legacyName, currentName]) => {
  CANONICAL_BY_NORMALIZED.set(normalize(legacyName), currentName);
});

function matchByText(candidates: Array<string | undefined>): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = CANONICAL_BY_NORMALIZED.get(normalize(candidate));
    if (match) return match;
  }
  return null;
}

/**
 * Nearest-centroid lookup. Not full haversine — a simple longitude scale
 * correction (cos of latitude) keeps it from being skewed by meridian
 * convergence, which is enough precision for "which of 34 provinces is this
 * point closest to." Good enough away from province borders; for exact
 * point-in-polygon accuracy you'd want real boundary GeoJSON instead.
 */
function nearestProvinceByCoords(lat: number, lon: number): string {
  const latRad = (lat * Math.PI) / 180;
  const lonScale = Math.cos(latRad);

  let bestName = VIETNAM_PROVINCES[0];
  let bestDistance = Infinity;

  for (const name of VIETNAM_PROVINCES) {
    const centroid = PROVINCE_CENTROIDS[name];
    if (!centroid) continue;

    const dLat = centroid.lat - lat;
    const dLon = (centroid.lon - lon) * lonScale;
    const distance = Math.hypot(dLat, dLon);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestName = name;
    }
  }

  return bestName;
}

/**
 * Resolves a selected Nominatim address (plus its lat/lon) to one of AFF's
 * canonical 34 province names.
 *
 * @param rawAddress the `address` object from a Nominatim search/reverse result
 * @param latitude   the selected point's latitude
 * @param longitude  the selected point's longitude
 */
export function resolveProvince(
  rawAddress: Record<string, string> | undefined,
  latitude: number,
  longitude: number,
): string {
  const textMatch = matchByText([
    rawAddress?.state,
    rawAddress?.city,
    rawAddress?.region,
    rawAddress?.province,
    rawAddress?.municipality,
    rawAddress?.town,
    rawAddress?.state_district,
    rawAddress?.county,
  ]);

  if (textMatch) return textMatch;

  return nearestProvinceByCoords(latitude, longitude);
}
