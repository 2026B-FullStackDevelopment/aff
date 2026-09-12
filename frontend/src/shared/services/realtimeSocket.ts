// Single shared Socket.IO connection for the whole app — replaces the
// per-role connection bootstrap previously duplicated across
// donorRealtime.service.ts, orderRealtime.service.ts, and courierRealtime.service.ts.
//
// on(event, handler) is safe to call at any time, including before the
// first connect() ever runs (e.g. from another module's top-level code,
// which executes before any component mounts): every registered handler
// is replayed onto the socket instance each time connect() creates one.
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

function disconnect() {
  socket?.disconnect();
  socket = null;
  activeToken = null;
}

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

function emit(event: string, payload: unknown) {
  socket?.emit(event, payload);
}

export const realtimeSocket = { connect, disconnect, on, emit };
