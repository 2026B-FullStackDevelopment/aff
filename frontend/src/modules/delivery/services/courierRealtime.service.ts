import { io, type Socket } from 'socket.io-client';

interface CourierClientToServerEvents {
  'delivery:ping': (position: { latitude: number; longitude: number }) => void;
}

type CourierSocket = Socket<Record<string, never>, CourierClientToServerEvents>;

// The PRD targets under ~10 seconds from GPS ping to visible movement, so a
// 5-second emit interval leaves headroom. watchPosition keeps a fresh fix
// while this timer controls how often we actually emit — E6 warns against
// emitting on every watchPosition callback, which fires at a rate the app
// does not control.
const PING_INTERVAL_MS = 5000;

let activeSocket: CourierSocket | null = null;
let activeToken: string | null = null;
let watchId: number | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let lastPosition: { latitude: number; longitude: number } | null = null;

function resolveSocketServerUrl(): string {
  const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL;
  if (explicitSocketUrl) return explicitSocketUrl;

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  return apiBaseUrl.replace(/\/api\/?$/, '') || window.location.origin;
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  if (pingTimer !== null) {
    clearInterval(pingTimer);
    pingTimer = null;
  }

  lastPosition = null;
}

/**
 * Starts broadcasting position. Call only after PATCH /deliveries/:id/pickup
 * has returned 200 — a 409 means pickup did not happen, and E6 requires the
 * permission prompt to come after the stage actually advanced.
 */
function startTracking(onPermissionDenied: () => void) {
  if (watchId !== null) return;

  if (!navigator.geolocation) {
    onPermissionDenied();
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      lastPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    },
    () => {
      stopTracking();
      onPermissionDenied();
    },
    { enableHighAccuracy: true },
  );

  pingTimer = setInterval(() => {
    if (activeSocket && lastPosition) {
      activeSocket.emit('delivery:ping', lastPosition);
    }
  }, PING_INTERVAL_MS);
}

function disconnect() {
  stopTracking();

  if (activeSocket) {
    activeSocket.disconnect();
  }

  activeSocket = null;
  activeToken = null;
}

function connect(token: string) {
  if (activeSocket && activeToken === token) {
    if (!activeSocket.connected) activeSocket.connect();
    return;
  }

  disconnect();
  activeToken = token;

  activeSocket = io(resolveSocketServerUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
  }) as CourierSocket;
}

export const courierRealtimeService = {
  connect,
  disconnect,
  startTracking,
  stopTracking,
};
