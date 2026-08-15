import { createServer, type Server as HttpServer } from 'node:http';
import {
  io as createSocketClient,
  type Socket as ClientSocket,
} from 'socket.io-client';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  emitToOrder,
  emitToUser,
  initializeSocketServer,
} from '../../../src/realtime/socket.js';

// Create two fake functions for the tests
const {
  verifyAccessTokenMock,
  verifyOrderOwnershipMock,
} = vi.hoisted(() => ({
  // Pretends to check whether a login token is valid.
  verifyAccessTokenMock: vi.fn(),

  // Pretends to check whether a user owns an order.
  verifyOrderOwnershipMock: vi.fn(),
}));

// Replace the real login checker with our fake, avoids using real login information during the tests.
vi.mock('../../../src/modules/auth/auth.interface.js', () => ({
  authInterface: {
    verifyAccessToken: verifyAccessTokenMock,
  },
}));

// Replace the real order ownership checker with fake
vi.mock('../../../src/modules/orders/order.interface.js', () => ({
  orderInterface: {
    verifyOrderOwnership: verifyOrderOwnershipMock,
  },
}));

// Give the test a temporary instead of real frontend address
vi.mock('../../../src/config/env.js', () => ({
  env: {
    clientUrl: 'http://localhost:5173',
  },
}));

// Group all Socket.IO login tests together.
describe('Socket.IO authentication', () => {
    // The temporary web server used by the tests.
    let httpServer: HttpServer;
    let socketServer: ReturnType<typeof initializeSocketServer>;
    let serverUrl: string;
    // Keep track of every test client to disconnect later.
    let clients: ClientSocket[] = [];
    // Records successful connections.
    const connectionHandler = vi.fn((_socket: unknown) => {});
    
    // Run before every test.
    beforeEach(async () => {
        verifyAccessTokenMock.mockReset();
        verifyOrderOwnershipMock.mockReset();

        clients = [];
        connectionHandler.mockClear();

        // Every test receives its own temporary server.
        httpServer = createServer();
        socketServer = initializeSocketServer(httpServer);
        socketServer.on('connection', connectionHandler);

        await new Promise<void>((resolve) => {
            httpServer.listen(0, '127.0.0.1', resolve);
        });

        const address = httpServer.address();

        if (!address || typeof address === 'string') {
            throw new Error('Could not determine the test server port.');
        }

        serverUrl = `http://127.0.0.1:${address.port}`;
    });

    // Run after every test.
    afterEach(async () => {
        // Disconnect every test client.
        for (const client of clients) {
            client.removeAllListeners();
            client.disconnect();
        }

        // Close Socket.IO after every test.
        await new Promise<void>((resolve) => {
            socketServer.close(() => resolve());
        });

        // Socket.IO normally closes this server, but check to be safe.
        if (httpServer.listening) {
            await new Promise<void>((resolve, reject) => {
            httpServer.close((error) => {
                if (error) reject(error);
                else resolve();
            });
            });
        }
    });


    // Create a test client with or without a login token.
    function makeClient(token?: string): ClientSocket {
        const client = createSocketClient(serverUrl, {
        // Do not connect until the test is ready.
        autoConnect: false,

        // Give each test client its own separate connection.
        forceNew: true,

        // Do not keep retrying if the connection fails.
        reconnection: false,

        // Connect directly using WebSocket.
        transports: ['websocket'],

        // Send the token if one was provided.
        auth: token === undefined ? {} : { token },
        });

        // Save the client so it can be disconnected after the test.
        clients.push(client);

        return client;
    }

    // Try to connect and wait for the connection to fail.
    function waitForConnectError(client: ClientSocket): Promise<Error> {
        return new Promise((resolve, reject) => {
        // Fail the test if no answer is received within two seconds.
        const timeout = setTimeout(() => {
            reject(new Error('Timed out waiting for connect_error.'));
        }, 2000);

        // Run this when the server rejects the connection.
        client.once('connect_error', (error) => {
            clearTimeout(timeout);
            resolve(error);
        });

        // Begin connecting to the server.
        client.connect();
        });
    }

    // Try to connect and wait for the connection to succeed.
    function waitForConnection(client: ClientSocket): Promise<void> {
        return new Promise((resolve, reject) => {
        // Fail the test if no answer is received within two seconds.
        const timeout = setTimeout(() => {
            reject(new Error('Timed out waiting for connection.'));
        }, 2000);

        // Finish successfully when the client connects.
        client.once('connect', () => {
            clearTimeout(timeout);
            resolve();
        });

        // Fail if the server rejects the connection.
        client.once('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });

        // Begin connecting to the server.
        client.connect();
        });
    }

    // Check that a person cannot connect without a login token.
    it('rejects a connection with no token before the connection handler runs', async () => {
        // Create a client without a token.
        const client = makeClient();

        // Wait for the server to reject it.
        const error = await waitForConnectError(client);

        // Check that the correct message was returned.
        expect(error.message).toBe('Authentication is required.');

        // The token-checking function should not run because no token was supplied.
        expect(verifyAccessTokenMock).not.toHaveBeenCalled();

        // The successful connection section must not run.
        expect(connectionHandler).not.toHaveBeenCalled();
    });

    // Check that a person cannot connect with a bad token.
    it('rejects an invalid token', async () => {
        // Make the fake token checker reject the token.
        verifyAccessTokenMock.mockRejectedValue(
        new Error('Invalid access token.')
        );

        // Create a client with a bad token.
        const client = makeClient('invalid-token');

        // Wait for the server to reject it.
        const error = await waitForConnectError(client);

        // Check the message sent back to the client.
        expect(error.message).toBe('Authentication failed.');

        // Check that the correct token was examined.
        expect(verifyAccessTokenMock).toHaveBeenCalledWith('invalid-token');

        // The successful connection section must not run.
        expect(connectionHandler).not.toHaveBeenCalled();
    });

    // Check that a logged-out token cannot be used again.
    it('rejects a revoked token through the shared auth interface', async () => {
        // Create the error returned when a login session is no longer valid.
        const revokedError = new Error(
        'Your session is no longer valid. Please log in again.'
        );

        // Make the fake token checker reject the old token.
        verifyAccessTokenMock.mockRejectedValue(revokedError);

        // Create a client using the old token.
        const client = makeClient('revoked-token');

        // Wait for the server to reject it.
        const error = await waitForConnectError(client);

        // Check the message sent back to the client.
        expect(error.message).toBe('Authentication failed.');

        // Check that the old token was passed to the login checker.
        expect(verifyAccessTokenMock).toHaveBeenCalledWith('revoked-token');

        // The successful connection section must not run.
        expect(connectionHandler).not.toHaveBeenCalled();
    });

    // Check that a person can connect with a valid token.
    it('accepts a valid token through the shared auth interface', async () => {
        // Make the fake token checker return valid user information.
        verifyAccessTokenMock.mockResolvedValue({
        userId: '507f191e810c19729de860ea',
        role: 'RECIPIENT',
        jti: 'test-jti',
        expiresAt: new Date('2026-08-16T00:00:00.000Z'),
        });

        // Create a client with a valid token.
        const client = makeClient('valid-token');

        // Wait for the connection to succeed.
        await waitForConnection(client);

        // Confirm that the client is connected.
        expect(client.connected).toBe(true);

        // Confirm that the token was checked.
        expect(verifyAccessTokenMock).toHaveBeenCalledWith('valid-token');

        // Confirm that the successful connection section ran once.
        expect(connectionHandler).toHaveBeenCalledOnce();
    });
});