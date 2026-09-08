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
import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

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

/**
 * Pans the map to a new position when it changes, without remounting.
 * `MapContainer`'s own `center` prop only applies once, at mount — this is
 * the reactive counterpart, used only when `recenter` is requested.
 */
function RecenterOnChange({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();

  useEffect(() => {
    map.panTo([latitude, longitude]);
  }, [map, latitude, longitude]);

  return null;
}

interface LocationMapProps {
  latitude: number;
  longitude: number;
  addressText: string;
  className?: string;
  recenter?: boolean;
}

export function LocationMap({
  latitude,
  longitude,
  addressText,
  className = 'h-48 w-full overflow-hidden rounded-lg',
  recenter = false,
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
        {recenter && <RecenterOnChange latitude={latitude} longitude={longitude} />}
      </MapContainer>
    </div>
  );
}

export default LocationMap;
