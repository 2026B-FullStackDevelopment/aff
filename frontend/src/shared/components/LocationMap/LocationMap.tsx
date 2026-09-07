// Thin react-leaflet wrapper rendering a single location marker.
// Per D8.md, placed under shared/components (not the browsing module)
// since the Courier active-delivery screen reuses this exact marker pattern
// to show the pickup pin before pickup and the destination pin after.
// Requires `leaflet` + `react-leaflet` (+ `@types/leaflet` dev dep) —
// not yet in frontend/package.json per D8.md's risk #3.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

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

interface LocationMapProps {
  latitude: number;
  longitude: number;
  addressText: string;
  className?: string;
}

export function LocationMap({
  latitude,
  longitude,
  addressText,
  className = 'h-48 w-full overflow-hidden rounded-lg',
}: LocationMapProps) {
  return (
    <div className={className}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={defaultIcon}>
          <Popup>{addressText}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default LocationMap;
