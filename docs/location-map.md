# LocationMap Component Documentation

The `LocationMap` component is a reusable, high-level map rendering component built on top of **Leaflet** and **React-Leaflet**. It is located at `frontend/src/shared/components/LocationMap.tsx` and provides both static location pin display and dynamic real-time delivery tracking visualization.

---

## 1. Overview & Architecture

### File Structure
- [LocationMap.tsx](../frontend/src/shared/components/LocationMap.tsx) — Main React component handling Leaflet map lifecycle, markers, bounding-box auto-fitting, and polylines.
- [LocationMap.css](../frontend/src/shared/components/LocationMap.css) — Scoped CSS overrides for Leaflet's internal DOM elements (e.g. muted desaturated basemap styling).

### Where It Is Used
1. **[ListingDetailPage.tsx](file:///frontend/src/modules/browsing/pages/ListingDetailPage.tsx)**: Displays the physical location/pickup point of a food listing.
2. **[DeliveryTrackingPanel.tsx](file:///frontend/src/modules/reservations/components/DeliveryTrackingPanel.tsx)**: Recipient-facing live tracking screen showing the courier's real-time position moving toward the recipient address.
3. **[ActiveDeliveryPage.tsx](file:///frontend/src/modules/delivery/pages/ActiveDeliveryPage.tsx)**: Courier active delivery dashboard showing courier GPS position, destination pin, and route path.

---

## 2. Component Props (`LocationMapProps`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `latitude` | `number` | *Required* | Latitude coordinate for the primary marker. |
| `longitude` | `number` | *Required* | Longitude coordinate for the primary marker. |
| `addressText` | `string` | *Required* | Address or label displayed inside the primary marker's popup bubble. |
| `className` | `string` | `'h-48 w-full overflow-hidden rounded-lg'` | Tailwind/CSS classes for the outer wrapper container. |
| `recenter` | `boolean` | `false` | When `true`, dynamically pans the map to the primary coordinate if it changes (single-marker mode). |
| `secondaryMarker` | `{ latitude: number, longitude: number, addressText: string }` | `undefined` | Optional secondary marker (destination/drop-off point). Activates dual-marker mode. |
| `showPath` | `boolean` | `false` | Draws a dashed polyline connecting primary and secondary markers (requires `secondaryMarker`). |
| `tileVariant` | `'default' \| 'muted'` | `'default'` | `'default'` uses full-color OpenStreetMap tiles; `'muted'` applies browser-side desaturation. |

---

## 3. How the Code Works (Internal Mechanisms)

### A. Dual Mode Operation
- **Single Pin Mode (e.g. Listing Detail):**
  - Renders a standard pin (`defaultIcon`) at `[latitude, longitude]`.
  - When `recenter=true`, the sub-component `<RecenterOnChange>` calls `map.panTo([lat, lng])` whenever coordinates change without remounting the map.
- **Dual Pin / Tracking Mode (e.g. Live Delivery):**
  - Primary pin automatically switches to a custom SVG courier bike disc (`courierIcon`).
  - Secondary pin renders a brand-green teardrop pin (`destinationIcon`).
  - Optional dashed line (`<Polyline>`) connecting the two points using the brand palette (`#2E5A47`).
  - `<FitBoundsOnChange>` dynamically calls `map.fitBounds([primary, secondary], { padding: [48, 48], maxZoom: 16 })` so both the courier and destination remain in frame as the courier approaches.

### B. Custom Marker Icons
1. **`defaultIcon`**: Standard Leaflet blue pin fixed with explicit bundler asset imports (`marker-icon.png`, `marker-shadow.png`) to avoid Vite asset resolution issues.
2. **`courierIcon`**: An inline SVG bike glyph enclosed in a white disc with a 2px brand-green border and drop shadow. Created via `L.divIcon` for zero external image requests.
3. **`destinationIcon`**: An inline SVG brand-green teardrop pin with drop shadow.

### C. Map Tiles & Performance
- Uses standard OpenStreetMap tile server: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`.
- `scrollWheelZoom={false}` prevents accidental page scroll interception when scrolling down the page on mobile and desktop.

### D. CSS Styling & Leaflet DOM (`LocationMap.css`)
- **Why a separate CSS file?**
  Leaflet generates third-party DOM nodes (such as `.leaflet-tile-pane`) at runtime. Because React does not render these elements directly, standard Tailwind utility classes cannot be placed on them via JSX.
- **The `muted` Variant:**
  ```css
  .location-map--muted .leaflet-tile-pane {
    filter: grayscale(1) brightness(1.05) contrast(0.9);
  }
  ```
  This applies a client-side CSS filter that approximates CARTO Positron tiles (clean, desaturated monochrome) without needing an external API key or paid map provider.

---

## 4. Usage Examples

### Example 1: Static Listing Location
```tsx
import { LocationMap } from '@/shared/components/LocationMap';

<LocationMap
  latitude={listing.location.coordinates[1]}
  longitude={listing.location.coordinates[0]}
  addressText={listing.pickupAddress}
  className="h-64 w-full rounded-xl"
/>
```

### Example 2: Live Courier Delivery Tracking
```tsx
import { LocationMap } from '@/shared/components/LocationMap';

<LocationMap
  latitude={courierLat}
  longitude={courierLng}
  addressText="Courier Location"
  secondaryMarker={{
    latitude: destinationLat,
    longitude: destinationLng,
    addressText: "Delivery Address"
  }}
  showPath={true}
  tileVariant="muted"
  className="h-80 w-full rounded-xl shadow-md"
/>
```
