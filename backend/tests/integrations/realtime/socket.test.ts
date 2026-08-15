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

// Ids for testing
const RECIPIENT_ID = '507f191e810c19729de860ea';
const OTHER_RECIPIENT_ID = '507f191e810c19729de860eb';
const ORDER_ID = '507f191e810c19729de86001';
const OTHER_ORDER_ID = '507f191e810c19729de86002';
const NONEXISTENT_ORDER_ID = '507f191e810c19729de86003';

type UserRole = 'RECIPIENT' | 'DONOR' | 'ADMIN' | 'COURIER';

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
        await connect(client);

        // Confirm that the client is connected.
        expect(client.connected).toBe(true);

        // Confirm that the token was checked.
        expect(verifyAccessTokenMock).toHaveBeenCalledWith('valid-token');

        // Confirm that the successful connection section ran once.
        expect(connectionHandler).toHaveBeenCalledOnce();
    });

    // Choose which pretend login tokens should be accepted.
    function mockTokens(
        users: Record<string, { userId: string; role: UserRole }>
    ): void {
        verifyAccessTokenMock.mockImplementation(async (token: string) => {
            const user = users[token];

            if (!user) {
            throw new Error('Invalid access token.');
            }

            return {
            ...user,
            jti: `test-${token}`,
            expiresAt: new Date(Date.now() + 60_000),
            };
        });
    }

    // Create a test client with or without a login token.
    function makeClient(token?: string): ClientSocket {
        const client = createSocketClient(serverUrl, {
            autoConnect: false,
            forceNew: true,
            reconnection: false,
            transports: ['websocket'],
            auth: token ? { token } : {},
        });

        // Remember the connection so it can be closed after the test.
        clients.push(client);
        return client;
    }

    // Start a connection and wait until it succeeds or fails.
    function connect(client: ClientSocket): Promise<void> {
        return new Promise((resolve, reject) => {
        // Stop waiting if the connection takes too long.
        const timeout = setTimeout(
            () => reject(new Error('Connection timed out.')),
            2000
        );

        client.once('connect', () => {
            clearTimeout(timeout);
            resolve();
        });

        client.once('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });

        client.connect();
        });
    }

    // Wait until an expected change happens.
    async function waitUntil(
    condition: () => boolean,
    message: string
    ): Promise<void> {
    const deadline = Date.now() + 2000;

    while (!condition()) {
        if (Date.now() >= deadline) {
        throw new Error(message);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    }

    // Find the server's copy of a browser connection.
    function serverSocket(client: ClientSocket) {
    if (!client.id) {
        throw new Error('Client is not connected.');
    }

    const socket = socketServer.sockets.sockets.get(client.id);

    if (!socket) {
        throw new Error('Server connection was not found.');
    }

    return socket;
    }

    // Prepare a pretend user and connect them to the server.
    async function connectUser(
    token: string,
    userId: string,
    role: UserRole = 'RECIPIENT'
    ): Promise<ClientSocket> {
    mockTokens({ [token]: { userId, role } });

    const client = makeClient(token);
    await connect(client);

    return client;
    }

    // Ask to watch an order and wait until its room has been joined.
    async function joinOrder(
    client: ClientSocket,
    orderId: string
    ): Promise<void> {
    client.emit('order:join', orderId);

    await waitUntil(
        () => serverSocket(client).rooms.has(`order:${orderId}`),
        `Did not join order:${orderId}.`
    );
    }
});

