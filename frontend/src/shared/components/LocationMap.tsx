// Thin react-leaflet wrapper. Renders a single location marker by default;
// pass `secondaryMarker` to also plot a second pin (styled distinctly) and
// `showPath` to draw a straight dashed line between the two.
// Per D8.md, placed under shared/components (not the browsing module)
// since the Courier active-delivery screen reuses this exact marker pattern
// to show the pickup pin before pickup and the destination pin after.
// Requires `leaflet` + `react-leaflet` (+ `@types/leaflet` dev dep) —
// declared in the monorepo root package.json.
import L from 'leaflet';
import type { LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import './LocationMap.css';

// Leaflet's default marker icon paths break under most bundlers unless
// re-pointed explicitly — standard react-leaflet workaround.
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Brand green, matching the surrounding delivery UI (#2E5A47).
const BRAND_GREEN = '#2E5A47';

// A courier-bike glyph (matching the `lucide-react` line-icon set used
// elsewhere) in a white disc, for the moving actor. The disc keeps contrast
// against the muted basemap and gives a precise centre anchor; drawing the
// glyph ourselves keeps it on-palette and identical across platforms, unlike
// an emoji. `className: ''` strips Leaflet's default box around a divIcon.
const courierIcon = L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:#fff;border:2px solid ${BRAND_GREEN};box-shadow:0 1px 4px rgba(0,0,0,0.35)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${BRAND_GREEN}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

// A teardrop pin for the fixed destination.
const destinationIcon = L.divIcon({
  className: '',
  html: `<svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.35))"><path d="M12 2c-4.42 0-8 3.58-8 8 0 5.25 7 11.5 7.35 11.77a1 1 0 0 0 1.3 0C13 21.5 20 15.25 20 10c0-4.42-3.58-8-8-8z" fill="${BRAND_GREEN}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>`,
  iconSize: [26, 26],
  iconAnchor: [13, 25],
  popupAnchor: [0, -24],
});

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Pans the map to a new position when it changes, without remounting.
 * `MapContainer`'s own `center` prop only applies once, at mount — this is
 * the reactive counterpart, used only when `recenter` is requested and no
 * secondary marker is present.
 */
function RecenterOnChange({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();

  useEffect(() => {
    map.panTo([latitude, longitude]);
  }, [map, latitude, longitude]);

  return null;
}

/**
 * Keeps both markers in frame. Re-fits whenever either endpoint moves, so
 * the viewport tightens as the courier approaches the destination.
 */
function FitBoundsOnChange({ primary, secondary }: { primary: LatLngTuple; secondary: LatLngTuple }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds([primary, secondary], { padding: [48, 48], maxZoom: 16 });
  }, [map, primary[0], primary[1], secondary[0], secondary[1]]);

  return null;
}

interface SecondaryMarker {
  latitude: number;
  longitude: number;
  addressText: string;
}

interface LocationMapProps {
  latitude: number;
  longitude: number;
  addressText: string;
  className?: string;
  recenter?: boolean;
  /** When set, a second (distinctly styled) pin is plotted at this position. */
  secondaryMarker?: SecondaryMarker;
  /** Draws a straight dashed line between the two markers. No-op without `secondaryMarker`. */
  showPath?: boolean;
  /**
   * `muted` desaturates the basemap (CARTO Positron look) so overlaid
   * markers and paths stand out. Defaults to full-colour tiles.
   */
  tileVariant?: 'default' | 'muted';
}

export function LocationMap({
  latitude,
  longitude,
  addressText,
  className = 'h-48 w-full overflow-hidden rounded-lg',
  recenter = false,
  secondaryMarker,
  showPath = false,
  tileVariant = 'default',
}: LocationMapProps) {
  const primary: LatLngTuple = [latitude, longitude];
  const secondary: LatLngTuple | null = secondaryMarker
    ? [secondaryMarker.latitude, secondaryMarker.longitude]
    : null;
  const wrapperClassName =
    tileVariant === 'muted' ? `${className} location-map--muted` : className;

  return (
    <div className={wrapperClassName}>
      <MapContainer
        center={primary}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />

        <Marker position={primary} icon={secondary ? courierIcon : defaultIcon}>
          <Popup>{addressText}</Popup>
        </Marker>

        {secondary && secondaryMarker && (
          <Marker position={secondary} icon={destinationIcon}>
            <Popup>{secondaryMarker.addressText}</Popup>
          </Marker>
        )}

        {secondary && showPath && (
          <Polyline
            positions={[primary, secondary]}
            pathOptions={{ color: BRAND_GREEN, weight: 3, opacity: 0.8, dashArray: '6 8' }}
          />
        )}

        {secondary ? (
          <FitBoundsOnChange primary={primary} secondary={secondary} />
        ) : (
          recenter && <RecenterOnChange latitude={latitude} longitude={longitude} />
        )}
      </MapContainer>
    </div>
  );
}

export default LocationMap;
