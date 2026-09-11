import {Server} from 'socket.io';
// Import only the Typescript type for Node.js's http server
import type {Server as HttpServer} from 'node:http';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './socket.types.js';
// Import the security module's public interface. verifyAccessToken() checks the
// token's signature, expiry, and revocation status.
import { securityInterface } from '../modules/security/security.interface.js';
// Import Order module public interface
import {orderInterface} from '../modules/orders/order.interface.js';
import {env} from '../config/env.js'
import { deliveryInterface } from '../modules/delivery/delivery.interface.js';
import { locationSchema } from '../shared/validation/common-fields.schemas.js';

type RealtimeSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// Keep the Socket.IO server here so other functions can use it later.
let activeSocketServer: RealtimeSocketServer | undefined;

/**
 * Attaches Socket.IO to the HTTP server already used by Express.
 *
 * Connections must provide a valid access token. Authenticated connections
 * automatically join their personal user room.
 *
 * @param httpServer - The HTTP server shared with Express.
 * @returns The active Socket.IO server.
 */

function initializeSocketServer (
    httpServer: HttpServer
): RealtimeSocketServer {
    // Make initialization idempotent.
    if (activeSocketServer) {
    return activeSocketServer;
    }

    // Create a Socket.IO server and attach it to the existing Node HTTP server
    const io = new Server<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
    >(httpServer, {
        cors: {
            // Only allows the configured frontend url to connect
            origin: env.clientUrl,
            // Allow credentials related cross-origin request
            credentials: true,
        },
    });

    activeSocketServer = io;

    // Forget this server after it closes 
    httpServer.once('close', () => {
        if (activeSocketServer === io) {
            activeSocketServer = undefined;
        }
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (typeof token !== 'string' || !token) {
                return next(new Error('Authentication is required.'));
            }
            const decoded = await securityInterface.verifyAccessToken(token);

            // userId and role of the authenticated user
            socket.data.user = {
                id: decoded.userId,
                role: decoded.role
            };
            
            // next() tells Socket.IO authentication middleware
            // Authentication succeeded; allow the connection to continue
            next();            
        } catch {
            next(new Error('Authentication failed.'));
        }
    });

    // After client passes authentication and connects
    // .on() listens to an event
    // server waits for something to happen, then act
    io.on('connection', async (socket) => {
        
        // join a private room for authenticated user
        await socket.join(`user:${socket.data.user.id}`);

        socket.on('order:join', async (orderId: string) => { 
            try {

                // Only recipient who owns the order can join the order tracking room
                if (socket.data.user.role !== 'RECIPIENT' || !(await orderInterface.verifyOrderOwnership(orderId,socket.data.user.id))) {
                    return;
                }
                await socket.join(`order:${orderId}`);

            } catch {
                return;
            }
        });

        socket.on('order:leave', async (orderId: string) => {
            await socket.leave(`order:${orderId}`);
        });

        // A Courier's GPS ping while carrying an order. The payload is
        // coordinates only: the server resolves which Delivery this belongs to
        // from the authenticated socket, so a Courier can only ever write to
        // their own picked-up Delivery.
        //
        // Rejections are silent, matching order:join. The client only pings
        // while it believes the stage is PICKED_UP and stops on delivery:delivered.
        socket.on('delivery:ping', async (position) => {
            try {
                if (socket.data.user.role !== 'COURIER') {
                    return;
                }

                const parsed = locationSchema.safeParse(position);
                if (!parsed.success) {
                    return;
                }

                const delivery = await deliveryInterface.recordCourierLocation(
                    socket.data.user.id,
                    parsed.data,
                );

                if (!delivery) {
                    return;
                }

                emitToOrder(String(delivery.orderId), 'delivery:location', {
                    orderId: String(delivery.orderId),
                    latitude: parsed.data.latitude,
                    longitude: parsed.data.longitude,
                    updatedAt: delivery.courierLastLocation?.updatedAt,
                });
            } catch {
                return;
            }
        });
    });

    return io;
}

// Get the active Socket.IO server so messages can be sent
function getSocketServer(): RealtimeSocketServer {
    if (!activeSocketServer) {
        throw new Error('Socket.IO server has not been initialized.');
    }

    return activeSocketServer;
}

// Send a real-time event to all browser connections belonging to one user
function emitToUser(
    userId: string,
    event: string,
    payload: unknown
): void {
    getSocketServer().to(`user:${userId}`).emit(event, payload);
}

// Send a real-time order update to all allowed connections tracking one order
function emitToOrder(
    orderId: string,
    event: string,
    payload: unknown
): void {
    getSocketServer().to(`order:${orderId}`).emit(event, payload);
}

export { initializeSocketServer, emitToUser, emitToOrder};

