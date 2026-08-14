import {Server} from 'socket.io';
// Import only the Typescript type for Node.js's http server
import type {Server as HttpServer} from 'node:http';
// Import Auth module public interface. Socket.IO user verifyAccessToken()
// checking whether token has expired or been revoked
import {authInterface} from '../modules/auth/auth.interface.js';
// Import Order module public interface
import {orderInterface} from '../modules/orders/order.interface.js';
import {env} from '../config/env.js'

// Keep the Socket.IO server here so other functions can use it later.
let activeSocketServer: Server | undefined;

function initializeSocketServer (httpServer: HttpServer) {
    // Create a Socket.IO server and attach it to the existing Node HTTP server
    const io = new Server(httpServer, {
        cors: {
            // Only allows the configured frontend url to connect
            origin: env.clientUrl,
            // Allow credentials related cross-origin request
            credentials: true
        },
    });

    activeSocketServer = io;

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (typeof token !== 'string' || !token) {
                return next(new Error('Authentication is required.'));
            }
            const decoded = await authInterface.verifyAccessToken(token);

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
    });

    return io;
}

// Get the active Socket.IO server so messages can be sent
function getSocketServer(): Server {
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

