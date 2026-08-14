import {Server} from 'socket.io';
// Import only the Typescript type for Node.js's http server
import type {Server as HttpServer} from 'node:http';
// Import Auth module public interface. Socket.IO user verifyAccessToken()
// checking whether token has expired or been revoked
import {authInterface} from '../modules/auth/auth.interface.js';
// Import Order module public interface
import {orderInterface} from '../modules/orders/order.interface.js';