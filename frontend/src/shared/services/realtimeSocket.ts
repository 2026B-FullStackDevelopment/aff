/**
 * Single shared Socket.IO connection for the whole app — replaces the
 * per-role connection bootstrap previously duplicated across
 * `donorRealtime.service.ts`, `orderRealtime.service.ts`, and
 * `courierRealtime.service.ts`. `useRealtimeConnection` is the only caller
 * of {@link connect}/{@link disconnect}; every other module only ever needs
 * {@link on}/{@link emit}.
 */
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;
let activeToken: string | null = null;
const registeredHandlers = new Map<string, Set<(payload: unknown) => void>>();

function resolveSocketServerUrl(): string {
  const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL;
  if (explicitSocketUrl) return explicitSocketUrl;

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  return apiBaseUrl.replace(/\/api\/?$/, '') || window.location.origin;
}

/**
 * Opens the shared connection, authenticated with `token`. A no-op if
 * already connected with this exact token (beyond reconnecting the
 * transport if it had dropped); a different token tears down the old
 * socket first via {@link disconnect}. Every handler previously registered
 * via {@link on} — regardless of when, including before this function was
 * ever called — is replayed onto the freshly created socket, so call
 * order relative to `on()` never matters.
 */
function connect(token: string) {
  if (socket && activeToken === token) {
    if (!socket.connected) socket.connect();
    return;
  }

  disconnect();
  activeToken = token;
  socket = io(resolveSocketServerUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  for (const [event, handlers] of registeredHandlers) {
    handlers.forEach((handler) => socket!.on(event, handler));
  }
}

/** Closes the shared connection, if any, and clears the tracked token. */
function disconnect() {
  socket?.disconnect();
  socket = null;
  activeToken = null;
}

/**
 * Subscribes `handler` to `event`. Safe to call at any time, including
 * before the first {@link connect} ever runs — e.g. from another module's
 * top-level code, which executes before any component mounts: the handler
 * is stored and replayed onto the socket by the next `connect()`, and
 * attached immediately too if a connection already exists. Returns an
 * unsubscribe function.
 */
function on<T>(event: string, handler: (payload: T) => void): () => void {
  const typedHandler = handler as (payload: unknown) => void;

  if (!registeredHandlers.has(event)) {
    registeredHandlers.set(event, new Set());
  }
  registeredHandlers.get(event)!.add(typedHandler);
  socket?.on(event, typedHandler);

  return () => {
    registeredHandlers.get(event)?.delete(typedHandler);
    socket?.off(event, typedHandler);
  };
}

/** Emits `event` on the shared socket. Silently does nothing if not connected. */
function emit(event: string, payload: unknown) {
  socket?.emit(event, payload);
}

export const realtimeSocket = { connect, disconnect, on, emit };
