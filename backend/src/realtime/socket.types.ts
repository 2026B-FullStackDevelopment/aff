import type { DecodedToken } from '../shared/security/token.js';

// Describes the authenticated user in socket
interface AuthenticatedSocketUser {
  id: DecodedToken['userId'];
  role: DecodedToken['role'];
}

// Define custom information stored in socket.data
interface SocketData {user: AuthenticatedSocketUser;}

// Browser to sent to SocketId server
interface ClientToServerEvents {
    // user receives live updates; orderid to join
    'order:join': (orderId: string) => void;
    // user stops receiving live updates; orderid to leave
    'order:leave': (orderId: string) => void;
    // Courier broadcasts their position while carrying an order. Coordinates
    // only — the server derives which Delivery this belongs to from the
    // authenticated socket, so there is no id for a client to forge.
    'delivery:ping': (position: { latitude: number; longitude: number }) => void;
}

interface ServerToClientEvents {
    // The message can have any event name
    [event: string]: (payload: unknown) => void;
}

interface InterServerEvents {}

export type {
  AuthenticatedSocketUser,
  SocketData,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
};