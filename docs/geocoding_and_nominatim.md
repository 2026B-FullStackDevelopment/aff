# AFF Platform — Geocoding & OpenStreetMap Nominatim Integration

## 1. Overview

The Affordable Food Federation (AFF) platform relies on precise location data for donor address registration and delivery dispatch (Courier pickup mapping and live tracking). 

To provide address search-as-you-type without requiring proprietary paid APIs (e.g. Google Maps Platform), AFF integrates with the open-source **OpenStreetMap (OSM) Nominatim API**, paired with a custom administrative resolution layer for Vietnamese provinces.

---

## 2. System Architecture

Location processing follows a structured, multi-layer frontend architecture:

```
[ UI Component: AddressAutocomplete ]
              │
              ├── User typing address / GPS button
              ▼
[ Hook: useNominatimSearch ]
              │ (400ms Debounce + AbortController)
              ▼
[ Service: nominatimService ] ◄────► [ OSM Nominatim API ]
              │
              │ (Returns NominatimPlace with rawAddress & lat/lon)
              ▼
[ Utility: resolveProvince ]
              │
              ├─► 1. Normalized Text Match (state/city/district/etc.)
              ├─► 2. Legacy Merged Province Map lookup
              └─► 3. Nearest-Centroid Coordinate Fallback (34 canonical provinces)
              │
              ▼
[ LocationData Payload ]
{ addressText, latitude, longitude, municipality, rawAddress }
```

---

## 3. Core Modules & Responsibilities

| File Path | Description | Key Responsibilities |
|---|---|---|
| `frontend/src/shared/services/nominatim.service.ts` | Low-level REST API service | Wraps `https://nominatim.openstreetmap.org` calls (`searchPlaces` and `reverseGeocode`). Sets standard `User-Agent` headers and accepts `AbortSignal`. |
| `frontend/src/shared/hooks/useNominatimSearch.ts` | Custom React Hook | Provides search-as-you-type behavior with 400ms debouncing, in-flight request cancellation (`AbortController`), `signal.aborted` checks, and automatic unmount cleanup. |
| `frontend/src/shared/utils/resolveProvince.ts` | Province Normalization Engine | Converts raw Nominatim address tags and lat/lon coordinates into one of AFF's 34 canonical Vietnamese provinces. |
| `frontend/src/shared/components/AddressAutocomplete.tsx` | Accessible Combobox UI Component | Renders search-as-you-type input with keyboard navigation (`ArrowUp`/`ArrowDown`/`Enter`), GPS browser geolocation button, and automatic `municipality` resolution. |

---

## 4. Administrative Province Resolution Algorithm

### The Challenge
Nominatim data is crowdsourced. Vietnamese address tags in Nominatim can vary wildly:
- Varying prefixes: *"Tỉnh"*, *"Thành phố"*, *"TP."*
- Stale/legacy administrative units (pre-2025 province & district names).
- Inconsistent key placement (`state`, `city`, `province`, `region`, `municipality`, `town`, `county`).

### The Solution: Hybrid 3-Stage Resolution
`resolveProvince(rawAddress, latitude, longitude)` guarantees a valid province match in 3 steps:

1. **Normalized Text Match**:
   Strips common prefixes (`tỉnh`, `thành phố`, `tp.`) and normalizes case. Checks `rawAddress.state`, `city`, `region`, `province`, `municipality`, `town`, `state_district`, and `county`.
2. **Legacy Merger Mapping**:
   Maps historical/legacy Vietnamese province names (`LEGACY_PROVINCE_MAP`) to their current consolidated province equivalents.
3. **Nearest-Centroid Coordinate Fallback**:
   If text parsing yields no match, computes distance against the 34 canonical Vietnamese province centroids (`PROVINCE_CENTROIDS`) using latitude/longitude:
   $$\text{distance} = \sqrt{(\text{lat}_{\text{centroid}} - \text{lat})^2 + ((\text{lon}_{\text{centroid}} - \text{lon}) \cdot \cos(\text{lat}_{\text{rad}}))^2}$$
   Because Nominatim always returns valid `lat`/`lon` coordinates, this fallback **never fails**.

---

## 5. Rate Limiting & Fair Use Compliance

Nominatim operates under a strict [Fair Use Policy](https://operations.osmfoundation.org/policies/nominatim/) (max 1 request/second, valid `User-Agent`, no bulk scraping). AFF enforces compliance through frontend safeguards:

1. **400ms Debounce**: Fired only after the user stops typing for 400ms, keeping request frequency well below 1 req/s per client.
2. **Minimum Query Length**: Requests are suppressed until the input contains at least 3 characters.
3. **In-Flight Cancellation**: Typing a new character immediately aborts any pending HTTP request via `AbortController`.
4. **Single-Pass Resolution**: Selecting a suggestion from the dropdown uses the `address` object already returned in the initial search payload (`addressdetails=1`), avoiding an extra `reverseGeocode` HTTP roundtrip.
5. **Proper User-Agent**: All requests transmit `'User-Agent': 'AFF-App-Registration/1.0'`.

---

## 6. Code Examples & Usage

### Using `AddressAutocomplete` in a Form

```tsx
import { AddressAutocomplete, LocationData } from '@/shared/components/AddressAutocomplete';

function DonorForm() {
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const handleAddressSelect = (data: LocationData) => {
    // data = { addressText, latitude, longitude, municipality, rawAddress }
    setAddress(data.addressText);
    setCity(data.municipality || '');
    setLocation({ latitude: data.latitude, longitude: data.longitude });
  };

  return (
    <AddressAutocomplete
      value={address}
      onSelect={handleAddressSelect}
      error={formErrors.address}
    />
  );
}
```

---

## 7. Production Deployment Recommendations

For high-traffic production environments, consider moving Nominatim calls behind the AFF backend:

1. **Backend Geocoding Proxy**: Route client geocoding requests through `GET /api/media/geocode?q=...` to mask client IPs and centralize rate limits.
2. **Caching Strategy**: Implement Redis caching for search queries and reverse-geocodes (address data changes infrequently).
3. **Self-Hosted Nominatim / Commercial Alternative**: If request volume exceeds free OSM limits, deploy a self-hosted Nominatim container or switch to an OSM-compatible provider (e.g. MapTiler, LocationIQ) by changing `NOMINATIM_BASE_URL` in `nominatim.service.ts`.
