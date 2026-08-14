import {Server} from 'socket.io';
// Import only the Typescript type for Node.js's http server
import type {Server as HttpServer} from 'node:http';
// Import Auth module public interface. Socket.IO user verifyAccessToken()
// checking whether token has expired or been revoked
import {authInterface} from '../modules/auth/auth.interface.js';
// Import Order module public interface
import {orderInterface} from '../modules/orders/order.interface.js';
import {env} from '../config/env.js'

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
}